import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { organizationMiddleware } from "../../middleware/organization";

// Story 17.1: Zone conflict resolution strategy enum
const zoneConflictStrategyEnum = z.enum([
	"PRIORITY",
	"MOST_EXPENSIVE",
	"CLOSEST",
	"COMBINED",
]);

// Story 17.2: Zone multiplier aggregation strategy enum
const zoneMultiplierAggregationStrategyEnum = z.enum([
	"MAX",
	"PICKUP_ONLY",
	"DROPOFF_ONLY",
	"AVERAGE",
]);

// Story 17.3: Staffing selection policy enum
const staffingSelectionPolicyEnum = z.enum([
	"CHEAPEST",
	"FASTEST",
	"PREFER_INTERNAL",
]);

// Story 17.9: Time bucket interpolation strategy enum
const timeBucketInterpolationStrategyEnum = z.enum([
	"ROUND_UP",
	"ROUND_DOWN",
	"PROPORTIONAL",
]);

// Story 25.3: Logo position enum for PDF documents
const logoPositionEnum = z.enum(["LEFT", "RIGHT"]);

// Story 25.4: Document language enum
const documentLanguageEnum = z.enum(["FRENCH", "ENGLISH", "BILINGUAL"]);

// Story 30.1: PDF Appearance enum
const pdfAppearanceEnum = z.enum(["SIMPLE", "STANDARD", "FULL"]);

// Story 17.15: Difficulty multipliers schema
const difficultyMultipliersSchema = z.object({
	"1": z.number().min(0.5).max(3),
	"2": z.number().min(0.5).max(3),
	"3": z.number().min(0.5).max(3),
	"4": z.number().min(0.5).max(3),
	"5": z.number().min(0.5).max(3),
});

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
	zoneMultiplierAggregationStrategy: zoneMultiplierAggregationStrategyEnum
		.nullable()
		.optional(),
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
	// Story 17.9: Time bucket interpolation strategy
	timeBucketInterpolationStrategy: timeBucketInterpolationStrategyEnum
		.nullable()
		.optional(),
	// Story 17.15: Difficulty multipliers (Patience Tax)
	difficultyMultipliers: difficultyMultipliersSchema.nullable().optional(),
	// Story 18.11: Transfer-to-MAD thresholds
	// Dense zone detection (Story 18.2)
	denseZoneSpeedThreshold: z.number().min(0).max(100).nullable().optional(),
	autoSwitchToMAD: z.boolean().optional(),
	denseZoneCodes: z.array(z.string()).optional(),
	// Round-trip detection (Story 18.3)
	minWaitingTimeForSeparateTransfers: z
		.number()
		.min(0)
		.max(1440)
		.nullable()
		.optional(),
	maxReturnDistanceKm: z.number().min(0).max(1000).nullable().optional(),
	roundTripBuffer: z.number().min(0).max(240).nullable().optional(),
	autoSwitchRoundTripToMAD: z.boolean().optional(),
	// Story 25.3: Document personalization fields
	// documentLogoUrl is a storage path, not a full URL (e.g., "orgId/uuid.png")
	documentLogoUrl: z.string().max(500).nullable().optional(),
	brandColor: z
		.string()
		.regex(/^#[0-9A-Fa-f]{6}$/)
		.nullable()
		.optional(),
	logoPosition: logoPositionEnum.optional(),
	showCompanyName: z.boolean().optional(),
	logoWidth: z.number().int().min(50).max(300).optional(),
	// Story 25.4: Document language and terms
	documentLanguage: documentLanguageEnum.optional(),
	pdfAppearance: pdfAppearanceEnum.optional(),
	invoiceTerms: z.string().max(5000).nullable().optional(),
	quoteTerms: z.string().max(5000).nullable().optional(),
	missionOrderTerms: z.string().max(5000).nullable().optional(),
});

// Helper to convert Decimal fields to numbers for JSON response
function serializePricingSettings(settings: any) {
	if (!settings) return null;

	const safeNumber = (val: any) => {
		if (val === null || val === undefined) return null;
		try {
			// Handle Prisma Decimal objects
			if (typeof val === "object" && val.toNumber) return val.toNumber();
			const n = Number(val);
			return isNaN(n) ? null : n;
		} catch (e) {
			return null;
		}
	};

	return {
		id: settings.id,
		organizationId: settings.organizationId,
		baseRatePerKm: safeNumber(settings.baseRatePerKm) ?? 1.2,
		baseRatePerHour: safeNumber(settings.baseRatePerHour) ?? 35.0,
		defaultMarginPercent: safeNumber(settings.defaultMarginPercent) ?? 20.0,
		greenMarginThreshold: safeNumber(settings.greenMarginThreshold) ?? 20.0,
		orangeMarginThreshold: safeNumber(settings.orangeMarginThreshold) ?? 0.0,
		minimumFare: safeNumber(settings.minimumFare) ?? 25.0,
		roundingRule: settings.roundingRule,
		fuelConsumptionL100km: safeNumber(settings.fuelConsumptionL100km),
		fuelPricePerLiter: safeNumber(settings.fuelPricePerLiter),
		tollCostPerKm: safeNumber(settings.tollCostPerKm),
		wearCostPerKm: safeNumber(settings.wearCostPerKm),
		driverHourlyCost: safeNumber(settings.driverHourlyCost),
		zoneConflictStrategy: settings.zoneConflictStrategy,
		zoneMultiplierAggregationStrategy:
			settings.zoneMultiplierAggregationStrategy,
		staffingSelectionPolicy: settings.staffingSelectionPolicy,
		hotelCostPerNight: safeNumber(settings.hotelCostPerNight),
		mealCostPerDay: safeNumber(settings.mealCostPerDay),
		driverOvernightPremium: safeNumber(settings.driverOvernightPremium),
		secondDriverHourlyRate: safeNumber(settings.secondDriverHourlyRate),
		relayDriverFixedFee: safeNumber(settings.relayDriverFixedFee),
		useDriverHomeForDeadhead: settings.useDriverHomeForDeadhead ?? false,
		timeBucketInterpolationStrategy: settings.timeBucketInterpolationStrategy,
		difficultyMultipliers: settings.difficultyMultipliers,
		denseZoneSpeedThreshold: safeNumber(settings.denseZoneSpeedThreshold),
		autoSwitchToMAD: settings.autoSwitchToMAD ?? false,
		denseZoneCodes: settings.denseZoneCodes ?? [],
		minWaitingTimeForSeparateTransfers:
			settings.minWaitingTimeForSeparateTransfers ?? 180,
		maxReturnDistanceKm: safeNumber(settings.maxReturnDistanceKm),
		roundTripBuffer: settings.roundTripBuffer ?? 30,
		autoSwitchRoundTripToMAD: settings.autoSwitchRoundTripToMAD ?? false,
		documentLogoUrl: settings.documentLogoUrl ?? null,
		brandColor: settings.brandColor ?? "#2563eb",
		logoPosition: settings.logoPosition ?? "LEFT",
		showCompanyName: settings.showCompanyName ?? true,
		logoWidth: settings.logoWidth ?? 150,
		documentLanguage: settings.documentLanguage ?? "BILINGUAL",
		pdfAppearance: settings.pdfAppearance ?? "STANDARD",
		invoiceTerms: settings.invoiceTerms ?? null,
		quoteTerms: settings.quoteTerms ?? null,
		missionOrderTerms: settings.missionOrderTerms ?? null,
		createdAt:
			settings.createdAt instanceof Date
				? settings.createdAt.toISOString()
				: new Date().toISOString(),
		updatedAt:
			settings.updatedAt instanceof Date
				? settings.updatedAt.toISOString()
				: new Date().toISOString(),
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
		},
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

			console.log("[pricing-settings] PATCH received:", {
				organizationId,
				data,
			});

			try {
				// Check if settings exist
				const existing = await db.organizationPricingSettings.findUnique({
					where: { organizationId },
				});

				let settings;

				if (existing) {
					// Update existing settings
					// Ensure we only pass valid fields to Prisma update
					const updateData: any = {};
					const modelFields = [
						"baseRatePerKm",
						"baseRatePerHour",
						"defaultMarginPercent",
						"greenMarginThreshold",
						"orangeMarginThreshold",
						"minimumFare",
						"roundingRule",
						"fuelConsumptionL100km",
						"fuelPricePerLiter",
						"tollCostPerKm",
						"wearCostPerKm",
						"driverHourlyCost",
						"zoneConflictStrategy",
						"zoneMultiplierAggregationStrategy",
						"staffingSelectionPolicy",
						"hotelCostPerNight",
						"mealCostPerDay",
						"driverOvernightPremium",
						"secondDriverHourlyRate",
						"relayDriverFixedFee",
						"useDriverHomeForDeadhead",
						"timeBucketInterpolationStrategy",
						"difficultyMultipliers",
						"denseZoneSpeedThreshold",
						"autoSwitchToMAD",
						"denseZoneCodes",
						"minWaitingTimeForSeparateTransfers",
						"maxReturnDistanceKm",
						"roundTripBuffer",
						"autoSwitchRoundTripToMAD",
						"documentLogoUrl",
						"brandColor",
						"logoPosition",
						"showCompanyName",
						"logoWidth",
						"documentLanguage",
						"pdfAppearance",
						"invoiceTerms",
						"quoteTerms",
						"missionOrderTerms",
					];

					for (const key of Object.keys(data)) {
						if (modelFields.includes(key)) {
							updateData[key] = (data as any)[key];
						}
					}

					console.log(
						"[pricing-settings] Updating with cleaned data:",
						updateData,
					);
					settings = await db.organizationPricingSettings.update({
						where: { organizationId },
						data: updateData,
					});
				} else {
					// Create new settings
					settings = await db.organizationPricingSettings.create({
						data: {
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
							documentLanguage: data.documentLanguage ?? "BILINGUAL",
							pdfAppearance: data.pdfAppearance ?? "STANDARD",
							invoiceTerms: data.invoiceTerms ?? null,
							quoteTerms: data.quoteTerms ?? null,
							missionOrderTerms: data.missionOrderTerms ?? null,
							// Include branding fields if present
							documentLogoUrl: data.documentLogoUrl ?? null,
							brandColor: data.brandColor ?? "#2563eb",
							logoPosition: data.logoPosition ?? "LEFT",
							showCompanyName: data.showCompanyName ?? true,
							logoWidth: data.logoWidth ?? 150,
						},
					});
				}

				return c.json(serializePricingSettings(settings));
			} catch (error: any) {
				console.error("[pricing-settings] PATCH error:", {
					message: error.message,
					stack: error.stack,
					organizationId,
					data,
				});

				return c.json(
					{
						error: "Internal Server Error",
						message: error.message,
						details: error.toString(),
					},
					500,
				);
			}
		},
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
		},
	);
