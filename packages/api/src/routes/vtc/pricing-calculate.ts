/**
 * Pricing Calculate API Route
 * POST /api/vtc/pricing/calculate
 *
 * Calculates the price for a trip using the Engagement Rule for partners
 * and dynamic pricing for private clients or unmatched routes.
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ZoneData } from "../../lib/geo-utils";
import { withTenantFilter } from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import {
	calculatePrice,
	applyPriceOverride,
	type AdvancedRateData,
	type ContactData,
	type DispoPackageAssignment,
	type ExcursionPackageAssignment,
	type OrganizationPricingSettings,
	type PartnerContractData,
	type PricingRequest,
	type PricingResult,
	type SeasonalMultiplierData,
	type ZoneRouteAssignment,
} from "../../services/pricing-engine";

// ============================================================================
// Validation Schemas
// ============================================================================

const geoPointSchema = z.object({
	lat: z.coerce.number().min(-90).max(90),
	lng: z.coerce.number().min(-180).max(180),
});

const calculatePricingSchema = z.object({
	contactId: z.string().min(1, "Contact ID is required"),
	pickup: geoPointSchema,
	dropoff: geoPointSchema,
	vehicleCategoryId: z.string().min(1, "Vehicle category ID is required"),
	tripType: z.enum(["transfer", "excursion", "dispo"]).default("transfer"),
	pickupAt: z.string().optional(),
	estimatedDurationMinutes: z.coerce.number().positive().optional(),
	estimatedDistanceKm: z.coerce.number().positive().optional(),
});

// Story 4.4: Price override schema
const priceOverrideSchema = z.object({
	pricingResult: z.object({
		pricingMode: z.enum(["FIXED_GRID", "DYNAMIC"]),
		price: z.number(),
		currency: z.literal("EUR"),
		internalCost: z.number(),
		margin: z.number(),
		marginPercent: z.number(),
		profitabilityIndicator: z.enum(["green", "orange", "red"]),
		matchedGrid: z.object({
			type: z.enum(["ZoneRoute", "ExcursionPackage", "DispoPackage"]),
			id: z.string(),
			name: z.string(),
			fromZone: z.string().optional(),
			toZone: z.string().optional(),
		}).nullable(),
		appliedRules: z.array(z.record(z.unknown())),
		isContractPrice: z.boolean(),
		fallbackReason: z.string().nullable(),
		gridSearchDetails: z.record(z.unknown()).nullable(),
		tripAnalysis: z.record(z.unknown()),
		overrideApplied: z.boolean().optional(),
		previousPrice: z.number().optional(),
	}),
	newPrice: z.number().positive("New price must be positive"),
	reason: z.string().optional(),
	minimumMarginPercent: z.number().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Load contact with partner contract and assigned grids
 */
async function loadContactWithContract(
	contactId: string,
	organizationId: string,
): Promise<ContactData | null> {
	// Note: Using raw query approach to include partnerContract with nested relations
	// The Prisma types may not be fully loaded in the IDE, but the schema is correct
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const includeConfig: any = {
		partnerContract: {
			include: {
				zoneRoutes: {
					include: {
						zoneRoute: {
							include: {
								fromZone: true,
								toZone: true,
							},
						},
					},
				},
				excursionPackages: {
					include: {
						excursionPackage: {
							include: {
								originZone: true,
								destinationZone: true,
							},
						},
					},
				},
				dispoPackages: {
					include: {
						dispoPackage: true,
					},
				},
			},
		},
	};

	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const contact = (await db.contact.findFirst({
		where: withTenantFilter({ id: contactId }, organizationId),
		include: includeConfig,
	})) as any;

	if (!contact) {
		return null;
	}

	// Transform to ContactData format
	const contactData: ContactData = {
		id: contact.id,
		isPartner: contact.isPartner,
		partnerContract: null,
	};

	if (contact.partnerContract) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const contract = contact.partnerContract as any;

		const zoneRoutes: ZoneRouteAssignment[] = contract.zoneRoutes.map(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(zr: any) => ({
				zoneRoute: {
					id: zr.zoneRoute.id,
					fromZoneId: zr.zoneRoute.fromZoneId,
					toZoneId: zr.zoneRoute.toZoneId,
					vehicleCategoryId: zr.zoneRoute.vehicleCategoryId,
					fixedPrice: Number(zr.zoneRoute.fixedPrice),
					direction: zr.zoneRoute.direction as
						| "BIDIRECTIONAL"
						| "A_TO_B"
						| "B_TO_A",
					isActive: zr.zoneRoute.isActive,
					fromZone: {
						id: zr.zoneRoute.fromZone.id,
						name: zr.zoneRoute.fromZone.name,
						code: zr.zoneRoute.fromZone.code,
					},
					toZone: {
						id: zr.zoneRoute.toZone.id,
						name: zr.zoneRoute.toZone.name,
						code: zr.zoneRoute.toZone.code,
					},
				},
			}),
		);

		const excursionPackages: ExcursionPackageAssignment[] =
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			contract.excursionPackages.map((ep: any) => ({
				excursionPackage: {
					id: ep.excursionPackage.id,
					name: ep.excursionPackage.name,
					originZoneId: ep.excursionPackage.originZoneId,
					destinationZoneId: ep.excursionPackage.destinationZoneId,
					vehicleCategoryId: ep.excursionPackage.vehicleCategoryId,
					price: Number(ep.excursionPackage.price),
					isActive: ep.excursionPackage.isActive,
					originZone: ep.excursionPackage.originZone
						? {
								id: ep.excursionPackage.originZone.id,
								name: ep.excursionPackage.originZone.name,
								code: ep.excursionPackage.originZone.code,
							}
						: null,
					destinationZone: ep.excursionPackage.destinationZone
						? {
								id: ep.excursionPackage.destinationZone.id,
								name: ep.excursionPackage.destinationZone.name,
								code: ep.excursionPackage.destinationZone.code,
							}
						: null,
				},
			}));

		const dispoPackages: DispoPackageAssignment[] = contract.dispoPackages.map(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(dp: any) => ({
				dispoPackage: {
					id: dp.dispoPackage.id,
					name: dp.dispoPackage.name,
					vehicleCategoryId: dp.dispoPackage.vehicleCategoryId,
					basePrice: Number(dp.dispoPackage.basePrice),
					isActive: dp.dispoPackage.isActive,
				},
			}),
		);

		const partnerContractData: PartnerContractData = {
			id: contract.id,
			zoneRoutes,
			excursionPackages,
			dispoPackages,
		};

		contactData.partnerContract = partnerContractData;
	}

	return contactData;
}

/**
 * Load all active zones for the organization
 */
async function loadZones(organizationId: string): Promise<ZoneData[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const zones = (await db.pricingZone.findMany({
		where: withTenantFilter({ isActive: true }, organizationId),
		orderBy: { name: "asc" },
	})) as any[];

	return zones.map((zone) => ({
		id: zone.id,
		name: zone.name,
		code: zone.code,
		zoneType: zone.zoneType as "POLYGON" | "RADIUS" | "POINT",
		geometry: zone.geometry as { type: "Polygon"; coordinates: number[][][] } | null,
		centerLatitude: zone.centerLatitude ? Number(zone.centerLatitude) : null,
		centerLongitude: zone.centerLongitude ? Number(zone.centerLongitude) : null,
		radiusKm: zone.radiusKm ? Number(zone.radiusKm) : null,
		isActive: zone.isActive,
	}));
}

/**
 * Load or create default pricing settings for the organization
 * Story 4.2: Now includes cost parameters for operational cost calculation
 */
async function loadPricingSettings(
	organizationId: string,
): Promise<OrganizationPricingSettings> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const settings = await db.organizationPricingSettings.findFirst({
		where: { organizationId },
	}) as any;

	if (settings) {
		return {
			baseRatePerKm: Number(settings.baseRatePerKm),
			baseRatePerHour: Number(settings.baseRatePerHour),
			targetMarginPercent: Number(settings.defaultMarginPercent),
			// Story 4.2: Cost parameters (optional, will use defaults if not set)
			fuelConsumptionL100km: settings.fuelConsumptionL100km ? Number(settings.fuelConsumptionL100km) : undefined,
			fuelPricePerLiter: settings.fuelPricePerLiter ? Number(settings.fuelPricePerLiter) : undefined,
			tollCostPerKm: settings.tollCostPerKm ? Number(settings.tollCostPerKm) : undefined,
			wearCostPerKm: settings.wearCostPerKm ? Number(settings.wearCostPerKm) : undefined,
			driverHourlyCost: settings.driverHourlyCost ? Number(settings.driverHourlyCost) : undefined,
		};
	}

	// Return default settings if none exist
	return {
		baseRatePerKm: 2.5,
		baseRatePerHour: 45.0,
		targetMarginPercent: 20.0,
		// Cost parameters will use defaults from pricing-engine.ts
	};
}

/**
 * Load all active advanced rates for the organization (Story 4.3)
 */
async function loadAdvancedRates(organizationId: string): Promise<AdvancedRateData[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rates = (await db.advancedRate.findMany({
		where: withTenantFilter({ isActive: true }, organizationId),
		orderBy: { priority: "desc" },
	})) as any[];

	return rates.map((rate) => ({
		id: rate.id,
		name: rate.name,
		appliesTo: rate.appliesTo as "NIGHT" | "WEEKEND" | "LONG_DISTANCE" | "ZONE_SCENARIO" | "HOLIDAY",
		startTime: rate.startTime,
		endTime: rate.endTime,
		daysOfWeek: rate.daysOfWeek,
		minDistanceKm: rate.minDistanceKm ? Number(rate.minDistanceKm) : null,
		maxDistanceKm: rate.maxDistanceKm ? Number(rate.maxDistanceKm) : null,
		zoneId: rate.zoneId,
		adjustmentType: rate.adjustmentType as "PERCENTAGE" | "FIXED_AMOUNT",
		value: Number(rate.value),
		priority: rate.priority,
		isActive: rate.isActive,
	}));
}

/**
 * Load all active seasonal multipliers for the organization (Story 4.3)
 */
async function loadSeasonalMultipliers(organizationId: string): Promise<SeasonalMultiplierData[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const multipliers = (await db.seasonalMultiplier.findMany({
		where: withTenantFilter({ isActive: true }, organizationId),
		orderBy: { priority: "desc" },
	})) as any[];

	return multipliers.map((multiplier) => ({
		id: multiplier.id,
		name: multiplier.name,
		description: multiplier.description,
		startDate: new Date(multiplier.startDate),
		endDate: new Date(multiplier.endDate),
		multiplier: Number(multiplier.multiplier),
		priority: multiplier.priority,
		isActive: multiplier.isActive,
	}));
}

// ============================================================================
// Router
// ============================================================================

export const pricingCalculateRouter = new Hono()
	.basePath("/pricing")
	.use("*", organizationMiddleware)

	// Calculate pricing
	.post(
		"/calculate",
		validator("json", calculatePricingSchema),
		describeRoute({
			summary: "Calculate trip pricing",
			description:
				"Calculate the price for a trip using the Engagement Rule for partners and dynamic pricing for private clients",
			tags: ["VTC - Pricing"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Load contact with contract
			const contact = await loadContactWithContract(
				data.contactId,
				organizationId,
			);

			if (!contact) {
				throw new HTTPException(404, {
					message: "Contact not found",
				});
			}

			// Validate vehicle category exists
			const vehicleCategory = await db.vehicleCategory.findFirst({
				where: withTenantFilter(
					{ id: data.vehicleCategoryId },
					organizationId,
				),
			});

			if (!vehicleCategory) {
				throw new HTTPException(400, {
					message: "Vehicle category not found",
				});
			}

			// Load zones, pricing settings, and multipliers (Story 4.3)
			const [zones, pricingSettings, advancedRates, seasonalMultipliers] = await Promise.all([
				loadZones(organizationId),
				loadPricingSettings(organizationId),
				loadAdvancedRates(organizationId),
				loadSeasonalMultipliers(organizationId),
			]);

			// Build pricing request
			const pricingRequest: PricingRequest = {
				contactId: data.contactId,
				pickup: data.pickup,
				dropoff: data.dropoff,
				vehicleCategoryId: data.vehicleCategoryId,
				tripType: data.tripType,
				pickupAt: data.pickupAt,
				estimatedDurationMinutes: data.estimatedDurationMinutes,
				estimatedDistanceKm: data.estimatedDistanceKm,
			};

			// Calculate price (Story 4.3: now includes multipliers)
			const result = calculatePrice(pricingRequest, {
				contact,
				zones,
				pricingSettings,
				advancedRates,
				seasonalMultipliers,
			});

			// Log negative margin partner trips for analysis
			if (
				contact.isPartner &&
				result.pricingMode === "FIXED_GRID" &&
				result.marginPercent < 0
			) {
				console.warn(
					`[PRICING] Negative margin partner trip: contactId=${contact.id}, ` +
						`gridId=${result.matchedGrid?.id}, price=${result.price}, ` +
						`cost=${result.internalCost}, margin=${result.marginPercent}%`,
				);
			}

			return c.json(result);
		},
	)

	// Story 4.4: Price override endpoint
	.post(
		"/override",
		validator("json", priceOverrideSchema),
		describeRoute({
			summary: "Override pricing with live profitability feedback",
			description:
				"Apply a manual price override to a pricing result and recalculate profitability. " +
				"Returns updated margin, marginPercent, and profitabilityIndicator with MANUAL_OVERRIDE tracking.",
			tags: ["VTC - Pricing"],
		}),
		async (c) => {
			const data = c.req.valid("json");

			// Cast the validated pricingResult to PricingResult type
			// The schema validation ensures the structure is correct
			const pricingResult = data.pricingResult as unknown as PricingResult;

			// Apply the price override
			const overrideResult = applyPriceOverride(
				pricingResult,
				data.newPrice,
				data.reason,
				data.minimumMarginPercent,
			);

			// Handle validation failure
			if (!overrideResult.success) {
				const error = overrideResult.error;
				return c.json(
					{
						error: error.errorCode,
						message: error.errorMessage,
						details: error.details,
					},
					400,
				);
			}

			// Log contract price overrides for audit
			if (pricingResult.isContractPrice) {
				console.warn(
					`[PRICING] Contract price overridden: ` +
						`previousPrice=${pricingResult.price}, newPrice=${data.newPrice}, ` +
						`reason=${data.reason || "not specified"}`,
				);
			}

			return c.json(overrideResult.result);
		},
	);
