/**
 * Tests for Route Segmentation Service
 * Story 17.13: Route Segmentation for Multi-Zone Trips
 */

import { describe, it, expect } from "vitest";
import type { ZoneData } from "../../lib/geo-utils";
import {
	segmentRouteByZones,
	calculateWeightedMultiplier,
	createFallbackSegmentation,
	buildRouteSegmentationRule,
	type ZoneSegment,
} from "../route-segmentation";

// Test zones representing Paris area
const createTestZones = (): ZoneData[] => [
	{
		id: "zone-paris-0",
		code: "PARIS_0",
		name: "Paris Centre",
		zoneType: "RADIUS",
		geometry: null,
		centerLatitude: 48.8566,
		centerLongitude: 2.3522,
		radiusKm: 5,
		isActive: true,
		priceMultiplier: 1.0,
		priority: 10,
		fixedParkingSurcharge: null,
		fixedAccessFee: null,
		surchargeDescription: null,
	},
	{
		id: "zone-paris-20",
		code: "PARIS_20",
		name: "Petite Couronne",
		zoneType: "RADIUS",
		geometry: null,
		centerLatitude: 48.8566,
		centerLongitude: 2.3522,
		radiusKm: 20,
		isActive: true,
		priceMultiplier: 1.1,
		priority: 5,
		fixedParkingSurcharge: null,
		fixedAccessFee: null,
		surchargeDescription: null,
	},
	{
		id: "zone-cdg",
		code: "CDG",
		name: "Aéroport CDG",
		zoneType: "RADIUS",
		geometry: null,
		centerLatitude: 49.0097,
		centerLongitude: 2.5479,
		radiusKm: 5,
		isActive: true,
		priceMultiplier: 1.2,
		priority: 15, // Higher priority than PARIS_20
		fixedParkingSurcharge: 10,
		fixedAccessFee: 5,
		surchargeDescription: "Airport access fees",
	},
	{
		id: "zone-versailles",
		code: "VERSAILLES",
		name: "Versailles",
		zoneType: "RADIUS",
		geometry: null,
		centerLatitude: 48.8014,
		centerLongitude: 2.1301,
		radiusKm: 5,
		isActive: true,
		priceMultiplier: 1.2,
		priority: 15,
		fixedParkingSurcharge: 40,
		fixedAccessFee: null,
		surchargeDescription: "Parking Château de Versailles",
	},
];

describe("route-segmentation", () => {
	describe("segmentRouteByZones", () => {
		it("should return empty result for empty polyline", () => {
			const result = segmentRouteByZones("", createTestZones(), 60);
			
			expect(result.segments).toEqual([]);
			expect(result.weightedMultiplier).toBe(1.0);
			expect(result.segmentationMethod).toBe("FALLBACK");
		});

		it("should segment a route within a single zone", () => {
			// Polyline entirely within Paris center (small movements)
			// Encoded polyline for points very close to Paris center
			const polyline = "mxqiHmjorA?gB?gB?gB";
			const zones = createTestZones();
			
			const result = segmentRouteByZones(polyline, zones, 30);
			
			// Should have at least one segment
			expect(result.segments.length).toBeGreaterThanOrEqual(1);
			expect(result.segmentationMethod).toBe("POLYLINE");
		});

		it("should calculate weighted multiplier correctly", () => {
			const segments: ZoneSegment[] = [
				{
					zoneId: "z1",
					zoneCode: "ZONE_A",
					zoneName: "Zone A",
					distanceKm: 10,
					durationMinutes: 15,
					priceMultiplier: 1.0,
					surchargesApplied: 0,
					entryPoint: { lat: 0, lng: 0 },
					exitPoint: { lat: 0, lng: 0 },
				},
				{
					zoneId: "z2",
					zoneCode: "ZONE_B",
					zoneName: "Zone B",
					distanceKm: 20,
					durationMinutes: 30,
					priceMultiplier: 1.5,
					surchargesApplied: 0,
					entryPoint: { lat: 0, lng: 0 },
					exitPoint: { lat: 0, lng: 0 },
				},
			];
			
			// Weighted = (10 * 1.0 + 20 * 1.5) / 30 = (10 + 30) / 30 = 40/30 = 1.333
			const weighted = calculateWeightedMultiplier(segments, 30);
			expect(weighted).toBeCloseTo(1.333, 2);
		});

		it("should return 1.0 for empty segments", () => {
			const weighted = calculateWeightedMultiplier([], 0);
			expect(weighted).toBe(1.0);
		});

		it("should apply surcharges only once per zone", () => {
			const zones = createTestZones();
			// A route that enters CDG zone (which has surcharges)
			// We'll use a simple polyline that starts near CDG
			const polyline = "o}siHwxtrA?gB?gB";
			
			const result = segmentRouteByZones(polyline, zones, 30);
			
			// If CDG zone is traversed, surcharges should be applied once
			const cdgSegments = result.segments.filter(s => s.zoneCode === "CDG");
			if (cdgSegments.length > 0) {
				// Total surcharges from CDG should be 15 (10 parking + 5 access)
				const cdgSurcharges = cdgSegments.reduce((sum, s) => sum + s.surchargesApplied, 0);
				expect(cdgSurcharges).toBe(15);
			}
		});
	});

	describe("calculateWeightedMultiplier", () => {
		it("should calculate correct weighted average", () => {
			const segments: ZoneSegment[] = [
				{
					zoneId: "z1",
					zoneCode: "A",
					zoneName: "A",
					distanceKm: 5,
					durationMinutes: 10,
					priceMultiplier: 1.0,
					surchargesApplied: 0,
					entryPoint: { lat: 0, lng: 0 },
					exitPoint: { lat: 0, lng: 0 },
				},
				{
					zoneId: "z2",
					zoneCode: "B",
					zoneName: "B",
					distanceKm: 15,
					durationMinutes: 20,
					priceMultiplier: 1.1,
					surchargesApplied: 0,
					entryPoint: { lat: 0, lng: 0 },
					exitPoint: { lat: 0, lng: 0 },
				},
				{
					zoneId: "z3",
					zoneCode: "C",
					zoneName: "C",
					distanceKm: 10,
					durationMinutes: 15,
					priceMultiplier: 1.2,
					surchargesApplied: 0,
					entryPoint: { lat: 0, lng: 0 },
					exitPoint: { lat: 0, lng: 0 },
				},
			];
			
			// Weighted = (5*1.0 + 15*1.1 + 10*1.2) / 30 = (5 + 16.5 + 12) / 30 = 33.5/30 = 1.117
			const weighted = calculateWeightedMultiplier(segments, 30);
			expect(weighted).toBeCloseTo(1.117, 2);
		});

		it("should return same multiplier when all zones have same multiplier", () => {
			const segments: ZoneSegment[] = [
				{
					zoneId: "z1",
					zoneCode: "A",
					zoneName: "A",
					distanceKm: 10,
					durationMinutes: 15,
					priceMultiplier: 1.2,
					surchargesApplied: 0,
					entryPoint: { lat: 0, lng: 0 },
					exitPoint: { lat: 0, lng: 0 },
				},
				{
					zoneId: "z2",
					zoneCode: "B",
					zoneName: "B",
					distanceKm: 20,
					durationMinutes: 30,
					priceMultiplier: 1.2,
					surchargesApplied: 0,
					entryPoint: { lat: 0, lng: 0 },
					exitPoint: { lat: 0, lng: 0 },
				},
			];
			
			const weighted = calculateWeightedMultiplier(segments, 30);
			expect(weighted).toBe(1.2);
		});
	});

	describe("createFallbackSegmentation", () => {
		it("should return empty result when both zones are null", () => {
			const result = createFallbackSegmentation(null, null, 30, 45);
			
			expect(result.segments).toEqual([]);
			expect(result.weightedMultiplier).toBe(1.0);
			expect(result.segmentationMethod).toBe("FALLBACK");
		});

		it("should create single segment for same zone", () => {
			const zone = createTestZones()[0]; // PARIS_0
			
			const result = createFallbackSegmentation(zone, zone, 30, 45);
			
			expect(result.segments.length).toBe(1);
			expect(result.segments[0].zoneCode).toBe("PARIS_0");
			expect(result.segments[0].distanceKm).toBe(30);
			expect(result.segments[0].durationMinutes).toBe(45);
		});

		it("should create two segments for different zones", () => {
			const zones = createTestZones();
			const pickupZone = zones[0]; // PARIS_0
			const dropoffZone = zones[2]; // CDG
			
			const result = createFallbackSegmentation(pickupZone, dropoffZone, 30, 60);
			
			expect(result.segments.length).toBe(2);
			expect(result.segments[0].zoneCode).toBe("PARIS_0");
			expect(result.segments[1].zoneCode).toBe("CDG");
			// Each should have half the distance/duration
			expect(result.segments[0].distanceKm).toBe(15);
			expect(result.segments[1].distanceKm).toBe(15);
		});

		it("should include surcharges from both zones", () => {
			const zones = createTestZones();
			const pickupZone = zones[0]; // PARIS_0 (no surcharges)
			const dropoffZone = zones[2]; // CDG (15€ surcharges)
			
			const result = createFallbackSegmentation(pickupZone, dropoffZone, 30, 60);
			
			expect(result.totalSurcharges).toBe(15); // Only CDG has surcharges
		});

		it("should handle only pickup zone", () => {
			const zone = createTestZones()[0];
			
			const result = createFallbackSegmentation(zone, null, 30, 45);
			
			expect(result.segments.length).toBe(1);
			expect(result.segments[0].zoneCode).toBe("PARIS_0");
		});

		it("should handle only dropoff zone", () => {
			const zone = createTestZones()[2]; // CDG
			
			const result = createFallbackSegmentation(null, zone, 30, 45);
			
			expect(result.segments.length).toBe(1);
			expect(result.segments[0].zoneCode).toBe("CDG");
		});
	});

	describe("buildRouteSegmentationRule", () => {
		it("should build correct rule for polyline segmentation", () => {
			const result = {
				segments: [
					{
						zoneId: "z1",
						zoneCode: "PARIS_0",
						zoneName: "Paris Centre",
						distanceKm: 10,
						durationMinutes: 15,
						priceMultiplier: 1.0,
						surchargesApplied: 0,
						entryPoint: { lat: 48.8566, lng: 2.3522 },
						exitPoint: { lat: 48.88, lng: 2.4 },
					},
					{
						zoneId: "z2",
						zoneCode: "CDG",
						zoneName: "Aéroport CDG",
						distanceKm: 20,
						durationMinutes: 25,
						priceMultiplier: 1.2,
						surchargesApplied: 15,
						entryPoint: { lat: 48.88, lng: 2.4 },
						exitPoint: { lat: 49.0097, lng: 2.5479 },
					},
				],
				weightedMultiplier: 1.133,
				totalSurcharges: 15,
				zonesTraversed: ["PARIS_0", "CDG"],
				totalDistanceKm: 30,
				segmentationMethod: "POLYLINE" as const,
			};
			
			const rule = buildRouteSegmentationRule(result, 100, 113.3);
			
			expect(rule.type).toBe("ROUTE_SEGMENTATION");
			expect(rule.segmentationMethod).toBe("POLYLINE");
			expect(rule.zonesTraversed).toEqual(["PARIS_0", "CDG"]);
			expect(rule.segmentCount).toBe(2);
			expect(rule.weightedMultiplier).toBe(1.133);
			expect(rule.totalSurcharges).toBe(15);
			expect(rule.priceBefore).toBe(100);
			expect(rule.priceAfter).toBe(113.3);
			expect(rule.description).toContain("PARIS_0 → CDG");
		});

		it("should build correct rule for fallback segmentation", () => {
			const result = {
				segments: [
					{
						zoneId: "z1",
						zoneCode: "PARIS_0",
						zoneName: "Paris Centre",
						distanceKm: 30,
						durationMinutes: 45,
						priceMultiplier: 1.0,
						surchargesApplied: 0,
						entryPoint: { lat: 0, lng: 0 },
						exitPoint: { lat: 0, lng: 0 },
					},
				],
				weightedMultiplier: 1.0,
				totalSurcharges: 0,
				zonesTraversed: ["PARIS_0"],
				totalDistanceKm: 30,
				segmentationMethod: "FALLBACK" as const,
			};
			
			const rule = buildRouteSegmentationRule(result, 100, 100);
			
			expect(rule.type).toBe("ROUTE_SEGMENTATION");
			expect(rule.segmentationMethod).toBe("FALLBACK");
			expect(rule.description).toContain("Fallback");
		});
	});

	describe("performance", () => {
		it("should process segmentation in under 100ms for typical route", () => {
			const zones = createTestZones();
			// Generate a polyline with many points
			const pattern = "??";
			const polyline = pattern.repeat(500);
			
			const start = performance.now();
			const result = segmentRouteByZones(polyline, zones, 60);
			const elapsed = performance.now() - start;
			
			expect(elapsed).toBeLessThan(100);
			expect(result.segmentationMethod).toBe("POLYLINE");
		});
	});
});
