/**
 * Tests for Transversal Trip Decomposition Service
 * Story 18.7: Transversal Trip Decomposition
 */

import { describe, it, expect } from "vitest";
import type { ZoneSegment } from "../route-segmentation";
import {
	isTransversalTrip,
	identifyTransitZones,
	decomposeTransversalTrip,
	buildTransversalDecompositionRule,
	buildTransitDiscountRules,
	getUniqueZonesInOrder,
	getTotalTransversalDistance,
	getTotalTransversalDuration,
	DEFAULT_TRANSIT_CONFIG,
	type TransversalDecompositionConfig,
	type SegmentPricingParams,
} from "../transversal-decomposition";

// ============================================================================
// Test Data
// ============================================================================

const createZoneSegment = (
	zoneCode: string,
	zoneName: string,
	distanceKm: number,
	durationMinutes: number,
	priceMultiplier: number,
): ZoneSegment => ({
	zoneId: `zone-${zoneCode}`,
	zoneCode,
	zoneName,
	distanceKm,
	durationMinutes,
	priceMultiplier,
	surchargesApplied: 0,
	entryPoint: { lat: 48.8566, lng: 2.3522 },
	exitPoint: { lat: 48.8566, lng: 2.3522 },
});

const defaultPricingParams: SegmentPricingParams = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
};

// ============================================================================
// isTransversalTrip Tests
// ============================================================================

describe("isTransversalTrip", () => {
	it("should return true for trip crossing 5 zones", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_20", "Paris 20km", 10, 15, 1.1),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("PARIS_20", "Paris 20km", 12, 18, 1.1),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		expect(isTransversalTrip(segments, "VERSAILLES", "BUSSY_10")).toBe(true);
	});

	it("should return true for trip crossing 3 zones", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("PARIS_20", "Paris 20km", 15, 25, 1.1),
			createZoneSegment("CDG", "CDG Airport", 10, 15, 1.2),
		];

		expect(isTransversalTrip(segments, "PARIS_0", "CDG")).toBe(true);
	});

	it("should return false for trip crossing only 2 zones", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("PARIS_10", "Paris 10km", 8, 15, 1.0),
		];

		expect(isTransversalTrip(segments, "PARIS_0", "PARIS_10")).toBe(false);
	});

	it("should return false for trip within single zone", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 15, 1.0),
		];

		expect(isTransversalTrip(segments, "PARIS_0", "PARIS_0")).toBe(false);
	});

	it("should return false for empty segments", () => {
		expect(isTransversalTrip([], "PARIS_0", "CDG")).toBe(false);
	});

	it("should return false when no intermediate zone exists", () => {
		// 3 zones but pickup and dropoff are the only distinct ones (with repetition)
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("PARIS_0", "Paris Centre", 3, 8, 1.0),
			createZoneSegment("CDG", "CDG Airport", 10, 15, 1.2),
		];

		// Only 2 unique zones: PARIS_0 and CDG
		expect(isTransversalTrip(segments, "PARIS_0", "CDG")).toBe(false);
	});
});

// ============================================================================
// identifyTransitZones Tests
// ============================================================================

describe("identifyTransitZones", () => {
	it("should identify PARIS_0 as transit zone for Versailles → Disney", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_20", "Paris 20km", 10, 15, 1.1),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("PARIS_20", "Paris 20km", 12, 18, 1.1),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const transitZones = identifyTransitZones(
			segments,
			"VERSAILLES",
			"BUSSY_10",
			["PARIS_0", "PARIS_10"],
		);

		expect(transitZones).toContain("PARIS_0");
		expect(transitZones).not.toContain("VERSAILLES");
		expect(transitZones).not.toContain("BUSSY_10");
		expect(transitZones).not.toContain("PARIS_20"); // Not in transit zone list
	});

	it("should return empty array when pickup zone is in transit list", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("PARIS_20", "Paris 20km", 15, 25, 1.1),
			createZoneSegment("CDG", "CDG Airport", 10, 15, 1.2),
		];

		const transitZones = identifyTransitZones(
			segments,
			"PARIS_0", // Pickup is in transit list
			"CDG",
			["PARIS_0", "PARIS_10"],
		);

		// PARIS_0 should NOT be transit because it's the pickup zone
		expect(transitZones).not.toContain("PARIS_0");
	});

	it("should return empty array for empty segments", () => {
		expect(identifyTransitZones([], "PARIS_0", "CDG", ["PARIS_0"])).toEqual([]);
	});

	it("should return empty array when no zones match transit list", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_30", "Paris 30km", 15, 25, 1.2),
			createZoneSegment("CDG", "CDG Airport", 10, 15, 1.2),
		];

		const transitZones = identifyTransitZones(
			segments,
			"VERSAILLES",
			"CDG",
			["PARIS_0", "PARIS_10"], // Neither PARIS_30 nor others are in this list
		);

		expect(transitZones).toEqual([]);
	});
});

// ============================================================================
// decomposeTransversalTrip Tests
// ============================================================================

describe("decomposeTransversalTrip", () => {
	it("should decompose transversal trip into priced segments", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 10,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "BUSSY_10",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);

		expect(result.isTransversal).toBe(true);
		expect(result.totalSegments).toBe(3);
		expect(result.segments).toHaveLength(3);
		expect(result.zonesTraversed).toEqual(["VERSAILLES", "PARIS_0", "BUSSY_10"]);
	});

	it("should apply transit discount when enabled", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_0", "Paris Centre", 10, 20, 1.0),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: true,
			transitDiscountPercent: 10,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "BUSSY_10",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);

		expect(result.isTransversal).toBe(true);
		expect(result.totalTransitDiscount).toBeGreaterThan(0);
		expect(result.priceAfterDiscount).toBeLessThan(result.priceBeforeDiscount);

		// Check that PARIS_0 segment has transit discount
		const parisSegment = result.segments.find((s) => s.zoneCode === "PARIS_0");
		expect(parisSegment?.isTransitZone).toBe(true);
		expect(parisSegment?.transitDiscountApplied).toBeGreaterThan(0);
	});

	it("should NOT apply transit discount when disabled", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_0", "Paris Centre", 10, 20, 1.0),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 10,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "BUSSY_10",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);

		expect(result.totalTransitDiscount).toBe(0);
		expect(result.priceAfterDiscount).toBe(result.priceBeforeDiscount);
	});

	it("should return non-transversal result for 2-zone trip", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("CDG", "CDG Airport", 15, 25, 1.2),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: true,
			transitDiscountPercent: 10,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "PARIS_0",
			dropoffZoneCode: "CDG",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);

		expect(result.isTransversal).toBe(false);
		expect(result.segments).toHaveLength(0);
	});

	it("should return non-transversal result for empty segments", () => {
		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: true,
			transitDiscountPercent: 10,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "PARIS_0",
			dropoffZoneCode: "CDG",
		};

		const result = decomposeTransversalTrip([], config, defaultPricingParams);

		expect(result.isTransversal).toBe(false);
	});

	it("should calculate segment prices with correct multipliers", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 10, 20, 1.2), // Higher multiplier
			createZoneSegment("PARIS_0", "Paris Centre", 10, 20, 1.0), // Base multiplier
			createZoneSegment("CDG", "CDG Airport", 10, 20, 1.2), // Higher multiplier
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 0,
			transitZoneCodes: [],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "CDG",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);

		// Versailles and CDG should have higher prices due to 1.2× multiplier
		const versaillesSegment = result.segments.find((s) => s.zoneCode === "VERSAILLES");
		const parisSegment = result.segments.find((s) => s.zoneCode === "PARIS_0");

		expect(versaillesSegment?.segmentPrice).toBeGreaterThan(parisSegment?.segmentPrice ?? 0);
	});

	it("should sum segment prices correctly", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.0),
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("CDG", "CDG Airport", 5, 10, 1.0),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 0,
			transitZoneCodes: [],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "CDG",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);

		const sumOfSegments = result.segments.reduce((sum, s) => sum + s.segmentPrice, 0);
		expect(result.priceBeforeDiscount).toBeCloseTo(sumOfSegments, 2);
	});
});

// ============================================================================
// buildTransversalDecompositionRule Tests
// ============================================================================

describe("buildTransversalDecompositionRule", () => {
	it("should build rule for transversal trip", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: true,
			transitDiscountPercent: 10,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "BUSSY_10",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);
		const rule = buildTransversalDecompositionRule(result, ["PARIS_0"], true);

		expect(rule.type).toBe("TRANSVERSAL_DECOMPOSITION");
		expect(rule.isTransversal).toBe(true);
		expect(rule.totalSegments).toBe(3);
		expect(rule.zonesTraversed).toEqual(["VERSAILLES", "PARIS_0", "BUSSY_10"]);
		expect(rule.transitZonesIdentified).toEqual(["PARIS_0"]);
		expect(rule.transitDiscountEnabled).toBe(true);
		expect(rule.description).toContain("Transversal trip decomposed");
	});

	it("should build rule for non-transversal trip", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("CDG", "CDG Airport", 15, 25, 1.2),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 0,
			transitZoneCodes: [],
			pickupZoneCode: "PARIS_0",
			dropoffZoneCode: "CDG",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);
		const rule = buildTransversalDecompositionRule(result, [], false);

		expect(rule.type).toBe("TRANSVERSAL_DECOMPOSITION");
		expect(rule.isTransversal).toBe(false);
		expect(rule.description).toContain("not transversal");
	});
});

// ============================================================================
// buildTransitDiscountRules Tests
// ============================================================================

describe("buildTransitDiscountRules", () => {
	it("should build transit discount rules for each transit zone", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: true,
			transitDiscountPercent: 15,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "BUSSY_10",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);
		const rules = buildTransitDiscountRules(result, 15);

		expect(rules).toHaveLength(1);
		expect(rules[0].type).toBe("TRANSIT_DISCOUNT");
		expect(rules[0].zoneCode).toBe("PARIS_0");
		expect(rules[0].discountPercent).toBe(15);
		expect(rules[0].discountAmount).toBeGreaterThan(0);
	});

	it("should return empty array for non-transversal trip", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
			createZoneSegment("CDG", "CDG Airport", 15, 25, 1.2),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: true,
			transitDiscountPercent: 10,
			transitZoneCodes: ["PARIS_0"],
			pickupZoneCode: "PARIS_0",
			dropoffZoneCode: "CDG",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);
		const rules = buildTransitDiscountRules(result, 10);

		expect(rules).toHaveLength(0);
	});
});

// ============================================================================
// Utility Function Tests
// ============================================================================

describe("getUniqueZonesInOrder", () => {
	it("should return unique zones in traversal order", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_20", "Paris 20km", 10, 15, 1.1),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("PARIS_20", "Paris 20km", 12, 18, 1.1), // Repeated
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const uniqueZones = getUniqueZonesInOrder(segments);

		expect(uniqueZones).toEqual(["VERSAILLES", "PARIS_20", "PARIS_0", "PARIS_20", "BUSSY_10"]);
	});

	it("should return empty array for empty segments", () => {
		expect(getUniqueZonesInOrder([])).toEqual([]);
	});
});

describe("getTotalTransversalDistance", () => {
	it("should calculate total distance for transversal trip", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 12, 0.85),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 0,
			transitZoneCodes: [],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "BUSSY_10",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);
		const totalDistance = getTotalTransversalDistance(result);

		expect(totalDistance).toBe(5 + 8 + 6);
	});

	it("should return 0 for non-transversal trip", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("PARIS_0", "Paris Centre", 5, 10, 1.0),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 0,
			transitZoneCodes: [],
			pickupZoneCode: "PARIS_0",
			dropoffZoneCode: "PARIS_0",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);
		const totalDistance = getTotalTransversalDistance(result);

		expect(totalDistance).toBe(0);
	});
});

describe("getTotalTransversalDuration", () => {
	it("should calculate total duration for transversal trip", () => {
		const segments: ZoneSegment[] = [
			createZoneSegment("VERSAILLES", "Versailles", 5, 10, 1.2),
			createZoneSegment("PARIS_0", "Paris Centre", 8, 20, 1.0),
			createZoneSegment("BUSSY_10", "Disney Area", 6, 15, 0.85),
		];

		const config: TransversalDecompositionConfig = {
			transitDiscountEnabled: false,
			transitDiscountPercent: 0,
			transitZoneCodes: [],
			pickupZoneCode: "VERSAILLES",
			dropoffZoneCode: "BUSSY_10",
		};

		const result = decomposeTransversalTrip(segments, config, defaultPricingParams);
		const totalDuration = getTotalTransversalDuration(result);

		expect(totalDuration).toBe(10 + 20 + 15);
	});
});

// ============================================================================
// Default Configuration Tests
// ============================================================================

describe("DEFAULT_TRANSIT_CONFIG", () => {
	it("should have correct default values", () => {
		expect(DEFAULT_TRANSIT_CONFIG.transitDiscountEnabled).toBe(false);
		expect(DEFAULT_TRANSIT_CONFIG.transitDiscountPercent).toBe(10);
		expect(DEFAULT_TRANSIT_CONFIG.transitZoneCodes).toContain("PARIS_0");
		expect(DEFAULT_TRANSIT_CONFIG.transitZoneCodes).toContain("PARIS_10");
	});
});
