/**
 * Tests for flexibility-score.ts
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 */

import { describe, expect, it } from "vitest";
import {
	calculateFlexibilityScore,
	calculateFlexibilityScoreSimple,
	getScoreLevel,
	getScoreColorClass,
	getScoreBgColorClass,
	SCORE_WEIGHT,
	DEFAULT_MAX_LICENSE_COUNT,
	DEFAULT_MAX_AVAILABILITY_HOURS,
	DEFAULT_MAX_DISTANCE_KM,
	DEFAULT_MAX_DRIVING_HOURS,
	DEFAULT_MAX_AMPLITUDE_HOURS,
	type FlexibilityScoreInput,
} from "../flexibility-score";

// ============================================================================
// Test Fixtures
// ============================================================================

function createDefaultInput(overrides: Partial<FlexibilityScoreInput> = {}): FlexibilityScoreInput {
	return {
		driverLicenseCount: 2,
		maxLicenseCount: DEFAULT_MAX_LICENSE_COUNT,
		driverAvailabilityHours: 6,
		maxAvailabilityHours: DEFAULT_MAX_AVAILABILITY_HOURS,
		baseDistanceKm: 20,
		maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
		remainingDrivingHours: 8,
		maxDrivingHours: DEFAULT_MAX_DRIVING_HOURS,
		remainingAmplitudeHours: 12,
		maxAmplitudeHours: DEFAULT_MAX_AMPLITUDE_HOURS,
		...overrides,
	};
}

// ============================================================================
// calculateFlexibilityScore Tests
// ============================================================================

describe("calculateFlexibilityScore", () => {
	it("returns max score (100) for ideal candidate", () => {
		const input = createDefaultInput({
			driverLicenseCount: 3,
			maxLicenseCount: 3,
			driverAvailabilityHours: 8,
			maxAvailabilityHours: 8,
			baseDistanceKm: 0,
			maxDistanceKm: 100,
			remainingDrivingHours: 10,
			maxDrivingHours: 10,
			remainingAmplitudeHours: 14,
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		expect(result.totalScore).toBe(100);
		expect(result.breakdown.licensesScore).toBe(25);
		expect(result.breakdown.availabilityScore).toBe(25);
		expect(result.breakdown.distanceScore).toBe(25);
		expect(result.breakdown.rseCapacityScore).toBe(25);
	});

	it("returns 0 for worst candidate", () => {
		const input = createDefaultInput({
			driverLicenseCount: 0,
			maxLicenseCount: 3,
			driverAvailabilityHours: 0,
			maxAvailabilityHours: 8,
			baseDistanceKm: 100,
			maxDistanceKm: 100,
			remainingDrivingHours: 0,
			maxDrivingHours: 10,
			remainingAmplitudeHours: 0,
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		expect(result.totalScore).toBe(0);
		expect(result.breakdown.licensesScore).toBe(0);
		expect(result.breakdown.availabilityScore).toBe(0);
		expect(result.breakdown.distanceScore).toBe(0);
		expect(result.breakdown.rseCapacityScore).toBe(0);
	});

	it("weights licenses at 25%", () => {
		const input = createDefaultInput({
			driverLicenseCount: 3,
			maxLicenseCount: 3,
			driverAvailabilityHours: 0,
			maxAvailabilityHours: 8,
			baseDistanceKm: 100,
			maxDistanceKm: 100,
			remainingDrivingHours: 0,
			maxDrivingHours: 10,
			remainingAmplitudeHours: 0,
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		expect(result.breakdown.licensesScore).toBe(SCORE_WEIGHT);
		expect(result.totalScore).toBe(25);
	});

	it("weights availability at 25%", () => {
		const input = createDefaultInput({
			driverLicenseCount: 0,
			maxLicenseCount: 3,
			driverAvailabilityHours: 8,
			maxAvailabilityHours: 8,
			baseDistanceKm: 100,
			maxDistanceKm: 100,
			remainingDrivingHours: 0,
			maxDrivingHours: 10,
			remainingAmplitudeHours: 0,
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		expect(result.breakdown.availabilityScore).toBe(SCORE_WEIGHT);
		expect(result.totalScore).toBe(25);
	});

	it("weights distance inversely at 25%", () => {
		const input = createDefaultInput({
			driverLicenseCount: 0,
			maxLicenseCount: 3,
			driverAvailabilityHours: 0,
			maxAvailabilityHours: 8,
			baseDistanceKm: 0, // Closest = max score
			maxDistanceKm: 100,
			remainingDrivingHours: 0,
			maxDrivingHours: 10,
			remainingAmplitudeHours: 0,
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		expect(result.breakdown.distanceScore).toBe(SCORE_WEIGHT);
		expect(result.totalScore).toBe(25);
	});

	it("weights RSE capacity at 25%", () => {
		const input = createDefaultInput({
			driverLicenseCount: 0,
			maxLicenseCount: 3,
			driverAvailabilityHours: 0,
			maxAvailabilityHours: 8,
			baseDistanceKm: 100,
			maxDistanceKm: 100,
			remainingDrivingHours: 10,
			maxDrivingHours: 10,
			remainingAmplitudeHours: 14,
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		expect(result.breakdown.rseCapacityScore).toBe(SCORE_WEIGHT);
		expect(result.totalScore).toBe(25);
	});

	it("caps individual scores at their max weight", () => {
		const input = createDefaultInput({
			driverLicenseCount: 10, // More than max
			maxLicenseCount: 3,
			driverAvailabilityHours: 20, // More than max
			maxAvailabilityHours: 8,
			baseDistanceKm: -10, // Negative distance (edge case)
			maxDistanceKm: 100,
			remainingDrivingHours: 20, // More than max
			maxDrivingHours: 10,
			remainingAmplitudeHours: 20, // More than max
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		expect(result.breakdown.licensesScore).toBeLessThanOrEqual(SCORE_WEIGHT);
		expect(result.breakdown.availabilityScore).toBeLessThanOrEqual(SCORE_WEIGHT);
		expect(result.totalScore).toBeLessThanOrEqual(100);
	});

	it("handles missing driver (vehicle-only candidate)", () => {
		const input = createDefaultInput({
			driverLicenseCount: 0,
			driverAvailabilityHours: 0,
			remainingDrivingHours: 10,
			remainingAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		// Should still calculate based on distance and RSE
		expect(result.totalScore).toBeGreaterThan(0);
		expect(result.breakdown.licensesScore).toBe(0);
		expect(result.breakdown.availabilityScore).toBe(0);
	});

	it("calculates partial scores correctly", () => {
		const input = createDefaultInput({
			driverLicenseCount: 1, // 1/3 = 33%
			maxLicenseCount: 3,
			driverAvailabilityHours: 4, // 4/8 = 50%
			maxAvailabilityHours: 8,
			baseDistanceKm: 50, // 50/100 = 50% distance, so 50% score
			maxDistanceKm: 100,
			remainingDrivingHours: 5, // 5/10 = 50%
			maxDrivingHours: 10,
			remainingAmplitudeHours: 7, // 7/14 = 50%
			maxAmplitudeHours: 14,
		});

		const result = calculateFlexibilityScore(input);

		// Licenses: 1/3 * 25 = 8.33
		expect(result.breakdown.licensesScore).toBeCloseTo(8.3, 0);
		// Availability: 4/8 * 25 = 12.5
		expect(result.breakdown.availabilityScore).toBeCloseTo(12.5, 0);
		// Distance: (1 - 50/100) * 25 = 12.5
		expect(result.breakdown.distanceScore).toBeCloseTo(12.5, 0);
		// RSE: ((5/10 + 7/14) / 2) * 25 = 12.5
		expect(result.breakdown.rseCapacityScore).toBeCloseTo(12.5, 0);
	});
});

// ============================================================================
// calculateFlexibilityScoreSimple Tests
// ============================================================================

describe("calculateFlexibilityScoreSimple", () => {
	it("uses default max values", () => {
		const result = calculateFlexibilityScoreSimple({
			licenseCount: 3,
			availabilityHours: 8,
			distanceKm: 0,
			remainingDrivingHours: 10,
			remainingAmplitudeHours: 14,
		});

		expect(result.totalScore).toBe(100);
	});

	it("calculates score with simplified params", () => {
		const result = calculateFlexibilityScoreSimple({
			licenseCount: 1,
			availabilityHours: 4,
			distanceKm: 50,
			remainingDrivingHours: 5,
			remainingAmplitudeHours: 7,
		});

		expect(result.totalScore).toBeGreaterThan(0);
		expect(result.totalScore).toBeLessThan(100);
	});
});

// ============================================================================
// getScoreLevel Tests
// ============================================================================

describe("getScoreLevel", () => {
	it("returns 'excellent' for score >= 80", () => {
		expect(getScoreLevel(80)).toBe("excellent");
		expect(getScoreLevel(100)).toBe("excellent");
		expect(getScoreLevel(95)).toBe("excellent");
	});

	it("returns 'good' for score 60-79", () => {
		expect(getScoreLevel(60)).toBe("good");
		expect(getScoreLevel(79)).toBe("good");
		expect(getScoreLevel(70)).toBe("good");
	});

	it("returns 'fair' for score 40-59", () => {
		expect(getScoreLevel(40)).toBe("fair");
		expect(getScoreLevel(59)).toBe("fair");
		expect(getScoreLevel(50)).toBe("fair");
	});

	it("returns 'poor' for score < 40", () => {
		expect(getScoreLevel(39)).toBe("poor");
		expect(getScoreLevel(0)).toBe("poor");
		expect(getScoreLevel(20)).toBe("poor");
	});
});

// ============================================================================
// getScoreColorClass Tests
// ============================================================================

describe("getScoreColorClass", () => {
	it("returns green class for score >= 70", () => {
		const result = getScoreColorClass(70);
		expect(result).toContain("green");
	});

	it("returns orange class for score 40-69", () => {
		const result = getScoreColorClass(50);
		expect(result).toContain("orange");
	});

	it("returns red class for score < 40", () => {
		const result = getScoreColorClass(30);
		expect(result).toContain("red");
	});
});

// ============================================================================
// getScoreBgColorClass Tests
// ============================================================================

describe("getScoreBgColorClass", () => {
	it("returns green bg class for score >= 70", () => {
		const result = getScoreBgColorClass(70);
		expect(result).toContain("green");
	});

	it("returns orange bg class for score 40-69", () => {
		const result = getScoreBgColorClass(50);
		expect(result).toContain("orange");
	});

	it("returns red bg class for score < 40", () => {
		const result = getScoreBgColorClass(30);
		expect(result).toContain("red");
	});
});
