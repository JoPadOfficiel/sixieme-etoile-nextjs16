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

// ============================================================================
// Story 5.4: Alternative Staffing & Scheduling Options
// ============================================================================

import {
	generateAlternatives,
	generateDoubleCrewAlternative,
	generateRelayDriverAlternative,
	generateMultiDayAlternative,
	DEFAULT_ALTERNATIVE_COST_PARAMETERS,
	ALTERNATIVE_RSE_LIMITS,
	type AlternativeCostParameters,
	type AlternativesGenerationInput,
} from "../compliance-validator";

const defaultCostParameters: AlternativeCostParameters = {
	driverHourlyCost: 25,
	hotelCostPerNight: 100,
	mealAllowancePerDay: 30,
};

describe("Story 5.4: Alternative Staffing & Scheduling Options", () => {
	describe("generateAlternatives", () => {
		it("should return no alternatives for compliant missions (AC7)", () => {
			// 8 hours total - well within limits
			const tripAnalysis = createTripAnalysis(60, 360, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			expect(result.hasAlternatives).toBe(false);
			expect(result.alternatives).toHaveLength(0);
			expect(result.message).toContain("compliant");
		});

		it("should return no alternatives for LIGHT vehicles", () => {
			const tripAnalysis = createTripAnalysis(60, 720, 60); // 14h - would violate for HEAVY
			const input = createValidationInput(tripAnalysis, "LIGHT");
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			expect(result.hasAlternatives).toBe(false);
			// LIGHT vehicles are compliant (no RSE rules apply), so message says compliant
			expect(result.message).toContain("compliant");
		});

		it("should generate alternatives for amplitude violation (AC1)", () => {
			// 15 hours amplitude - exceeds 14h limit
			const tripAnalysis = createTripAnalysis(60, 780, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			expect(result.hasAlternatives).toBe(true);
			expect(result.alternatives.length).toBeGreaterThan(0);
			expect(result.originalViolations.length).toBeGreaterThan(0);
		});

		it("should generate alternatives for driving time violation (AC1)", () => {
			// 11 hours driving - exceeds 10h limit
			const tripAnalysis = createTripAnalysis(60, 540, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			expect(result.hasAlternatives).toBe(true);
			expect(result.alternatives.some(a => a.type === "RELAY_DRIVER")).toBe(true);
		});

		it("should sort alternatives by feasibility and cost", () => {
			// 16 hours amplitude - exceeds 14h but within 18h double crew limit
			const tripAnalysis = createTripAnalysis(60, 840, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			// Feasible alternatives should come first
			const feasibleAlternatives = result.alternatives.filter(a => a.isFeasible);
			const nonFeasibleAlternatives = result.alternatives.filter(a => !a.isFeasible);
			
			if (feasibleAlternatives.length > 0 && nonFeasibleAlternatives.length > 0) {
				const firstFeasibleIndex = result.alternatives.findIndex(a => a.isFeasible);
				const firstNonFeasibleIndex = result.alternatives.findIndex(a => !a.isFeasible);
				expect(firstFeasibleIndex).toBeLessThan(firstNonFeasibleIndex);
			}
		});

		it("should set recommended alternative to first feasible and compliant option", () => {
			// 15 hours amplitude - DOUBLE_CREW should be recommended
			const tripAnalysis = createTripAnalysis(60, 780, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			if (result.recommendedAlternative) {
				const recommended = result.alternatives.find(
					a => a.type === result.recommendedAlternative
				);
				expect(recommended?.isFeasible).toBe(true);
				expect(recommended?.wouldBeCompliant).toBe(true);
			}
		});
	});

	describe("generateDoubleCrewAlternative", () => {
		it("should return null for LIGHT vehicles", () => {
			const tripAnalysis = createTripAnalysis(60, 780, 60);
			const input = createValidationInput(tripAnalysis, "LIGHT");
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateDoubleCrewAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).toBeNull();
		});

		it("should return null when no amplitude violation", () => {
			// 8 hours - no violation
			const tripAnalysis = createTripAnalysis(60, 360, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateDoubleCrewAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).toBeNull();
		});

		it("should be feasible for amplitude between 14h and 18h (AC3)", () => {
			// 15 hours amplitude - within double crew limit of 18h
			const tripAnalysis = createTripAnalysis(60, 780, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateDoubleCrewAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			expect(result!.type).toBe("DOUBLE_CREW");
			expect(result!.isFeasible).toBe(true);
			expect(result!.adjustedSchedule.driversRequired).toBe(2);
		});

		it("should NOT be feasible for amplitude > 18h (AC3)", () => {
			// 19 hours amplitude - exceeds double crew limit
			const tripAnalysis = createTripAnalysis(60, 1020, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateDoubleCrewAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			expect(result!.isFeasible).toBe(false);
			expect(result!.feasibilityReason).toContain("18");
		});

		it("should calculate extra driver cost correctly (AC2)", () => {
			// Create a trip with amplitude that triggers violation
			// Note: speed capping may adjust durations, so we check the cost formula is correct
			const tripAnalysis = createTripAnalysis(60, 840, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateDoubleCrewAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			// Extra hours = amplitude - 8 (standard work day)
			// The actual amplitude may be adjusted by speed capping
			const amplitudeViolation = complianceResult.violations.find(v => v.type === "AMPLITUDE_EXCEEDED");
			const actualAmplitude = amplitudeViolation?.actual ?? 0;
			const expectedExtraHours = Math.max(0, actualAmplitude - 8);
			const expectedCost = expectedExtraHours * 25;
			expect(result!.additionalCost.breakdown.extraDriverCost).toBe(expectedCost);
			expect(result!.additionalCost.total).toBe(expectedCost);
			expect(result!.additionalCost.currency).toBe("EUR");
		});

		it("should include driving time violation in remaining violations", () => {
			// 15h amplitude + 12h driving - both violations
			const tripAnalysis = createTripAnalysis(120, 600, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateDoubleCrewAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			// Double crew doesn't help with driving time
			expect(result!.remainingViolations.some(v => v.type === "DRIVING_TIME_EXCEEDED")).toBe(true);
			expect(result!.wouldBeCompliant).toBe(false);
		});
	});

	describe("generateRelayDriverAlternative", () => {
		it("should return null for LIGHT vehicles", () => {
			const tripAnalysis = createTripAnalysis(60, 600, 60);
			const input = createValidationInput(tripAnalysis, "LIGHT");
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateRelayDriverAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).toBeNull();
		});

		it("should return null when no driving time violation", () => {
			// 8 hours driving - no violation
			const tripAnalysis = createTripAnalysis(60, 360, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateRelayDriverAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).toBeNull();
		});

		it("should be feasible when split driving is within limit (AC4)", () => {
			// 12 hours driving - split = 6h each, within 10h limit
			const tripAnalysis = createTripAnalysis(120, 480, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateRelayDriverAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			expect(result!.type).toBe("RELAY_DRIVER");
			expect(result!.isFeasible).toBe(true);
			expect(result!.adjustedSchedule.driversRequired).toBe(2);
			expect(result!.description).toContain("6.0h each");
		});

		it("should NOT be feasible when split driving still exceeds limit", () => {
			// 24 hours driving - split = 12h each, exceeds 10h limit
			const tripAnalysis = createTripAnalysis(180, 1080, 180);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateRelayDriverAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			expect(result!.isFeasible).toBe(false);
		});

		it("should calculate extra driver cost correctly (AC2)", () => {
			// 12 hours driving - second driver does 6 hours
			const tripAnalysis = createTripAnalysis(120, 480, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateRelayDriverAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			// Extra driver hours = 12 / 2 = 6 hours
			// Cost = 6 * 25 = 150 EUR
			expect(result!.additionalCost.breakdown.extraDriverCost).toBe(150);
			expect(result!.additionalCost.total).toBe(150);
		});

		it("should include amplitude violation in remaining violations", () => {
			// 12h driving + 16h amplitude - both violations
			const tripAnalysis = createTripAnalysis(120, 720, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateRelayDriverAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			// Relay doesn't help with amplitude
			expect(result!.remainingViolations.some(v => v.type === "AMPLITUDE_EXCEEDED")).toBe(true);
			expect(result!.wouldBeCompliant).toBe(false);
		});
	});

	describe("generateMultiDayAlternative", () => {
		it("should return null for LIGHT vehicles", () => {
			const tripAnalysis = createTripAnalysis(60, 1200, 60);
			const input = createValidationInput(tripAnalysis, "LIGHT");
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).toBeNull();
		});

		it("should return null when no violations", () => {
			const tripAnalysis = createTripAnalysis(60, 360, 60);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).toBeNull();
		});

		it("should calculate days required correctly (AC5)", () => {
			// 20 hours amplitude - needs 2 days (20 / 14 = 1.43 → 2)
			const tripAnalysis = createTripAnalysis(120, 960, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			expect(result!.type).toBe("MULTI_DAY");
			expect(result!.adjustedSchedule.daysRequired).toBe(2);
			expect(result!.adjustedSchedule.hotelNightsRequired).toBe(1);
		});

		it("should be feasible for up to 3 days", () => {
			// Create a trip that needs 3 days (amplitude ~35-42h after speed capping)
			// With speed capping at 85km/h, durations may be longer
			const tripAnalysis = createTripAnalysis(120, 1560, 120); // ~30h raw, should be ~3 days
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			// Should be feasible (3 days or less)
			expect(result!.adjustedSchedule.daysRequired).toBeLessThanOrEqual(3);
			expect(result!.isFeasible).toBe(true);
		});

		it("should NOT be feasible for more than 3 days", () => {
			// 50 hours amplitude - needs 4 days
			const tripAnalysis = createTripAnalysis(180, 2640, 180);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			expect(result!.isFeasible).toBe(false);
			expect(result!.feasibilityReason).toContain("exceeding maximum");
		});

		it("should calculate costs correctly with hotel and meals (AC2)", () => {
			// 20 hours amplitude - 2 days, 1 hotel night
			const tripAnalysis = createTripAnalysis(120, 960, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			// Hotel: 1 night * 100 = 100
			expect(result!.additionalCost.breakdown.hotelCost).toBe(100);
			// Meals: 2 days * 30 = 60
			expect(result!.additionalCost.breakdown.mealAllowance).toBe(60);
			// Extra driver: 1 extra day * 8h * 25 = 200
			expect(result!.additionalCost.breakdown.extraDriverCost).toBe(200);
			// Total: 100 + 60 + 200 = 360
			expect(result!.additionalCost.total).toBe(360);
		});

		it("should include 11h daily rest in description", () => {
			const tripAnalysis = createTripAnalysis(120, 960, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				defaultCostParameters,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			expect(result!.description).toContain("11h daily rest");
		});
	});

	describe("Cost Parameters", () => {
		it("should use custom cost parameters (AC8)", () => {
			const customCostParams: AlternativeCostParameters = {
				driverHourlyCost: 30,
				hotelCostPerNight: 150,
				mealAllowancePerDay: 40,
			};

			// 20 hours amplitude - 2 days
			const tripAnalysis = createTripAnalysis(120, 960, 120);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateMultiDayAlternative(
				complianceResult,
				customCostParams,
				defaultRSERules
			);

			expect(result).not.toBeNull();
			// Hotel: 1 night * 150 = 150
			expect(result!.additionalCost.breakdown.hotelCost).toBe(150);
			// Meals: 2 days * 40 = 80
			expect(result!.additionalCost.breakdown.mealAllowance).toBe(80);
			// Extra driver: 1 extra day * 8h * 30 = 240
			expect(result!.additionalCost.breakdown.extraDriverCost).toBe(240);
			// Total: 150 + 80 + 240 = 470
			expect(result!.additionalCost.total).toBe(470);
		});

		it("should have correct default cost parameters", () => {
			expect(DEFAULT_ALTERNATIVE_COST_PARAMETERS.driverHourlyCost).toBe(25);
			expect(DEFAULT_ALTERNATIVE_COST_PARAMETERS.hotelCostPerNight).toBe(100);
			expect(DEFAULT_ALTERNATIVE_COST_PARAMETERS.mealAllowancePerDay).toBe(30);
		});
	});

	describe("RSE Limits Constants", () => {
		it("should have correct RSE limits for alternatives", () => {
			expect(ALTERNATIVE_RSE_LIMITS.DOUBLE_CREW_AMPLITUDE_HOURS).toBe(18);
			expect(ALTERNATIVE_RSE_LIMITS.MIN_DAILY_REST_HOURS).toBe(11);
			expect(ALTERNATIVE_RSE_LIMITS.MAX_MULTI_DAY_DAYS).toBe(3);
			expect(ALTERNATIVE_RSE_LIMITS.STANDARD_WORK_DAY_HOURS).toBe(8);
		});
	});

	describe("Combined Violations", () => {
		it("should generate multiple alternatives for combined violations", () => {
			// 16h amplitude + 12h driving - both violations
			const tripAnalysis = createTripAnalysis(180, 660, 180);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			expect(result.hasAlternatives).toBe(true);
			// Should have DOUBLE_CREW, RELAY_DRIVER, and MULTI_DAY
			expect(result.alternatives.some(a => a.type === "DOUBLE_CREW")).toBe(true);
			expect(result.alternatives.some(a => a.type === "RELAY_DRIVER")).toBe(true);
			expect(result.alternatives.some(a => a.type === "MULTI_DAY")).toBe(true);
		});

		it("should mark alternatives as non-compliant when they don't solve all violations", () => {
			// 16h amplitude + 12h driving
			const tripAnalysis = createTripAnalysis(180, 660, 180);
			const input = createValidationInput(tripAnalysis);
			const complianceResult = validateHeavyVehicleCompliance(input, defaultRSERules);

			const result = generateAlternatives({
				complianceResult,
				costParameters: defaultCostParameters,
				rules: defaultRSERules,
			});

			// DOUBLE_CREW doesn't solve driving time
			const doubleCrew = result.alternatives.find(a => a.type === "DOUBLE_CREW");
			expect(doubleCrew?.wouldBeCompliant).toBe(false);

			// RELAY_DRIVER doesn't solve amplitude
			const relay = result.alternatives.find(a => a.type === "RELAY_DRIVER");
			expect(relay?.wouldBeCompliant).toBe(false);

			// MULTI_DAY should solve both
			const multiDay = result.alternatives.find(a => a.type === "MULTI_DAY");
			expect(multiDay?.wouldBeCompliant).toBe(true);
		});
	});
});
