/**
 * Dense Zone Detector Module
 * Story 18.2: Dense zone detection for Transfer-to-MAD switching
 * Story 18.3: Round-trip to MAD detection
 * 
 * This module handles:
 * - Dense zone detection (intra-zone with low commercial speed)
 * - MAD (Mise à Disposition) pricing suggestions
 * - Round-trip blocking detection
 */

import type {
	OrganizationPricingSettings,
	DenseZoneDetection,
	MadSuggestion,
	RoundTripDetection,
	RoundTripMadSuggestion,
	AppliedRule,
} from "./types";

// ============================================================================
// Constants
// ============================================================================

export const DEFAULT_DENSE_ZONE_SPEED_THRESHOLD = 15; // km/h
export const DEFAULT_DENSE_ZONE_CODES = ["PARIS_0", "PARIS_10", "LA_DEFENSE"];
export const DEFAULT_MIN_WAITING_TIME_FOR_SEPARATE_TRANSFERS = 120; // minutes
export const DEFAULT_MAX_RETURN_DISTANCE_KM = 30;
export const DEFAULT_ROUND_TRIP_BUFFER = 30; // minutes

// ============================================================================
// Story 18.2: Dense Zone Detection
// ============================================================================

/**
 * Detect if a trip is within a dense zone with low commercial speed
 * 
 * Dense zones are typically urban centers where traffic congestion
 * makes Transfer pricing less profitable than MAD (hourly) pricing.
 * 
 * @param pickupZone - Pickup zone data (with code)
 * @param dropoffZone - Dropoff zone data (with code)
 * @param distanceKm - Trip distance in kilometers
 * @param durationMinutes - Trip duration in minutes
 * @param settings - Organization pricing settings
 * @returns Dense zone detection result
 */
export function detectDenseZone(
	pickupZone: { code: string } | null,
	dropoffZone: { code: string } | null,
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): DenseZoneDetection {
	const denseZoneCodes = settings.denseZoneCodes ?? DEFAULT_DENSE_ZONE_CODES;
	const speedThreshold = settings.denseZoneSpeedThreshold ?? DEFAULT_DENSE_ZONE_SPEED_THRESHOLD;
	
	const pickupCode = pickupZone?.code ?? null;
	const dropoffCode = dropoffZone?.code ?? null;
	
	// Check if both pickup and dropoff are in dense zones
	const pickupInDense = pickupCode !== null && denseZoneCodes.includes(pickupCode);
	const dropoffInDense = dropoffCode !== null && denseZoneCodes.includes(dropoffCode);
	const isIntraDenseZone = pickupInDense && dropoffInDense;
	
	// Calculate commercial speed
	const commercialSpeedKmh = durationMinutes > 0
		? Math.round((distanceKm / (durationMinutes / 60)) * 100) / 100
		: null;
	
	// Check if speed is below threshold
	const isBelowThreshold = commercialSpeedKmh !== null && commercialSpeedKmh < speedThreshold;
	
	return {
		isIntraDenseZone,
		pickupZoneCode: pickupCode,
		dropoffZoneCode: dropoffCode,
		denseZoneCodes,
		commercialSpeedKmh,
		speedThreshold,
		isBelowThreshold,
	};
}

/**
 * Calculate MAD (Mise à Disposition) pricing suggestion
 * 
 * When a Transfer trip is detected as being in a dense zone with low
 * commercial speed, this function calculates what the MAD price would be
 * and whether it's more profitable.
 * 
 * @param transferPrice - Current transfer price
 * @param durationMinutes - Trip duration in minutes
 * @param distanceKm - Trip distance in kilometers
 * @param settings - Organization pricing settings
 * @param autoSwitch - Whether to auto-switch to MAD if more profitable
 * @returns MAD suggestion with price comparison
 */
export function calculateMadSuggestion(
	transferPrice: number,
	durationMinutes: number,
	distanceKm: number,
	settings: OrganizationPricingSettings,
	autoSwitch: boolean,
): MadSuggestion {
	// Calculate MAD price based on hourly rate
	const hourlyRate = settings.baseRatePerHour;
	const hours = Math.ceil(durationMinutes / 60); // Round up to nearest hour
	const madBasePrice = hours * hourlyRate;
	
	// Apply margin
	const madPrice = Math.round(madBasePrice * (1 + settings.targetMarginPercent / 100) * 100) / 100;
	
	const priceDifference = Math.round((madPrice - transferPrice) * 100) / 100;
	const percentageGain = transferPrice > 0
		? Math.round((priceDifference / transferPrice) * 100 * 100) / 100
		: 0;
	
	const isMadMoreProfitable = madPrice > transferPrice;
	
	let recommendation: string;
	if (isMadMoreProfitable) {
		recommendation = `Consider MAD pricing: ${madPrice}€ (${hours}h) vs Transfer ${transferPrice}€ (+${percentageGain}%)`;
	} else {
		recommendation = `Transfer pricing is optimal: ${transferPrice}€ vs MAD ${madPrice}€`;
	}
	
	return {
		type: "CONSIDER_MAD_PRICING",
		transferPrice,
		madPrice,
		priceDifference,
		percentageGain,
		recommendation,
		autoSwitched: autoSwitch && isMadMoreProfitable,
	};
}

/**
 * Build an applied rule for auto-switched Transfer to MAD
 */
export function buildAutoSwitchedToMadRule(
	detection: DenseZoneDetection,
	suggestion: MadSuggestion,
): AppliedRule {
	return {
		type: "AUTO_SWITCH_TO_MAD",
		description: `Auto-switched from Transfer to MAD pricing due to dense zone (${detection.pickupZoneCode} → ${detection.dropoffZoneCode}) with low commercial speed (${detection.commercialSpeedKmh} km/h < ${detection.speedThreshold} km/h threshold)`,
		originalPrice: suggestion.transferPrice,
		newPrice: suggestion.madPrice,
		priceDifference: suggestion.priceDifference,
		percentageGain: suggestion.percentageGain,
		reason: "DENSE_ZONE_LOW_SPEED",
		commercialSpeedKmh: detection.commercialSpeedKmh,
		speedThreshold: detection.speedThreshold,
	};
}

// ============================================================================
// Story 18.3: Round-Trip to MAD Detection
// ============================================================================

/**
 * Detect if a round-trip blocks the driver on-site
 * 
 * For round-trips, if the waiting time on-site is too short for the driver
 * to return to base and come back, the driver is "blocked" on-site.
 * In this case, MAD pricing may be more appropriate.
 * 
 * @param isRoundTrip - Whether this is a round-trip
 * @param distanceKm - One-way distance in kilometers
 * @param durationMinutes - One-way duration in minutes
 * @param waitingTimeMinutes - Waiting time on-site (null if not specified)
 * @param settings - Organization pricing settings
 * @returns Round-trip detection result
 */
export function detectRoundTripBlocked(
	isRoundTrip: boolean,
	distanceKm: number,
	durationMinutes: number,
	waitingTimeMinutes: number | null,
	settings: OrganizationPricingSettings,
): RoundTripDetection {
	const minWaitingTime = settings.minWaitingTimeForSeparateTransfers ?? DEFAULT_MIN_WAITING_TIME_FOR_SEPARATE_TRANSFERS;
	const maxReturnDistance = settings.maxReturnDistanceKm ?? DEFAULT_MAX_RETURN_DISTANCE_KM;
	const buffer = settings.roundTripBuffer ?? DEFAULT_ROUND_TRIP_BUFFER;
	
	// If not a round-trip, driver is not blocked
	if (!isRoundTrip) {
		return {
			isRoundTripBlocked: false,
			isDriverBlocked: false,
			waitingTimeMinutes: 0,
			minWaitingTimeForSeparateTransfers: minWaitingTime,
			maxReturnDistanceKm: maxReturnDistance,
			returnDistanceKm: distanceKm,
			returnToBaseMinutes: durationMinutes,
			exceedsMaxReturnDistance: false,
			reason: "NOT_ROUND_TRIP",
		};
	}
	
	// Calculate return to base time (one-way duration)
	const returnToBaseMinutes = durationMinutes;
	
	// Time needed for driver to return to base and come back
	const roundTripToBaseMinutes = returnToBaseMinutes * 2 + buffer;
	
	// Check if distance exceeds max return distance
	const exceedsMaxReturnDistance = distanceKm > maxReturnDistance;
	
	// Effective waiting time (default to 0 if not specified)
	const effectiveWaitingTime = waitingTimeMinutes ?? 0;
	
	// Driver is blocked if:
	// 1. Waiting time is less than time to return to base and come back, OR
	// 2. Distance exceeds max return distance
	const isDriverBlocked = effectiveWaitingTime < roundTripToBaseMinutes || exceedsMaxReturnDistance;
	
	let reason: string;
	if (!isDriverBlocked) {
		reason = "DRIVER_CAN_RETURN";
	} else if (exceedsMaxReturnDistance) {
		reason = "EXCEEDS_MAX_RETURN_DISTANCE";
	} else if (effectiveWaitingTime < minWaitingTime) {
		reason = "WAITING_TIME_TOO_SHORT";
	} else {
		reason = "CANNOT_RETURN_IN_TIME";
	}
	
	return {
		isRoundTripBlocked: isDriverBlocked,
		isDriverBlocked,
		waitingTimeMinutes: effectiveWaitingTime,
		minWaitingTimeForSeparateTransfers: minWaitingTime,
		maxReturnDistanceKm: maxReturnDistance,
		returnDistanceKm: distanceKm,
		returnToBaseMinutes,
		exceedsMaxReturnDistance,
		reason,
	};
}

/**
 * Calculate MAD suggestion for round-trip
 * 
 * When a round-trip blocks the driver on-site, calculate what the MAD
 * price would be for the total time (outbound + waiting + return).
 * 
 * @param twoTransfersPrice - Current price (2× transfer price)
 * @param distanceKm - One-way distance in kilometers
 * @param durationMinutes - One-way duration in minutes
 * @param waitingTimeMinutes - Waiting time on-site
 * @param detection - Round-trip detection result
 * @param settings - Organization pricing settings
 * @param autoSwitch - Whether to auto-switch to MAD if more profitable
 * @returns Round-trip MAD suggestion
 */
export function calculateRoundTripMadSuggestion(
	twoTransfersPrice: number,
	distanceKm: number,
	durationMinutes: number,
	waitingTimeMinutes: number,
	detection: RoundTripDetection,
	settings: OrganizationPricingSettings,
	autoSwitch: boolean,
): RoundTripMadSuggestion {
	// Total time: outbound + waiting + return
	const totalMinutes = durationMinutes + waitingTimeMinutes + durationMinutes;
	const totalHours = Math.ceil(totalMinutes / 60);
	
	// Calculate MAD price
	const hourlyRate = settings.baseRatePerHour;
	const madBasePrice = totalHours * hourlyRate;
	const madPrice = Math.round(madBasePrice * (1 + settings.targetMarginPercent / 100) * 100) / 100;
	
	const priceDifference = Math.round((madPrice - twoTransfersPrice) * 100) / 100;
	const percentageGain = twoTransfersPrice > 0
		? Math.round((priceDifference / twoTransfersPrice) * 100 * 100) / 100
		: 0;
	
	const isMadMoreProfitable = madPrice > twoTransfersPrice;
	
	let recommendation: string;
	if (isMadMoreProfitable) {
		recommendation = `Consider MAD pricing for round-trip: ${madPrice}€ (${totalHours}h) vs 2×Transfer ${twoTransfersPrice}€ (+${percentageGain}%)`;
	} else {
		recommendation = `2×Transfer pricing is optimal: ${twoTransfersPrice}€ vs MAD ${madPrice}€`;
	}
	
	return {
		type: "CONSIDER_MAD_FOR_ROUND_TRIP",
		twoTransfersPrice,
		madPrice,
		priceDifference,
		percentageGain,
		recommendation,
		autoSwitched: autoSwitch && isMadMoreProfitable,
	};
}

/**
 * Build an applied rule for auto-switched round-trip to MAD
 */
export function buildAutoSwitchedRoundTripToMadRule(
	detection: RoundTripDetection,
	suggestion: RoundTripMadSuggestion,
): AppliedRule {
	return {
		type: "AUTO_SWITCH_ROUND_TRIP_TO_MAD",
		description: `Auto-switched round-trip from 2×Transfer to MAD pricing (driver blocked on-site: ${detection.reason})`,
		originalPrice: suggestion.twoTransfersPrice,
		newPrice: suggestion.madPrice,
		priceDifference: suggestion.priceDifference,
		percentageGain: suggestion.percentageGain,
		reason: detection.reason,
		waitingTimeMinutes: detection.waitingTimeMinutes,
		returnToBaseMinutes: detection.returnToBaseMinutes,
		exceedsMaxReturnDistance: detection.exceedsMaxReturnDistance,
	};
}
