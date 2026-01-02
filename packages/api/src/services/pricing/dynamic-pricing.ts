/**
 * Dynamic Pricing Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * 
 * This module handles dynamic pricing calculation:
 * - Base price calculation (distance vs duration)
 * - Rate resolution with fallback chain
 * - Fuel type resolution
 */

import type {
	OrganizationPricingSettings,
	VehicleCategoryInfo,
	FuelType,
	RateSource,
	ResolvedRates,
	DynamicBaseCalculationResult,
} from "./types";

// ============================================================================
// Rate Resolution
// ============================================================================

/**
 * Story 15.4: Resolve rates with fallback chain
 * Priority: Category → Organization
 * 
 * @param vehicleCategory - Category with optional rates
 * @param orgSettings - Organization pricing settings (fallback)
 * @returns Resolved rates with source
 */
export function resolveRates(
	vehicleCategory: VehicleCategoryInfo | undefined,
	orgSettings: { baseRatePerKm: number; baseRatePerHour: number },
): ResolvedRates {
	if (
		vehicleCategory?.defaultRatePerKm != null &&
		vehicleCategory?.defaultRatePerHour != null
	) {
		return {
			ratePerKm: vehicleCategory.defaultRatePerKm,
			ratePerHour: vehicleCategory.defaultRatePerHour,
			rateSource: "CATEGORY",
			usedCategoryRates: true,
		};
	}

	return {
		ratePerKm: orgSettings.baseRatePerKm,
		ratePerHour: orgSettings.baseRatePerHour,
		rateSource: "ORGANIZATION",
		usedCategoryRates: false,
	};
}

// ============================================================================
// Fuel Type Resolution
// ============================================================================

/**
 * Story 15.6: Resolve fuel type with fallback to DIESEL
 * 
 * @param vehicleCategory - Category with optional fuel type
 * @returns Resolved fuel type (defaults to DIESEL)
 */
export function resolveFuelType(
	vehicleCategory: VehicleCategoryInfo | undefined,
): FuelType {
	return vehicleCategory?.fuelType ?? "DIESEL";
}

// ============================================================================
// Dynamic Base Price Calculation
// ============================================================================

/**
 * Story 4.1: Calculate dynamic base price
 * Uses max of (distance * ratePerKm) and (duration * ratePerHour)
 * Then applies target margin
 * 
 * @param distanceKm - Distance in kilometers
 * @param durationMinutes - Duration in minutes
 * @param settings - Organization pricing settings
 * @param categoryRates - Optional category-specific rates
 * @returns Detailed calculation result
 */
export function calculateDynamicBasePrice(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	categoryRates?: { ratePerKm: number; ratePerHour: number; rateSource: RateSource } | null,
): DynamicBaseCalculationResult {
	const durationHours = durationMinutes / 60;
	const ratePerKm = categoryRates?.ratePerKm ?? settings.baseRatePerKm;
	const ratePerHour = categoryRates?.ratePerHour ?? settings.baseRatePerHour;
	const rateSource: RateSource = categoryRates?.rateSource ?? "ORGANIZATION";

	const distanceBasedPrice = Math.round(distanceKm * ratePerKm * 100) / 100;
	const durationBasedPrice = Math.round(durationHours * ratePerHour * 100) / 100;

	const selectedMethod: "distance" | "duration" = 
		distanceBasedPrice >= durationBasedPrice ? "distance" : "duration";
	const basePrice = Math.max(distanceBasedPrice, durationBasedPrice);

	const priceWithMargin = Math.round(basePrice * (1 + settings.targetMarginPercent / 100) * 100) / 100;

	return {
		distanceBasedPrice,
		durationBasedPrice,
		selectedMethod,
		basePrice,
		priceWithMargin,
		inputs: {
			distanceKm,
			durationMinutes,
			baseRatePerKm: ratePerKm,
			baseRatePerHour: ratePerHour,
			targetMarginPercent: settings.targetMarginPercent,
			rateSource,
		},
	};
}
