/**
 * Tests for Heavy-Vehicle Compliance Validator (Story 5.3)
 *
 * Tests RSE rule validation including:
 * - 10h daily driving limit
 * - 14h amplitude limit
 * - Mandatory break injection (45min per 4h30)
 * - Capped average speed (85 km/h)
 * - Multi-tenancy (rules per organization)
 */

import { describe, expect, it } from "vitest";
import {
	validateHeavyVehicleCompliance,
	calculateTotalDrivingMinutes,
	calculateTotalAmplitudeMinutes,
	calculateRequiredBreaks,
	calculateInjectedBreakMinutes,
	recalculateWithCappedSpeed,
	applySpeedCapping,
	minutesToHours,
	hoursToMinutes,
	getComplianceSummary,
	isHeavyVehicleTripCompliant,
	DEFAULT_HEAVY_VEHICLE_RSE_RULES,
	type RSERules,
	type ComplianceValidationInput,
	type ComplianceValidationResult,
} from "../compliance-validator";
import type { TripAnalysis, SegmentAnalysis, CostBreakdown } from "../pricing-engine";

// ============================================================================
// Test Fixtures
// ============================================================================

const createCostBreakdown = (total: number = 0): CostBreakdown => ({
	fuel: { amount: 0, distanceKm: 0, consumptionL100km: 8, pricePerLiter: 1.8 },
	tolls: { amount: 0, distanceKm: 0, ratePerKm: 0.15 },
	wear: { amount: 0, distanceKm: 0, ratePerKm: 0.1 },
	driver: { amount: 0, durationMinutes: 0, hourlyRate: 25 },
	parking: { amount: 0, description: "" },
	total,
});

const createSegment = (
	name: "approach" | "service" | "return",
	distanceKm: number,
	durationMinutes: number,
): SegmentAnalysis => ({
	name,
	description: `${name} segment`,
	distanceKm,
	durationMinutes,
	cost: createCostBreakdown(),
	isEstimated: false,
});

const createTripAnalysis = (
	approachMinutes: number,
	serviceMinutes: number,
	returnMinutes: number,
	approachDistanceKm: number = 20,
	serviceDistanceKm: number = 100,
	returnDistanceKm: number = 20,
): TripAnalysis => ({
	costBreakdown: createCostBreakdown(),
	segments: {
		approach: createSegment("approach", approachDistanceKm, approachMinutes),
		service: createSegment("service", serviceDistanceKm, serviceMinutes),
		return: createSegment("return", returnDistanceKm, returnMinutes),
	},
	totalDistanceKm: approachDistanceKm + serviceDistanceKm + returnDistanceKm,
	totalDurationMinutes: approachMinutes + serviceMinutes + returnMinutes,
	totalInternalCost: 0,
	calculatedAt: new Date().toISOString(),
	routingSource: "HAVERSINE_ESTIMATE",
});

const defaultRSERules: RSERules = {
	licenseCategoryId: "license-d",
	licenseCategoryCode: "D",
	maxDailyDrivingHours: 10,
	maxDailyAmplitudeHours: 14,
	breakMinutesPerDrivingBlock: 45,
	drivingBlockHoursForBreak: 4.5,
	cappedAverageSpeedKmh: 85,
};

const createValidationInput = (
	tripAnalysis: TripAnalysis,
	regulatoryCategory: "LIGHT" | "HEAVY" = "HEAVY",
): ComplianceValidationInput => ({
	organizationId: "org-1",
	vehicleCategoryId: "cat-bus",
	regulatoryCategory,
	licenseCategoryId: "license-d",
	tripAnalysis,
	pickupAt: new Date("2025-11-26T08:00:00+01:00"),
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("Helper Functions", () => {
	describe("minutesToHours", () => {
		it("should convert 60 minutes to 1 hour", () => {
			expect(minutesToHours(60)).toBe(1);
		});

		it("should convert 90 minutes to 1.5 hours", () => {
			expect(minutesToHours(90)).toBe(1.5);
		});

		it("should round to 2 decimal places", () => {
			expect(minutesToHours(100)).toBe(1.67);
		});
	});

	describe("hoursToMinutes", () => {
		it("should convert 1 hour to 60 minutes", () => {
			expect(hoursToMinutes(1)).toBe(60);
		});

		it("should convert 4.5 hours to 270 minutes", () => {
			expect(hoursToMinutes(4.5)).toBe(270);
		});
	});

	describe("calculateTotalDrivingMinutes", () => {
		it("should sum all segment durations", () => {
			const tripAnalysis = createTripAnalysis(30, 120, 30);
			expect(calculateTotalDrivingMinutes(tripAnalysis)).toBe(180);
		});

		it("should handle missing approach segment", () => {
			const tripAnalysis = createTripAnalysis(0, 120, 30);
			tripAnalysis.segments.approach = null;
			expect(calculateTotalDrivingMinutes(tripAnalysis)).toBe(150);
		});

		it("should handle missing return segment", () => {
			const tripAnalysis = createTripAnalysis(30, 120, 0);
			tripAnalysis.segments.return = null;
			expect(calculateTotalDrivingMinutes(tripAnalysis)).toBe(150);
		});
	});

	describe("calculateTotalAmplitudeMinutes", () => {
		it("should calculate amplitude from segment durations", () => {
			const tripAnalysis = createTripAnalysis(30, 480, 30);
			const pickupAt = new Date("2025-11-26T08:00:00+01:00");
			expect(calculateTotalAmplitudeMinutes(tripAnalysis, pickupAt)).toBe(540);
		});

		it("should use explicit dropoff time when provided", () => {
			const tripAnalysis = createTripAnalysis(30, 480, 30);
			const pickupAt = new Date("2025-11-26T08:00:00+01:00");
			const dropoffAt = new Date("2025-11-26T18:00:00+01:00"); // 10 hours later
			// 10 hours = 600 minutes + 30 approach + 30 return = 660
			expect(calculateTotalAmplitudeMinutes(tripAnalysis, pickupAt, dropoffAt)).toBe(660);
		});
	});

	describe("calculateRequiredBreaks", () => {
		it("should return 0 for driving time under 4.5 hours", () => {
			expect(calculateRequiredBreaks(260, 4.5)).toBe(0); // 4h20m
		});

		it("should return 1 for driving time between 4.5 and 9 hours", () => {
			expect(calculateRequiredBreaks(300, 4.5)).toBe(1); // 5h
			expect(calculateRequiredBreaks(500, 4.5)).toBe(1); // 8h20m
		});

		it("should return 2 for driving time between 9 and 13.5 hours", () => {
			expect(calculateRequiredBreaks(600, 4.5)).toBe(2); // 10h
		});
	});

	describe("calculateInjectedBreakMinutes", () => {
		it("should return 0 for short trips", () => {
			expect(calculateInjectedBreakMinutes(200, defaultRSERules)).toBe(0);
		});

		it("should return 45 minutes for one break", () => {
			expect(calculateInjectedBreakMinutes(300, defaultRSERules)).toBe(45);
		});

		it("should return 90 minutes for two breaks", () => {
			expect(calculateInjectedBreakMinutes(600, defaultRSERules)).toBe(90);
		});
	});

	describe("recalculateWithCappedSpeed", () => {
		it("should not change duration if speed is under cap", () => {
			// 100km in 90 minutes = 66.67 km/h (under 85 km/h cap)
			const result = recalculateWithCappedSpeed(100, 90, 85);
			expect(result.speedWasCapped).toBe(false);
			expect(result.durationMinutes).toBe(90);
		});

		it("should recalculate duration if speed exceeds cap", () => {
			// 100km in 60 minutes = 100 km/h (over 85 km/h cap)
			// At 85 km/h, 100km takes 100/85*60 = 70.59 minutes
			const result = recalculateWithCappedSpeed(100, 60, 85);
			expect(result.speedWasCapped).toBe(true);
			expect(result.durationMinutes).toBeCloseTo(70.59, 1);
		});

		it("should handle zero distance", () => {
			const result = recalculateWithCappedSpeed(0, 60, 85);
			expect(result.speedWasCapped).toBe(false);
			expect(result.durationMinutes).toBe(60);
		});
	});

	describe("applySpeedCapping", () => {
		it("should cap speed on all segments that exceed limit", () => {
			// Create trip with high speeds (100 km/h implied)
			const tripAnalysis = createTripAnalysis(
				12, // 20km in 12min = 100 km/h
				60, // 100km in 60min = 100 km/h
				12, // 20km in 12min = 100 km/h
				20,
				100,
				20,
			);

			const result = applySpeedCapping(tripAnalysis, 85);
			expect(result.speedWasCapped).toBe(true);

			// All segments should be recalculated at 85 km/h
			// 20km at 85 km/h = 14.12 min
			// 100km at 85 km/h = 70.59 min
			expect(result.adjustedTripAnalysis.segments.approach?.durationMinutes).toBeCloseTo(14.12, 1);
			expect(result.adjustedTripAnalysis.segments.service.durationMinutes).toBeCloseTo(70.59, 1);
			expect(result.adjustedTripAnalysis.segments.return?.durationMinutes).toBeCloseTo(14.12, 1);
		});

		it("should not modify segments under speed limit", () => {
			// Create trip with low speeds (60 km/h implied)
			const tripAnalysis = createTripAnalysis(
				20, // 20km in 20min = 60 km/h
				100, // 100km in 100min = 60 km/h
				20, // 20km in 20min = 60 km/h
				20,
				100,
				20,
			);

			const result = applySpeedCapping(tripAnalysis, 85);
			expect(result.speedWasCapped).toBe(false);
			expect(result.adjustedTripAnalysis.segments.service.durationMinutes).toBe(100);
		});
	});
});

// ============================================================================
// AC1: RSE Rule Loading
// ============================================================================

describe("AC1: RSE Rule Loading", () => {
	it("should use provided RSE rules for validation", () => {
		const tripAnalysis = createTripAnalysis(30, 300, 30); // 6h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.rulesUsed).not.toBeNull();
		expect(result.rulesUsed?.maxDailyDrivingHours).toBe(10);
		expect(result.rulesUsed?.maxDailyAmplitudeHours).toBe(14);
		expect(result.rulesUsed?.cappedAverageSpeedKmh).toBe(85);
	});

	it("should use default rules when no rules provided", () => {
		const tripAnalysis = createTripAnalysis(30, 300, 30);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, null);

		expect(result.rulesUsed).not.toBeNull();
		expect(result.rulesUsed?.maxDailyDrivingHours).toBe(DEFAULT_HEAVY_VEHICLE_RSE_RULES.maxDailyDrivingHours);
	});

	it("should record all applied rules in result", () => {
		const tripAnalysis = createTripAnalysis(30, 300, 30);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.rulesApplied.length).toBeGreaterThan(0);
		expect(result.rulesApplied.some(r => r.ruleName === "Maximum Daily Driving Time")).toBe(true);
		expect(result.rulesApplied.some(r => r.ruleName === "Maximum Daily Amplitude")).toBe(true);
	});
});

// ============================================================================
// AC2: Blocking on Violation
// ============================================================================

describe("AC2: Blocking on Violation", () => {
	it("should return isCompliant=false when violations exist", () => {
		// 11 hours of driving (over 10h limit)
		const tripAnalysis = createTripAnalysis(60, 540, 60); // 11h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.isCompliant).toBe(false);
		expect(result.violations.length).toBeGreaterThan(0);
	});

	it("should include explicit error messages in violations", () => {
		const tripAnalysis = createTripAnalysis(60, 540, 60); // 11h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		const violation = result.violations[0];
		expect(violation.message).toContain("exceeds maximum");
		expect(violation.actual).toBeGreaterThan(0);
		expect(violation.limit).toBe(10);
		expect(violation.severity).toBe("BLOCKING");
	});

	it("should mark rules as FAIL in rulesApplied", () => {
		const tripAnalysis = createTripAnalysis(60, 540, 60);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		const drivingRule = result.rulesApplied.find(r => r.ruleName === "Maximum Daily Driving Time");
		expect(drivingRule?.result).toBe("FAIL");
	});
});

// ============================================================================
// AC3: 10-Hour Daily Driving Limit
// ============================================================================

describe("AC3: 10-Hour Daily Driving Limit", () => {
	it("should PASS when driving time is under 10 hours", () => {
		// 9 hours of driving
		const tripAnalysis = createTripAnalysis(30, 480, 30); // 9h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.isCompliant).toBe(true);
		expect(result.violations.filter(v => v.type === "DRIVING_TIME_EXCEEDED")).toHaveLength(0);
	});

	it("should PASS at exactly 10 hours (boundary)", () => {
		// Exactly 10 hours
		const tripAnalysis = createTripAnalysis(30, 540, 30); // 10h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.violations.filter(v => v.type === "DRIVING_TIME_EXCEEDED")).toHaveLength(0);
	});

	it("should FAIL when driving time exceeds 10 hours", () => {
		// 10h 1min of driving
		const tripAnalysis = createTripAnalysis(30, 541, 30); // 10h 1min total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.isCompliant).toBe(false);
		const violation = result.violations.find(v => v.type === "DRIVING_TIME_EXCEEDED");
		expect(violation).toBeDefined();
		expect(violation?.actual).toBeGreaterThan(10);
		expect(violation?.limit).toBe(10);
	});

	it("should WARN when approaching 10 hour limit (90%+)", () => {
		// 9.5 hours of driving (95% of limit)
		const tripAnalysis = createTripAnalysis(30, 510, 30); // 9.5h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.isCompliant).toBe(true);
		expect(result.warnings.some(w => w.type === "APPROACHING_LIMIT")).toBe(true);
	});
});

// ============================================================================
// AC4: 14-Hour Amplitude Limit
// ============================================================================

describe("AC4: 14-Hour Amplitude Limit", () => {
	it("should PASS when amplitude is under 14 hours", () => {
		// 10 hours driving = 2 breaks × 45min = 90min extra
		// Total amplitude = 10h + 1.5h = 11.5h (under 14h)
		const tripAnalysis = createTripAnalysis(30, 540, 30); // 10h total driving
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		// 10h driving + 90min breaks = 11.5h amplitude (under 14h)
		expect(result.violations.filter(v => v.type === "AMPLITUDE_EXCEEDED")).toHaveLength(0);
	});

	it("should FAIL when amplitude exceeds 14 hours", () => {
		// 15 hours amplitude (including breaks)
		const tripAnalysis = createTripAnalysis(60, 780, 60); // 15h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		const violation = result.violations.find(v => v.type === "AMPLITUDE_EXCEEDED");
		expect(violation).toBeDefined();
		expect(violation?.limit).toBe(14);
	});

	it("should include injected breaks in amplitude calculation", () => {
		// 10 hours driving = 2 breaks × 45min = 90min extra
		// Total amplitude = 10h + 1.5h = 11.5h (under 14h)
		const tripAnalysis = createTripAnalysis(30, 540, 30); // 10h driving
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.injectedBreakMinutes).toBe(90);
		// Amplitude = 600 + 90 = 690 minutes = 11.5 hours
		expect(result.adjustedDurations.totalAmplitudeMinutes).toBe(690);
	});
});

// ============================================================================
// AC5: Mandatory Break Injection
// ============================================================================

describe("AC5: Mandatory Break Injection", () => {
	it("should not inject breaks for trips under 4.5 hours", () => {
		const tripAnalysis = createTripAnalysis(30, 180, 30); // 4h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.injectedBreakMinutes).toBe(0);
	});

	it("should inject 45 minutes for trips between 4.5 and 9 hours", () => {
		const tripAnalysis = createTripAnalysis(30, 300, 30); // 6h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.injectedBreakMinutes).toBe(45);
	});

	it("should inject 90 minutes for trips between 9 and 13.5 hours", () => {
		const tripAnalysis = createTripAnalysis(30, 540, 30); // 10h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.injectedBreakMinutes).toBe(90);
	});

	it("should record break injection in rulesApplied", () => {
		const tripAnalysis = createTripAnalysis(30, 300, 30); // 6h total
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		const breakRule = result.rulesApplied.find(r => r.ruleName === "Mandatory Breaks");
		expect(breakRule).toBeDefined();
		expect(breakRule?.actualValue).toBe(45);
	});
});

// ============================================================================
// AC6: Capped Average Speed
// ============================================================================

describe("AC6: Capped Average Speed", () => {
	it("should apply speed cap of 85 km/h for heavy vehicles", () => {
		// Create trip with high speed (100 km/h implied)
		const tripAnalysis = createTripAnalysis(
			12, // 20km in 12min = 100 km/h
			60, // 100km in 60min = 100 km/h
			12, // 20km in 12min = 100 km/h
			20,
			100,
			20,
		);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.cappedSpeedApplied).toBe(true);
		// Original: 12 + 60 + 12 = 84 minutes
		// Capped: ~14.12 + ~70.59 + ~14.12 = ~98.83 minutes
		expect(result.adjustedDurations.totalDrivingMinutes).toBeGreaterThan(84);
	});

	it("should not apply speed cap when speed is under limit", () => {
		// Create trip with low speed (60 km/h implied)
		const tripAnalysis = createTripAnalysis(
			20, // 20km in 20min = 60 km/h
			100, // 100km in 100min = 60 km/h
			20, // 20km in 20min = 60 km/h
			20,
			100,
			20,
		);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.cappedSpeedApplied).toBe(false);
		expect(result.adjustedDurations.totalDrivingMinutes).toBe(140);
	});

	it("should record speed capping in rulesApplied", () => {
		const tripAnalysis = createTripAnalysis(12, 60, 12, 20, 100, 20);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		const speedRule = result.rulesApplied.find(r => r.ruleName === "Capped Average Speed");
		expect(speedRule).toBeDefined();
		expect(speedRule?.threshold).toBe(85);
	});
});

// ============================================================================
// AC7: Multi-Tenancy
// ============================================================================

describe("AC7: Multi-Tenancy", () => {
	it("should use organization-specific rules", () => {
		const tripAnalysis = createTripAnalysis(30, 480, 30);
		const input = createValidationInput(tripAnalysis);

		// Custom rules for this organization
		const customRules: RSERules = {
			...defaultRSERules,
			maxDailyDrivingHours: 8, // Stricter limit
		};

		const result = validateHeavyVehicleCompliance(input, customRules);

		// 9h driving should fail with 8h limit
		expect(result.isCompliant).toBe(false);
		expect(result.rulesUsed?.maxDailyDrivingHours).toBe(8);
	});

	it("should handle different amplitude limits per organization", () => {
		const tripAnalysis = createTripAnalysis(30, 720, 30); // 13h
		const input = createValidationInput(tripAnalysis);

		// Organization with stricter amplitude limit
		const strictRules: RSERules = {
			...defaultRSERules,
			maxDailyAmplitudeHours: 12,
		};

		const result = validateHeavyVehicleCompliance(input, strictRules);

		expect(result.violations.some(v => v.type === "AMPLITUDE_EXCEEDED")).toBe(true);
	});
});

// ============================================================================
// LIGHT Vehicle Bypass
// ============================================================================

describe("LIGHT Vehicle Bypass", () => {
	it("should skip validation for LIGHT vehicles", () => {
		const tripAnalysis = createTripAnalysis(60, 720, 60); // 14h - would fail for HEAVY
		const input = createValidationInput(tripAnalysis, "LIGHT");

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.isCompliant).toBe(true);
		expect(result.violations).toHaveLength(0);
		expect(result.rulesApplied).toHaveLength(0);
		expect(result.rulesUsed).toBeNull();
	});

	it("should return correct regulatory category for LIGHT vehicles", () => {
		const tripAnalysis = createTripAnalysis(30, 300, 30);
		const input = createValidationInput(tripAnalysis, "LIGHT");

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.regulatoryCategory).toBe("LIGHT");
	});
});

// ============================================================================
// Utility Functions
// ============================================================================

describe("Utility Functions", () => {
	describe("isHeavyVehicleTripCompliant", () => {
		it("should return true for compliant trips", () => {
			const tripAnalysis = createTripAnalysis(30, 300, 30);
			const input = createValidationInput(tripAnalysis);

			expect(isHeavyVehicleTripCompliant(input, defaultRSERules)).toBe(true);
		});

		it("should return false for non-compliant trips", () => {
			const tripAnalysis = createTripAnalysis(60, 600, 60);
			const input = createValidationInput(tripAnalysis);

			expect(isHeavyVehicleTripCompliant(input, defaultRSERules)).toBe(false);
		});
	});

	describe("getComplianceSummary", () => {
		it("should return OK status for compliant trips", () => {
			const tripAnalysis = createTripAnalysis(30, 300, 30);
			const input = createValidationInput(tripAnalysis);
			const result = validateHeavyVehicleCompliance(input, defaultRSERules);

			const summary = getComplianceSummary(result);

			expect(summary.status).toBe("OK");
			expect(summary.violationCount).toBe(0);
		});

		it("should return WARNING status for trips with warnings only", () => {
			// 9.5 hours - approaching limit
			const tripAnalysis = createTripAnalysis(30, 510, 30);
			const input = createValidationInput(tripAnalysis);
			const result = validateHeavyVehicleCompliance(input, defaultRSERules);

			const summary = getComplianceSummary(result);

			expect(summary.status).toBe("WARNING");
			expect(summary.warningCount).toBeGreaterThan(0);
		});

		it("should return VIOLATION status for non-compliant trips", () => {
			const tripAnalysis = createTripAnalysis(60, 600, 60);
			const input = createValidationInput(tripAnalysis);
			const result = validateHeavyVehicleCompliance(input, defaultRSERules);

			const summary = getComplianceSummary(result);

			expect(summary.status).toBe("VIOLATION");
			expect(summary.violationCount).toBeGreaterThan(0);
		});
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle zero duration segments", () => {
		const tripAnalysis = createTripAnalysis(0, 300, 0);
		tripAnalysis.segments.approach = null;
		tripAnalysis.segments.return = null;
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.totalDrivingMinutes).toBe(300);
	});

	it("should handle very long trips", () => {
		// 20 hours of driving
		const tripAnalysis = createTripAnalysis(60, 1080, 60);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.isCompliant).toBe(false);
		expect(result.violations.length).toBeGreaterThanOrEqual(1);
	});

	it("should preserve original durations in result", () => {
		const tripAnalysis = createTripAnalysis(12, 60, 12, 20, 100, 20);
		const input = createValidationInput(tripAnalysis);

		const result = validateHeavyVehicleCompliance(input, defaultRSERules);

		expect(result.adjustedDurations.originalDrivingMinutes).toBe(84);
		expect(result.adjustedDurations.totalDrivingMinutes).toBeGreaterThan(84);
	});
});
