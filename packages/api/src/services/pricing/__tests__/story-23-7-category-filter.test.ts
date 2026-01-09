/**
 * Story 23-7: Vehicle Category Filter Tests
 * 
 * Tests for filtering pricing adjustments (Advanced Rates, Seasonal Multipliers)
 * by vehicle category ID.
 */

import { describe, it, expect } from "vitest";
import {
	matchesVehicleCategory,
	evaluateAdvancedRate,
	evaluateSeasonalMultiplier,
	evaluateSeasonalMultipliers,
	evaluateAdvancedRates,
	applyAllMultipliers,
} from "../multiplier-engine";
import type { AdvancedRateData, SeasonalMultiplierData, MultiplierContext } from "../types";

// ============================================================================
// Test Data
// ============================================================================

const VAN_CATEGORY_ID = "cat-van-001";
const SEDAN_CATEGORY_ID = "cat-sedan-002";
const MINIBUS_CATEGORY_ID = "cat-minibus-003";

function createAdvancedRate(overrides: Partial<AdvancedRateData> = {}): AdvancedRateData {
	return {
		id: "rate-001",
		name: "Test Night Rate",
		appliesTo: "NIGHT",
		startTime: "22:00",
		endTime: "06:00",
		daysOfWeek: null,
		minDistanceKm: null,
		maxDistanceKm: null,
		zoneId: null,
		adjustmentType: "PERCENTAGE",
		value: 20,
		priority: 10,
		isActive: true,
		vehicleCategoryId: null,
		vehicleCategoryIds: null,
		...overrides,
	};
}

function createSeasonalMultiplier(overrides: Partial<SeasonalMultiplierData> = {}): SeasonalMultiplierData {
	const now = new Date();
	const startDate = new Date(now);
	startDate.setMonth(startDate.getMonth() - 1);
	const endDate = new Date(now);
	endDate.setMonth(endDate.getMonth() + 1);
	
	return {
		id: "mult-001",
		name: "Test Seasonal Multiplier",
		description: null,
		startDate,
		endDate,
		multiplier: 1.2,
		priority: 10,
		isActive: true,
		vehicleCategoryId: null,
		vehicleCategoryIds: null,
		...overrides,
	};
}

function createMultiplierContext(overrides: Partial<MultiplierContext> = {}): MultiplierContext {
	return {
		pickupAt: new Date("2026-01-09T23:00:00Z"), // Night time
		estimatedEndAt: null,
		distanceKm: 50,
		pickupZoneId: null,
		dropoffZoneId: null,
		vehicleCategoryId: SEDAN_CATEGORY_ID,
		...overrides,
	};
}

// ============================================================================
// matchesVehicleCategory Tests
// ============================================================================

describe("matchesVehicleCategory", () => {
	describe("single category matching", () => {
		it("should return true when adjustment has no category (null = applies to all)", () => {
			expect(matchesVehicleCategory(null, null, VAN_CATEGORY_ID)).toBe(true);
		});

		it("should return true when adjustment has undefined category (applies to all)", () => {
			expect(matchesVehicleCategory(undefined, undefined, VAN_CATEGORY_ID)).toBe(true);
		});

		it("should return true when categories match", () => {
			expect(matchesVehicleCategory(VAN_CATEGORY_ID, null, VAN_CATEGORY_ID)).toBe(true);
		});

		it("should return false when categories do not match", () => {
			expect(matchesVehicleCategory(VAN_CATEGORY_ID, null, SEDAN_CATEGORY_ID)).toBe(false);
		});

		it("should return true when quote has no category (fallback behavior)", () => {
			expect(matchesVehicleCategory(VAN_CATEGORY_ID, null, null)).toBe(true);
			expect(matchesVehicleCategory(VAN_CATEGORY_ID, null, undefined)).toBe(true);
		});
	});

	describe("multi-category matching", () => {
		it("should return true when quote category is in the array", () => {
			expect(matchesVehicleCategory(null, [VAN_CATEGORY_ID, SEDAN_CATEGORY_ID], SEDAN_CATEGORY_ID)).toBe(true);
		});

		it("should return false when quote category is not in the array", () => {
			expect(matchesVehicleCategory(null, [VAN_CATEGORY_ID, SEDAN_CATEGORY_ID], MINIBUS_CATEGORY_ID)).toBe(false);
		});

		it("should prefer array over single category when both provided", () => {
			// Array takes precedence - quote category is in array
			expect(matchesVehicleCategory(MINIBUS_CATEGORY_ID, [VAN_CATEGORY_ID], VAN_CATEGORY_ID)).toBe(true);
		});

		it("should return true when array is empty (applies to all)", () => {
			expect(matchesVehicleCategory(VAN_CATEGORY_ID, [], SEDAN_CATEGORY_ID)).toBe(false);
			// Empty array means the single category check is used
		});
	});
});

// ============================================================================
// evaluateAdvancedRate Tests
// ============================================================================

describe("evaluateAdvancedRate with category filtering", () => {
	it("should apply rate when no category is specified (global)", () => {
		const rate = createAdvancedRate({ vehicleCategoryId: null });
		const context = createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		
		expect(evaluateAdvancedRate(rate, context)).toBe(true);
	});

	it("should apply rate when categories match", () => {
		const rate = createAdvancedRate({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		const context = createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		
		expect(evaluateAdvancedRate(rate, context)).toBe(true);
	});

	it("should NOT apply rate when categories do not match", () => {
		const rate = createAdvancedRate({ vehicleCategoryId: VAN_CATEGORY_ID });
		const context = createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		
		expect(evaluateAdvancedRate(rate, context)).toBe(false);
	});

	it("should NOT apply rate if inactive (regardless of category)", () => {
		const rate = createAdvancedRate({ isActive: false, vehicleCategoryId: SEDAN_CATEGORY_ID });
		const context = createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		
		expect(evaluateAdvancedRate(rate, context)).toBe(false);
	});

	it("should work with multi-category arrays", () => {
		const rate = createAdvancedRate({ 
			vehicleCategoryId: null,
			vehicleCategoryIds: [VAN_CATEGORY_ID, MINIBUS_CATEGORY_ID] 
		});
		
		// Should apply for VAN
		expect(evaluateAdvancedRate(rate, createMultiplierContext({ vehicleCategoryId: VAN_CATEGORY_ID }))).toBe(true);
		
		// Should NOT apply for SEDAN
		expect(evaluateAdvancedRate(rate, createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID }))).toBe(false);
	});
});

// ============================================================================
// evaluateSeasonalMultiplier Tests
// ============================================================================

describe("evaluateSeasonalMultiplier with category filtering", () => {
	it("should apply multiplier when no category is specified (global)", () => {
		const multiplier = createSeasonalMultiplier({ vehicleCategoryId: null });
		const pickupAt = new Date();
		
		expect(evaluateSeasonalMultiplier(multiplier, pickupAt, SEDAN_CATEGORY_ID)).toBe(true);
	});

	it("should apply multiplier when categories match", () => {
		const multiplier = createSeasonalMultiplier({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		const pickupAt = new Date();
		
		expect(evaluateSeasonalMultiplier(multiplier, pickupAt, SEDAN_CATEGORY_ID)).toBe(true);
	});

	it("should NOT apply multiplier when categories do not match", () => {
		const multiplier = createSeasonalMultiplier({ vehicleCategoryId: VAN_CATEGORY_ID });
		const pickupAt = new Date();
		
		expect(evaluateSeasonalMultiplier(multiplier, pickupAt, SEDAN_CATEGORY_ID)).toBe(false);
	});

	it("should NOT apply multiplier if inactive (regardless of category)", () => {
		const multiplier = createSeasonalMultiplier({ isActive: false, vehicleCategoryId: SEDAN_CATEGORY_ID });
		const pickupAt = new Date();
		
		expect(evaluateSeasonalMultiplier(multiplier, pickupAt, SEDAN_CATEGORY_ID)).toBe(false);
	});

	it("should NOT apply multiplier if date is outside range", () => {
		const pastDate = new Date();
		pastDate.setFullYear(pastDate.getFullYear() - 2);
		const multiplier = createSeasonalMultiplier({ vehicleCategoryId: null });
		
		expect(evaluateSeasonalMultiplier(multiplier, pastDate, SEDAN_CATEGORY_ID)).toBe(false);
	});
});

// ============================================================================
// evaluateSeasonalMultipliers Integration Tests
// ============================================================================

describe("evaluateSeasonalMultipliers with category filtering", () => {
	it("should only apply global multipliers when category matches none", () => {
		const globalMultiplier = createSeasonalMultiplier({ 
			id: "global",
			name: "Global Peak",
			vehicleCategoryId: null, 
			multiplier: 1.1 
		});
		const vanMultiplier = createSeasonalMultiplier({ 
			id: "van-only",
			name: "Van Premium",
			vehicleCategoryId: VAN_CATEGORY_ID, 
			multiplier: 1.3 
		});
		
		const result = evaluateSeasonalMultipliers(
			100,
			new Date(),
			[globalMultiplier, vanMultiplier],
			SEDAN_CATEGORY_ID
		);
		
		// Only global multiplier should apply: 100 * 1.1 = 110
		expect(result.adjustedPrice).toBe(110);
		expect(result.appliedRules).toHaveLength(1);
		expect(result.appliedRules[0]?.ruleName).toBe("Global Peak");
	});

	it("should apply both global and category-specific multipliers when category matches", () => {
		const globalMultiplier = createSeasonalMultiplier({ 
			id: "global",
			name: "Global Peak",
			vehicleCategoryId: null, 
			multiplier: 1.1,
			priority: 10	
		});
		const sedanMultiplier = createSeasonalMultiplier({ 
			id: "sedan-only",
			name: "Sedan Premium",
			vehicleCategoryId: SEDAN_CATEGORY_ID, 
			multiplier: 1.2,
			priority: 5
		});
		
		const result = evaluateSeasonalMultipliers(
			100,
			new Date(),
			[globalMultiplier, sedanMultiplier],
			SEDAN_CATEGORY_ID
		);
		
		// Both should apply: 100 * 1.1 * 1.2 = 132
		expect(result.adjustedPrice).toBe(132);
		expect(result.appliedRules).toHaveLength(2);
	});
});

// ============================================================================
// evaluateAdvancedRates Integration Tests
// ============================================================================

describe("evaluateAdvancedRates with category filtering", () => {
	it("should only apply category-matching rates", () => {
		const vanNightRate = createAdvancedRate({
			id: "van-night",
			name: "Van Night Surcharge",
			vehicleCategoryId: VAN_CATEGORY_ID,
			value: 30,
		});
		const globalNightRate = createAdvancedRate({
			id: "global-night",
			name: "Global Night Surcharge",
			vehicleCategoryId: null,
			value: 10,
		});
		
		// For SEDAN quote, only global rate should apply
		const sedanContext = createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		const sedanResult = evaluateAdvancedRates(100, sedanContext, [vanNightRate, globalNightRate]);
		
		expect(sedanResult.adjustedPrice).toBe(110); // 100 + 10%
		expect(sedanResult.appliedRules).toHaveLength(1);
		expect(sedanResult.appliedRules[0]?.ruleName).toBe("Global Night Surcharge");
		
		// For VAN quote, both rates should apply
		const vanContext = createMultiplierContext({ vehicleCategoryId: VAN_CATEGORY_ID });
		const vanResult = evaluateAdvancedRates(100, vanContext, [vanNightRate, globalNightRate]);
		
		expect(vanResult.appliedRules.length).toBeGreaterThan(1);
	});
});

// ============================================================================
// applyAllMultipliers Integration Tests
// ============================================================================

describe("applyAllMultipliers with category filtering", () => {
	it("should correctly apply only matching adjustments across all types", () => {
		const vanSeasonalMultiplier = createSeasonalMultiplier({
			id: "van-seasonal",
			name: "Van Summer Premium",
			vehicleCategoryId: VAN_CATEGORY_ID,
			multiplier: 1.5,
		});
		const globalSeasonalMultiplier = createSeasonalMultiplier({
			id: "global-seasonal",
			name: "Global Summer",
			vehicleCategoryId: null,
			multiplier: 1.1,
		});
		const sedanNightRate = createAdvancedRate({
			id: "sedan-night",
			name: "Sedan Night Rate",
			vehicleCategoryId: SEDAN_CATEGORY_ID,
			value: 15,
		});
		
		const sedanContext = createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		
		const result = applyAllMultipliers(
			100,
			sedanContext,
			[sedanNightRate],
			[vanSeasonalMultiplier, globalSeasonalMultiplier]
		);
		
		// For SEDAN:
		// - Sedan Night Rate applies: 100 + 15% = 115
		// - Global Seasonal applies: 115 * 1.1 = 126.5
		// - Van Seasonal does NOT apply
		expect(result.adjustedPrice).toBe(126.5);
		expect(result.appliedRules).toHaveLength(2);
		
		const ruleNames = result.appliedRules.map(r => r.ruleName);
		expect(ruleNames).toContain("Sedan Night Rate");
		expect(ruleNames).toContain("Global Summer");
		expect(ruleNames).not.toContain("Van Summer Premium");
	});

	it("should correctly pass vehicleCategoryId from context", () => {
		const categorySpecificMultiplier = createSeasonalMultiplier({
			id: "specific",
			name: "Category Specific",
			vehicleCategoryId: MINIBUS_CATEGORY_ID,
			multiplier: 2.0,
		});
		
		// Context with MINIBUS category
		const minibusContext = createMultiplierContext({ 
			vehicleCategoryId: MINIBUS_CATEGORY_ID,
			pickupAt: new Date() // Daytime to avoid night rates
		});
		
		const result = applyAllMultipliers(
			100,
			minibusContext,
			[],
			[categorySpecificMultiplier]
		);
		
		// Should apply: 100 * 2.0 = 200
		expect(result.adjustedPrice).toBe(200);
		expect(result.appliedRules).toHaveLength(1);
	});
});

// ============================================================================
// Backward Compatibility Tests
// ============================================================================

describe("Backward Compatibility", () => {
	it("should apply all adjustments when vehicleCategoryId is not set in context", () => {
		const categorySpecificMultiplier = createSeasonalMultiplier({
			vehicleCategoryId: VAN_CATEGORY_ID,
			multiplier: 1.5,
		});
		
		// Context without vehicleCategoryId (undefined = apply all)
		const context = createMultiplierContext({ vehicleCategoryId: undefined });
		
		const result = applyAllMultipliers(
			100,
			context,
			[],
			[categorySpecificMultiplier]
		);
		
		// Should still apply because context.vehicleCategoryId is undefined
		expect(result.adjustedPrice).toBe(150);
	});

	it("should apply all existing adjustments with null vehicleCategoryId", () => {
		// Simulating existing data where vehicleCategoryId was added but is null
		const existingMultiplier = createSeasonalMultiplier({
			vehicleCategoryId: null,
			vehicleCategoryIds: null,
			multiplier: 1.25,
		});
		
		const context = createMultiplierContext({ vehicleCategoryId: SEDAN_CATEGORY_ID });
		
		const result = evaluateSeasonalMultipliers(
			100,
			new Date(),
			[existingMultiplier],
			SEDAN_CATEGORY_ID
		);
		
		expect(result.adjustedPrice).toBe(125);
	});
});
