import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { organizationMiddleware } from "../../middleware/organization";

// Story 17.1: Zone conflict resolution strategy enum
const zoneConflictStrategyEnum = z.enum(["PRIORITY", "MOST_EXPENSIVE", "CLOSEST", "COMBINED"]);

// Story 17.2: Zone multiplier aggregation strategy enum
const zoneMultiplierAggregationStrategyEnum = z.enum(["MAX", "PICKUP_ONLY", "DROPOFF_ONLY", "AVERAGE"]);

// Story 17.3: Staffing selection policy enum
const staffingSelectionPolicyEnum = z.enum(["CHEAPEST", "FASTEST", "PREFER_INTERNAL"]);

// Validation schema for updating pricing settings
const updatePricingSettingsSchema = z.object({
	baseRatePerKm: z.number().positive().optional(),
	baseRatePerHour: z.number().positive().optional(),
	defaultMarginPercent: z.number().min(0).max(100).optional(),
	greenMarginThreshold: z.number().min(0).max(100).optional(),
	orangeMarginThreshold: z.number().min(-100).max(100).optional(),
	minimumFare: z.number().min(0).optional(),
	roundingRule: z.string().max(20).nullable().optional(),
	fuelConsumptionL100km: z.number().positive().nullable().optional(),
	fuelPricePerLiter: z.number().positive().nullable().optional(),
	tollCostPerKm: z.number().min(0).nullable().optional(),
	wearCostPerKm: z.number().min(0).nullable().optional(),
	driverHourlyCost: z.number().positive().nullable().optional(),
	// Story 17.1: Zone conflict resolution strategy
	zoneConflictStrategy: zoneConflictStrategyEnum.nullable().optional(),
	// Story 17.2: Zone multiplier aggregation strategy
	zoneMultiplierAggregationStrategy: zoneMultiplierAggregationStrategyEnum.nullable().optional(),
	// Story 17.3: Staffing selection policy
	staffingSelectionPolicy: staffingSelectionPolicyEnum.nullable().optional(),
	// Story 17.4: Staffing cost parameters (configurable per FR66)
	hotelCostPerNight: z.number().min(0).max(10000).nullable().optional(),
	mealCostPerDay: z.number().min(0).max(10000).nullable().optional(),
	driverOvernightPremium: z.number().min(0).max(10000).nullable().optional(),
	secondDriverHourlyRate: z.number().min(0).max(1000).nullable().optional(),
	relayDriverFixedFee: z.number().min(0).max(10000).nullable().optional(),
	// Story 17.12: Use driver home for deadhead calculations
	useDriverHomeForDeadhead: z.boolean().optional(),
});

// Helper to convert Decimal fields to numbers for JSON response
function serializePricingSettings(settings: {
	id: string;
	organizationId: string;
	baseRatePerKm: unknown;
	baseRatePerHour: unknown;
	defaultMarginPercent: unknown;
	greenMarginThreshold: unknown;
	orangeMarginThreshold: unknown;
	minimumFare: unknown;
	roundingRule: string | null;
	fuelConsumptionL100km: unknown;
	fuelPricePerLiter: unknown;
	tollCostPerKm: unknown;
	wearCostPerKm: unknown;
	driverHourlyCost: unknown;
	// Story 17.1: Zone conflict resolution strategy
	zoneConflictStrategy?: string | null;
	// Story 17.2: Zone multiplier aggregation strategy
	zoneMultiplierAggregationStrategy?: string | null;
	// Story 17.3: Staffing selection policy
	staffingSelectionPolicy?: string | null;
	// Story 17.4: Staffing cost parameters
	hotelCostPerNight?: unknown;
	mealCostPerDay?: unknown;
	driverOvernightPremium?: unknown;
	secondDriverHourlyRate?: unknown;
	relayDriverFixedFee?: unknown;
	// Story 17.12: Use driver home for deadhead calculations
	useDriverHomeForDeadhead?: boolean;
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: settings.id,
		organizationId: settings.organizationId,
		baseRatePerKm: Number(settings.baseRatePerKm),
		baseRatePerHour: Number(settings.baseRatePerHour),
		defaultMarginPercent: Number(settings.defaultMarginPercent),
		greenMarginThreshold: Number(settings.greenMarginThreshold),
		orangeMarginThreshold: Number(settings.orangeMarginThreshold),
		minimumFare: Number(settings.minimumFare),
		roundingRule: settings.roundingRule,
		fuelConsumptionL100km: settings.fuelConsumptionL100km
			? Number(settings.fuelConsumptionL100km)
			: null,
		fuelPricePerLiter: settings.fuelPricePerLiter
			? Number(settings.fuelPricePerLiter)
			: null,
		tollCostPerKm: settings.tollCostPerKm
			? Number(settings.tollCostPerKm)
			: null,
		wearCostPerKm: settings.wearCostPerKm
			? Number(settings.wearCostPerKm)
			: null,
		driverHourlyCost: settings.driverHourlyCost
			? Number(settings.driverHourlyCost)
			: null,
		// Story 17.1: Zone conflict resolution strategy
		zoneConflictStrategy: settings.zoneConflictStrategy,
		// Story 17.2: Zone multiplier aggregation strategy
		zoneMultiplierAggregationStrategy: settings.zoneMultiplierAggregationStrategy,
		// Story 17.3: Staffing selection policy
		staffingSelectionPolicy: settings.staffingSelectionPolicy,
		// Story 17.4: Staffing cost parameters
		hotelCostPerNight: settings.hotelCostPerNight
			? Number(settings.hotelCostPerNight)
			: null,
		mealCostPerDay: settings.mealCostPerDay
			? Number(settings.mealCostPerDay)
			: null,
		driverOvernightPremium: settings.driverOvernightPremium
			? Number(settings.driverOvernightPremium)
			: null,
		secondDriverHourlyRate: settings.secondDriverHourlyRate
			? Number(settings.secondDriverHourlyRate)
			: null,
		relayDriverFixedFee: settings.relayDriverFixedFee
			? Number(settings.relayDriverFixedFee)
			: null,
		// Story 17.12: Use driver home for deadhead calculations
		useDriverHomeForDeadhead: settings.useDriverHomeForDeadhead ?? false,
		createdAt: settings.createdAt.toISOString(),
		updatedAt: settings.updatedAt.toISOString(),
	};
}

export const pricingSettingsRouter = new Hono()
	.basePath("/pricing-settings")
	.use("*", organizationMiddleware)

	// Get pricing settings for the organization
	.get(
		"/",
		describeRoute({
			summary: "Get pricing settings",
			description:
				"Get the pricing settings for the current organization. Returns null if not configured.",
			tags: ["VTC - Pricing"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");

			const settings = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			if (!settings) {
				return c.json(null);
			}

			return c.json(serializePricingSettings(settings));
		}
	)

	// Update (upsert) pricing settings
	.patch(
		"/",
		validator("json", updatePricingSettingsSchema),
		describeRoute({
			summary: "Update pricing settings",
			description:
				"Update the pricing settings for the current organization. Creates settings if they don't exist (upsert behavior).",
			tags: ["VTC - Pricing"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Check if settings exist
			const existing = await db.organizationPricingSettings.findUnique({
				where: { organizationId },
			});

			let settings;

			if (existing) {
				// Update existing settings
				settings = await db.organizationPricingSettings.update({
					where: { organizationId },
					data,
				});
			} else {
				// Create new settings with defaults for required fields
				const createData = {
					organizationId,
					baseRatePerKm: data.baseRatePerKm ?? 1.2,
					baseRatePerHour: data.baseRatePerHour ?? 35.0,
					defaultMarginPercent: data.defaultMarginPercent ?? 20.0,
					greenMarginThreshold: data.greenMarginThreshold ?? 20.0,
					orangeMarginThreshold: data.orangeMarginThreshold ?? 0.0,
					minimumFare: data.minimumFare ?? 25.0,
					roundingRule: data.roundingRule ?? null,
					fuelConsumptionL100km: data.fuelConsumptionL100km ?? null,
					fuelPricePerLiter: data.fuelPricePerLiter ?? null,
					tollCostPerKm: data.tollCostPerKm ?? null,
					wearCostPerKm: data.wearCostPerKm ?? null,
					driverHourlyCost: data.driverHourlyCost ?? null,
				};

				settings = await db.organizationPricingSettings.create({
					data: createData,
				});
			}

			return c.json(serializePricingSettings(settings));
		}
	)

	// Get configuration health status
	.get(
		"/health",
		describeRoute({
			summary: "Get configuration health",
			description:
				"Check the health of pricing and fleet configuration for the current organization.",
			tags: ["VTC - Pricing"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");

			const [pricingSettings, vehicleCategoriesCount] = await Promise.all([
				db.organizationPricingSettings.findUnique({
					where: { organizationId },
				}),
				db.vehicleCategory.count({
					where: { organizationId, isActive: true },
				}),
			]);

			const warnings: string[] = [];
			const errors: string[] = [];

			// Check pricing settings
			if (!pricingSettings) {
				errors.push("noBaseRates");
			} else {
				// Check for zero margin threshold
				if (Number(pricingSettings.orangeMarginThreshold) === 0) {
					warnings.push("zeroMarginThreshold");
				}

				// Check for missing operational costs
				const hasAllOperationalCosts =
					pricingSettings.fuelConsumptionL100km &&
					pricingSettings.fuelPricePerLiter &&
					pricingSettings.driverHourlyCost;

				if (!hasAllOperationalCosts) {
					warnings.push("missingOperationalCosts");
				}
			}

			// Check vehicle categories
			if (vehicleCategoriesCount === 0) {
				warnings.push("noVehicleCategories");
			}

			const status =
				errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "ok";

			return c.json({
				status,
				errors,
				warnings,
				details: {
					hasPricingSettings: !!pricingSettings,
					vehicleCategoriesCount,
				},
			});
		}
	);
