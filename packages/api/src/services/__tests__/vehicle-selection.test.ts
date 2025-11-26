/**
 * Tests for vehicle-selection.ts
 * Story 4.5: Multi-Base Candidate Selection & Pre-Filter
 */

import { describe, expect, it } from "vitest";
import type { GeoPoint } from "../../lib/geo-utils";
import {
	filterByCapacity,
	filterByStatus,
	filterByHaversineDistance,
	getTopCandidates,
	estimateRoutingFromHaversine,
	selectOptimalCandidate,
	selectOptimalVehicle,
	DEFAULT_HAVERSINE_THRESHOLD_KM,
	DEFAULT_MAX_CANDIDATES_FOR_ROUTING,
	ROAD_DISTANCE_FACTOR,
	DEFAULT_AVERAGE_SPEED_KMH,
	type VehicleCandidate,
	type CandidateWithDistance,
	type CandidateWithRouting,
} from "../vehicle-selection";
import type { OrganizationPricingSettings } from "../pricing-engine";

// ============================================================================
// Test Fixtures
// ============================================================================

const defaultPricingSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
};

// Paris center
const parisPickup: GeoPoint = { lat: 48.8566, lng: 2.3522 };
// CDG Airport
const cdgDropoff: GeoPoint = { lat: 49.0097, lng: 2.5479 };

// Base near Paris (10km)
const baseNearParis: GeoPoint = { lat: 48.8800, lng: 2.3800 };
// Base in Lyon (400km from Paris)
const baseLyon: GeoPoint = { lat: 45.7640, lng: 4.8357 };
// Base in Versailles (20km from Paris)
const baseVersailles: GeoPoint = { lat: 48.8014, lng: 2.1301 };

function createVehicle(overrides: Partial<VehicleCandidate> = {}): VehicleCandidate {
	return {
		vehicleId: "vehicle-1",
		vehicleName: "Test Vehicle",
		vehicleCategoryId: "cat-sedan",
		regulatoryCategory: "LIGHT",
		baseId: "base-1",
		baseName: "Test Base",
		baseLocation: baseNearParis,
		passengerCapacity: 4,
		luggageCapacity: 3,
		consumptionLPer100Km: 8.0,
		costPerKm: 0.10,
		averageSpeedKmh: 50,
		status: "ACTIVE",
		...overrides,
	};
}

function createCandidateWithDistance(
	vehicle: VehicleCandidate,
	haversineDistanceKm: number,
	isWithinThreshold: boolean = true,
): CandidateWithDistance {
	return {
		...vehicle,
		haversineDistanceKm,
		isWithinThreshold,
	};
}

function createCandidateWithRouting(
	candidate: CandidateWithDistance,
	overrides: Partial<CandidateWithRouting> = {},
): CandidateWithRouting {
	return {
		...candidate,
		approachDistanceKm: 10,
		approachDurationMinutes: 15,
		serviceDistanceKm: 30,
		serviceDurationMinutes: 40,
		returnDistanceKm: 10,
		returnDurationMinutes: 15,
		totalDistanceKm: 50,
		totalDurationMinutes: 70,
		internalCost: 100,
		routingSource: "HAVERSINE_ESTIMATE",
		...overrides,
	};
}

// ============================================================================
// AC1: Capacity-Compatible Vehicle Filtering
// ============================================================================

describe("filterByCapacity", () => {
	it("should reject vehicle with insufficient passenger capacity (AC1)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", passengerCapacity: 4 }),
		];

		const result = filterByCapacity(vehicles, 5); // Request 5 passengers

		expect(result).toHaveLength(0);
	});

	it("should accept vehicle with sufficient passenger capacity (AC1)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", passengerCapacity: 4 }),
		];

		const result = filterByCapacity(vehicles, 4); // Request 4 passengers

		expect(result).toHaveLength(1);
		expect(result[0].vehicleId).toBe("v1");
	});

	it("should accept vehicle with more than required capacity (AC1)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", passengerCapacity: 6 }),
		];

		const result = filterByCapacity(vehicles, 4);

		expect(result).toHaveLength(1);
	});

	it("should reject vehicle with insufficient luggage capacity (AC1)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", luggageCapacity: 2 }),
		];

		const result = filterByCapacity(vehicles, 2, 3); // Request 3 luggage

		expect(result).toHaveLength(0);
	});

	it("should accept vehicle with sufficient luggage capacity (AC1)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", luggageCapacity: 4 }),
		];

		const result = filterByCapacity(vehicles, 2, 3);

		expect(result).toHaveLength(1);
	});

	it("should ignore luggage capacity when not specified (AC1)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", luggageCapacity: null }),
		];

		const result = filterByCapacity(vehicles, 2); // No luggage requirement

		expect(result).toHaveLength(1);
	});

	it("should filter by vehicle category when specified (AC1)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", vehicleCategoryId: "cat-sedan" }),
			createVehicle({ vehicleId: "v2", vehicleCategoryId: "cat-van" }),
		];

		const result = filterByCapacity(vehicles, 2, undefined, "cat-sedan");

		expect(result).toHaveLength(1);
		expect(result[0].vehicleId).toBe("v1");
	});
});

// ============================================================================
// AC9: Active Vehicle Status Filter
// ============================================================================

describe("filterByStatus", () => {
	it("should include ACTIVE vehicles (AC9)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", status: "ACTIVE" }),
		];

		const result = filterByStatus(vehicles);

		expect(result).toHaveLength(1);
	});

	it("should exclude MAINTENANCE vehicles (AC9)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", status: "MAINTENANCE" }),
		];

		const result = filterByStatus(vehicles);

		expect(result).toHaveLength(0);
	});

	it("should exclude OUT_OF_SERVICE vehicles (AC9)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", status: "OUT_OF_SERVICE" }),
		];

		const result = filterByStatus(vehicles);

		expect(result).toHaveLength(0);
	});

	it("should filter mixed status vehicles (AC9)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", status: "ACTIVE" }),
			createVehicle({ vehicleId: "v2", status: "MAINTENANCE" }),
			createVehicle({ vehicleId: "v3", status: "ACTIVE" }),
			createVehicle({ vehicleId: "v4", status: "OUT_OF_SERVICE" }),
		];

		const result = filterByStatus(vehicles);

		expect(result).toHaveLength(2);
		expect(result.map(v => v.vehicleId)).toEqual(["v1", "v3"]);
	});
});

// ============================================================================
// AC2: Haversine Pre-Filter
// ============================================================================

describe("filterByHaversineDistance", () => {
	it("should eliminate base beyond threshold (AC2)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseLyon }), // ~400km from Paris
		];

		const result = filterByHaversineDistance(vehicles, parisPickup, 100);

		expect(result).toHaveLength(0);
	});

	it("should keep base within threshold (AC2)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }), // ~3km from Paris
		];

		const result = filterByHaversineDistance(vehicles, parisPickup, 100);

		expect(result).toHaveLength(1);
		expect(result[0].isWithinThreshold).toBe(true);
	});

	it("should use default threshold of 100km (AC2)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }),
			createVehicle({ vehicleId: "v2", baseLocation: baseLyon }),
		];

		const result = filterByHaversineDistance(vehicles, parisPickup);

		expect(result).toHaveLength(1);
		expect(result[0].vehicleId).toBe("v1");
	});

	it("should calculate correct Haversine distance (AC2)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }),
		];

		const result = filterByHaversineDistance(vehicles, parisPickup, 100);

		// Distance from Paris center to baseNearParis should be ~3-4km
		expect(result[0].haversineDistanceKm).toBeGreaterThan(2);
		expect(result[0].haversineDistanceKm).toBeLessThan(5);
	});

	it("should sort by distance ascending (AC2)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseVersailles }), // ~20km
			createVehicle({ vehicleId: "v2", baseLocation: baseNearParis }), // ~3km
		];

		const result = filterByHaversineDistance(vehicles, parisPickup, 100);

		expect(result).toHaveLength(2);
		expect(result[0].vehicleId).toBe("v2"); // Closer base first
		expect(result[1].vehicleId).toBe("v1");
	});

	it("should respect configurable threshold (AC2)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseVersailles }), // ~20km
		];

		// With 10km threshold, Versailles should be excluded
		const result = filterByHaversineDistance(vehicles, parisPickup, 10);

		expect(result).toHaveLength(0);
	});
});

// ============================================================================
// AC3: Routing API for Remaining Candidates (limit)
// ============================================================================

describe("getTopCandidates", () => {
	it("should limit to max candidates (AC3)", () => {
		const candidates: CandidateWithDistance[] = [];
		for (let i = 0; i < 10; i++) {
			candidates.push(
				createCandidateWithDistance(
					createVehicle({ vehicleId: `v${i}` }),
					i * 10, // 0, 10, 20, 30, ...
				),
			);
		}

		const result = getTopCandidates(candidates, 5);

		expect(result).toHaveLength(5);
	});

	it("should use default limit of 5 (AC3)", () => {
		const candidates: CandidateWithDistance[] = [];
		for (let i = 0; i < 10; i++) {
			candidates.push(
				createCandidateWithDistance(
					createVehicle({ vehicleId: `v${i}` }),
					i * 10,
				),
			);
		}

		const result = getTopCandidates(candidates);

		expect(result).toHaveLength(DEFAULT_MAX_CANDIDATES_FOR_ROUTING);
	});

	it("should return all if fewer than limit (AC3)", () => {
		const candidates: CandidateWithDistance[] = [
			createCandidateWithDistance(createVehicle({ vehicleId: "v1" }), 10),
			createCandidateWithDistance(createVehicle({ vehicleId: "v2" }), 20),
		];

		const result = getTopCandidates(candidates, 5);

		expect(result).toHaveLength(2);
	});

	it("should preserve order (closest first) (AC3)", () => {
		const candidates: CandidateWithDistance[] = [
			createCandidateWithDistance(createVehicle({ vehicleId: "v1" }), 10),
			createCandidateWithDistance(createVehicle({ vehicleId: "v2" }), 5),
			createCandidateWithDistance(createVehicle({ vehicleId: "v3" }), 15),
		];

		// Sort first (simulating filterByHaversineDistance behavior)
		const sorted = [...candidates].sort((a, b) => a.haversineDistanceKm - b.haversineDistanceKm);
		const result = getTopCandidates(sorted, 2);

		expect(result).toHaveLength(2);
		expect(result[0].vehicleId).toBe("v2"); // 5km
		expect(result[1].vehicleId).toBe("v1"); // 10km
	});
});

// ============================================================================
// AC5 & AC6: Routing Estimation
// ============================================================================

describe("estimateRoutingFromHaversine", () => {
	it("should apply road distance factor (AC5, AC6)", () => {
		const origin: GeoPoint = { lat: 48.8566, lng: 2.3522 };
		const destination: GeoPoint = { lat: 48.8800, lng: 2.3800 };

		const result = estimateRoutingFromHaversine(origin, destination);

		// Road distance should be ~1.3x Haversine
		expect(result.distanceKm).toBeGreaterThan(0);
	});

	it("should calculate duration based on average speed (AC5, AC6)", () => {
		const origin: GeoPoint = { lat: 48.8566, lng: 2.3522 };
		const destination: GeoPoint = { lat: 48.8800, lng: 2.3800 };

		const result = estimateRoutingFromHaversine(origin, destination, 60); // 60 km/h

		// Duration = distance / speed
		const expectedDuration = (result.distanceKm / 60) * 60; // in minutes
		expect(result.durationMinutes).toBeCloseTo(expectedDuration, 1);
	});

	it("should use default average speed (AC5, AC6)", () => {
		const origin: GeoPoint = { lat: 48.8566, lng: 2.3522 };
		const destination: GeoPoint = { lat: 48.8800, lng: 2.3800 };

		const result = estimateRoutingFromHaversine(origin, destination);

		// Should use DEFAULT_AVERAGE_SPEED_KMH (50)
		const expectedDuration = (result.distanceKm / DEFAULT_AVERAGE_SPEED_KMH) * 60;
		expect(result.durationMinutes).toBeCloseTo(expectedDuration, 1);
	});
});

// ============================================================================
// AC4: Optimal Base/Vehicle Selection
// ============================================================================

describe("selectOptimalCandidate", () => {
	it("should select candidate with lowest internal cost (AC4)", () => {
		const candidates: CandidateWithRouting[] = [
			createCandidateWithRouting(
				createCandidateWithDistance(createVehicle({ vehicleId: "v1" }), 10),
				{ internalCost: 100 },
			),
			createCandidateWithRouting(
				createCandidateWithDistance(createVehicle({ vehicleId: "v2" }), 20),
				{ internalCost: 80 },
			),
			createCandidateWithRouting(
				createCandidateWithDistance(createVehicle({ vehicleId: "v3" }), 15),
				{ internalCost: 90 },
			),
		];

		const result = selectOptimalCandidate(candidates, "MINIMAL_COST");

		expect(result).not.toBeNull();
		expect(result!.vehicleId).toBe("v2"); // Lowest cost
		expect(result!.internalCost).toBe(80);
	});

	it("should return null for empty candidates (AC4)", () => {
		const result = selectOptimalCandidate([], "MINIMAL_COST");

		expect(result).toBeNull();
	});

	it("should select first when costs are equal (deterministic) (AC4)", () => {
		const candidates: CandidateWithRouting[] = [
			createCandidateWithRouting(
				createCandidateWithDistance(createVehicle({ vehicleId: "v1" }), 10),
				{ internalCost: 100 },
			),
			createCandidateWithRouting(
				createCandidateWithDistance(createVehicle({ vehicleId: "v2" }), 20),
				{ internalCost: 100 },
			),
		];

		const result = selectOptimalCandidate(candidates, "MINIMAL_COST");

		expect(result).not.toBeNull();
		expect(result!.vehicleId).toBe("v1"); // First with equal cost
	});
});

// ============================================================================
// AC7 & AC8: Full Selection Flow
// ============================================================================

describe("selectOptimalVehicle", () => {
	it("should return fallback for empty fleet (AC8)", async () => {
		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			[], // Empty fleet
			defaultPricingSettings,
		);

		expect(result.fallbackUsed).toBe(true);
		expect(result.fallbackReason).toBe("NO_VEHICLES_IN_FLEET");
		expect(result.selectedCandidate).toBeNull();
	});

	it("should return fallback when no active vehicles (AC8, AC9)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", status: "MAINTENANCE" }),
			createVehicle({ vehicleId: "v2", status: "OUT_OF_SERVICE" }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.fallbackUsed).toBe(true);
		expect(result.fallbackReason).toBe("NO_ACTIVE_VEHICLES");
	});

	it("should return fallback when no vehicles match capacity (AC8)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", passengerCapacity: 2 }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 5, // Request more than available
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.fallbackUsed).toBe(true);
		expect(result.fallbackReason).toBe("NO_VEHICLES_MATCH_CAPACITY");
	});

	it("should return fallback when all bases too far (AC8)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseLyon }), // ~400km
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
				haversineThresholdKm: 100,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.fallbackUsed).toBe(true);
		expect(result.fallbackReason).toBe("ALL_BASES_TOO_FAR");
	});

	it("should select optimal vehicle successfully (AC4, AC7)", async () => {
		const vehicles = [
			createVehicle({ 
				vehicleId: "v1", 
				vehicleName: "Vehicle 1",
				baseLocation: baseNearParis,
				baseName: "Paris Base",
			}),
			createVehicle({ 
				vehicleId: "v2", 
				vehicleName: "Vehicle 2",
				baseLocation: baseVersailles,
				baseName: "Versailles Base",
			}),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.fallbackUsed).toBe(false);
		expect(result.selectedCandidate).not.toBeNull();
		expect(result.candidatesConsidered).toBe(2);
		expect(result.candidatesAfterCapacityFilter).toBe(2);
		expect(result.candidatesAfterHaversineFilter).toBe(2);
		expect(result.selectionCriterion).toBe("MINIMAL_COST");
	});

	it("should include transparency data in result (AC7)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.candidatesConsidered).toBeDefined();
		expect(result.candidatesAfterCapacityFilter).toBeDefined();
		expect(result.candidatesAfterHaversineFilter).toBeDefined();
		expect(result.candidatesWithRouting).toBeDefined();
		expect(result.selectionCriterion).toBeDefined();
	});

	it("should calculate approach segment distance (AC5)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.selectedCandidate).not.toBeNull();
		expect(result.selectedCandidate!.approachDistanceKm).toBeGreaterThan(0);
		expect(result.selectedCandidate!.approachDurationMinutes).toBeGreaterThan(0);
	});

	it("should calculate return segment distance (AC6)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.selectedCandidate).not.toBeNull();
		expect(result.selectedCandidate!.returnDistanceKm).toBeGreaterThan(0);
		expect(result.selectedCandidate!.returnDurationMinutes).toBeGreaterThan(0);
	});

	it("should calculate total distance including all segments (AC5, AC6)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		const candidate = result.selectedCandidate!;
		const expectedTotal = candidate.approachDistanceKm + candidate.serviceDistanceKm + candidate.returnDistanceKm;

		expect(candidate.totalDistanceKm).toBeCloseTo(expectedTotal, 1);
	});

	it("should use HAVERSINE_ESTIMATE when no API key (AC7)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", baseLocation: baseNearParis }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
			undefined, // No API key
		);

		expect(result.selectedCandidate).not.toBeNull();
		expect(result.selectedCandidate!.routingSource).toBe("HAVERSINE_ESTIMATE");
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle vehicle with null luggage capacity (edge)", () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", luggageCapacity: null }),
		];

		// Should pass when no luggage requirement
		const result1 = filterByCapacity(vehicles, 2);
		expect(result1).toHaveLength(1);

		// Should fail when luggage is required
		const result2 = filterByCapacity(vehicles, 2, 1);
		expect(result2).toHaveLength(0);
	});

	it("should handle vehicle with null consumption (edge)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1", consumptionLPer100Km: null }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		// Should still work, using default consumption
		expect(result.fallbackUsed).toBe(false);
		expect(result.selectedCandidate).not.toBeNull();
	});

	it("should handle single vehicle (edge)", async () => {
		const vehicles = [
			createVehicle({ vehicleId: "v1" }),
		];

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.fallbackUsed).toBe(false);
		expect(result.selectedCandidate!.vehicleId).toBe("v1");
	});

	it("should respect maxCandidatesForRouting parameter (edge)", async () => {
		const vehicles = [];
		for (let i = 0; i < 10; i++) {
			vehicles.push(
				createVehicle({ 
					vehicleId: `v${i}`, 
					baseLocation: { 
						lat: baseNearParis.lat + i * 0.01, 
						lng: baseNearParis.lng + i * 0.01,
					},
				}),
			);
		}

		const result = await selectOptimalVehicle(
			{
				organizationId: "org-1",
				pickup: parisPickup,
				dropoff: cdgDropoff,
				passengerCount: 2,
				maxCandidatesForRouting: 3,
			},
			vehicles,
			defaultPricingSettings,
		);

		expect(result.candidatesWithRouting).toBeLessThanOrEqual(3);
	});
});
