/**
 * Compliance API Routes (Story 5.3 + Story 5.4)
 *
 * Provides endpoints for validating heavy-vehicle missions against RSE rules
 * and generating alternative staffing/scheduling options
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
	withTenantFilter,
	withTenantId,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import {
	validateHeavyVehicleCompliance,
	getComplianceSummary,
	generateAlternatives,
	DEFAULT_ALTERNATIVE_COST_PARAMETERS,
	type RSERules,
	type ComplianceValidationInput,
	type RegulatoryCategory,
	type AlternativeCostParameters,
} from "../../services/compliance-validator";
import type { TripAnalysis } from "../../services/pricing-engine";
import {
	checkCumulativeCompliance,
	logComplianceDecision,
	getDriverCounterByRegime,
	type RegulatoryCategory as RSERegime,
} from "../../services/rse-counter";

// ============================================================================
// Validation Schemas
// ============================================================================

// Simplified tripAnalysis schema - detailed validation is done in the service
// We only need the segments with durations for compliance checking
const tripAnalysisSchema = z.object({
	segments: z.object({
		approach: z.object({
			durationMinutes: z.number().nonnegative(),
			distanceKm: z.number().nonnegative().optional(),
		}).nullable().optional(),
		service: z.object({
			durationMinutes: z.number().nonnegative(),
			distanceKm: z.number().nonnegative().optional(),
		}),
		return: z.object({
			durationMinutes: z.number().nonnegative(),
			distanceKm: z.number().nonnegative().optional(),
		}).nullable().optional(),
	}),
	totalDurationMinutes: z.number().nonnegative().optional(),
}).passthrough(); // Allow additional fields

const validateComplianceSchema = z.object({
	vehicleCategoryId: z.string().min(1),
	regulatoryCategory: z.enum(["LIGHT", "HEAVY"]),
	licenseCategoryId: z.string().optional(),
	tripAnalysis: tripAnalysisSchema,
	pickupAt: z.string().datetime(),
	estimatedDropoffAt: z.string().datetime().optional(),
});

const getRulesQuerySchema = z.object({
	vehicleCategoryId: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load RSE rules for a license category from the database
 */
async function loadRSERulesForLicenseCategory(
	organizationId: string,
	licenseCategoryId: string,
): Promise<RSERules | null> {
	const rule = await db.organizationLicenseRule.findFirst({
		where: {
			organizationId,
			licenseCategoryId,
		},
		include: {
			licenseCategory: true,
		},
	});

	if (!rule) {
		return null;
	}

	return {
		licenseCategoryId: rule.licenseCategoryId,
		licenseCategoryCode: rule.licenseCategory.code,
		maxDailyDrivingHours: Number(rule.maxDailyDrivingHours),
		maxDailyAmplitudeHours: Number(rule.maxDailyAmplitudeHours),
		breakMinutesPerDrivingBlock: rule.breakMinutesPerDrivingBlock,
		drivingBlockHoursForBreak: Number(rule.drivingBlockHoursForBreak),
		cappedAverageSpeedKmh: rule.cappedAverageSpeedKmh,
	};
}

/**
 * Load RSE rules for a vehicle category
 * For HEAVY vehicles, we look for any RSE rules configured for the organization
 * that have a capped speed (indicating heavy vehicle rules)
 */
async function loadRSERulesForVehicleCategory(
	organizationId: string,
	vehicleCategoryId: string,
): Promise<{ rules: RSERules | null; vehicleCategory: { id: string; name: string; code: string; regulatoryCategory: string } | null }> {
	// Get the vehicle category
	const vehicleCategory = await db.vehicleCategory.findFirst({
		where: withTenantId(vehicleCategoryId, organizationId),
	});

	if (!vehicleCategory) {
		return { rules: null, vehicleCategory: null };
	}

	// For LIGHT vehicles, no RSE rules apply
	if (vehicleCategory.regulatoryCategory === "LIGHT") {
		return {
			rules: null,
			vehicleCategory: {
				id: vehicleCategory.id,
				name: vehicleCategory.name,
				code: vehicleCategory.code,
				regulatoryCategory: vehicleCategory.regulatoryCategory,
			},
		};
	}

	// For HEAVY vehicles, find RSE rules with capped speed (heavy vehicle indicator)
	const heavyRule = await db.organizationLicenseRule.findFirst({
		where: {
			organizationId,
			cappedAverageSpeedKmh: { not: null },
		},
		include: {
			licenseCategory: true,
		},
	});

	if (!heavyRule) {
		return {
			rules: null,
			vehicleCategory: {
				id: vehicleCategory.id,
				name: vehicleCategory.name,
				code: vehicleCategory.code,
				regulatoryCategory: vehicleCategory.regulatoryCategory,
			},
		};
	}

	return {
		rules: {
			licenseCategoryId: heavyRule.licenseCategoryId,
			licenseCategoryCode: heavyRule.licenseCategory.code,
			maxDailyDrivingHours: Number(heavyRule.maxDailyDrivingHours),
			maxDailyAmplitudeHours: Number(heavyRule.maxDailyAmplitudeHours),
			breakMinutesPerDrivingBlock: heavyRule.breakMinutesPerDrivingBlock,
			drivingBlockHoursForBreak: Number(heavyRule.drivingBlockHoursForBreak),
			cappedAverageSpeedKmh: heavyRule.cappedAverageSpeedKmh,
		},
		vehicleCategory: {
			id: vehicleCategory.id,
			name: vehicleCategory.name,
			code: vehicleCategory.code,
			regulatoryCategory: vehicleCategory.regulatoryCategory,
		},
	};
}

// ============================================================================
// Routes
// ============================================================================

export const complianceRouter = new Hono()
	.basePath("/compliance")
	.use("*", organizationMiddleware)

	// Validate a trip against RSE compliance rules
	.post(
		"/validate",
		validator("json", validateComplianceSchema),
		describeRoute({
			summary: "Validate trip compliance",
			description:
				"Validate a trip against heavy-vehicle RSE compliance rules. Returns violations, warnings, and adjusted durations.",
			tags: ["VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Load RSE rules
			let rules: RSERules | null = null;

			if (data.licenseCategoryId) {
				// Use explicit license category
				rules = await loadRSERulesForLicenseCategory(
					organizationId,
					data.licenseCategoryId,
				);
			} else {
				// Try to get rules from vehicle category
				const result = await loadRSERulesForVehicleCategory(
					organizationId,
					data.vehicleCategoryId,
				);
				rules = result.rules;
			}

			// Build validation input
			const input: ComplianceValidationInput = {
				organizationId,
				vehicleCategoryId: data.vehicleCategoryId,
				regulatoryCategory: data.regulatoryCategory as RegulatoryCategory,
				licenseCategoryId: data.licenseCategoryId,
				tripAnalysis: data.tripAnalysis as unknown as TripAnalysis,
				pickupAt: new Date(data.pickupAt),
				estimatedDropoffAt: data.estimatedDropoffAt
					? new Date(data.estimatedDropoffAt)
					: undefined,
			};

			// Run validation
			const result = validateHeavyVehicleCompliance(input, rules);

			// Add summary for convenience
			const summary = getComplianceSummary(result);

			return c.json({
				...result,
				summary,
			});
		},
	)

	// Get RSE rules for a license category
	.get(
		"/rules/:licenseCategoryId",
		describeRoute({
			summary: "Get RSE rules for license category",
			description:
				"Get the configured RSE compliance rules for a specific license category",
			tags: ["VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const licenseCategoryId = c.req.param("licenseCategoryId");

			const rules = await loadRSERulesForLicenseCategory(
				organizationId,
				licenseCategoryId,
			);

			if (!rules) {
				throw new HTTPException(404, {
					message: `No RSE rules found for license category ${licenseCategoryId}`,
				});
			}

			return c.json(rules);
		},
	)

	// Get RSE rules for a vehicle category
	.get(
		"/rules/vehicle/:vehicleCategoryId",
		describeRoute({
			summary: "Get RSE rules for vehicle category",
			description:
				"Get the configured RSE compliance rules for a vehicle category (via its required license)",
			tags: ["VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const vehicleCategoryId = c.req.param("vehicleCategoryId");

			// First get the vehicle category
			const vehicleCategory = await db.vehicleCategory.findFirst({
				where: withTenantId(vehicleCategoryId, organizationId),
			});

			if (!vehicleCategory) {
				throw new HTTPException(404, {
					message: `Vehicle category ${vehicleCategoryId} not found`,
				});
			}

			const result = await loadRSERulesForVehicleCategory(
				organizationId,
				vehicleCategoryId,
			);

			return c.json({
				vehicleCategory: result.vehicleCategory,
				rules: result.rules ?? null,
				hasRules: result.rules !== null,
			});
		},
	)

	// List all RSE rules for the organization
	.get(
		"/rules",
		validator("query", getRulesQuerySchema),
		describeRoute({
			summary: "List all RSE rules",
			description:
				"Get all configured RSE compliance rules for the organization",
			tags: ["VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { vehicleCategoryId } = c.req.valid("query");

			// Build where clause
			let licenseCategoryIds: string[] | undefined;

			if (vehicleCategoryId) {
				// Filter by vehicle category - for HEAVY vehicles, get rules with capped speed
				const vehicleCategory = await db.vehicleCategory.findFirst({
					where: withTenantId(vehicleCategoryId, organizationId),
				});

				if (vehicleCategory?.regulatoryCategory === "HEAVY") {
					// For heavy vehicles, we want rules with capped speed
					// The filter will be applied differently below
				}
				// For LIGHT vehicles, no specific filtering needed - return all rules
			}

			const rules = await db.organizationLicenseRule.findMany({
				where: {
					organizationId,
					...(licenseCategoryIds && {
						licenseCategoryId: { in: licenseCategoryIds },
					}),
				},
				include: {
					licenseCategory: true,
				},
				orderBy: {
					licenseCategory: {
						code: "asc",
					},
				},
			});

			return c.json({
				data: rules.map((rule) => ({
					id: rule.id,
					licenseCategoryId: rule.licenseCategoryId,
					licenseCategoryCode: rule.licenseCategory.code,
					licenseCategoryName: rule.licenseCategory.name,
					maxDailyDrivingHours: Number(rule.maxDailyDrivingHours),
					maxDailyAmplitudeHours: Number(rule.maxDailyAmplitudeHours),
					breakMinutesPerDrivingBlock: rule.breakMinutesPerDrivingBlock,
					drivingBlockHoursForBreak: Number(rule.drivingBlockHoursForBreak),
					cappedAverageSpeedKmh: rule.cappedAverageSpeedKmh,
				})),
				total: rules.length,
			});
		},
	)

	// ============================================================================
	// Story 5.4: Alternative Staffing & Scheduling Options
	// ============================================================================

	// Generate alternatives for a non-compliant mission
	.post(
		"/alternatives",
		validator("json", validateComplianceSchema),
		describeRoute({
			summary: "Generate alternative staffing options",
			description:
				"Generate alternative staffing and scheduling options for a non-compliant heavy-vehicle mission. Returns options like double crew, relay driver, or multi-day mission with cost deltas.",
			tags: ["VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Only process HEAVY vehicles
			if (data.regulatoryCategory !== "HEAVY") {
				return c.json({
					hasAlternatives: false,
					alternatives: [],
					originalViolations: [],
					message: "Alternatives only available for heavy vehicles",
				});
			}

			// Load RSE rules
			let rules: RSERules | null = null;

			if (data.licenseCategoryId) {
				rules = await loadRSERulesForLicenseCategory(
					organizationId,
					data.licenseCategoryId,
				);
			} else {
				const result = await loadRSERulesForVehicleCategory(
					organizationId,
					data.vehicleCategoryId,
				);
				rules = result.rules;
			}

			// Build validation input
			const input: ComplianceValidationInput = {
				organizationId,
				vehicleCategoryId: data.vehicleCategoryId,
				regulatoryCategory: data.regulatoryCategory as RegulatoryCategory,
				licenseCategoryId: data.licenseCategoryId,
				tripAnalysis: data.tripAnalysis as unknown as TripAnalysis,
				pickupAt: new Date(data.pickupAt),
				estimatedDropoffAt: data.estimatedDropoffAt
					? new Date(data.estimatedDropoffAt)
					: undefined,
			};

			// First run compliance validation
			const complianceResult = validateHeavyVehicleCompliance(input, rules);

			// Load cost parameters from organization settings or use defaults
			const costParameters = await loadAlternativeCostParameters(organizationId);

			// Generate alternatives
			const alternativesResult = generateAlternatives({
				complianceResult,
				costParameters,
				rules,
			});

			return c.json(alternativesResult);
		},
	)

	// ============================================================================
	// Story 5.5: Cumulative Compliance Check with Audit Logging
	// ============================================================================

	// Check cumulative compliance before assigning a mission to a driver
	.post(
		"/check-cumulative",
		validator(
			"json",
			z.object({
				driverId: z.string().min(1),
				date: z.string().optional(), // ISO date, defaults to today
				regulatoryCategory: z.enum(["LIGHT", "HEAVY"]),
				licenseCategoryId: z.string().optional(),
				additionalDrivingMinutes: z.number().int().min(0),
				additionalAmplitudeMinutes: z.number().int().min(0).optional(),
				// Optional context for audit logging
				quoteId: z.string().optional(),
				missionId: z.string().optional(),
				vehicleCategoryId: z.string().optional(),
				logDecision: z.boolean().default(false), // Whether to log the decision
			})
		),
		describeRoute({
			summary: "Check cumulative compliance",
			description:
				"Check if adding a new activity would cause cumulative RSE violations for a driver. Optionally logs the decision for audit purposes (FR30).",
			tags: ["VTC - Compliance"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify driver exists and belongs to this organization
			const driver = await db.driver.findFirst({
				where: withTenantId(data.driverId, organizationId),
			});

			if (!driver) {
				throw new HTTPException(404, {
					message: "Driver not found",
				});
			}

			const date = data.date ? new Date(data.date) : new Date();
			const additionalAmplitude = data.additionalAmplitudeMinutes ?? data.additionalDrivingMinutes;

			// Check cumulative compliance
			const result = await checkCumulativeCompliance(
				db,
				organizationId,
				data.driverId,
				date,
				data.additionalDrivingMinutes,
				additionalAmplitude,
				data.regulatoryCategory as RSERegime,
				data.licenseCategoryId,
			);

			// Determine decision
			const decision = result.isCompliant
				? result.warnings.length > 0
					? "WARNING"
					: "APPROVED"
				: "BLOCKED";

			// Log decision if requested
			if (data.logDecision) {
				await logComplianceDecision(db, {
					organizationId,
					driverId: data.driverId,
					quoteId: data.quoteId,
					missionId: data.missionId,
					vehicleCategoryId: data.vehicleCategoryId,
					regulatoryCategory: data.regulatoryCategory as RSERegime,
					decision,
					violations: result.violations,
					warnings: result.warnings,
					reason: result.isCompliant
						? result.warnings.length > 0
							? `Approved with warnings: ${result.warnings.map((w) => w.message).join("; ")}`
							: "Cumulative compliance check passed"
						: `Blocked: ${result.violations.map((v) => v.message).join("; ")}`,
					countersSnapshot: result.projectedCounters,
				});
			}

			return c.json({
				...result,
				decision,
				decisionLogged: data.logDecision,
			});
		},
	);

// ============================================================================
// Helper Functions for Story 5.4
// ============================================================================

/**
 * Load alternative cost parameters from organization settings
 * Falls back to defaults if not configured
 * 
 * Note: hotelCostPerNight and mealAllowancePerDay are not yet in the schema,
 * so we use defaults for those. driverHourlyCost is available in OrganizationPricingSettings.
 */
async function loadAlternativeCostParameters(
	organizationId: string,
): Promise<AlternativeCostParameters> {
	// Try to load from OrganizationPricingSettings
	const settings = await db.organizationPricingSettings.findFirst({
		where: { organizationId },
	});

	if (settings) {
		return {
			// driverHourlyCost is available in the schema
			driverHourlyCost: settings.driverHourlyCost 
				? Number(settings.driverHourlyCost) 
				: DEFAULT_ALTERNATIVE_COST_PARAMETERS.driverHourlyCost,
			// hotelCostPerNight and mealAllowancePerDay not yet in schema - use defaults
			// TODO: Add these fields to OrganizationPricingSettings in a future migration
			hotelCostPerNight: DEFAULT_ALTERNATIVE_COST_PARAMETERS.hotelCostPerNight,
			mealAllowancePerDay: DEFAULT_ALTERNATIVE_COST_PARAMETERS.mealAllowancePerDay,
		};
	}

	return DEFAULT_ALTERNATIVE_COST_PARAMETERS;
}
