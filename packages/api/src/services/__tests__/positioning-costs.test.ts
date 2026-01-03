/**
 * Test for calculatePositioningCosts function
 * Story 21.6: Automatic Empty Return and Availability Calculation
 */

import { describe, it, expect } from "vitest";
import { calculatePositioningCosts } from "../pricing/shadow-calculator";
import type { TripAnalysis, OrganizationPricingSettings, SegmentAnalysis } from "../pricing/types";

// Helper to create a mock segment
function createMockSegment(name: "approach" | "service" | "return", distanceKm: number, durationMinutes: number, totalCost: number): SegmentAnalysis {
	return {
		name,
		description: "Test segment",
		distanceKm,
		durationMinutes,
		cost: {
			fuel: { amount: totalCost * 0.25, distanceKm, consumptionL100km: 8, pricePerLiter: 1.79, fuelType: "DIESEL" },
			tolls: { amount: totalCost * 0.2, distanceKm, ratePerKm: 0.12 },
			wear: { amount: totalCost * 0.15, distanceKm, ratePerKm: 0.08 },
			driver: { amount: totalCost * 0.4, durationMinutes, hourlyRate: 30 },
			parking: { amount: 0, description: "" },
			total: totalCost,
		},
		isEstimated: false,
	};
}

// Helper to create mock pricing settings
function createMockPricingSettings(emptyReturnCostPercent = 100): OrganizationPricingSettings {
	return {
		baseRatePerKm: 2.5,
		baseRatePerHour: 50,
		targetMarginPercent: 30,
		fuelConsumptionL100km: 8,
		fuelPricePerLiter: 1.79,
		tollCostPerKm: 0.12,
		wearCostPerKm: 0.08,
		driverHourlyCost: 30,
		emptyReturnCostPercent,
	};
}

describe("calculatePositioningCosts", () => {
	describe("without vehicle selection (quote creation stage)", () => {
		it("should NOT estimate empty return when no vehicle is selected (depends on vehicle base)", () => {
			const result = calculatePositioningCosts({
				tripType: "transfer",
				segments: {
					approach: null,
					service: createMockSegment("service", 500, 300, 300),
					return: null,
				},
				serviceDistanceKm: 500,
				serviceDurationMinutes: 300,
				pricingSettings: createMockPricingSettings(100),
			});

			// Should NOT estimate empty return - it depends on vehicle base location
			expect(result.emptyReturn.distanceKm).toBe(0);
			expect(result.emptyReturn.durationMinutes).toBe(0);
			expect(result.emptyReturn.cost).toBe(0);
			expect(result.emptyReturn.reason).toContain("dispatch");
		});

		it("should mark empty return as required for transfer trips", () => {
			const result = calculatePositioningCosts({
				tripType: "transfer",
				segments: {
					approach: null,
					service: createMockSegment("service", 500, 300, 300),
					return: null,
				},
				serviceDistanceKm: 500,
				serviceDurationMinutes: 300,
				pricingSettings: createMockPricingSettings(100),
			});

			expect(result.emptyReturn.required).toBe(true);
		});

		it("should mark empty return as NOT required for dispo trips", () => {
			const result = calculatePositioningCosts({
				tripType: "dispo",
				segments: {
					approach: null,
					service: createMockSegment("service", 500, 300, 300),
					return: null,
				},
				serviceDistanceKm: 500,
				serviceDurationMinutes: 300,
				pricingSettings: createMockPricingSettings(100),
			});

			expect(result.emptyReturn.required).toBe(false);
		});

		it("should return zero cost when no vehicle is selected", () => {
			const result = calculatePositioningCosts({
				tripType: "transfer",
				segments: {
					approach: null,
					service: createMockSegment("service", 100, 60, 100),
					return: null,
				},
				serviceDistanceKm: 100,
				serviceDurationMinutes: 60,
				pricingSettings: createMockPricingSettings(100),
			});

			expect(result.emptyReturn.cost).toBe(0);
			expect(result.emptyReturn.reason).toContain("dispatch");
		});
	});

	describe("with vehicle selection (dispatch stage)", () => {
		it("should use actual return segment cost with percentage applied", () => {
			const returnSegment = createMockSegment("return", 400, 240, 250);
			
			const result = calculatePositioningCosts({
				tripType: "transfer",
				segments: {
					approach: null,
					service: createMockSegment("service", 500, 300, 300),
					return: returnSegment,
				},
				pricingSettings: createMockPricingSettings(80),
			});

			// Should use actual return segment with 80% applied
			expect(result.emptyReturn.distanceKm).toBe(400);
			expect(result.emptyReturn.durationMinutes).toBe(240);
			// 80% of 250 = 200
			expect(result.emptyReturn.cost).toBe(200);
			expect(result.emptyReturn.reason).toContain("80%");
		});
	});

	describe("availability fee for dispo trips", () => {
		it("should calculate availability fee for extra hours", () => {
			const result = calculatePositioningCosts({
				tripType: "dispo",
				segments: {
					approach: null,
					service: createMockSegment("service", 100, 360, 100),
					return: null,
				},
				serviceDistanceKm: 100,
				serviceDurationMinutes: 360,
				pricingSettings: createMockPricingSettings(100),
				durationHours: 8,
				includedHours: 4,
				availabilityRatePerHour: 50,
			});

			expect(result.availabilityFee).not.toBeNull();
			expect(result.availabilityFee?.waitingHours).toBe(4); // 8 - 4 = 4 extra hours
			expect(result.availabilityFee?.cost).toBe(200); // 4 hours × 50€/hour
		});

		it("should not charge availability fee within included hours", () => {
			const result = calculatePositioningCosts({
				tripType: "dispo",
				segments: {
					approach: null,
					service: createMockSegment("service", 50, 180, 50),
					return: null,
				},
				serviceDistanceKm: 50,
				serviceDurationMinutes: 180,
				pricingSettings: createMockPricingSettings(100),
				durationHours: 3,
				includedHours: 4,
				availabilityRatePerHour: 50,
			});

			expect(result.availabilityFee).not.toBeNull();
			expect(result.availabilityFee?.waitingHours).toBe(0);
			expect(result.availabilityFee?.cost).toBe(0);
		});
	});
});
