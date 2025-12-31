/**
 * Story 18.8: Temporal Vectors Unit Tests
 * Tests for matchTemporalVector function and temporal vector pricing logic
 */

import { describe, it, expect } from "vitest";
import {
	matchTemporalVector,
	type ExcursionPackageAssignment,
	type TemporalVectorResult,
} from "../pricing-engine";
import type { ZoneData } from "../../lib/geo-utils";

// ============================================================================
// Test Data
// ============================================================================

const parisZone: ZoneData = {
	id: "zone-paris",
	name: "Paris Centre",
	code: "PARIS_0",
	zoneType: "RADIUS",
	geometry: null,
	centerLatitude: 48.8566,
	centerLongitude: 2.3522,
	radiusKm: 5,
	isActive: true,
};

const normandyZone: ZoneData = {
	id: "zone-normandy",
	name: "Normandie",
	code: "NORMANDY",
	zoneType: "POLYGON",
	geometry: {
		type: "Polygon",
		coordinates: [[[-1.0, 49.0], [0.5, 49.0], [0.5, 49.5], [-1.0, 49.5], [-1.0, 49.0]]],
	},
	centerLatitude: null,
	centerLongitude: null,
	radiusKm: null,
	isActive: true,
};

const loireZone: ZoneData = {
	id: "zone-loire",
	name: "Loire Valley",
	code: "LOIRE",
	zoneType: "POLYGON",
	geometry: {
		type: "Polygon",
		coordinates: [[[0.5, 47.0], [2.0, 47.0], [2.0, 48.0], [0.5, 48.0], [0.5, 47.0]]],
	},
	centerLatitude: null,
	centerLongitude: null,
	radiusKm: null,
	isActive: true,
};

const createTemporalVectorPackage = (
	overrides: Partial<ExcursionPackageAssignment["excursionPackage"]> = {},
	assignmentOverrides: Partial<ExcursionPackageAssignment> = {}
): ExcursionPackageAssignment => ({
	excursionPackage: {
		id: "tv-normandy-berline",
		name: "Normandie D-Day Berline",
		originZoneId: "zone-paris",
		destinationZoneId: "zone-normandy",
		vehicleCategoryId: "cat-berline",
		price: 1080,
		isActive: true,
		originZone: { id: "zone-paris", name: "Paris Centre", code: "PARIS_0" },
		destinationZone: { id: "zone-normandy", name: "Normandie", code: "NORMANDY" },
		isTemporalVector: true,
		minimumDurationHours: 14,
		destinationName: "Normandie D-Day",
		destinationDescription: "Plages du Débarquement",
		includedDurationHours: 14,
		allowedOriginZones: [
			{ pricingZoneId: "zone-paris", pricingZone: { id: "zone-paris", name: "Paris Centre", code: "PARIS_0" } },
		],
		...overrides,
	},
	overridePrice: null,
	...assignmentOverrides,
});

const createNonTemporalVectorPackage = (): ExcursionPackageAssignment => ({
	excursionPackage: {
		id: "exc-paris-night",
		name: "Paris by Night",
		originZoneId: null,
		destinationZoneId: null,
		vehicleCategoryId: "cat-berline",
		price: 195,
		isActive: true,
		originZone: null,
		destinationZone: null,
		isTemporalVector: false,
		minimumDurationHours: null,
		destinationName: null,
		destinationDescription: null,
		includedDurationHours: 3,
		allowedOriginZones: [],
	},
	overridePrice: null,
});

// ============================================================================
// Tests
// ============================================================================

describe("Story 18.8: Temporal Vectors", () => {
	describe("matchTemporalVector", () => {
		describe("Basic Matching", () => {
			it("should match temporal vector when destination zone matches", () => {
				const packages = [createTemporalVectorPackage()];
				
				const result = matchTemporalVector(
					normandyZone,  // dropoff
					parisZone,     // pickup
					"cat-berline",
					480,           // 8 hours estimated
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.isTemporalVector).toBe(true);
				expect(result?.destinationName).toBe("Normandie D-Day");
				expect(result?.packageId).toBe("tv-normandy-berline");
			});

			it("should return null when no temporal vectors exist", () => {
				const packages = [createNonTemporalVectorPackage()];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).toBeNull();
			});

			it("should return null when destination zone does not match", () => {
				const packages = [createTemporalVectorPackage()];
				
				const result = matchTemporalVector(
					loireZone,     // Wrong destination
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).toBeNull();
			});

			it("should return null when vehicle category does not match", () => {
				const packages = [createTemporalVectorPackage()];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-van",     // Wrong category
					480,
					packages
				);

				expect(result).toBeNull();
			});

			it("should return null when package is inactive", () => {
				const packages = [createTemporalVectorPackage({ isActive: false })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).toBeNull();
			});
		});

		describe("Duration Enforcement", () => {
			it("should use minimum duration when estimated is less", () => {
				const packages = [createTemporalVectorPackage({ minimumDurationHours: 14 })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,           // 8 hours estimated (less than 14h minimum)
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.minimumDurationHours).toBe(14);
				expect(result?.actualEstimatedDurationHours).toBe(8);
				expect(result?.durationUsed).toBe(14);
				expect(result?.durationSource).toBe("TEMPORAL_VECTOR");
			});

			it("should use actual duration when estimated exceeds minimum", () => {
				const packages = [createTemporalVectorPackage({ minimumDurationHours: 12 })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					900,           // 15 hours estimated (more than 12h minimum)
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.minimumDurationHours).toBe(12);
				expect(result?.actualEstimatedDurationHours).toBe(15);
				expect(result?.durationUsed).toBe(15);
				expect(result?.durationSource).toBe("ACTUAL_ESTIMATE");
			});

			it("should use minimum when estimated equals minimum", () => {
				const packages = [createTemporalVectorPackage({ minimumDurationHours: 10 })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					600,           // 10 hours estimated (equals minimum)
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.durationUsed).toBe(10);
				expect(result?.durationSource).toBe("ACTUAL_ESTIMATE");
			});
		});

		describe("Origin Zone Restrictions", () => {
			it("should match when pickup zone is in allowed origins", () => {
				const packages = [createTemporalVectorPackage({
					allowedOriginZones: [
						{ pricingZoneId: "zone-paris", pricingZone: { id: "zone-paris", name: "Paris", code: "PARIS_0" } },
					],
				})];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
			});

			it("should not match when pickup zone is not in allowed origins", () => {
				const packages = [createTemporalVectorPackage({
					allowedOriginZones: [
						{ pricingZoneId: "zone-other", pricingZone: { id: "zone-other", name: "Other", code: "OTHER" } },
					],
				})];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,     // Not in allowed origins
					"cat-berline",
					480,
					packages
				);

				expect(result).toBeNull();
			});

			it("should match any origin when allowedOriginZones is empty", () => {
				const packages = [createTemporalVectorPackage({
					allowedOriginZones: [],
				})];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
			});

			it("should match any origin when allowedOriginZones is undefined", () => {
				const packages = [createTemporalVectorPackage({
					allowedOriginZones: undefined,
				})];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
			});
		});

		describe("Price Handling", () => {
			it("should use catalog price when no override", () => {
				const packages = [createTemporalVectorPackage({ price: 1080 }, { overridePrice: null })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.packagePrice).toBe(1080);
			});

			it("should use override price when set", () => {
				const packages = [createTemporalVectorPackage({ price: 1080 }, { overridePrice: 950 })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.packagePrice).toBe(950);
			});

			it("should use catalog price when override is 0", () => {
				const packages = [createTemporalVectorPackage({ price: 1080 }, { overridePrice: 0 })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.packagePrice).toBe(1080);
			});
		});

		describe("Multiple Temporal Vectors", () => {
			it("should return first matching temporal vector", () => {
				const packages = [
					createTemporalVectorPackage({
						id: "tv-loire",
						destinationZoneId: "zone-loire",
						destinationName: "Loire Valley",
					}),
					createTemporalVectorPackage({
						id: "tv-normandy",
						destinationZoneId: "zone-normandy",
						destinationName: "Normandie D-Day",
					}),
				];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.packageId).toBe("tv-normandy");
				expect(result?.destinationName).toBe("Normandie D-Day");
			});

			it("should skip non-matching temporal vectors", () => {
				const packages = [
					createTemporalVectorPackage({
						id: "tv-loire",
						destinationZoneId: "zone-loire",
						vehicleCategoryId: "cat-van",
					}),
					createTemporalVectorPackage({
						id: "tv-normandy",
						destinationZoneId: "zone-normandy",
						vehicleCategoryId: "cat-berline",
					}),
				];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.packageId).toBe("tv-normandy");
			});
		});

		describe("Edge Cases", () => {
			it("should handle empty packages array", () => {
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					[]
				);

				expect(result).toBeNull();
			});

			it("should handle null dropoff zone", () => {
				const packages = [createTemporalVectorPackage()];
				
				const result = matchTemporalVector(
					null,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).toBeNull();
			});

			it("should handle null pickup zone with no origin restrictions", () => {
				const packages = [createTemporalVectorPackage({ allowedOriginZones: [] })];
				
				const result = matchTemporalVector(
					normandyZone,
					null,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
			});

			it("should handle null pickup zone with origin restrictions", () => {
				const packages = [createTemporalVectorPackage({
					allowedOriginZones: [
						{ pricingZoneId: "zone-paris", pricingZone: { id: "zone-paris", name: "Paris", code: "PARIS_0" } },
					],
				})];
				
				const result = matchTemporalVector(
					normandyZone,
					null,          // No pickup zone
					"cat-berline",
					480,
					packages
				);

				expect(result).toBeNull();
			});

			it("should handle zero estimated duration", () => {
				const packages = [createTemporalVectorPackage({ minimumDurationHours: 14 })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					0,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.actualEstimatedDurationHours).toBe(0);
				expect(result?.durationUsed).toBe(14);
				expect(result?.durationSource).toBe("TEMPORAL_VECTOR");
			});

			it("should handle null minimumDurationHours", () => {
				const packages = [createTemporalVectorPackage({ minimumDurationHours: null })];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.minimumDurationHours).toBe(0);
				expect(result?.durationUsed).toBe(8);
				expect(result?.durationSource).toBe("ACTUAL_ESTIMATE");
			});

			it("should use package name when destinationName is null", () => {
				const packages = [createTemporalVectorPackage({ 
					name: "Normandie D-Day Berline",
					destinationName: null 
				})];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					480,
					packages
				);

				expect(result).not.toBeNull();
				expect(result?.destinationName).toBe("Normandie D-Day Berline");
			});
		});

		describe("Result Structure", () => {
			it("should return complete TemporalVectorResult structure", () => {
				const packages = [createTemporalVectorPackage({
					id: "tv-test",
					name: "Test Package",
					price: 1000,
					minimumDurationHours: 12,
					destinationName: "Test Destination",
				})];
				
				const result = matchTemporalVector(
					normandyZone,
					parisZone,
					"cat-berline",
					600,           // 10 hours
					packages
				);

				expect(result).toEqual<TemporalVectorResult>({
					isTemporalVector: true,
					destinationName: "Test Destination",
					minimumDurationHours: 12,
					actualEstimatedDurationHours: 10,
					durationUsed: 12,
					durationSource: "TEMPORAL_VECTOR",
					packageId: "tv-test",
					packageName: "Test Package",
					packagePrice: 1000,
				});
			});
		});
	});
});
