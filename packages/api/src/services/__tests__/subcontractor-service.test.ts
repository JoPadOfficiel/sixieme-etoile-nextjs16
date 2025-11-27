/**
 * Subcontractor Service Tests
 * Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions
 */

import { describe, it, expect } from "vitest";
import {
	isStructurallyUnprofitable,
	calculateMarginPercent,
	calculateSubcontractorPrice,
	compareMargins,
	calculateZoneMatchScore,
	isPointInZone,
	extractTripMetrics,
} from "../subcontractor-service";

describe("Subcontractor Service", () => {
	describe("isStructurallyUnprofitable", () => {
		it("should return true when margin is below threshold", () => {
			expect(isStructurallyUnprofitable(100, 110, 0)).toBe(true); // -10% margin
			expect(isStructurallyUnprofitable(100, 100, 0)).toBe(true); // 0% margin
			expect(isStructurallyUnprofitable(100, 95, 10)).toBe(true); // 5% margin, threshold 10%
		});

		it("should return false when margin is above threshold", () => {
			expect(isStructurallyUnprofitable(100, 80, 0)).toBe(false); // 20% margin
			expect(isStructurallyUnprofitable(100, 85, 10)).toBe(false); // 15% margin, threshold 10%
		});

		it("should return true when selling price is zero or negative", () => {
			expect(isStructurallyUnprofitable(0, 50, 0)).toBe(true);
			expect(isStructurallyUnprofitable(-100, 50, 0)).toBe(true);
		});
	});

	describe("calculateMarginPercent", () => {
		it("should calculate margin percentage correctly", () => {
			expect(calculateMarginPercent(100, 80)).toBe(20);
			expect(calculateMarginPercent(100, 100)).toBe(0);
			expect(calculateMarginPercent(100, 120)).toBe(-20);
		});

		it("should return -100 when selling price is zero or negative", () => {
			expect(calculateMarginPercent(0, 50)).toBe(-100);
			expect(calculateMarginPercent(-100, 50)).toBe(-100);
		});

		it("should round to one decimal place", () => {
			expect(calculateMarginPercent(100, 66.67)).toBe(33.3);
		});
	});

	describe("calculateSubcontractorPrice", () => {
		it("should use distance-based pricing when higher", () => {
			// 50km * 2€/km = 100€ vs 60min * 40€/h = 40€
			const price = calculateSubcontractorPrice(2, 40, null, 50, 60);
			expect(price).toBe(100);
		});

		it("should use duration-based pricing when higher", () => {
			// 10km * 2€/km = 20€ vs 120min * 40€/h = 80€
			const price = calculateSubcontractorPrice(2, 40, null, 10, 120);
			expect(price).toBe(80);
		});

		it("should apply minimum fare when calculated price is lower", () => {
			// 5km * 2€/km = 10€, minimum = 25€
			const price = calculateSubcontractorPrice(2, 40, 25, 5, 10);
			expect(price).toBe(25);
		});

		it("should use default rates when null", () => {
			// Default: 2€/km, 40€/h
			// 50km * 2€/km = 100€
			const price = calculateSubcontractorPrice(null, null, null, 50, 60);
			expect(price).toBe(100);
		});
	});

	describe("compareMargins", () => {
		it("should recommend SUBCONTRACT when subcontractor is significantly cheaper", () => {
			const result = compareMargins(100, 90, 70);
			expect(result.recommendation).toBe("SUBCONTRACT");
			expect(result.savings).toBe(20);
			expect(result.savingsPercent).toBeCloseTo(22.2, 1);
		});

		it("should recommend INTERNAL when internal is significantly cheaper", () => {
			const result = compareMargins(100, 70, 90);
			expect(result.recommendation).toBe("INTERNAL");
			expect(result.savings).toBe(-20);
		});

		it("should recommend REVIEW when costs are close", () => {
			const result = compareMargins(100, 80, 82);
			expect(result.recommendation).toBe("REVIEW");
		});
	});

	describe("calculateZoneMatchScore", () => {
		it("should return 100 for full match", () => {
			expect(calculateZoneMatchScore(true, true)).toBe(100);
		});

		it("should return 50 for partial match", () => {
			expect(calculateZoneMatchScore(true, false)).toBe(50);
			expect(calculateZoneMatchScore(false, true)).toBe(50);
		});

		it("should return 0 for no match", () => {
			expect(calculateZoneMatchScore(false, false)).toBe(0);
		});
	});

	describe("isPointInZone", () => {
		it("should return true when point is within zone radius", () => {
			// Paris center
			const zone = {
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 10,
			};
			// Point ~5km away
			expect(isPointInZone(48.88, 2.35, zone)).toBe(true);
		});

		it("should return false when point is outside zone radius", () => {
			const zone = {
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 5,
			};
			// Point ~50km away (Versailles)
			expect(isPointInZone(48.8, 2.13, zone)).toBe(false);
		});

		it("should return false when zone has no center coordinates", () => {
			expect(isPointInZone(48.8566, 2.3522, { centerLatitude: null, centerLongitude: null, radiusKm: 10 })).toBe(false);
		});

		it("should use default 20km radius when not specified", () => {
			const zone = {
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: null,
			};
			// Point ~15km away - should be within default 20km
			expect(isPointInZone(48.95, 2.35, zone)).toBe(true);
		});
	});

	describe("extractTripMetrics", () => {
		it("should extract distance and duration from tripAnalysis", () => {
			const tripAnalysis = {
				totalDistanceKm: 45.5,
				totalDurationMinutes: 60,
			};
			const result = extractTripMetrics(tripAnalysis);
			expect(result.distanceKm).toBe(45.5);
			expect(result.durationMinutes).toBe(60);
		});

		it("should return defaults for null or invalid input", () => {
			expect(extractTripMetrics(null)).toEqual({ distanceKm: 0, durationMinutes: 0 });
			expect(extractTripMetrics(undefined)).toEqual({ distanceKm: 0, durationMinutes: 0 });
			expect(extractTripMetrics("invalid")).toEqual({ distanceKm: 0, durationMinutes: 0 });
		});

		it("should handle missing fields", () => {
			const result = extractTripMetrics({ someOtherField: 123 });
			expect(result.distanceKm).toBe(0);
			expect(result.durationMinutes).toBe(0);
		});
	});
});
