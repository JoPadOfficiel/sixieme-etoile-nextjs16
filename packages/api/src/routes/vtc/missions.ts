import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import { withTenantFilter, withTenantId } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import { startOfDay } from "date-fns";
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
import {
	getShadowFleetCandidates,
	transformToAssignmentCandidate,
} from "../../services/shadow-fleet-service";

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
	// Story 20.8: Second driver for RSE double crew missions
	secondDriverId: string | null;
	secondDriverName: string | null;
}

interface MissionProfitability {
	marginPercent: number | null;
	level: "green" | "orange" | "red";
}

interface MissionCompliance {
	status: "OK" | "WARNING" | "VIOLATION";
	warnings: string[];
}

/**
 * Story 22.9: Staffing summary for mission list display
 */
interface StaffingSummary {
	driverCount: number;
	hotelNights: number;
	mealCount: number;
	totalStaffingCost: number;
	planType: "SINGLE_DRIVER" | "DOUBLE_CREW" | "RELAY" | "MULTI_DAY";
	isRSERequired: boolean;
}

interface MissionListItem {
	id: string;
	quoteId: string;
	pickupAt: string;
	pickupAddress: string;
	dropoffAddress: string | null;
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
	// Story 24.5: End Customer display for partner missions
	endCustomer: {
		id: string;
		firstName: string;
		lastName: string;
		email: string | null;
		phone: string | null;
	} | null;
	assignment: MissionAssignment | null;
	profitability: MissionProfitability;
	compliance: MissionCompliance;
	// Story 22.9: Staffing information display
	staffingSummary: StaffingSummary | null;
	tripType: string | null;
	// Story 22.11: Notes for dispatch display
	notes: string | null;
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
 * Story 20.8: Added secondDriver support for RSE double crew missions
 * Story 22.12: Skip fallback for subcontracted missions - internal resources are freed
 */
function getAssignmentFromQuote(quote: {
	assignedVehicleId: string | null;
	assignedDriverId: string | null;
	secondDriverId?: string | null;
	isSubcontracted?: boolean;
	assignedVehicle?: {
		internalName: string | null;
		registrationNumber: string;
		operatingBase?: { name: string } | null;
	} | null;
	assignedDriver?: {
		firstName: string;
		lastName: string;
	} | null;
	secondDriver?: {
		firstName: string;
		lastName: string;
	} | null;
	tripAnalysis: unknown;
}): MissionAssignment | null {
	// Story 22.12: If mission is subcontracted, don't show internal assignment
	// The subcontractor handles the mission with their own resources
	if (quote.isSubcontracted) {
		return null;
	}

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
			// Story 20.8: Second driver for RSE double crew
			secondDriverId: quote.secondDriverId ?? null,
			secondDriverName: quote.secondDriver
				? `${quote.secondDriver.firstName} ${quote.secondDriver.lastName}`
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
				// Story 20.8: Second driver from tripAnalysis
				secondDriverId: (assignment.secondDriverId as string) || null,
				secondDriverName: (assignment.secondDriverName as string) || null,
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
				secondDriverId: null,
				secondDriverName: null,
			};
		}
	}

	return null;
}

/**
 * Story 22.9: Extract staffing summary from tripAnalysis
 * Returns compact staffing information for mission list display
 */
function getStaffingSummary(tripAnalysis: unknown): StaffingSummary | null {
	if (!tripAnalysis || typeof tripAnalysis !== "object") {
		return null;
	}

	const analysis = tripAnalysis as Record<string, unknown>;
	const compliancePlan = analysis.compliancePlan as Record<string, unknown> | undefined;
	const staffingCosts = analysis.staffingCosts as Record<string, unknown> | undefined;

	if (!compliancePlan) {
		return null;
	}

	const planType = (compliancePlan.planType as string) || "SINGLE_DRIVER";
	
	// Map plan types to expected format
	const normalizedPlanType = (() => {
		switch (planType) {
			case "DOUBLE_CREW":
				return "DOUBLE_CREW" as const;
			case "RELAY_DRIVER":
			case "RELAY":
				return "RELAY" as const;
			case "MULTI_DAY":
				return "MULTI_DAY" as const;
			default:
				return "SINGLE_DRIVER" as const;
		}
	})();

	const isRSERequired = normalizedPlanType !== "SINGLE_DRIVER";

	// Extract costs breakdown
	const adjustedSchedule = compliancePlan.adjustedSchedule as Record<string, unknown> | undefined;
	const costBreakdown = compliancePlan.costBreakdown as Record<string, unknown> | undefined;

	const driverCount = adjustedSchedule?.driversRequired 
		? Number(adjustedSchedule.driversRequired) 
		: (normalizedPlanType === "DOUBLE_CREW" ? 2 : 1);
	
	const staffingBreakdown = staffingCosts?.breakdown as Record<string, unknown> | undefined;
	const hotelNights = adjustedSchedule?.hotelNightsRequired 
		? Number(adjustedSchedule.hotelNightsRequired) 
		: staffingBreakdown?.hotelNights 
			? Number(staffingBreakdown.hotelNights)
			: 0;

	const mealCount = staffingBreakdown?.mealCount 
		? Number(staffingBreakdown.mealCount)
		: 0;

	const totalStaffingCost = staffingCosts?.totalStaffingCost 
		? Number(staffingCosts.totalStaffingCost) 
		: (compliancePlan.additionalCost ? Number(compliancePlan.additionalCost) : 0);

	// Don't return summary if it's standard staffing with no costs
	if (!isRSERequired && totalStaffingCost === 0 && hotelNights === 0 && mealCount === 0) {
		return null;
	}

	return {
		driverCount,
		hotelNights,
		mealCount,
		totalStaffingCost,
		planType: normalizedPlanType,
		isRSERequired,
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
					gte: dateFrom ? new Date(dateFrom) : startOfDay(now),
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
					{
						endCustomer: { firstName: { contains: search, mode: "insensitive" } },
					},
					{
						endCustomer: { lastName: { contains: search, mode: "insensitive" } },
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
						// Story 20.8: Include second driver for RSE double crew
						secondDriver: true as any, // Temporary fix for type issue
						// Story 22.12: Include subcontractor for subcontracted missions
						subcontractor: true,
						// Story 24.5: Include endCustomer for dispatch display
						endCustomer: true,
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
					id: (quote as any).contact.id,
					displayName: (quote as any).contact.displayName,
					isPartner: (quote as any).contact.isPartner,
					email: (quote as any).contact.email,
					phone: (quote as any).contact.phone,
				},
				vehicleCategory: {
					id: (quote as any).vehicleCategory.id,
					name: (quote as any).vehicleCategory.name,
					code: (quote as any).vehicleCategory.code,
				},
				// Story 24.5: Map endCustomer
				endCustomer: (quote as any).endCustomer ? {
					id: (quote as any).endCustomer.id,
					firstName: (quote as any).endCustomer.firstName,
					lastName: (quote as any).endCustomer.lastName,
					email: (quote as any).endCustomer.email,
					phone: (quote as any).endCustomer.phone,
				} : null,
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
				// Story 22.9: Staffing information display
				staffingSummary: getStaffingSummary(quote.tripAnalysis),
				tripType: quote.tripType,
				// Story 22.11: Notes for dispatch display
				notes: quote.notes,
				// Story 22.12: Subcontracting info
				isSubcontracted: quote.isSubcontracted,
				subcontractor: quote.isSubcontracted && (quote as any).subcontractor
					? {
							id: (quote as any).subcontractor.id,
							companyName: (quote as any).subcontractor.companyName,
							contactName: (quote as any).subcontractor.contactName,
							phone: (quote as any).subcontractor.phone,
							agreedPrice: Number(quote.subcontractedPrice) || 0,
							subcontractedAt: quote.subcontractedAt?.toISOString() || new Date().toISOString(),
						}
					: null,
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
					// Story 20.8: Include second driver for RSE double crew
					secondDriver: true as any, // Temporary fix for type issue
					// Story 22.12: Include subcontractor for subcontracted missions
					subcontractor: true,
					// Story 24.5: Include endCustomer
					endCustomer: true,
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
					id: (quote as any).contact.id,
					displayName: (quote as any).contact.displayName,
					isPartner: (quote as any).contact.isPartner,
					email: (quote as any).contact.email,
					phone: (quote as any).contact.phone,
				},
				vehicleCategory: {
					id: (quote as any).vehicleCategory.id,
					name: (quote as any).vehicleCategory.name,
					code: (quote as any).vehicleCategory.code,
				},
				// Story 24.5: Map endCustomer
				endCustomer: (quote as any).endCustomer ? {
					id: (quote as any).endCustomer.id,
					firstName: (quote as any).endCustomer.firstName,
					lastName: (quote as any).endCustomer.lastName,
					email: (quote as any).endCustomer.email,
					phone: (quote as any).endCustomer.phone,
				} : null,
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
				// Story 22.12: Subcontracting info
				isSubcontracted: quote.isSubcontracted,
				subcontractor: quote.isSubcontracted && (quote as any).subcontractor
					? {
							id: (quote as any).subcontractor.id,
							companyName: (quote as any).subcontractor.companyName,
							contactName: (quote as any).subcontractor.contactName,
							phone: (quote as any).subcontractor.phone,
							agreedPrice: Number(quote.subcontractedPrice) || 0,
							subcontractedAt: quote.subcontractedAt?.toISOString() || new Date().toISOString(),
						}
					: null,
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

			// Story 19.8: Check if we have pickup coordinates - if not, we'll return all vehicles without distance filtering
			const hasCoordinates = quote.pickupLatitude && quote.pickupLongitude;

			const pickup = hasCoordinates
				? {
						lat: Number(quote.pickupLatitude),
						lng: Number(quote.pickupLongitude),
					}
				: null;

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

			// Story 20.8: Filter vehicles by capacity and status FIRST
			// Only show vehicles that can actually accommodate the mission requirements
			const activeVehicles = filterByStatus(vehicleCandidates);
			const capacityFiltered = filterByCapacity(
				activeVehicles,
				quote.passengerCount,
				quote.luggageCount ?? 0,
				quote.vehicleCategoryId,
			);
			
			// Keep track of mission requirements for compliance checks
			const missionRequirements = {
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount ?? 0,
				vehicleCategoryId: quote.vehicleCategoryId,
				vehicleCategoryName: quote.vehicleCategory?.name ?? null,
			};

			// Build response with flexibility scores
			// Create one candidate entry per vehicle/driver combination
			interface CandidateResponse {
				candidateId: string;
				vehicleId: string;
				vehicleName: string;
				vehicleCategory: { id: string; name: string; code: string };
				baseId: string;
				baseName: string;
				baseDistanceKm: number | null; // Story 19.8: Can be null when no coordinates
				baseLatitude: number;
				baseLongitude: number;
				driverId: string | null;
				driverName: string | null;
				driverLicenses: string[];
				flexibilityScore: number;
				scoreBreakdown: { licensesScore: number; availabilityScore: number; distanceScore: number; rseCapacityScore: number };
				compliance: MissionCompliance;
				estimatedCost: { approach: number | null; service: number | null; return: number | null; total: number | null }; // Story 19.8: Can be null
				routingSource: string;
				segments: {
					approach: { distanceKm: number | null; durationMinutes: number | null };
					service: { distanceKm: number | null; durationMinutes: number | null };
					return: { distanceKm: number | null; durationMinutes: number | null };
				};
			}

			const candidates: CandidateResponse[] = [];

			// Story 19.8: Different processing paths based on whether we have coordinates
			if (hasCoordinates && pickup) {
				// Original flow with coordinates - filter by distance and get routing
				const haversineFiltered = filterByHaversineDistance(
					capacityFiltered,
					pickup,
					DEFAULT_MAX_DISTANCE_KM,
				);

				// Get routing for top candidates (limit to 20 for more options)
				const topCandidates = haversineFiltered.slice(0, 20);
				const candidatesWithRouting = await getRoutingForCandidates(
					topCandidates,
					pickup,
					dropoff ?? pickup,
					settings,
				);

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
			} else {
				// Story 19.8: No coordinates - return all capacity-filtered vehicles without distance filtering
				// Limit to 50 candidates to avoid performance issues
				const limitedVehicles = capacityFiltered.slice(0, 50);

				for (const vehicleCandidate of limitedVehicles) {
					const vehicleData = vehicles.find((v) => v.id === vehicleCandidate.vehicleId);
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
							distanceKm: 0, // No distance available
							remainingDrivingHours: 10,
							remainingAmplitudeHours: 14,
						});

						// Story 19.8: Create a minimal compliance status without routing data
						const complianceNoCoords = determineComplianceStatusNoCoordinates(
							vehicleData,
							missionRequirements,
						);

						candidates.push({
							candidateId: `${vehicleCandidate.vehicleId}:no-driver`,
							vehicleId: vehicleCandidate.vehicleId,
							vehicleName: vehicleCandidate.vehicleName,
							vehicleCategory: {
								id: vehicleData?.vehicleCategory.id ?? "",
								name: vehicleData?.vehicleCategory.name ?? "",
								code: vehicleData?.vehicleCategory.code ?? "",
							},
							baseId: vehicleCandidate.baseId,
							baseName: vehicleCandidate.baseName,
							baseDistanceKm: null, // Story 19.8: No distance available
							baseLatitude: vehicleCandidate.baseLocation.lat,
							baseLongitude: vehicleCandidate.baseLocation.lng,
							driverId: null,
							driverName: null,
							driverLicenses: [],
							flexibilityScore: scoreResult.totalScore,
							scoreBreakdown: scoreResult.breakdown,
							compliance: complianceNoCoords,
							estimatedCost: {
								approach: null,
								service: null,
								return: null,
								total: null,
							},
							routingSource: "NO_COORDINATES",
							segments: {
								approach: { distanceKm: null, durationMinutes: null },
								service: { distanceKm: null, durationMinutes: null },
								return: { distanceKm: null, durationMinutes: null },
							},
						});
						continue;
					}

					// Create one entry per eligible driver for this vehicle
					for (const driver of eligibleDrivers) {
						const driverLicenseCount = driver.driverLicenses.length;

						const scoreResult = calculateFlexibilityScoreSimple({
							licenseCount: driverLicenseCount,
							availabilityHours: 8,
							distanceKm: 0, // No distance available
							remainingDrivingHours: 10,
							remainingAmplitudeHours: 14,
						});

						const complianceNoCoords = determineComplianceStatusNoCoordinates(
							vehicleData,
							missionRequirements,
						);

						candidates.push({
							candidateId: `${vehicleCandidate.vehicleId}:${driver.id}`,
							vehicleId: vehicleCandidate.vehicleId,
							vehicleName: vehicleCandidate.vehicleName,
							vehicleCategory: {
								id: vehicleData?.vehicleCategory.id ?? "",
								name: vehicleData?.vehicleCategory.name ?? "",
								code: vehicleData?.vehicleCategory.code ?? "",
							},
							baseId: vehicleCandidate.baseId,
							baseName: vehicleCandidate.baseName,
							baseDistanceKm: null, // Story 19.8: No distance available
							baseLatitude: vehicleCandidate.baseLocation.lat,
							baseLongitude: vehicleCandidate.baseLocation.lng,
							driverId: driver.id,
							driverName: `${driver.firstName} ${driver.lastName}`,
							driverLicenses: driver.driverLicenses.map(
								(dl) => dl.licenseCategory.code,
							),
							flexibilityScore: scoreResult.totalScore,
							scoreBreakdown: scoreResult.breakdown,
							compliance: complianceNoCoords,
							estimatedCost: {
								approach: null,
								service: null,
								return: null,
								total: null,
							},
							routingSource: "NO_COORDINATES",
							segments: {
								approach: { distanceKm: null, durationMinutes: null },
								service: { distanceKm: null, durationMinutes: null },
								return: { distanceKm: null, durationMinutes: null },
							},
						});
					}
				}
			}

			// Sort by flexibility score descending
			candidates.sort((a: { flexibilityScore: number }, b: { flexibilityScore: number }) => b.flexibilityScore - a.flexibilityScore);

			// Story 18.9: Get Shadow Fleet candidates
			const shadowFleetResult = await getShadowFleetCandidates(
				{
					id: quote.id,
					pickupLatitude: quote.pickupLatitude ? Number(quote.pickupLatitude) : null,
					pickupLongitude: quote.pickupLongitude ? Number(quote.pickupLongitude) : null,
					dropoffLatitude: quote.dropoffLatitude ? Number(quote.dropoffLatitude) : null,
					dropoffLongitude: quote.dropoffLongitude ? Number(quote.dropoffLongitude) : null,
					vehicleCategoryId: quote.vehicleCategoryId,
					finalPrice: Number(quote.finalPrice),
					internalCost: quote.internalCost ? Number(quote.internalCost) : null,
					tripAnalysis: quote.tripAnalysis,
				},
				organizationId,
				db
			);

			// Transform Shadow Fleet candidates to assignment-compatible format
			const shadowFleetCandidates = shadowFleetResult.candidates.map((sfCandidate) =>
				transformToAssignmentCandidate(sfCandidate, shadowFleetResult.internalCost)
			);

			// Combine internal and Shadow Fleet candidates
			// Add isShadowFleet: false to internal candidates for consistency
			const internalCandidatesWithFlag = candidates.map((c) => ({
				...c,
				isShadowFleet: false as const,
			}));

			const allCandidates = [...internalCandidatesWithFlag, ...shadowFleetCandidates];

			return c.json({
				candidates: allCandidates,
				mission: {
					id: quote.id,
					pickupAddress: quote.pickupAddress,
					dropoffAddress: quote.dropoffAddress,
					pickupAt: quote.pickupAt.toISOString(),
					vehicleCategoryId: quote.vehicleCategoryId,
					passengerCount: quote.passengerCount,
					luggageCount: quote.luggageCount,
					// Story 20.8: Include tripAnalysis for double crew detection
					tripAnalysis: quote.tripAnalysis,
				},
				// Story 18.9: Include Shadow Fleet metadata
				shadowFleet: {
					count: shadowFleetCandidates.length,
					internalCost: shadowFleetResult.internalCost,
					sellingPrice: shadowFleetResult.sellingPrice,
				},
			});
		},
	)

	// Assign vehicle/driver to mission (Story 8.2, Story 20.8: Second driver support)
	.post(
		"/:id/assign",
		validator(
			"json",
			z.object({
				vehicleId: z.string().min(1),
				driverId: z.string().nullable().optional(),
				// Story 20.8: Second driver for RSE double crew missions
				secondDriverId: z.string().nullable().optional(),
			}),
		),
		describeRoute({
			summary: "Assign vehicle/driver to mission",
			description:
				"Assign a vehicle and optionally a driver (and second driver for RSE) to a mission, updating the quote record",
			tags: ["VTC - Dispatch"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			// Normalize empty strings to null/undefined
			const body = c.req.valid("json");
			const vehicleId = body.vehicleId;
			let driverId = body.driverId || null;
			let secondDriverId = body.secondDriverId || null;
			if (driverId === "") driverId = null;
			if (secondDriverId === "") secondDriverId = null;

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

			// Story 20.8: Verify second driver if provided
			let secondDriver = null;
			if (secondDriverId) {
				// Check if mission requires double crew (from tripAnalysis.compliancePlan)
				const tripAnalysis = quote.tripAnalysis as Record<string, unknown> | null;
				const compliancePlan = tripAnalysis?.compliancePlan as Record<string, unknown> | null;
				const planType = compliancePlan?.planType as string | null;

				if (planType !== "DOUBLE_CREW") {
					throw new HTTPException(400, {
						message: "Second driver not required for this mission. Only DOUBLE_CREW missions require a second driver.",
					});
				}

				// Validate that primary and secondary drivers are different
				if (secondDriverId === driverId) {
					throw new HTTPException(400, {
						message: "Primary and secondary drivers must be different",
					});
				}

				secondDriver = await db.driver.findFirst({
					where: withTenantFilter({ id: secondDriverId }, organizationId),
					include: {
						driverLicenses: {
							include: {
								licenseCategory: true,
							},
						},
					},
				});

				if (!secondDriver) {
					throw new HTTPException(400, {
						message: "Second driver not found",
					});
				}
			}

			// Update quote with assignment
			const updateData: any = {
				assignedVehicleId: vehicleId,
				assignedDriverId: driverId ?? null,
				// Story 20.8: Persist second driver for RSE double crew
				secondDriverId: secondDriverId ?? null,
				assignedAt: new Date(),
				// Update tripAnalysis with assignment info
				tripAnalysis: {
					...(quote.tripAnalysis as object ?? {}),
					assignment: {
						vehicleId,
						vehicleName: vehicle.internalName ?? vehicle.registrationNumber,
						baseId: vehicle.operatingBaseId ?? "",
						baseName: vehicle.operatingBase?.name ?? null,
						driverId: driver?.id ?? null,
						driverName: driver
							? `${driver.firstName} ${driver.lastName}`
							: null,
						// Story 20.8: Include second driver in assignment info
						secondDriverId: secondDriver?.id ?? null,
						secondDriverName: secondDriver
							? `${secondDriver.firstName} ${secondDriver.lastName}`
							: null,
						assignedAt: new Date().toISOString(),
					},
				},
			};
			
			// Update the quote first
			await db.quote.update({
				where: { id: quote.id },
				data: updateData,
			});

			// Then fetch the updated quote with relations to ensure fresh data
			const updatedQuote = await db.quote.findFirst({
				where: { id: quote.id },
				include: {
					contact: true,
					vehicleCategory: true,
					assignedVehicle: {
						include: {
							operatingBase: true,
						},
					},
					assignedDriver: true,
					// Story 20.8: Include second driver in response
					secondDriver: true,
				},
			});

			if (!updatedQuote) {
				throw new HTTPException(500, {
					message: "Failed to fetch updated mission",
				});
			}

			// Build response
			// Story 20.8: Include second driver in assignment response
			const assignment: MissionAssignment = {
				vehicleId: updatedQuote.assignedVehicleId,
				vehicleName: updatedQuote.assignedVehicle?.internalName ??
					updatedQuote.assignedVehicle?.registrationNumber ??
					vehicle.internalName ?? vehicle.registrationNumber,
				baseName: updatedQuote.assignedVehicle?.operatingBase?.name ??
					vehicle.operatingBase.name,
				driverId: updatedQuote.assignedDriverId,
				driverName: updatedQuote.assignedDriver
					? `${updatedQuote.assignedDriver.firstName} ${updatedQuote.assignedDriver.lastName}`
					: driver
						? `${driver.firstName} ${driver.lastName}`
						: null,
				secondDriverId: updatedQuote.secondDriverId,
				secondDriverName: updatedQuote.secondDriver
					? `${updatedQuote.secondDriver.firstName} ${updatedQuote.secondDriver.lastName}`
					: secondDriver
						? `${secondDriver.firstName} ${secondDriver.lastName}`
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
			warnings: violations, // Only show violations, not mixed with warnings
		};
	}

	if (warnings.length > 0) {
		return { status: "WARNING", warnings };
	}

	return { status: "OK", warnings: [] };
}

/**
 * Story 19.8: Determine compliance status when no coordinates are available
 * Only checks capacity and category - no distance/duration checks possible
 */
function determineComplianceStatusNoCoordinates(
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

	// Add warning about missing coordinates
	warnings.push("Coordonnées GPS non disponibles - distances non calculées");

	// Check passenger capacity
	if (vehicleData) {
		if (vehicleData.passengerCapacity < missionRequirements.passengerCount) {
			violations.push(
				`Capacité insuffisante: ${vehicleData.passengerCapacity} places vs ${missionRequirements.passengerCount} passagers requis`
			);
			hasViolation = true;
		}

		// Check luggage capacity (only if vehicle has a defined luggage capacity)
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

	// Return violation status if any critical issues
	if (hasViolation) {
		return {
			status: "VIOLATION",
			warnings: [...violations, ...warnings],
		};
	}

	// Always return WARNING when no coordinates (to alert user)
	return { status: "WARNING", warnings };
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
	dropoffAddress: string | null;
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
