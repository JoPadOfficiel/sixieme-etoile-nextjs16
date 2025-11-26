/**
 * Compliance API Routes (Story 5.3)
 *
 * Provides endpoints for validating heavy-vehicle missions against RSE rules
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
	type RSERules,
	type ComplianceValidationInput,
	type RegulatoryCategory,
} from "../../services/compliance-validator";
import type { TripAnalysis } from "../../services/pricing-engine";

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
	);
