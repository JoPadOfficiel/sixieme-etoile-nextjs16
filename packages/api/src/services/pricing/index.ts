/**
 * Pricing Engine Module
 * Story 19-15: Modular architecture for pricing engine
 * 
 * This file re-exports all public functions and types from the pricing modules
 * for backward compatibility with existing imports.
 * 
 * Architecture:
 * - types.ts: All type definitions and interfaces
 * - constants.ts: All constants and default values
 * - ../pricing-engine.ts: All functions (to be extracted into separate modules)
 * 
 * Future modules (to be extracted):
 * - cost-calculator.ts: Cost calculation functions
 * - zone-resolver.ts: Zone resolution and multiplier logic
 * - grid-matcher.ts: Grid matching (ZoneRoute, Excursion, Dispo)
 * - dynamic-pricing.ts: Dynamic pricing calculation
 * - multiplier-engine.ts: Multiplier application
 * - shadow-calculator.ts: Shadow calculation (segments A/B/C)
 * - profitability.ts: Profitability indicators
 * - trip-type-pricing.ts: Trip type specific pricing
 * - main-engine.ts: Main calculatePrice function
 */

// ============================================================================
// Types - Extracted to separate module
// ============================================================================

export * from "./types";

// ============================================================================
// Constants - Extracted to separate module
// ============================================================================

export * from "./constants";

// ============================================================================
// Functions - Re-exported from original pricing-engine.ts
// These will be progressively extracted into separate modules
// ============================================================================

// Re-export all functions from the original pricing-engine.ts
// This maintains backward compatibility while we transition to modular architecture
export {
	// Cost calculation functions
	calculateFuelCost,
	calculateTollCost,
	calculateWearCost,
	calculateDriverCost,
	calculateCostBreakdown,
	calculateCostBreakdownWithTolls,
	calculateCostBreakdownWithTco,
	calculateInternalCost,
	estimateInternalCost,
	calculateZoneSurcharges,
	createTcoAppliedRule,
	
	// Zone functions
	applyZoneMultiplier,
	calculateEffectiveZoneMultiplier,
	
	// Dynamic pricing functions
	calculateDynamicBasePrice,
	resolveRates,
	resolveFuelType,
	getFuelPrice,
	resolveFuelConsumption,
	
	// Multiplier functions
	applyAllMultipliers,
	evaluateAdvancedRates,
	evaluateSeasonalMultipliers,
	applyAdvancedRateAdjustment,
	evaluateAdvancedRate,
	applySeasonalMultiplier,
	evaluateSeasonalMultiplier,
	applyVehicleCategoryMultiplier,
	applyClientDifficultyMultiplier,
	applyRoundTripMultiplier,
	
	// Time/date functions
	isTimeInRange,
	isDayInRange,
	isNightTime,
	isWeekend,
	isLongDistance,
	isWithinDateRange,
	calculateNightOverlapMinutes,
	calculateWeightedNightRate,
	
	// Shadow calculation functions
	calculateShadowSegments,
	buildShadowInputFromVehicleSelection,
	
	// Excursion functions
	calculateExcursionLegs,
	buildExcursionTripAnalysis,
	
	// Trip type pricing functions
	applyTripTypePricing,
	calculateExcursionPrice,
	calculateExcursionReturnCost,
	calculateDispoPrice,
	calculateDispoPriceWithBuckets,
	calculateSmartDispoPrice,
	
	// Profitability functions
	calculateProfitabilityIndicator,
	getProfitabilityIndicatorData,
	getProfitabilityLabel,
	getProfitabilityDescription,
	getThresholdsFromSettings,
	calculateProfitabilityWithCommission,
	
	// Compliance functions
	integrateComplianceIntoPricing,
	calculateEstimatedEndAt,
	
	// Commission re-exports
	calculateCommission,
	calculateEffectiveMargin,
	getCommissionData,
	hasCommission,
	getCommissionPercent,
} from "../pricing-engine";
