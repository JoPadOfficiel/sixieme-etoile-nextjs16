/**
 * Zone Topology Validator Tests
 * Story 17.11: Zone Topology Validation Tools
 */

import { describe, expect, it } from "vitest";
import type { ZoneData } from "../geo-utils";
import {
	detectMissingFields,
	detectZoneOverlaps,
	doPolygonAndRadiusOverlap,
	doPolygonZonesOverlap,
	doRadiusZonesOverlap,
	validateZoneTopology,
} from "../zone-topology-validator";

// Test data: Paris center
const PARIS_CENTER = { lat: 48.8566, lng: 2.3522 };
// Test data: CDG Airport
const CDG_CENTER = { lat: 49.0097, lng: 2.5479 };
// Test data: Bussy-Saint-Martin (garage)
const BUSSY_CENTER = { lat: 48.8495, lng: 2.6905 };

describe("Zone Topology Validator", () => {
	describe("doRadiusZonesOverlap", () => {
		it("should detect overlapping radius zones", () => {
			const zone1: ZoneData = {
				id: "1",
				name: "Paris Center",
				code: "PARIS_0",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: PARIS_CENTER.lat,
				centerLongitude: PARIS_CENTER.lng,
				radiusKm: 10,
				isActive: true,
			};

			const zone2: ZoneData = {
				id: "2",
				name: "Paris 10km",
				code: "PARIS_10",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: PARIS_CENTER.lat + 0.05, // ~5.5km north
				centerLongitude: PARIS_CENTER.lng,
				radiusKm: 10,
				isActive: true,
			};

			expect(doRadiusZonesOverlap(zone1, zone2)).toBe(true);
		});

		it("should not detect non-overlapping radius zones", () => {
			const zone1: ZoneData = {
				id: "1",
				name: "Paris Center",
				code: "PARIS_0",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: PARIS_CENTER.lat,
				centerLongitude: PARIS_CENTER.lng,
				radiusKm: 5,
				isActive: true,
			};

			const zone2: ZoneData = {
				id: "2",
				name: "CDG Airport",
				code: "CDG",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: CDG_CENTER.lat,
				centerLongitude: CDG_CENTER.lng,
				radiusKm: 5,
				isActive: true,
			};

			// Paris to CDG is ~25km, so 5km + 5km = 10km < 25km
			expect(doRadiusZonesOverlap(zone1, zone2)).toBe(false);
		});

		it("should return false for zones with missing data", () => {
			const zone1: ZoneData = {
				id: "1",
				name: "Zone 1",
				code: "Z1",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			const zone2: ZoneData = {
				id: "2",
				name: "Zone 2",
				code: "Z2",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: PARIS_CENTER.lat,
				centerLongitude: PARIS_CENTER.lng,
				radiusKm: 5,
				isActive: true,
			};

			expect(doRadiusZonesOverlap(zone1, zone2)).toBe(false);
		});
	});

	describe("doPolygonZonesOverlap", () => {
		it("should detect overlapping polygon zones", () => {
			// Two overlapping squares
			const zone1: ZoneData = {
				id: "1",
				name: "Zone 1",
				code: "Z1",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.3, 48.85],
							[2.4, 48.85],
							[2.4, 48.9],
							[2.3, 48.9],
							[2.3, 48.85],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			const zone2: ZoneData = {
				id: "2",
				name: "Zone 2",
				code: "Z2",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.35, 48.87],
							[2.45, 48.87],
							[2.45, 48.95],
							[2.35, 48.95],
							[2.35, 48.87],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			expect(doPolygonZonesOverlap(zone1, zone2)).toBe(true);
		});

		it("should not detect non-overlapping polygon zones", () => {
			const zone1: ZoneData = {
				id: "1",
				name: "Zone 1",
				code: "Z1",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.3, 48.85],
							[2.35, 48.85],
							[2.35, 48.9],
							[2.3, 48.9],
							[2.3, 48.85],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			const zone2: ZoneData = {
				id: "2",
				name: "Zone 2",
				code: "Z2",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.5, 48.95],
							[2.55, 48.95],
							[2.55, 49.0],
							[2.5, 49.0],
							[2.5, 48.95],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			expect(doPolygonZonesOverlap(zone1, zone2)).toBe(false);
		});
	});

	describe("doPolygonAndRadiusOverlap", () => {
		it("should detect when circle center is inside polygon", () => {
			const polygonZone: ZoneData = {
				id: "1",
				name: "Paris Polygon",
				code: "PARIS_POLY",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.2, 48.8],
							[2.5, 48.8],
							[2.5, 48.95],
							[2.2, 48.95],
							[2.2, 48.8],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			const radiusZone: ZoneData = {
				id: "2",
				name: "Paris Center",
				code: "PARIS_0",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: PARIS_CENTER.lat,
				centerLongitude: PARIS_CENTER.lng,
				radiusKm: 2,
				isActive: true,
			};

			expect(doPolygonAndRadiusOverlap(polygonZone, radiusZone)).toBe(true);
		});

		it("should detect when polygon vertex is inside circle", () => {
			const polygonZone: ZoneData = {
				id: "1",
				name: "Small Polygon",
				code: "SMALL",
				zoneType: "POLYGON",
				geometry: {
					type: "Polygon",
					coordinates: [
						[
							[2.35, 48.855],
							[2.36, 48.855],
							[2.36, 48.86],
							[2.35, 48.86],
							[2.35, 48.855],
						],
					],
				},
				centerLatitude: null,
				centerLongitude: null,
				radiusKm: null,
				isActive: true,
			};

			const radiusZone: ZoneData = {
				id: "2",
				name: "Paris Center",
				code: "PARIS_0",
				zoneType: "RADIUS",
				geometry: null,
				centerLatitude: PARIS_CENTER.lat,
				centerLongitude: PARIS_CENTER.lng,
				radiusKm: 5,
				isActive: true,
			};

			expect(doPolygonAndRadiusOverlap(polygonZone, radiusZone)).toBe(true);
		});
	});

	describe("detectZoneOverlaps", () => {
		it("should detect multiple overlaps", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "Paris 5km",
					code: "PARIS_5",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 5,
					isActive: true,
				},
				{
					id: "2",
					name: "Paris 10km",
					code: "PARIS_10",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 10,
					isActive: true,
				},
				{
					id: "3",
					name: "Paris 20km",
					code: "PARIS_20",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 20,
					isActive: true,
				},
			];

			const overlaps = detectZoneOverlaps(zones, false);
			// All three zones overlap with each other: 1-2, 1-3, 2-3
			expect(overlaps.length).toBe(3);
			expect(overlaps[0].severity).toBe("WARNING");
		});

		it("should mark overlaps as INFO when conflict strategy is configured", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "Paris 5km",
					code: "PARIS_5",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 5,
					isActive: true,
				},
				{
					id: "2",
					name: "Paris 10km",
					code: "PARIS_10",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 10,
					isActive: true,
				},
			];

			const overlaps = detectZoneOverlaps(zones, true);
			expect(overlaps.length).toBe(1);
			expect(overlaps[0].severity).toBe("INFO");
		});

		it("should ignore inactive zones", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "Paris 5km",
					code: "PARIS_5",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 5,
					isActive: true,
				},
				{
					id: "2",
					name: "Paris 10km",
					code: "PARIS_10",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 10,
					isActive: false, // Inactive
				},
			];

			const overlaps = detectZoneOverlaps(zones, false);
			expect(overlaps.length).toBe(0);
		});
	});

	describe("detectMissingFields", () => {
		it("should detect missing radiusKm for RADIUS zones", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "Bad Zone",
					code: "BAD",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: null,
					isActive: true,
				},
			];

			const issues = detectMissingFields(zones, false);
			expect(issues.length).toBe(1);
			expect(issues[0].field).toBe("radiusKm");
			expect(issues[0].severity).toBe("ERROR");
		});

		it("should detect missing geometry for POLYGON zones", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "Bad Polygon",
					code: "BAD_POLY",
					zoneType: "POLYGON",
					geometry: null,
					centerLatitude: null,
					centerLongitude: null,
					radiusKm: null,
					isActive: true,
				},
			];

			const issues = detectMissingFields(zones, false);
			expect(issues.length).toBe(1);
			expect(issues[0].field).toBe("geometry");
		});

		it("should detect missing priority when using PRIORITY strategy", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "Zone without priority",
					code: "NO_PRIO",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 5,
					isActive: true,
					priority: 0,
				},
			];

			const issues = detectMissingFields(zones, true, "PRIORITY");
			expect(issues.length).toBe(1);
			expect(issues[0].field).toBe("priority");
			expect(issues[0].severity).toBe("WARNING");
		});
	});

	describe("validateZoneTopology", () => {
		it("should return valid result for well-configured zones", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "CDG Airport",
					code: "CDG",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: CDG_CENTER.lat,
					centerLongitude: CDG_CENTER.lng,
					radiusKm: 5,
					isActive: true,
					priority: 10,
					priceMultiplier: 1.2,
				},
				{
					id: "2",
					name: "Bussy Garage",
					code: "BUSSY",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: BUSSY_CENTER.lat,
					centerLongitude: BUSSY_CENTER.lng,
					radiusKm: 5,
					isActive: true,
					priority: 5,
					priceMultiplier: 0.8,
				},
			];

			const result = validateZoneTopology(
				zones,
				{ conflictStrategyConfigured: true, checkCoverageGaps: false },
				"PRIORITY"
			);

			expect(result.isValid).toBe(true);
			expect(result.overlaps.length).toBe(0);
			expect(result.missingFields.length).toBe(0);
			expect(result.summary.totalZones).toBe(2);
			expect(result.summary.activeZones).toBe(2);
		});

		it("should detect issues in poorly configured zones", () => {
			const zones: ZoneData[] = [
				{
					id: "1",
					name: "Paris 5km",
					code: "PARIS_5",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 5,
					isActive: true,
				},
				{
					id: "2",
					name: "Paris 10km",
					code: "PARIS_10",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: PARIS_CENTER.lat,
					centerLongitude: PARIS_CENTER.lng,
					radiusKm: 10,
					isActive: true,
				},
				{
					id: "3",
					name: "Bad Zone",
					code: "BAD",
					zoneType: "RADIUS",
					geometry: null,
					centerLatitude: null,
					centerLongitude: null,
					radiusKm: null,
					isActive: true,
				},
			];

			const result = validateZoneTopology(
				zones,
				{ conflictStrategyConfigured: false, checkCoverageGaps: true },
				null
			);

			expect(result.isValid).toBe(false); // Has errors
			expect(result.overlaps.length).toBe(1); // Paris 5km and 10km overlap
			expect(result.missingFields.length).toBeGreaterThan(0); // Bad zone has issues
			expect(result.summary.overlapsCount).toBe(1);
		});
	});
});
