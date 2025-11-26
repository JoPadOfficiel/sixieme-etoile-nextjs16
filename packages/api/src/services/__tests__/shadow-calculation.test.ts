/**
 * Tests for Shadow Calculation (Story 4.6)
 * Implements shadow calculation for segments A/B/C and tripAnalysis storage
 */

import { describe, expect, it } from "vitest";
import {
	calculateShadowSegments,
	buildShadowInputFromVehicleSelection,
	calculateCostBreakdown,
	DEFAULT_COST_PARAMETERS,
	type ShadowCalculationInput,
	type OrganizationPricingSettings,
	type TripAnalysis,
	type SegmentAnalysis,
	type VehicleSelectionInfo,
} from "../pricing-engine";

// ============================================================================
// Test Fixtures
// ============================================================================

const defaultPricingSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
	fuelConsumptionL100km: 8.0,
	fuelPricePerLiter: 1.80,
	tollCostPerKm: 0.15,
	wearCostPerKm: 0.10,
	driverHourlyCost: 25.0,
};

// Vehicle selection with all segments (from Story 4.5)
const vehicleSelectionWithSegments: ShadowCalculationInput = {
	approachDistanceKm: 10,
	approachDurationMinutes: 15,
	serviceDistanceKm: 30,
	serviceDurationMinutes: 40,
	returnDistanceKm: 12,
	returnDurationMinutes: 18,
	routingSource: "HAVERSINE_ESTIMATE",
	vehicleSelection: {
		selectedVehicle: {
			vehicleId: "vehicle-1",
			vehicleName: "Test Vehicle",
			baseId: "base-1",
			baseName: "Paris Base",
		},
		candidatesConsidered: 5,
		candidatesAfterCapacityFilter: 4,
		candidatesAfterHaversineFilter: 3,
		candidatesWithRouting: 3,
		selectionCriterion: "MINIMAL_COST",
		fallbackUsed: false,
		routingSource: "HAVERSINE_ESTIMATE",
	},
};

// Vehicle selection fallback (no vehicle selected)
const vehicleSelectionFallback: ShadowCalculationInput = {
	vehicleSelection: {
		candidatesConsidered: 5,
		candidatesAfterCapacityFilter: 0,
		candidatesAfterHaversineFilter: 0,
		candidatesWithRouting: 0,
		selectionCriterion: "MINIMAL_COST",
		fallbackUsed: true,
		fallbackReason: "NO_VEHICLES_MATCH_CAPACITY",
	},
};

// ============================================================================
// AC1: Segment Calculation
// ============================================================================

describe("calculateShadowSegments - AC1: Segment Calculation", () => {
	it("should compute all three segments with distances and durations when vehicle is selected", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30, // service distance
			40, // service duration
			defaultPricingSettings,
		);

		// Verify all three segments are present
		expect(result.segments.approach).not.toBeNull();
		expect(result.segments.service).not.toBeNull();
		expect(result.segments.return).not.toBeNull();

		// Verify approach segment
		expect(result.segments.approach!.name).toBe("approach");
		expect(result.segments.approach!.distanceKm).toBe(10);
		expect(result.segments.approach!.durationMinutes).toBe(15);

		// Verify service segment
		expect(result.segments.service.name).toBe("service");
		expect(result.segments.service.distanceKm).toBe(30);
		expect(result.segments.service.durationMinutes).toBe(40);

		// Verify return segment
		expect(result.segments.return!.name).toBe("return");
		expect(result.segments.return!.distanceKm).toBe(12);
		expect(result.segments.return!.durationMinutes).toBe(18);
	});

	it("should compute correct total distance as sum of all segments", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		const expectedTotal = 10 + 30 + 12; // approach + service + return
		expect(result.totalDistanceKm).toBe(expectedTotal);
	});

	it("should compute correct total duration as sum of all segments", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		const expectedTotal = 15 + 40 + 18; // approach + service + return
		expect(result.totalDurationMinutes).toBe(expectedTotal);
	});

	it("should include segment descriptions", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.segments.approach!.description).toContain("Base → Pickup");
		expect(result.segments.service.description).toContain("Pickup → Dropoff");
		expect(result.segments.return!.description).toContain("Dropoff → Base");
	});
});

// ============================================================================
// AC2: Cost Formula Compliance
// ============================================================================

describe("calculateShadowSegments - AC2: Cost Formula Compliance", () => {
	it("should calculate fuel cost per segment using PRD formula", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		// Verify fuel cost for service segment
		// Formula: distanceKm × (consumptionL100km / 100) × fuelPricePerLiter
		const expectedFuelCost = 30 * (8.0 / 100) * 1.80;
		expect(result.segments.service.cost.fuel.amount).toBeCloseTo(expectedFuelCost, 2);
	});

	it("should calculate driver cost per segment using PRD formula", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		// Verify driver cost for service segment
		// Formula: (durationMinutes / 60) × driverHourlyCost
		const expectedDriverCost = (40 / 60) * 25.0;
		expect(result.segments.service.cost.driver.amount).toBeCloseTo(expectedDriverCost, 2);
	});

	it("should calculate toll cost per segment using PRD formula", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		// Verify toll cost for service segment
		// Formula: distanceKm × tollCostPerKm
		const expectedTollCost = 30 * 0.15;
		expect(result.segments.service.cost.tolls.amount).toBeCloseTo(expectedTollCost, 2);
	});

	it("should calculate wear cost per segment using PRD formula", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		// Verify wear cost for service segment
		// Formula: distanceKm × wearCostPerKm
		const expectedWearCost = 30 * 0.10;
		expect(result.segments.service.cost.wear.amount).toBeCloseTo(expectedWearCost, 2);
	});

	it("should compute total internal cost as sum of all segment costs", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		const approachCost = result.segments.approach!.cost.total;
		const serviceCost = result.segments.service.cost.total;
		const returnCost = result.segments.return!.cost.total;

		expect(result.totalInternalCost).toBeCloseTo(approachCost + serviceCost + returnCost, 2);
	});

	it("should include all cost components in each segment", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		const segment = result.segments.service;

		// Verify all cost components are present
		expect(segment.cost.fuel).toBeDefined();
		expect(segment.cost.tolls).toBeDefined();
		expect(segment.cost.wear).toBeDefined();
		expect(segment.cost.driver).toBeDefined();
		expect(segment.cost.parking).toBeDefined();
		expect(segment.cost.total).toBeDefined();

		// Verify total is sum of components
		const expectedTotal = 
			segment.cost.fuel.amount +
			segment.cost.tolls.amount +
			segment.cost.wear.amount +
			segment.cost.driver.amount +
			segment.cost.parking.amount;

		expect(segment.cost.total).toBeCloseTo(expectedTotal, 2);
	});
});

// ============================================================================
// AC3: tripAnalysis Storage (JSON-serializable)
// ============================================================================

describe("calculateShadowSegments - AC3: tripAnalysis Storage", () => {
	it("should return JSON-serializable TripAnalysis", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		// Verify it can be serialized and deserialized
		const json = JSON.stringify(result);
		const parsed = JSON.parse(json) as TripAnalysis;

		expect(parsed.segments.approach).not.toBeNull();
		expect(parsed.segments.service).not.toBeNull();
		expect(parsed.segments.return).not.toBeNull();
		expect(parsed.totalDistanceKm).toBe(result.totalDistanceKm);
		expect(parsed.totalInternalCost).toBe(result.totalInternalCost);
	});

	it("should include calculatedAt timestamp", () => {
		const before = new Date().toISOString();
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);
		const after = new Date().toISOString();

		expect(result.calculatedAt).toBeDefined();
		expect(result.calculatedAt >= before).toBe(true);
		expect(result.calculatedAt <= after).toBe(true);
	});

	it("should include routingSource metadata", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		// When vehicle selection is present, routingSource is VEHICLE_SELECTION
		// unless the input explicitly specifies GOOGLE_API
		expect(result.routingSource).toBe("VEHICLE_SELECTION");
	});

	it("should include vehicle selection info when available", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.vehicleSelection).toBeDefined();
		expect(result.vehicleSelection!.selectedVehicle).toBeDefined();
		expect(result.vehicleSelection!.selectedVehicle!.vehicleId).toBe("vehicle-1");
	});

	it("should include combined cost breakdown", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.costBreakdown).toBeDefined();
		expect(result.costBreakdown.fuel).toBeDefined();
		expect(result.costBreakdown.tolls).toBeDefined();
		expect(result.costBreakdown.wear).toBeDefined();
		expect(result.costBreakdown.driver).toBeDefined();
		expect(result.costBreakdown.total).toBeGreaterThan(0);
	});
});

// ============================================================================
// AC5: Both Pricing Modes (FIXED_GRID and DYNAMIC)
// ============================================================================

describe("calculateShadowSegments - AC5: Both Pricing Modes", () => {
	it("should work for DYNAMIC pricing mode (service segment only)", () => {
		// Simulate dynamic pricing without vehicle selection
		const result = calculateShadowSegments(
			null, // No vehicle selection
			30,
			40,
			defaultPricingSettings,
		);

		// Should have service segment only
		expect(result.segments.approach).toBeNull();
		expect(result.segments.service).not.toBeNull();
		expect(result.segments.return).toBeNull();

		// Service segment should have correct values
		expect(result.segments.service.distanceKm).toBe(30);
		expect(result.segments.service.durationMinutes).toBe(40);
	});

	it("should work for FIXED_GRID pricing mode with vehicle selection", () => {
		// Simulate grid pricing with vehicle selection
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			30,
			40,
			defaultPricingSettings,
		);

		// Should have all three segments
		expect(result.segments.approach).not.toBeNull();
		expect(result.segments.service).not.toBeNull();
		expect(result.segments.return).not.toBeNull();
	});
});

// ============================================================================
// AC6: Vehicle Selection Integration
// ============================================================================

describe("calculateShadowSegments - AC6: Vehicle Selection Integration", () => {
	it("should reuse segment data from vehicle selection when available", () => {
		const result = calculateShadowSegments(
			vehicleSelectionWithSegments,
			999, // This should be overridden by vehicleSelectionWithSegments.serviceDistanceKm
			999, // This should be overridden by vehicleSelectionWithSegments.serviceDurationMinutes
			defaultPricingSettings,
		);

		// Should use values from vehicle selection, not the fallback values
		expect(result.segments.service.distanceKm).toBe(30); // From vehicleSelectionWithSegments
		expect(result.segments.service.durationMinutes).toBe(40); // From vehicleSelectionWithSegments
	});

	it("should use routingSource from vehicle selection", () => {
		const inputWithGoogleApi: ShadowCalculationInput = {
			...vehicleSelectionWithSegments,
			routingSource: "GOOGLE_API",
		};

		const result = calculateShadowSegments(
			inputWithGoogleApi,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.routingSource).toBe("GOOGLE_API");
	});

	it("should mark segments as estimated when no vehicle selection (pure Haversine)", () => {
		// When there's no vehicle selection, routingSource defaults to HAVERSINE_ESTIMATE
		// and segments are marked as estimated
		const result = calculateShadowSegments(
			null, // No vehicle selection
			30,
			40,
			defaultPricingSettings,
		);

		// isEstimated is true when routingSource is HAVERSINE_ESTIMATE
		expect(result.routingSource).toBe("HAVERSINE_ESTIMATE");
		expect(result.segments.service.isEstimated).toBe(true);
	});

	it("should mark segments as not estimated when using Google API", () => {
		const inputWithGoogleApi: ShadowCalculationInput = {
			...vehicleSelectionWithSegments,
			routingSource: "GOOGLE_API",
		};

		const result = calculateShadowSegments(
			inputWithGoogleApi,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.segments.service.isEstimated).toBe(false);
	});
});

// ============================================================================
// AC7: Fallback Without Vehicle
// ============================================================================

describe("calculateShadowSegments - AC7: Fallback Without Vehicle", () => {
	it("should produce service segment only when no vehicle selected", () => {
		const result = calculateShadowSegments(
			vehicleSelectionFallback,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.segments.approach).toBeNull();
		expect(result.segments.service).not.toBeNull();
		expect(result.segments.return).toBeNull();
	});

	it("should use provided distance/duration for service segment in fallback", () => {
		const result = calculateShadowSegments(
			vehicleSelectionFallback,
			25,
			35,
			defaultPricingSettings,
		);

		expect(result.segments.service.distanceKm).toBe(25);
		expect(result.segments.service.durationMinutes).toBe(35);
	});

	it("should compute correct totals for service-only scenario", () => {
		const result = calculateShadowSegments(
			vehicleSelectionFallback,
			30,
			40,
			defaultPricingSettings,
		);

		// Totals should equal service segment only
		expect(result.totalDistanceKm).toBe(30);
		expect(result.totalDurationMinutes).toBe(40);
		expect(result.totalInternalCost).toBe(result.segments.service.cost.total);
	});

	it("should include fallback reason in vehicle selection info", () => {
		const result = calculateShadowSegments(
			vehicleSelectionFallback,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.vehicleSelection).toBeDefined();
		expect(result.vehicleSelection!.fallbackUsed).toBe(true);
		expect(result.vehicleSelection!.fallbackReason).toBe("NO_VEHICLES_MATCH_CAPACITY");
	});

	it("should work with null input (no vehicle selection at all)", () => {
		const result = calculateShadowSegments(
			null,
			30,
			40,
			defaultPricingSettings,
		);

		expect(result.segments.approach).toBeNull();
		expect(result.segments.service).not.toBeNull();
		expect(result.segments.return).toBeNull();
		expect(result.vehicleSelection).toBeUndefined();
	});
});

// ============================================================================
// buildShadowInputFromVehicleSelection
// ============================================================================

describe("buildShadowInputFromVehicleSelection", () => {
	it("should return null for null input", () => {
		const result = buildShadowInputFromVehicleSelection(null);
		expect(result).toBeNull();
	});

	it("should build input from vehicle selection with candidate", () => {
		const vehicleResult = {
			selectedCandidate: {
				approachDistanceKm: 10,
				approachDurationMinutes: 15,
				serviceDistanceKm: 30,
				serviceDurationMinutes: 40,
				returnDistanceKm: 12,
				returnDurationMinutes: 18,
				routingSource: "GOOGLE_API" as const,
				vehicleId: "v1",
				vehicleName: "Vehicle 1",
				baseId: "b1",
				baseName: "Base 1",
			},
			candidatesConsidered: 5,
			candidatesAfterCapacityFilter: 4,
			candidatesAfterHaversineFilter: 3,
			candidatesWithRouting: 3,
			selectionCriterion: "MINIMAL_COST" as const,
			fallbackUsed: false,
		};

		const result = buildShadowInputFromVehicleSelection(vehicleResult);

		expect(result).not.toBeNull();
		expect(result!.approachDistanceKm).toBe(10);
		expect(result!.serviceDistanceKm).toBe(30);
		expect(result!.returnDistanceKm).toBe(12);
		expect(result!.routingSource).toBe("GOOGLE_API");
		expect(result!.vehicleSelection!.selectedVehicle!.vehicleId).toBe("v1");
	});

	it("should build input for fallback case (no candidate)", () => {
		const vehicleResult = {
			selectedCandidate: null,
			candidatesConsidered: 5,
			candidatesAfterCapacityFilter: 0,
			candidatesAfterHaversineFilter: 0,
			candidatesWithRouting: 0,
			selectionCriterion: "MINIMAL_COST" as const,
			fallbackUsed: true,
			fallbackReason: "NO_VEHICLES_MATCH_CAPACITY",
		};

		const result = buildShadowInputFromVehicleSelection(vehicleResult);

		expect(result).not.toBeNull();
		expect(result!.approachDistanceKm).toBeUndefined();
		expect(result!.vehicleSelection!.fallbackUsed).toBe(true);
		expect(result!.vehicleSelection!.fallbackReason).toBe("NO_VEHICLES_MATCH_CAPACITY");
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("calculateShadowSegments - Edge Cases", () => {
	it("should handle zero distance/duration", () => {
		const result = calculateShadowSegments(
			null,
			0,
			0,
			defaultPricingSettings,
		);

		expect(result.segments.service.distanceKm).toBe(0);
		expect(result.segments.service.durationMinutes).toBe(0);
		expect(result.segments.service.cost.total).toBe(0);
		expect(result.totalInternalCost).toBe(0);
	});

	it("should handle very large distances", () => {
		const result = calculateShadowSegments(
			null,
			1000, // 1000 km
			600, // 10 hours
			defaultPricingSettings,
		);

		expect(result.segments.service.distanceKm).toBe(1000);
		expect(result.segments.service.cost.total).toBeGreaterThan(0);
	});

	it("should use default cost parameters when settings are missing", () => {
		const minimalSettings: OrganizationPricingSettings = {
			baseRatePerKm: 2.5,
			baseRatePerHour: 45.0,
			targetMarginPercent: 20.0,
			// No cost parameters - should use defaults
		};

		const result = calculateShadowSegments(
			null,
			30,
			40,
			minimalSettings,
		);

		// Should still calculate costs using defaults
		expect(result.segments.service.cost.total).toBeGreaterThan(0);
		expect(result.segments.service.cost.fuel.consumptionL100km).toBe(DEFAULT_COST_PARAMETERS.fuelConsumptionL100km);
	});

	it("should round values to 2 decimal places", () => {
		const result = calculateShadowSegments(
			null,
			33.333,
			44.444,
			defaultPricingSettings,
		);

		// Check rounding
		expect(result.segments.service.distanceKm).toBe(33.33);
		expect(result.segments.service.durationMinutes).toBe(44.44);
	});
});
