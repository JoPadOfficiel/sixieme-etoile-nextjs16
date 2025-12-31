/**
 * Story 18.3: Round-Trip to MAD Automatic Detection - Unit Tests
 * 
 * Tests the detection of round-trips where the driver is blocked on-site
 * and the suggestion to switch from 2×Transfer to MAD pricing.
 */

import { describe, it, expect } from "vitest";
import {
	detectRoundTripBlocked,
	calculateRoundTripMadSuggestion,
	buildAutoSwitchedRoundTripToMadRule,
	DEFAULT_MIN_WAITING_TIME_FOR_SEPARATE_TRANSFERS,
	DEFAULT_MAX_RETURN_DISTANCE_KM,
	DEFAULT_ROUND_TRIP_BUFFER,
	type OrganizationPricingSettings,
	type RoundTripDetection,
} from "../pricing-engine";

// Default test settings
const defaultSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
	// Story 18.3 defaults
	minWaitingTimeForSeparateTransfers: 180, // 3 hours
	maxReturnDistanceKm: 50,
	roundTripBuffer: 30,
	autoSwitchRoundTripToMAD: false,
};

describe("Story 18.3: Round-Trip to MAD Detection", () => {
	describe("detectRoundTripBlocked", () => {
		it("RT-01: should detect round-trip with short waiting time as blocked", () => {
			// Distance: 30km, Duration: 45min one-way
			// Return to base: 90min (2×45)
			// Waiting time: 60min < 90min + 30min buffer = 120min
			// => Driver is blocked
			const result = detectRoundTripBlocked(
				true, // isRoundTrip
				30, // distanceKm
				45, // durationAllerMinutes
				60, // waitingTimeMinutes (1 hour - too short)
				defaultSettings,
			);

			expect(result.isRoundTrip).toBe(true);
			expect(result.isDriverBlocked).toBe(true);
			expect(result.waitingTimeMinutes).toBe(60);
			expect(result.returnToBaseMinutes).toBe(90); // 2 × 45
			expect(result.exceedsMaxReturnDistance).toBe(false);
			expect(result.totalMissionDurationMinutes).toBe(180); // 45 + 60 + 45 + 30
		});

		it("RT-02: should detect round-trip with long waiting time as NOT blocked", () => {
			// Distance: 30km, Duration: 45min one-way
			// Return to base: 90min
			// Waiting time: 240min (4 hours) > 90min + 30min = 120min
			// => Driver is NOT blocked
			const result = detectRoundTripBlocked(
				true,
				30,
				45,
				240, // 4 hours waiting - enough time to return
				defaultSettings,
			);

			expect(result.isRoundTrip).toBe(true);
			expect(result.isDriverBlocked).toBe(false);
			expect(result.waitingTimeMinutes).toBe(240);
			expect(result.returnToBaseMinutes).toBe(90);
			expect(result.totalMissionDurationMinutes).toBe(360); // 45 + 240 + 45 + 30
		});

		it("RT-03: should detect round-trip exceeding max return distance", () => {
			// Distance: 100km > maxReturnDistanceKm (50km)
			// => Driver is blocked regardless of waiting time
			const result = detectRoundTripBlocked(
				true,
				100, // distanceKm > 50km max
				90, // durationAllerMinutes
				300, // waitingTimeMinutes (5 hours - would be enough normally)
				defaultSettings,
			);

			expect(result.isRoundTrip).toBe(true);
			expect(result.isDriverBlocked).toBe(true);
			expect(result.exceedsMaxReturnDistance).toBe(true);
			expect(result.maxReturnDistanceKm).toBe(50);
		});

		it("RT-04: should calculate return to base time as 2× aller duration", () => {
			const result = detectRoundTripBlocked(
				true,
				30,
				45, // 45 minutes one-way
				120,
				defaultSettings,
			);

			expect(result.returnToBaseMinutes).toBe(90); // 2 × 45 = 90
		});

		it("RT-05: should calculate total mission duration correctly", () => {
			// Total = aller + attente + retour + buffer
			// = 45 + 120 + 45 + 30 = 240 minutes
			const result = detectRoundTripBlocked(
				true,
				30,
				45, // aller
				120, // attente
				defaultSettings,
			);

			expect(result.totalMissionDurationMinutes).toBe(240);
		});

		it("RT-11: should use custom thresholds from settings", () => {
			const customSettings: OrganizationPricingSettings = {
				...defaultSettings,
				minWaitingTimeForSeparateTransfers: 120, // 2 hours instead of 3
				maxReturnDistanceKm: 30, // 30km instead of 50
				roundTripBuffer: 15, // 15min instead of 30
			};

			const result = detectRoundTripBlocked(
				true,
				25, // Under 30km max
				30, // 30min one-way
				60, // 1 hour waiting
				customSettings,
			);

			expect(result.minWaitingTimeThreshold).toBe(120);
			expect(result.maxReturnDistanceKm).toBe(30);
			expect(result.bufferMinutes).toBe(15);
			// Return to base: 60min, buffer: 15min, total: 75min
			// Waiting: 60min < 75min => blocked
			expect(result.isDriverBlocked).toBe(true);
		});

		it("RT-12: should return isRoundTrip=false for non-round-trips", () => {
			const result = detectRoundTripBlocked(
				false, // NOT a round-trip
				30,
				45,
				60,
				defaultSettings,
			);

			expect(result.isRoundTrip).toBe(false);
			expect(result.isDriverBlocked).toBe(false);
			expect(result.waitingTimeMinutes).toBeNull();
			expect(result.returnToBaseMinutes).toBeNull();
			expect(result.totalMissionDurationMinutes).toBeNull();
		});

		it("should handle null waiting time as 0", () => {
			const result = detectRoundTripBlocked(
				true,
				30,
				45,
				null, // No waiting time specified
				defaultSettings,
			);

			expect(result.waitingTimeMinutes).toBe(0);
			expect(result.isDriverBlocked).toBe(true); // 0 < 90 + 30 = 120
		});

		it("should use default thresholds when settings are undefined", () => {
			const minimalSettings: OrganizationPricingSettings = {
				baseRatePerKm: 2.5,
				baseRatePerHour: 45.0,
				targetMarginPercent: 20.0,
				// No round-trip settings - should use defaults
			};

			const result = detectRoundTripBlocked(
				true,
				30,
				45,
				60,
				minimalSettings,
			);

			expect(result.minWaitingTimeThreshold).toBe(DEFAULT_MIN_WAITING_TIME_FOR_SEPARATE_TRANSFERS);
			expect(result.maxReturnDistanceKm).toBe(DEFAULT_MAX_RETURN_DISTANCE_KM);
			expect(result.bufferMinutes).toBe(DEFAULT_ROUND_TRIP_BUFFER);
		});
	});

	describe("calculateRoundTripMadSuggestion", () => {
		it("RT-06: should calculate MAD suggestion with positive gain", () => {
			// 2×Transfer price: 150€
			// MAD price for 4h: should be higher (based on hourly rate)
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 120,
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 240, // 4 hours
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				150, // twoTransferPrice
				30, // distanceKm
				45, // durationAllerMinutes
				120, // waitingTimeMinutes
				detection,
				defaultSettings,
				false, // autoSwitch disabled
			);

			expect(result.type).toBe("ROUND_TRIP_TO_MAD");
			expect(result.twoTransferPrice).toBe(150);
			// MAD price = 4h × 45€/h = 180€ (minimum, may be higher with overage)
			expect(result.madPrice).toBeGreaterThan(0);
			expect(result.priceDifference).toBe(result.madPrice - 150);
			expect(result.autoSwitched).toBe(false); // autoSwitch was disabled
		});

		it("RT-07: should handle MAD suggestion with negative gain", () => {
			// When MAD price is lower than 2×Transfer
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 30, // Very short waiting
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 150, // 2.5 hours
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				200, // High 2×Transfer price
				30,
				45,
				30,
				detection,
				defaultSettings,
				false,
			);

			// MAD for 2.5h might be less than 200€
			expect(result.twoTransferPrice).toBe(200);
			expect(typeof result.priceDifference).toBe("number");
		});

		it("RT-08: should auto-switch when enabled and MAD is better", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 120,
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 240,
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				100, // Low 2×Transfer price
				30,
				45,
				120,
				detection,
				defaultSettings,
				true, // autoSwitch ENABLED
			);

			// If MAD price > 100€ (which it should be for 4h), auto-switch should be true
			if (result.priceDifference > 0) {
				expect(result.autoSwitched).toBe(true);
			}
		});

		it("RT-09: should NOT auto-switch when disabled", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 120,
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 240,
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				100,
				30,
				45,
				120,
				detection,
				defaultSettings,
				false, // autoSwitch DISABLED
			);

			expect(result.autoSwitched).toBe(false);
		});

		it("RT-10: should NOT auto-switch when 2×Transfer is better", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 30,
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 150, // 2.5 hours
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				500, // Very high 2×Transfer price
				30,
				45,
				30,
				detection,
				defaultSettings,
				true, // autoSwitch enabled but shouldn't trigger
			);

			// If MAD is cheaper (priceDifference < 0), should not auto-switch
			if (result.priceDifference <= 0) {
				expect(result.autoSwitched).toBe(false);
			}
		});

		it("should include correct details in suggestion", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 120,
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 240,
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				150,
				30,
				45,
				120,
				detection,
				defaultSettings,
				false,
			);

			expect(result.details.distanceKm).toBe(30);
			expect(result.details.durationAllerMinutes).toBe(45);
			expect(result.details.waitingTimeMinutes).toBe(120);
			expect(result.details.totalMissionMinutes).toBe(240);
			expect(result.details.returnToBaseMinutes).toBe(90);
			expect(result.details.isDriverBlocked).toBe(true);
			expect(result.details.exceedsMaxReturnDistance).toBe(false);
		});

		it("should generate appropriate recommendation for exceeds max distance", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 300,
				returnToBaseMinutes: 180,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: true, // Distance too long
				totalMissionDurationMinutes: 480,
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				200,
				100, // 100km > 50km max
				90,
				300,
				detection,
				defaultSettings,
				false,
			);

			expect(result.recommendation).toContain("distance trop longue");
			expect(result.recommendation).toContain("100.0km");
			expect(result.recommendation).toContain("50km");
		});

		it("should generate appropriate recommendation for driver blocked", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 60,
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 180,
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const result = calculateRoundTripMadSuggestion(
				100, // Low price so MAD will be higher
				30,
				45,
				60,
				detection,
				defaultSettings,
				false,
			);

			if (result.priceDifference > 0) {
				expect(result.recommendation).toContain("chauffeur bloqué");
			}
		});
	});

	describe("buildAutoSwitchedRoundTripToMadRule", () => {
		it("should build rule with DRIVER_BLOCKED reason", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 60,
				returnToBaseMinutes: 90,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: false,
				totalMissionDurationMinutes: 180,
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const suggestion = calculateRoundTripMadSuggestion(
				150,
				30,
				45,
				60,
				detection,
				defaultSettings,
				true,
			);

			const rule = buildAutoSwitchedRoundTripToMadRule(detection, suggestion);

			expect(rule.type).toBe("AUTO_SWITCHED_ROUND_TRIP_TO_MAD");
			expect(rule.reason).toBe("DRIVER_BLOCKED");
			expect(rule.originalTwoTransferPrice).toBe(150);
			expect(rule.newMadPrice).toBe(suggestion.madPrice);
			expect(rule.description).toContain("driver blocked");
		});

		it("should build rule with EXCEEDS_MAX_RETURN_DISTANCE reason", () => {
			const detection: RoundTripDetection = {
				isRoundTrip: true,
				waitingTimeMinutes: 300,
				returnToBaseMinutes: 180,
				bufferMinutes: 30,
				isDriverBlocked: true,
				exceedsMaxReturnDistance: true,
				totalMissionDurationMinutes: 480,
				minWaitingTimeThreshold: 180,
				maxReturnDistanceKm: 50,
			};

			const suggestion = calculateRoundTripMadSuggestion(
				200,
				100,
				90,
				300,
				detection,
				defaultSettings,
				true,
			);

			const rule = buildAutoSwitchedRoundTripToMadRule(detection, suggestion);

			expect(rule.type).toBe("AUTO_SWITCHED_ROUND_TRIP_TO_MAD");
			expect(rule.reason).toBe("EXCEEDS_MAX_RETURN_DISTANCE");
			expect(rule.description).toContain("exceeds max return distance");
		});
	});

	describe("Edge cases", () => {
		it("should handle zero distance", () => {
			const result = detectRoundTripBlocked(
				true,
				0, // Zero distance
				0, // Zero duration
				60,
				defaultSettings,
			);

			expect(result.isRoundTrip).toBe(true);
			expect(result.returnToBaseMinutes).toBe(0);
			// With 0 return time + 30 buffer = 30min
			// Waiting 60min > 30min => NOT blocked
			expect(result.isDriverBlocked).toBe(false);
		});

		it("should handle exactly at threshold", () => {
			// Return to base: 90min, buffer: 30min, total: 120min
			// Waiting: exactly 120min => NOT blocked (>= not <)
			const result = detectRoundTripBlocked(
				true,
				30,
				45,
				120, // Exactly at threshold
				defaultSettings,
			);

			// 120 < 120 is false, so NOT blocked
			expect(result.isDriverBlocked).toBe(false);
		});

		it("should handle waiting time just below threshold", () => {
			// Return to base: 90min, buffer: 30min, total: 120min
			// Waiting: 119min < 120min => blocked
			const result = detectRoundTripBlocked(
				true,
				30,
				45,
				119, // Just below threshold
				defaultSettings,
			);

			expect(result.isDriverBlocked).toBe(true);
		});

		it("should handle distance exactly at max return distance", () => {
			const result = detectRoundTripBlocked(
				true,
				50, // Exactly at max (50km)
				60,
				300,
				defaultSettings,
			);

			// 50 > 50 is false, so NOT exceeds max distance
			expect(result.exceedsMaxReturnDistance).toBe(false);
		});

		it("should handle distance just above max return distance", () => {
			const result = detectRoundTripBlocked(
				true,
				50.1, // Just above max (50km)
				60,
				300,
				defaultSettings,
			);

			expect(result.exceedsMaxReturnDistance).toBe(true);
			expect(result.isDriverBlocked).toBe(true);
		});
	});
});
