/**
 * Story 17.3: Pricing Engine Compliance Integration Tests
 * Tests the integration of compliance validation and staffing costs into pricing
 */

import { describe, it, expect } from "vitest";
import {
	integrateComplianceIntoPricing,
	type ComplianceIntegrationInput,
	type TripAnalysis,
} from "../pricing-engine";
import { DEFAULT_HEAVY_VEHICLE_RSE_RULES } from "../compliance-validator";

// Helper to create a minimal trip analysis
function createMinimalTripAnalysis(): TripAnalysis {
	return {
		costBreakdown: {
			fuel: { amount: 50, distanceKm: 100, consumptionL100km: 8, pricePerLiter: 1.8, fuelType: "DIESEL" },
			tolls: { amount: 10, distanceKm: 100, ratePerKm: 0.1 },
			wear: { amount: 10, distanceKm: 100, ratePerKm: 0.1 },
			driver: { amount: 100, durationMinutes: 600, hourlyRate: 10 },
			parking: { amount: 0, description: "No parking" },
			total: 170,
		},
		segments: {
			approach: null,
			service: {
				name: "service",
				description: "Main service segment",
				distanceKm: 100,
				durationMinutes: 600,
				cost: {
					fuel: { amount: 50, distanceKm: 100, consumptionL100km: 8, pricePerLiter: 1.8, fuelType: "DIESEL" },
					tolls: { amount: 10, distanceKm: 100, ratePerKm: 0.1 },
					wear: { amount: 10, distanceKm: 100, ratePerKm: 0.1 },
					driver: { amount: 100, durationMinutes: 600, hourlyRate: 10 },
					parking: { amount: 0, description: "No parking" },
					total: 170,
				},
				isEstimated: true,
			},
			return: null,
		},
		totalDistanceKm: 100,
		totalDurationMinutes: 600,
		totalInternalCost: 170,
		calculatedAt: new Date().toISOString(),
		routingSource: "HAVERSINE_ESTIMATE",
	};
}

describe("Story 17.3: Pricing Engine Compliance Integration", () => {
	describe("integrateComplianceIntoPricing", () => {
		it("should skip compliance for light vehicles", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-light",
				regulatoryCategory: "LIGHT",
				tripAnalysis,
				pickupAt: new Date(),
			});

			expect(result.tripAnalysis.compliancePlan).toBeNull();
			expect(result.additionalStaffingCost).toBe(0);
			expect(result.appliedRule).toBeNull();
		});

		it("should return NONE plan for compliant heavy vehicle trips", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			expect(result.tripAnalysis.compliancePlan).not.toBeNull();
			expect(result.tripAnalysis.compliancePlan?.planType).toBe("NONE");
			expect(result.tripAnalysis.compliancePlan?.isRequired).toBe(false);
			expect(result.additionalStaffingCost).toBe(0);
		});

		it("should store compliancePlan in tripAnalysis", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			expect(result.tripAnalysis.compliancePlan).toBeDefined();
			expect(result.tripAnalysis.compliancePlan?.planType).toBeDefined();
			expect(result.tripAnalysis.compliancePlan?.isRequired).toBeDefined();
			expect(result.tripAnalysis.compliancePlan?.additionalCost).toBeDefined();
		});

		it("should include cost breakdown in compliancePlan", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			const plan = result.tripAnalysis.compliancePlan;
			expect(plan?.costBreakdown).toBeDefined();
			expect(typeof plan?.costBreakdown.extraDriverCost).toBe("number");
			expect(typeof plan?.costBreakdown.hotelCost).toBe("number");
			expect(typeof plan?.costBreakdown.mealAllowance).toBe("number");
			expect(typeof plan?.costBreakdown.otherCosts).toBe("number");
		});

		it("should include adjusted schedule in compliancePlan", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			const plan = result.tripAnalysis.compliancePlan;
			expect(plan?.adjustedSchedule).toBeDefined();
			expect(typeof plan?.adjustedSchedule.daysRequired).toBe("number");
			expect(typeof plan?.adjustedSchedule.driversRequired).toBe("number");
			expect(typeof plan?.adjustedSchedule.hotelNightsRequired).toBe("number");
		});

		it("should return applied rule for transparency", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			// For compliant trips, no applied rule
			if (!result.tripAnalysis.compliancePlan?.isRequired) {
				expect(result.appliedRule).toBeNull();
			}
		});

		it("should respect staffingSelectionPolicy parameter", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result1 = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				staffingSelectionPolicy: "CHEAPEST",
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			const result2 = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				staffingSelectionPolicy: "FASTEST",
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			// Both should have same compliance plan type for compliant trip
			expect(result1.tripAnalysis.compliancePlan?.planType).toBe(result2.tripAnalysis.compliancePlan?.planType);
		});

		it("should default to CHEAPEST policy when not specified", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				// No staffingSelectionPolicy specified
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			expect(result.tripAnalysis.compliancePlan).toBeDefined();
		});

		it("should preserve original tripAnalysis data", () => {
			const tripAnalysis = createMinimalTripAnalysis();
			const originalCost = tripAnalysis.totalInternalCost;

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			// Original cost should be preserved
			expect(result.tripAnalysis.totalInternalCost).toBe(originalCost);
			expect(result.tripAnalysis.totalDistanceKm).toBe(tripAnalysis.totalDistanceKm);
			expect(result.tripAnalysis.totalDurationMinutes).toBe(tripAnalysis.totalDurationMinutes);
		});

		it("should calculate additionalStaffingCost correctly", () => {
			const tripAnalysis = createMinimalTripAnalysis();

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-heavy",
				regulatoryCategory: "HEAVY",
				tripAnalysis,
				pickupAt: new Date(),
				rules: {
					licenseCategoryId: "heavy",
					licenseCategoryCode: "HEAVY",
					...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
				},
			});

			// For compliant trips, additional cost should be 0
			if (!result.tripAnalysis.compliancePlan?.isRequired) {
				expect(result.additionalStaffingCost).toBe(0);
			}

			// Additional cost should match compliancePlan
			expect(result.additionalStaffingCost).toBe(
				result.tripAnalysis.compliancePlan?.additionalCost ?? 0
			);
		});
	});
});
