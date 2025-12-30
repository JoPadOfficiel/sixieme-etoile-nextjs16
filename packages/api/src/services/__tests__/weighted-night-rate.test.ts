/**
 * Story 17.8: Tests for Weighted Day/Night Rate Application
 */

import { describe, it, expect } from "vitest";
import {
	calculateNightOverlapMinutes,
	calculateWeightedNightRate,
	evaluateAdvancedRates,
	type AdvancedRateData,
	type MultiplierContext,
} from "../pricing-engine";

// Standard night rate configuration: 22:00-06:00, +20%
const nightRate: AdvancedRateData = {
	id: "rate-night",
	name: "Night Surcharge",
	appliesTo: "NIGHT",
	startTime: "22:00",
	endTime: "06:00",
	daysOfWeek: null,
	minDistanceKm: null,
	maxDistanceKm: null,
	zoneId: null,
	adjustmentType: "PERCENTAGE",
	value: 20, // +20%
	priority: 10,
	isActive: true,
};

describe("calculateNightOverlapMinutes", () => {
	describe("Basic Cases", () => {
		it("should return 0 for trip entirely in day period (10:00-14:00)", () => {
			const pickupAt = new Date("2025-01-15T10:00:00");
			const endAt = new Date("2025-01-15T14:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(0);
		});

		it("should return full duration for trip entirely in night period (23:00-02:00)", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const endAt = new Date("2025-01-16T02:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(180); // 3 hours = 180 minutes
		});

		it("should return partial overlap for trip spanning day/night (20:00-23:00)", () => {
			const pickupAt = new Date("2025-01-15T20:00:00");
			const endAt = new Date("2025-01-15T23:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(60); // 1 hour in night (22:00-23:00)
		});

		it("should return 0 for zero duration trip", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const endAt = new Date("2025-01-15T23:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(0);
		});

		it("should return 0 for negative duration trip", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const endAt = new Date("2025-01-15T22:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(0);
		});
	});

	describe("Early Morning Trips", () => {
		it("should handle early morning trip (05:00-08:00)", () => {
			const pickupAt = new Date("2025-01-15T05:00:00");
			const endAt = new Date("2025-01-15T08:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(60); // 1 hour in night (05:00-06:00)
		});

		it("should handle trip starting at night end boundary (06:00-09:00)", () => {
			const pickupAt = new Date("2025-01-15T06:00:00");
			const endAt = new Date("2025-01-15T09:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(0); // 06:00 is not in night period
		});

		it("should handle trip ending at night end boundary (04:00-06:00)", () => {
			const pickupAt = new Date("2025-01-15T04:00:00");
			const endAt = new Date("2025-01-15T06:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(120); // 2 hours in night (04:00-06:00)
		});
	});

	describe("Overnight Trips (Crossing Midnight)", () => {
		it("should handle overnight trip (21:00-01:00)", () => {
			const pickupAt = new Date("2025-01-15T21:00:00");
			const endAt = new Date("2025-01-16T01:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(180); // 3 hours in night (22:00-01:00)
		});

		it("should handle trip starting at night start boundary (22:00-01:00)", () => {
			const pickupAt = new Date("2025-01-15T22:00:00");
			const endAt = new Date("2025-01-16T01:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(180); // 3 hours, all in night
		});

		it("should handle trip spanning entire night period (20:00-08:00)", () => {
			const pickupAt = new Date("2025-01-15T20:00:00");
			const endAt = new Date("2025-01-16T08:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			expect(result).toBe(480); // 8 hours in night (22:00-06:00)
		});
	});

	describe("Multi-Day Trips", () => {
		it("should handle multi-day trip with two night periods", () => {
			// Trip from 20:00 Day 1 to 08:00 Day 3 (36 hours)
			const pickupAt = new Date("2025-01-15T20:00:00");
			const endAt = new Date("2025-01-17T08:00:00");
			const result = calculateNightOverlapMinutes(pickupAt, endAt, "22:00", "06:00");
			// Night 1: 22:00-06:00 = 8 hours
			// Night 2: 22:00-06:00 = 8 hours
			expect(result).toBe(960); // 16 hours = 960 minutes
		});
	});
});

describe("calculateWeightedNightRate", () => {
	describe("Weighted Calculation", () => {
		it("should apply 33% of night rate for 1/3 night trip", () => {
			const pickupAt = new Date("2025-01-15T20:00:00");
			const endAt = new Date("2025-01-15T23:00:00");
			const basePrice = 100;

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, nightRate);

			expect(result).not.toBeNull();
			expect(result!.nightMinutes).toBe(60);
			expect(result!.totalMinutes).toBe(180);
			expect(result!.nightPercentage).toBeCloseTo(33.33, 1);
			expect(result!.effectiveAdjustment).toBeCloseTo(6.67, 1);
			expect(result!.adjustedPrice).toBeCloseTo(106.67, 1);
		});

		it("should apply 100% night rate for fully night trip", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const endAt = new Date("2025-01-16T02:00:00");
			const basePrice = 100;

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, nightRate);

			expect(result).not.toBeNull();
			expect(result!.nightPercentage).toBe(100);
			expect(result!.effectiveAdjustment).toBe(20);
			expect(result!.adjustedPrice).toBe(120);
		});

		it("should apply 0% for fully day trip", () => {
			const pickupAt = new Date("2025-01-15T10:00:00");
			const endAt = new Date("2025-01-15T14:00:00");
			const basePrice = 100;

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, nightRate);

			expect(result).not.toBeNull();
			expect(result!.nightMinutes).toBe(0);
			expect(result!.nightPercentage).toBe(0);
			expect(result!.effectiveAdjustment).toBe(0);
			expect(result!.adjustedPrice).toBe(100);
		});

		it("should apply 75% night rate for overnight trip (21:00-01:00)", () => {
			const pickupAt = new Date("2025-01-15T21:00:00");
			const endAt = new Date("2025-01-16T01:00:00");
			const basePrice = 100;

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, nightRate);

			expect(result).not.toBeNull();
			expect(result!.nightMinutes).toBe(180); // 22:00-01:00 = 3 hours
			expect(result!.totalMinutes).toBe(240); // 21:00-01:00 = 4 hours
			expect(result!.nightPercentage).toBe(75);
			expect(result!.effectiveAdjustment).toBe(15); // 20% × 75% = 15%
			expect(result!.adjustedPrice).toBe(115);
		});
	});

	describe("Fallback Cases", () => {
		it("should return null when estimatedEndAt is null", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const basePrice = 100;

			const result = calculateWeightedNightRate(basePrice, pickupAt, null, nightRate);

			expect(result).toBeNull();
		});

		it("should return null when startTime is missing", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const endAt = new Date("2025-01-16T02:00:00");
			const basePrice = 100;
			const rateWithoutStartTime = { ...nightRate, startTime: null };

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, rateWithoutStartTime);

			expect(result).toBeNull();
		});

		it("should return null when endTime is missing", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const endAt = new Date("2025-01-16T02:00:00");
			const basePrice = 100;
			const rateWithoutEndTime = { ...nightRate, endTime: null };

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, rateWithoutEndTime);

			expect(result).toBeNull();
		});

		it("should return null for zero duration trip", () => {
			const pickupAt = new Date("2025-01-15T23:00:00");
			const endAt = new Date("2025-01-15T23:00:00");
			const basePrice = 100;

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, nightRate);

			expect(result).toBeNull();
		});
	});

	describe("Fixed Amount Adjustment", () => {
		it("should apply weighted fixed amount adjustment", () => {
			const pickupAt = new Date("2025-01-15T20:00:00");
			const endAt = new Date("2025-01-15T23:00:00");
			const basePrice = 100;
			const fixedNightRate: AdvancedRateData = {
				...nightRate,
				adjustmentType: "FIXED_AMOUNT",
				value: 30, // +30€
			};

			const result = calculateWeightedNightRate(basePrice, pickupAt, endAt, fixedNightRate);

			expect(result).not.toBeNull();
			// 1/3 of trip in night = 1/3 of 30€ = 10€
			expect(result!.effectiveAdjustment).toBeCloseTo(10, 0);
			expect(result!.adjustedPrice).toBeCloseTo(110, 0);
		});
	});
});

describe("evaluateAdvancedRates with weighted night rate", () => {
	describe("Weighted Night Rate Integration", () => {
		it("should include weightedDetails in appliedRules for partial night trip", () => {
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-15T20:00:00"),
				estimatedEndAt: new Date("2025-01-15T23:00:00"),
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [nightRate]);

			expect(result.appliedRules).toHaveLength(1);
			expect(result.appliedRules[0].weightedDetails).toBeDefined();
			expect(result.appliedRules[0].weightedDetails!.nightPercentage).toBeCloseTo(33.33, 1);
			expect(result.appliedRules[0].weightedDetails!.nightMinutes).toBe(60);
			expect(result.appliedRules[0].weightedDetails!.totalMinutes).toBe(180);
			expect(result.appliedRules[0].description).toContain("33%");
		});

		it("should apply weighted price adjustment", () => {
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-15T20:00:00"),
				estimatedEndAt: new Date("2025-01-15T23:00:00"),
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [nightRate]);

			// 33% night = 6.67% effective adjustment
			expect(result.adjustedPrice).toBeCloseTo(106.67, 1);
		});

		it("should not apply rate when trip is entirely in day period", () => {
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-15T10:00:00"),
				estimatedEndAt: new Date("2025-01-15T14:00:00"),
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [nightRate]);

			expect(result.appliedRules).toHaveLength(0);
			expect(result.adjustedPrice).toBe(100);
		});
	});

	describe("Fallback to Binary", () => {
		it("should fall back to binary when estimatedEndAt is null", () => {
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-15T23:00:00"), // In night period
				estimatedEndAt: null,
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [nightRate]);

			// Should apply full 20% (binary behavior)
			expect(result.adjustedPrice).toBe(120);
			expect(result.appliedRules).toHaveLength(1);
			expect(result.appliedRules[0].weightedDetails).toBeUndefined();
		});

		it("should not apply rate when pickupAt is in day and no estimatedEndAt", () => {
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-15T10:00:00"), // In day period
				estimatedEndAt: null,
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [nightRate]);

			// Binary check: pickupAt is not in night period
			expect(result.adjustedPrice).toBe(100);
			expect(result.appliedRules).toHaveLength(0);
		});
	});

	describe("Weekend Rate Remains Binary", () => {
		const weekendRate: AdvancedRateData = {
			id: "rate-weekend",
			name: "Weekend Surcharge",
			appliesTo: "WEEKEND",
			startTime: null,
			endTime: null,
			daysOfWeek: "0,6", // Sunday=0, Saturday=6
			minDistanceKm: null,
			maxDistanceKm: null,
			zoneId: null,
			adjustmentType: "PERCENTAGE",
			value: 15, // +15%
			priority: 5,
			isActive: true,
		};

		it("should apply weekend rate based on pickupAt day only (binary)", () => {
			// Saturday pickup
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-18T10:00:00"), // Saturday
				estimatedEndAt: new Date("2025-01-18T14:00:00"),
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [weekendRate]);

			// Full 15% weekend rate (binary)
			expect(result.adjustedPrice).toBe(115);
			expect(result.appliedRules).toHaveLength(1);
			expect(result.appliedRules[0].weightedDetails).toBeUndefined();
		});

		it("should not apply weekend rate for weekday pickup", () => {
			// Wednesday pickup
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-15T10:00:00"), // Wednesday
				estimatedEndAt: new Date("2025-01-15T14:00:00"),
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [weekendRate]);

			expect(result.adjustedPrice).toBe(100);
			expect(result.appliedRules).toHaveLength(0);
		});
	});

	describe("Combined Night and Weekend Rates", () => {
		const weekendRate: AdvancedRateData = {
			id: "rate-weekend",
			name: "Weekend Surcharge",
			appliesTo: "WEEKEND",
			startTime: null,
			endTime: null,
			daysOfWeek: "0,6",
			minDistanceKm: null,
			maxDistanceKm: null,
			zoneId: null,
			adjustmentType: "PERCENTAGE",
			value: 15,
			priority: 5,
			isActive: true,
		};

		it("should apply both weighted night and binary weekend rates", () => {
			// Saturday evening trip spanning day/night
			const context: MultiplierContext = {
				pickupAt: new Date("2025-01-18T20:00:00"), // Saturday 20:00
				estimatedEndAt: new Date("2025-01-18T23:00:00"), // Saturday 23:00
				distanceKm: 50,
				pickupZoneId: null,
				dropoffZoneId: null,
			};

			const result = evaluateAdvancedRates(100, context, [nightRate, weekendRate]);

			// Night rate: 33% night = ~6.67% effective
			// Weekend rate: 15% (binary)
			// Applied in priority order: night (10) first, then weekend (5)
			expect(result.appliedRules).toHaveLength(2);
			expect(result.appliedRules[0].ruleName).toBe("Night Surcharge");
			expect(result.appliedRules[0].weightedDetails).toBeDefined();
			expect(result.appliedRules[1].ruleName).toBe("Weekend Surcharge");
			expect(result.appliedRules[1].weightedDetails).toBeUndefined();
		});
	});
});
