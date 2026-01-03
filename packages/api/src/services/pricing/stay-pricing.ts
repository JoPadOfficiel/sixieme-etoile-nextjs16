/**
 * Stay Pricing Module
 * Story 22.5: Pricing calculations for STAY trip type (multi-day packages)
 * Story 22.7: Enhanced with zone multipliers, seasonal multipliers, and trip-type pricing integration
 * 
 * This module handles:
 * - Per-service pricing using existing trip-type-pricing functions
 * - Zone multiplier integration for each service
 * - Seasonal multiplier application
 * - Per-day staffing costs (hotel, meals, driver overnight premium)
 * - Total stay package pricing with breakdown
 * - Vehicle category multiplier application
 */

import type {
	OrganizationPricingSettings,
	CostBreakdown,
	TripAnalysis,
	AppliedRule,
	SeasonalMultiplierData,
	AdvancedRateData,
	ZoneData,
	MultiplierContext,
} from "./types";
import {
	calculateExcursionPrice,
	calculateSmartDispoPrice,
} from "./trip-type-pricing";
import {
	applyZoneMultiplier,
	calculateEffectiveZoneMultiplier,
} from "./zone-resolver";
import {
	evaluateSeasonalMultipliers,
	evaluateAdvancedRates,
	applyVehicleCategoryMultiplier,
} from "./multiplier-engine";
import {
	calculateFuelCost,
	calculateTollCost,
	calculateWearCost,
	calculateDriverCost,
} from "./cost-calculator";

// ============================================================================
// Types
// ============================================================================

export type StayServiceType = "TRANSFER" | "DISPO" | "EXCURSION";

export interface StayServiceInput {
	serviceType: StayServiceType;
	pickupAt: string;
	pickupAddress: string;
	pickupLatitude?: number;
	pickupLongitude?: number;
	dropoffAddress?: string;
	dropoffLatitude?: number;
	dropoffLongitude?: number;
	durationHours?: number; // For DISPO
	stops?: Array<{
		address: string;
		latitude: number;
		longitude: number;
		order: number;
	}>; // For EXCURSION
	distanceKm?: number;
	durationMinutes?: number;
	notes?: string;
}

export interface StayDayInput {
	date: string;
	hotelRequired?: boolean;
	mealCount?: number;
	driverCount?: number;
	notes?: string;
	services: StayServiceInput[];
}

export interface StayPricingInput {
	vehicleCategoryId: string;
	passengerCount: number;
	stayDays: StayDayInput[];
}

export interface StayServicePricingResult {
	serviceOrder: number;
	serviceType: StayServiceType;
	serviceCost: number;
	serviceInternalCost: number;
	distanceKm: number;
	durationMinutes: number;
	tripAnalysis: Partial<TripAnalysis> | null;
}

export interface StayDayPricingResult {
	dayNumber: number;
	date: string;
	hotelRequired: boolean;
	hotelCost: number;
	mealCount: number;
	mealCost: number;
	driverCount: number;
	driverOvernightCost: number;
	dayTotalCost: number;
	dayTotalInternalCost: number;
	services: StayServicePricingResult[];
}

export interface StayPricingResult {
	stayStartDate: string;
	stayEndDate: string;
	totalDays: number;
	totalServicesCost: number;
	totalStaffingCost: number;
	totalCost: number;
	totalInternalCost: number;
	marginPercent: number;
	days: StayDayPricingResult[];
	tripAnalysis: {
		stayBreakdown: {
			totalDays: number;
			totalServices: number;
			totalHotelNights: number;
			totalMeals: number;
			totalDistanceKm: number;
			totalDurationMinutes: number;
		};
		costBreakdown: {
			services: number;
			hotels: number;
			meals: number;
			driverPremiums: number;
			total: number;
		};
	};
}

// ============================================================================
// Pricing Functions
// ============================================================================

/**
 * Calculate pricing for a single service within a stay day
 */
export function calculateStayServicePricing(
	service: StayServiceInput,
	serviceOrder: number,
	settings: OrganizationPricingSettings,
	vehicleCategoryRatePerKm: number,
	vehicleCategoryRatePerHour: number,
): StayServicePricingResult {
	const distanceKm = service.distanceKm ?? 0;
	const durationMinutes = service.durationMinutes ?? 0;
	
	let serviceCost = 0;
	let serviceInternalCost = 0;
	
	// Calculate based on service type
	switch (service.serviceType) {
		case "TRANSFER": {
			// Transfer: max(distance × ratePerKm, duration × ratePerHour)
			const distancePrice = distanceKm * vehicleCategoryRatePerKm;
			const durationPrice = (durationMinutes / 60) * vehicleCategoryRatePerHour;
			serviceCost = Math.max(distancePrice, durationPrice);
			break;
		}
		
		case "DISPO": {
			// Dispo: duration × ratePerHour + overage
			const hours = service.durationHours ?? (durationMinutes / 60);
			const includedKmPerHour = settings.dispoIncludedKmPerHour ?? 50;
			const overageRatePerKm = settings.dispoOverageRatePerKm ?? 0.50;
			
			const basePrice = hours * vehicleCategoryRatePerHour;
			const includedKm = hours * includedKmPerHour;
			const overageKm = Math.max(0, distanceKm - includedKm);
			const overageAmount = overageKm * overageRatePerKm;
			
			serviceCost = basePrice + overageAmount;
			break;
		}
		
		case "EXCURSION": {
			// Excursion: duration × ratePerHour + surcharge
			const hours = durationMinutes / 60;
			const minimumHours = settings.excursionMinimumHours ?? 4;
			const surchargePercent = settings.excursionSurchargePercent ?? 15;
			
			const effectiveHours = Math.max(hours, minimumHours);
			const basePrice = effectiveHours * vehicleCategoryRatePerHour;
			const surchargeAmount = basePrice * (surchargePercent / 100);
			
			serviceCost = basePrice + surchargeAmount;
			break;
		}
	}
	
	// Calculate internal cost
	const fuelConsumption = settings.fuelConsumptionL100km ?? 7.5;
	const fuelPrice = settings.fuelPricePerLiter ?? 1.80;
	const tollRate = settings.tollCostPerKm ?? 0.12;
	const wearRate = settings.wearCostPerKm ?? 0.08;
	const driverRate = settings.driverHourlyCost ?? 30;
	
	const fuelCost = (distanceKm / 100) * fuelConsumption * fuelPrice;
	const tollCost = distanceKm * tollRate;
	const wearCost = distanceKm * wearRate;
	const driverCost = (durationMinutes / 60) * driverRate;
	
	serviceInternalCost = fuelCost + tollCost + wearCost + driverCost;
	
	// Round values
	serviceCost = Math.round(serviceCost * 100) / 100;
	serviceInternalCost = Math.round(serviceInternalCost * 100) / 100;
	
	return {
		serviceOrder,
		serviceType: service.serviceType,
		serviceCost,
		serviceInternalCost,
		distanceKm: Math.round(distanceKm * 100) / 100,
		durationMinutes: Math.round(durationMinutes),
		tripAnalysis: {
			costBreakdown: {
				fuel: {
					amount: Math.round(fuelCost * 100) / 100,
					distanceKm,
					consumptionL100km: fuelConsumption,
					pricePerLiter: fuelPrice,
					fuelType: "DIESEL",
				},
				tolls: {
					amount: Math.round(tollCost * 100) / 100,
					distanceKm,
					ratePerKm: tollRate,
					source: "ESTIMATE",
				},
				wear: {
					amount: Math.round(wearCost * 100) / 100,
					distanceKm,
					ratePerKm: wearRate,
				},
				driver: {
					amount: Math.round(driverCost * 100) / 100,
					durationMinutes,
					hourlyRate: driverRate,
				},
				parking: {
					amount: 0,
					description: "Included in stay",
				},
				total: serviceInternalCost,
			} as CostBreakdown,
		},
	};
}

/**
 * Calculate pricing for a single day within a stay
 */
export function calculateStayDayPricing(
	day: StayDayInput,
	dayNumber: number,
	settings: OrganizationPricingSettings,
	vehicleCategoryRatePerKm: number,
	vehicleCategoryRatePerHour: number,
): StayDayPricingResult {
	// Calculate staffing costs from staffingCostParameters
	const staffingParams = settings.staffingCostParameters;
	const hotelCostPerNight = staffingParams?.hotelCostPerNight ?? 120;
	const mealCostPerMeal = staffingParams?.mealAllowancePerDay ? staffingParams.mealAllowancePerDay / 2 : 25; // Assume 2 meals per day
	const driverOvernightPremium = staffingParams?.driverOvernightPremium ?? 50;
	
	const hotelRequired = day.hotelRequired ?? false;
	const mealCount = day.mealCount ?? 0;
	const driverCount = day.driverCount ?? 1;
	
	const hotelCost = hotelRequired ? hotelCostPerNight * driverCount : 0;
	const mealCost = mealCount * mealCostPerMeal * driverCount;
	const driverOvernightCost = hotelRequired ? driverOvernightPremium * driverCount : 0;
	
	// Calculate service costs
	const services: StayServicePricingResult[] = day.services.map((service, index) =>
		calculateStayServicePricing(
			service,
			index + 1,
			settings,
			vehicleCategoryRatePerKm,
			vehicleCategoryRatePerHour,
		)
	);
	
	const totalServicesCost = services.reduce((sum, s) => sum + s.serviceCost, 0);
	const totalServicesInternalCost = services.reduce((sum, s) => sum + s.serviceInternalCost, 0);
	
	// Day totals
	const staffingCost = hotelCost + mealCost + driverOvernightCost;
	const dayTotalCost = totalServicesCost + staffingCost;
	const dayTotalInternalCost = totalServicesInternalCost + staffingCost;
	
	return {
		dayNumber,
		date: day.date,
		hotelRequired,
		hotelCost: Math.round(hotelCost * 100) / 100,
		mealCount,
		mealCost: Math.round(mealCost * 100) / 100,
		driverCount,
		driverOvernightCost: Math.round(driverOvernightCost * 100) / 100,
		dayTotalCost: Math.round(dayTotalCost * 100) / 100,
		dayTotalInternalCost: Math.round(dayTotalInternalCost * 100) / 100,
		services,
	};
}

/**
 * Calculate complete pricing for a STAY quote
 */
export function calculateStayPricing(
	input: StayPricingInput,
	settings: OrganizationPricingSettings,
	vehicleCategoryRatePerKm: number,
	vehicleCategoryRatePerHour: number,
): StayPricingResult {
	// Sort days by date
	const sortedDays = [...input.stayDays].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);
	
	// Calculate pricing for each day
	const days: StayDayPricingResult[] = sortedDays.map((day, index) =>
		calculateStayDayPricing(
			day,
			index + 1,
			settings,
			vehicleCategoryRatePerKm,
			vehicleCategoryRatePerHour,
		)
	);
	
	// Calculate totals
	const totalServicesCost = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.serviceCost, 0),
		0
	);
	const totalServicesInternalCost = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.serviceInternalCost, 0),
		0
	);
	
	const totalHotelCost = days.reduce((sum, d) => sum + d.hotelCost, 0);
	const totalMealCost = days.reduce((sum, d) => sum + d.mealCost, 0);
	const totalDriverPremium = days.reduce((sum, d) => sum + d.driverOvernightCost, 0);
	const totalStaffingCost = totalHotelCost + totalMealCost + totalDriverPremium;
	
	const totalCost = totalServicesCost + totalStaffingCost;
	const totalInternalCost = totalServicesInternalCost + totalStaffingCost;
	
	// Calculate margin
	const margin = totalCost - totalInternalCost;
	const marginPercent = totalCost > 0 ? (margin / totalCost) * 100 : 0;
	
	// Calculate aggregate stats
	const totalServices = days.reduce((sum, d) => sum + d.services.length, 0);
	const totalHotelNights = days.filter(d => d.hotelRequired).length;
	const totalMeals = days.reduce((sum, d) => sum + d.mealCount, 0);
	const totalDistanceKm = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.distanceKm, 0),
		0
	);
	const totalDurationMinutes = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.durationMinutes, 0),
		0
	);
	
	return {
		stayStartDate: sortedDays[0]?.date ?? "",
		stayEndDate: sortedDays[sortedDays.length - 1]?.date ?? "",
		totalDays: days.length,
		totalServicesCost: Math.round(totalServicesCost * 100) / 100,
		totalStaffingCost: Math.round(totalStaffingCost * 100) / 100,
		totalCost: Math.round(totalCost * 100) / 100,
		totalInternalCost: Math.round(totalInternalCost * 100) / 100,
		marginPercent: Math.round(marginPercent * 100) / 100,
		days,
		tripAnalysis: {
			stayBreakdown: {
				totalDays: days.length,
				totalServices,
				totalHotelNights,
				totalMeals,
				totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
				totalDurationMinutes: Math.round(totalDurationMinutes),
			},
			costBreakdown: {
				services: Math.round(totalServicesCost * 100) / 100,
				hotels: Math.round(totalHotelCost * 100) / 100,
				meals: Math.round(totalMealCost * 100) / 100,
				driverPremiums: Math.round(totalDriverPremium * 100) / 100,
				total: Math.round(totalCost * 100) / 100,
			},
		},
	};
}

// ============================================================================
// Enhanced Types (Story 22.7)
// ============================================================================

export interface EnhancedStayServicePricingResult extends StayServicePricingResult {
	zoneMultiplier?: number;
	seasonalMultiplier?: number;
	categoryMultiplier?: number;
	appliedRules: AppliedRule[];
	tollSource?: "ESTIMATE" | "GOOGLE_ROUTES_API";
	basePriceBeforeMultipliers?: number;
}

export interface EnhancedStayDayPricingResult extends StayDayPricingResult {
	seasonalMultiplier?: number;
	services: EnhancedStayServicePricingResult[];
	appliedRules: AppliedRule[];
}

export interface EnhancedStayPricingResult extends StayPricingResult {
	appliedRules: AppliedRule[];
	vehicleCategoryMultiplier?: number;
	days: EnhancedStayDayPricingResult[];
	tripAnalysis: StayPricingResult["tripAnalysis"] & {
		appliedRules: AppliedRule[];
		vehicleCategoryMultiplier?: number;
	};
}

export interface EnhancedStayPricingOptions {
	pickupZones?: Map<string, ZoneData | null>; // serviceId -> zone
	dropoffZones?: Map<string, ZoneData | null>; // serviceId -> zone
	seasonalMultipliers?: SeasonalMultiplierData[];
	advancedRates?: AdvancedRateData[];
	vehicleCategoryMultiplier?: number;
	zoneMultiplierAggregationStrategy?: "MAX" | "PICKUP_ONLY" | "DROPOFF_ONLY" | "AVERAGE";
}

// ============================================================================
// Enhanced Pricing Functions (Story 22.7)
// ============================================================================

/**
 * Story 22.7: Calculate enhanced pricing for a single service with zones and multipliers
 */
export function calculateEnhancedStayServicePricing(
	service: StayServiceInput,
	serviceOrder: number,
	serviceId: string,
	settings: OrganizationPricingSettings,
	vehicleCategoryRatePerKm: number,
	vehicleCategoryRatePerHour: number,
	options: EnhancedStayPricingOptions,
): EnhancedStayServicePricingResult {
	const distanceKm = service.distanceKm ?? 0;
	const durationMinutes = service.durationMinutes ?? 0;
	const appliedRules: AppliedRule[] = [];
	
	let serviceCost = 0;
	let serviceInternalCost = 0;
	
	// Calculate base price using trip-type-pricing functions
	switch (service.serviceType) {
		case "TRANSFER": {
			// Transfer: max(distance × ratePerKm, duration × ratePerHour)
			const distancePrice = distanceKm * vehicleCategoryRatePerKm;
			const durationPrice = (durationMinutes / 60) * vehicleCategoryRatePerHour;
			serviceCost = Math.max(distancePrice, durationPrice);
			
			appliedRules.push({
				type: "TRIP_TYPE",
				tripType: "transfer",
				description: `Transfer pricing: max(${Math.round(distanceKm)}km × ${vehicleCategoryRatePerKm}€/km, ${Math.round(durationMinutes)}min × ${vehicleCategoryRatePerHour}€/h)`,
				distancePrice: Math.round(distancePrice * 100) / 100,
				durationPrice: Math.round(durationPrice * 100) / 100,
				selectedMethod: distancePrice >= durationPrice ? "distance" : "duration",
				priceAfterAdjustment: Math.round(serviceCost * 100) / 100,
			});
			break;
		}
		
		case "DISPO": {
			// Use existing smart dispo pricing
			const hours = service.durationHours ?? (durationMinutes / 60);
			const dispoResult = calculateSmartDispoPrice(
				hours * 60, // Convert back to minutes
				distanceKm,
				settings.organizationId ?? "",
				vehicleCategoryRatePerHour,
				settings,
			);
			serviceCost = dispoResult.price;
			if (dispoResult.rule) {
				appliedRules.push(dispoResult.rule as AppliedRule);
			}
			break;
		}
		
		case "EXCURSION": {
			// Use existing excursion pricing
			const excursionResult = calculateExcursionPrice(
				durationMinutes,
				vehicleCategoryRatePerHour,
				settings,
			);
			serviceCost = excursionResult.price;
			if (excursionResult.rule) {
				appliedRules.push(excursionResult.rule as AppliedRule);
			}
			break;
		}
	}
	
	const basePriceBeforeMultipliers = serviceCost;
	
	// Apply zone multiplier if zones are provided
	let zoneMultiplier: number | undefined;
	const pickupZone = options.pickupZones?.get(serviceId);
	const dropoffZone = options.dropoffZones?.get(serviceId);
	
	if (pickupZone || dropoffZone) {
		const zoneResult = applyZoneMultiplier(
			serviceCost,
			pickupZone ?? null,
			dropoffZone ?? null,
			options.zoneMultiplierAggregationStrategy ?? null,
		);
		
		if (zoneResult.appliedMultiplier !== 1.0) {
			serviceCost = zoneResult.adjustedPrice;
			zoneMultiplier = zoneResult.appliedMultiplier;
			appliedRules.push(zoneResult.appliedRule);
		}
	}
	
	// Apply seasonal multiplier if applicable
	let seasonalMultiplier: number | undefined;
	if (options.seasonalMultipliers && options.seasonalMultipliers.length > 0) {
		const pickupDate = new Date(service.pickupAt);
		const seasonalResult = evaluateSeasonalMultipliers(
			serviceCost,
			pickupDate,
			options.seasonalMultipliers,
		);
		
		if (seasonalResult.appliedRules.length > 0) {
			serviceCost = seasonalResult.adjustedPrice;
			// Get the effective multiplier from the last applied rule
			const lastRule = seasonalResult.appliedRules[seasonalResult.appliedRules.length - 1];
			seasonalMultiplier = lastRule?.adjustmentValue as number;
			appliedRules.push(...(seasonalResult.appliedRules as AppliedRule[]));
		}
	}
	
	// Apply advanced rates (night/weekend) if applicable
	if (options.advancedRates && options.advancedRates.length > 0) {
		const pickupDate = new Date(service.pickupAt);
		const estimatedEndAt = new Date(pickupDate.getTime() + durationMinutes * 60000);
		
		const context: MultiplierContext = {
			pickupAt: pickupDate,
			estimatedEndAt,
			distanceKm,
			pickupZoneId: pickupZone?.id ?? null,
			dropoffZoneId: dropoffZone?.id ?? null,
		};
		
		const advancedResult = evaluateAdvancedRates(
			serviceCost,
			context,
			options.advancedRates,
		);
		
		if (advancedResult.appliedRules.length > 0) {
			serviceCost = advancedResult.adjustedPrice;
			appliedRules.push(...(advancedResult.appliedRules as AppliedRule[]));
		}
	}
	
	// Apply vehicle category multiplier if provided
	let categoryMultiplier: number | undefined;
	if (options.vehicleCategoryMultiplier && options.vehicleCategoryMultiplier !== 1.0) {
		const priceBefore = serviceCost;
		serviceCost = Math.round(serviceCost * options.vehicleCategoryMultiplier * 100) / 100;
		categoryMultiplier = options.vehicleCategoryMultiplier;
		
		appliedRules.push({
			type: "VEHICLE_CATEGORY_MULTIPLIER",
			description: `Vehicle category multiplier: ${categoryMultiplier}×`,
			multiplier: categoryMultiplier,
			priceBefore,
			priceAfter: serviceCost,
		});
	}
	
	// Calculate internal cost using cost-calculator functions
	const fuelConsumption = settings.fuelConsumptionL100km ?? 7.5;
	const fuelPrice = settings.fuelPricePerLiter ?? 1.80;
	const tollRate = settings.tollCostPerKm ?? 0.12;
	const wearRate = settings.wearCostPerKm ?? 0.08;
	const driverRate = settings.driverHourlyCost ?? 30;
	
	const fuelCostComponent = calculateFuelCost(distanceKm, fuelConsumption, "DIESEL", { DIESEL: fuelPrice });
	const tollCostComponent = calculateTollCost(distanceKm, tollRate);
	const wearCostComponent = calculateWearCost(distanceKm, wearRate);
	const driverCostComponent = calculateDriverCost(durationMinutes, driverRate);
	
	serviceInternalCost = fuelCostComponent.amount + tollCostComponent.amount + wearCostComponent.amount + driverCostComponent.amount;
	
	// Round values
	serviceCost = Math.round(serviceCost * 100) / 100;
	serviceInternalCost = Math.round(serviceInternalCost * 100) / 100;
	
	return {
		serviceOrder,
		serviceType: service.serviceType,
		serviceCost,
		serviceInternalCost,
		distanceKm: Math.round(distanceKm * 100) / 100,
		durationMinutes: Math.round(durationMinutes),
		zoneMultiplier,
		seasonalMultiplier,
		categoryMultiplier,
		basePriceBeforeMultipliers: Math.round(basePriceBeforeMultipliers * 100) / 100,
		appliedRules,
		tollSource: "ESTIMATE",
		tripAnalysis: {
			costBreakdown: {
				fuel: fuelCostComponent,
				tolls: {
					...tollCostComponent,
					source: "ESTIMATE" as const,
				},
				wear: wearCostComponent,
				driver: driverCostComponent,
				parking: {
					amount: 0,
					description: "Included in stay",
				},
				total: serviceInternalCost,
			} as CostBreakdown,
		},
	};
}

/**
 * Story 22.7: Calculate enhanced pricing for a single day with multipliers
 */
export function calculateEnhancedStayDayPricing(
	day: StayDayInput,
	dayNumber: number,
	settings: OrganizationPricingSettings,
	vehicleCategoryRatePerKm: number,
	vehicleCategoryRatePerHour: number,
	options: EnhancedStayPricingOptions,
): EnhancedStayDayPricingResult {
	const appliedRules: AppliedRule[] = [];
	
	// Calculate staffing costs from staffingCostParameters
	const staffingParams = settings.staffingCostParameters;
	const hotelCostPerNight = staffingParams?.hotelCostPerNight ?? 120;
	const mealCostPerMeal = staffingParams?.mealAllowancePerDay ? staffingParams.mealAllowancePerDay / 2 : 25;
	const driverOvernightPremium = staffingParams?.driverOvernightPremium ?? 50;
	
	const hotelRequired = day.hotelRequired ?? false;
	const mealCount = day.mealCount ?? 0;
	const driverCount = day.driverCount ?? 1;
	
	const hotelCost = hotelRequired ? hotelCostPerNight * driverCount : 0;
	const mealCost = mealCount * mealCostPerMeal * driverCount;
	const driverOvernightCost = hotelRequired ? driverOvernightPremium * driverCount : 0;
	
	// Calculate service costs with enhanced pricing
	const services: EnhancedStayServicePricingResult[] = day.services.map((service, index) => {
		const serviceId = `${day.date}-${index}`;
		return calculateEnhancedStayServicePricing(
			service,
			index + 1,
			serviceId,
			settings,
			vehicleCategoryRatePerKm,
			vehicleCategoryRatePerHour,
			options,
		);
	});
	
	// Collect all service rules
	for (const service of services) {
		appliedRules.push(...service.appliedRules);
	}
	
	const totalServicesCost = services.reduce((sum, s) => sum + s.serviceCost, 0);
	const totalServicesInternalCost = services.reduce((sum, s) => sum + s.serviceInternalCost, 0);
	
	// Day totals
	const staffingCost = hotelCost + mealCost + driverOvernightCost;
	const dayTotalCost = totalServicesCost + staffingCost;
	const dayTotalInternalCost = totalServicesInternalCost + staffingCost;
	
	// Add staffing rule if applicable
	if (staffingCost > 0) {
		appliedRules.push({
			type: "STAFFING_COST",
			description: `Day ${dayNumber} staffing: ${hotelRequired ? `Hotel (${hotelCost}€)` : "No hotel"}, ${mealCount} meals (${mealCost}€), ${driverCount} driver(s)`,
			hotelCost,
			mealCost,
			driverOvernightCost,
			driverCount,
			totalStaffingCost: staffingCost,
		});
	}
	
	return {
		dayNumber,
		date: day.date,
		hotelRequired,
		hotelCost: Math.round(hotelCost * 100) / 100,
		mealCount,
		mealCost: Math.round(mealCost * 100) / 100,
		driverCount,
		driverOvernightCost: Math.round(driverOvernightCost * 100) / 100,
		dayTotalCost: Math.round(dayTotalCost * 100) / 100,
		dayTotalInternalCost: Math.round(dayTotalInternalCost * 100) / 100,
		services,
		appliedRules,
	};
}

/**
 * Story 22.7: Calculate complete enhanced pricing for a STAY quote
 */
export function calculateEnhancedStayPricing(
	input: StayPricingInput,
	settings: OrganizationPricingSettings,
	vehicleCategoryRatePerKm: number,
	vehicleCategoryRatePerHour: number,
	options: EnhancedStayPricingOptions = {},
): EnhancedStayPricingResult {
	const allAppliedRules: AppliedRule[] = [];
	
	// Sort days by date
	const sortedDays = [...input.stayDays].sort(
		(a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
	);
	
	// Calculate pricing for each day
	const days: EnhancedStayDayPricingResult[] = sortedDays.map((day, index) =>
		calculateEnhancedStayDayPricing(
			day,
			index + 1,
			settings,
			vehicleCategoryRatePerKm,
			vehicleCategoryRatePerHour,
			options,
		)
	);
	
	// Collect all rules from days
	for (const day of days) {
		allAppliedRules.push(...day.appliedRules);
	}
	
	// Calculate totals
	const totalServicesCost = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.serviceCost, 0),
		0
	);
	const totalServicesInternalCost = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.serviceInternalCost, 0),
		0
	);
	
	const totalHotelCost = days.reduce((sum, d) => sum + d.hotelCost, 0);
	const totalMealCost = days.reduce((sum, d) => sum + d.mealCost, 0);
	const totalDriverPremium = days.reduce((sum, d) => sum + d.driverOvernightCost, 0);
	const totalStaffingCost = totalHotelCost + totalMealCost + totalDriverPremium;
	
	const totalCost = totalServicesCost + totalStaffingCost;
	const totalInternalCost = totalServicesInternalCost + totalStaffingCost;
	
	// Calculate margin
	const margin = totalCost - totalInternalCost;
	const marginPercent = totalCost > 0 ? (margin / totalCost) * 100 : 0;
	
	// Calculate aggregate stats
	const totalServices = days.reduce((sum, d) => sum + d.services.length, 0);
	const totalHotelNights = days.filter(d => d.hotelRequired).length;
	const totalMeals = days.reduce((sum, d) => sum + d.mealCount, 0);
	const totalDistanceKm = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.distanceKm, 0),
		0
	);
	const totalDurationMinutes = days.reduce(
		(sum, d) => sum + d.services.reduce((s, svc) => s + svc.durationMinutes, 0),
		0
	);
	
	return {
		stayStartDate: sortedDays[0]?.date ?? "",
		stayEndDate: sortedDays[sortedDays.length - 1]?.date ?? "",
		totalDays: days.length,
		totalServicesCost: Math.round(totalServicesCost * 100) / 100,
		totalStaffingCost: Math.round(totalStaffingCost * 100) / 100,
		totalCost: Math.round(totalCost * 100) / 100,
		totalInternalCost: Math.round(totalInternalCost * 100) / 100,
		marginPercent: Math.round(marginPercent * 100) / 100,
		vehicleCategoryMultiplier: options.vehicleCategoryMultiplier,
		appliedRules: allAppliedRules,
		days,
		tripAnalysis: {
			stayBreakdown: {
				totalDays: days.length,
				totalServices,
				totalHotelNights,
				totalMeals,
				totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
				totalDurationMinutes: Math.round(totalDurationMinutes),
			},
			costBreakdown: {
				services: Math.round(totalServicesCost * 100) / 100,
				hotels: Math.round(totalHotelCost * 100) / 100,
				meals: Math.round(totalMealCost * 100) / 100,
				driverPremiums: Math.round(totalDriverPremium * 100) / 100,
				total: Math.round(totalCost * 100) / 100,
			},
			appliedRules: allAppliedRules,
			vehicleCategoryMultiplier: options.vehicleCategoryMultiplier,
		},
	};
}
