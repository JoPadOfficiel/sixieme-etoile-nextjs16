/**
 * Story 18.5: Stay vs Return Empty Scenario Comparison - Unit Tests
 */

import { describe, it, expect } from "vitest";
import {
	calculateStayOnSiteScenario,
	calculateReturnEmptyScenario,
	compareStayVsReturn,
	calculateStayVsReturnComparison,
	buildScenarioSelectionRule,
	DEFAULT_STAY_VS_RETURN_SETTINGS,
	type LossOfExploitationResult,
	type StayOnSiteScenario,
	type ReturnEmptyScenario,
	type StayVsReturnComparison,
} from "../pricing-engine";

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Create a mock LossOfExploitationResult for testing
 */
function createMockLossOfExploitation(
	overrides: Partial<LossOfExploitationResult> = {},
): LossOfExploitationResult {
	return {
		totalDays: 3,
		idleDays: 1,
		isMultiDay: true,
		dailyReferenceRevenue: 400,
		dailyRevenueSource: "HOURLY_RATE_8H",
		vehicleCategoryId: "cat-1",
		vehicleCategoryName: "Berline",
		seasonalityCoefficient: 0.8,
		seasonalityPeriod: "HIGH_SEASON",
		seasonalityMultiplierName: "Été",
		lossOfExploitation: 320, // 1 × 400 × 0.8
		calculation: {
			formula: "1 × 400.00€ × 80% = 320.00€",
			idleDays: 1,
			dailyRevenue: 400,
			coefficient: 0.8,
			total: 320,
		},
		...overrides,
	};
}

// ============================================================================
// calculateStayOnSiteScenario Tests
// ============================================================================

describe("calculateStayOnSiteScenario", () => {
	const defaultStaffingSettings = {
		hotelCostPerNight: 120,
		mealCostPerDay: 25,
		driverOvernightPremium: 50,
	};

	it("SVR-01: should calculate stay scenario with all costs", () => {
		const loeResult = createMockLossOfExploitation({
			totalDays: 3,
			idleDays: 1,
			lossOfExploitation: 320,
		});

		const result = calculateStayOnSiteScenario(
			3, // totalDays
			1, // idleDays
			loeResult,
			defaultStaffingSettings,
		);

		// nights = totalDays - 1 = 2
		expect(result.hotelCost).toBe(240); // 2 × 120
		expect(result.mealCost).toBe(75); // 3 × 25
		expect(result.driverPremium).toBe(100); // 2 × 50
		expect(result.lossOfExploitation).toBe(320);
		expect(result.totalCost).toBe(735); // 240 + 75 + 100 + 320
	});

	it("SVR-14: should calculate nights correctly (days - 1)", () => {
		const loeResult = createMockLossOfExploitation({ totalDays: 5, idleDays: 3 });

		const result = calculateStayOnSiteScenario(5, 3, loeResult, defaultStaffingSettings);

		expect(result.breakdown.nights).toBe(4); // 5 - 1
		expect(result.breakdown.days).toBe(5);
	});

	it("should handle single day mission (0 nights)", () => {
		const loeResult = createMockLossOfExploitation({
			totalDays: 1,
			idleDays: 0,
			isMultiDay: false,
			lossOfExploitation: 0,
		});

		const result = calculateStayOnSiteScenario(1, 0, loeResult, defaultStaffingSettings);

		expect(result.breakdown.nights).toBe(0);
		expect(result.hotelCost).toBe(0);
		expect(result.driverPremium).toBe(0);
		expect(result.mealCost).toBe(25); // 1 day
	});

	it("should include breakdown with all details", () => {
		const loeResult = createMockLossOfExploitation();

		const result = calculateStayOnSiteScenario(3, 1, loeResult, defaultStaffingSettings);

		expect(result.breakdown).toEqual({
			nights: 2,
			hotelCostPerNight: 120,
			days: 3,
			mealCostPerDay: 25,
			driverPremiumPerNight: 50,
			idleDays: 1,
			dailyRevenue: 400,
			seasonalityCoefficient: 0.8,
		});
	});
});

// ============================================================================
// calculateReturnEmptyScenario Tests
// ============================================================================

describe("calculateReturnEmptyScenario", () => {
	const defaultSettings = {
		fuelCostPerKm: 0.15,
		driverHourlyRate: 25,
		maxReturnEmptyDistanceKm: 300,
	};

	it("SVR-02: should calculate return scenario with viable distance", () => {
		const result = calculateReturnEmptyScenario(
			200, // distanceOneWayKm
			180, // durationOneWayMinutes (3h)
			1, // idleDays
			15, // tollCostPerTrip
			defaultSettings,
		);

		expect(result.isViable).toBe(true);
		expect(result.reason).toBeNull();
		// 1 idle day × 2 trips = 2 trips
		expect(result.emptyTripsCount).toBe(2);
		// 2 trips × 200km = 400km
		expect(result.totalEmptyDistanceKm).toBe(400);
		// 400km × 0.15 = 60
		expect(result.fuelCost).toBe(60);
		// 2 trips × 15 = 30
		expect(result.tollCost).toBe(30);
		// 2 trips × 3h × 25 = 150
		expect(result.driverTimeCost).toBe(150);
		// Total: 60 + 30 + 150 = 240
		expect(result.totalCost).toBe(240);
	});

	it("SVR-03: should mark return as not viable for excessive distance", () => {
		const result = calculateReturnEmptyScenario(
			400, // distanceOneWayKm > 300 max
			240, // durationOneWayMinutes
			1,
			15,
			defaultSettings,
		);

		expect(result.isViable).toBe(false);
		expect(result.reason).toContain("Distance trop longue");
		expect(result.reason).toContain("400km > 300km");
		expect(result.totalCost).toBe(Number.POSITIVE_INFINITY);
	});

	it("SVR-13: should calculate correct empty trips count (2 per idle day)", () => {
		const result = calculateReturnEmptyScenario(100, 60, 3, 10, defaultSettings);

		// 3 idle days × 2 trips per day = 6 trips
		expect(result.emptyTripsCount).toBe(6);
		expect(result.breakdown.tripsPerIdleDay).toBe(2);
	});

	it("should include breakdown with all details", () => {
		const result = calculateReturnEmptyScenario(200, 180, 1, 15, defaultSettings);

		expect(result.breakdown).toEqual({
			distanceOneWayKm: 200,
			durationOneWayMinutes: 180,
			fuelCostPerKm: 0.15,
			tollCostPerTrip: 15,
			driverHourlyRate: 25,
			tripsPerIdleDay: 2,
		});
	});
});

// ============================================================================
// compareStayVsReturn Tests
// ============================================================================

describe("compareStayVsReturn", () => {
	it("SVR-04: should recommend stay when it is cheaper", () => {
		const stayScenario: StayOnSiteScenario = {
			hotelCost: 240,
			mealCost: 75,
			driverPremium: 100,
			lossOfExploitation: 320,
			totalCost: 735,
			breakdown: {} as StayOnSiteScenario["breakdown"],
		};

		const returnScenario: ReturnEmptyScenario = {
			isViable: true,
			reason: null,
			emptyTripsCount: 4,
			totalEmptyDistanceKm: 800,
			fuelCost: 120,
			tollCost: 60,
			driverTimeCost: 600,
			totalCost: 780,
			breakdown: {} as ReturnEmptyScenario["breakdown"],
		};

		const result = compareStayVsReturn(stayScenario, returnScenario);

		expect(result.recommendedScenario).toBe("STAY_ON_SITE");
		expect(result.costDifference).toBe(45); // 780 - 735
		expect(result.recommendation).toContain("Rester sur place recommandé");
	});

	it("SVR-05: should recommend return when it is cheaper", () => {
		const stayScenario: StayOnSiteScenario = {
			hotelCost: 240,
			mealCost: 75,
			driverPremium: 100,
			lossOfExploitation: 640, // High LOE
			totalCost: 1055,
			breakdown: {} as StayOnSiteScenario["breakdown"],
		};

		const returnScenario: ReturnEmptyScenario = {
			isViable: true,
			reason: null,
			emptyTripsCount: 4,
			totalEmptyDistanceKm: 400,
			fuelCost: 60,
			tollCost: 60,
			driverTimeCost: 300,
			totalCost: 420,
			breakdown: {} as ReturnEmptyScenario["breakdown"],
		};

		const result = compareStayVsReturn(stayScenario, returnScenario);

		expect(result.recommendedScenario).toBe("RETURN_EMPTY");
		expect(result.costDifference).toBe(635); // 1055 - 420
		expect(result.recommendation).toContain("Retour à vide recommandé");
	});

	it("SVR-06: should recommend stay when return is not viable", () => {
		const stayScenario: StayOnSiteScenario = {
			hotelCost: 240,
			mealCost: 75,
			driverPremium: 100,
			lossOfExploitation: 320,
			totalCost: 735,
			breakdown: {} as StayOnSiteScenario["breakdown"],
		};

		const returnScenario: ReturnEmptyScenario = {
			isViable: false,
			reason: "Distance trop longue pour retour à vide (400km > 300km)",
			emptyTripsCount: 0,
			totalEmptyDistanceKm: 0,
			fuelCost: 0,
			tollCost: 0,
			driverTimeCost: 0,
			totalCost: Number.POSITIVE_INFINITY,
			breakdown: {} as ReturnEmptyScenario["breakdown"],
		};

		const result = compareStayVsReturn(stayScenario, returnScenario);

		expect(result.recommendedScenario).toBe("STAY_ON_SITE");
		expect(result.costDifference).toBe(0);
		expect(result.recommendation).toContain("seule option viable");
	});

	it("SVR-15: should calculate percentage savings correctly", () => {
		const stayScenario: StayOnSiteScenario = {
			hotelCost: 100,
			mealCost: 50,
			driverPremium: 50,
			lossOfExploitation: 200,
			totalCost: 400,
			breakdown: {} as StayOnSiteScenario["breakdown"],
		};

		const returnScenario: ReturnEmptyScenario = {
			isViable: true,
			reason: null,
			emptyTripsCount: 2,
			totalEmptyDistanceKm: 200,
			fuelCost: 30,
			tollCost: 20,
			driverTimeCost: 150,
			totalCost: 200,
			breakdown: {} as ReturnEmptyScenario["breakdown"],
		};

		const result = compareStayVsReturn(stayScenario, returnScenario);

		// Return is cheaper: savings = 400 - 200 = 200
		// Percentage = 200 / 400 * 100 = 50%
		expect(result.recommendedScenario).toBe("RETURN_EMPTY");
		expect(result.costDifference).toBe(200);
		expect(result.percentageSavings).toBe(50);
	});
});

// ============================================================================
// calculateStayVsReturnComparison Tests
// ============================================================================

describe("calculateStayVsReturnComparison", () => {
	const defaultSettings = {
		maxReturnEmptyDistanceKm: 300,
		minIdleDaysForComparison: 1,
		hotelCostPerNight: 120,
		mealCostPerDay: 25,
		driverOvernightPremium: 50,
		fuelConsumptionL100km: 8.0,
		fuelPricePerLiter: 1.80,
		driverHourlyCost: 25,
	};

	it("SVR-07: should return not applicable for 1-day mission", () => {
		const loeResult = createMockLossOfExploitation({
			totalDays: 1,
			idleDays: 0,
			isMultiDay: false,
		});

		const result = calculateStayVsReturnComparison(loeResult, 200, 180, 15, defaultSettings);

		expect(result.isApplicable).toBe(false);
		expect(result.stayScenario).toBeNull();
		expect(result.returnScenario).toBeNull();
		expect(result.recommendedScenario).toBeNull();
	});

	it("SVR-08: should return not applicable for 0 idle days", () => {
		const loeResult = createMockLossOfExploitation({
			totalDays: 2,
			idleDays: 0,
			isMultiDay: true,
		});

		const result = calculateStayVsReturnComparison(loeResult, 200, 180, 15, defaultSettings);

		expect(result.isApplicable).toBe(false);
	});

	it("should calculate full comparison for multi-day mission", () => {
		const loeResult = createMockLossOfExploitation({
			totalDays: 3,
			idleDays: 1,
			lossOfExploitation: 320,
		});

		const result = calculateStayVsReturnComparison(loeResult, 200, 180, 15, defaultSettings);

		expect(result.isApplicable).toBe(true);
		expect(result.stayScenario).not.toBeNull();
		expect(result.returnScenario).not.toBeNull();
		expect(result.recommendedScenario).toBeDefined();
		expect(result.selectedScenario).toBe(result.recommendedScenario);
		expect(result.scenarioOverridden).toBe(false);
	});

	it("should use default settings when not provided", () => {
		const loeResult = createMockLossOfExploitation();

		const result = calculateStayVsReturnComparison(loeResult, 200, 180, 15, {});

		expect(result.isApplicable).toBe(true);
		expect(result.stayScenario?.breakdown.hotelCostPerNight).toBe(
			DEFAULT_STAY_VS_RETURN_SETTINGS.hotelCostPerNight,
		);
	});

	it("should handle Decimal-like objects from Prisma", () => {
		const loeResult = createMockLossOfExploitation();
		const settingsWithDecimals = {
			maxReturnEmptyDistanceKm: { toNumber: () => 300 },
			hotelCostPerNight: { toNumber: () => 120 },
			mealCostPerDay: { toNumber: () => 25 },
			driverOvernightPremium: { toNumber: () => 50 },
		};

		const result = calculateStayVsReturnComparison(
			loeResult,
			200,
			180,
			15,
			settingsWithDecimals as any,
		);

		expect(result.isApplicable).toBe(true);
		expect(result.stayScenario?.breakdown.hotelCostPerNight).toBe(120);
	});
});

// ============================================================================
// buildScenarioSelectionRule Tests
// ============================================================================

describe("buildScenarioSelectionRule", () => {
	it("SVR-09: should build rule for stay selection", () => {
		const comparison: StayVsReturnComparison = {
			isApplicable: true,
			stayScenario: {
				hotelCost: 240,
				mealCost: 75,
				driverPremium: 100,
				lossOfExploitation: 320,
				totalCost: 735,
				breakdown: {} as StayOnSiteScenario["breakdown"],
			},
			returnScenario: {
				isViable: true,
				reason: null,
				emptyTripsCount: 4,
				totalEmptyDistanceKm: 800,
				fuelCost: 120,
				tollCost: 60,
				driverTimeCost: 600,
				totalCost: 780,
				breakdown: {} as ReturnEmptyScenario["breakdown"],
			},
			recommendedScenario: "STAY_ON_SITE",
			selectedScenario: "STAY_ON_SITE",
			scenarioOverridden: false,
			costDifference: 45,
			percentageSavings: 5.8,
			recommendation: "Rester sur place recommandé",
		};

		const rule = buildScenarioSelectionRule(comparison);

		expect(rule).not.toBeNull();
		expect(rule?.type).toBe("MULTI_DAY_SCENARIO_SELECTION");
		expect(rule?.selectedScenario).toBe("STAY_ON_SITE");
		expect(rule?.scenarioCost).toBe(735);
		expect(rule?.alternativeCost).toBe(780);
		expect(rule?.description).toContain("Rester sur place");
	});

	it("SVR-10: should build rule for return selection", () => {
		const comparison: StayVsReturnComparison = {
			isApplicable: true,
			stayScenario: {
				hotelCost: 240,
				mealCost: 75,
				driverPremium: 100,
				lossOfExploitation: 640,
				totalCost: 1055,
				breakdown: {} as StayOnSiteScenario["breakdown"],
			},
			returnScenario: {
				isViable: true,
				reason: null,
				emptyTripsCount: 4,
				totalEmptyDistanceKm: 400,
				fuelCost: 60,
				tollCost: 60,
				driverTimeCost: 300,
				totalCost: 420,
				breakdown: {} as ReturnEmptyScenario["breakdown"],
			},
			recommendedScenario: "RETURN_EMPTY",
			selectedScenario: "RETURN_EMPTY",
			scenarioOverridden: false,
			costDifference: 635,
			percentageSavings: 60.2,
			recommendation: "Retour à vide recommandé",
		};

		const rule = buildScenarioSelectionRule(comparison);

		expect(rule).not.toBeNull();
		expect(rule?.type).toBe("MULTI_DAY_SCENARIO_SELECTION");
		expect(rule?.selectedScenario).toBe("RETURN_EMPTY");
		expect(rule?.scenarioCost).toBe(420);
		expect(rule?.alternativeCost).toBe(1055);
		expect(rule?.description).toContain("Retour à vide");
	});

	it("SVR-11: should mark rule as overridden when applicable", () => {
		const comparison: StayVsReturnComparison = {
			isApplicable: true,
			stayScenario: {
				totalCost: 735,
			} as StayOnSiteScenario,
			returnScenario: {
				isViable: true,
				totalCost: 420,
			} as ReturnEmptyScenario,
			recommendedScenario: "RETURN_EMPTY",
			selectedScenario: "STAY_ON_SITE", // Overridden
			scenarioOverridden: true,
			costDifference: 315,
			percentageSavings: 42.9,
			recommendation: "Retour à vide recommandé",
		};

		const rule = buildScenarioSelectionRule(comparison);

		expect(rule?.overridden).toBe(true);
	});

	it("SVR-12: should return null for non-applicable comparison", () => {
		const comparison: StayVsReturnComparison = {
			isApplicable: false,
			stayScenario: null,
			returnScenario: null,
			recommendedScenario: null,
			selectedScenario: null,
			scenarioOverridden: false,
			costDifference: 0,
			percentageSavings: 0,
			recommendation: "Non applicable",
		};

		const rule = buildScenarioSelectionRule(comparison);

		expect(rule).toBeNull();
	});

	it("should handle return not viable (alternativeCost = 0)", () => {
		const comparison: StayVsReturnComparison = {
			isApplicable: true,
			stayScenario: {
				totalCost: 735,
			} as StayOnSiteScenario,
			returnScenario: {
				isViable: false,
				totalCost: Number.POSITIVE_INFINITY,
			} as ReturnEmptyScenario,
			recommendedScenario: "STAY_ON_SITE",
			selectedScenario: "STAY_ON_SITE",
			scenarioOverridden: false,
			costDifference: 0,
			percentageSavings: 0,
			recommendation: "Rester sur place (seule option viable)",
		};

		const rule = buildScenarioSelectionRule(comparison);

		expect(rule?.alternativeCost).toBe(0); // Not viable, so 0
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle zero toll cost", () => {
		const result = calculateReturnEmptyScenario(100, 60, 1, 0, {
			fuelCostPerKm: 0.15,
			driverHourlyRate: 25,
			maxReturnEmptyDistanceKm: 300,
		});

		expect(result.tollCost).toBe(0);
		expect(result.totalCost).toBe(result.fuelCost + result.driverTimeCost);
	});

	it("should handle very short distance", () => {
		const result = calculateReturnEmptyScenario(10, 15, 1, 5, {
			fuelCostPerKm: 0.15,
			driverHourlyRate: 25,
			maxReturnEmptyDistanceKm: 300,
		});

		expect(result.isViable).toBe(true);
		expect(result.totalEmptyDistanceKm).toBe(20); // 2 trips × 10km
	});

	it("should handle equal costs (prefer stay)", () => {
		const stayScenario: StayOnSiteScenario = {
			hotelCost: 100,
			mealCost: 50,
			driverPremium: 50,
			lossOfExploitation: 100,
			totalCost: 300,
			breakdown: {} as StayOnSiteScenario["breakdown"],
		};

		const returnScenario: ReturnEmptyScenario = {
			isViable: true,
			reason: null,
			emptyTripsCount: 2,
			totalEmptyDistanceKm: 200,
			fuelCost: 100,
			tollCost: 50,
			driverTimeCost: 150,
			totalCost: 300,
			breakdown: {} as ReturnEmptyScenario["breakdown"],
		};

		const result = compareStayVsReturn(stayScenario, returnScenario);

		// When equal, stay is preferred (stayCost <= returnCost)
		expect(result.recommendedScenario).toBe("STAY_ON_SITE");
		expect(result.costDifference).toBe(0);
	});
});
