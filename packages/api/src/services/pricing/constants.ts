/**
 * Pricing Engine Constants
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 */

import type { FuelType, ProfitabilityThresholds, HierarchicalPricingConfig } from "./types";

// ============================================================================
// Timezone Constants
// ============================================================================

export const PARIS_TZ = "Europe/Paris";

// ============================================================================
// Default Fuel Prices
// ============================================================================

export const DEFAULT_FUEL_PRICES: Record<FuelType, number> = {
	DIESEL: 1.789,
	GASOLINE: 1.899,
	LPG: 0.999,
	ELECTRIC: 0.25,
};

// ============================================================================
// Default Cost Parameters
// ============================================================================

export const DEFAULT_COST_PARAMETERS = {
	fuelConsumptionL100km: 8.0,
	fuelPricePerLiter: 1.80,
	tollCostPerKm: 0.15,
	wearCostPerKm: 0.10,
	driverHourlyCost: 25.0,
};

// ============================================================================
// Default Profitability Thresholds
// ============================================================================

export const DEFAULT_PROFITABILITY_THRESHOLDS: ProfitabilityThresholds = {
	greenThreshold: 20,
	orangeThreshold: 0,
};

// ============================================================================
// Default Difficulty Multipliers (Patience Tax)
// ============================================================================

export const DEFAULT_DIFFICULTY_MULTIPLIERS: Record<number, number> = {
	1: 1.00,
	2: 1.02,
	3: 1.05,
	4: 1.08,
	5: 1.10,
};

// ============================================================================
// Default Hierarchical Pricing Config
// ============================================================================

export const DEFAULT_HIERARCHICAL_PRICING_CONFIG: HierarchicalPricingConfig = {
	enabled: true,
	skipLevel1: false,
	skipLevel2: false,
	skipLevel3: false,
	centralZoneCodes: ["PARIS_0", "Z_0", "BUSSY_0"],
};
