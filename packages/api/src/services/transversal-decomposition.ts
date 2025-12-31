/**
 * Transversal Trip Decomposition Service
 * Story 18.7: Transversal Trip Decomposition
 *
 * Decomposes transversal trips crossing multiple zones into priced segments
 * with optional transit discounts for intermediate zones.
 */

import type { ZoneSegment, RouteSegmentationResult } from "./route-segmentation";
import type { AppliedRule } from "./pricing-engine";

// ============================================================================
// Types
// ============================================================================

/**
 * Pricing method used for a segment
 */
export type SegmentPricingMethod = "FLAT_RATE" | "FORFAIT" | "DYNAMIC";

/**
 * A single segment of a transversal trip with pricing
 */
export interface TransversalSegment {
	segmentIndex: number;
	fromZoneCode: string;
	toZoneCode: string;
	zoneCode: string; // The zone this segment is in
	zoneName: string;
	distanceKm: number;
	durationMinutes: number;
	priceMultiplier: number;
	segmentPrice: number;
	isTransitZone: boolean;
	transitDiscountApplied: number;
	pricingMethod: SegmentPricingMethod;
}

/**
 * Result of transversal trip decomposition
 */
export interface TransversalDecompositionResult {
	isTransversal: boolean;
	segments: TransversalSegment[];
	totalSegments: number;
	totalTransitDiscount: number;
	priceBeforeDiscount: number;
	priceAfterDiscount: number;
	zonesTraversed: string[];
}

/**
 * Configuration for transversal decomposition
 */
export interface TransversalDecompositionConfig {
	transitDiscountEnabled: boolean;
	transitDiscountPercent: number;
	transitZoneCodes: string[];
	pickupZoneCode: string;
	dropoffZoneCode: string;
}

/**
 * Pricing parameters for segment calculation
 */
export interface SegmentPricingParams {
	baseRatePerKm: number;
	baseRatePerHour: number;
	targetMarginPercent: number;
}

// ============================================================================
// Constants
// ============================================================================

/**
 * Default transit discount configuration
 */
export const DEFAULT_TRANSIT_CONFIG: Omit<TransversalDecompositionConfig, "pickupZoneCode" | "dropoffZoneCode"> = {
	transitDiscountEnabled: false,
	transitDiscountPercent: 10,
	transitZoneCodes: ["PARIS_0", "PARIS_10"],
};

/**
 * Minimum number of distinct zones for a trip to be considered transversal
 */
const MIN_ZONES_FOR_TRANSVERSAL = 3;

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Determine if a trip is transversal (crosses 3+ distinct zones)
 *
 * @param zoneSegments - Zone segments from route segmentation
 * @param pickupZoneCode - Code of the pickup zone
 * @param dropoffZoneCode - Code of the dropoff zone
 * @returns True if the trip is transversal
 */
export function isTransversalTrip(
	zoneSegments: ZoneSegment[],
	pickupZoneCode: string,
	dropoffZoneCode: string,
): boolean {
	if (!zoneSegments || zoneSegments.length === 0) {
		return false;
	}

	// Get unique zone codes
	const uniqueZones = new Set(zoneSegments.map((s) => s.zoneCode));

	// A trip is transversal if it crosses 3+ distinct zones
	// AND has at least one intermediate zone different from pickup/dropoff
	if (uniqueZones.size < MIN_ZONES_FOR_TRANSVERSAL) {
		return false;
	}

	// Check for intermediate zones (zones that are neither pickup nor dropoff)
	const hasIntermediateZone = Array.from(uniqueZones).some(
		(code) => code !== pickupZoneCode && code !== dropoffZoneCode,
	);

	return hasIntermediateZone;
}

/**
 * Identify transit zones (zones crossed without pickup/dropoff)
 *
 * @param zoneSegments - Zone segments from route segmentation
 * @param pickupZoneCode - Code of the pickup zone
 * @param dropoffZoneCode - Code of the dropoff zone
 * @param transitZoneCodes - List of zone codes eligible for transit discount
 * @returns Array of zone codes that are transit zones
 */
export function identifyTransitZones(
	zoneSegments: ZoneSegment[],
	pickupZoneCode: string,
	dropoffZoneCode: string,
	transitZoneCodes: string[],
): string[] {
	if (!zoneSegments || zoneSegments.length === 0) {
		return [];
	}

	const transitZones: string[] = [];
	const transitZoneSet = new Set(transitZoneCodes);

	// Get unique zones traversed
	const uniqueZones = new Set(zoneSegments.map((s) => s.zoneCode));

	// Convert Set to Array for iteration
	const uniqueZonesArray = Array.from(uniqueZones);
	for (let i = 0; i < uniqueZonesArray.length; i++) {
		const zoneCode = uniqueZonesArray[i];
		// A zone is a transit zone if:
		// 1. It's NOT the pickup zone
		// 2. It's NOT the dropoff zone
		// 3. It's in the configured transit zone list
		if (
			zoneCode !== pickupZoneCode &&
			zoneCode !== dropoffZoneCode &&
			transitZoneSet.has(zoneCode)
		) {
			transitZones.push(zoneCode);
		}
	}

	return transitZones;
}

/**
 * Calculate segment price using dynamic pricing
 *
 * @param segment - Zone segment data
 * @param pricingParams - Pricing parameters
 * @returns Calculated segment price
 */
function calculateSegmentPrice(
	segment: ZoneSegment,
	pricingParams: SegmentPricingParams,
): number {
	const { baseRatePerKm, baseRatePerHour, targetMarginPercent } = pricingParams;

	// Calculate base price using MAX(distance-based, duration-based)
	const distanceBasedPrice = segment.distanceKm * baseRatePerKm;
	const durationBasedPrice = (segment.durationMinutes / 60) * baseRatePerHour;
	const basePrice = Math.max(distanceBasedPrice, durationBasedPrice);

	// Apply zone multiplier
	const priceWithMultiplier = basePrice * segment.priceMultiplier;

	// Apply target margin
	const marginMultiplier = 1 + targetMarginPercent / 100;
	const finalPrice = priceWithMultiplier * marginMultiplier;

	// Round to 2 decimal places
	return Math.round(finalPrice * 100) / 100;
}

/**
 * Decompose a transversal trip into priced segments
 *
 * @param zoneSegments - Zone segments from route segmentation (Story 17.13)
 * @param config - Transversal decomposition configuration
 * @param pricingParams - Pricing parameters for segment calculation
 * @returns Transversal decomposition result
 */
export function decomposeTransversalTrip(
	zoneSegments: ZoneSegment[],
	config: TransversalDecompositionConfig,
	pricingParams: SegmentPricingParams,
): TransversalDecompositionResult {
	// Handle empty or invalid input
	if (!zoneSegments || zoneSegments.length === 0) {
		return createNonTransversalResult();
	}

	const { pickupZoneCode, dropoffZoneCode, transitDiscountEnabled, transitDiscountPercent, transitZoneCodes } = config;

	// Check if trip is transversal
	if (!isTransversalTrip(zoneSegments, pickupZoneCode, dropoffZoneCode)) {
		return createNonTransversalResult();
	}

	// Identify transit zones
	const transitZones = identifyTransitZones(
		zoneSegments,
		pickupZoneCode,
		dropoffZoneCode,
		transitZoneCodes,
	);
	const transitZoneSet = new Set(transitZones);

	// Build transversal segments with pricing
	const segments: TransversalSegment[] = [];
	let totalPriceBeforeDiscount = 0;
	let totalTransitDiscount = 0;

	for (let i = 0; i < zoneSegments.length; i++) {
		const segment = zoneSegments[i];
		const isTransitZone = transitZoneSet.has(segment.zoneCode);

		// Calculate segment price
		const segmentPrice = calculateSegmentPrice(segment, pricingParams);
		totalPriceBeforeDiscount += segmentPrice;

		// Calculate transit discount if applicable
		let transitDiscount = 0;
		if (isTransitZone && transitDiscountEnabled && transitDiscountPercent > 0) {
			transitDiscount = Math.round(segmentPrice * (transitDiscountPercent / 100) * 100) / 100;
			totalTransitDiscount += transitDiscount;
		}

		// Determine from/to zone codes for segment transitions
		const fromZoneCode = i === 0 ? pickupZoneCode : zoneSegments[i - 1].zoneCode;
		const toZoneCode = i === zoneSegments.length - 1 ? dropoffZoneCode : zoneSegments[i + 1]?.zoneCode ?? segment.zoneCode;

		segments.push({
			segmentIndex: i,
			fromZoneCode,
			toZoneCode,
			zoneCode: segment.zoneCode,
			zoneName: segment.zoneName,
			distanceKm: segment.distanceKm,
			durationMinutes: segment.durationMinutes,
			priceMultiplier: segment.priceMultiplier,
			segmentPrice,
			isTransitZone,
			transitDiscountApplied: transitDiscount,
			pricingMethod: "DYNAMIC", // Currently only dynamic pricing for segments
		});
	}

	// Calculate final price after discounts
	const priceAfterDiscount = Math.round((totalPriceBeforeDiscount - totalTransitDiscount) * 100) / 100;

	// Get zones traversed in order
	const zonesTraversed = zoneSegments.map((s) => s.zoneCode);

	return {
		isTransversal: true,
		segments,
		totalSegments: segments.length,
		totalTransitDiscount,
		priceBeforeDiscount: Math.round(totalPriceBeforeDiscount * 100) / 100,
		priceAfterDiscount,
		zonesTraversed,
	};
}

/**
 * Create a non-transversal result for trips that don't qualify
 */
function createNonTransversalResult(): TransversalDecompositionResult {
	return {
		isTransversal: false,
		segments: [],
		totalSegments: 0,
		totalTransitDiscount: 0,
		priceBeforeDiscount: 0,
		priceAfterDiscount: 0,
		zonesTraversed: [],
	};
}

// ============================================================================
// Applied Rule Builder
// ============================================================================

/**
 * Applied rule for transversal decomposition transparency
 */
export interface TransversalDecompositionRule extends AppliedRule {
	type: "TRANSVERSAL_DECOMPOSITION";
	description: string;
	isTransversal: boolean;
	totalSegments: number;
	zonesTraversed: string[];
	transitZonesIdentified: string[];
	transitDiscountEnabled: boolean;
	totalTransitDiscount: number;
	priceBeforeDiscount: number;
	priceAfterDiscount: number;
	segments: Array<{
		zoneCode: string;
		zoneName: string;
		distanceKm: number;
		priceMultiplier: number;
		segmentPrice: number;
		isTransitZone: boolean;
		transitDiscountApplied: number;
	}>;
}

/**
 * Applied rule for transit discount
 */
export interface TransitDiscountRule extends AppliedRule {
	type: "TRANSIT_DISCOUNT";
	description: string;
	zoneCode: string;
	zoneName: string;
	discountPercent: number;
	discountAmount: number;
	originalPrice: number;
	discountedPrice: number;
}

/**
 * Build applied rule for transversal decomposition
 *
 * @param result - Transversal decomposition result
 * @param transitZones - List of identified transit zones
 * @param transitDiscountEnabled - Whether transit discount is enabled
 * @returns Applied rule for transparency
 */
export function buildTransversalDecompositionRule(
	result: TransversalDecompositionResult,
	transitZones: string[],
	transitDiscountEnabled: boolean,
): TransversalDecompositionRule {
	const segmentSummary = result.segments.map((s) => ({
		zoneCode: s.zoneCode,
		zoneName: s.zoneName,
		distanceKm: s.distanceKm,
		priceMultiplier: s.priceMultiplier,
		segmentPrice: s.segmentPrice,
		isTransitZone: s.isTransitZone,
		transitDiscountApplied: s.transitDiscountApplied,
	}));

	const description = result.isTransversal
		? `Transversal trip decomposed into ${result.totalSegments} segment(s): ${result.zonesTraversed.join(" → ")}. ` +
		  (result.totalTransitDiscount > 0
				? `Transit discount: -${result.totalTransitDiscount.toFixed(2)}€`
				: "No transit discount applied.")
		: "Trip is not transversal (fewer than 3 distinct zones).";

	return {
		type: "TRANSVERSAL_DECOMPOSITION",
		description,
		isTransversal: result.isTransversal,
		totalSegments: result.totalSegments,
		zonesTraversed: result.zonesTraversed,
		transitZonesIdentified: transitZones,
		transitDiscountEnabled,
		totalTransitDiscount: result.totalTransitDiscount,
		priceBeforeDiscount: result.priceBeforeDiscount,
		priceAfterDiscount: result.priceAfterDiscount,
		segments: segmentSummary,
	};
}

/**
 * Build applied rules for individual transit discounts
 *
 * @param result - Transversal decomposition result
 * @param transitDiscountPercent - Configured discount percentage
 * @returns Array of transit discount rules
 */
export function buildTransitDiscountRules(
	result: TransversalDecompositionResult,
	transitDiscountPercent: number,
): TransitDiscountRule[] {
	if (!result.isTransversal) {
		return [];
	}

	return result.segments
		.filter((s) => s.isTransitZone && s.transitDiscountApplied > 0)
		.map((s) => ({
			type: "TRANSIT_DISCOUNT" as const,
			description: `Transit discount applied to ${s.zoneName} (${s.zoneCode}): -${transitDiscountPercent}%`,
			zoneCode: s.zoneCode,
			zoneName: s.zoneName,
			discountPercent: transitDiscountPercent,
			discountAmount: s.transitDiscountApplied,
			originalPrice: s.segmentPrice,
			discountedPrice: Math.round((s.segmentPrice - s.transitDiscountApplied) * 100) / 100,
		}));
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get unique zones from zone segments
 *
 * @param zoneSegments - Zone segments from route segmentation
 * @returns Array of unique zone codes in traversal order
 */
export function getUniqueZonesInOrder(zoneSegments: ZoneSegment[]): string[] {
	if (!zoneSegments || zoneSegments.length === 0) {
		return [];
	}

	const uniqueZones: string[] = [];
	let lastZone = "";

	for (const segment of zoneSegments) {
		if (segment.zoneCode !== lastZone) {
			uniqueZones.push(segment.zoneCode);
			lastZone = segment.zoneCode;
		}
	}

	return uniqueZones;
}

/**
 * Calculate total distance for transversal segments
 *
 * @param result - Transversal decomposition result
 * @returns Total distance in km
 */
export function getTotalTransversalDistance(result: TransversalDecompositionResult): number {
	if (!result.isTransversal) {
		return 0;
	}

	return result.segments.reduce((sum, s) => sum + s.distanceKm, 0);
}

/**
 * Calculate total duration for transversal segments
 *
 * @param result - Transversal decomposition result
 * @returns Total duration in minutes
 */
export function getTotalTransversalDuration(result: TransversalDecompositionResult): number {
	if (!result.isTransversal) {
		return 0;
	}

	return result.segments.reduce((sum, s) => sum + s.durationMinutes, 0);
}
