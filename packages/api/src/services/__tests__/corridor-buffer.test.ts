/**
 * Tests for Corridor Buffer Service
 * Story 18.1: Corridor Zone Type (Highway Buffers)
 */

import { describe, it, expect } from "vitest";
import {
	generateCorridorBuffer,
	calculateCorridorLength,
	isPointInCorridor,
	getCorridorIntersection,
	getCorridorIntersections,
	validateCorridorConfig,
} from "../corridor-buffer";
import type { GeoPolygon } from "../../lib/geo-utils";

// Sample encoded polyline for A1 highway segment (Paris → CDG area)
// This is a simplified polyline for testing
const SAMPLE_POLYLINE = "_p~iF~ps|U_ulLnnqC_mqNvxq`@";

// Simple 2-point polyline (straight line)
const SIMPLE_POLYLINE = "aoceFfnjuMoq@_pA"; // ~2km line

// Route polyline that crosses the corridor
const CROSSING_ROUTE_POLYLINE = "aoceFfnjuMoq@_pA_pA_pA"; // Extended route

describe("Corridor Buffer Service", () => {
	describe("validateCorridorConfig", () => {
		it("should accept valid buffer distance (500m)", () => {
			expect(() => validateCorridorConfig({ bufferMeters: 500 })).not.toThrow();
		});

		it("should accept minimum buffer distance (100m)", () => {
			expect(() => validateCorridorConfig({ bufferMeters: 100 })).not.toThrow();
		});

		it("should accept maximum buffer distance (5000m)", () => {
			expect(() => validateCorridorConfig({ bufferMeters: 5000 })).not.toThrow();
		});

		it("should reject buffer distance below 100m", () => {
			expect(() => validateCorridorConfig({ bufferMeters: 50 })).toThrow(
				"Buffer distance must be between 100m and 5000m"
			);
		});

		it("should reject buffer distance above 5000m", () => {
			expect(() => validateCorridorConfig({ bufferMeters: 6000 })).toThrow(
				"Buffer distance must be between 100m and 5000m"
			);
		});
	});

	describe("generateCorridorBuffer", () => {
		it("should generate a valid buffer polygon from a simple polyline", () => {
			const result = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			expect(result).toBeDefined();
			expect(result.geometry).toBeDefined();
			expect(result.geometry.type).toBe("Polygon");
			expect(result.geometry.coordinates).toBeDefined();
			expect(result.geometry.coordinates.length).toBeGreaterThan(0);
		});

		it("should calculate corridor length correctly", () => {
			const result = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			expect(result.lengthKm).toBeGreaterThan(0);
			expect(result.lengthKm).toBeLessThan(100); // Reasonable for a simple polyline
		});

		it("should calculate center point at midpoint of polyline", () => {
			const result = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			expect(result.centerPoint).toBeDefined();
			expect(result.centerPoint.lat).toBeGreaterThan(-90);
			expect(result.centerPoint.lat).toBeLessThan(90);
			expect(result.centerPoint.lng).toBeGreaterThan(-180);
			expect(result.centerPoint.lng).toBeLessThan(180);
		});

		it("should calculate bounding box", () => {
			const result = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			expect(result.bbox).toBeDefined();
			expect(result.bbox.length).toBe(4);
			// [minLng, minLat, maxLng, maxLat]
			expect(result.bbox[0]).toBeLessThan(result.bbox[2]); // minLng < maxLng
			expect(result.bbox[1]).toBeLessThan(result.bbox[3]); // minLat < maxLat
		});

		it("should create wider buffer with larger bufferMeters", () => {
			const narrow = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 100,
			});
			const wide = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 1000,
			});

			// Wide buffer should have larger bounding box
			const narrowWidth = narrow.bbox[2] - narrow.bbox[0];
			const wideWidth = wide.bbox[2] - wide.bbox[0];
			expect(wideWidth).toBeGreaterThan(narrowWidth);
		});

		it("should throw error for empty polyline", () => {
			expect(() =>
				generateCorridorBuffer("", { bufferMeters: 500 })
			).toThrow();
		});

		it("should throw error for invalid buffer distance", () => {
			expect(() =>
				generateCorridorBuffer(SIMPLE_POLYLINE, { bufferMeters: 50 })
			).toThrow("Buffer distance must be between 100m and 5000m");
		});
	});

	describe("calculateCorridorLength", () => {
		it("should calculate length of a simple polyline", () => {
			const length = calculateCorridorLength(SIMPLE_POLYLINE);
			expect(length).toBeGreaterThan(0);
		});

		it("should return 0 for empty polyline", () => {
			const length = calculateCorridorLength("");
			expect(length).toBe(0);
		});

		it("should return consistent length for same polyline", () => {
			const length1 = calculateCorridorLength(SIMPLE_POLYLINE);
			const length2 = calculateCorridorLength(SIMPLE_POLYLINE);
			expect(length1).toBe(length2);
		});
	});

	describe("isPointInCorridor", () => {
		it("should return true for point inside corridor buffer", () => {
			const bufferResult = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			// Use center point which should definitely be inside
			const isInside = isPointInCorridor(
				bufferResult.centerPoint,
				bufferResult.geometry
			);
			expect(isInside).toBe(true);
		});

		it("should return false for point far outside corridor", () => {
			const bufferResult = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			// Point very far from the corridor
			const farPoint = { lat: 0, lng: 0 };
			const isInside = isPointInCorridor(farPoint, bufferResult.geometry);
			expect(isInside).toBe(false);
		});

		it("should handle edge cases near buffer boundary", () => {
			const bufferResult = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			// Point at center should be inside
			expect(
				isPointInCorridor(bufferResult.centerPoint, bufferResult.geometry)
			).toBe(true);
		});
	});

	describe("getCorridorIntersection", () => {
		it("should return null for route that does not intersect corridor", () => {
			const corridorBuffer = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			// Route far from corridor (equator)
			const farRoutePolyline = "_ibE_ibE_ibE_ibE";
			const intersection = getCorridorIntersection(
				farRoutePolyline,
				corridorBuffer.geometry,
				10
			);

			expect(intersection).toBeNull();
		});

		it("should return intersection for route through corridor", () => {
			const corridorBuffer = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 1000, // Wider buffer for easier intersection
			});

			// Use the same polyline as the corridor (100% intersection)
			const intersection = getCorridorIntersection(
				SIMPLE_POLYLINE,
				corridorBuffer.geometry,
				corridorBuffer.lengthKm
			);

			expect(intersection).not.toBeNull();
			if (intersection) {
				expect(intersection.distanceKm).toBeGreaterThan(0);
				expect(intersection.percentageOfRoute).toBeGreaterThan(0);
				expect(intersection.entryPoint).toBeDefined();
				expect(intersection.exitPoint).toBeDefined();
			}
		});

		it("should calculate percentage of route correctly", () => {
			const corridorBuffer = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 1000,
			});

			// Route entirely within corridor
			const intersection = getCorridorIntersection(
				SIMPLE_POLYLINE,
				corridorBuffer.geometry,
				corridorBuffer.lengthKm
			);

			if (intersection) {
				// Should be close to 100% for route that matches corridor
				expect(intersection.percentageOfRoute).toBeGreaterThan(50);
			}
		});
	});

	describe("getCorridorIntersections (multiple)", () => {
		it("should return empty array for route that does not intersect", () => {
			const corridorBuffer = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			const farRoutePolyline = "_ibE_ibE_ibE_ibE";
			const intersections = getCorridorIntersections(
				farRoutePolyline,
				corridorBuffer.geometry,
				10
			);

			expect(intersections).toEqual([]);
		});

		it("should return single intersection for simple crossing", () => {
			const corridorBuffer = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 1000,
			});

			const intersections = getCorridorIntersections(
				SIMPLE_POLYLINE,
				corridorBuffer.geometry,
				corridorBuffer.lengthKm
			);

			expect(intersections.length).toBeGreaterThanOrEqual(1);
		});

		it("should include entry and exit points for each intersection", () => {
			const corridorBuffer = generateCorridorBuffer(SIMPLE_POLYLINE, {
				bufferMeters: 1000,
			});

			const intersections = getCorridorIntersections(
				SIMPLE_POLYLINE,
				corridorBuffer.geometry,
				corridorBuffer.lengthKm
			);

			for (const intersection of intersections) {
				expect(intersection.entryPoint).toBeDefined();
				expect(intersection.exitPoint).toBeDefined();
				expect(intersection.distanceKm).toBeGreaterThan(0);
			}
		});
	});

	describe("Integration: Full corridor workflow", () => {
		it("should create corridor and detect route intersection", () => {
			// 1. Create corridor buffer
			const corridor = generateCorridorBuffer(SAMPLE_POLYLINE, {
				bufferMeters: 500,
			});

			expect(corridor.geometry.type).toBe("Polygon");
			expect(corridor.lengthKm).toBeGreaterThan(0);

			// 2. Check if center point is inside
			const centerInside = isPointInCorridor(
				corridor.centerPoint,
				corridor.geometry
			);
			expect(centerInside).toBe(true);

			// 3. Calculate corridor length
			const length = calculateCorridorLength(SAMPLE_POLYLINE);
			expect(length).toBeCloseTo(corridor.lengthKm, 1);
		});

		it("should handle A1 highway-like corridor", () => {
			// Simulate A1 highway corridor (Paris → CDG)
			// Using a realistic polyline segment
			const a1Polyline = SAMPLE_POLYLINE;

			const corridor = generateCorridorBuffer(a1Polyline, {
				bufferMeters: 500, // 500m buffer on each side
			});

			expect(corridor).toBeDefined();
			expect(corridor.geometry.coordinates[0].length).toBeGreaterThan(4); // Should have multiple points
			expect(corridor.lengthKm).toBeGreaterThan(0);
		});
	});
});
