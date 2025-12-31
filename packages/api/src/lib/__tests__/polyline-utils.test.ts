/**
 * Tests for Polyline Utilities
 * Story 17.13: Route Segmentation for Multi-Zone Trips
 */

import { describe, it, expect } from "vitest";
import {
	decodePolyline,
	segmentDistance,
	calculatePolylineDistance,
	simplifyPolyline,
	findZoneCrossingPoint,
} from "../polyline-utils";

describe("polyline-utils", () => {
	describe("decodePolyline", () => {
		it("should decode an empty string to empty array", () => {
			const result = decodePolyline("");
			expect(result).toEqual([]);
		});

		it("should decode a simple polyline with two points", () => {
			// Polyline for Paris (48.8566, 2.3522) to roughly nearby
			// This is a known encoded polyline for testing
			const encoded = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";
			const result = decodePolyline(encoded);
			
			expect(result.length).toBeGreaterThan(0);
			expect(result[0]).toHaveProperty("lat");
			expect(result[0]).toHaveProperty("lng");
		});

		it("should decode a real Google polyline correctly", () => {
			// Simple polyline: two points close together
			// Encoded: "??_ibE_ibE" represents a simple line
			const encoded = "??_ibE_ibE";
			const result = decodePolyline(encoded);
			
			expect(result.length).toBe(2);
			// First point should be at origin (0, 0)
			expect(result[0].lat).toBeCloseTo(0, 4);
			expect(result[0].lng).toBeCloseTo(0, 4);
		});

		it("should handle polyline with many points", () => {
			// A longer polyline representing a route
			const encoded = "mxqiHmjorA?gB?gB?gB?gB?gB";
			const result = decodePolyline(encoded);
			
			expect(result.length).toBeGreaterThan(2);
			// All points should have valid coordinates
			for (const point of result) {
				expect(typeof point.lat).toBe("number");
				expect(typeof point.lng).toBe("number");
				expect(point.lat).not.toBeNaN();
				expect(point.lng).not.toBeNaN();
			}
		});

		it("should throw error for invalid polyline characters", () => {
			// Invalid characters (below ASCII 63)
			expect(() => decodePolyline("!!!")).toThrow();
		});
	});

	describe("segmentDistance", () => {
		it("should return 0 for same point", () => {
			const point = { lat: 48.8566, lng: 2.3522 };
			const distance = segmentDistance(point, point);
			expect(distance).toBe(0);
		});

		it("should calculate distance between Paris and CDG correctly", () => {
			// Paris center
			const paris = { lat: 48.8566, lng: 2.3522 };
			// CDG Airport
			const cdg = { lat: 49.0097, lng: 2.5479 };
			
			const distance = segmentDistance(paris, cdg);
			
			// Distance should be approximately 23-25 km
			expect(distance).toBeGreaterThan(20);
			expect(distance).toBeLessThan(30);
		});

		it("should calculate distance between Paris and Versailles correctly", () => {
			const paris = { lat: 48.8566, lng: 2.3522 };
			const versailles = { lat: 48.8014, lng: 2.1301 };
			
			const distance = segmentDistance(paris, versailles);
			
			// Distance should be approximately 17-20 km
			expect(distance).toBeGreaterThan(15);
			expect(distance).toBeLessThan(25);
		});

		it("should be symmetric", () => {
			const p1 = { lat: 48.8566, lng: 2.3522 };
			const p2 = { lat: 49.0097, lng: 2.5479 };
			
			const d1 = segmentDistance(p1, p2);
			const d2 = segmentDistance(p2, p1);
			
			expect(d1).toBeCloseTo(d2, 10);
		});
	});

	describe("calculatePolylineDistance", () => {
		it("should return 0 for empty array", () => {
			expect(calculatePolylineDistance([])).toBe(0);
		});

		it("should return 0 for single point", () => {
			expect(calculatePolylineDistance([{ lat: 48.8566, lng: 2.3522 }])).toBe(0);
		});

		it("should calculate total distance for multiple points", () => {
			const points = [
				{ lat: 48.8566, lng: 2.3522 }, // Paris
				{ lat: 48.8014, lng: 2.1301 }, // Versailles
				{ lat: 48.8048, lng: 2.1203 }, // Slightly further
			];
			
			const totalDistance = calculatePolylineDistance(points);
			
			// Should be sum of individual segments
			const seg1 = segmentDistance(points[0], points[1]);
			const seg2 = segmentDistance(points[1], points[2]);
			
			expect(totalDistance).toBeCloseTo(seg1 + seg2, 5);
		});
	});

	describe("simplifyPolyline", () => {
		it("should return same array for 2 or fewer points", () => {
			const points = [
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 48.8014, lng: 2.1301 },
			];
			
			const simplified = simplifyPolyline(points);
			expect(simplified).toEqual(points);
		});

		it("should keep first and last points", () => {
			const points = [
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 48.8567, lng: 2.3523 }, // Very close to first
				{ lat: 48.8568, lng: 2.3524 }, // Very close to second
				{ lat: 48.8014, lng: 2.1301 }, // Far away
			];
			
			const simplified = simplifyPolyline(points, 0.1); // 100m threshold
			
			expect(simplified[0]).toEqual(points[0]);
			expect(simplified[simplified.length - 1]).toEqual(points[points.length - 1]);
		});

		it("should remove points that are too close together", () => {
			const points = [
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 48.8567, lng: 2.3523 }, // ~100m away
				{ lat: 48.8568, lng: 2.3524 }, // ~100m away
				{ lat: 48.8014, lng: 2.1301 }, // ~17km away
			];
			
			const simplified = simplifyPolyline(points, 1.0); // 1km threshold
			
			// Should keep first, skip middle points, keep last
			expect(simplified.length).toBeLessThan(points.length);
			expect(simplified.length).toBeGreaterThanOrEqual(2);
		});
	});

	describe("findZoneCrossingPoint", () => {
		it("should return midpoint for very close points", () => {
			const p1 = { lat: 48.8566, lng: 2.3522 };
			const p2 = { lat: 48.8567, lng: 2.3523 };
			
			const crossing = findZoneCrossingPoint(p1, p2, () => true, 0.5);
			
			// Should be close to midpoint
			expect(crossing.lat).toBeCloseTo((p1.lat + p2.lat) / 2, 3);
			expect(crossing.lng).toBeCloseTo((p1.lng + p2.lng) / 2, 3);
		});

		it("should find crossing point when zone changes", () => {
			const p1 = { lat: 48.8566, lng: 2.3522 }; // Paris center
			const p2 = { lat: 49.0097, lng: 2.5479 }; // CDG
			
			// Simulate zone boundary at lat 48.9
			const isInZoneA = (point: { lat: number; lng: number }) => point.lat < 48.9;
			
			const crossing = findZoneCrossingPoint(p1, p2, isInZoneA);
			
			// Crossing should be near lat 48.9
			expect(crossing.lat).toBeCloseTo(48.9, 1);
		});

		it("should return point between p1 and p2", () => {
			const p1 = { lat: 48.8, lng: 2.3 };
			const p2 = { lat: 49.0, lng: 2.5 };
			
			const isInZoneA = (point: { lat: number; lng: number }) => point.lat < 48.9;
			
			const crossing = findZoneCrossingPoint(p1, p2, isInZoneA);
			
			// Crossing should be between p1 and p2
			expect(crossing.lat).toBeGreaterThanOrEqual(p1.lat);
			expect(crossing.lat).toBeLessThanOrEqual(p2.lat);
			expect(crossing.lng).toBeGreaterThanOrEqual(p1.lng);
			expect(crossing.lng).toBeLessThanOrEqual(p2.lng);
		});
	});

	describe("performance", () => {
		it("should decode a 1000-point polyline in under 100ms", () => {
			// Generate a long encoded polyline by repeating a pattern
			// Each "??" represents a small delta
			const pattern = "??";
			const encoded = pattern.repeat(1000);
			
			const start = performance.now();
			const result = decodePolyline(encoded);
			const elapsed = performance.now() - start;
			
			expect(elapsed).toBeLessThan(100);
			expect(result.length).toBe(1000);
		});
	});
});
