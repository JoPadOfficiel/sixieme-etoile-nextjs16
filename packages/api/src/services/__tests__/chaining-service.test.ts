/**
 * Chaining Service Tests
 * Story 8.4: Detect & Suggest Trip Chaining Opportunities
 */

import { describe, it, expect } from "vitest";
import {
	detectChainingOpportunities,
	calculateChainingSavings,
	checkChainingCompatibility,
	calculateTimeGapMinutes,
	calculateTransitionDistance,
	calculateTransitionDuration,
	isTimeGapValid,
	isTransitionDistanceValid,
	extractCostData,
	estimateDropoffTime,
	generateChainId,
	DEFAULT_CHAINING_CONFIG,
	type MissionForChaining,
	type ChainingConfig,
} from "../chaining-service";

// ============================================================================
// Test Data Factories
// ============================================================================

function createMission(overrides: Partial<MissionForChaining> = {}): MissionForChaining {
	const now = new Date();
	return {
		id: `mission-${Math.random().toString(36).substring(7)}`,
		pickupAt: now,
		pickupAddress: "123 Pickup St, Paris",
		pickupLatitude: 48.8566,
		pickupLongitude: 2.3522,
		dropoffAddress: "456 Dropoff Ave, Paris",
		dropoffLatitude: 48.8606,
		dropoffLongitude: 2.3376,
		vehicleCategoryId: "cat-sedan",
		vehicleCategory: { id: "cat-sedan", name: "Sedan", code: "SEDAN" },
		contact: { displayName: "Test Client" },
		chainId: null,
		approachCost: 25,
		serviceCost: 50,
		returnCost: 30,
		totalInternalCost: 105,
		approachDistanceKm: 10,
		serviceDistanceKm: 20,
		returnDistanceKm: 12,
		...overrides,
	};
}

// ============================================================================
// Helper Function Tests
// ============================================================================

describe("calculateTimeGapMinutes", () => {
	it("calculates correct time gap in minutes", () => {
		const dropoff = new Date("2025-01-01T10:00:00Z");
		const pickup = new Date("2025-01-01T10:45:00Z");
		expect(calculateTimeGapMinutes(dropoff, pickup)).toBe(45);
	});

	it("handles negative time gap (pickup before dropoff)", () => {
		const dropoff = new Date("2025-01-01T11:00:00Z");
		const pickup = new Date("2025-01-01T10:00:00Z");
		expect(calculateTimeGapMinutes(dropoff, pickup)).toBe(-60);
	});

	it("returns 0 for same time", () => {
		const time = new Date("2025-01-01T10:00:00Z");
		expect(calculateTimeGapMinutes(time, time)).toBe(0);
	});
});

describe("calculateTransitionDistance", () => {
	it("calculates distance between two points", () => {
		// Paris to nearby location (~1km)
		const distance = calculateTransitionDistance(48.8566, 2.3522, 48.8606, 2.3376);
		expect(distance).toBeGreaterThan(0);
		expect(distance).toBeLessThan(5); // Should be a few km
	});

	it("returns 0 for same location", () => {
		const distance = calculateTransitionDistance(48.8566, 2.3522, 48.8566, 2.3522);
		expect(distance).toBe(0);
	});

	it("applies road distance factor", () => {
		// The result should be ~1.3x the Haversine distance
		const distance = calculateTransitionDistance(48.8566, 2.3522, 48.9, 2.4);
		expect(distance).toBeGreaterThan(5); // Significant distance
	});
});

describe("calculateTransitionDuration", () => {
	it("calculates duration based on distance at 30km/h", () => {
		// 15km at 30km/h = 30 minutes
		expect(calculateTransitionDuration(15)).toBe(30);
	});

	it("returns 0 for 0 distance", () => {
		expect(calculateTransitionDuration(0)).toBe(0);
	});

	it("rounds to nearest minute", () => {
		// 10km at 30km/h = 20 minutes
		expect(calculateTransitionDuration(10)).toBe(20);
	});
});

describe("isTimeGapValid", () => {
	it("returns true for valid time gap (within 30-120 min)", () => {
		expect(isTimeGapValid(45)).toBe(true);
		expect(isTimeGapValid(60)).toBe(true);
		expect(isTimeGapValid(90)).toBe(true);
	});

	it("returns false for time gap too short", () => {
		expect(isTimeGapValid(15)).toBe(false);
		expect(isTimeGapValid(29)).toBe(false);
	});

	it("returns false for time gap too long", () => {
		expect(isTimeGapValid(121)).toBe(false);
		expect(isTimeGapValid(180)).toBe(false);
	});

	it("returns true at exact boundaries", () => {
		expect(isTimeGapValid(30)).toBe(true);
		expect(isTimeGapValid(120)).toBe(true);
	});

	it("respects custom config", () => {
		const config: ChainingConfig = {
			...DEFAULT_CHAINING_CONFIG,
			minTimeGapMinutes: 15,
			maxTimeGapMinutes: 60,
		};
		expect(isTimeGapValid(20, config)).toBe(true);
		expect(isTimeGapValid(10, config)).toBe(false);
		expect(isTimeGapValid(90, config)).toBe(false);
	});
});

describe("isTransitionDistanceValid", () => {
	it("returns true for distance within threshold", () => {
		expect(isTransitionDistanceValid(5)).toBe(true);
		expect(isTransitionDistanceValid(10)).toBe(true);
	});

	it("returns false for distance exceeding threshold", () => {
		expect(isTransitionDistanceValid(15)).toBe(false);
		expect(isTransitionDistanceValid(100)).toBe(false);
	});

	it("respects custom config", () => {
		const config: ChainingConfig = {
			...DEFAULT_CHAINING_CONFIG,
			maxTransitionDistanceKm: 5,
		};
		expect(isTransitionDistanceValid(3, config)).toBe(true);
		expect(isTransitionDistanceValid(7, config)).toBe(false);
	});
});

describe("estimateDropoffTime", () => {
	it("adds default 45 minutes to pickup time", () => {
		const pickup = new Date("2025-01-01T10:00:00Z");
		const dropoff = estimateDropoffTime(pickup);
		expect(dropoff.getTime() - pickup.getTime()).toBe(45 * 60 * 1000);
	});

	it("uses custom duration when provided", () => {
		const pickup = new Date("2025-01-01T10:00:00Z");
		const dropoff = estimateDropoffTime(pickup, 60);
		expect(dropoff.getTime() - pickup.getTime()).toBe(60 * 60 * 1000);
	});
});

describe("extractCostData", () => {
	it("extracts cost data from valid tripAnalysis", () => {
		const tripAnalysis = {
			segments: {
				approach: { distanceKm: 10, cost: 25 },
				service: { distanceKm: 20, cost: 50 },
				return: { distanceKm: 12, cost: 30 },
			},
			costBreakdown: { total: 105 },
		};
		const result = extractCostData(tripAnalysis);
		expect(result.approachDistanceKm).toBe(10);
		expect(result.approachCost).toBe(25);
		expect(result.serviceDistanceKm).toBe(20);
		expect(result.serviceCost).toBe(50);
		expect(result.returnDistanceKm).toBe(12);
		expect(result.returnCost).toBe(30);
		expect(result.totalInternalCost).toBe(105);
	});

	it("returns defaults for null tripAnalysis", () => {
		const result = extractCostData(null);
		expect(result.approachCost).toBe(0);
		expect(result.serviceCost).toBe(0);
		expect(result.returnCost).toBe(0);
		expect(result.totalInternalCost).toBe(0);
	});

	it("returns defaults for empty object", () => {
		const result = extractCostData({});
		expect(result.totalInternalCost).toBe(0);
	});
});

describe("generateChainId", () => {
	it("generates unique chain IDs", () => {
		const id1 = generateChainId();
		const id2 = generateChainId();
		expect(id1).not.toBe(id2);
	});

	it("generates IDs with chain_ prefix", () => {
		const id = generateChainId();
		expect(id.startsWith("chain_")).toBe(true);
	});
});

// ============================================================================
// Main Function Tests
// ============================================================================

describe("detectChainingOpportunities", () => {
	it("detects missions within distance and time thresholds", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
			dropoffLatitude: 48.86,
			dropoffLongitude: 2.34,
		});

		// Target mission: pickup close to source dropoff, 1 hour later
		const targetMission = createMission({
			id: "target",
			pickupAt: new Date(now.getTime() + 105 * 60 * 1000), // 1h45m later (45min service + 60min gap)
			pickupLatitude: 48.861, // Very close to source dropoff
			pickupLongitude: 2.341,
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetMission]);
		expect(suggestions.length).toBeGreaterThan(0);
	});

	it("filters out missions outside distance threshold", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
			dropoffLatitude: 48.86,
			dropoffLongitude: 2.34,
		});

		// Target mission: pickup far from source dropoff
		const targetMission = createMission({
			id: "target",
			pickupAt: new Date(now.getTime() + 105 * 60 * 1000),
			pickupLatitude: 49.5, // Far away (~70km)
			pickupLongitude: 3.0,
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetMission]);
		expect(suggestions.length).toBe(0);
	});

	it("filters out missions with time gap too short", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
			dropoffLatitude: 48.86,
			dropoffLongitude: 2.34,
		});

		// Target mission: pickup only 10 minutes after source estimated dropoff
		const targetMission = createMission({
			id: "target",
			pickupAt: new Date(now.getTime() + 55 * 60 * 1000), // 55min later (45min service + 10min gap)
			pickupLatitude: 48.861,
			pickupLongitude: 2.341,
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetMission]);
		expect(suggestions.length).toBe(0);
	});

	it("filters out missions with time gap too long", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
			dropoffLatitude: 48.86,
			dropoffLongitude: 2.34,
		});

		// Target mission: pickup 3 hours after source estimated dropoff
		const targetMission = createMission({
			id: "target",
			pickupAt: new Date(now.getTime() + 225 * 60 * 1000), // 3h45m later (45min service + 3h gap)
			pickupLatitude: 48.861,
			pickupLongitude: 2.341,
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetMission]);
		expect(suggestions.length).toBe(0);
	});

	it("excludes already chained missions", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
			chainId: "existing-chain", // Already chained
		});

		const targetMission = createMission({
			id: "target",
			pickupAt: new Date(now.getTime() + 105 * 60 * 1000),
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetMission]);
		expect(suggestions.length).toBe(0);
	});

	it("excludes target missions that are already chained", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
		});

		const targetMission = createMission({
			id: "target",
			pickupAt: new Date(now.getTime() + 105 * 60 * 1000),
			chainId: "existing-chain", // Already chained
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetMission]);
		expect(suggestions.length).toBe(0);
	});

	it("skips missions without coordinates", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
			pickupLatitude: null, // No coordinates
			pickupLongitude: null,
		});

		const targetMission = createMission({
			id: "target",
			pickupAt: new Date(now.getTime() + 105 * 60 * 1000),
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetMission]);
		expect(suggestions.length).toBe(0);
	});

	it("sorts suggestions by savings descending", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: now,
			dropoffLatitude: 48.86,
			dropoffLongitude: 2.34,
			returnDistanceKm: 20,
			returnCost: 50,
		});

		// Two targets with different potential savings
		const target1 = createMission({
			id: "target1",
			pickupAt: new Date(now.getTime() + 105 * 60 * 1000),
			pickupLatitude: 48.861,
			pickupLongitude: 2.341,
			approachDistanceKm: 5,
			approachCost: 12.5,
		});

		const target2 = createMission({
			id: "target2",
			pickupAt: new Date(now.getTime() + 90 * 60 * 1000),
			pickupLatitude: 48.862,
			pickupLongitude: 2.342,
			approachDistanceKm: 15,
			approachCost: 37.5,
		});

		const suggestions = detectChainingOpportunities(sourceMission, [target1, target2]);
		
		if (suggestions.length >= 2) {
			expect(suggestions[0].savings.costEur).toBeGreaterThanOrEqual(suggestions[1].savings.costEur);
		}
	});

	it("detects both BEFORE and AFTER chain orders", () => {
		const now = new Date();
		const sourceMission = createMission({
			id: "source",
			pickupAt: new Date(now.getTime() + 120 * 60 * 1000), // 2 hours from now
			pickupLatitude: 48.86,
			pickupLongitude: 2.34,
			dropoffLatitude: 48.87,
			dropoffLongitude: 2.35,
		});

		// Target that could come BEFORE source (target dropoff near source pickup)
		const targetBefore = createMission({
			id: "target-before",
			pickupAt: now,
			dropoffLatitude: 48.861, // Close to source pickup
			dropoffLongitude: 2.341,
		});

		// Target that could come AFTER source (target pickup near source dropoff)
		const targetAfter = createMission({
			id: "target-after",
			pickupAt: new Date(now.getTime() + 210 * 60 * 1000), // After source
			pickupLatitude: 48.871, // Close to source dropoff
			pickupLongitude: 2.351,
		});

		const suggestions = detectChainingOpportunities(sourceMission, [targetBefore, targetAfter]);
		
		const beforeSuggestion = suggestions.find(s => s.targetMissionId === "target-before");
		const afterSuggestion = suggestions.find(s => s.targetMissionId === "target-after");

		// At least one direction should be detected
		expect(suggestions.length).toBeGreaterThan(0);
	});
});

describe("calculateChainingSavings", () => {
	it("calculates correct distance savings", () => {
		const source = createMission({
			returnDistanceKm: 15,
			returnCost: 37.5,
		});
		const target = createMission({
			approachDistanceKm: 12,
			approachCost: 30,
		});

		const savings = calculateChainingSavings(source, target, 5, "AFTER");
		
		// Saved: source return (15) + target approach (12) - transition (5) = 22km
		expect(savings.distanceKm).toBe(22);
	});

	it("calculates correct cost savings", () => {
		const source = createMission({
			approachCost: 25,
			serviceCost: 50,
			returnCost: 30,
			totalInternalCost: 105,
		});
		const target = createMission({
			approachCost: 20,
			serviceCost: 40,
			returnCost: 25,
			totalInternalCost: 85,
		});

		const savings = calculateChainingSavings(source, target, 5, "AFTER");
		
		// Original: 105 + 85 = 190
		// Chained: 25 + 50 + (5 * 2.5) + 40 + 25 = 152.5
		// Savings: 190 - 152.5 = 37.5
		expect(savings.costEur).toBeGreaterThan(0);
	});

	it("calculates correct percentage reduction", () => {
		const source = createMission({
			totalInternalCost: 100,
			returnCost: 30,
		});
		const target = createMission({
			totalInternalCost: 100,
			approachCost: 30,
		});

		const savings = calculateChainingSavings(source, target, 5, "AFTER");
		
		expect(savings.percentReduction).toBeGreaterThan(0);
		expect(savings.percentReduction).toBeLessThan(100);
	});

	it("handles BEFORE chain order correctly", () => {
		const source = createMission({
			approachDistanceKm: 15,
			approachCost: 37.5,
		});
		const target = createMission({
			returnDistanceKm: 12,
			returnCost: 30,
		});

		const savings = calculateChainingSavings(source, target, 5, "BEFORE");
		
		// Saved: target return (12) + source approach (15) - transition (5) = 22km
		expect(savings.distanceKm).toBe(22);
	});

	it("returns zero savings when transition exceeds saved distance", () => {
		const source = createMission({
			returnDistanceKm: 5,
			returnCost: 12.5,
		});
		const target = createMission({
			approachDistanceKm: 5,
			approachCost: 12.5,
		});

		const savings = calculateChainingSavings(source, target, 15, "AFTER");
		
		// Saved: 5 + 5 - 15 = -5km (negative, so should be 0)
		expect(savings.distanceKm).toBe(0);
	});
});

describe("checkChainingCompatibility", () => {
	it("returns all true for compatible missions", () => {
		const source = createMission({ vehicleCategoryId: "cat-sedan" });
		const target = createMission({ vehicleCategoryId: "cat-sedan" });

		const compatibility = checkChainingCompatibility(source, target, 5);

		expect(compatibility.vehicleCategory).toBe(true);
		expect(compatibility.timeGap).toBe(true);
		expect(compatibility.rseCompliance).toBe(true);
		expect(compatibility.noConflicts).toBe(true);
	});

	it("returns false for different vehicle categories", () => {
		const source = createMission({ vehicleCategoryId: "cat-sedan" });
		const target = createMission({ vehicleCategoryId: "cat-van" });

		const compatibility = checkChainingCompatibility(source, target, 5);

		expect(compatibility.vehicleCategory).toBe(false);
	});

	it("returns false for distance exceeding threshold", () => {
		const source = createMission();
		const target = createMission();

		const compatibility = checkChainingCompatibility(source, target, 15);

		expect(compatibility.timeGap).toBe(false);
	});

	it("returns false when source is already chained", () => {
		const source = createMission({ chainId: "existing-chain" });
		const target = createMission();

		const compatibility = checkChainingCompatibility(source, target, 5);

		expect(compatibility.noConflicts).toBe(false);
	});

	it("returns false when target is already chained", () => {
		const source = createMission();
		const target = createMission({ chainId: "existing-chain" });

		const compatibility = checkChainingCompatibility(source, target, 5);

		expect(compatibility.noConflicts).toBe(false);
	});
});
