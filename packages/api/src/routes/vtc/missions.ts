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
import {
	detectChainingOpportunities,
	extractCostData,
	estimateDropoffTime,
	generateChainId,
	DEFAULT_CHAINING_CONFIG,
	type MissionForChaining,
	type ChainingSuggestion,
} from "../../services/chaining-service";

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
 * Extract vehicle assignment from quote data
 * Story 8.2: Uses assignedVehicle/assignedDriver relations or tripAnalysis.assignment
 */
function getAssignmentFromQuote(quote: {
	assignedVehicleId: string | null;
	assignedDriverId: string | null;
	assignedVehicle?: {
		internalName: string | null;
		registrationNumber: string;
		operatingBase?: { name: string } | null;
	} | null;
	assignedDriver?: {
		firstName: string;
		lastName: string;
	} | null;
	tripAnalysis: unknown;
}): MissionAssignment | null {
	// First check direct assignment fields (preferred)
	if (quote.assignedVehicleId) {
		return {
			vehicleId: quote.assignedVehicleId,
			vehicleName: quote.assignedVehicle?.internalName ??
				quote.assignedVehicle?.registrationNumber ?? null,
			baseName: quote.assignedVehicle?.operatingBase?.name ?? null,
			driverId: quote.assignedDriverId,
			driverName: quote.assignedDriver
				? `${quote.assignedDriver.firstName} ${quote.assignedDriver.lastName}`
				: null,
		};
	}

	// Fallback: check tripAnalysis.assignment (legacy)
	if (quote.tripAnalysis && typeof quote.tripAnalysis === "object") {
		const analysis = quote.tripAnalysis as Record<string, unknown>;
		const assignment = analysis.assignment as Record<string, unknown> | undefined;

		if (assignment && assignment.vehicleId) {
			return {
				vehicleId: (assignment.vehicleId as string) || null,
				vehicleName: (assignment.vehicleName as string) || null,
				baseName: (assignment.baseName as string) || null,
				driverId: (assignment.driverId as string) || null,
				driverName: (assignment.driverName as string) || null,
			};
		}

		// Also check vehicleSelection for backward compatibility
		const vehicleSelection = analysis.vehicleSelection as Record<string, unknown> | undefined;
		if (vehicleSelection?.selectedVehicle) {
			const selected = vehicleSelection.selectedVehicle as Record<string, unknown>;
			return {
				vehicleId: (selected.vehicleId as string) || null,
				vehicleName: (selected.vehicleName as string) || null,
				baseName: (selected.baseName as string) || null,
				driverId: null,
				driverName: null,
			};
		}
	}

	return null;
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
						// Story 8.2: Include assignment relations
						assignedVehicle: {
							include: {
								operatingBase: true,
							},
						},
						assignedDriver: true,
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
				assignment: getAssignmentFromQuote(quote),
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
					// Story 8.2: Include assignment relations
					assignedVehicle: {
						include: {
							operatingBase: true,
						},
					},
					assignedDriver: true,
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
				assignment: getAssignmentFromQuote(quote),
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

	// Story 5.6: Get mission compliance details
	.get(
		"/:id/compliance",
		describeRoute({
			summary: "Get mission compliance details",
			description:
				"Get detailed compliance information including validation result and audit logs for a mission",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Get the mission (quote) with vehicle category
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

			// Get regulatory category from vehicle category
			const regulatoryCategory = quote.vehicleCategory.regulatoryCategory as "LIGHT" | "HEAVY";

			// Extract compliance validation result from tripAnalysis
			let validationResult = null;
			if (quote.tripAnalysis && typeof quote.tripAnalysis === "object") {
				const analysis = quote.tripAnalysis as Record<string, unknown>;
				const complianceResult = analysis.complianceResult as Record<string, unknown> | undefined;
				
				if (complianceResult) {
					validationResult = {
						isCompliant: complianceResult.isCompliant as boolean ?? true,
						regulatoryCategory: (complianceResult.regulatoryCategory as string) ?? regulatoryCategory,
						violations: (complianceResult.violations as unknown[]) ?? [],
						warnings: (complianceResult.warnings as unknown[]) ?? [],
						adjustedDurations: (complianceResult.adjustedDurations as Record<string, unknown>) ?? {
							totalDrivingMinutes: 0,
							totalAmplitudeMinutes: 0,
							injectedBreakMinutes: 0,
							cappedSpeedApplied: false,
						},
						rulesApplied: (complianceResult.rulesApplied as unknown[]) ?? [],
					};
				}
			}

			// Get audit logs for this mission (quoteId)
			const auditLogs = await db.complianceAuditLog.findMany({
				where: {
					organizationId,
					quoteId: id,
				},
				orderBy: {
					timestamp: "desc",
				},
				take: 20,
			});

			// Transform audit logs
			const transformedLogs = auditLogs.map((log) => ({
				id: log.id,
				timestamp: log.timestamp.toISOString(),
				decision: log.decision as "APPROVED" | "BLOCKED" | "WARNING",
				reason: log.reason,
				regulatoryCategory: log.regulatoryCategory as "LIGHT" | "HEAVY",
				violations: log.violations as unknown[] | null,
				warnings: log.warnings as unknown[] | null,
				quoteId: log.quoteId,
				missionId: log.missionId,
				countersSnapshot: log.countersSnapshot,
			}));

			return c.json({
				missionId: id,
				vehicleRegulatoryCategory: regulatoryCategory,
				validationResult,
				auditLogs: transformedLogs,
			});
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

			// Filter only by status (ACTIVE) - we want to show ALL vehicles
			// Capacity and category mismatches will be shown as warnings
			const activeVehicles = filterByStatus(vehicleCandidates);
			
			// Keep track of mission requirements for compliance checks
			const missionRequirements = {
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount ?? 0,
				vehicleCategoryId: quote.vehicleCategoryId,
				vehicleCategoryName: quote.vehicleCategory?.name ?? null,
			};

			// Filter by Haversine distance - show all vehicles within range
			const haversineFiltered = filterByHaversineDistance(
				activeVehicles,
				pickup,
				DEFAULT_MAX_DISTANCE_KM,
			);

			// Get routing for top candidates (limit to 20 for more options)
			const topCandidates = haversineFiltered.slice(0, 20);
			const candidatesWithRouting = await getRoutingForCandidates(
				topCandidates,
				pickup,
				dropoff,
				settings,
			);

			// Build response with flexibility scores
			// Create one candidate entry per vehicle/driver combination
			interface CandidateResponse {
				candidateId: string;
				vehicleId: string;
				vehicleName: string;
				vehicleCategory: { id: string; name: string; code: string };
				baseId: string;
				baseName: string;
				baseDistanceKm: number;
				baseLatitude: number;
				baseLongitude: number;
				driverId: string | null;
				driverName: string | null;
				driverLicenses: string[];
				flexibilityScore: number;
				scoreBreakdown: { licensesScore: number; availabilityScore: number; distanceScore: number; rseCapacityScore: number };
				compliance: MissionCompliance;
				estimatedCost: { approach: number; service: number; return: number; total: number };
				routingSource: string;
				segments: {
					approach: { distanceKm: number; durationMinutes: number };
					service: { distanceKm: number; durationMinutes: number };
					return: { distanceKm: number; durationMinutes: number };
				};
			}

			const candidates: CandidateResponse[] = [];
			for (const candidate of candidatesWithRouting) {
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

				// If no eligible drivers, still show the vehicle without driver
				if (eligibleDrivers.length === 0) {
					const scoreResult = calculateFlexibilityScoreSimple({
						licenseCount: 0,
						availabilityHours: 8,
						distanceKm: candidate.haversineDistanceKm,
						remainingDrivingHours: 10,
						remainingAmplitudeHours: 14,
					});

					const compliance = determineComplianceStatus(
						candidate, 
						null, 
						vehicleData,
						missionRequirements,
					);

					candidates.push({
						candidateId: `${candidate.vehicleId}:no-driver`,
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
						baseLatitude: candidate.baseLocation.lat,
						baseLongitude: candidate.baseLocation.lng,
						driverId: null,
						driverName: null,
						driverLicenses: [],
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
					});
					continue;
				}

				// Create one entry per eligible driver for this vehicle
				for (const driver of eligibleDrivers) {
					const driverLicenseCount = driver.driverLicenses.length;

					// Calculate flexibility score based on driver's licenses
					const scoreResult = calculateFlexibilityScoreSimple({
						licenseCount: driverLicenseCount,
						availabilityHours: 8, // Default - would come from scheduling system
						distanceKm: candidate.haversineDistanceKm,
						remainingDrivingHours: 10, // Default - would come from RSE counters
						remainingAmplitudeHours: 14, // Default - would come from RSE counters
					});

					// Determine compliance status
					const compliance = determineComplianceStatus(
						candidate, 
						driver, 
						vehicleData,
						missionRequirements,
					);

					candidates.push({
						candidateId: `${candidate.vehicleId}:${driver.id}`,
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
						driverId: driver.id,
						driverName: `${driver.firstName} ${driver.lastName}`,
						driverLicenses: driver.driverLicenses.map(
							(dl) => dl.licenseCategory.code,
						),
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
					});
				}
			}

			// Sort by flexibility score descending
			candidates.sort((a: { flexibilityScore: number }, b: { flexibilityScore: number }) => b.flexibilityScore - a.flexibilityScore);

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
 * Checks: driver assignment, distance, duration, RSE limits, capacity, category
 */
function determineComplianceStatus(
	candidate: CandidateWithRouting,
	driver: { driverLicenses: unknown[] } | null | undefined,
	vehicleData: {
		passengerCapacity: number;
		luggageCapacity: number | null;
		vehicleCategoryId: string;
		vehicleCategory: { id: string; name: string; code: string };
	} | undefined,
	missionRequirements: {
		passengerCount: number;
		luggageCount: number;
		vehicleCategoryId: string;
		vehicleCategoryName: string | null;
	},
): MissionCompliance {
	const warnings: string[] = [];
	let hasViolation = false;
	const violations: string[] = [];

	// Check if driver has required licenses
	if (!driver) {
		warnings.push("Aucun chauffeur assigné");
	}

	// Check passenger capacity
	if (vehicleData) {
		if (vehicleData.passengerCapacity < missionRequirements.passengerCount) {
			violations.push(
				`Capacité insuffisante: ${vehicleData.passengerCapacity} places vs ${missionRequirements.passengerCount} passagers requis`
			);
			hasViolation = true;
		}

		// Check luggage capacity (only if vehicle has a defined luggage capacity)
		// If luggageCapacity is null, we assume it's not specified (not 0)
		if (missionRequirements.luggageCount > 0 && vehicleData.luggageCapacity !== null) {
			if (vehicleData.luggageCapacity < missionRequirements.luggageCount) {
				warnings.push(
					`Capacité bagages limitée: ${vehicleData.luggageCapacity} vs ${missionRequirements.luggageCount} requis`
				);
			}
		}

		// Check vehicle category mismatch
		if (vehicleData.vehicleCategoryId !== missionRequirements.vehicleCategoryId) {
			warnings.push(
				`Catégorie différente: ${vehicleData.vehicleCategory.name} (demandé: ${missionRequirements.vehicleCategoryName ?? "N/A"})`
			);
		}
	}

	// Check distance (warning if very far - 80km threshold)
	// This is a soft warning, not a blocker
	if (candidate.haversineDistanceKm > 80) {
		warnings.push(`Base éloignée: ${Math.round(candidate.haversineDistanceKm)}km`);
	}

	// Check total duration (warning if long trip)
	if (candidate.totalDurationMinutes > 480) {
		// 8 hours
		warnings.push("Durée du trajet > 8h");
	}

	// Heavy vehicle checks (RSE compliance)
	if (candidate.regulatoryCategory === "HEAVY") {
		if (candidate.totalDurationMinutes > 600) {
			// 10 hours
			violations.push("Véhicule lourd: dépasse 10h de conduite (RSE)");
			hasViolation = true;
		} else if (candidate.totalDurationMinutes > 540) {
			// 9 hours
			warnings.push("Véhicule lourd: proche de la limite 10h (RSE)");
		}

		// Check amplitude (14h max for heavy vehicles)
		const totalAmplitudeMinutes = candidate.totalDurationMinutes + 60; // Add 1h for breaks
		if (totalAmplitudeMinutes > 840) {
			// 14 hours
			violations.push("Véhicule lourd: amplitude > 14h (RSE)");
			hasViolation = true;
		} else if (totalAmplitudeMinutes > 780) {
			// 13 hours
			warnings.push("Véhicule lourd: amplitude proche de 14h (RSE)");
		}
	}

	// Return violation status if any critical issues
	if (hasViolation) {
		return {
			status: "VIOLATION",
			warnings: [...violations, ...warnings],
		};
	}

	if (warnings.length > 0) {
		return { status: "WARNING", warnings };
	}

	return { status: "OK", warnings: [] };
}

// ============================================================================
// Chaining Endpoints (Story 8.4)
// ============================================================================

/**
 * Transform a Quote to MissionForChaining
 */
function quoteToMissionForChaining(quote: {
	id: string;
	pickupAt: Date;
	pickupAddress: string;
	pickupLatitude: unknown;
	pickupLongitude: unknown;
	dropoffAddress: string;
	dropoffLatitude: unknown;
	dropoffLongitude: unknown;
	vehicleCategoryId: string;
	vehicleCategory?: { id: string; name: string; code: string };
	contact?: { displayName: string };
	chainId: string | null;
	tripAnalysis: unknown;
}): MissionForChaining {
	const costData = extractCostData(quote.tripAnalysis);
	
	return {
		id: quote.id,
		pickupAt: quote.pickupAt,
		pickupAddress: quote.pickupAddress,
		pickupLatitude: quote.pickupLatitude ? Number(quote.pickupLatitude) : null,
		pickupLongitude: quote.pickupLongitude ? Number(quote.pickupLongitude) : null,
		dropoffAddress: quote.dropoffAddress,
		dropoffLatitude: quote.dropoffLatitude ? Number(quote.dropoffLatitude) : null,
		dropoffLongitude: quote.dropoffLongitude ? Number(quote.dropoffLongitude) : null,
		vehicleCategoryId: quote.vehicleCategoryId,
		vehicleCategory: quote.vehicleCategory,
		contact: quote.contact,
		chainId: quote.chainId,
		estimatedDropoffAt: estimateDropoffTime(quote.pickupAt),
		...costData,
	};
}

// Add chaining endpoints to the router
export const chainingRouter = new Hono()
	.basePath("/missions")
	.use("*", organizationMiddleware)

	// Get chaining suggestions for a mission (Story 8.4)
	.get(
		"/:id/chaining-suggestions",
		describeRoute({
			summary: "Get chaining suggestions",
			description:
				"Get trip chaining suggestions for a mission to reduce deadhead segments",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Get the source mission
			const sourceQuote = await db.quote.findFirst({
				where: {
					...withTenantId(id, organizationId),
					status: "ACCEPTED",
				},
				include: {
					vehicleCategory: true,
					contact: true,
				},
			});

			if (!sourceQuote) {
				throw new HTTPException(404, {
					message: "Mission not found",
				});
			}

			// Get candidate missions in time window (±4 hours)
			const searchWindowMs = DEFAULT_CHAINING_CONFIG.searchWindowHours * 60 * 60 * 1000;
			const minTime = new Date(sourceQuote.pickupAt.getTime() - searchWindowMs);
			const maxTime = new Date(sourceQuote.pickupAt.getTime() + searchWindowMs);

			const candidateQuotes = await db.quote.findMany({
				where: {
					organizationId,
					status: "ACCEPTED",
					id: { not: id },
					pickupAt: {
						gte: minTime,
						lte: maxTime,
					},
				},
				include: {
					vehicleCategory: true,
					contact: true,
				},
			});

			// Transform to MissionForChaining
			const sourceMission = quoteToMissionForChaining(sourceQuote);
			const candidateMissions = candidateQuotes.map(quoteToMissionForChaining);

			// Detect chaining opportunities
			const suggestions = detectChainingOpportunities(
				sourceMission,
				candidateMissions,
				DEFAULT_CHAINING_CONFIG,
			);

			return c.json({
				suggestions,
				mission: {
					id: sourceQuote.id,
					pickupAt: sourceQuote.pickupAt.toISOString(),
					pickupAddress: sourceQuote.pickupAddress,
					dropoffAddress: sourceQuote.dropoffAddress,
					dropoffAt: estimateDropoffTime(sourceQuote.pickupAt).toISOString(),
				},
			});
		},
	)

	// Apply chain to missions (Story 8.4)
	.post(
		"/:id/apply-chain",
		validator(
			"json",
			z.object({
				targetMissionId: z.string().min(1),
				chainOrder: z.enum(["BEFORE", "AFTER"]),
			}),
		),
		describeRoute({
			summary: "Apply chain to missions",
			description:
				"Chain two missions together to reduce deadhead segments",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const { targetMissionId, chainOrder } = c.req.valid("json");

			// Verify both missions exist and are not already chained
			const [sourceQuote, targetQuote] = await Promise.all([
				db.quote.findFirst({
					where: {
						...withTenantId(id, organizationId),
						status: "ACCEPTED",
					},
				}),
				db.quote.findFirst({
					where: {
						...withTenantId(targetMissionId, organizationId),
						status: "ACCEPTED",
					},
				}),
			]);

			if (!sourceQuote) {
				throw new HTTPException(404, {
					message: "Source mission not found",
				});
			}

			if (!targetQuote) {
				throw new HTTPException(404, {
					message: "Target mission not found",
				});
			}

			if (sourceQuote.chainId) {
				throw new HTTPException(400, {
					message: "Source mission is already part of a chain",
				});
			}

			if (targetQuote.chainId) {
				throw new HTTPException(400, {
					message: "Target mission is already part of a chain",
				});
			}

			// Generate chain ID
			const chainId = generateChainId();

			// Determine chain order
			const firstMissionId = chainOrder === "AFTER" ? id : targetMissionId;
			const secondMissionId = chainOrder === "AFTER" ? targetMissionId : id;

			// Update both missions with chain info
			const [updatedFirst, updatedSecond] = await Promise.all([
				db.quote.update({
					where: { id: firstMissionId },
					data: {
						chainId,
						chainOrder: 1,
						chainedWithId: secondMissionId,
					},
				}),
				db.quote.update({
					where: { id: secondMissionId },
					data: {
						chainId,
						chainOrder: 2,
						chainedWithId: null, // Last in chain
					},
				}),
			]);

			// Calculate savings (simplified - would need full recalculation)
			const sourceCosts = extractCostData(sourceQuote.tripAnalysis);
			const targetCosts = extractCostData(targetQuote.tripAnalysis);
			const estimatedSavings = {
				distanceKm: Math.round(
					((sourceCosts.returnDistanceKm || 0) + (targetCosts.approachDistanceKm || 0)) * 0.8 * 100
				) / 100,
				costEur: Math.round(
					((sourceCosts.returnCost || 0) + (targetCosts.approachCost || 0)) * 0.8 * 100
				) / 100,
			};

			return c.json({
				success: true,
				chainId,
				updatedMissions: [
					{
						id: updatedFirst.id,
						chainOrder: 1,
						newInternalCost: Number(updatedFirst.internalCost) || 0,
						newMarginPercent: Number(updatedFirst.marginPercent) || 0,
					},
					{
						id: updatedSecond.id,
						chainOrder: 2,
						newInternalCost: Number(updatedSecond.internalCost) || 0,
						newMarginPercent: Number(updatedSecond.marginPercent) || 0,
					},
				],
				totalSavings: estimatedSavings,
				message: "Chain applied successfully",
			});
		},
	)

	// Remove chain from mission (Story 8.4)
	.delete(
		"/:id/chain",
		describeRoute({
			summary: "Remove chain from mission",
			description:
				"Remove a mission from its chain, dissolving the chain if needed",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Get the mission
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

			if (!quote.chainId) {
				throw new HTTPException(400, {
					message: "Mission is not part of a chain",
				});
			}

			// Find all missions in the same chain
			const chainedMissions = await db.quote.findMany({
				where: {
					organizationId,
					chainId: quote.chainId,
				},
			});

			// Remove chain from all missions
			await db.quote.updateMany({
				where: {
					organizationId,
					chainId: quote.chainId,
				},
				data: {
					chainId: null,
					chainOrder: null,
					chainedWithId: null,
				},
			});

			return c.json({
				success: true,
				affectedMissions: chainedMissions.map((m) => m.id),
				message: "Chain removed successfully",
			});
		},
	);
