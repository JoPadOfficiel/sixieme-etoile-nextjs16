import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantFilter, withTenantId } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import {
	calculateFlexibilityScoreSimple,
	DEFAULT_MAX_DISTANCE_KM,
} from "../../services/flexibility-score";
import {
	filterByCapacity,
	filterByStatus,
	filterByHaversineDistance,
	getRoutingForCandidates,
	transformVehicleToCandidate,
	type VehicleCandidate,
	type CandidateWithRouting,
} from "../../services/vehicle-selection";
import type { OrganizationPricingSettings } from "../../services/pricing-engine";

/**
 * Missions Router
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Missions are accepted quotes with pickupAt in the future.
 * This router provides endpoints for the Dispatch screen.
 *
 * @see FR50-FR51 Multi-base dispatch and driver flexibility
 * @see UX Spec 8.8 Dispatch Screen
 */

// Validation schemas
const listMissionsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	dateFrom: z
		.string()
		.datetime()
		.optional()
		.describe("Filter missions with pickupAt >= dateFrom"),
	dateTo: z
		.string()
		.datetime()
		.optional()
		.describe("Filter missions with pickupAt <= dateTo"),
	vehicleCategoryId: z
		.string()
		.optional()
		.describe("Filter by vehicle category"),
	clientType: z
		.enum(["PARTNER", "PRIVATE", "ALL"])
		.optional()
		.default("ALL")
		.describe("Filter by client type"),
	search: z
		.string()
		.optional()
		.describe("Search in contact name, pickup/dropoff addresses"),
});

// Response types
interface MissionAssignment {
	vehicleId: string | null;
	vehicleName: string | null;
	baseName: string | null;
	driverId: string | null;
	driverName: string | null;
}

interface MissionProfitability {
	marginPercent: number | null;
	level: "green" | "orange" | "red";
}

interface MissionCompliance {
	status: "OK" | "WARNING" | "VIOLATION";
	warnings: string[];
}

interface MissionListItem {
	id: string;
	quoteId: string;
	pickupAt: string;
	pickupAddress: string;
	dropoffAddress: string;
	pickupLatitude: number | null;
	pickupLongitude: number | null;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	passengerCount: number;
	luggageCount: number;
	finalPrice: number;
	contact: {
		id: string;
		displayName: string;
		isPartner: boolean;
	};
	vehicleCategory: {
		id: string;
		name: string;
		code: string;
	};
	assignment: MissionAssignment | null;
	profitability: MissionProfitability;
	compliance: MissionCompliance;
}

/**
 * Calculate profitability level based on margin percentage
 */
function getProfitabilityLevel(
	marginPercent: number | null,
): "green" | "orange" | "red" {
	if (marginPercent === null) return "orange";
	if (marginPercent >= 20) return "green";
	if (marginPercent >= 0) return "orange";
	return "red";
}

/**
 * Extract compliance status from tripAnalysis
 */
function getComplianceStatus(tripAnalysis: unknown): MissionCompliance {
	if (!tripAnalysis || typeof tripAnalysis !== "object") {
		return { status: "OK", warnings: [] };
	}

	const analysis = tripAnalysis as Record<string, unknown>;
	const complianceResult = analysis.complianceResult as
		| Record<string, unknown>
		| undefined;

	if (!complianceResult) {
		return { status: "OK", warnings: [] };
	}

	const violations = (complianceResult.violations as unknown[]) || [];
	const warnings = (complianceResult.warnings as unknown[]) || [];

	if (violations.length > 0) {
		return {
			status: "VIOLATION",
			warnings: violations.map((v) =>
				typeof v === "object" && v !== null && "message" in v
					? String((v as { message: string }).message)
					: String(v),
			),
		};
	}

	if (warnings.length > 0) {
		return {
			status: "WARNING",
			warnings: warnings.map((w) =>
				typeof w === "object" && w !== null && "message" in w
					? String((w as { message: string }).message)
					: String(w),
			),
		};
	}

	return { status: "OK", warnings: [] };
}

/**
 * Extract vehicle assignment from tripAnalysis
 * For now, returns null as assignment is not yet stored (Story 8.2)
 */
function getAssignment(tripAnalysis: unknown): MissionAssignment | null {
	if (!tripAnalysis || typeof tripAnalysis !== "object") {
		return null;
	}

	const analysis = tripAnalysis as Record<string, unknown>;
	const vehicleSelection = analysis.vehicleSelection as
		| Record<string, unknown>
		| undefined;

	if (!vehicleSelection || !vehicleSelection.selectedVehicle) {
		return null;
	}

	const selected = vehicleSelection.selectedVehicle as Record<string, unknown>;

	return {
		vehicleId: (selected.vehicleId as string) || null,
		vehicleName: (selected.vehicleName as string) || null,
		baseName: (selected.baseName as string) || null,
		driverId: null, // Driver assignment not yet implemented
		driverName: null,
	};
}

export const missionsRouter = new Hono()
	.basePath("/missions")
	.use("*", organizationMiddleware)

	// List missions (accepted quotes with future pickupAt)
	.get(
		"/",
		validator("query", listMissionsSchema),
		describeRoute({
			summary: "List missions",
			description:
				"Get a paginated list of missions (accepted quotes with future pickup dates) for dispatch",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, dateFrom, dateTo, vehicleCategoryId, clientType, search } =
				c.req.valid("query");

			const skip = (page - 1) * limit;
			const now = new Date();

			// Build where clause
			const baseWhere: Prisma.QuoteWhereInput = {
				status: "ACCEPTED",
				pickupAt: {
					gte: dateFrom ? new Date(dateFrom) : now,
					...(dateTo && { lte: new Date(dateTo) }),
				},
				...(vehicleCategoryId && { vehicleCategoryId }),
			};

			// Client type filter
			if (clientType && clientType !== "ALL") {
				baseWhere.contact = {
					isPartner: clientType === "PARTNER",
				};
			}

			// Search filter
			if (search) {
				baseWhere.OR = [
					{
						contact: { displayName: { contains: search, mode: "insensitive" } },
					},
					{
						contact: { companyName: { contains: search, mode: "insensitive" } },
					},
					{ pickupAddress: { contains: search, mode: "insensitive" } },
					{ dropoffAddress: { contains: search, mode: "insensitive" } },
				];
			}

			const where = withTenantFilter(baseWhere, organizationId);

			const [quotes, total] = await Promise.all([
				db.quote.findMany({
					where,
					skip,
					take: limit,
					orderBy: { pickupAt: "asc" },
					include: {
						contact: true,
						vehicleCategory: true,
					},
				}),
				db.quote.count({ where }),
			]);

			// Transform quotes to missions
			const missions: MissionListItem[] = quotes.map((quote) => ({
				id: quote.id,
				quoteId: quote.id,
				pickupAt: quote.pickupAt.toISOString(),
				pickupAddress: quote.pickupAddress,
				dropoffAddress: quote.dropoffAddress,
				pickupLatitude: quote.pickupLatitude
					? Number(quote.pickupLatitude)
					: null,
				pickupLongitude: quote.pickupLongitude
					? Number(quote.pickupLongitude)
					: null,
				dropoffLatitude: quote.dropoffLatitude
					? Number(quote.dropoffLatitude)
					: null,
				dropoffLongitude: quote.dropoffLongitude
					? Number(quote.dropoffLongitude)
					: null,
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount,
				finalPrice: Number(quote.finalPrice),
				contact: {
					id: quote.contact.id,
					displayName: quote.contact.displayName,
					isPartner: quote.contact.isPartner,
				},
				vehicleCategory: {
					id: quote.vehicleCategory.id,
					name: quote.vehicleCategory.name,
					code: quote.vehicleCategory.code,
				},
				assignment: getAssignment(quote.tripAnalysis),
				profitability: {
					marginPercent: quote.marginPercent
						? Number(quote.marginPercent)
						: null,
					level: getProfitabilityLevel(
						quote.marginPercent ? Number(quote.marginPercent) : null,
					),
				},
				compliance: getComplianceStatus(quote.tripAnalysis),
			}));

			return c.json({
				data: missions,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single mission detail
	.get(
		"/:id",
		describeRoute({
			summary: "Get mission detail",
			description:
				"Get detailed mission information including tripAnalysis for dispatch",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const quote = await db.quote.findFirst({
				where: {
					...withTenantId(id, organizationId),
					status: "ACCEPTED",
				},
				include: {
					contact: true,
					vehicleCategory: true,
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Mission not found",
				});
			}

			const mission = {
				id: quote.id,
				quoteId: quote.id,
				pickupAt: quote.pickupAt.toISOString(),
				pickupAddress: quote.pickupAddress,
				dropoffAddress: quote.dropoffAddress,
				pickupLatitude: quote.pickupLatitude
					? Number(quote.pickupLatitude)
					: null,
				pickupLongitude: quote.pickupLongitude
					? Number(quote.pickupLongitude)
					: null,
				dropoffLatitude: quote.dropoffLatitude
					? Number(quote.dropoffLatitude)
					: null,
				dropoffLongitude: quote.dropoffLongitude
					? Number(quote.dropoffLongitude)
					: null,
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount,
				finalPrice: Number(quote.finalPrice),
				internalCost: quote.internalCost ? Number(quote.internalCost) : null,
				marginPercent: quote.marginPercent ? Number(quote.marginPercent) : null,
				suggestedPrice: Number(quote.suggestedPrice),
				pricingMode: quote.pricingMode,
				tripType: quote.tripType,
				notes: quote.notes,
				contact: {
					id: quote.contact.id,
					displayName: quote.contact.displayName,
					isPartner: quote.contact.isPartner,
					email: quote.contact.email,
					phone: quote.contact.phone,
				},
				vehicleCategory: {
					id: quote.vehicleCategory.id,
					name: quote.vehicleCategory.name,
					code: quote.vehicleCategory.code,
				},
				tripAnalysis: quote.tripAnalysis,
				appliedRules: quote.appliedRules,
				assignment: getAssignment(quote.tripAnalysis),
				profitability: {
					marginPercent: quote.marginPercent
						? Number(quote.marginPercent)
						: null,
					level: getProfitabilityLevel(
						quote.marginPercent ? Number(quote.marginPercent) : null,
					),
				},
				compliance: getComplianceStatus(quote.tripAnalysis),
			};

			return c.json(mission);
		},
	)

	// Get assignment candidates for a mission (Story 8.2)
	.get(
		"/:id/candidates",
		describeRoute({
			summary: "Get assignment candidates",
			description:
				"Get candidate vehicles/drivers with flexibility scores for mission assignment",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Get the mission (quote)
			const quote = await db.quote.findFirst({
				where: {
					...withTenantId(id, organizationId),
					status: "ACCEPTED",
				},
				include: {
					vehicleCategory: true,
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Mission not found",
				});
			}

			// Check if we have pickup coordinates
			if (!quote.pickupLatitude || !quote.pickupLongitude) {
				throw new HTTPException(400, {
					message: "Mission pickup coordinates are required for candidate selection",
				});
			}

			const pickup = {
				lat: Number(quote.pickupLatitude),
				lng: Number(quote.pickupLongitude),
			};

			const dropoff = quote.dropoffLatitude && quote.dropoffLongitude
				? {
						lat: Number(quote.dropoffLatitude),
						lng: Number(quote.dropoffLongitude),
					}
				: pickup; // Fallback to pickup if no dropoff

			// Load vehicles with bases
			const vehicles = await db.vehicle.findMany({
				where: {
					organizationId,
					status: "ACTIVE",
				},
				include: {
					operatingBase: true,
					vehicleCategory: true,
					requiredLicenseCategory: true,
				},
			});

			// Load drivers with licenses
			const drivers = await db.driver.findMany({
				where: {
					organizationId,
					isActive: true,
				},
				include: {
					driverLicenses: {
						include: {
							licenseCategory: true,
						},
					},
				},
			});

			// Load pricing settings
			const pricingSettings = await db.organizationPricingSettings.findFirst({
				where: { organizationId },
			});

			const settings: OrganizationPricingSettings = {
				baseRatePerKm: pricingSettings?.baseRatePerKm
					? Number(pricingSettings.baseRatePerKm)
					: 2.5,
				baseRatePerHour: pricingSettings?.baseRatePerHour
					? Number(pricingSettings.baseRatePerHour)
					: 45,
				targetMarginPercent: pricingSettings?.defaultMarginPercent
					? Number(pricingSettings.defaultMarginPercent)
					: 20,
				fuelConsumptionL100km: pricingSettings?.fuelConsumptionL100km
					? Number(pricingSettings.fuelConsumptionL100km)
					: undefined,
				fuelPricePerLiter: pricingSettings?.fuelPricePerLiter
					? Number(pricingSettings.fuelPricePerLiter)
					: undefined,
				tollCostPerKm: pricingSettings?.tollCostPerKm
					? Number(pricingSettings.tollCostPerKm)
					: undefined,
				wearCostPerKm: pricingSettings?.wearCostPerKm
					? Number(pricingSettings.wearCostPerKm)
					: undefined,
				driverHourlyCost: pricingSettings?.driverHourlyCost
					? Number(pricingSettings.driverHourlyCost)
					: undefined,
			};

			// Transform vehicles to candidates
			const vehicleCandidates: VehicleCandidate[] = vehicles.map((v) =>
				transformVehicleToCandidate(v),
			);

			// Filter by capacity and category
			const capacityFiltered = filterByCapacity(
				filterByStatus(vehicleCandidates),
				quote.passengerCount,
				quote.luggageCount,
				quote.vehicleCategoryId,
			);

			// Filter by Haversine distance
			const haversineFiltered = filterByHaversineDistance(
				capacityFiltered,
				pickup,
				DEFAULT_MAX_DISTANCE_KM,
			);

			// Get routing for top candidates (limit to 10 for performance)
			const topCandidates = haversineFiltered.slice(0, 10);
			const candidatesWithRouting = await getRoutingForCandidates(
				topCandidates,
				pickup,
				dropoff,
				settings,
			);

			// Build response with flexibility scores
			const candidates = candidatesWithRouting.map((candidate) => {
				// Find matching driver(s) for this vehicle
				const vehicleData = vehicles.find((v) => v.id === candidate.vehicleId);
				const requiredLicenseCode = vehicleData?.requiredLicenseCategory?.code;

				// Find drivers with required license
				const eligibleDrivers = drivers.filter((driver) => {
					if (!requiredLicenseCode) return true;
					return driver.driverLicenses.some(
						(dl) =>
							dl.licenseCategory.code === requiredLicenseCode &&
							(!dl.validTo || new Date(dl.validTo) > new Date()),
					);
				});

				// Use first eligible driver for now (can be enhanced later)
				const driver = eligibleDrivers[0];
				const driverLicenseCount = driver?.driverLicenses.length ?? 0;

				// Calculate flexibility score
				const scoreResult = calculateFlexibilityScoreSimple({
					licenseCount: driverLicenseCount,
					availabilityHours: 8, // Default - would come from scheduling system
					distanceKm: candidate.haversineDistanceKm,
					remainingDrivingHours: 10, // Default - would come from RSE counters
					remainingAmplitudeHours: 14, // Default - would come from RSE counters
				});

				// Determine compliance status
				const compliance = determineComplianceStatus(candidate, driver);

				return {
					vehicleId: candidate.vehicleId,
					vehicleName: candidate.vehicleName,
					vehicleCategory: {
						id: vehicleData?.vehicleCategory.id ?? "",
						name: vehicleData?.vehicleCategory.name ?? "",
						code: vehicleData?.vehicleCategory.code ?? "",
					},
					baseId: candidate.baseId,
					baseName: candidate.baseName,
					baseDistanceKm: candidate.haversineDistanceKm,
					// Story 8.3: Add base coordinates for map visualization
					baseLatitude: candidate.baseLocation.lat,
					baseLongitude: candidate.baseLocation.lng,
					driverId: driver?.id ?? null,
					driverName: driver
						? `${driver.firstName} ${driver.lastName}`
						: null,
					driverLicenses: driver?.driverLicenses.map(
						(dl) => dl.licenseCategory.code,
					) ?? [],
					flexibilityScore: scoreResult.totalScore,
					scoreBreakdown: scoreResult.breakdown,
					compliance,
					estimatedCost: {
						approach: Math.round(candidate.approachDistanceKm * (settings.baseRatePerKm ?? 2.5) * 100) / 100,
						service: Math.round(candidate.serviceDistanceKm * (settings.baseRatePerKm ?? 2.5) * 100) / 100,
						return: Math.round(candidate.returnDistanceKm * (settings.baseRatePerKm ?? 2.5) * 100) / 100,
						total: Math.round(candidate.internalCost * 100) / 100,
					},
					routingSource: candidate.routingSource,
					// Story 8.3: Add segment details for route visualization
					segments: {
						approach: {
							distanceKm: Math.round(candidate.approachDistanceKm * 100) / 100,
							durationMinutes: Math.round(candidate.approachDurationMinutes * 100) / 100,
						},
						service: {
							distanceKm: Math.round(candidate.serviceDistanceKm * 100) / 100,
							durationMinutes: Math.round(candidate.serviceDurationMinutes * 100) / 100,
						},
						return: {
							distanceKm: Math.round(candidate.returnDistanceKm * 100) / 100,
							durationMinutes: Math.round(candidate.returnDurationMinutes * 100) / 100,
						},
					},
				};
			});

			// Sort by flexibility score descending
			candidates.sort((a, b) => b.flexibilityScore - a.flexibilityScore);

			return c.json({
				candidates,
				mission: {
					id: quote.id,
					pickupAddress: quote.pickupAddress,
					dropoffAddress: quote.dropoffAddress,
					pickupAt: quote.pickupAt.toISOString(),
					vehicleCategoryId: quote.vehicleCategoryId,
					passengerCount: quote.passengerCount,
					luggageCount: quote.luggageCount,
				},
			});
		},
	)

	// Assign vehicle/driver to mission (Story 8.2)
	.post(
		"/:id/assign",
		validator(
			"json",
			z.object({
				vehicleId: z.string().min(1),
				driverId: z.string().optional(),
			}),
		),
		describeRoute({
			summary: "Assign vehicle/driver to mission",
			description:
				"Assign a vehicle and optionally a driver to a mission, updating the quote record",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const { vehicleId, driverId } = c.req.valid("json");

			// Verify mission exists
			const quote = await db.quote.findFirst({
				where: {
					...withTenantId(id, organizationId),
					status: "ACCEPTED",
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Mission not found",
				});
			}

			// Verify vehicle exists and belongs to organization
			const vehicle = await db.vehicle.findFirst({
				where: withTenantFilter({ id: vehicleId }, organizationId),
				include: {
					operatingBase: true,
					vehicleCategory: true,
				},
			});

			if (!vehicle) {
				throw new HTTPException(400, {
					message: "Vehicle not found",
				});
			}

			// Verify driver if provided
			let driver = null;
			if (driverId) {
				driver = await db.driver.findFirst({
					where: withTenantFilter({ id: driverId }, organizationId),
					include: {
						driverLicenses: {
							include: {
								licenseCategory: true,
							},
						},
					},
				});

				if (!driver) {
					throw new HTTPException(400, {
						message: "Driver not found",
					});
				}
			}

			// Update quote with assignment
			const updatedQuote = await db.quote.update({
				where: { id: quote.id },
				data: {
					assignedVehicleId: vehicleId,
					assignedDriverId: driverId ?? null,
					assignedAt: new Date(),
					// Update tripAnalysis with assignment info
					tripAnalysis: {
						...(quote.tripAnalysis as object ?? {}),
						assignment: {
							vehicleId,
							vehicleName: vehicle.internalName ?? vehicle.registrationNumber,
							baseId: vehicle.operatingBaseId,
							baseName: vehicle.operatingBase.name,
							driverId: driver?.id ?? null,
							driverName: driver
								? `${driver.firstName} ${driver.lastName}`
								: null,
							assignedAt: new Date().toISOString(),
						},
					},
				},
				include: {
					contact: true,
					vehicleCategory: true,
					assignedVehicle: {
						include: {
							operatingBase: true,
						},
					},
					assignedDriver: true,
				},
			});

			// Build response
			const assignment: MissionAssignment = {
				vehicleId: updatedQuote.assignedVehicleId,
				vehicleName: updatedQuote.assignedVehicle?.internalName ??
					updatedQuote.assignedVehicle?.registrationNumber ?? null,
				baseName: updatedQuote.assignedVehicle?.operatingBase.name ?? null,
				driverId: updatedQuote.assignedDriverId,
				driverName: updatedQuote.assignedDriver
					? `${updatedQuote.assignedDriver.firstName} ${updatedQuote.assignedDriver.lastName}`
					: null,
			};

			return c.json({
				success: true,
				message: "Assignment confirmed",
				mission: {
					id: updatedQuote.id,
					quoteId: updatedQuote.id,
					pickupAt: updatedQuote.pickupAt.toISOString(),
					pickupAddress: updatedQuote.pickupAddress,
					dropoffAddress: updatedQuote.dropoffAddress,
					assignment,
					profitability: {
						marginPercent: updatedQuote.marginPercent
							? Number(updatedQuote.marginPercent)
							: null,
						level: getProfitabilityLevel(
							updatedQuote.marginPercent
								? Number(updatedQuote.marginPercent)
								: null,
						),
					},
					compliance: getComplianceStatus(updatedQuote.tripAnalysis),
				},
			});
		},
	);

/**
 * Determine compliance status for a candidate
 */
function determineComplianceStatus(
	candidate: CandidateWithRouting,
	driver: { driverLicenses: unknown[] } | null | undefined,
): MissionCompliance {
	const warnings: string[] = [];

	// Check if driver has required licenses
	if (!driver) {
		warnings.push("No driver assigned");
	}

	// Check distance (warning if far)
	if (candidate.haversineDistanceKm > 50) {
		warnings.push(`Base is ${Math.round(candidate.haversineDistanceKm)}km away`);
	}

	// Check total duration (warning if long trip)
	if (candidate.totalDurationMinutes > 480) {
		// 8 hours
		warnings.push("Trip duration exceeds 8 hours");
	}

	// Heavy vehicle checks would go here (RSE compliance)
	if (candidate.regulatoryCategory === "HEAVY") {
		if (candidate.totalDurationMinutes > 600) {
			// 10 hours
			return {
				status: "VIOLATION",
				warnings: ["Heavy vehicle: exceeds 10h driving limit"],
			};
		}
		if (candidate.totalDurationMinutes > 540) {
			// 9 hours
			warnings.push("Heavy vehicle: approaching 10h driving limit");
		}
	}

	if (warnings.length > 0) {
		return { status: "WARNING", warnings };
	}

	return { status: "OK", warnings: [] };
}
