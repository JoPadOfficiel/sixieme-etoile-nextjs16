/**
 * Story 19.2: Automatic RSE-Compliant Staffing for Long Trips
 * Tests the integration of RSE compliance validation and automatic staffing costs into pricing
 */

import { describe, it, expect } from "vitest";
import {
	type OrganizationPricingSettings,
	type VehicleCategoryInfo,
	type TripAnalysis,
} from "../pricing-engine";
import {
	integrateComplianceIntoPricing,
	type ComplianceIntegrationInput,
} from "../pricing-engine";
import { DEFAULT_HEAVY_VEHICLE_RSE_RULES } from "../compliance-validator";

// Helper to create a minimal trip analysis with configurable duration
function createTripAnalysisWithDuration(durationMinutes: number): TripAnalysis {
	const distanceKm = (durationMinutes / 60) * 80; // Assume 80km/h average
	return {
		costBreakdown: {
			fuel: { amount: distanceKm * 0.15, distanceKm, consumptionL100km: 8, pricePerLiter: 1.8, fuelType: "DIESEL" },
			tolls: { amount: distanceKm * 0.1, distanceKm, ratePerKm: 0.1 },
			wear: { amount: distanceKm * 0.05, distanceKm, ratePerKm: 0.05 },
			driver: { amount: (durationMinutes / 60) * 25, durationMinutes, hourlyRate: 25 },
			parking: { amount: 0, description: "No parking" },
			total: distanceKm * 0.3 + (durationMinutes / 60) * 25,
		},
		segments: {
			approach: {
				name: "approach",
				description: "Approach segment",
				distanceKm: 30,
				durationMinutes: 30,
				cost: {
					fuel: { amount: 5, distanceKm: 30, consumptionL100km: 8, pricePerLiter: 1.8, fuelType: "DIESEL" },
					tolls: { amount: 3, distanceKm: 30, ratePerKm: 0.1 },
					wear: { amount: 1.5, distanceKm: 30, ratePerKm: 0.05 },
					driver: { amount: 12.5, durationMinutes: 30, hourlyRate: 25 },
					parking: { amount: 0, description: "No parking" },
					total: 22,
				},
				isEstimated: true,
			},
			service: {
				name: "service",
				description: "Main service segment",
				distanceKm: distanceKm - 60, // Subtract approach and return
				durationMinutes: durationMinutes - 60, // Subtract approach and return
				cost: {
					fuel: { amount: (distanceKm - 60) * 0.15, distanceKm: distanceKm - 60, consumptionL100km: 8, pricePerLiter: 1.8, fuelType: "DIESEL" },
					tolls: { amount: (distanceKm - 60) * 0.1, distanceKm: distanceKm - 60, ratePerKm: 0.1 },
					wear: { amount: (distanceKm - 60) * 0.05, distanceKm: distanceKm - 60, ratePerKm: 0.05 },
					driver: { amount: ((durationMinutes - 60) / 60) * 25, durationMinutes: durationMinutes - 60, hourlyRate: 25 },
					parking: { amount: 0, description: "No parking" },
					total: (distanceKm - 60) * 0.3 + ((durationMinutes - 60) / 60) * 25,
				},
				isEstimated: true,
			},
			return: {
				name: "return",
				description: "Return segment",
				distanceKm: 30,
				durationMinutes: 30,
				cost: {
					fuel: { amount: 5, distanceKm: 30, consumptionL100km: 8, pricePerLiter: 1.8, fuelType: "DIESEL" },
					tolls: { amount: 3, distanceKm: 30, ratePerKm: 0.1 },
					wear: { amount: 1.5, distanceKm: 30, ratePerKm: 0.05 },
					driver: { amount: 12.5, durationMinutes: 30, hourlyRate: 25 },
					parking: { amount: 0, description: "No parking" },
					total: 22,
				},
				isEstimated: true,
			},
		},
		totalDistanceKm: distanceKm,
		totalDurationMinutes: durationMinutes,
		totalInternalCost: distanceKm * 0.3 + (durationMinutes / 60) * 25,
		calculatedAt: new Date().toISOString(),
		routingSource: "HAVERSINE_ESTIMATE",
	};
}

describe("Story 19.2: Automatic RSE-Compliant Staffing for Long Trips", () => {
	describe("integrateComplianceIntoPricing", () => {
		it("AC7: should skip compliance for LIGHT vehicles", () => {
			const tripAnalysis = createTripAnalysisWithDuration(600); // 10 hours

			const result = integrateComplianceIntoPricing({
				organizationId: "org-1",
				vehicleCategoryId: "cat-light",
				regulatoryCategory: "LIGHT",
				tripAnalysis,
				pickupAt: new Date(),
			});

			// LIGHT vehicles should have null compliancePlan
			expect(result.tripAnalysis.compliancePlan).toBeNull();
			expect(result.additionalStaffingCost).toBe(0);
			expect(result.appliedRule).toBeNull();
		});

		it("AC1+AC4: should detect RSE violation and NOT block for HEAVY vehicle with 15h amplitude", () => {
			// 15 hours total = exceeds 14h amplitude limit AND 10h driving limit
			// System will select the best plan that resolves ALL violations
			const tripAnalysis = createTripAnalysisWithDuration(900); // 15 hours in minutes

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

			// Should have a compliance plan (not null)
			expect(result.tripAnalysis.compliancePlan).not.toBeNull();
			// Should be required (violation detected)
			expect(result.tripAnalysis.compliancePlan?.isRequired).toBe(true);
			// Should have selected a staffing plan (could be DOUBLE_CREW, RELAY, or MULTI_DAY depending on violations)
			expect(["DOUBLE_CREW", "RELAY_DRIVER", "MULTI_DAY"]).toContain(result.tripAnalysis.compliancePlan?.planType);
			// Should have additional staffing cost
			expect(result.additionalStaffingCost).toBeGreaterThan(0);
		});

		it("AC2+AC3: should select a staffing plan and calculate staffing cost for RSE violation", () => {
			// 16 hours amplitude - exceeds 14h limit, also exceeds 10h driving limit
			// System selects the cheapest plan that resolves ALL violations
			const tripAnalysis = createTripAnalysisWithDuration(960); // 16 hours in minutes

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
				costParameters: {
					driverHourlyCost: 30, // 30€/h for second driver
					hotelCostPerNight: 150,
					mealAllowancePerDay: 40,
				},
			});

			// Should select a valid staffing plan
			expect(["DOUBLE_CREW", "RELAY_DRIVER", "MULTI_DAY"]).toContain(result.tripAnalysis.compliancePlan?.planType);
			// Should have additional cost
			expect(result.additionalStaffingCost).toBeGreaterThan(0);
			// Cost breakdown should exist
			expect(result.tripAnalysis.compliancePlan?.costBreakdown).toBeDefined();
		});

		it("AC5+AC6: should include applied rule for transparency", () => {
			const tripAnalysis = createTripAnalysisWithDuration(900); // 15 hours

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

			// Should have an applied rule
			expect(result.appliedRule).not.toBeNull();
			// Rule should be of type COMPLIANCE_STAFFING
			expect(result.appliedRule?.type).toBe("COMPLIANCE_STAFFING");
			// Rule should include plan type
			expect(result.appliedRule?.planType).toBeDefined();
			// Rule should include additional cost
			expect(result.appliedRule?.additionalCost).toBeDefined();
		});

		it("should return NONE plan for compliant HEAVY vehicle trip (short trip)", () => {
			// 8 hours - within all limits
			const tripAnalysis = createTripAnalysisWithDuration(480); // 8 hours in minutes

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

			// Should have a compliance plan
			expect(result.tripAnalysis.compliancePlan).not.toBeNull();
			// Plan type should be NONE (no staffing needed)
			expect(result.tripAnalysis.compliancePlan?.planType).toBe("NONE");
			// Should NOT be required
			expect(result.tripAnalysis.compliancePlan?.isRequired).toBe(false);
			// No additional cost
			expect(result.additionalStaffingCost).toBe(0);
			// No applied rule
			expect(result.appliedRule).toBeNull();
		});

		it("should use CHEAPEST policy by default", () => {
			const tripAnalysis = createTripAnalysisWithDuration(900); // 15 hours

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
				// No staffingSelectionPolicy specified - should default to CHEAPEST
			});

			// Should have selected a plan
			expect(result.tripAnalysis.compliancePlan?.planType).not.toBe("NONE");
			// Selection reason should mention cost
			expect(result.tripAnalysis.compliancePlan?.selectedReason).toContain("cost");
		});
	});
});
