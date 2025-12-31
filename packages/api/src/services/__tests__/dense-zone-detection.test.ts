/**
 * Story 18.2: Dense Zone Detection Tests
 * Tests for detectDenseZone, calculateMadSuggestion, and buildAutoSwitchedToMadRule functions
 */

import { describe, it, expect } from "vitest";
import {
	detectDenseZone,
	calculateMadSuggestion,
	buildAutoSwitchedToMadRule,
	DEFAULT_DENSE_ZONE_CODES,
	DEFAULT_DENSE_ZONE_SPEED_THRESHOLD,
	type OrganizationPricingSettings,
	type DenseZoneDetection,
} from "../pricing-engine";

// ============================================================================
// Test Data
// ============================================================================

const mockSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 90,
	targetMarginPercent: 25,
	dispoIncludedKmPerHour: 50,
	dispoOverageRatePerKm: 0.50,
	// Story 18.2: Dense zone settings (using defaults)
	denseZoneSpeedThreshold: null,
	autoSwitchToMAD: false,
	denseZoneCodes: [],
};

const mockSettingsWithCustomConfig: OrganizationPricingSettings = {
	...mockSettings,
	denseZoneSpeedThreshold: 20, // Custom threshold
	autoSwitchToMAD: true,
	denseZoneCodes: ["PARIS_0", "PARIS_10"], // Custom dense zones
};

// Zone mocks
const parisZone = { code: "PARIS_0" };
const paris10Zone = { code: "PARIS_10" };
const cdgZone = { code: "CDG" };
const versaillesZone = { code: "VERSAILLES" };

// ============================================================================
// detectDenseZone Tests
// ============================================================================

describe("detectDenseZone", () => {
	describe("AC1: Intra-dense-zone detection", () => {
		it("should detect intra-dense-zone when both pickup and dropoff are in PARIS_0", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				5, // 5 km
				30, // 30 minutes
				mockSettings,
			);

			expect(result.isIntraDenseZone).toBe(true);
			expect(result.pickupZoneCode).toBe("PARIS_0");
			expect(result.dropoffZoneCode).toBe("PARIS_0");
			expect(result.denseZoneCodes).toEqual(DEFAULT_DENSE_ZONE_CODES);
		});

		it("should NOT detect intra-dense-zone when pickup is outside dense zone", () => {
			const result = detectDenseZone(
				cdgZone, // CDG is not in default dense zones
				parisZone,
				20,
				45,
				mockSettings,
			);

			expect(result.isIntraDenseZone).toBe(false);
			expect(result.pickupZoneCode).toBe("CDG");
			expect(result.dropoffZoneCode).toBe("PARIS_0");
		});

		it("should NOT detect intra-dense-zone when dropoff is outside dense zone", () => {
			const result = detectDenseZone(
				parisZone,
				versaillesZone, // Versailles is not in default dense zones
				15,
				40,
				mockSettings,
			);

			expect(result.isIntraDenseZone).toBe(false);
		});

		it("should NOT detect intra-dense-zone when both are outside dense zones", () => {
			const result = detectDenseZone(
				cdgZone,
				versaillesZone,
				30,
				60,
				mockSettings,
			);

			expect(result.isIntraDenseZone).toBe(false);
		});

		it("should handle null zones gracefully", () => {
			const result = detectDenseZone(
				null,
				parisZone,
				10,
				30,
				mockSettings,
			);

			expect(result.isIntraDenseZone).toBe(false);
			expect(result.pickupZoneCode).toBeNull();
			expect(result.dropoffZoneCode).toBe("PARIS_0");
		});
	});

	describe("AC2: Commercial speed calculation", () => {
		it("should calculate commercial speed correctly (5km / 30min = 10 km/h)", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				5, // 5 km
				30, // 30 minutes = 0.5 hours
				mockSettings,
			);

			expect(result.commercialSpeedKmh).toBe(10);
		});

		it("should calculate commercial speed correctly (20km / 60min = 20 km/h)", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				20, // 20 km
				60, // 60 minutes = 1 hour
				mockSettings,
			);

			expect(result.commercialSpeedKmh).toBe(20);
		});

		it("should calculate commercial speed correctly (15km / 45min = 20 km/h)", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				15, // 15 km
				45, // 45 minutes = 0.75 hours
				mockSettings,
			);

			expect(result.commercialSpeedKmh).toBe(20);
		});

		it("should handle zero duration gracefully", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				5,
				0, // Zero duration
				mockSettings,
			);

			expect(result.commercialSpeedKmh).toBeNull();
			expect(result.isBelowThreshold).toBe(false);
		});
	});

	describe("AC4: Speed threshold comparison", () => {
		it("should detect below threshold when speed (10 km/h) < threshold (15 km/h)", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				5, // 5 km
				30, // 30 min → 10 km/h
				mockSettings,
			);

			expect(result.commercialSpeedKmh).toBe(10);
			expect(result.speedThreshold).toBe(DEFAULT_DENSE_ZONE_SPEED_THRESHOLD);
			expect(result.isBelowThreshold).toBe(true);
		});

		it("should NOT detect below threshold when speed (25 km/h) > threshold (15 km/h)", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				25, // 25 km
				60, // 60 min → 25 km/h
				mockSettings,
			);

			expect(result.commercialSpeedKmh).toBe(25);
			expect(result.isBelowThreshold).toBe(false);
		});

		it("should NOT detect below threshold when speed equals threshold exactly", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				15, // 15 km
				60, // 60 min → 15 km/h (exactly at threshold)
				mockSettings,
			);

			expect(result.commercialSpeedKmh).toBe(15);
			expect(result.isBelowThreshold).toBe(false); // Not strictly below
		});
	});

	describe("AC6: Custom configuration", () => {
		it("should use custom dense zone codes", () => {
			const result = detectDenseZone(
				paris10Zone, // PARIS_10 is in custom config
				paris10Zone,
				5,
				30,
				mockSettingsWithCustomConfig,
			);

			expect(result.isIntraDenseZone).toBe(true);
			expect(result.denseZoneCodes).toEqual(["PARIS_0", "PARIS_10"]);
		});

		it("should use custom speed threshold", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				18, // 18 km
				60, // 60 min → 18 km/h
				mockSettingsWithCustomConfig,
			);

			expect(result.speedThreshold).toBe(20);
			expect(result.commercialSpeedKmh).toBe(18);
			expect(result.isBelowThreshold).toBe(true); // 18 < 20
		});

		it("should use default codes when denseZoneCodes is empty", () => {
			const result = detectDenseZone(
				parisZone,
				parisZone,
				5,
				30,
				{ ...mockSettings, denseZoneCodes: [] },
			);

			expect(result.denseZoneCodes).toEqual(DEFAULT_DENSE_ZONE_CODES);
		});
	});
});

// ============================================================================
// calculateMadSuggestion Tests
// ============================================================================

describe("calculateMadSuggestion", () => {
	describe("AC3 & AC4: MAD suggestion calculation", () => {
		it("should calculate MAD suggestion with positive gain", () => {
			// Transfer: 5km at 5€/km = 25€
			// MAD: 30min = 0.5h at 90€/h = 45€
			const result = calculateMadSuggestion(
				25, // transferPrice
				30, // durationMinutes
				5,  // distanceKm
				mockSettings,
				false, // autoSwitch
			);

			expect(result.type).toBe("CONSIDER_MAD_PRICING");
			expect(result.transferPrice).toBe(25);
			expect(result.madPrice).toBe(45); // 0.5h × 90€
			expect(result.priceDifference).toBe(20);
			expect(result.percentageGain).toBe(80); // +80%
			expect(result.recommendation).toContain("MAD pricing recommandé");
			expect(result.autoSwitched).toBe(false);
		});

		it("should recommend Transfer when MAD is more expensive but Transfer is better", () => {
			// Transfer: 50€
			// MAD: 30min = 0.5h at 90€/h = 45€
			const result = calculateMadSuggestion(
				50, // transferPrice (higher than MAD)
				30, // durationMinutes
				5,  // distanceKm
				mockSettings,
				false,
			);

			expect(result.transferPrice).toBe(50);
			expect(result.madPrice).toBe(45);
			expect(result.priceDifference).toBe(-5);
			expect(result.recommendation).toContain("Transfer pricing optimal");
		});

		it("should handle equal prices", () => {
			// Both prices equal
			const result = calculateMadSuggestion(
				45, // transferPrice
				30, // durationMinutes → 45€ MAD
				5,
				mockSettings,
				false,
			);

			expect(result.priceDifference).toBe(0);
			expect(result.recommendation).toContain("équivalent");
		});
	});

	describe("AC5: Auto-switch behavior", () => {
		it("should set autoSwitched=true when enabled and MAD is better", () => {
			const result = calculateMadSuggestion(
				25, // transferPrice
				30, // durationMinutes
				5,  // distanceKm
				mockSettings,
				true, // autoSwitch enabled
			);

			expect(result.autoSwitched).toBe(true);
			expect(result.priceDifference).toBeGreaterThan(0);
		});

		it("should set autoSwitched=false when enabled but Transfer is better", () => {
			const result = calculateMadSuggestion(
				50, // transferPrice (higher than MAD)
				30,
				5,
				mockSettings,
				true, // autoSwitch enabled
			);

			expect(result.autoSwitched).toBe(false);
			expect(result.priceDifference).toBeLessThan(0);
		});

		it("should set autoSwitched=false when disabled", () => {
			const result = calculateMadSuggestion(
				25,
				30,
				5,
				mockSettings,
				false, // autoSwitch disabled
			);

			expect(result.autoSwitched).toBe(false);
		});
	});

	describe("Edge cases", () => {
		it("should handle zero transfer price", () => {
			const result = calculateMadSuggestion(
				0,
				30,
				5,
				mockSettings,
				false,
			);

			expect(result.transferPrice).toBe(0);
			expect(result.percentageGain).toBe(0);
		});

		it("should include overage in MAD calculation", () => {
			// 60 min = 1h, included km = 50km
			// Distance = 80km → overage = 30km × 0.50€ = 15€
			// MAD = 90€ + 15€ = 105€
			const result = calculateMadSuggestion(
				50,
				60, // 1 hour
				80, // 80km (30km overage)
				mockSettings,
				false,
			);

			expect(result.madPrice).toBe(105); // 90 + 15
		});
	});
});

// ============================================================================
// buildAutoSwitchedToMadRule Tests
// ============================================================================

describe("buildAutoSwitchedToMadRule", () => {
	it("should build correct rule structure", () => {
		const detection: DenseZoneDetection = {
			isIntraDenseZone: true,
			pickupZoneCode: "PARIS_0",
			dropoffZoneCode: "PARIS_0",
			denseZoneCodes: ["PARIS_0"],
			commercialSpeedKmh: 10,
			speedThreshold: 15,
			isBelowThreshold: true,
		};

		const suggestion = calculateMadSuggestion(25, 30, 5, mockSettings, true);
		const rule = buildAutoSwitchedToMadRule(detection, suggestion);

		expect(rule.type).toBe("AUTO_SWITCHED_TO_MAD");
		expect(rule.originalTripType).toBe("transfer");
		expect(rule.originalPrice).toBe(25);
		expect(rule.madPrice).toBe(45);
		expect(rule.priceDifference).toBe(20);
		expect(rule.commercialSpeedKmh).toBe(10);
		expect(rule.speedThreshold).toBe(15);
		expect(rule.denseZoneCodes).toEqual(["PARIS_0"]);
		expect(rule.description).toContain("10.0 km/h");
		expect(rule.description).toContain("15 km/h");
	});

	it("should handle null commercial speed", () => {
		const detection: DenseZoneDetection = {
			isIntraDenseZone: true,
			pickupZoneCode: "PARIS_0",
			dropoffZoneCode: "PARIS_0",
			denseZoneCodes: ["PARIS_0"],
			commercialSpeedKmh: null,
			speedThreshold: 15,
			isBelowThreshold: false,
		};

		const suggestion = calculateMadSuggestion(25, 30, 5, mockSettings, true);
		const rule = buildAutoSwitchedToMadRule(detection, suggestion);

		expect(rule.commercialSpeedKmh).toBe(0);
	});
});

// ============================================================================
// Integration Scenarios
// ============================================================================

describe("Integration Scenarios", () => {
	it("Scenario: Paris intra-muros transfer with low speed should suggest MAD", () => {
		// Step 1: Detect dense zone
		const detection = detectDenseZone(
			parisZone,
			parisZone,
			5, // 5 km
			30, // 30 min → 10 km/h
			mockSettings,
		);

		expect(detection.isIntraDenseZone).toBe(true);
		expect(detection.isBelowThreshold).toBe(true);

		// Step 2: Calculate MAD suggestion
		const suggestion = calculateMadSuggestion(
			25, // Transfer price
			30,
			5,
			mockSettings,
			false,
		);

		expect(suggestion.priceDifference).toBeGreaterThan(0);
		expect(suggestion.recommendation).toContain("MAD pricing recommandé");
	});

	it("Scenario: Paris to CDG transfer should NOT suggest MAD (not intra-dense)", () => {
		const detection = detectDenseZone(
			parisZone,
			cdgZone, // CDG is not dense
			30,
			45,
			mockSettings,
		);

		expect(detection.isIntraDenseZone).toBe(false);
		// No MAD suggestion should be generated for non-dense trips
	});

	it("Scenario: Fast Paris transfer should NOT suggest MAD (speed above threshold)", () => {
		const detection = detectDenseZone(
			parisZone,
			parisZone,
			20, // 20 km
			40, // 40 min → 30 km/h (fast)
			mockSettings,
		);

		expect(detection.isIntraDenseZone).toBe(true);
		expect(detection.commercialSpeedKmh).toBe(30);
		expect(detection.isBelowThreshold).toBe(false);
		// No MAD suggestion should be generated for fast trips
	});
});
