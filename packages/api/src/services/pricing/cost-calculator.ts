/**
 * Cost Calculator Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * 
 * This module handles all cost calculation functions:
 * - Fuel cost calculation
 * - Toll cost calculation
 * - Wear cost calculation
 * - Driver cost calculation
 * - Complete cost breakdown
 * - TCO (Total Cost of Ownership) calculation
 * - Zone surcharges
 */

import type {
	FuelType,
	FuelCostComponent,
	TollCostComponent,
	WearCostComponent,
	DriverCostComponent,
	ParkingCostComponent,
	CostBreakdown,
	OrganizationPricingSettings,
	TollConfig,
	ZoneSurcharges,
	ZoneSurchargeComponent,
	TcoCostComponent,
	VehicleWithTco,
	VehicleCategoryWithTco,
	AppliedRule,
	FuelConsumptionSource,
	FuelConsumptionResolution,
	ZoneData,
	GeoPoint,
	FuelPriceSourceInfo,
} from "./types";
import { DEFAULT_COST_PARAMETERS, DEFAULT_FUEL_PRICES } from "./constants";
import { getTollCost, calculateFallbackToll, type TollSource } from "../toll-service";
import {
	calculateTcoCost,
	buildTcoConfig,
	getTcoSource,
	type TcoConfig,
	type VehicleForTco,
	type VehicleCategoryForTco,
} from "../tco-calculator";
import { getFuelPrice as getFuelPriceFromService, type FuelPriceResult } from "../fuel-price-service";

// ============================================================================
// Fuel Price Functions
// ============================================================================

/**
 * Story 15.6: Get fuel price for a specific fuel type
 * Falls back to default prices if not in custom prices
 */
export function getFuelPrice(
	fuelType: FuelType,
	customPrices?: Partial<Record<FuelType, number>>,
): number {
	return customPrices?.[fuelType] ?? DEFAULT_FUEL_PRICES[fuelType];
}

// ============================================================================
// Fuel Consumption Resolution
// ============================================================================

/**
 * Story 15.2: Resolve fuel consumption using fallback chain
 * Priority: Vehicle → Category → Organization → Default
 */
export function resolveFuelConsumption(
	vehicleConsumption: number | null | undefined,
	categoryConsumption: number | null | undefined,
	orgConsumption: number | null | undefined,
): FuelConsumptionResolution {
	if (vehicleConsumption != null && vehicleConsumption > 0) {
		return { consumptionL100km: vehicleConsumption, source: "VEHICLE" };
	}
	if (categoryConsumption != null && categoryConsumption > 0) {
		return { consumptionL100km: categoryConsumption, source: "CATEGORY" };
	}
	if (orgConsumption != null && orgConsumption > 0) {
		return { consumptionL100km: orgConsumption, source: "ORGANIZATION" };
	}
	return {
		consumptionL100km: DEFAULT_COST_PARAMETERS.fuelConsumptionL100km,
		source: "DEFAULT",
	};
}

// ============================================================================
// Individual Cost Component Calculations
// ============================================================================

/**
 * Story 15.6: Calculate fuel cost with correct fuel type
 */
export function calculateFuelCost(
	distanceKm: number,
	consumptionL100km: number,
	fuelType: FuelType,
	customPrices?: Partial<Record<FuelType, number>>,
): FuelCostComponent {
	const pricePerLiter = getFuelPrice(fuelType, customPrices);
	const litersUsed = (distanceKm / 100) * consumptionL100km;
	const amount = Math.round(litersUsed * pricePerLiter * 100) / 100;

	return {
		amount,
		distanceKm,
		consumptionL100km,
		pricePerLiter,
		fuelType,
	};
}

/**
 * Calculate toll cost
 * Formula: distanceKm × tollCostPerKm
 */
export function calculateTollCost(
	distanceKm: number,
	ratePerKm: number,
): TollCostComponent {
	const amount = Math.round(distanceKm * ratePerKm * 100) / 100;
	return {
		amount,
		distanceKm,
		ratePerKm,
	};
}

/**
 * Calculate vehicle wear cost
 * Formula: distanceKm × wearCostPerKm
 */
export function calculateWearCost(
	distanceKm: number,
	ratePerKm: number,
): WearCostComponent {
	const amount = Math.round(distanceKm * ratePerKm * 100) / 100;
	return {
		amount,
		distanceKm,
		ratePerKm,
	};
}

/**
 * Calculate driver cost
 * Formula: (durationMinutes / 60) × driverHourlyCost
 */
export function calculateDriverCost(
	durationMinutes: number,
	hourlyRate: number,
): DriverCostComponent {
	const amount = Math.round((durationMinutes / 60) * hourlyRate * 100) / 100;
	return {
		amount,
		durationMinutes,
		hourlyRate,
	};
}

// ============================================================================
// Zone Surcharges
// ============================================================================

/**
 * Story 17.10: Create a zone surcharge component from zone data
 */
function createZoneSurchargeComponent(zone: ZoneData): ZoneSurchargeComponent {
	const parkingSurcharge = zone.fixedParkingSurcharge ?? 0;
	const accessFee = zone.fixedAccessFee ?? 0;
	const total = Math.round((parkingSurcharge + accessFee) * 100) / 100;
	
	return {
		zoneId: zone.id,
		zoneName: zone.name,
		zoneCode: zone.code,
		parkingSurcharge,
		accessFee,
		total,
		description: zone.surchargeDescription ?? null,
	};
}

/**
 * Story 17.10: Calculate zone surcharges for pickup and dropoff zones
 * Avoids double-counting if pickup and dropoff are in the same zone
 */
export function calculateZoneSurcharges(
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
): ZoneSurcharges {
	const pickup = pickupZone ? createZoneSurchargeComponent(pickupZone) : null;
	const dropoff = dropoffZone && dropoffZone.id !== pickupZone?.id
		? createZoneSurchargeComponent(dropoffZone)
		: null;
	const total = Math.round(((pickup?.total ?? 0) + (dropoff?.total ?? 0)) * 100) / 100;
	
	return { pickup, dropoff, total };
}

// ============================================================================
// Complete Cost Breakdown
// ============================================================================

/**
 * Calculate complete cost breakdown (Story 4.2 + 15.6)
 * Returns all cost components and total internal cost
 */
export function calculateCostBreakdown(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	parkingCost: number = 0,
	parkingDescription: string = "",
	fuelType: FuelType = "DIESEL",
): CostBreakdown {
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelType);
	const tolls = calculateTollCost(distanceKm, tollCostPerKm);
	const wear = calculateWearCost(distanceKm, wearCostPerKm);
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	const total = Math.round((fuel.amount + tolls.amount + wear.amount + driver.amount + parking.amount) * 100) / 100;

	return {
		fuel,
		tolls,
		wear,
		driver,
		parking,
		total,
	};
}

/**
 * Story 15.1: Calculate cost breakdown with real toll costs from Google Routes API
 */
export async function calculateCostBreakdownWithTolls(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	tollConfig?: TollConfig,
	parkingCost: number = 0,
	parkingDescription: string = "",
	fuelType: FuelType = "DIESEL",
): Promise<{ breakdown: CostBreakdown; tollSource: TollSource }> {
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelType);
	const wear = calculateWearCost(distanceKm, wearCostPerKm);
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	let tolls: TollCostComponent;
	let tollSource: TollSource = "ESTIMATE";

	if (tollConfig?.origin && tollConfig?.destination && tollConfig?.apiKey) {
		const tollResult = await getTollCost(tollConfig.origin, tollConfig.destination, {
			apiKey: tollConfig.apiKey,
			fallbackRatePerKm: tollCostPerKm,
		});

		if (tollResult.amount >= 0) {
			tolls = {
				amount: tollResult.amount,
				distanceKm,
				ratePerKm: 0,
				source: tollResult.source,
				isFromCache: tollResult.isFromCache,
			};
			tollSource = tollResult.source;
		} else {
			tolls = {
				amount: calculateFallbackToll(distanceKm, tollCostPerKm),
				distanceKm,
				ratePerKm: tollCostPerKm,
				source: "ESTIMATE",
				isFromCache: false,
			};
			tollSource = "ESTIMATE";
		}
	} else {
		tolls = {
			amount: Math.round(distanceKm * tollCostPerKm * 100) / 100,
			distanceKm,
			ratePerKm: tollCostPerKm,
			source: "ESTIMATE",
			isFromCache: false,
		};
		tollSource = "ESTIMATE";
	}

	const total = Math.round(
		(fuel.amount + tolls.amount + wear.amount + driver.amount + parking.amount) * 100
	) / 100;

	return {
		breakdown: {
			fuel,
			tolls,
			wear,
			driver,
			parking,
			total,
		},
		tollSource,
	};
}

// ============================================================================
// Story 20.5: Real Fuel Price Integration
// ============================================================================

/**
 * Configuration for real cost calculation with fuel and tolls
 */
export interface RealCostConfig {
	pickup?: GeoPoint;
	dropoff?: GeoPoint;
	stops?: GeoPoint[];
	organizationId?: string;
	tollApiKey?: string;
}

/**
 * Result of cost breakdown with real fuel prices
 */
export interface CostBreakdownWithRealCostsResult {
	breakdown: CostBreakdown;
	tollSource: TollSource;
	fuelPriceSource: FuelPriceSourceInfo;
}

/**
 * Story 20.5: Calculate cost breakdown with real fuel prices from CollectAPI
 * 
 * This function fetches real-time fuel prices based on route coordinates
 * and combines them with real toll costs from Google Routes API.
 * 
 * Fallback chain for fuel prices:
 * 1. REALTIME: CollectAPI based on pickup/dropoff coordinates
 * 2. CACHE: Database cache (FuelPriceCache table)
 * 3. DEFAULT: Hardcoded DEFAULT_FUEL_PRICES
 * 
 * @param distanceKm - Trip distance in kilometers
 * @param durationMinutes - Trip duration in minutes
 * @param settings - Organization pricing settings
 * @param config - Real cost configuration with coordinates and API keys
 * @param parkingCost - Optional parking cost
 * @param parkingDescription - Optional parking description
 * @param fuelType - Fuel type (default: DIESEL)
 * @returns Cost breakdown with fuel and toll sources
 */
export async function calculateCostBreakdownWithRealCosts(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	config?: RealCostConfig,
	parkingCost: number = 0,
	parkingDescription: string = "",
	fuelType: FuelType = "DIESEL",
): Promise<CostBreakdownWithRealCostsResult> {
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	// Fetch real fuel price from CollectAPI
	// Note: ELECTRIC is not supported by CollectAPI, fallback to default for electric vehicles
	let fuelPriceResult: FuelPriceResult;
	
	if (fuelType === "ELECTRIC") {
		// Electric vehicles use default price (no API support)
		fuelPriceResult = {
			pricePerLitre: DEFAULT_FUEL_PRICES.ELECTRIC,
			currency: "EUR",
			source: "DEFAULT",
			fetchedAt: null,
			isStale: false,
			fuelType: "DIESEL", // Prisma type doesn't have ELECTRIC
			countryCode: "FR",
		};
	} else {
		try {
			fuelPriceResult = await getFuelPriceFromService({
				pickup: config?.pickup,
				dropoff: config?.dropoff,
				stops: config?.stops,
				organizationId: config?.organizationId,
				fuelType: fuelType as "DIESEL" | "GASOLINE" | "LPG",
			});
		} catch (error) {
			console.error(`[CostCalculator] Failed to fetch fuel price: ${error}`);
			// Fallback to default
			fuelPriceResult = {
				pricePerLitre: DEFAULT_FUEL_PRICES[fuelType],
				currency: "EUR",
				source: "DEFAULT",
				fetchedAt: null,
				isStale: false,
				fuelType: fuelType as "DIESEL" | "GASOLINE" | "LPG",
				countryCode: "FR",
			};
		}
	}

	// Calculate fuel cost with real price
	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelType, {
		[fuelType]: fuelPriceResult.pricePerLitre,
	});

	// Calculate wear cost
	const wear = calculateWearCost(distanceKm, wearCostPerKm);
	
	// Calculate driver cost
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	
	// Parking
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	// Calculate tolls (real or estimate)
	let tolls: TollCostComponent;
	let tollSource: TollSource = "ESTIMATE";

	if (config?.pickup && config?.dropoff && config?.tollApiKey) {
		const tollResult = await getTollCost(config.pickup, config.dropoff, {
			apiKey: config.tollApiKey,
			fallbackRatePerKm: tollCostPerKm,
		});

		if (tollResult.amount >= 0) {
			tolls = {
				amount: tollResult.amount,
				distanceKm,
				ratePerKm: 0,
				source: tollResult.source,
				isFromCache: tollResult.isFromCache,
			};
			tollSource = tollResult.source;
		} else {
			tolls = {
				amount: calculateFallbackToll(distanceKm, tollCostPerKm),
				distanceKm,
				ratePerKm: tollCostPerKm,
				source: "ESTIMATE",
				isFromCache: false,
			};
		}
	} else {
		tolls = {
			amount: Math.round(distanceKm * tollCostPerKm * 100) / 100,
			distanceKm,
			ratePerKm: tollCostPerKm,
			source: "ESTIMATE",
			isFromCache: false,
		};
	}

	const total = Math.round(
		(fuel.amount + tolls.amount + wear.amount + driver.amount + parking.amount) * 100
	) / 100;

	// Build fuel price source info for tripAnalysis
	const fuelPriceSource: FuelPriceSourceInfo = {
		pricePerLitre: fuelPriceResult.pricePerLitre,
		currency: "EUR",
		source: fuelPriceResult.source,
		fetchedAt: fuelPriceResult.fetchedAt?.toISOString() ?? null,
		isStale: fuelPriceResult.isStale,
		fuelType: fuelPriceResult.fuelType,
		countryCode: fuelPriceResult.countryCode,
		countriesOnRoute: fuelPriceResult.countriesOnRoute,
		routePrices: fuelPriceResult.routePrices,
	};

	return {
		breakdown: {
			fuel,
			tolls,
			wear,
			driver,
			parking,
			total,
		},
		tollSource,
		fuelPriceSource,
	};
}

/**
 * Story 17.14: Calculate cost breakdown with TCO instead of wear when configured
 */
export function calculateCostBreakdownWithTco(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	vehicle?: VehicleWithTco | null,
	vehicleCategory?: VehicleCategoryWithTco | null,
	parkingCost: number = 0,
	parkingDescription: string = "",
	fuelType: FuelType = "DIESEL",
): { breakdown: CostBreakdown; tcoApplied: boolean; tcoSource: "VEHICLE" | "CATEGORY" | null } {
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelType);
	const tolls = calculateTollCost(distanceKm, tollCostPerKm);
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	const tcoConfig = vehicle ? buildTcoConfig(
		vehicle as VehicleForTco,
		vehicleCategory as VehicleCategoryForTco | undefined
	) : null;

	let wear: WearCostComponent;
	let tco: TcoCostComponent | undefined;
	let tcoApplied = false;
	let tcoSource: "VEHICLE" | "CATEGORY" | null = null;

	if (tcoConfig) {
		const tcoResult = calculateTcoCost(distanceKm, tcoConfig);
		tcoSource = getTcoSource(
			vehicle as VehicleForTco,
			vehicleCategory as VehicleCategoryForTco | undefined
		);
		
		tco = {
			amount: tcoResult.amount,
			distanceKm: tcoResult.distanceKm,
			depreciation: tcoResult.depreciation,
			maintenance: tcoResult.maintenance,
			insurance: tcoResult.insurance,
			totalRatePerKm: tcoResult.totalRatePerKm,
			source: tcoSource!,
		};
		
		wear = {
			amount: 0,
			distanceKm,
			ratePerKm: 0,
		};
		
		tcoApplied = true;
	} else {
		wear = calculateWearCost(distanceKm, wearCostPerKm);
	}

	const wearOrTcoAmount = tcoApplied ? tco!.amount : wear.amount;
	const total = Math.round(
		(fuel.amount + tolls.amount + wearOrTcoAmount + driver.amount + parking.amount) * 100
	) / 100;

	return {
		breakdown: {
			fuel,
			tolls,
			wear,
			driver,
			parking,
			tco,
			total,
		},
		tcoApplied,
		tcoSource,
	};
}

/**
 * Story 17.14: Create TCO applied rule for transparency
 */
export function createTcoAppliedRule(
	tco: TcoCostComponent,
	vehicleId: string,
	vehicleName?: string,
): AppliedRule {
	return {
		type: "TCO_COST",
		description: `TCO replaces generic wear cost (source: ${tco.source})`,
		vehicleId,
		vehicleName: vehicleName ?? "Unknown",
		totalAmount: tco.amount,
		distanceKm: tco.distanceKm,
		totalRatePerKm: tco.totalRatePerKm,
		depreciation: {
			amount: tco.depreciation.amount,
			ratePerKm: tco.depreciation.ratePerKm,
			method: tco.depreciation.method,
		},
		maintenance: {
			amount: tco.maintenance.amount,
			ratePerKm: tco.maintenance.ratePerKm,
		},
		insurance: {
			amount: tco.insurance.amount,
			ratePerKm: tco.insurance.ratePerKm,
		},
		source: tco.source,
	};
}

// ============================================================================
// Internal Cost Calculation
// ============================================================================

/**
 * Estimate internal cost using detailed cost breakdown (Story 4.2)
 */
export function calculateInternalCost(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): number {
	const breakdown = calculateCostBreakdown(distanceKm, durationMinutes, settings);
	return breakdown.total;
}

/**
 * @deprecated Use calculateInternalCost instead (Story 4.2)
 * Estimate internal cost (simplified - kept for backward compatibility)
 */
export function estimateInternalCost(distanceKm: number): number {
	const costPerKm = 2.5;
	return Math.round(distanceKm * costPerKm * 100) / 100;
}

// ============================================================================
// Cost Breakdown Combination
// ============================================================================

/**
 * Combine multiple cost breakdowns into a total
 */
export function combineCostBreakdowns(breakdowns: CostBreakdown[]): CostBreakdown {
	const combined: CostBreakdown = {
		fuel: { amount: 0, distanceKm: 0, consumptionL100km: 0, pricePerLiter: 0, fuelType: "DIESEL" },
		tolls: { amount: 0, distanceKm: 0, ratePerKm: 0 },
		wear: { amount: 0, distanceKm: 0, ratePerKm: 0 },
		driver: { amount: 0, durationMinutes: 0, hourlyRate: 0 },
		parking: { amount: 0, description: "" },
		total: 0,
	};

	for (const breakdown of breakdowns) {
		combined.fuel.amount += breakdown.fuel.amount;
		combined.fuel.distanceKm += breakdown.fuel.distanceKm;
		combined.tolls.amount += breakdown.tolls.amount;
		combined.tolls.distanceKm += breakdown.tolls.distanceKm;
		combined.wear.amount += breakdown.wear.amount;
		combined.wear.distanceKm += breakdown.wear.distanceKm;
		combined.driver.amount += breakdown.driver.amount;
		combined.driver.durationMinutes += breakdown.driver.durationMinutes;
		combined.parking.amount += breakdown.parking.amount;
		combined.total += breakdown.total;
	}

	combined.fuel.amount = Math.round(combined.fuel.amount * 100) / 100;
	combined.tolls.amount = Math.round(combined.tolls.amount * 100) / 100;
	combined.wear.amount = Math.round(combined.wear.amount * 100) / 100;
	combined.driver.amount = Math.round(combined.driver.amount * 100) / 100;
	combined.total = Math.round(combined.total * 100) / 100;

	const firstWithFuel = breakdowns.find(b => b.fuel.consumptionL100km > 0);
	if (firstWithFuel) {
		combined.fuel.consumptionL100km = firstWithFuel.fuel.consumptionL100km;
		combined.fuel.pricePerLiter = firstWithFuel.fuel.pricePerLiter;
	}
	const firstWithTolls = breakdowns.find(b => b.tolls.ratePerKm > 0);
	if (firstWithTolls) {
		combined.tolls.ratePerKm = firstWithTolls.tolls.ratePerKm;
	}
	const firstWithWear = breakdowns.find(b => b.wear.ratePerKm > 0);
	if (firstWithWear) {
		combined.wear.ratePerKm = firstWithWear.wear.ratePerKm;
	}
	const firstWithDriver = breakdowns.find(b => b.driver.hourlyRate > 0);
	if (firstWithDriver) {
		combined.driver.hourlyRate = firstWithDriver.driver.hourlyRate;
	}

	return combined;
}
