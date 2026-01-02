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

	// Story 19-13: Concentric Circles Resolution Tests
	// Validates zone conflict resolution for the PARIS/BUSSY concentric circle model
	describe("Concentric Circles Resolution (Story 19-13)", () => {
		// ============================================================================
		// REALISTIC ZONE DATA FROM seed-vtc-complete.ts
		// ============================================================================
		
		// PARIS concentric circles (center: Notre-Dame 48.8566, 2.3522)
		const parisCircles: ZoneData[] = [
			{
				id: "zone-paris-0",
				name: "Paris Centre",
				code: "PARIS_0",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 5.0,
				isActive: true,
				priceMultiplier: 1.0,
				priority: 1,
			},
			{
				id: "zone-paris-10",
				name: "Paris Périphérique",
				code: "PARIS_10",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 10.0,
				isActive: true,
				priceMultiplier: 1.0,
				priority: 1,
			},
			{
				id: "zone-paris-20",
				name: "Petite Couronne",
				code: "PARIS_20",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 20.0,
				isActive: true,
				priceMultiplier: 1.1,
				priority: 1,
			},
			{
				id: "zone-paris-30",
				name: "Grande Couronne 30km",
				code: "PARIS_30",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 30.0,
				isActive: true,
				priceMultiplier: 1.2,
				priority: 1,
			},
			{
				id: "zone-paris-40",
				name: "Grande Couronne 40km",
				code: "PARIS_40",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 40.0,
				isActive: true,
				priceMultiplier: 1.3,
				priority: 1,
			},
			{
				id: "zone-paris-60",
				name: "Île-de-France 60km",
				code: "PARIS_60",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 60.0,
				isActive: true,
				priceMultiplier: 1.4,
				priority: 1,
			},
			{
				id: "zone-paris-100",
				name: "Région Parisienne 100km",
				code: "PARIS_100",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8566,
				centerLongitude: 2.3522,
				radiusKm: 100.0,
				isActive: true,
				priceMultiplier: 1.5,
				priority: 1,
			},
		];

		// BUSSY concentric circles (center: Garage 48.8495, 2.6905)
		const bussyCircles: ZoneData[] = [
			{
				id: "zone-bussy-0",
				name: "Bussy-Saint-Martin",
				code: "BUSSY_0",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8495,
				centerLongitude: 2.6905,
				radiusKm: 5.0,
				isActive: true,
				priceMultiplier: 0.8,
				priority: 2, // Higher priority than Paris circles
			},
			{
				id: "zone-bussy-10",
				name: "Bussy 10km",
				code: "BUSSY_10",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8495,
				centerLongitude: 2.6905,
				radiusKm: 10.0,
				isActive: true,
				priceMultiplier: 0.85,
				priority: 2,
			},
			{
				id: "zone-bussy-15",
				name: "Bussy 15km",
				code: "BUSSY_15",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8495,
				centerLongitude: 2.6905,
				radiusKm: 15.0,
				isActive: true,
				priceMultiplier: 0.9,
				priority: 2,
			},
			{
				id: "zone-bussy-25",
				name: "Bussy 25km",
				code: "BUSSY_25",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8495,
				centerLongitude: 2.6905,
				radiusKm: 25.0,
				isActive: true,
				priceMultiplier: 0.95,
				priority: 2,
			},
			{
				id: "zone-bussy-40",
				name: "Bussy 40km",
				code: "BUSSY_40",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8495,
				centerLongitude: 2.6905,
				radiusKm: 40.0,
				isActive: true,
				priceMultiplier: 1.0,
				priority: 2,
			},
		];

		// Special zones (airports, POIs) - higher priority to "pierce" concentric circles
		const specialZones: ZoneData[] = [
			{
				id: "zone-cdg",
				name: "Aéroport CDG",
				code: "CDG",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 49.0097,
				centerLongitude: 2.5479,
				radiusKm: 5.0,
				isActive: true,
				priceMultiplier: 1.2,
				priority: 10, // High priority - pierces circles
				fixedAccessFee: 15.0,
				surchargeDescription: "Frais d'accès aéroport CDG",
			},
			{
				id: "zone-orly",
				name: "Aéroport Orly",
				code: "ORLY",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.7262,
				centerLongitude: 2.3652,
				radiusKm: 4.0,
				isActive: true,
				priceMultiplier: 1.1,
				priority: 10,
				fixedAccessFee: 12.0,
			},
			{
				id: "zone-lbg",
				name: "Le Bourget",
				code: "LBG",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.9694,
				centerLongitude: 2.4414,
				radiusKm: 3.0,
				isActive: true,
				priceMultiplier: 1.2,
				priority: 10,
				fixedAccessFee: 20.0,
			},
			{
				id: "zone-la-defense",
				name: "La Défense",
				code: "LA_DEFENSE",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8920,
				centerLongitude: 2.2362,
				radiusKm: 3.0,
				isActive: true,
				priceMultiplier: 1.0,
				priority: 10,
				fixedParkingSurcharge: 25.0,
			},
			{
				id: "zone-versailles",
				name: "Versailles",
				code: "VERSAILLES",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: 48.8049,
				centerLongitude: 2.1204,
				radiusKm: 5.0,
				isActive: true,
				priceMultiplier: 1.2,
				priority: 10,
				fixedParkingSurcharge: 40.0,
			},
		];

		// All zones combined
		const allZones = [...parisCircles, ...bussyCircles, ...specialZones];

		// ============================================================================
		// TEST CASES
		// ============================================================================

		describe("AC1: Special Zones Priority over Concentric Circles", () => {
			it("CDG airport should be selected over PARIS_40 (default specificity)", () => {
				// Point at CDG airport
				const cdgPoint: GeoPoint = { lat: 49.0097, lng: 2.5479 };
				
				const result = findZoneForPoint(cdgPoint, allZones);
				
				expect(result).not.toBeNull();
				expect(result?.code).toBe("CDG");
				expect(result?.priceMultiplier).toBe(1.2);
			});

			it("CDG airport should be selected with PRIORITY strategy", () => {
				const cdgPoint: GeoPoint = { lat: 49.0097, lng: 2.5479 };
				
				const result = findZoneForPoint(cdgPoint, allZones, "PRIORITY");
				
				expect(result?.code).toBe("CDG");
				expect(result?.priority).toBe(10);
			});

			it("Versailles should be selected over PARIS_20", () => {
				// Point at Versailles
				const versaillesPoint: GeoPoint = { lat: 48.8049, lng: 2.1204 };
				
				const result = findZoneForPoint(versaillesPoint, allZones);
				
				expect(result?.code).toBe("VERSAILLES");
				expect(result?.priceMultiplier).toBe(1.2);
				expect(result?.fixedParkingSurcharge).toBe(40.0);
			});

			it("La Défense should be selected over PARIS_10", () => {
				const laDefensePoint: GeoPoint = { lat: 48.8920, lng: 2.2362 };
				
				const result = findZoneForPoint(laDefensePoint, allZones);
				
				expect(result?.code).toBe("LA_DEFENSE");
				expect(result?.fixedParkingSurcharge).toBe(25.0);
			});
		});

		describe("AC2: Smallest Circle Wins (Same Center)", () => {
			it("Point 3km from Paris center should match PARIS_0 (5km radius)", () => {
				// Point ~3km from Paris center (still within PARIS_0)
				const nearParisCenter: GeoPoint = { lat: 48.88, lng: 2.35 };
				
				const result = findZoneForPoint(nearParisCenter, parisCircles);
				
				expect(result?.code).toBe("PARIS_0");
				expect(result?.priceMultiplier).toBe(1.0);
			});

			it("Point 8km from Paris center should match PARIS_10 (10km radius)", () => {
				// Point ~8km from Paris center
				const point8km: GeoPoint = { lat: 48.93, lng: 2.35 };
				
				const result = findZoneForPoint(point8km, parisCircles);
				
				expect(result?.code).toBe("PARIS_10");
				expect(result?.priceMultiplier).toBe(1.0);
			});

			it("Point 15km from Paris center should match PARIS_20 (20km radius)", () => {
				// Point ~15km from Paris center
				const point15km: GeoPoint = { lat: 48.99, lng: 2.35 };
				
				const result = findZoneForPoint(point15km, parisCircles);
				
				expect(result?.code).toBe("PARIS_20");
				expect(result?.priceMultiplier).toBe(1.1);
			});

			it("Point 25km from Paris center should match PARIS_30 (30km radius)", () => {
				// Point ~25km from Paris center
				const point25km: GeoPoint = { lat: 49.08, lng: 2.35 };
				
				const result = findZoneForPoint(point25km, parisCircles);
				
				expect(result?.code).toBe("PARIS_30");
				expect(result?.priceMultiplier).toBe(1.2);
			});
		});

		describe("AC4: Point in BUSSY Zone Only", () => {
			it("Disneyland should match BUSSY_10 (within 10km of Bussy)", () => {
				// Disneyland Paris: 48.8673, 2.7836 - approximately 9km from Bussy
				const disneylandPoint: GeoPoint = { lat: 48.8673, lng: 2.7836 };
				
				const result = findZoneForPoint(disneylandPoint, bussyCircles);
				
				expect(result?.code).toBe("BUSSY_10");
				expect(result?.priceMultiplier).toBe(0.85);
			});

			it("Point at Bussy garage should match BUSSY_0", () => {
				const bussyCenter: GeoPoint = { lat: 48.8495, lng: 2.6905 };
				
				const result = findZoneForPoint(bussyCenter, bussyCircles);
				
				expect(result?.code).toBe("BUSSY_0");
				expect(result?.priceMultiplier).toBe(0.8);
			});

			it("Point 12km from Bussy should match BUSSY_15", () => {
				// Point ~12km from Bussy
				const point12km: GeoPoint = { lat: 48.75, lng: 2.69 };
				
				const result = findZoneForPoint(point12km, bussyCircles);
				
				expect(result?.code).toBe("BUSSY_15");
				expect(result?.priceMultiplier).toBe(0.9);
			});
		});

		describe("AC5: PRIORITY Strategy Respected", () => {
			it("PRIORITY strategy should select CDG (priority 10) over PARIS circles (priority 1)", () => {
				const cdgPoint: GeoPoint = { lat: 49.0097, lng: 2.5479 };
				
				// Get all matching zones first
				const matchingZones = findZonesForPoint(cdgPoint, allZones);
				
				// CDG should be in the list along with some Paris circles
				expect(matchingZones.length).toBeGreaterThan(1);
				
				// With PRIORITY strategy, CDG should win
				const result = resolveZoneConflict(cdgPoint, matchingZones, "PRIORITY");
				expect(result?.code).toBe("CDG");
				expect(result?.priority).toBe(10);
			});

			it("PRIORITY strategy should select BUSSY zones (priority 2) over PARIS zones (priority 1) in overlap area", () => {
				// Point in overlap area between Paris and Bussy circles
				// ~15km from Paris, ~10km from Bussy
				const overlapPoint: GeoPoint = { lat: 48.85, lng: 2.55 };
				
				const matchingZones = findZonesForPoint(overlapPoint, allZones);
				
				// Should have both Paris and Bussy zones
				const hasParis = matchingZones.some(z => z.code.startsWith("PARIS"));
				const hasBussy = matchingZones.some(z => z.code.startsWith("BUSSY"));
				expect(hasParis).toBe(true);
				expect(hasBussy).toBe(true);
				
				// With PRIORITY strategy, BUSSY should win (priority 2 > 1)
				const result = resolveZoneConflict(overlapPoint, matchingZones, "PRIORITY");
				expect(result?.code).toMatch(/^BUSSY/);
			});
		});

		describe("AC6: MOST_EXPENSIVE Strategy Respected", () => {
			it("MOST_EXPENSIVE should select highest multiplier zone", () => {
				// Point in overlap area
				const overlapPoint: GeoPoint = { lat: 48.85, lng: 2.55 };
				
				const matchingZones = findZonesForPoint(overlapPoint, allZones);
				
				// With MOST_EXPENSIVE, highest multiplier wins
				const result = resolveZoneConflict(overlapPoint, matchingZones, "MOST_EXPENSIVE");
				
				// Find the max multiplier among matching zones
				const maxMultiplier = Math.max(...matchingZones.map(z => z.priceMultiplier ?? 1));
				expect(result?.priceMultiplier).toBe(maxMultiplier);
			});

			it("MOST_EXPENSIVE should prefer PARIS_20 (1.1) over BUSSY_10 (0.85)", () => {
				// Create a subset with just these two zones for clarity
				const testZones: ZoneData[] = [
					{ ...parisCircles[2] }, // PARIS_20, mult 1.1
					{ ...bussyCircles[1] }, // BUSSY_10, mult 0.85
				];
				
				// Point that's in both zones
				const overlapPoint: GeoPoint = { lat: 48.85, lng: 2.55 };
				
				const matchingZones = findZonesForPoint(overlapPoint, testZones);
				const result = resolveZoneConflict(overlapPoint, matchingZones, "MOST_EXPENSIVE");
				
				expect(result?.code).toBe("PARIS_20");
				expect(result?.priceMultiplier).toBe(1.1);
			});
		});

		describe("AC7: Zone Surcharges Applied", () => {
			it("CDG zone should have fixedAccessFee", () => {
				const cdgPoint: GeoPoint = { lat: 49.0097, lng: 2.5479 };
				
				const result = findZoneForPoint(cdgPoint, allZones);
				
				expect(result?.code).toBe("CDG");
				expect(result?.fixedAccessFee).toBe(15.0);
				expect(result?.surchargeDescription).toBe("Frais d'accès aéroport CDG");
			});

			it("Versailles zone should have fixedParkingSurcharge", () => {
				const versaillesPoint: GeoPoint = { lat: 48.8049, lng: 2.1204 };
				
				const result = findZoneForPoint(versaillesPoint, allZones);
				
				expect(result?.code).toBe("VERSAILLES");
				expect(result?.fixedParkingSurcharge).toBe(40.0);
			});
		});

		describe("Boundary Cases", () => {
			it("Point exactly at Paris 100km boundary should be in PARIS_100", () => {
				// Point approximately 95km from Paris (within 100km)
				const farPoint: GeoPoint = { lat: 49.7, lng: 2.35 };
				
				const result = findZoneForPoint(farPoint, parisCircles);
				
				expect(result?.code).toBe("PARIS_100");
				expect(result?.priceMultiplier).toBe(1.5);
			});

			it("Point outside all circles should return null", () => {
				// Point very far from both centers (e.g., Lyon)
				const lyonPoint: GeoPoint = { lat: 45.764, lng: 4.8357 };
				
				const result = findZoneForPoint(lyonPoint, allZones);
				
				expect(result).toBeNull();
			});

			it("Point between two centers should match the closer/smaller circle", () => {
				// Point exactly between Paris and Bussy
				// Paris: 48.8566, 2.3522
				// Bussy: 48.8495, 2.6905
				// Midpoint: ~48.85, ~2.52
				const midpoint: GeoPoint = { lat: 48.85, lng: 2.52 };
				
				// With default specificity (smaller radius first), should match the smallest containing zone
				const result = findZoneForPoint(midpoint, allZones);
				
				// The result should be a valid zone (either Paris or Bussy circle)
				expect(result).not.toBeNull();
				expect(result?.zoneType).toBe("RADIUS");
			});
		});

		describe("CLOSEST Strategy", () => {
			it("CLOSEST should select zone whose center is nearest to the point", () => {
				// Point closer to Bussy than Paris
				const nearBussy: GeoPoint = { lat: 48.85, lng: 2.65 };
				
				const matchingZones = findZonesForPoint(nearBussy, allZones);
				const result = resolveZoneConflict(nearBussy, matchingZones, "CLOSEST");
				
				// Should select a Bussy zone since point is closer to Bussy center
				expect(result?.code).toMatch(/^BUSSY/);
			});

			it("CLOSEST should select Paris zone when point is closer to Paris", () => {
				// Point closer to Paris than Bussy
				const nearParis: GeoPoint = { lat: 48.86, lng: 2.4 };
				
				const matchingZones = findZonesForPoint(nearParis, allZones);
				const result = resolveZoneConflict(nearParis, matchingZones, "CLOSEST");
				
				// Should select a Paris zone
				expect(result?.code).toMatch(/^PARIS/);
			});
		});

		describe("COMBINED Strategy", () => {
			it("COMBINED should filter by priority first, then by multiplier", () => {
				const cdgPoint: GeoPoint = { lat: 49.0097, lng: 2.5479 };
				
				const matchingZones = findZonesForPoint(cdgPoint, allZones);
				const result = resolveZoneConflict(cdgPoint, matchingZones, "COMBINED");
				
				// CDG has highest priority (10), so it should win
				expect(result?.code).toBe("CDG");
			});

			it("COMBINED with equal priorities should use highest multiplier", () => {
				// Create zones with same priority but different multipliers
				const equalPriorityZones: ZoneData[] = [
					{ ...parisCircles[2], priority: 5 }, // PARIS_20, mult 1.1, priority 5
					{ ...parisCircles[3], priority: 5 }, // PARIS_30, mult 1.2, priority 5
				];
				
				const point: GeoPoint = { lat: 48.99, lng: 2.35 }; // ~15km from Paris
				const matchingZones = findZonesForPoint(point, equalPriorityZones);
				const result = resolveZoneConflict(point, matchingZones, "COMBINED");
				
				// Both have priority 5, so higher multiplier (1.2) should win
				expect(result?.priceMultiplier).toBe(1.2);
			});
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
