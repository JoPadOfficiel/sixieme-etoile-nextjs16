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
	type AdvancedRateData,
	type ContactData,
	type DispoPackageAssignment,
	type ExcursionPackageAssignment,
	type FuelConsumptionResolution,
	type OrganizationPricingSettings,
	type PartnerContractData,
	type PricingRequest,
	type PricingResult,
	type SeasonalMultiplierData,
	type VehicleCategoryInfo,
	type ZoneRouteAssignment,
	type VehicleSelectionInfo,
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
	// Story 4.5: Passenger and luggage count for vehicle selection
	passengerCount: z.coerce.number().int().positive().default(1),
	luggageCount: z.coerce.number().int().nonnegative().optional(),
	// Story 4.5: Vehicle selection options
	enableVehicleSelection: z.boolean().default(true),
	haversineThresholdKm: z.coerce.number().positive().optional(),
	maxCandidatesForRouting: z.coerce.number().int().positive().optional(),
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
		// Story 11.3: Zone pricing multiplier
		priceMultiplier: zone.priceMultiplier ? Number(zone.priceMultiplier) : 1.0,
	}));
}

/**
 * Load or create default pricing settings for the organization
 * Story 4.2: Now includes cost parameters for operational cost calculation
 * Story 4.8: Fuel price is resolved from cache (no real-time API calls)
 */
async function loadPricingSettings(
	organizationId: string,
): Promise<OrganizationPricingSettings & { fuelPriceSource?: FuelPriceResult }> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const settings = await db.organizationPricingSettings.findFirst({
		where: { organizationId },
	}) as any;

	// Story 4.8: Get fuel price from cache
	// This never calls external APIs - reads from FuelPriceCache table
	const fuelPriceResult = await getFuelPrice();

	if (settings) {
		return {
			baseRatePerKm: Number(settings.baseRatePerKm),
			baseRatePerHour: Number(settings.baseRatePerHour),
			targetMarginPercent: Number(settings.defaultMarginPercent),
			// Story 4.2: Cost parameters (optional, will use defaults if not set)
			fuelConsumptionL100km: settings.fuelConsumptionL100km ? Number(settings.fuelConsumptionL100km) : undefined,
			// Story 4.8: Use cached fuel price, fallback to org settings, then defaults
			fuelPricePerLiter: fuelPriceResult.pricePerLitre ?? (settings.fuelPricePerLiter ? Number(settings.fuelPricePerLiter) : undefined),
			tollCostPerKm: settings.tollCostPerKm ? Number(settings.tollCostPerKm) : undefined,
			wearCostPerKm: settings.wearCostPerKm ? Number(settings.wearCostPerKm) : undefined,
			driverHourlyCost: settings.driverHourlyCost ? Number(settings.driverHourlyCost) : undefined,
			// Story 4.7: Profitability thresholds (optional, will use defaults if not set)
			greenMarginThreshold: settings.greenMarginThreshold ? Number(settings.greenMarginThreshold) : undefined,
			orangeMarginThreshold: settings.orangeMarginThreshold ? Number(settings.orangeMarginThreshold) : undefined,
			// Story 4.8: Include fuel price source for transparency
			fuelPriceSource: fuelPriceResult,
		};
	}

	// Return default settings if none exist
	return {
		baseRatePerKm: 2.5,
		baseRatePerHour: 45.0,
		targetMarginPercent: 20.0,
		// Story 4.8: Use cached fuel price even for default settings
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
	const settings = await db.organizationIntegrationSettings.findFirst({
		where: { organizationId },
	});

	if (settings?.googleMapsApiKey) {
		return settings.googleMapsApiKey;
	}

	// Fallback to environment variable
	return process.env.GOOGLE_MAPS_API_KEY;
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

			// Validate vehicle category exists and load consumption (Story 15.2)
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
				},
			});

			if (!vehicleCategory) {
				throw new HTTPException(400, {
					message: "Vehicle category not found",
				});
			}

			// Load zones, pricing settings, multipliers, and vehicles (Story 4.3 + 4.5)
			const [zones, pricingSettings, advancedRates, seasonalMultipliers, vehicles, googleMapsApiKey] = await Promise.all([
				loadZones(organizationId),
				loadPricingSettings(organizationId),
				loadAdvancedRates(organizationId),
				loadSeasonalMultipliers(organizationId),
				data.enableVehicleSelection ? loadVehiclesForSelection(organizationId) : Promise.resolve([]),
				data.enableVehicleSelection ? loadGoogleMapsApiKey(organizationId) : Promise.resolve(undefined),
			]);

			// Story 4.5: Vehicle selection
			let vehicleSelectionInfo: VehicleSelectionInfo | undefined;
			let effectiveDistanceKm = data.estimatedDistanceKm;
			let effectiveDurationMinutes = data.estimatedDurationMinutes;

			if (data.enableVehicleSelection && vehicles.length > 0) {
				const selectionInput: VehicleSelectionInput = {
					organizationId,
					pickup: data.pickup,
					dropoff: data.dropoff,
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
					// Use total distance/duration from routing (includes approach + service + return)
					// For pricing, we use service segment only (pickup → dropoff)
					effectiveDistanceKm = selectionResult.selectedCandidate.serviceDistanceKm;
					effectiveDurationMinutes = selectionResult.selectedCandidate.serviceDurationMinutes;
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
			const pricingRequest: PricingRequest = {
				contactId: data.contactId,
				pickup: data.pickup,
				dropoff: data.dropoff,
				vehicleCategoryId: data.vehicleCategoryId,
				tripType: data.tripType,
				pickupAt: data.pickupAt,
				estimatedDurationMinutes: effectiveDurationMinutes,
				estimatedDistanceKm: effectiveDistanceKm,
			};

			// Calculate price (Story 4.3: now includes multipliers, Story 15.3: vehicle category)
			const result = calculatePrice(pricingRequest, {
				contact,
				zones,
				pricingSettings: effectivePricingSettings,
				advancedRates,
				seasonalMultipliers,
				// Story 15.3: Pass vehicle category for price multiplier
				vehicleCategory: vehicleCategory ? {
					id: vehicleCategory.id,
					code: vehicleCategory.code,
					name: vehicleCategory.name,
					priceMultiplier: Number(vehicleCategory.priceMultiplier),
				} : undefined,
			});

			// Story 4.5: Add vehicle selection info to tripAnalysis
			if (vehicleSelectionInfo) {
				result.tripAnalysis.vehicleSelection = vehicleSelectionInfo;
			}

			// Story 4.8: Add fuel price source to tripAnalysis for transparency
			if (pricingSettings.fuelPriceSource) {
				result.tripAnalysis.fuelPriceSource = {
					pricePerLitre: pricingSettings.fuelPriceSource.pricePerLitre,
					currency: pricingSettings.fuelPriceSource.currency,
					source: pricingSettings.fuelPriceSource.source,
					fetchedAt: pricingSettings.fuelPriceSource.fetchedAt?.toISOString() ?? null,
					isStale: pricingSettings.fuelPriceSource.isStale,
					fuelType: pricingSettings.fuelPriceSource.fuelType,
					countryCode: pricingSettings.fuelPriceSource.countryCode,
				};
			}

			// Story 15.2: Add fuel consumption source to tripAnalysis for transparency
			result.tripAnalysis.fuelConsumptionSource = fuelResolution.source;
			result.tripAnalysis.fuelConsumptionL100km = fuelResolution.consumptionL100km;

			// Story 15.1: Get real toll costs from Google Routes API
			if (googleMapsApiKey) {
				try {
					const tollResult = await getTollCost(data.pickup, data.dropoff, {
						apiKey: googleMapsApiKey,
						fallbackRatePerKm: pricingSettings.tollCostPerKm ?? 0.12,
					});

					if (tollResult.amount >= 0) {
						// Update toll cost in tripAnalysis with real data
						const oldTollAmount = result.tripAnalysis.costBreakdown.tolls.amount;
						const tollDifference = tollResult.amount - oldTollAmount;

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
					} else {
						// API failed, mark as estimate
						result.tripAnalysis.tollSource = "ESTIMATE";
					}
				} catch (error) {
					console.warn(`[PRICING] Toll lookup failed, using estimate:`, error);
					result.tripAnalysis.tollSource = "ESTIMATE";
				}
			} else {
				// No API key, using estimate
				result.tripAnalysis.tollSource = "ESTIMATE";
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
