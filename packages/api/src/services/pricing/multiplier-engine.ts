/**
 * Multiplier Engine Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * 
 * This module handles all multiplier application:
 * - Advanced rates (night, weekend)
 * - Seasonal multipliers
 * - Vehicle category multipliers
 * - Client difficulty multipliers (Patience Tax)
 * - Round trip multipliers
 * - Weighted night rate calculation
 */

import type {
	AdvancedRateData,
	SeasonalMultiplierData,
	MultiplierContext,
	MultiplierEvaluationResult,
	AppliedMultiplierRule,
	VehicleCategoryInfo,
	VehicleCategoryMultiplierResult,
	AppliedVehicleCategoryMultiplierRule,
	ClientDifficultyMultiplierResult,
	AppliedClientDifficultyRule,
	RoundTripMultiplierResult,
	AppliedRoundTripRule,
	WeightedNightRateResult,
	// Story 24.8: Score source tracking
	DifficultyScoreSource,
	ResolvedDifficultyScore,
} from "./types";
import { DEFAULT_DIFFICULTY_MULTIPLIERS } from "./constants";

// ============================================================================
// Vehicle Category Matching (Story 23-7)
// ============================================================================

/**
 * Story 23-7: Check if an adjustment's vehicle category matches the quote's category
 * @param adjustmentCategoryId - The category ID(s) from the adjustment (null = applies to all)
 * @param adjustmentCategoryIds - Array of category IDs (for multi-category support)
 * @param quoteCategoryId - The vehicle category ID of the quote being calculated
 * @returns true if the adjustment should be applied to this quote
 */
export function matchesVehicleCategory(
	adjustmentCategoryId: string | null | undefined,
	adjustmentCategoryIds: string[] | null | undefined,
	quoteCategoryId: string | null | undefined
): boolean {
	// If no quote category specified, apply all adjustments (fallback behavior)
	if (!quoteCategoryId) {
		return true;
	}

	// Check multi-category array first (takes precedence)
	if (adjustmentCategoryIds && adjustmentCategoryIds.length > 0) {
		return adjustmentCategoryIds.includes(quoteCategoryId);
	}

	// If no single category specified, applies to all (backward compatible)
	if (!adjustmentCategoryId) {
		return true;
	}

	// Single category match
	return adjustmentCategoryId === quoteCategoryId;
}

// ============================================================================
// Time Parsing Utilities
// ============================================================================

function parseTimeString(timeStr: string): { hours: number; minutes: number } {
	const [hours, minutes] = timeStr.split(":").map(Number);
	return { hours: hours ?? 0, minutes: minutes ?? 0 };
}

function getParisTime(date: Date): { hours: number; minutes: number; dayOfWeek: number } {
	return {
		hours: date.getHours(),
		minutes: date.getMinutes(),
		dayOfWeek: date.getDay(),
	};
}

// ============================================================================
// Time Range Checks
// ============================================================================

/**
 * Check if a time is within a time range (handles overnight ranges like 22:00-06:00)
 */
export function isTimeInRange(
	hours: number,
	minutes: number,
	startTime: string,
	endTime: string,
): boolean {
	const start = parseTimeString(startTime);
	const end = parseTimeString(endTime);
	
	const currentMinutes = hours * 60 + minutes;
	const startMinutes = start.hours * 60 + start.minutes;
	const endMinutes = end.hours * 60 + end.minutes;
	
	if (startMinutes > endMinutes) {
		return currentMinutes >= startMinutes || currentMinutes < endMinutes;
	}
	
	return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a day of week is in the configured days string
 */
export function isDayInRange(dayOfWeek: number, daysOfWeek: string): boolean {
	const days = daysOfWeek.split(",").map(d => parseInt(d.trim(), 10));
	return days.includes(dayOfWeek);
}

/**
 * Check if pickup time qualifies for NIGHT rate
 */
export function isNightTime(pickupAt: Date, startTime: string, endTime: string): boolean {
	const { hours, minutes } = getParisTime(pickupAt);
	return isTimeInRange(hours, minutes, startTime, endTime);
}

/**
 * Check if pickup time qualifies for WEEKEND rate
 */
export function isWeekend(pickupAt: Date, daysOfWeek: string | null): boolean {
	const { dayOfWeek } = getParisTime(pickupAt);
	const weekendDays = daysOfWeek ?? "0,6";
	return isDayInRange(dayOfWeek, weekendDays);
}

/**
 * @deprecated LONG_DISTANCE rate type removed in Story 11.4
 */
export function isLongDistance(
	_distanceKm: number,
	_minDistanceKm: number | null,
	_maxDistanceKm: number | null,
): boolean {
	return false;
}

/**
 * Check if a date is within a date range (inclusive)
 */
export function isWithinDateRange(pickupAt: Date, startDate: Date, endDate: Date): boolean {
	const pickup = pickupAt.getTime();
	const start = startDate.getTime();
	const end = endDate.getTime() + 24 * 60 * 60 * 1000;
	return pickup >= start && pickup < end;
}

// ============================================================================
// Weighted Night Rate Calculation (Story 17.8)
// ============================================================================

function parseTimeToMinutes(timeStr: string): number {
	const { hours, minutes } = parseTimeString(timeStr);
	return hours * 60 + minutes;
}

function calculateSegmentOverlap(
	rangeStart: number,
	rangeEnd: number,
	segmentStart: number,
	segmentEnd: number,
): number {
	const overlapStart = Math.max(rangeStart, segmentStart);
	const overlapEnd = Math.min(rangeEnd, segmentEnd);
	return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Story 17.8: Calculate minutes of trip that fall within night period
 */
export function calculateNightOverlapMinutes(
	pickupAt: Date,
	estimatedEndAt: Date,
	nightStart: string,
	nightEnd: string,
): number {
	const tripDurationMs = estimatedEndAt.getTime() - pickupAt.getTime();
	if (tripDurationMs <= 0) {
		return 0;
	}
	
	const tripDurationMinutes = Math.round(tripDurationMs / 60000);
	const nightStartMinutes = parseTimeToMinutes(nightStart);
	const nightEndMinutes = parseTimeToMinutes(nightEnd);
	
	const isOvernightRange = nightStartMinutes > nightEndMinutes;
	
	const startOfPickupDay = new Date(pickupAt);
	startOfPickupDay.setHours(0, 0, 0, 0);
	
	const startOfEndDay = new Date(estimatedEndAt);
	startOfEndDay.setHours(0, 0, 0, 0);
	
	const daysDiff = Math.round((startOfEndDay.getTime() - startOfPickupDay.getTime()) / (24 * 60 * 60 * 1000));
	
	let totalNightMinutes = 0;
	
	for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset++) {
		const currentDayStart = new Date(startOfPickupDay);
		currentDayStart.setDate(currentDayStart.getDate() + dayOffset);
		
		const currentDayEnd = new Date(currentDayStart);
		currentDayEnd.setDate(currentDayEnd.getDate() + 1);
		
		const tripStartOnDay = Math.max(pickupAt.getTime(), currentDayStart.getTime());
		const tripEndOnDay = Math.min(estimatedEndAt.getTime(), currentDayEnd.getTime());
		
		if (tripStartOnDay >= tripEndOnDay) {
			continue;
		}
		
		const tripStartMinutes = Math.round((tripStartOnDay - currentDayStart.getTime()) / 60000);
		const tripEndMinutes = Math.round((tripEndOnDay - currentDayStart.getTime()) / 60000);
		
		if (isOvernightRange) {
			totalNightMinutes += calculateSegmentOverlap(
				tripStartMinutes, tripEndMinutes,
				nightStartMinutes, 1440
			);
			totalNightMinutes += calculateSegmentOverlap(
				tripStartMinutes, tripEndMinutes,
				0, nightEndMinutes
			);
		} else {
			totalNightMinutes += calculateSegmentOverlap(
				tripStartMinutes, tripEndMinutes,
				nightStartMinutes, nightEndMinutes
			);
		}
	}
	
	return Math.min(totalNightMinutes, tripDurationMinutes);
}

/**
 * Story 17.8: Calculate weighted night rate for a trip
 */
export function calculateWeightedNightRate(
	basePrice: number,
	pickupAt: Date,
	estimatedEndAt: Date | null,
	rate: AdvancedRateData,
): WeightedNightRateResult | null {
	if (!estimatedEndAt || !rate.startTime || !rate.endTime) {
		return null;
	}
	
	const totalMinutes = Math.round(
		(estimatedEndAt.getTime() - pickupAt.getTime()) / 60000
	);
	
	if (totalMinutes <= 0) {
		return null;
	}
	
	const nightMinutes = calculateNightOverlapMinutes(
		pickupAt, estimatedEndAt, rate.startTime, rate.endTime
	);
	
	if (nightMinutes === 0) {
		return {
			adjustedPrice: basePrice,
			nightMinutes: 0,
			totalMinutes,
			nightPercentage: 0,
			baseAdjustment: rate.value,
			effectiveAdjustment: 0,
		};
	}
	
	const nightPercentage = (nightMinutes / totalMinutes) * 100;
	const nightFraction = nightMinutes / totalMinutes;
	
	let adjustedPrice: number;
	let effectiveAdjustment: number;
	
	if (rate.adjustmentType === "PERCENTAGE") {
		effectiveAdjustment = rate.value * nightFraction;
		adjustedPrice = Math.round(basePrice * (1 + effectiveAdjustment / 100) * 100) / 100;
	} else {
		effectiveAdjustment = rate.value * nightFraction;
		adjustedPrice = Math.round((basePrice + effectiveAdjustment) * 100) / 100;
	}
	
	return {
		adjustedPrice,
		nightMinutes,
		totalMinutes,
		nightPercentage: Math.round(nightPercentage * 100) / 100,
		baseAdjustment: rate.value,
		effectiveAdjustment: Math.round(effectiveAdjustment * 100) / 100,
	};
}

// ============================================================================
// Advanced Rate Evaluation
// ============================================================================

/**
 * Evaluate if an advanced rate applies to the given context
 * Story 23-7: Added vehicle category filtering
 */
export function evaluateAdvancedRate(
	rate: AdvancedRateData,
	context: MultiplierContext,
): boolean {
	if (!rate.isActive) {
		return false;
	}

	// Story 23-7: Check vehicle category match
	if (!matchesVehicleCategory(rate.vehicleCategoryId, rate.vehicleCategoryIds, context.vehicleCategoryId)) {
		return false;
	}

	switch (rate.appliesTo) {
		case "NIGHT":
			if (!context.pickupAt || !rate.startTime || !rate.endTime) {
				return false;
			}
			return isNightTime(context.pickupAt, rate.startTime, rate.endTime);

		case "WEEKEND":
			if (!context.pickupAt) {
				return false;
			}
			return isWeekend(context.pickupAt, rate.daysOfWeek);

		default:
			return false;
	}
}

/**
 * Apply an advanced rate adjustment to a price
 */
export function applyAdvancedRateAdjustment(
	price: number,
	rate: AdvancedRateData,
): number {
	if (rate.adjustmentType === "PERCENTAGE") {
		return Math.round(price * (1 + rate.value / 100) * 100) / 100;
	} else {
		return Math.round((price + rate.value) * 100) / 100;
	}
}

/**
 * Evaluate and apply all applicable advanced rates
 */
export function evaluateAdvancedRates(
	basePrice: number,
	context: MultiplierContext,
	rates: AdvancedRateData[],
): MultiplierEvaluationResult {
	const appliedRules: AppliedMultiplierRule[] = [];
	let currentPrice = basePrice;

	const sortedRates = [...rates].sort((a, b) => b.priority - a.priority);

	for (const rate of sortedRates) {
		if (rate.appliesTo === "NIGHT" && rate.isActive && context.pickupAt) {
			const weightedResult = calculateWeightedNightRate(
				currentPrice,
				context.pickupAt,
				context.estimatedEndAt,
				rate,
			);
			
			if (weightedResult) {
				if (weightedResult.nightMinutes > 0) {
					const priceBefore = currentPrice;
					currentPrice = weightedResult.adjustedPrice;
					
					const nightPercentageRounded = Math.round(weightedResult.nightPercentage);
					appliedRules.push({
						type: "ADVANCED_RATE",
						description: `Applied NIGHT rate: ${rate.name} (${nightPercentageRounded}% of trip)`,
						ruleId: rate.id,
						ruleName: rate.name,
						adjustmentType: rate.adjustmentType,
						adjustmentValue: weightedResult.effectiveAdjustment,
						priceBefore,
						priceAfter: currentPrice,
						weightedDetails: {
							nightPeriodStart: rate.startTime!,
							nightPeriodEnd: rate.endTime!,
							tripStart: context.pickupAt.toISOString(),
							tripEnd: context.estimatedEndAt!.toISOString(),
							nightMinutes: weightedResult.nightMinutes,
							totalMinutes: weightedResult.totalMinutes,
							nightPercentage: weightedResult.nightPercentage,
							baseAdjustment: weightedResult.baseAdjustment,
							effectiveAdjustment: weightedResult.effectiveAdjustment,
						},
					});
				}
				continue;
			}
		}
		
		if (evaluateAdvancedRate(rate, context)) {
			const priceBefore = currentPrice;
			currentPrice = applyAdvancedRateAdjustment(currentPrice, rate);

			appliedRules.push({
				type: "ADVANCED_RATE",
				description: `Applied ${rate.appliesTo} rate: ${rate.name}`,
				ruleId: rate.id,
				ruleName: rate.name,
				adjustmentType: rate.adjustmentType,
				adjustmentValue: rate.value,
				priceBefore,
				priceAfter: currentPrice,
			});
		}
	}

	return {
		adjustedPrice: currentPrice,
		appliedRules,
	};
}

// ============================================================================
// Seasonal Multiplier Evaluation
// ============================================================================

/**
 * Evaluate if a seasonal multiplier applies to the given pickup time
 * Story 23-7: Added vehicle category filtering
 */
export function evaluateSeasonalMultiplier(
	multiplier: SeasonalMultiplierData,
	pickupAt: Date,
	vehicleCategoryId?: string | null,
): boolean {
	if (!multiplier.isActive) {
		return false;
	}
	// Story 23-7: Check vehicle category match
	if (!matchesVehicleCategory(multiplier.vehicleCategoryId, multiplier.vehicleCategoryIds, vehicleCategoryId)) {
		return false;
	}
	return isWithinDateRange(pickupAt, multiplier.startDate, multiplier.endDate);
}

/**
 * Apply a seasonal multiplier to a price
 */
export function applySeasonalMultiplier(
	price: number,
	multiplier: SeasonalMultiplierData,
): number {
	return Math.round(price * multiplier.multiplier * 100) / 100;
}

/**
 * Evaluate and apply all applicable seasonal multipliers
 * Story 23-7: Added vehicle category filtering
 */
export function evaluateSeasonalMultipliers(
	price: number,
	pickupAt: Date | null,
	multipliers: SeasonalMultiplierData[],
	vehicleCategoryId?: string | null,
): MultiplierEvaluationResult {
	const appliedRules: AppliedMultiplierRule[] = [];
	let currentPrice = price;

	if (!pickupAt) {
		return { adjustedPrice: currentPrice, appliedRules };
	}

	const sortedMultipliers = [...multipliers].sort((a, b) => b.priority - a.priority);

	for (const multiplier of sortedMultipliers) {
		// Story 23-7: Pass vehicleCategoryId for category filtering
		if (evaluateSeasonalMultiplier(multiplier, pickupAt, vehicleCategoryId)) {
			const priceBefore = currentPrice;
			currentPrice = applySeasonalMultiplier(currentPrice, multiplier);

			appliedRules.push({
				type: "SEASONAL_MULTIPLIER",
				description: `Applied seasonal multiplier: ${multiplier.name}`,
				ruleId: multiplier.id,
				ruleName: multiplier.name,
				adjustmentType: "MULTIPLIER",
				adjustmentValue: multiplier.multiplier,
				priceBefore,
				priceAfter: currentPrice,
			});
		}
	}

	return {
		adjustedPrice: currentPrice,
		appliedRules,
	};
}

/**
 * Apply all multipliers to a base price (Story 4.3)
 * Story 23-7: Added vehicle category filtering for seasonal multipliers
 * Order: Advanced Rates → Seasonal Multipliers
 */
export function applyAllMultipliers(
	basePrice: number,
	context: MultiplierContext,
	advancedRates: AdvancedRateData[],
	seasonalMultipliers: SeasonalMultiplierData[],
): MultiplierEvaluationResult {
	const allAppliedRules: AppliedMultiplierRule[] = [];

	const advancedResult = evaluateAdvancedRates(basePrice, context, advancedRates);
	allAppliedRules.push(...advancedResult.appliedRules);

	// Story 23-7: Pass vehicleCategoryId for category-specific filtering
	const seasonalResult = evaluateSeasonalMultipliers(
		advancedResult.adjustedPrice,
		context.pickupAt,
		seasonalMultipliers,
		context.vehicleCategoryId,
	);
	allAppliedRules.push(...seasonalResult.appliedRules);

	return {
		adjustedPrice: seasonalResult.adjustedPrice,
		appliedRules: allAppliedRules,
	};
}

// ============================================================================
// Vehicle Category Multiplier
// ============================================================================

/**
 * Story 15.3: Apply vehicle category price multiplier
 * Story 19.1: Skip multiplier if category-specific rates were already used
 */
export function applyVehicleCategoryMultiplier(
	basePrice: number,
	vehicleCategory: VehicleCategoryInfo | undefined,
	usedCategoryRates: boolean = false,
): VehicleCategoryMultiplierResult {
	if (!vehicleCategory) {
		return { adjustedPrice: basePrice, appliedRule: null };
	}

	const multiplier = vehicleCategory.priceMultiplier;

	if (usedCategoryRates) {
		const appliedRule: AppliedVehicleCategoryMultiplierRule = {
			type: "VEHICLE_CATEGORY_MULTIPLIER",
			description: `Category multiplier skipped: ${vehicleCategory.name} uses category-specific rates (premium already included)`,
			categoryId: vehicleCategory.id,
			categoryCode: vehicleCategory.code,
			categoryName: vehicleCategory.name,
			multiplier: 1.0,
			priceBefore: basePrice,
			priceAfter: basePrice,
			skippedReason: "CATEGORY_RATES_USED",
		};
		return { adjustedPrice: basePrice, appliedRule };
	}

	if (multiplier === 1.0) {
		return { adjustedPrice: basePrice, appliedRule: null };
	}

	const adjustedPrice = Math.round(basePrice * multiplier * 100) / 100;

	const appliedRule: AppliedVehicleCategoryMultiplierRule = {
		type: "VEHICLE_CATEGORY_MULTIPLIER",
		description: `Vehicle category multiplier applied: ${vehicleCategory.name} (${multiplier}×)`,
		categoryId: vehicleCategory.id,
		categoryCode: vehicleCategory.code,
		categoryName: vehicleCategory.name,
		multiplier,
		priceBefore: basePrice,
		priceAfter: adjustedPrice,
	};

	return { adjustedPrice, appliedRule };
}

// ============================================================================
// Client Difficulty Multiplier (Patience Tax)
// ============================================================================

/**
 * Story 24.8: Resolve difficulty score with priority
 * Priority: EndCustomer score > Contact score > null
 * @param endCustomerScore - The end-customer's difficulty score (if any)
 * @param contactScore - The contact's difficulty score (if any)
 * @param endCustomerId - The end-customer ID (for logging)
 * @returns Resolved score with source tracking
 */
export function resolveDifficultyScore(
	endCustomerScore: number | null | undefined,
	contactScore: number | null | undefined,
	endCustomerId?: string | null,
): ResolvedDifficultyScore {
	// Priority 1: EndCustomer score (if exists and valid: 1-5)
	if (endCustomerScore != null && endCustomerScore >= 1 && endCustomerScore <= 5) {
		return {
			score: endCustomerScore,
			source: "END_CUSTOMER",
			endCustomerId: endCustomerId ?? undefined,
		};
	}

	// Priority 2: Contact score (fallback)
	if (contactScore != null && contactScore >= 1 && contactScore <= 5) {
		return {
			score: contactScore,
			source: "CONTACT",
		};
	}

	// No valid score available
	return {
		score: null,
		source: "NONE",
	};
}

/**
 * Story 17.15: Apply client difficulty multiplier (Patience Tax)
 * Story 24.8: Updated to accept resolved score with source tracking
 */
export function applyClientDifficultyMultiplier(
	price: number,
	difficultyScore: number | null | undefined,
	configuredMultipliers?: Record<string, number> | null,
	scoreSource?: DifficultyScoreSource,
	endCustomerId?: string,
): ClientDifficultyMultiplierResult {
	if (difficultyScore == null || difficultyScore < 1 || difficultyScore > 5) {
		return { adjustedPrice: price, appliedRule: null };
	}

	let multiplier = 1.0;
	if (configuredMultipliers) {
		multiplier = configuredMultipliers[String(difficultyScore)] ?? 1.0;
	} else {
		multiplier = DEFAULT_DIFFICULTY_MULTIPLIERS[difficultyScore] ?? 1.0;
	}

	if (multiplier === 1.0) {
		return { adjustedPrice: price, appliedRule: null };
	}

	const adjustedPrice = Math.round(price * multiplier * 100) / 100;
	const percentChange = Math.round((multiplier - 1) * 100 * 100) / 100;

	// Story 24.8: Build description with source info
	const sourceLabel = scoreSource === "END_CUSTOMER" ? "end-customer" : "contact";
	const description = scoreSource
		? `Client difficulty adjustment: +${percentChange}% (${sourceLabel} score ${difficultyScore}/5)`
		: `Client difficulty adjustment: +${percentChange}% (score ${difficultyScore}/5)`;

	return {
		adjustedPrice,
		appliedRule: {
			type: "CLIENT_DIFFICULTY_MULTIPLIER",
			description,
			difficultyScore,
			multiplier,
			priceBefore: price,
			priceAfter: adjustedPrice,
			// Story 24.8: Include score source tracking
			scoreSource,
			endCustomerId,
		},
	};
}

// ============================================================================
// Round Trip Multiplier
// ============================================================================

/**
 * @deprecated Story 22.1: Use calculateRoundTripSegments from shadow-calculator instead
 * This function applies a simple ×2 multiplier which doesn't accurately reflect
 * operational costs. The new segment-based calculation is more accurate.
 * 
 * Kept for backward compatibility with existing quotes.
 * 
 * Story 16.6: Apply round trip multiplier (×2) for transfer quotes
 */
export function applyRoundTripMultiplier(
	price: number,
	internalCost: number,
	isRoundTrip: boolean,
): RoundTripMultiplierResult {
	if (!isRoundTrip) {
		return {
			adjustedPrice: price,
			adjustedInternalCost: internalCost,
			appliedRule: null,
		};
	}

	const adjustedPrice = Math.round(price * 2 * 100) / 100;
	const adjustedInternalCost = Math.round(internalCost * 2 * 100) / 100;

	const appliedRule: AppliedRoundTripRule = {
		type: "ROUND_TRIP",
		description: "Round trip multiplier applied (×2) [DEPRECATED: use segment-based calculation]",
		multiplier: 2,
		priceBeforeRoundTrip: price,
		priceAfterRoundTrip: adjustedPrice,
		internalCostBeforeRoundTrip: internalCost,
		internalCostAfterRoundTrip: adjustedInternalCost,
	};

	return {
		adjustedPrice,
		adjustedInternalCost,
		appliedRule,
	};
}
