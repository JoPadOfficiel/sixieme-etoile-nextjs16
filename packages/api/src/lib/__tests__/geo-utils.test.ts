/**
 * Tests for geo-utils.ts
 * Tests geographic utility functions for pricing zone matching
 */

import { describe, expect, it } from "vitest";
import {
	findZoneForPoint,
	findZonesForPoint,
	getZoneCenter,
	haversineDistance,
	isPointInPolygon,
	isPointInRadius,
	resolveZoneConflict,
	type GeoPoint,
	type ZoneConflictStrategy,
	type ZoneData,
} from "../geo-utils";

describe("geo-utils", () => {
	describe("haversineDistance", () => {
		it("should calculate distance between two points correctly", () => {
			// Paris to Lyon (approximately 392 km)
			const paris: GeoPoint = { lat: 48.8566, lng: 2.3522 };
			const lyon: GeoPoint = { lat: 45.764, lng: 4.8357 };

			const distance = haversineDistance(paris, lyon);

			// Allow 5% margin for approximation
			expect(distance).toBeGreaterThan(390);
			expect(distance).toBeLessThan(400);
		});

		it("should return 0 for same point", () => {
			const point: GeoPoint = { lat: 48.8566, lng: 2.3522 };

			const distance = haversineDistance(point, point);

			expect(distance).toBe(0);
		});

		it("should calculate short distances accurately", () => {
			// Two points about 1km apart in Paris
			const point1: GeoPoint = { lat: 48.8566, lng: 2.3522 };
			const point2: GeoPoint = { lat: 48.8656, lng: 2.3522 }; // ~1km north

			const distance = haversineDistance(point1, point2);

			expect(distance).toBeGreaterThan(0.9);
			expect(distance).toBeLessThan(1.1);
		});
	});

	describe("isPointInRadius", () => {
		it("should return true for point inside radius", () => {
			const point: GeoPoint = { lat: 48.8566, lng: 2.3522 };
			const center: GeoPoint = { lat: 48.8566, lng: 2.3522 };

			expect(isPointInRadius(point, center, 1)).toBe(true);
		});

		it("should return false for point outside radius", () => {
			const point: GeoPoint = { lat: 48.8566, lng: 2.3522 };
			const center: GeoPoint = { lat: 45.764, lng: 4.8357 }; // Lyon

			expect(isPointInRadius(point, center, 10)).toBe(false);
		});

		it("should handle edge case at exact radius boundary", () => {
			const center: GeoPoint = { lat: 48.8566, lng: 2.3522 };
			const point: GeoPoint = { lat: 48.8656, lng: 2.3522 }; // ~1km north

			// Should be inside 2km radius
			expect(isPointInRadius(point, center, 2)).toBe(true);
			// Should be outside 0.5km radius
			expect(isPointInRadius(point, center, 0.5)).toBe(false);
		});
	});

	describe("isPointInPolygon", () => {
		// Simple square polygon around central Paris
		const parisSquare = {
			type: "Polygon" as const,
			coordinates: [
				[
					[2.3, 48.8], // SW
					[2.4, 48.8], // SE
					[2.4, 48.9], // NE
					[2.3, 48.9], // NW
					[2.3, 48.8], // Close the polygon
				],
			],
		};

		it("should return true for point inside polygon", () => {
			const point: GeoPoint = { lat: 48.85, lng: 2.35 };

			expect(isPointInPolygon(point, parisSquare)).toBe(true);
		});

		it("should return false for point outside polygon", () => {
			const point: GeoPoint = { lat: 49.0, lng: 2.35 }; // North of polygon

			expect(isPointInPolygon(point, parisSquare)).toBe(false);
		});

		it("should handle point on polygon edge", () => {
			const point: GeoPoint = { lat: 48.85, lng: 2.3 }; // On west edge

			// Ray casting may return true or false for edge cases
			// The important thing is it doesn't throw
			const result = isPointInPolygon(point, parisSquare);
			expect(typeof result).toBe("boolean");
		});

		it("should handle complex polygon shapes", () => {
			// L-shaped polygon
			const lShape = {
				type: "Polygon" as const,
				coordinates: [
					[
						[0, 0],
						[2, 0],
						[2, 1],
						[1, 1],
						[1, 2],
						[0, 2],
						[0, 0],
					],
				],
			};

			// Point in the main part of L
			expect(isPointInPolygon({ lat: 0.5, lng: 0.5 }, lShape)).toBe(true);
			// Point in the cut-out area
			expect(isPointInPolygon({ lat: 1.5, lng: 1.5 }, lShape)).toBe(false);
		});
	});

	describe("findZoneForPoint", () => {
		const zones: ZoneData[] = [
			{
				id: "zone-polygon",
				name: "Paris Center",
				code: "PAR-CTR",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.3, 48.8],
							[2.4, 48.8],
							[2.4, 48.9],
							[2.3, 48.9],
							[2.3, 48.8],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			},
			{
				id: "zone-radius",
				name: "CDG Airport",
				code: "CDG",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 49.0097,
				centerLongitude: 2.5479,
				radiusKm: 5,
				isActive: true,
			},
			{
				id: "zone-inactive",
				name: "Inactive Zone",
				code: "INACTIVE",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.3, 48.8],
							[2.4, 48.8],
							[2.4, 48.9],
							[2.3, 48.9],
							[2.3, 48.8],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: false,
			},
		];

		it("should find polygon zone for point inside", () => {
			const point: GeoPoint = { lat: 48.85, lng: 2.35 };

			const result = findZoneForPoint(point, zones);

			expect(result).not.toBeNull();
			expect(result?.id).toBe("zone-polygon");
		});

		it("should find radius zone for point inside", () => {
			const point: GeoPoint = { lat: 49.01, lng: 2.55 }; // Near CDG

			const result = findZoneForPoint(point, zones);

			expect(result).not.toBeNull();
			expect(result?.id).toBe("zone-radius");
		});

		it("should return null for point outside all zones", () => {
			const point: GeoPoint = { lat: 45.0, lng: 5.0 }; // Far away

			const result = findZoneForPoint(point, zones);

			expect(result).toBeNull();
		});

		it("should skip inactive zones", () => {
			// The inactive zone covers the same area as the polygon zone
			// But since it's inactive, it should not be matched
			const inactiveOnlyZones: ZoneData[] = [
				{
					id: "zone-inactive",
					name: "Inactive Zone",
					code: "INACTIVE",
					zoneType: "POLYGON",
					geometry: {
						type: "Polygon",
						coordinates: [
							[
								[2.3, 48.8],
								[2.4, 48.8],
								[2.4, 48.9],
								[2.3, 48.9],
								[2.3, 48.8],
							],
						],
					},
					centerLatitude: null,
					centerLongitude: null,
					radiusKm: null,
					isActive: false,
				},
			];

			const point: GeoPoint = { lat: 48.85, lng: 2.35 };
			const result = findZoneForPoint(point, inactiveOnlyZones);

			expect(result).toBeNull();
		});

		it("should handle POINT zone type with small radius", () => {
			const pointZones: ZoneData[] = [
				{
					id: "zone-point",
					name: "Exact Location",
					code: "EXACT",
					zoneType: "POINT",
					geometry: null,
					centerLatitude: 48.8566,
					centerLongitude: 2.3522,
					radiusKm: null,
					isActive: true,
				},
			];

			// POINT zones match within a small radius (100m)
			const exactPoint: GeoPoint = { lat: 48.8566, lng: 2.3522 };
			const result = findZoneForPoint(exactPoint, pointZones);
			expect(result).not.toBeNull();
			expect(result?.id).toBe("zone-point");

			// Point far away should not match
			const farPoint: GeoPoint = { lat: 48.86, lng: 2.36 };
			const farResult = findZoneForPoint(farPoint, pointZones);
			expect(farResult).toBeNull();
		});
	});

	// Story 17.1: Zone conflict resolution tests
	describe("resolveZoneConflict", () => {
		// Overlapping zones for conflict testing
		const overlappingZones: ZoneData[] = [
			{
				id: "zone-paris-20",
				name: "Paris 20km",
				code: "PARIS_20",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 20,
				isActive: true,
				priceMultiplier: 1.1,
				priority: 1,
			},
			{
				id: "zone-cdg",
				name: "CDG Airport",
				code: "CDG",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 49.0097,
				centerLongitude: 2.5479,
				radiusKm: 5,
				isActive: true,
				priceMultiplier: 1.2,
				priority: 5,
			},
			{
				id: "zone-bussy",
				name: "Bussy 10km",
				code: "BUSSY_10",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8495,
				centerLongitude: 2.6905,
				radiusKm: 10,
				isActive: true,
				priceMultiplier: 0.85,
				priority: 3,
			},
		];

		const testPoint: GeoPoint = { lat: 48.95, lng: 2.55 }; // Point that could be in multiple zones

		it("should return null for empty zones array", () => {
			const result = resolveZoneConflict(testPoint, [], null);
			expect(result).toBeNull();
		});

		it("should return the single zone when only one zone matches", () => {
			const result = resolveZoneConflict(testPoint, [overlappingZones[0]], null);
			expect(result?.id).toBe("zone-paris-20");
		});

		it("PRIORITY: should select zone with highest priority", () => {
			const result = resolveZoneConflict(testPoint, overlappingZones, "PRIORITY");
			expect(result?.id).toBe("zone-cdg"); // priority 5
		});

		it("MOST_EXPENSIVE: should select zone with highest priceMultiplier", () => {
			const result = resolveZoneConflict(testPoint, overlappingZones, "MOST_EXPENSIVE");
			expect(result?.id).toBe("zone-cdg"); // multiplier 1.2
		});

		it("CLOSEST: should select zone closest to point", () => {
			// Point closer to CDG center
			const pointNearCDG: GeoPoint = { lat: 49.0, lng: 2.55 };
			const result = resolveZoneConflict(pointNearCDG, overlappingZones, "CLOSEST");
			expect(result?.id).toBe("zone-cdg");

			// Point closer to Paris center
			const pointNearParis: GeoPoint = { lat: 48.86, lng: 2.4 };
			const resultParis = resolveZoneConflict(pointNearParis, overlappingZones, "CLOSEST");
			expect(resultParis?.id).toBe("zone-paris-20");
		});

		it("COMBINED: should filter by priority then by multiplier", () => {
			// CDG has highest priority (5), so it wins
			const result = resolveZoneConflict(testPoint, overlappingZones, "COMBINED");
			expect(result?.id).toBe("zone-cdg");

			// Test with equal priorities
			const equalPriorityZones: ZoneData[] = [
				{ ...overlappingZones[0], priority: 5 }, // PARIS_20 with priority 5, multiplier 1.1
				{ ...overlappingZones[1], priority: 5 }, // CDG with priority 5, multiplier 1.2
			];
			const resultEqual = resolveZoneConflict(testPoint, equalPriorityZones, "COMBINED");
			expect(resultEqual?.id).toBe("zone-cdg"); // Higher multiplier wins
		});

		it("null strategy: should use default specificity logic (smaller radius first)", () => {
			const result = resolveZoneConflict(testPoint, overlappingZones, null);
			// CDG has smallest radius (5km), so it should be selected
			expect(result?.id).toBe("zone-cdg");
		});

		it("should handle zones with missing priority (default to 0)", () => {
			const zonesWithMissingPriority: ZoneData[] = [
				{ ...overlappingZones[0], priority: undefined },
				{ ...overlappingZones[1], priority: 2 },
			];
			const result = resolveZoneConflict(testPoint, zonesWithMissingPriority, "PRIORITY");
			expect(result?.id).toBe("zone-cdg"); // priority 2 > undefined (0)
		});

		it("should handle zones with missing priceMultiplier (default to 1)", () => {
			const zonesWithMissingMultiplier: ZoneData[] = [
				{ ...overlappingZones[0], priceMultiplier: undefined },
				{ ...overlappingZones[2], priceMultiplier: 0.85 },
			];
			const result = resolveZoneConflict(testPoint, zonesWithMissingMultiplier, "MOST_EXPENSIVE");
			expect(result?.id).toBe("zone-paris-20"); // 1.0 (default) > 0.85
		});
	});

	describe("getZoneCenter", () => {
		it("should return explicit center coordinates when available", () => {
			const zone: ZoneData = {
				id: "zone-1",
				name: "Test Zone",
				code: "TEST",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 5,
				isActive: true,
			};

			const center = getZoneCenter(zone);
			expect(center).not.toBeNull();
			expect(center?.lat).toBe(48.8566);
			expect(center?.lng).toBe(2.3522);
		});

		it("should calculate centroid for POLYGON zones without explicit center", () => {
			const zone: ZoneData = {
				id: "zone-polygon",
				name: "Square Zone",
				code: "SQUARE",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.3, 48.8], // SW
							[2.4, 48.8], // SE
							[2.4, 48.9], // NE
							[2.3, 48.9], // NW
							[2.3, 48.8], // Close
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			const center = getZoneCenter(zone);
			expect(center).not.toBeNull();
			// Centroid of square should be at center
			expect(center?.lat).toBeCloseTo(48.85, 2);
			expect(center?.lng).toBeCloseTo(2.35, 2);
		});

		it("should return null for zones without center or geometry", () => {
			const zone: ZoneData = {
				id: "zone-no-center",
				name: "No Center Zone",
				code: "NOCENTER",
				zoneType: "POLYGON",
				geometry: null,
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			const center = getZoneCenter(zone);
			expect(center).toBeNull();
		});
	});

	describe("findZoneForPoint with strategy", () => {
		const zonesWithPriority: ZoneData[] = [
			{
				id: "zone-large",
				name: "Large Zone",
				code: "LARGE",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 50,
				isActive: true,
				priceMultiplier: 1.0,
				priority: 1,
			},
			{
				id: "zone-small",
				name: "Small Zone",
				code: "SMALL",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 5,
				isActive: true,
				priceMultiplier: 1.5,
				priority: 10,
			},
		];

		const point: GeoPoint = { lat: 48.8566, lng: 2.3522 };

		it("should use default specificity when no strategy provided", () => {
			const result = findZoneForPoint(point, zonesWithPriority);
			// Smaller radius = more specific
			expect(result?.id).toBe("zone-small");
		});

		it("should use PRIORITY strategy when specified", () => {
			const result = findZoneForPoint(point, zonesWithPriority, "PRIORITY");
			expect(result?.id).toBe("zone-small"); // priority 10
		});

		it("should use MOST_EXPENSIVE strategy when specified", () => {
			const result = findZoneForPoint(point, zonesWithPriority, "MOST_EXPENSIVE");
			expect(result?.id).toBe("zone-small"); // multiplier 1.5
		});
	});
});
