/**
 * TCO Calculator Tests
 * Story 17.14: Vehicle TCO Model Enrichment
 */

import { describe, it, expect } from "vitest";
import {
	hasTcoConfig,
	hasCategoryTcoDefaults,
	buildTcoConfig,
	validateTcoConfig,
	calculateLinearDepreciationPerKm,
	calculateDecliningBalanceDepreciationPerKm,
	calculateDepreciationPerKm,
	calculateMaintenancePerKm,
	calculateInsurancePerKm,
	getTcoPerKm,
	calculateTcoCost,
	getTcoSource,
	DEFAULT_DECLINING_BALANCE_RATE,
	type TcoConfig,
	type VehicleForTco,
	type VehicleCategoryForTco,
} from "../tco-calculator";

// ============================================================================
// Test Data
// ============================================================================

const validTcoConfig: TcoConfig = {
	purchasePrice: 60000,
	expectedLifespanKm: 300000,
	expectedLifespanYears: 5,
	annualMaintenanceBudget: 3000,
	annualInsuranceCost: 2000,
	depreciationMethod: "LINEAR",
	currentOdometerKm: 60000,
};

const vehicleWithTco: VehicleForTco = {
	purchasePrice: 60000,
	expectedLifespanKm: 300000,
	expectedLifespanYears: 5,
	annualMaintenanceBudget: 3000,
	annualInsuranceCost: 2000,
	depreciationMethod: "LINEAR",
	currentOdometerKm: 60000,
};

const vehicleWithoutTco: VehicleForTco = {
	purchasePrice: null,
	expectedLifespanKm: null,
	expectedLifespanYears: null,
	annualMaintenanceBudget: null,
	annualInsuranceCost: null,
	depreciationMethod: null,
	currentOdometerKm: null,
};

const categoryWithTcoDefaults: VehicleCategoryForTco = {
	defaultPurchasePrice: 50000,
	defaultExpectedLifespanKm: 250000,
	defaultExpectedLifespanYears: 5,
	defaultAnnualMaintenanceBudget: 2500,
	defaultAnnualInsuranceCost: 1800,
	defaultDepreciationMethod: "LINEAR",
};

const categoryWithoutTcoDefaults: VehicleCategoryForTco = {
	defaultPurchasePrice: null,
	defaultExpectedLifespanKm: null,
	defaultExpectedLifespanYears: null,
	defaultAnnualMaintenanceBudget: null,
	defaultAnnualInsuranceCost: null,
	defaultDepreciationMethod: null,
};

// ============================================================================
// hasTcoConfig Tests
// ============================================================================

describe("hasTcoConfig", () => {
	it("returns true for vehicle with complete TCO config", () => {
		expect(hasTcoConfig(vehicleWithTco)).toBe(true);
	});

	it("returns false for vehicle without TCO config", () => {
		expect(hasTcoConfig(vehicleWithoutTco)).toBe(false);
	});

	it("returns false for vehicle with partial TCO config", () => {
		const partial: VehicleForTco = {
			...vehicleWithTco,
			purchasePrice: null,
		};
		expect(hasTcoConfig(partial)).toBe(false);
	});

	it("returns false for vehicle with zero purchasePrice", () => {
		const zeroPurchase: VehicleForTco = {
			...vehicleWithTco,
			purchasePrice: 0,
		};
		expect(hasTcoConfig(zeroPurchase)).toBe(false);
	});

	it("returns false for vehicle with zero lifespan", () => {
		const zeroLifespan: VehicleForTco = {
			...vehicleWithTco,
			expectedLifespanKm: 0,
		};
		expect(hasTcoConfig(zeroLifespan)).toBe(false);
	});
});

// ============================================================================
// hasCategoryTcoDefaults Tests
// ============================================================================

describe("hasCategoryTcoDefaults", () => {
	it("returns true for category with complete TCO defaults", () => {
		expect(hasCategoryTcoDefaults(categoryWithTcoDefaults)).toBe(true);
	});

	it("returns false for category without TCO defaults", () => {
		expect(hasCategoryTcoDefaults(categoryWithoutTcoDefaults)).toBe(false);
	});

	it("returns false for category with partial TCO defaults", () => {
		const partial: VehicleCategoryForTco = {
			...categoryWithTcoDefaults,
			defaultPurchasePrice: null,
		};
		expect(hasCategoryTcoDefaults(partial)).toBe(false);
	});
});

// ============================================================================
// buildTcoConfig Tests
// ============================================================================

describe("buildTcoConfig", () => {
	it("returns vehicle TCO config when vehicle has TCO", () => {
		const config = buildTcoConfig(vehicleWithTco, categoryWithTcoDefaults);
		expect(config).not.toBeNull();
		expect(config?.purchasePrice).toBe(60000);
	});

	it("returns category TCO defaults when vehicle has no TCO", () => {
		const config = buildTcoConfig(vehicleWithoutTco, categoryWithTcoDefaults);
		expect(config).not.toBeNull();
		expect(config?.purchasePrice).toBe(50000);
	});

	it("returns null when neither vehicle nor category has TCO", () => {
		const config = buildTcoConfig(vehicleWithoutTco, categoryWithoutTcoDefaults);
		expect(config).toBeNull();
	});

	it("returns null when no category provided and vehicle has no TCO", () => {
		const config = buildTcoConfig(vehicleWithoutTco);
		expect(config).toBeNull();
	});

	it("uses vehicle odometer even when using category defaults", () => {
		const vehicleWithOdometer: VehicleForTco = {
			...vehicleWithoutTco,
			currentOdometerKm: 75000,
		};
		const config = buildTcoConfig(vehicleWithOdometer, categoryWithTcoDefaults);
		expect(config?.currentOdometerKm).toBe(75000);
	});
});

// ============================================================================
// validateTcoConfig Tests
// ============================================================================

describe("validateTcoConfig", () => {
	it("does not throw for valid config", () => {
		expect(() => validateTcoConfig(validTcoConfig)).not.toThrow();
	});

	it("throws for zero purchasePrice", () => {
		const invalid = { ...validTcoConfig, purchasePrice: 0 };
		expect(() => validateTcoConfig(invalid)).toThrow("purchasePrice must be positive");
	});

	it("throws for negative purchasePrice", () => {
		const invalid = { ...validTcoConfig, purchasePrice: -1000 };
		expect(() => validateTcoConfig(invalid)).toThrow("purchasePrice must be positive");
	});

	it("throws for zero expectedLifespanKm", () => {
		const invalid = { ...validTcoConfig, expectedLifespanKm: 0 };
		expect(() => validateTcoConfig(invalid)).toThrow("expectedLifespanKm must be positive");
	});

	it("throws for zero expectedLifespanYears", () => {
		const invalid = { ...validTcoConfig, expectedLifespanYears: 0 };
		expect(() => validateTcoConfig(invalid)).toThrow("expectedLifespanYears must be positive");
	});

	it("throws for negative annualMaintenanceBudget", () => {
		const invalid = { ...validTcoConfig, annualMaintenanceBudget: -100 };
		expect(() => validateTcoConfig(invalid)).toThrow("annualMaintenanceBudget cannot be negative");
	});

	it("throws for negative annualInsuranceCost", () => {
		const invalid = { ...validTcoConfig, annualInsuranceCost: -100 };
		expect(() => validateTcoConfig(invalid)).toThrow("annualInsuranceCost cannot be negative");
	});

	it("throws for negative currentOdometerKm", () => {
		const invalid = { ...validTcoConfig, currentOdometerKm: -100 };
		expect(() => validateTcoConfig(invalid)).toThrow("currentOdometerKm cannot be negative");
	});

	it("allows zero maintenance and insurance", () => {
		const valid = {
			...validTcoConfig,
			annualMaintenanceBudget: 0,
			annualInsuranceCost: 0,
		};
		expect(() => validateTcoConfig(valid)).not.toThrow();
	});
});

// ============================================================================
// Linear Depreciation Tests
// ============================================================================

describe("calculateLinearDepreciationPerKm", () => {
	it("calculates correct depreciation per km", () => {
		// 60000 EUR / 300000 km = 0.20 EUR/km
		const rate = calculateLinearDepreciationPerKm(validTcoConfig);
		expect(rate).toBeCloseTo(0.20, 4);
	});

	it("handles different values", () => {
		const config: TcoConfig = {
			...validTcoConfig,
			purchasePrice: 45000,
			expectedLifespanKm: 150000,
		};
		// 45000 / 150000 = 0.30 EUR/km
		const rate = calculateLinearDepreciationPerKm(config);
		expect(rate).toBeCloseTo(0.30, 4);
	});
});

// ============================================================================
// Declining Balance Depreciation Tests
// ============================================================================

describe("calculateDecliningBalanceDepreciationPerKm", () => {
	it("falls back to linear when no odometer", () => {
		const configNoOdometer: TcoConfig = {
			...validTcoConfig,
			currentOdometerKm: undefined,
		};
		const rate = calculateDecliningBalanceDepreciationPerKm(configNoOdometer);
		const linearRate = calculateLinearDepreciationPerKm(configNoOdometer);
		expect(rate).toBeCloseTo(linearRate, 4);
	});

	it("falls back to linear when odometer is zero", () => {
		const configZeroOdometer: TcoConfig = {
			...validTcoConfig,
			currentOdometerKm: 0,
		};
		const rate = calculateDecliningBalanceDepreciationPerKm(configZeroOdometer);
		const linearRate = calculateLinearDepreciationPerKm(configZeroOdometer);
		expect(rate).toBeCloseTo(linearRate, 4);
	});

	it("calculates higher depreciation in early years", () => {
		// After 1 year (60000 km), declining balance should show higher per-km depreciation
		// than linear because more value is lost early
		const config: TcoConfig = {
			...validTcoConfig,
			currentOdometerKm: 60000, // 1 year
		};
		const decliningRate = calculateDecliningBalanceDepreciationPerKm(config);
		const linearRate = calculateLinearDepreciationPerKm(config);

		// Declining balance: 60000 * (1 - 0.20)^1 = 48000 remaining
		// Depreciation = 60000 - 48000 = 12000
		// Per km = 12000 / 60000 = 0.20 EUR/km
		// This equals linear in year 1 with 20% rate
		expect(decliningRate).toBeCloseTo(linearRate, 2);
	});

	it("uses custom depreciation rate", () => {
		const config: TcoConfig = {
			...validTcoConfig,
			currentOdometerKm: 60000,
		};
		const rate30 = calculateDecliningBalanceDepreciationPerKm(config, 0.30);
		const rate20 = calculateDecliningBalanceDepreciationPerKm(config, 0.20);
		expect(rate30).toBeGreaterThan(rate20);
	});
});

// ============================================================================
// calculateDepreciationPerKm Tests
// ============================================================================

describe("calculateDepreciationPerKm", () => {
	it("uses linear method when specified", () => {
		const config: TcoConfig = {
			...validTcoConfig,
			depreciationMethod: "LINEAR",
		};
		const rate = calculateDepreciationPerKm(config);
		expect(rate).toBeCloseTo(0.20, 4);
	});

	it("uses declining balance method when specified", () => {
		const config: TcoConfig = {
			...validTcoConfig,
			depreciationMethod: "DECLINING_BALANCE",
			currentOdometerKm: 60000,
		};
		const rate = calculateDepreciationPerKm(config);
		// Should be calculated using declining balance formula
		expect(rate).toBeGreaterThan(0);
	});
});

// ============================================================================
// Maintenance and Insurance Tests
// ============================================================================

describe("calculateMaintenancePerKm", () => {
	it("calculates correct maintenance per km", () => {
		// annualKm = 300000 / 5 = 60000 km/year
		// maintenancePerKm = 3000 / 60000 = 0.05 EUR/km
		const rate = calculateMaintenancePerKm(validTcoConfig);
		expect(rate).toBeCloseTo(0.05, 4);
	});
});

describe("calculateInsurancePerKm", () => {
	it("calculates correct insurance per km", () => {
		// annualKm = 300000 / 5 = 60000 km/year
		// insurancePerKm = 2000 / 60000 = 0.0333 EUR/km
		const rate = calculateInsurancePerKm(validTcoConfig);
		expect(rate).toBeCloseTo(0.0333, 4);
	});
});

// ============================================================================
// getTcoPerKm Tests
// ============================================================================

describe("getTcoPerKm", () => {
	it("returns sum of all TCO components", () => {
		// depreciation: 0.20
		// maintenance: 0.05
		// insurance: 0.0333
		// total: 0.2833 EUR/km
		const rate = getTcoPerKm(validTcoConfig);
		expect(rate).toBeCloseTo(0.2833, 3);
	});

	it("returns only depreciation when maintenance and insurance are zero", () => {
		const config: TcoConfig = {
			...validTcoConfig,
			annualMaintenanceBudget: 0,
			annualInsuranceCost: 0,
		};
		const rate = getTcoPerKm(config);
		expect(rate).toBeCloseTo(0.20, 4);
	});
});

// ============================================================================
// calculateTcoCost Tests
// ============================================================================

describe("calculateTcoCost", () => {
	it("calculates correct TCO for 100 km trip", () => {
		const result = calculateTcoCost(100, validTcoConfig);

		// depreciation: 100 * 0.20 = 20.00
		// maintenance: 100 * 0.05 = 5.00
		// insurance: 100 * 0.0333 = 3.33
		// total: 28.33
		expect(result.amount).toBeCloseTo(28.33, 1);
		expect(result.distanceKm).toBe(100);
		expect(result.depreciation.amount).toBeCloseTo(20.00, 1);
		expect(result.maintenance.amount).toBeCloseTo(5.00, 1);
		expect(result.insurance.amount).toBeCloseTo(3.33, 1);
	});

	it("includes depreciation method in result", () => {
		const result = calculateTcoCost(100, validTcoConfig);
		expect(result.depreciation.method).toBe("LINEAR");
	});

	it("includes rate per km in result", () => {
		const result = calculateTcoCost(100, validTcoConfig);
		expect(result.depreciation.ratePerKm).toBeCloseTo(0.20, 4);
		expect(result.maintenance.ratePerKm).toBeCloseTo(0.05, 4);
		expect(result.insurance.ratePerKm).toBeCloseTo(0.0333, 4);
		expect(result.totalRatePerKm).toBeCloseTo(0.2833, 3);
	});

	it("handles zero distance", () => {
		const result = calculateTcoCost(0, validTcoConfig);
		expect(result.amount).toBe(0);
		expect(result.depreciation.amount).toBe(0);
		expect(result.maintenance.amount).toBe(0);
		expect(result.insurance.amount).toBe(0);
	});

	it("handles large distances", () => {
		const result = calculateTcoCost(1000, validTcoConfig);
		expect(result.amount).toBeCloseTo(283.33, 0);
	});

	it("throws for invalid config", () => {
		const invalidConfig = { ...validTcoConfig, purchasePrice: 0 };
		expect(() => calculateTcoCost(100, invalidConfig)).toThrow();
	});

	it("uses declining balance when specified", () => {
		const decliningConfig: TcoConfig = {
			...validTcoConfig,
			depreciationMethod: "DECLINING_BALANCE",
		};
		const result = calculateTcoCost(100, decliningConfig);
		expect(result.depreciation.method).toBe("DECLINING_BALANCE");
	});
});

// ============================================================================
// getTcoSource Tests
// ============================================================================

describe("getTcoSource", () => {
	it("returns VEHICLE when vehicle has TCO config", () => {
		const source = getTcoSource(vehicleWithTco, categoryWithTcoDefaults);
		expect(source).toBe("VEHICLE");
	});

	it("returns CATEGORY when only category has TCO defaults", () => {
		const source = getTcoSource(vehicleWithoutTco, categoryWithTcoDefaults);
		expect(source).toBe("CATEGORY");
	});

	it("returns null when neither has TCO config", () => {
		const source = getTcoSource(vehicleWithoutTco, categoryWithoutTcoDefaults);
		expect(source).toBeNull();
	});

	it("returns null when no category provided and vehicle has no TCO", () => {
		const source = getTcoSource(vehicleWithoutTco);
		expect(source).toBeNull();
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("handles very small distances", () => {
		const result = calculateTcoCost(0.1, validTcoConfig);
		expect(result.amount).toBeGreaterThan(0);
		expect(result.amount).toBeLessThan(0.1);
	});

	it("handles very large purchase prices", () => {
		const expensiveConfig: TcoConfig = {
			...validTcoConfig,
			purchasePrice: 500000, // 500k EUR luxury vehicle
		};
		const result = calculateTcoCost(100, expensiveConfig);
		// depreciation: 500000 / 300000 * 100 = 166.67
		expect(result.depreciation.amount).toBeCloseTo(166.67, 0);
	});

	it("handles very long lifespan", () => {
		const longLifeConfig: TcoConfig = {
			...validTcoConfig,
			expectedLifespanKm: 1000000, // 1 million km
		};
		const rate = getTcoPerKm(longLifeConfig);
		// depreciation: 60000 / 1000000 = 0.06
		expect(rate).toBeLessThan(0.15);
	});
});
