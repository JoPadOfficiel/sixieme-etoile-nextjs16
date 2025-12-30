/**
 * Story 17.5: Tests for calculateEstimatedEndAt function
 */

import { describe, it, expect } from "vitest";
import { calculateEstimatedEndAt, type TripAnalysis, type CompliancePlan } from "../pricing-engine";

function createMinimalTripAnalysis(
	totalDurationMinutes: number,
	compliancePlan?: CompliancePlan | null
): TripAnalysis {
	return {
		totalDurationMinutes,
		totalDistanceKm: 100,
		totalInternalCost: 150,
		calculatedAt: new Date().toISOString(),
		routingSource: "GOOGLE_API",
		costBreakdown: {
			fuel: { amount: 50, distanceKm: 100, consumptionL100km: 8.5, pricePerLiter: 1.789, fuelType: "DIESEL" },
			tolls: { amount: 20, distanceKm: 100, ratePerKm: 0.20, source: "ESTIMATE" },
			wear: { amount: 10, distanceKm: 100, ratePerKm: 0.10 },
			driver: { amount: 60, durationMinutes: 120, hourlyRate: 30 },
			parking: { amount: 0, description: "" },
			total: 150,
		},
		segments: {
			approach: null,
			service: {
				name: "service",
				description: "Service segment",
				distanceKm: 100,
				durationMinutes: totalDurationMinutes,
				cost: {
					fuel: { amount: 50, distanceKm: 100, consumptionL100km: 8.5, pricePerLiter: 1.789, fuelType: "DIESEL" },
					tolls: { amount: 20, distanceKm: 100, ratePerKm: 0.20, source: "ESTIMATE" },
					wear: { amount: 10, distanceKm: 100, ratePerKm: 0.10 },
					driver: { amount: 60, durationMinutes: 120, hourlyRate: 30 },
					parking: { amount: 0, description: "" },
					total: 150,
				},
				isEstimated: false,
			},
			return: null,
		},
		compliancePlan: compliancePlan ?? undefined,
	};
}

describe("calculateEstimatedEndAt", () => {
	it("should calculate estimatedEndAt from pickupAt + totalDurationMinutes", () => {
		const pickupAt = new Date("2025-01-15T08:00:00Z");
		const tripAnalysis = createMinimalTripAnalysis(120);
		const result = calculateEstimatedEndAt(pickupAt, tripAnalysis);
		expect(result).toEqual(new Date("2025-01-15T10:00:00Z"));
	});

	it("should return null when tripAnalysis is null", () => {
		const pickupAt = new Date("2025-01-15T08:00:00Z");
		const result = calculateEstimatedEndAt(pickupAt, null);
		expect(result).toBeNull();
	});

	it("should return null when totalDurationMinutes is 0", () => {
		const pickupAt = new Date("2025-01-15T08:00:00Z");
		const tripAnalysis = createMinimalTripAnalysis(0);
		const result = calculateEstimatedEndAt(pickupAt, tripAnalysis);
		expect(result).toBeNull();
	});

	it("should use multi-day duration when compliancePlan is MULTI_DAY", () => {
		const pickupAt = new Date("2025-01-15T08:00:00Z");
		const compliancePlan: CompliancePlan = {
			planType: "MULTI_DAY",
			isRequired: true,
			additionalCost: 500,
			costBreakdown: { extraDriverCost: 0, hotelCost: 200, mealAllowance: 100, otherCosts: 200 },
			adjustedSchedule: { daysRequired: 2, driversRequired: 1, hotelNightsRequired: 1 },
			originalViolations: [],
			selectedReason: "Lowest cost option",
		};
		const tripAnalysis = createMinimalTripAnalysis(600, compliancePlan);
		const result = calculateEstimatedEndAt(pickupAt, tripAnalysis);
		expect(result).toEqual(new Date("2025-01-17T08:00:00Z"));
	});

	it("should use original duration for DOUBLE_CREW plan", () => {
		const pickupAt = new Date("2025-01-15T08:00:00Z");
		const compliancePlan: CompliancePlan = {
			planType: "DOUBLE_CREW",
			isRequired: true,
			additionalCost: 200,
			costBreakdown: { extraDriverCost: 200, hotelCost: 0, mealAllowance: 0, otherCosts: 0 },
			adjustedSchedule: { daysRequired: 1, driversRequired: 2, hotelNightsRequired: 0 },
			originalViolations: [],
			selectedReason: "Prefer internal option",
		};
		const tripAnalysis = createMinimalTripAnalysis(600, compliancePlan);
		const result = calculateEstimatedEndAt(pickupAt, tripAnalysis);
		expect(result).toEqual(new Date("2025-01-15T18:00:00Z"));
	});
});
