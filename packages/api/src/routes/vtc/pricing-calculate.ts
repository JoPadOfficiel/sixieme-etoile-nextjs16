/**
 * Pricing Calculate API Route
 * POST /api/vtc/pricing/calculate
 *
 * Calculates the price for a trip using the Engagement Rule for partners
 * and dynamic pricing for private clients or unmatched routes.
 */

import { db } from "@repo/database";
import { AdvancedRateAppliesTo } from "@prisma/client";
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
	resolveFuelConsumption,
	calculateExcursionLegs,
	buildExcursionTripAnalysis,
	calculateEstimatedEndAt,
	// Story 18.2: Dense zone detection
	detectDenseZone,
	calculateMadSuggestion,
	buildAutoSwitchedToMadRule,
	// Story 18.3: Round-trip to MAD detection
	detectRoundTripBlocked,
	calculateRoundTripMadSuggestion,
	buildAutoSwitchedRoundTripToMadRule,
	type AdvancedRateData,
	type ContactData,
	type DispoPackageAssignment,
	type ExcursionCalculationInput,
	type ExcursionPackageAssignment,
	type ExcursionStop,
	type FuelConsumptionResolution,
	type OrganizationPricingSettings,
	type PartnerContractData,
	type PricingRequest,
	type PricingResult,
	type SeasonalMultiplierData,
	type VehicleCategoryInfo,
	type ZoneRouteAssignment,
	type VehicleSelectionInfo,
	type ShadowCalculationInput,
	buildShadowInputFromVehicleSelection,
} from "../../services/pricing-engine";
import { getFuelPrice, type FuelPriceResult } from "../../services/fuel-price-service";
import {
	getTollCost,
	calculateFallbackToll,
	type TollResult,
} from "../../services/toll-service";
import {
	selectOptimalVehicle,
	transformVehicleToCandidate,
	type VehicleCandidate,
	type VehicleSelectionInput,
} from "../../services/vehicle-selection";
import {
	segmentRouteByZones,
	createFallbackSegmentation,
	buildRouteSegmentationRule,
	type ZoneSegment,
} from "../../services/route-segmentation";
import {
	decomposeTransversalTrip,
	buildTransversalDecompositionRule,
	buildTransitDiscountRules,
	identifyTransitZones,
	DEFAULT_TRANSIT_CONFIG,
	type TransversalDecompositionConfig,
} from "../../services/transversal-decomposition";

// ============================================================================
// Validation Schemas
// ============================================================================

const geoPointSchema = z.object({
	lat: z.coerce.number().min(-90).max(90),
	lng: z.coerce.number().min(-180).max(180),
});

// Story 16.7: Excursion stop schema
const excursionStopSchema = z.object({
	address: z.string().min(1, "Stop address is required"),
	latitude: z.coerce.number().min(-90).max(90),
	longitude: z.coerce.number().min(-180).max(180),
	order: z.coerce.number().int().nonnegative(),
	notes: z.string().optional(),
});

const calculatePricingSchema = z.object({
	contactId: z.string().min(1, "Contact ID is required"),
	pickup: geoPointSchema,
	// Story 16.8: Dropoff is optional for DISPO trips
	dropoff: geoPointSchema.optional(),
	vehicleCategoryId: z.string().min(1, "Vehicle category ID is required"),
	// Story 16.9: Added off_grid for manual pricing trips
	tripType: z.enum(["transfer", "excursion", "dispo", "off_grid"]).default("transfer"),
	pickupAt: z.string().optional(),
	estimatedDurationMinutes: z.coerce.number().positive().optional(),
	estimatedDistanceKm: z.coerce.number().positive().optional(),
	// Story 4.5: Passenger and luggage count for vehicle selection
	passengerCount: z.coerce.number().int().positive().default(1),
	luggageCount: z.coerce.number().int().nonnegative().optional(),
	// Story 4.5: Vehicle selection options
	enableVehicleSelection: z.boolean().default(true),
	haversineThresholdKm: z.coerce.number().positive().optional(),
	maxCandidatesForRouting: z.coerce.number().int().positive().optional(),
	// Story 16.6: Round trip flag for transfer pricing
	isRoundTrip: z.boolean().default(false),
	// Story 18.3: Waiting time on-site for round-trip MAD detection (in minutes)
	waitingTimeMinutes: z.coerce.number().nonnegative().optional(),
	// Story 16.7: Excursion stops for multi-stop pricing
	stops: z.array(excursionStopSchema).optional(),
	// Story 16.7: Return date for multi-day excursions
	returnDate: z.string().optional(),
	// Story 16.8: DISPO-specific fields
	durationHours: z.coerce.number().positive().optional(),
	maxKilometers: z.coerce.number().nonnegative().optional(),
});

// Story 4.4: Price override schema
// Story 4.7: Added profitabilityData to schema
const priceOverrideSchema = z.object({
	pricingResult: z.object({
		pricingMode: z.enum(["FIXED_GRID", "DYNAMIC"]),
		price: z.number(),
		currency: z.literal("EUR"),
		internalCost: z.number(),
		margin: z.number(),
		marginPercent: z.number(),
		profitabilityIndicator: z.enum(["green", "orange", "red"]),
		// Story 4.7: Full profitability data for UI
		profitabilityData: z.object({
			indicator: z.enum(["green", "orange", "red"]),
			marginPercent: z.number(),
			thresholds: z.object({
				greenThreshold: z.number(),
				orangeThreshold: z.number(),
			}),
			label: z.string(),
			description: z.string(),
		}).optional(),
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
 * Story 14.5: Updated to include multi-zone relations (originZones, destinationZones)
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
								// Story 14.5: Include multi-zone relations
								originZones: {
									include: {
										zone: {
											select: {
												id: true,
												name: true,
												code: true,
											},
										},
									},
								},
								destinationZones: {
									include: {
										zone: {
											select: {
												id: true,
												name: true,
												code: true,
											},
										},
									},
								},
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
								// Story 18.8: Include allowed origin zones for temporal vectors
								allowedOriginZones: {
									include: {
										pricingZone: {
											select: {
												id: true,
												name: true,
												code: true,
											},
										},
									},
								},
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
	// Story 17.15: Include difficultyScore for Patience Tax
	const contactData: ContactData = {
		id: contact.id,
		isPartner: contact.isPartner,
		partnerContract: null,
		difficultyScore: contact.difficultyScore ?? null,
	};

	if (contact.partnerContract) {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		const contract = contact.partnerContract as any;

		const zoneRoutes: ZoneRouteAssignment[] = contract.zoneRoutes.map(
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			(zr: any) => ({
				zoneRoute: {
					id: zr.zoneRoute.id,
					// Legacy fields (backward compatibility)
					fromZoneId: zr.zoneRoute.fromZoneId,
					toZoneId: zr.zoneRoute.toZoneId,
					// Story 14.5: Multi-zone support
					originType: zr.zoneRoute.originType || "ZONES",
					destinationType: zr.zoneRoute.destinationType || "ZONES",
					originZones: (zr.zoneRoute.originZones || []).map((oz: any) => ({
						zone: {
							id: oz.zone.id,
							name: oz.zone.name,
							code: oz.zone.code,
						},
					})),
					destinationZones: (zr.zoneRoute.destinationZones || []).map((dz: any) => ({
						zone: {
							id: dz.zone.id,
							name: dz.zone.name,
							code: dz.zone.code,
						},
					})),
					// Story 14.5: Address-based route support
					originPlaceId: zr.zoneRoute.originPlaceId,
					originAddress: zr.zoneRoute.originAddress,
					originLat: zr.zoneRoute.originLat,
					originLng: zr.zoneRoute.originLng,
					destPlaceId: zr.zoneRoute.destPlaceId,
					destAddress: zr.zoneRoute.destAddress,
					destLat: zr.zoneRoute.destLat,
					destLng: zr.zoneRoute.destLng,
					// Existing fields
					vehicleCategoryId: zr.zoneRoute.vehicleCategoryId,
					fixedPrice: Number(zr.zoneRoute.fixedPrice),
					direction: zr.zoneRoute.direction as
						| "BIDIRECTIONAL"
						| "A_TO_B"
						| "B_TO_A",
					isActive: zr.zoneRoute.isActive,
					// Legacy zone relations (for backward compatibility display)
					fromZone: zr.zoneRoute.fromZone
						? {
								id: zr.zoneRoute.fromZone.id,
								name: zr.zoneRoute.fromZone.name,
								code: zr.zoneRoute.fromZone.code,
							}
						: null,
					toZone: zr.zoneRoute.toZone
						? {
								id: zr.zoneRoute.toZone.id,
								name: zr.zoneRoute.toZone.name,
								code: zr.zoneRoute.toZone.code,
							}
						: null,
				},
				// Story 12.2: Partner-specific price override
				overridePrice: zr.overridePrice != null ? Number(zr.overridePrice) : null,
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
					// Story 18.8: Temporal Vector fields
					isTemporalVector: ep.excursionPackage.isTemporalVector ?? false,
					minimumDurationHours: ep.excursionPackage.minimumDurationHours != null
						? Number(ep.excursionPackage.minimumDurationHours)
						: null,
					destinationName: ep.excursionPackage.destinationName ?? null,
					destinationDescription: ep.excursionPackage.destinationDescription ?? null,
					includedDurationHours: ep.excursionPackage.includedDurationHours != null
						? Number(ep.excursionPackage.includedDurationHours)
						: undefined,
					allowedOriginZones: ep.excursionPackage.allowedOriginZones?.map((oz: any) => ({
						pricingZoneId: oz.pricingZoneId,
						pricingZone: oz.pricingZone
							? {
									id: oz.pricingZone.id,
									name: oz.pricingZone.name,
									code: oz.pricingZone.code,
								}
							: undefined,
					})) ?? [],
				},
				// Story 12.2: Partner-specific price override
				overridePrice: ep.overridePrice != null ? Number(ep.overridePrice) : null,
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
		// Story 11.3: Zone pricing multiplier
		priceMultiplier: zone.priceMultiplier ? Number(zone.priceMultiplier) : 1.0,
	}));
}

/**
 * Route coordinates for fuel price calculation
 */
interface RouteCoordinates {
	pickup: { lat: number; lng: number };
	dropoff?: { lat: number; lng: number };
	stops?: Array<{ lat: number; lng: number }>;
}

/**
 * Load or create default pricing settings for the organization
 * Story 4.2: Now includes cost parameters for operational cost calculation
 * Story 17.1: Fuel price is now fetched in real-time based on route coordinates
 */
async function loadPricingSettings(
	organizationId: string,
	routeCoordinates?: RouteCoordinates,
): Promise<OrganizationPricingSettings & { fuelPriceSource?: FuelPriceResult }> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const settings = await db.organizationPricingSettings.findFirst({
		where: { organizationId },
	}) as any;

	// Story 17.1: Get fuel price in real-time based on route coordinates
	// Falls back to cache, then defaults if API fails
	const fuelPriceResult = await getFuelPrice({
		organizationId,
		pickup: routeCoordinates?.pickup,
		dropoff: routeCoordinates?.dropoff,
		stops: routeCoordinates?.stops,
	});

	if (settings) {
		return {
			baseRatePerKm: Number(settings.baseRatePerKm),
			baseRatePerHour: Number(settings.baseRatePerHour),
			targetMarginPercent: Number(settings.defaultMarginPercent),
			// Story 4.2: Cost parameters (optional, will use defaults if not set)
			fuelConsumptionL100km: settings.fuelConsumptionL100km ? Number(settings.fuelConsumptionL100km) : undefined,
			// Story 17.1: Use real-time fuel price, fallback to org settings, then defaults
			fuelPricePerLiter: fuelPriceResult.pricePerLitre ?? (settings.fuelPricePerLiter ? Number(settings.fuelPricePerLiter) : undefined),
			tollCostPerKm: settings.tollCostPerKm ? Number(settings.tollCostPerKm) : undefined,
			wearCostPerKm: settings.wearCostPerKm ? Number(settings.wearCostPerKm) : undefined,
			driverHourlyCost: settings.driverHourlyCost ? Number(settings.driverHourlyCost) : undefined,
			// Story 4.7: Profitability thresholds (optional, will use defaults if not set)
			greenMarginThreshold: settings.greenMarginThreshold ? Number(settings.greenMarginThreshold) : undefined,
			orangeMarginThreshold: settings.orangeMarginThreshold ? Number(settings.orangeMarginThreshold) : undefined,
			// Story 17.1: Include fuel price source for transparency
			fuelPriceSource: fuelPriceResult,
			// Story 17.15: Client difficulty multipliers (Patience Tax)
			difficultyMultipliers: settings.difficultyMultipliers as Record<string, number> | null,
			// Story 18.2: Dense zone detection settings
			denseZoneSpeedThreshold: settings.denseZoneSpeedThreshold ? Number(settings.denseZoneSpeedThreshold) : undefined,
			autoSwitchToMAD: settings.autoSwitchToMAD ?? false,
			denseZoneCodes: settings.denseZoneCodes ?? [],
			// Story 18.3: Round-trip to MAD detection settings
			minWaitingTimeForSeparateTransfers: settings.minWaitingTimeForSeparateTransfers ?? undefined,
			maxReturnDistanceKm: settings.maxReturnDistanceKm ? Number(settings.maxReturnDistanceKm) : undefined,
			roundTripBuffer: settings.roundTripBuffer ?? undefined,
			autoSwitchRoundTripToMAD: settings.autoSwitchRoundTripToMAD ?? false,
		};
	}

	// Return default settings if none exist
	return {
		baseRatePerKm: 2.5,
		baseRatePerHour: 45.0,
		targetMarginPercent: 20.0,
		// Story 17.1: Use real-time fuel price even for default settings
		fuelPricePerLiter: fuelPriceResult.pricePerLitre,
		fuelPriceSource: fuelPriceResult,
		// Other cost parameters and profitability thresholds will use defaults from pricing-engine.ts
	};
}

/**
 * Load all active advanced rates for the organization (Story 4.3)
 * Note: Only NIGHT and WEEKEND types are supported (Story 11.4)
 */
async function loadAdvancedRates(organizationId: string): Promise<AdvancedRateData[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const rates = (await db.advancedRate.findMany({
		where: withTenantFilter({ 
			isActive: true,
			// Only load supported rate types (NIGHT, WEEKEND) - Story 11.7
			appliesTo: { in: [AdvancedRateAppliesTo.NIGHT, AdvancedRateAppliesTo.WEEKEND] },
		}, organizationId),
		orderBy: { priority: "desc" },
	})) as any[];

	return rates.map((rate) => ({
		id: rate.id,
		name: rate.name,
		appliesTo: rate.appliesTo as "NIGHT" | "WEEKEND",
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

/**
 * Load all vehicles with their bases for vehicle selection (Story 4.5)
 */
async function loadVehiclesForSelection(organizationId: string): Promise<VehicleCandidate[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const vehicles = (await db.vehicle.findMany({
		where: withTenantFilter({}, organizationId),
		include: {
			operatingBase: true,
			vehicleCategory: true,
		},
	})) as any[];

	return vehicles.map((vehicle) => transformVehicleToCandidate(vehicle));
}

/**
 * Load Google Maps API key for the organization (Story 4.5)
 */
async function loadGoogleMapsApiKey(organizationId: string): Promise<string | undefined> {
	console.log(`[PRICING] Loading Google Maps API key for organization: ${organizationId}`);
	
	const settings = await db.organizationIntegrationSettings.findFirst({
		where: { organizationId },
	});

	if (settings?.googleMapsApiKey) {
		console.log(`[PRICING] ✅ Found Google Maps API key in database: ****...${settings.googleMapsApiKey.slice(-4)}`);
		console.log(`[PRICING] API Key status: ${settings.googleMapsStatus || 'NOT TESTED'}`);
		return settings.googleMapsApiKey;
	}

	console.log(`[PRICING] ❌ No Google Maps API key found in database`);
	
	// Fallback to environment variable
	const envKey = process.env.GOOGLE_MAPS_API_KEY;
	if (envKey) {
		console.log(`[PRICING] ✅ Found Google Maps API key in environment: ****...${envKey.slice(-4)}`);
		return envKey;
	}
	
	console.log(`[PRICING] ❌ No Google Maps API key found in environment variable`);
	console.log(`[PRICING] 💡 Please configure Google Maps API key in organization settings or set GOOGLE_MAPS_API_KEY environment variable`);
	
	return undefined;
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

			// Story 16.9: OFF_GRID trips don't need pricing calculation
			// Return a minimal response indicating manual pricing is required
			if (data.tripType === "off_grid") {
				return c.json({
					pricingMode: "MANUAL" as const,
					price: 0,
					currency: "EUR",
					internalCost: 0,
					profitabilityPercent: 0,
					profitabilityIndicator: "UNKNOWN" as const,
					appliedRules: [],
					tripAnalysis: null,
					message: "Off-grid trips require manual pricing",
				});
			}

			// Story 16.8: Validate dropoff is required for non-DISPO trips
			if (data.tripType !== "dispo" && !data.dropoff) {
				throw new HTTPException(400, {
					message: "Dropoff address is required for transfer and excursion trips",
				});
			}

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

			// Validate vehicle category exists and load consumption + rates (Story 15.2 + 15.4 + 19.2)
			const vehicleCategory = await db.vehicleCategory.findFirst({
				where: withTenantFilter(
					{ id: data.vehicleCategoryId },
					organizationId,
				),
				select: {
					id: true,
					code: true,
					name: true,
					priceMultiplier: true,
					averageConsumptionL100km: true, // Story 15.2
					defaultRatePerKm: true,         // Story 15.4
					defaultRatePerHour: true,       // Story 15.4
					regulatoryCategory: true,       // Story 19.2: RSE compliance
				},
			});

			if (!vehicleCategory) {
				throw new HTTPException(400, {
					message: "Vehicle category not found",
				});
			}

			// Story 17.1: Build route coordinates for real-time fuel pricing
			const routeCoordinates: RouteCoordinates = {
				pickup: data.pickup,
				dropoff: data.dropoff,
				stops: data.stops?.map(s => ({ lat: s.latitude, lng: s.longitude })),
			};

			// Load zones, pricing settings, multipliers, and vehicles (Story 4.3 + 4.5)
			// Story 21.6: Always load vehicles to enable automatic vehicle pre-selection for accurate positioning costs
			// This ensures empty return cost is calculated correctly based on actual vehicle base location
			const shouldSelectVehicle = data.enableVehicleSelection !== false; // Default to true unless explicitly disabled
			// IMPORTANT: Always load Google Maps API key for toll calculation when dropoff is provided
			const shouldLoadGoogleMaps = !!data.dropoff;
			const [zones, pricingSettings, advancedRates, seasonalMultipliers, vehicles, googleMapsApiKey] = await Promise.all([
				loadZones(organizationId),
				loadPricingSettings(organizationId, routeCoordinates),
				loadAdvancedRates(organizationId),
				loadSeasonalMultipliers(organizationId),
				shouldSelectVehicle ? loadVehiclesForSelection(organizationId) : Promise.resolve([]),
				shouldLoadGoogleMaps ? loadGoogleMapsApiKey(organizationId) : Promise.resolve(undefined),
			]);

			// Story 4.5: Vehicle selection
			let vehicleSelectionInfo: VehicleSelectionInfo | undefined;
			let effectiveDistanceKm = data.estimatedDistanceKm;
			let effectiveDurationMinutes = data.estimatedDurationMinutes;
			// Story 21.6: Shadow calculation input for accurate positioning costs
			let vehicleSelectionInputForPricing: ShadowCalculationInput | undefined;

			// Story 16.8: For DISPO, use pickup as dropoff if not provided (for vehicle selection)
			const effectiveDropoff = data.dropoff ?? data.pickup;

			// Story 16.8: For DISPO, calculate duration from durationHours if provided
			if (data.tripType === "dispo" && data.durationHours) {
				effectiveDurationMinutes = data.durationHours * 60;
			}

			// Story 21.6: Always perform vehicle selection when vehicles are available
			// This ensures accurate positioning costs (approach + empty return) based on actual vehicle base
			if (shouldSelectVehicle && vehicles.length > 0 && data.dropoff) {
				const selectionInput: VehicleSelectionInput = {
					organizationId,
					pickup: data.pickup,
					dropoff: effectiveDropoff,
					passengerCount: data.passengerCount,
					luggageCount: data.luggageCount,
					vehicleCategoryId: data.vehicleCategoryId,
					haversineThresholdKm: data.haversineThresholdKm,
					maxCandidatesForRouting: data.maxCandidatesForRouting,
					selectionCriterion: "MINIMAL_COST",
				};

				const selectionResult = await selectOptimalVehicle(
					selectionInput,
					vehicles,
					pricingSettings,
					googleMapsApiKey,
				);

				// Build vehicle selection info for tripAnalysis
				vehicleSelectionInfo = {
					selectedVehicle: selectionResult.selectedCandidate ? {
						vehicleId: selectionResult.selectedCandidate.vehicleId,
						vehicleName: selectionResult.selectedCandidate.vehicleName,
						baseId: selectionResult.selectedCandidate.baseId,
						baseName: selectionResult.selectedCandidate.baseName,
					} : undefined,
					candidatesConsidered: selectionResult.candidatesConsidered,
					candidatesAfterCapacityFilter: selectionResult.candidatesAfterCapacityFilter,
					candidatesAfterHaversineFilter: selectionResult.candidatesAfterHaversineFilter,
					candidatesWithRouting: selectionResult.candidatesWithRouting,
					selectionCriterion: selectionResult.selectionCriterion,
					fallbackUsed: selectionResult.fallbackUsed,
					fallbackReason: selectionResult.fallbackReason,
					routingSource: selectionResult.selectedCandidate?.routingSource,
				};

				// Use routing data from selected vehicle if available
				if (selectionResult.selectedCandidate) {
					const candidate = selectionResult.selectedCandidate;
					// Use total distance/duration from routing (includes approach + service + return)
					// For pricing, we use service segment only (pickup → dropoff)
					effectiveDistanceKm = candidate.serviceDistanceKm;
					effectiveDurationMinutes = candidate.serviceDurationMinutes;
					
					// Story 21.6: Build shadow calculation input with actual routing data
					// This enables accurate positioning costs (approach + empty return)
					vehicleSelectionInputForPricing = {
						approachDistanceKm: candidate.approachDistanceKm,
						approachDurationMinutes: candidate.approachDurationMinutes,
						serviceDistanceKm: candidate.serviceDistanceKm,
						serviceDurationMinutes: candidate.serviceDurationMinutes,
						returnDistanceKm: candidate.returnDistanceKm,
						returnDurationMinutes: candidate.returnDurationMinutes,
						routingSource: candidate.routingSource,
						vehicleSelection: vehicleSelectionInfo,
					};
				}
			}

			// Story 15.2: Resolve fuel consumption with fallback chain
			// Priority: Vehicle (if selected) → Category → Organization → Default
			const vehicleConsumption = vehicleSelectionInfo?.selectedVehicle
				? null // Vehicle consumption is handled in vehicle-selection.ts
				: null;
			const categoryConsumption = vehicleCategory.averageConsumptionL100km
				? Number(vehicleCategory.averageConsumptionL100km)
				: null;
			const fuelResolution = resolveFuelConsumption(
				vehicleConsumption,
				categoryConsumption,
				pricingSettings.fuelConsumptionL100km,
			);

			// Update pricing settings with resolved consumption
			const effectivePricingSettings: typeof pricingSettings = {
				...pricingSettings,
				fuelConsumptionL100km: fuelResolution.consumptionL100km,
			};

			// Build pricing request
			// Story 16.8: Use effectiveDropoff for DISPO trips without dropoff
			const pricingRequest: PricingRequest = {
				contactId: data.contactId,
				pickup: data.pickup,
				dropoff: effectiveDropoff,
				vehicleCategoryId: data.vehicleCategoryId,
				tripType: data.tripType,
				pickupAt: data.pickupAt,
				estimatedDurationMinutes: effectiveDurationMinutes,
				estimatedDistanceKm: effectiveDistanceKm,
				// Story 16.6: Round trip flag for transfer pricing
				isRoundTrip: data.isRoundTrip,
				// Story 16.8: DISPO-specific fields
				durationHours: data.durationHours,
				maxKilometers: data.maxKilometers,
			};

			// Calculate price (Story 4.3: now includes multipliers, Story 15.3: vehicle category, Story 19.2: RSE compliance)
			const result = calculatePrice(pricingRequest, {
				contact,
				zones,
				pricingSettings: effectivePricingSettings,
				advancedRates,
				seasonalMultipliers,
				// Story 15.3 + 15.4 + 19.2: Pass vehicle category for multiplier, rates, and RSE compliance
				vehicleCategory: vehicleCategory ? {
					id: vehicleCategory.id,
					code: vehicleCategory.code,
					name: vehicleCategory.name,
					priceMultiplier: Number(vehicleCategory.priceMultiplier),
					// Story 15.4: Category-specific rates
					defaultRatePerKm: vehicleCategory.defaultRatePerKm
						? Number(vehicleCategory.defaultRatePerKm)
						: null,
					defaultRatePerHour: vehicleCategory.defaultRatePerHour
						? Number(vehicleCategory.defaultRatePerHour)
						: null,
					// Story 15.6: Fuel type - default to null (DIESEL will be used)
					fuelType: null,
					// Story 19.2: Regulatory category for RSE compliance (LIGHT = no RSE, HEAVY = RSE applies)
					regulatoryCategory: vehicleCategory.regulatoryCategory as "LIGHT" | "HEAVY" | null,
				} : undefined,
				// Story 21.6: Pass vehicle selection input for accurate positioning costs
				vehicleSelectionInput: vehicleSelectionInputForPricing,
			});

			// Story 4.5: Add vehicle selection info to tripAnalysis
			if (vehicleSelectionInfo) {
				result.tripAnalysis.vehicleSelection = vehicleSelectionInfo;
			}

			// Story 17.1: Add fuel price source to tripAnalysis for transparency
			// Now includes real-time pricing info and countries traversed
			if (pricingSettings.fuelPriceSource) {
				result.tripAnalysis.fuelPriceSource = {
					pricePerLitre: pricingSettings.fuelPriceSource.pricePerLitre,
					currency: pricingSettings.fuelPriceSource.currency,
					source: pricingSettings.fuelPriceSource.source as "REALTIME" | "CACHE" | "DEFAULT",
					fetchedAt: pricingSettings.fuelPriceSource.fetchedAt?.toISOString() ?? null,
					isStale: pricingSettings.fuelPriceSource.isStale,
					fuelType: pricingSettings.fuelPriceSource.fuelType,
					countryCode: pricingSettings.fuelPriceSource.countryCode,
					// Story 17.1: Include international route info
					countriesOnRoute: pricingSettings.fuelPriceSource.countriesOnRoute,
					routePrices: pricingSettings.fuelPriceSource.routePrices,
				};
			}

			// Story 15.2: Add fuel consumption source to tripAnalysis for transparency
			result.tripAnalysis.fuelConsumptionSource = fuelResolution.source;
			result.tripAnalysis.fuelConsumptionL100km = fuelResolution.consumptionL100km;

			// Story 15.1: Get real toll costs from Google Routes API
			// Story 16.8: Only get toll costs if we have a dropoff (not for DISPO without dropoff)
			console.log(`[PRICING] Toll calculation check - API Key: ${!!googleMapsApiKey}, Dropoff: ${!!data.dropoff}`);
			
			if (googleMapsApiKey && data.dropoff) {
				console.log(`[PRICING] Starting toll calculation for route`);
				console.log(`[PRICING] Pickup: ${data.pickup.lat}, ${data.pickup.lng}`);
				console.log(`[PRICING] Dropoff: ${data.dropoff.lat}, ${data.dropoff.lng}`);
				
				try {
					const tollResult = await getTollCost(data.pickup, data.dropoff, {
						apiKey: googleMapsApiKey,
						fallbackRatePerKm: pricingSettings.tollCostPerKm ?? 0.12,
					});

					console.log(`[PRICING] Toll result: ${tollResult.amount}€ (${tollResult.source})`);
					console.log(`[PRICING] Is from cache: ${tollResult.isFromCache}`);

					if (tollResult.amount >= 0) {
						console.log(`[PRICING] ✅ Using real toll data: ${tollResult.amount}€`);
						
						// Update toll cost in tripAnalysis with real data
						const oldTollAmount = result.tripAnalysis.costBreakdown.tolls.amount;
						const tollDifference = tollResult.amount - oldTollAmount;
						
						console.log(`[PRICING] Toll difference: ${tollDifference}€ (old: ${oldTollAmount}€, new: ${tollResult.amount}€)`);

						// Update toll component
						result.tripAnalysis.costBreakdown.tolls = {
							...result.tripAnalysis.costBreakdown.tolls,
							amount: tollResult.amount,
							source: tollResult.source,
							isFromCache: tollResult.isFromCache,
						};

						// Update total cost
						result.tripAnalysis.costBreakdown.total = Math.round(
							(result.tripAnalysis.costBreakdown.total + tollDifference) * 100
						) / 100;

						// Update internal cost and margins
						result.tripAnalysis.totalInternalCost = Math.round(
							(result.tripAnalysis.totalInternalCost + tollDifference) * 100
						) / 100;
						result.internalCost = result.tripAnalysis.totalInternalCost;
						result.margin = Math.round((result.price - result.internalCost) * 100) / 100;
						result.marginPercent = result.price > 0
							? Math.round((result.margin / result.price) * 100 * 100) / 100
							: 0;

						console.log(`[PRICING] Updated costs - Total: ${result.tripAnalysis.costBreakdown.total}€, Internal: ${result.internalCost}€, Margin: ${result.margin}€ (${result.marginPercent}%)`);

						// Update profitability indicator based on new margin
						const greenThreshold = pricingSettings.greenMarginThreshold ?? 20;
						const orangeThreshold = pricingSettings.orangeMarginThreshold ?? 0;
						if (result.marginPercent >= greenThreshold) {
							result.profitabilityIndicator = "green";
						} else if (result.marginPercent >= orangeThreshold) {
							result.profitabilityIndicator = "orange";
						} else {
							result.profitabilityIndicator = "red";
						}

						// Set toll source for transparency
						result.tripAnalysis.tollSource = tollResult.source;
						
						// Story 21.9: Store encoded polyline for route display
						if (tollResult.encodedPolyline) {
							result.tripAnalysis.encodedPolyline = tollResult.encodedPolyline;
							console.log(`[PRICING] ✅ Encoded polyline stored`);
						}
						
						// Story 17.13: Route segmentation for multi-zone trips
						if (tollResult.encodedPolyline && zones.length > 0 && effectiveDurationMinutes) {
							console.log(`[PRICING] Starting route segmentation`);
							try {
								const segmentationResult = segmentRouteByZones(
									tollResult.encodedPolyline,
									zones,
									effectiveDurationMinutes,
									pricingSettings.zoneConflictStrategy ?? null,
								);
								
								if (segmentationResult.segments.length > 0) {
									console.log(`[PRICING] ✅ Route segmentation successful: ${segmentationResult.segments.length} segments`);
									
									// Store zone segments in tripAnalysis
									result.tripAnalysis.zoneSegments = segmentationResult.segments.map(seg => ({
										zoneId: seg.zoneId,
										zoneCode: seg.zoneCode,
										zoneName: seg.zoneName,
										distanceKm: seg.distanceKm,
										durationMinutes: seg.durationMinutes,
										priceMultiplier: seg.priceMultiplier,
										surchargesApplied: seg.surchargesApplied,
										entryPoint: seg.entryPoint,
										exitPoint: seg.exitPoint,
									}));
									
									result.tripAnalysis.routeSegmentation = {
										weightedMultiplier: segmentationResult.weightedMultiplier,
										totalSurcharges: segmentationResult.totalSurcharges,
										zonesTraversed: segmentationResult.zonesTraversed,
										segmentationMethod: segmentationResult.segmentationMethod,
									};
									
									// Add route segmentation rule for transparency
									const segmentationRule = buildRouteSegmentationRule(
										segmentationResult,
										result.price,
										result.price, // Price not modified here, just for transparency
									);
									result.appliedRules.push(segmentationRule);
								} else {
									console.log(`[PRICING] ⚠️ Route segmentation returned no segments`);
								}
							} catch (segError) {
								console.warn(`[PRICING] Route segmentation failed:`, segError);
							}
						}
					} else {
						console.log(`[PRICING] ⚠️ API returned negative amount: ${tollResult.amount}€`);
						// IMPORTANT: Do NOT use fallback when API key is configured
						// Keep the 0€ from Google API (it means no tolls on this route)
						result.tripAnalysis.tollSource = "GOOGLE_API";
					}
				} catch (error) {
					console.warn(`[PRICING] Toll lookup failed, using estimate:`, error);
					result.tripAnalysis.tollSource = "ESTIMATE";
				}
			} else {
				console.log(`[PRICING] ⚠️ Toll calculation skipped - API Key: ${!!googleMapsApiKey}, Dropoff: ${!!data.dropoff}`);
				// No API key, using estimate
				result.tripAnalysis.tollSource = "ESTIMATE";
			}
			
			// Story 17.13: Fallback segmentation when no polyline available
			if (!result.tripAnalysis.zoneSegments && zones.length > 0 && data.dropoff && effectiveDistanceKm && effectiveDurationMinutes) {
				try {
					const pickupZone = zones.find(z => {
						if (z.zoneType === "RADIUS" && z.centerLatitude && z.centerLongitude && z.radiusKm) {
							const dist = Math.sqrt(
								Math.pow((data.pickup.lat - z.centerLatitude) * 111, 2) +
								Math.pow((data.pickup.lng - z.centerLongitude) * 111 * Math.cos(data.pickup.lat * Math.PI / 180), 2)
							);
							return dist <= z.radiusKm;
						}
						return false;
					}) ?? null;
					
					const dropoffZone = zones.find(z => {
						if (z.zoneType === "RADIUS" && z.centerLatitude && z.centerLongitude && z.radiusKm) {
							const dist = Math.sqrt(
								Math.pow((data.dropoff!.lat - z.centerLatitude) * 111, 2) +
								Math.pow((data.dropoff!.lng - z.centerLongitude) * 111 * Math.cos(data.dropoff!.lat * Math.PI / 180), 2)
							);
							return dist <= z.radiusKm;
						}
						return false;
					}) ?? null;
					
					if (pickupZone || dropoffZone) {
						const fallbackResult = createFallbackSegmentation(
							pickupZone,
							dropoffZone,
							effectiveDistanceKm,
							effectiveDurationMinutes,
						);
						
						if (fallbackResult.segments.length > 0) {
							result.tripAnalysis.zoneSegments = fallbackResult.segments.map(seg => ({
								zoneId: seg.zoneId,
								zoneCode: seg.zoneCode,
								zoneName: seg.zoneName,
								distanceKm: seg.distanceKm,
								durationMinutes: seg.durationMinutes,
								priceMultiplier: seg.priceMultiplier,
								surchargesApplied: seg.surchargesApplied,
								entryPoint: seg.entryPoint,
								exitPoint: seg.exitPoint,
							}));
							
							result.tripAnalysis.routeSegmentation = {
								weightedMultiplier: fallbackResult.weightedMultiplier,
								totalSurcharges: fallbackResult.totalSurcharges,
								zonesTraversed: fallbackResult.zonesTraversed,
								segmentationMethod: fallbackResult.segmentationMethod,
							};
						}
					}
				} catch (fallbackError) {
					console.warn(`[PRICING] Fallback segmentation failed:`, fallbackError);
				}
			}

			// Story 18.7: Transversal trip decomposition
			// Only applies when we have zone segments and a dropoff point
			if (result.tripAnalysis.zoneSegments && result.tripAnalysis.zoneSegments.length > 0 && data.dropoff) {
				try {
					// Find pickup and dropoff zones from the zone segments
					const zoneSegments = result.tripAnalysis.zoneSegments as ZoneSegment[];
					const pickupZoneCode = zoneSegments[0]?.zoneCode ?? "";
					const dropoffZoneCode = zoneSegments[zoneSegments.length - 1]?.zoneCode ?? "";

					// Build transversal decomposition config from organization settings
					const transitConfig: TransversalDecompositionConfig = {
						transitDiscountEnabled: pricingSettings.transitDiscountEnabled ?? DEFAULT_TRANSIT_CONFIG.transitDiscountEnabled,
						transitDiscountPercent: pricingSettings.transitDiscountPercent ?? DEFAULT_TRANSIT_CONFIG.transitDiscountPercent,
						transitZoneCodes: pricingSettings.transitZoneCodes ?? DEFAULT_TRANSIT_CONFIG.transitZoneCodes,
						pickupZoneCode,
						dropoffZoneCode,
					};

					// Decompose transversal trip
					const transversalResult = decomposeTransversalTrip(
						zoneSegments,
						transitConfig,
						{
							baseRatePerKm: pricingSettings.baseRatePerKm,
							baseRatePerHour: pricingSettings.baseRatePerHour,
							targetMarginPercent: pricingSettings.targetMarginPercent,
						},
					);

					// Store transversal decomposition in tripAnalysis
					result.tripAnalysis.transversalDecomposition = transversalResult;

					// If transversal and has transit discount, add applied rules
					if (transversalResult.isTransversal) {
						// Identify transit zones for the rule
						const transitZones = identifyTransitZones(
							zoneSegments,
							pickupZoneCode,
							dropoffZoneCode,
							transitConfig.transitZoneCodes,
						);

						// Add transversal decomposition rule for transparency
						const transversalRule = buildTransversalDecompositionRule(
							transversalResult,
							transitZones,
							transitConfig.transitDiscountEnabled,
						);
						result.appliedRules.push(transversalRule);

						// Add individual transit discount rules if any
						if (transversalResult.totalTransitDiscount > 0) {
							const transitDiscountRules = buildTransitDiscountRules(
								transversalResult,
								transitConfig.transitDiscountPercent,
							);
							result.appliedRules.push(...transitDiscountRules);
						}

						console.info(
							`[PRICING] Transversal trip decomposed: ` +
							`zones=${transversalResult.zonesTraversed.join(" → ")}, ` +
							`segments=${transversalResult.totalSegments}, ` +
							`transitDiscount=${transversalResult.totalTransitDiscount}€`,
						);
					}
				} catch (transversalError) {
					console.warn(`[PRICING] Transversal decomposition failed:`, transversalError);
				}
			}

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

			// Story 17.5: Calculate estimated end time for driver availability detection
			let estimatedEndAt: string | null = null;
			if (data.pickupAt && result.tripAnalysis) {
				const pickupDate = new Date(data.pickupAt);
				const endAt = calculateEstimatedEndAt(pickupDate, result.tripAnalysis);
				if (endAt) {
					estimatedEndAt = endAt.toISOString();
				}
			}

			// Story 18.3: Round-trip to MAD detection
			// Only applies to Transfer trips with isRoundTrip = true
			if (data.tripType === "transfer" && data.isRoundTrip && effectiveDistanceKm && effectiveDurationMinutes) {
				// Detect if driver is blocked on-site
				const roundTripDetection = detectRoundTripBlocked(
					true, // isRoundTrip
					effectiveDistanceKm,
					effectiveDurationMinutes,
					data.waitingTimeMinutes ?? null,
					effectivePricingSettings,
				);

				// Store detection result in tripAnalysis
				result.tripAnalysis.roundTripDetection = roundTripDetection;

				// If driver is blocked, calculate MAD suggestion
				if (roundTripDetection.isDriverBlocked) {
					const autoSwitch = effectivePricingSettings.autoSwitchRoundTripToMAD ?? false;
					const roundTripSuggestion = calculateRoundTripMadSuggestion(
						result.price, // This is already 2×Transfer price from Story 16.6
						effectiveDistanceKm,
						effectiveDurationMinutes,
						roundTripDetection.waitingTimeMinutes ?? 0,
						roundTripDetection,
						effectivePricingSettings,
						autoSwitch,
					);

					result.tripAnalysis.roundTripSuggestion = roundTripSuggestion;

					// If auto-switch is enabled and MAD is more profitable, switch the price
					if (roundTripSuggestion.autoSwitched) {
						const originalPrice = result.price;
						result.price = roundTripSuggestion.madPrice;

						// Recalculate margin with new price
						result.margin = Math.round((result.price - result.internalCost) * 100) / 100;
						result.marginPercent = result.price > 0
							? Math.round((result.margin / result.price) * 100 * 100) / 100
							: 0;

						// Update profitability indicator
						const greenThreshold = pricingSettings.greenMarginThreshold ?? 20;
						const orangeThreshold = pricingSettings.orangeMarginThreshold ?? 0;
						if (result.marginPercent >= greenThreshold) {
							result.profitabilityIndicator = "green";
						} else if (result.marginPercent >= orangeThreshold) {
							result.profitabilityIndicator = "orange";
						} else {
							result.profitabilityIndicator = "red";
						}

						// Add auto-switched rule for transparency
						const autoSwitchRule = buildAutoSwitchedRoundTripToMadRule(roundTripDetection, roundTripSuggestion);
						result.appliedRules.push(autoSwitchRule);

						console.info(
							`[PRICING] Auto-switched round-trip to MAD: ` +
							`originalPrice=${originalPrice}€, madPrice=${roundTripSuggestion.madPrice}€, ` +
							`waitingTime=${roundTripDetection.waitingTimeMinutes}min, ` +
							`returnToBase=${roundTripDetection.returnToBaseMinutes}min, ` +
							`reason=${roundTripDetection.exceedsMaxReturnDistance ? 'EXCEEDS_MAX_DISTANCE' : 'DRIVER_BLOCKED'}`
						);
					}
				}
			}

			// Story 18.2: Dense zone detection for Transfer-to-MAD switching
			// Only applies to Transfer trips with both pickup and dropoff (and NOT round-trips, as 18.3 handles those)
			if (data.tripType === "transfer" && !data.isRoundTrip && data.dropoff && effectiveDistanceKm && effectiveDurationMinutes) {
				// Find pickup and dropoff zones for dense zone detection
				const pickupZoneForDense = zones.find(z => {
					if (z.zoneType === "RADIUS" && z.centerLatitude && z.centerLongitude && z.radiusKm) {
						const distance = Math.sqrt(
							Math.pow((data.pickup.lat - z.centerLatitude) * 111, 2) +
							Math.pow((data.pickup.lng - z.centerLongitude) * 111 * Math.cos(data.pickup.lat * Math.PI / 180), 2)
						);
						return distance <= z.radiusKm;
					}
					return false;
				});
				
				const dropoffZoneForDense = zones.find(z => {
					if (z.zoneType === "RADIUS" && z.centerLatitude && z.centerLongitude && z.radiusKm) {
						const distance = Math.sqrt(
							Math.pow((data.dropoff!.lat - z.centerLatitude) * 111, 2) +
							Math.pow((data.dropoff!.lng - z.centerLongitude) * 111 * Math.cos(data.dropoff!.lat * Math.PI / 180), 2)
						);
						return distance <= z.radiusKm;
					}
					return false;
				});

				// Detect dense zone
				const denseZoneDetection = detectDenseZone(
					pickupZoneForDense ? { code: pickupZoneForDense.code } : null,
					dropoffZoneForDense ? { code: dropoffZoneForDense.code } : null,
					effectiveDistanceKm,
					effectiveDurationMinutes,
					effectivePricingSettings,
				);

				// Store detection result in tripAnalysis
				result.tripAnalysis.denseZoneDetection = denseZoneDetection;

				// If intra-dense-zone with low commercial speed, calculate MAD suggestion
				if (denseZoneDetection.isIntraDenseZone && denseZoneDetection.isBelowThreshold) {
					const autoSwitch = effectivePricingSettings.autoSwitchToMAD ?? false;
					const madSuggestion = calculateMadSuggestion(
						result.price,
						effectiveDurationMinutes,
						effectiveDistanceKm,
						effectivePricingSettings,
						autoSwitch,
					);

					result.tripAnalysis.madSuggestion = madSuggestion;

					// If auto-switch is enabled and MAD is more profitable, switch the price
					if (madSuggestion.autoSwitched) {
						const originalPrice = result.price;
						result.price = madSuggestion.madPrice;
						
						// Recalculate margin with new price
						result.margin = Math.round((result.price - result.internalCost) * 100) / 100;
						result.marginPercent = result.price > 0
							? Math.round((result.margin / result.price) * 100 * 100) / 100
							: 0;

						// Update profitability indicator
						const greenThreshold = pricingSettings.greenMarginThreshold ?? 20;
						const orangeThreshold = pricingSettings.orangeMarginThreshold ?? 0;
						if (result.marginPercent >= greenThreshold) {
							result.profitabilityIndicator = "green";
						} else if (result.marginPercent >= orangeThreshold) {
							result.profitabilityIndicator = "orange";
						} else {
							result.profitabilityIndicator = "red";
						}

						// Add auto-switched rule for transparency
						const autoSwitchRule = buildAutoSwitchedToMadRule(denseZoneDetection, madSuggestion);
						result.appliedRules.push(autoSwitchRule);

						console.info(
							`[PRICING] Auto-switched Transfer to MAD: ` +
							`originalPrice=${originalPrice}€, madPrice=${madSuggestion.madPrice}€, ` +
							`commercialSpeed=${denseZoneDetection.commercialSpeedKmh}km/h, ` +
							`threshold=${denseZoneDetection.speedThreshold}km/h`
						);
					}
				}
			}

			return c.json({
				...result,
				estimatedEndAt,
			});
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
