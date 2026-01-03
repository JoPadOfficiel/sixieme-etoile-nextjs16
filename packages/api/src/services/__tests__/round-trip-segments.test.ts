/**
 * Story 22.1: Round Trip Segment-Based Pricing Tests
 * 
 * Tests for the new segment-based round trip calculation that replaces
 * the deprecated ×2 multiplier approach.
 */

import { describe, it, expect } from "vitest";
import {
	calculateRoundTripSegments,
	extendTripAnalysisForRoundTrip,
	DEFAULT_WAIT_ON_SITE_THRESHOLD_MINUTES,
} from "../pricing/shadow-calculator";
import type {
	TripAnalysis,
	OrganizationPricingSettings,
	SegmentAnalysis,
	CostBreakdown,
} from "../pricing/types";

// Helper to create a mock cost breakdown
function createMockCostBreakdown(total: number): CostBreakdown {
	return {
		fuel: {
			amount: total * 0.4,
			distanceKm: 50,
			consumptionL100km: 8,
			pricePerLiter: 1.8,
			fuelType: "DIESEL",
		},
		tolls: {
			amount: total * 0.2,
			distanceKm: 50,
			ratePerKm: 0.1,
		},
		wear: {
			amount: total * 0.1,
			distanceKm: 50,
			ratePerKm: 0.05,
		},
		driver: {
			amount: total * 0.3,
			durationMinutes: 60,
			hourlyRate: 25,
		},
		parking: {
			amount: 0,
			description: "",
		},
		total,
	};
}

// Helper to create a mock segment
function createMockSegment(
	name: "approach" | "service" | "return",
	distanceKm: number,
	durationMinutes: number,
	costTotal: number,
): SegmentAnalysis {
	return {
		name,
		description: `${name} segment`,
		distanceKm,
		durationMinutes,
		cost: createMockCostBreakdown(costTotal),
		isEstimated: false,
	};
}

// Helper to create mock pricing settings
function createMockPricingSettings(): OrganizationPricingSettings {
	return {
		organizationId: "org-1",
		baseRatePerKm: 2.5,
		baseRatePerHour: 50,
		targetMarginPercent: 20,
		fuelConsumptionL100km: 8,
		fuelPricePerLiter: 1.8,
		tollCostPerKm: 0.1,
		wearCostPerKm: 0.05,
		driverHourlyCost: 25,
	};
}

// Helper to create a mock trip analysis
function createMockTripAnalysis(
	approachCost: number,
	serviceCost: number,
	returnCost: number,
): TripAnalysis {
	const approach = createMockSegment("approach", 20, 30, approachCost);
	const service = createMockSegment("service", 50, 60, serviceCost);
	const returnSeg = createMockSegment("return", 25, 35, returnCost);

	return {
		costBreakdown: createMockCostBreakdown(approachCost + serviceCost + returnCost),
		segments: {
			approach,
			service,
			return: returnSeg,
		},
		totalDistanceKm: 95,
		totalDurationMinutes: 125,
		totalInternalCost: approachCost + serviceCost + returnCost,
		calculatedAt: new Date().toISOString(),
		routingSource: "GOOGLE_API",
	};
}

describe("Round Trip Segment Calculation (Story 22.1)", () => {
	describe("calculateRoundTripSegments", () => {
		it("should calculate RETURN_BETWEEN_LEGS mode when waiting time is undefined", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145; // 30 + 80 + 35

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				undefined, // No waiting time = RETURN_BETWEEN_LEGS
			);

			expect(result.roundTripMode).toBe("RETURN_BETWEEN_LEGS");
			expect(result.appliedRule.type).toBe("ROUND_TRIP_SEGMENTS");
			expect(result.appliedRule.roundTripMode).toBe("RETURN_BETWEEN_LEGS");
			
			// All 6 segments should have values
			expect(result.segments.approach).not.toBeNull();
			expect(result.segments.service).not.toBeNull();
			expect(result.segments.return).not.toBeNull();
			expect(result.segments.returnApproach).not.toBeNull();
			expect(result.segments.returnService).not.toBeNull();
			expect(result.segments.finalReturn).not.toBeNull();
		});

		it("should calculate WAIT_ON_SITE mode when waiting time is below threshold", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				60, // 60 minutes < 120 minutes threshold = WAIT_ON_SITE
			);

			expect(result.roundTripMode).toBe("WAIT_ON_SITE");
			expect(result.appliedRule.roundTripMode).toBe("WAIT_ON_SITE");
			
			// Segments C and D should be null for WAIT_ON_SITE
			expect(result.segments.return).toBeNull();
			expect(result.segments.returnApproach).toBeNull();
			
			// Segments A, B, E, F should have values
			expect(result.segments.approach).not.toBeNull();
			expect(result.segments.service).not.toBeNull();
			expect(result.segments.returnService).not.toBeNull();
			expect(result.segments.finalReturn).not.toBeNull();
		});

		it("should calculate RETURN_BETWEEN_LEGS mode when waiting time exceeds threshold", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				180, // 180 minutes > 120 minutes threshold = RETURN_BETWEEN_LEGS
			);

			expect(result.roundTripMode).toBe("RETURN_BETWEEN_LEGS");
		});

		it("should use custom threshold when provided", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			// With custom threshold of 30 minutes, 60 minutes should trigger RETURN_BETWEEN_LEGS
			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				60,
				30, // Custom threshold of 30 minutes
			);

			expect(result.roundTripMode).toBe("RETURN_BETWEEN_LEGS");
			expect(result.appliedRule.waitOnSiteThresholdMinutes).toBe(30);
		});

		it("should calculate segment breakdown correctly for WAIT_ON_SITE", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				60, // WAIT_ON_SITE mode
			);

			const breakdown = result.appliedRule.segmentBreakdown;
			
			// Segments C and D should be 0 for WAIT_ON_SITE
			expect(breakdown.segmentC).toBe(0);
			expect(breakdown.segmentD).toBe(0);
			
			// Total should be A + B + E + F (no C and D)
			const expectedTotal = breakdown.segmentA + breakdown.segmentB + breakdown.segmentE + breakdown.segmentF;
			expect(breakdown.total).toBeCloseTo(expectedTotal, 2);
		});

		it("should calculate segment breakdown correctly for RETURN_BETWEEN_LEGS", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				undefined, // RETURN_BETWEEN_LEGS mode
			);

			const breakdown = result.appliedRule.segmentBreakdown;
			
			// All segments should have values
			expect(breakdown.segmentA).toBeGreaterThan(0);
			expect(breakdown.segmentB).toBeGreaterThan(0);
			expect(breakdown.segmentC).toBeGreaterThan(0);
			expect(breakdown.segmentD).toBeGreaterThan(0);
			expect(breakdown.segmentE).toBeGreaterThan(0);
			expect(breakdown.segmentF).toBeGreaterThan(0);
			
			// Total should be sum of all segments
			expect(breakdown.total).toBe(
				breakdown.segmentA + breakdown.segmentB + breakdown.segmentC +
				breakdown.segmentD + breakdown.segmentE + breakdown.segmentF
			);
		});

		it("should preserve margin ratio from single leg to round trip", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;
			const singleLegMarginRatio = singleLegPrice / singleLegInternalCost;

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				undefined,
			);

			// The adjusted price should maintain the same margin ratio
			const roundTripMarginRatio = result.adjustedPrice / result.adjustedInternalCost;
			expect(roundTripMarginRatio).toBeCloseTo(singleLegMarginRatio, 2);
		});

		it("should NOT simply double the price (unlike deprecated ×2 multiplier)", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				60, // WAIT_ON_SITE mode - should be cheaper than ×2
			);

			// For WAIT_ON_SITE, the price should be less than ×2
			// because segments C and D are eliminated
			const simpleDoublePrice = singleLegPrice * 2;
			expect(result.adjustedPrice).toBeLessThan(simpleDoublePrice);
		});

		it("should include applied rule with all required fields", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const result = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				60,
			);

			const rule = result.appliedRule;
			
			expect(rule.type).toBe("ROUND_TRIP_SEGMENTS");
			expect(rule.description).toContain("Round trip");
			expect(rule.roundTripMode).toBeDefined();
			expect(rule.segmentBreakdown).toBeDefined();
			expect(rule.totalBeforeRoundTrip).toBe(singleLegPrice);
			expect(rule.totalAfterRoundTrip).toBe(result.adjustedPrice);
			expect(rule.internalCostBeforeRoundTrip).toBe(singleLegInternalCost);
			expect(rule.internalCostAfterRoundTrip).toBe(result.adjustedInternalCost);
			expect(rule.waitingTimeMinutes).toBe(60);
			expect(rule.waitOnSiteThresholdMinutes).toBe(DEFAULT_WAIT_ON_SITE_THRESHOLD_MINUTES);
		});
	});

	describe("extendTripAnalysisForRoundTrip", () => {
		it("should extend trip analysis with round trip fields", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const roundTripResult = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				60,
			);

			const extended = extendTripAnalysisForRoundTrip(tripAnalysis, roundTripResult);

			expect(extended.isRoundTrip).toBe(true);
			expect(extended.roundTripMode).toBe("WAIT_ON_SITE");
			expect(extended.segments.returnApproach).toBeDefined();
			expect(extended.segments.returnService).toBeDefined();
			expect(extended.segments.finalReturn).toBeDefined();
		});

		it("should update total distance and duration for round trip", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const roundTripResult = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				undefined, // RETURN_BETWEEN_LEGS
			);

			const extended = extendTripAnalysisForRoundTrip(tripAnalysis, roundTripResult);

			// Total distance should be greater than single leg
			expect(extended.totalDistanceKm).toBeGreaterThan(tripAnalysis.totalDistanceKm);
			expect(extended.totalDurationMinutes).toBeGreaterThan(tripAnalysis.totalDurationMinutes);
		});

		it("should update internal cost to match round trip calculation", () => {
			const tripAnalysis = createMockTripAnalysis(30, 80, 35);
			const settings = createMockPricingSettings();
			const singleLegPrice = 200;
			const singleLegInternalCost = 145;

			const roundTripResult = calculateRoundTripSegments(
				singleLegPrice,
				singleLegInternalCost,
				tripAnalysis,
				settings,
				undefined,
			);

			const extended = extendTripAnalysisForRoundTrip(tripAnalysis, roundTripResult);

			expect(extended.totalInternalCost).toBe(roundTripResult.adjustedInternalCost);
		});
	});

	describe("DEFAULT_WAIT_ON_SITE_THRESHOLD_MINUTES", () => {
		it("should be 120 minutes (2 hours)", () => {
			expect(DEFAULT_WAIT_ON_SITE_THRESHOLD_MINUTES).toBe(120);
		});
	});
});
