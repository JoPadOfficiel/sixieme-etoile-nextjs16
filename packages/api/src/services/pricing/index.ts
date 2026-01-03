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
 * - cost-calculator.ts: Cost calculation functions
 * - zone-resolver.ts: Zone resolution and multiplier logic
 * - dynamic-pricing.ts: Dynamic pricing calculation
 * - multiplier-engine.ts: Multiplier application
 * - profitability.ts: Profitability indicators
 * - shadow-calculator.ts: Shadow calculation (segments A/B/C)
 * - trip-type-pricing.ts: Trip type specific pricing
 */

// ============================================================================
// Types
// ============================================================================

export * from "./types";

// ============================================================================
// Constants
// ============================================================================

export * from "./constants";

// ============================================================================
// Cost Calculator Module
// ============================================================================

export {
	getFuelPrice,
	resolveFuelConsumption,
	calculateFuelCost,
	calculateTollCost,
	calculateWearCost,
	calculateDriverCost,
	calculateZoneSurcharges,
	calculateCostBreakdown,
	calculateCostBreakdownWithTolls,
	calculateCostBreakdownWithRealCosts,
	calculateCostBreakdownWithTco,
	createTcoAppliedRule,
	calculateInternalCost,
	estimateInternalCost,
	combineCostBreakdowns,
	type RealCostConfig,
	type CostBreakdownWithRealCostsResult,
} from "./cost-calculator";

// ============================================================================
// Zone Resolver Module
// ============================================================================

export {
	calculateEffectiveZoneMultiplier,
	applyZoneMultiplier,
} from "./zone-resolver";

// ============================================================================
// Dynamic Pricing Module
// ============================================================================

export {
	resolveRates,
	resolveFuelType,
	calculateDynamicBasePrice,
} from "./dynamic-pricing";

// ============================================================================
// Multiplier Engine Module
// ============================================================================

export {
	isTimeInRange,
	isDayInRange,
	isNightTime,
	isWeekend,
	isLongDistance,
	isWithinDateRange,
	calculateNightOverlapMinutes,
	calculateWeightedNightRate,
	evaluateAdvancedRate,
	applyAdvancedRateAdjustment,
	evaluateAdvancedRates,
	evaluateSeasonalMultiplier,
	applySeasonalMultiplier,
	evaluateSeasonalMultipliers,
	applyAllMultipliers,
	applyVehicleCategoryMultiplier,
	applyClientDifficultyMultiplier,
	applyRoundTripMultiplier,
} from "./multiplier-engine";

// ============================================================================
// Profitability Module
// ============================================================================

export {
	getProfitabilityLabel,
	getProfitabilityDescription,
	calculateProfitabilityIndicator,
	getProfitabilityIndicatorData,
	getThresholdsFromSettings,
	calculateProfitabilityWithCommission,
} from "./profitability";

// ============================================================================
// Shadow Calculator Module
// ============================================================================

export {
	calculateShadowSegments,
	buildShadowInputFromVehicleSelection,
	calculateEstimatedEndAt,
	calculateTimeAnalysis,
} from "./shadow-calculator";

// ============================================================================
// Trip Type Pricing Module
// ============================================================================

export {
	calculateExcursionPrice,
	calculateExcursionReturnCost,
	calculateDispoPrice,
	calculateDispoPriceWithBuckets,
	calculateSmartDispoPrice,
	applyTripTypePricing,
	calculateExcursionLegs,
	buildExcursionTripAnalysis,
} from "./trip-type-pricing";

// ============================================================================
// Commission Service Re-exports
// ============================================================================

export {
	calculateCommission,
	calculateEffectiveMargin,
	getCommissionData,
	hasCommission,
	getCommissionPercent,
} from "../commission-service";

// ============================================================================
// Compliance Integration Re-exports
// ============================================================================

export {
	integrateComplianceInPricing,
} from "../compliance-validator";

// ============================================================================
// Main Calculator Module
// ============================================================================

export {
	calculatePrice,
	calculatePriceWithRealTolls,
	applyPriceOverride,
	type ApplyPriceOverrideResult,
} from "./main-calculator";

// ============================================================================
// Dense Zone Detector Module (Story 18.2 & 18.3)
// ============================================================================

export {
	detectDenseZone,
	calculateMadSuggestion,
	buildAutoSwitchedToMadRule,
	detectRoundTripBlocked,
	calculateRoundTripMadSuggestion,
	buildAutoSwitchedRoundTripToMadRule,
	DEFAULT_DENSE_ZONE_SPEED_THRESHOLD,
	DEFAULT_DENSE_ZONE_CODES,
	DEFAULT_MIN_WAITING_TIME_FOR_SEPARATE_TRANSFERS,
	DEFAULT_MAX_RETURN_DISTANCE_KM,
	DEFAULT_ROUND_TRIP_BUFFER,
} from "./dense-zone-detector";
