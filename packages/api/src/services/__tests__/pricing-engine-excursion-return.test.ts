/**
 * Story 19.3: Unit tests for excursion return trip cost calculation
 */

import { describe, it, expect } from "vitest";
import {
	calculateExcursionReturnCost,
	type TripAnalysis,
	type OrganizationPricingSettings,
	type SegmentAnalysis,
} from "../pricing-engine";

// Helper to create a mock segment
function createMockSegment(
	name: "approach" | "service" | "return",
	distanceKm: number,
	durationMinutes: number,
): SegmentAnalysis {
	return {
		name,
		description: `${name} segment`,
		distanceKm,
		durationMinutes,
		cost: {
			fuel: { amount: distanceKm * 0.135, distanceKm, consumptionL100km: 7.5, pricePerLiter: 1.8, fuelType: "DIESEL" },
			tolls: { amount: 0, source: "ESTIMATE" as const, distanceKm: 0, ratePerKm: 0 },
			wear: { amount: distanceKm * 0.05, distanceKm, ratePerKm: 0.05 },
			driver: { amount: (durationMinutes / 60) * 25, durationMinutes, hourlyRate: 25 },
			parking: { amount: 0, description: "No parking" },
			total: distanceKm * 0.135 + distanceKm * 0.05 + (durationMinutes / 60) * 25,
		},
		isEstimated: false,
	};
}

// Helper to create mock trip analysis
function createMockTripAnalysis(
	serviceDistanceKm: number,
	serviceDurationMinutes: number,
	returnDistanceKm: number | null,
	returnDurationMinutes: number | null,
): TripAnalysis {
	const serviceSegment = createMockSegment("service", serviceDistanceKm, serviceDurationMinutes);
	const returnSegment = returnDistanceKm !== null && returnDurationMinutes !== null
		? createMockSegment("return", returnDistanceKm, returnDurationMinutes)
		: null;

	const totalCost = serviceSegment.cost.total + (returnSegment?.cost.total ?? 0);

	return {
		segments: {
			approach: null,
			service: serviceSegment,
			return: returnSegment,
		},
		totalDistanceKm: serviceDistanceKm + (returnDistanceKm ?? 0),
		totalDurationMinutes: serviceDurationMinutes + (returnDurationMinutes ?? 0),
		totalInternalCost: totalCost,
		costBreakdown: {
			fuel: { amount: 0, distanceKm: 0, consumptionL100km: 7.5, pricePerLiter: 1.8, fuelType: "DIESEL" },
			tolls: { amount: 0, source: "ESTIMATE" as const, distanceKm: 0, ratePerKm: 0 },
			wear: { amount: 0, distanceKm: 0, ratePerKm: 0.05 },
			driver: { amount: 0, durationMinutes: 0, hourlyRate: 25 },
			parking: { amount: 0, description: "No parking" },
			total: totalCost,
		},
		routingSource: "GOOGLE_API",
		calculatedAt: new Date().toISOString(),
	};
}

// Default settings for tests
const defaultSettings: OrganizationPricingSettings = {
	baseRatePerKm: 1.8,
	baseRatePerHour: 45,
	targetMarginPercent: 20,
	fuelConsumptionL100km: 7.5,
	fuelPricePerLiter: 1.8,
	driverHourlyCost: 25,
};

describe("Story 19.3: calculateExcursionReturnCost", () => {
	describe("AC1: Return Trip Distance Calculation", () => {
		it("should use return segment from shadow calculation when available", () => {
			const tripAnalysis = createMockTripAnalysis(25, 60, 50, 90);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 25);
			
			expect(result.returnDistanceKm).toBe(50);
			expect(result.returnDurationMinutes).toBe(90);
			expect(result.returnSource).toBe("SHADOW_CALCULATION");
		});

		it("should use symmetric estimate when no return segment available", () => {
			const tripAnalysis = createMockTripAnalysis(75, 120, null, null);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 75);
			
			expect(result.returnDistanceKm).toBe(75);
			// Symmetric estimate: 75km / 50km/h * 60 = 90 minutes
			expect(result.returnDurationMinutes).toBe(90);
			expect(result.returnSource).toBe("SYMMETRIC_ESTIMATE");
		});
	});

	describe("AC2: Return Trip Cost in Price", () => {
		it("should calculate fuel cost correctly", () => {
			const tripAnalysis = createMockTripAnalysis(25, 60, 50, 90);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 25);
			
			// Fuel: (50km / 100) * 7.5L * 1.8€ = 6.75€
			expect(result.appliedRule.costBreakdown.fuel).toBeCloseTo(6.75, 2);
		});

		it("should calculate driver cost correctly", () => {
			const tripAnalysis = createMockTripAnalysis(25, 60, 50, 90);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 25);
			
			// Driver: (90min / 60) * 25€ = 37.5€
			expect(result.appliedRule.costBreakdown.driver).toBeCloseTo(37.5, 2);
		});

		it("should calculate total return cost correctly", () => {
			const tripAnalysis = createMockTripAnalysis(25, 60, 50, 90);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 25);
			
			// Total: 6.75€ (fuel) + 37.5€ (driver) = 44.25€
			expect(result.returnCost).toBeCloseTo(44.25, 2);
		});
	});

	describe("AC5: Applied Rules Transparency", () => {
		it("should include EXCURSION_RETURN_TRIP rule with all required fields", () => {
			const tripAnalysis = createMockTripAnalysis(25, 60, 50, 90);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 25);
			
			expect(result.appliedRule.type).toBe("EXCURSION_RETURN_TRIP");
			expect(result.appliedRule.returnDistanceKm).toBe(50);
			expect(result.appliedRule.returnDurationMinutes).toBe(90);
			expect(result.appliedRule.returnCost).toBeCloseTo(44.25, 2);
			expect(result.appliedRule.returnSource).toBe("SHADOW_CALCULATION");
			expect(result.appliedRule.costBreakdown).toBeDefined();
			expect(result.appliedRule.addedToPrice).toBeCloseTo(44.25, 2);
		});

		it("should indicate symmetric estimate in description when used", () => {
			const tripAnalysis = createMockTripAnalysis(75, 120, null, null);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 75);
			
			expect(result.appliedRule.description).toContain("symmetric estimate");
			expect(result.appliedRule.returnSource).toBe("SYMMETRIC_ESTIMATE");
		});
	});

	describe("AC7: Symmetric Fallback for Unknown Return", () => {
		it("should use service distance as return distance when segment is null", () => {
			const tripAnalysis = createMockTripAnalysis(100, 180, null, null);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 100);
			
			expect(result.returnDistanceKm).toBe(100);
			expect(result.returnSource).toBe("SYMMETRIC_ESTIMATE");
		});

		it("should use service distance when return segment has zero distance", () => {
			const tripAnalysis = createMockTripAnalysis(50, 90, 0, 0);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 50);
			
			expect(result.returnDistanceKm).toBe(50);
			expect(result.returnSource).toBe("SYMMETRIC_ESTIMATE");
		});
	});

	describe("Edge Cases", () => {
		it("should handle very short excursions", () => {
			const tripAnalysis = createMockTripAnalysis(5, 15, 5, 10);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 5);
			
			expect(result.returnCost).toBeGreaterThan(0);
			expect(result.returnDistanceKm).toBe(5);
		});

		it("should handle very long excursions", () => {
			const tripAnalysis = createMockTripAnalysis(300, 480, 350, 420);
			
			const result = calculateExcursionReturnCost(tripAnalysis, defaultSettings, 300);
			
			expect(result.returnDistanceKm).toBe(350);
			expect(result.returnDurationMinutes).toBe(420);
			// Fuel: (350/100) * 7.5 * 1.8 = 47.25€
			// Driver: (420/60) * 25 = 175€
			// Total: ~222.25€
			expect(result.returnCost).toBeCloseTo(222.25, 2);
		});

		it("should use default settings when not provided", () => {
			const tripAnalysis = createMockTripAnalysis(50, 90, 50, 60);
			const minimalSettings: OrganizationPricingSettings = {
				baseRatePerKm: 1.8,
				baseRatePerHour: 45,
				targetMarginPercent: 20,
			};
			
			const result = calculateExcursionReturnCost(tripAnalysis, minimalSettings, 50);
			
			// Should use defaults: 7.5L/100km, 1.8€/L, 25€/h
			expect(result.returnCost).toBeGreaterThan(0);
		});
	});
});
