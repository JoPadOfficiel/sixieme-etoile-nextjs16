/**
 * Trip Type Pricing Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * 
 * This module handles trip type specific pricing:
 * - Transfer pricing
 * - Excursion pricing (with minimum duration and surcharge)
 * - Dispo/MAD pricing (with time buckets and overage)
 * - Excursion return trip cost calculation
 */

import type {
	TripType,
	OrganizationPricingSettings,
	TripTypePricingResult,
	AppliedTripTypeRule,
	TripAnalysis,
	ExcursionReturnCostResult,
	AppliedExcursionReturnTripRule,
	ExcursionReturnSource,
	MadTimeBucketData,
	ExcursionLeg,
	ExcursionCalculationInput,
	CostBreakdown,
} from "./types";

// ============================================================================
// Excursion Pricing
// ============================================================================

/**
 * Story 15.5: Calculate excursion price with minimum duration and surcharge
 * 
 * Excursion pricing logic:
 * 1. Apply minimum duration (default 4h)
 * 2. Calculate base price: effectiveDuration × ratePerHour
 * 3. Apply surcharge percentage (default 15%)
 */
export function calculateExcursionPrice(
	durationMinutes: number,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	const minimumHours = settings.excursionMinimumHours ?? 4;
	const surchargePercent = settings.excursionSurchargePercent ?? 15;

	const requestedHours = durationMinutes / 60;
	const effectiveHours = Math.max(requestedHours, minimumHours);
	const minimumApplied = effectiveHours > requestedHours;

	const basePrice = Math.round(effectiveHours * ratePerHour * 100) / 100;
	const surchargeAmount = Math.round(basePrice * surchargePercent / 100 * 100) / 100;
	const price = Math.round((basePrice + surchargeAmount) * 100) / 100;

	const rule: AppliedTripTypeRule = {
		type: "TRIP_TYPE",
		tripType: "excursion",
		description: `Excursion pricing: ${effectiveHours}h × ${ratePerHour}€/h + ${surchargePercent}% surcharge${minimumApplied ? ` (minimum ${minimumHours}h applied)` : ""}`,
		minimumApplied,
		requestedHours: Math.round(requestedHours * 100) / 100,
		effectiveHours,
		surchargePercent,
		surchargeAmount,
		basePriceBeforeAdjustment: basePrice,
		priceAfterAdjustment: price,
	};

	return { price, rule };
}

/**
 * Story 19.3: Calculate excursion return trip cost
 * 
 * For excursions, the vehicle must return to base after the service.
 * This function calculates the cost of that return trip and adds it to the price.
 */
export function calculateExcursionReturnCost(
	tripAnalysis: TripAnalysis,
	settings: OrganizationPricingSettings,
	serviceDistanceKm: number,
): ExcursionReturnCostResult {
	const returnSegment = tripAnalysis.segments.return;
	
	let returnDistanceKm: number;
	let returnDurationMinutes: number;
	let returnSource: ExcursionReturnSource;
	
	if (returnSegment && returnSegment.distanceKm > 0) {
		returnDistanceKm = returnSegment.distanceKm;
		returnDurationMinutes = returnSegment.durationMinutes;
		returnSource = "SHADOW_CALCULATION";
	} else {
		returnDistanceKm = serviceDistanceKm;
		returnDurationMinutes = (serviceDistanceKm / 50) * 60;
		returnSource = "SYMMETRIC_ESTIMATE";
	}
	
	const fuelConsumption = settings.fuelConsumptionL100km ?? 7.5;
	const fuelPrice = settings.fuelPricePerLiter ?? 1.80;
	const driverHourlyRate = settings.driverHourlyCost ?? 25;
	
	const fuelCost = Math.round((returnDistanceKm / 100) * fuelConsumption * fuelPrice * 100) / 100;
	const driverCost = Math.round((returnDurationMinutes / 60) * driverHourlyRate * 100) / 100;
	const returnCost = Math.round((fuelCost + driverCost) * 100) / 100;
	
	const appliedRule: AppliedExcursionReturnTripRule = {
		type: "EXCURSION_RETURN_TRIP",
		description: `Return trip cost: ${Math.round(returnDistanceKm)}km, ${Math.round(returnDurationMinutes)}min = ${returnCost}€ (${returnSource === "SHADOW_CALCULATION" ? "from vehicle base" : "symmetric estimate"})`,
		returnDistanceKm: Math.round(returnDistanceKm * 100) / 100,
		returnDurationMinutes: Math.round(returnDurationMinutes * 100) / 100,
		returnCost,
		returnSource,
		costBreakdown: {
			fuel: fuelCost,
			driver: driverCost,
		},
		addedToPrice: returnCost,
	};
	
	return {
		returnDistanceKm: Math.round(returnDistanceKm * 100) / 100,
		returnDurationMinutes: Math.round(returnDurationMinutes * 100) / 100,
		returnCost,
		returnSource,
		appliedRule,
	};
}

// ============================================================================
// Dispo/MAD Pricing
// ============================================================================

/**
 * Story 15.5: Calculate dispo price with overage
 * 
 * Dispo pricing logic:
 * 1. Calculate base price: duration × ratePerHour
 * 2. Calculate included km: duration × includedKmPerHour
 * 3. Calculate overage: max(0, actualKm - includedKm) × overageRatePerKm
 * 4. Total = basePrice + overageAmount
 */
export function calculateDispoPrice(
	durationMinutes: number,
	distanceKm: number,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	const includedKmPerHour = settings.dispoIncludedKmPerHour ?? 50;
	const overageRatePerKm = settings.dispoOverageRatePerKm ?? 0.50;

	const hours = durationMinutes / 60;
	const basePrice = Math.round(hours * ratePerHour * 100) / 100;

	const includedKm = Math.round(hours * includedKmPerHour * 100) / 100;
	const overageKm = Math.max(0, Math.round((distanceKm - includedKm) * 100) / 100);
	const overageAmount = Math.round(overageKm * overageRatePerKm * 100) / 100;
	const price = Math.round((basePrice + overageAmount) * 100) / 100;

	const rule: AppliedTripTypeRule = {
		type: "TRIP_TYPE",
		tripType: "dispo",
		description: `Dispo pricing: ${hours}h × ${ratePerHour}€/h${overageKm > 0 ? ` + ${overageKm}km overage × ${overageRatePerKm}€/km` : ""}`,
		includedKm,
		actualKm: distanceKm,
		overageKm,
		overageRatePerKm,
		overageAmount,
		requestedDurationHours: Math.round(hours * 100) / 100,
		basePriceBeforeAdjustment: basePrice,
		priceAfterAdjustment: price,
	};

	return { price, rule };
}

/**
 * Story 17.9: Calculate dispo price using time buckets with interpolation
 */
export function calculateDispoPriceWithBuckets(
	durationMinutes: number,
	distanceKm: number,
	vehicleCategoryId: string,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	const buckets = settings.madTimeBuckets ?? [];
	const strategy = settings.timeBucketInterpolationStrategy ?? "ROUND_UP";
	const includedKmPerHour = settings.dispoIncludedKmPerHour ?? 50;
	const overageRatePerKm = settings.dispoOverageRatePerKm ?? 0.50;

	const applicableBuckets = buckets
		.filter(b => b.isActive && b.vehicleCategoryId === vehicleCategoryId)
		.sort((a, b) => a.durationHours - b.durationHours);

	const hours = durationMinutes / 60;

	if (applicableBuckets.length === 0) {
		return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);
	}

	const minBucket = applicableBuckets[0];
	const maxBucket = applicableBuckets[applicableBuckets.length - 1];

	let bucketPrice: number;
	let description: string;
	let timeBucketUsed: { durationHours: number; price: number } | undefined;
	let lowerBucket: { durationHours: number; price: number } | undefined;
	let upperBucket: { durationHours: number; price: number } | undefined;
	let extraHoursCharged = 0;
	let extraHoursAmount = 0;

	if (hours < minBucket.durationHours) {
		return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);
	}

	if (hours > maxBucket.durationHours) {
		bucketPrice = maxBucket.price;
		extraHoursCharged = Math.round((hours - maxBucket.durationHours) * 100) / 100;
		extraHoursAmount = Math.round(extraHoursCharged * ratePerHour * 100) / 100;
		timeBucketUsed = { durationHours: maxBucket.durationHours, price: maxBucket.price };
		description = `Time bucket: ${maxBucket.durationHours}h bucket (${maxBucket.price}€) + ${extraHoursCharged}h extra × ${ratePerHour}€/h`;
	} else {
		const exactMatch = applicableBuckets.find(b => b.durationHours === Math.floor(hours) || b.durationHours === Math.ceil(hours));
		
		if (exactMatch && Math.abs(exactMatch.durationHours - hours) < 0.01) {
			bucketPrice = exactMatch.price;
			timeBucketUsed = { durationHours: exactMatch.durationHours, price: exactMatch.price };
			description = `Time bucket: ${exactMatch.durationHours}h bucket (${exactMatch.price}€)`;
		} else {
			let lower: MadTimeBucketData | undefined;
			let upper: MadTimeBucketData | undefined;

			for (let i = 0; i < applicableBuckets.length - 1; i++) {
				if (applicableBuckets[i].durationHours <= hours && applicableBuckets[i + 1].durationHours >= hours) {
					lower = applicableBuckets[i];
					upper = applicableBuckets[i + 1];
					break;
				}
			}

			if (!lower || !upper) {
				const closest = applicableBuckets.reduce((prev, curr) =>
					Math.abs(curr.durationHours - hours) < Math.abs(prev.durationHours - hours) ? curr : prev
				);
				bucketPrice = closest.price;
				timeBucketUsed = { durationHours: closest.durationHours, price: closest.price };
				description = `Time bucket: ${closest.durationHours}h bucket (${closest.price}€) [closest match]`;
			} else {
				lowerBucket = { durationHours: lower.durationHours, price: lower.price };
				upperBucket = { durationHours: upper.durationHours, price: upper.price };

				switch (strategy) {
					case "ROUND_UP":
						bucketPrice = upper.price;
						timeBucketUsed = { durationHours: upper.durationHours, price: upper.price };
						description = `Time bucket: ${hours}h → ${upper.durationHours}h bucket (${upper.price}€) [ROUND_UP]`;
						break;

					case "ROUND_DOWN":
						bucketPrice = lower.price;
						timeBucketUsed = { durationHours: lower.durationHours, price: lower.price };
						description = `Time bucket: ${hours}h → ${lower.durationHours}h bucket (${lower.price}€) [ROUND_DOWN]`;
						break;

					case "PROPORTIONAL":
					default:
						const ratio = (hours - lower.durationHours) / (upper.durationHours - lower.durationHours);
						bucketPrice = Math.round((lower.price + ratio * (upper.price - lower.price)) * 100) / 100;
						description = `Time bucket: ${hours}h interpolated between ${lower.durationHours}h (${lower.price}€) and ${upper.durationHours}h (${upper.price}€) = ${bucketPrice}€ [PROPORTIONAL]`;
						break;
				}
			}
		}
	}

	const includedKm = Math.round(hours * includedKmPerHour * 100) / 100;
	const overageKm = Math.max(0, Math.round((distanceKm - includedKm) * 100) / 100);
	const overageAmount = Math.round(overageKm * overageRatePerKm * 100) / 100;

	const totalPrice = Math.round((bucketPrice + extraHoursAmount + overageAmount) * 100) / 100;

	if (overageKm > 0) {
		description += ` + ${overageKm}km overage × ${overageRatePerKm}€/km`;
	}

	const rule: AppliedTripTypeRule = {
		type: "TIME_BUCKET",
		tripType: "dispo",
		description,
		includedKm,
		actualKm: distanceKm,
		overageKm,
		overageRatePerKm,
		overageAmount,
		timeBucketUsed,
		interpolationStrategy: strategy,
		lowerBucket,
		upperBucket,
		bucketPrice,
		extraHoursCharged: extraHoursCharged > 0 ? extraHoursCharged : undefined,
		extraHoursAmount: extraHoursAmount > 0 ? extraHoursAmount : undefined,
		basePriceBeforeAdjustment: bucketPrice + extraHoursAmount,
		priceAfterAdjustment: totalPrice,
	};

	return { price: totalPrice, rule };
}

/**
 * Story 17.9: Smart dispo pricing - uses buckets if configured, otherwise hourly
 */
export function calculateSmartDispoPrice(
	durationMinutes: number,
	distanceKm: number,
	vehicleCategoryId: string,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	const buckets = settings.madTimeBuckets ?? [];
	const hasBucketsForCategory = buckets.some(
		b => b.isActive && b.vehicleCategoryId === vehicleCategoryId
	);

	if (hasBucketsForCategory && settings.timeBucketInterpolationStrategy) {
		return calculateDispoPriceWithBuckets(
			durationMinutes,
			distanceKm,
			vehicleCategoryId,
			ratePerHour,
			settings,
		);
	}

	return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);
}

// ============================================================================
// Trip Type Pricing Application
// ============================================================================

/**
 * Story 15.5: Apply trip type specific pricing
 * Story 17.9: Updated to use smart dispo pricing with bucket support
 */
export function applyTripTypePricing(
	tripType: TripType,
	distanceKm: number,
	durationMinutes: number,
	ratePerHour: number,
	standardBasePrice: number,
	settings: OrganizationPricingSettings,
	vehicleCategoryId?: string,
): TripTypePricingResult {
	switch (tripType) {
		case "excursion":
			return calculateExcursionPrice(durationMinutes, ratePerHour, settings);

		case "dispo":
			if (vehicleCategoryId) {
				return calculateSmartDispoPrice(
					durationMinutes,
					distanceKm,
					vehicleCategoryId,
					ratePerHour,
					settings,
				);
			}
			return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);

		case "transfer":
		default:
			return { price: standardBasePrice, rule: null };
	}
}

// ============================================================================
// Excursion Multi-Stop Calculation
// ============================================================================

/**
 * Story 16.7: Calculate cost for a single excursion leg
 */
function calculateLegCost(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): ExcursionLeg["cost"] {
	const fuelConsumption = settings.fuelConsumptionL100km ?? 7.5;
	const fuelPrice = settings.fuelPricePerLiter ?? 1.80;
	const tollRate = settings.tollCostPerKm ?? 0.12;
	const wearRate = settings.wearCostPerKm ?? 0.08;
	const driverRate = settings.driverHourlyCost ?? 30;
	
	const fuel = Math.round(
		distanceKm * (fuelConsumption / 100) * fuelPrice * 100
	) / 100;
	
	const tolls = Math.round(distanceKm * tollRate * 100) / 100;
	const wear = Math.round(distanceKm * wearRate * 100) / 100;
	
	const driver = Math.round(
		(durationMinutes / 60) * driverRate * 100
	) / 100;
	
	const total = Math.round((fuel + tolls + wear + driver) * 100) / 100;
	
	return { fuel, tolls, wear, driver, total };
}

/**
 * Story 16.7: Calculate excursion legs from pickup, stops, and dropoff
 */
export function calculateExcursionLegs(
	input: ExcursionCalculationInput,
	legDistances: number[],
	legDurations: number[],
	settings: OrganizationPricingSettings,
): ExcursionLeg[] {
	const sortedStops = [...input.stops].sort((a, b) => a.order - b.order);
	
	const waypoints: Array<{
		address: string;
		lat: number;
		lng: number;
	}> = [
		{ address: input.pickup.address ?? "Pickup", lat: input.pickup.lat, lng: input.pickup.lng },
		...sortedStops.map(s => ({ address: s.address, lat: s.latitude, lng: s.longitude })),
		{ address: input.dropoff.address ?? "Dropoff", lat: input.dropoff.lat, lng: input.dropoff.lng },
	];
	
	const legs: ExcursionLeg[] = [];
	
	for (let i = 0; i < waypoints.length - 1; i++) {
		const from = waypoints[i];
		const to = waypoints[i + 1];
		const distanceKm = legDistances[i] ?? 0;
		const durationMinutes = legDurations[i] ?? 0;
		
		const legCost = calculateLegCost(distanceKm, durationMinutes, settings);
		
		legs.push({
			order: i + 1,
			fromAddress: from.address,
			toAddress: to.address,
			fromCoords: { lat: from.lat, lng: from.lng },
			toCoords: { lat: to.lat, lng: to.lng },
			distanceKm: Math.round(distanceKm * 100) / 100,
			durationMinutes: Math.round(durationMinutes * 100) / 100,
			cost: legCost,
		});
	}
	
	return legs;
}

/**
 * Story 16.7: Build TripAnalysis for excursion with multiple stops
 */
export function buildExcursionTripAnalysis(
	legs: ExcursionLeg[],
	settings: OrganizationPricingSettings,
	returnDate?: string,
	pickupAt?: string,
): TripAnalysis {
	const calculatedAt = new Date().toISOString();
	
	const totalDistanceKm = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
	const totalDurationMinutes = legs.reduce((sum, leg) => sum + leg.durationMinutes, 0);
	const totalInternalCost = legs.reduce((sum, leg) => sum + leg.cost.total, 0);
	
	const fuelConsumption = settings.fuelConsumptionL100km ?? 7.5;
	const fuelPrice = settings.fuelPricePerLiter ?? 1.80;
	const tollRate = settings.tollCostPerKm ?? 0.12;
	const wearRate = settings.wearCostPerKm ?? 0.08;
	const driverRate = settings.driverHourlyCost ?? 30;
	
	const costBreakdown: CostBreakdown = {
		fuel: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.fuel, 0) * 100) / 100,
			distanceKm: totalDistanceKm,
			consumptionL100km: fuelConsumption,
			pricePerLiter: fuelPrice,
			fuelType: "DIESEL",
		},
		tolls: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.tolls, 0) * 100) / 100,
			distanceKm: totalDistanceKm,
			ratePerKm: tollRate,
			source: "ESTIMATE",
		},
		wear: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.wear, 0) * 100) / 100,
			distanceKm: totalDistanceKm,
			ratePerKm: wearRate,
		},
		driver: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.driver, 0) * 100) / 100,
			durationMinutes: totalDurationMinutes,
			hourlyRate: driverRate,
		},
		parking: {
			amount: 0,
			description: "Not applicable for excursions",
		},
		total: Math.round(totalInternalCost * 100) / 100,
	};
	
	let isMultiDay = false;
	if (returnDate && pickupAt) {
		const pickupDateStr = new Date(pickupAt).toDateString();
		const returnDateStr = new Date(returnDate).toDateString();
		isMultiDay = pickupDateStr !== returnDateStr;
	}
	
	const serviceSegment = {
		name: "service" as const,
		description: `Excursion with ${legs.length} legs`,
		distanceKm: totalDistanceKm,
		durationMinutes: totalDurationMinutes,
		cost: costBreakdown,
		isEstimated: false,
	};
	
	return {
		costBreakdown,
		segments: {
			approach: null,
			service: serviceSegment,
			return: null,
		},
		excursionLegs: legs,
		isMultiDay,
		totalStops: legs.length - 1,
		totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
		totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
		totalInternalCost: Math.round(totalInternalCost * 100) / 100,
		calculatedAt,
		routingSource: "GOOGLE_API",
	};
}
