/**
 * Story 16.7: Excursion Multi-Stop Pricing Tests
 *
 * Tests for:
 * - calculateExcursionLegs() - Calculate legs from waypoints
 * - buildExcursionTripAnalysis() - Build TripAnalysis for excursions
 * - calculateExcursionRoute() - Route calculation with waypoints
 */

import { describe, it, expect } from "vitest";
import {
	calculateExcursionLegs,
	buildExcursionTripAnalysis,
	type ExcursionCalculationInput,
	type OrganizationPricingSettings,
} from "../pricing-engine";

// ============================================================================
// Test Data
// ============================================================================

const mockSettings: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45,
	targetMarginPercent: 25,
	fuelConsumptionL100km: 7.5,
	fuelPricePerLiter: 1.80,
	tollCostPerKm: 0.12,
	wearCostPerKm: 0.08,
	driverHourlyCost: 30,
	excursionMinimumHours: 4,
	excursionSurchargePercent: 15,
};

const parisCoords = { lat: 48.8566, lng: 2.3522 };
const versaillesCoords = { lat: 48.8049, lng: 2.1204 };
const givernyCoords = { lat: 49.0754, lng: 1.5335 };
const chartresCoords = { lat: 48.4469, lng: 1.4890 };

// ============================================================================
// calculateExcursionLegs Tests
// ============================================================================

describe("calculateExcursionLegs", () => {
	it("should calculate legs for a 2-stop excursion (Paris → Versailles → Paris)", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...parisCoords, address: "Paris" },
			stops: [
				{ address: "Versailles", latitude: versaillesCoords.lat, longitude: versaillesCoords.lng, order: 1 },
			],
		};

		// Mock distances: Paris→Versailles = 22km, Versailles→Paris = 22km
		const legDistances = [22, 22];
		const legDurations = [35, 35]; // 35 minutes each

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);

		expect(legs).toHaveLength(2);
		
		// First leg: Paris → Versailles
		expect(legs[0].order).toBe(1);
		expect(legs[0].fromAddress).toBe("Paris");
		expect(legs[0].toAddress).toBe("Versailles");
		expect(legs[0].distanceKm).toBe(22);
		expect(legs[0].durationMinutes).toBe(35);
		expect(legs[0].cost.total).toBeGreaterThan(0);

		// Second leg: Versailles → Paris
		expect(legs[1].order).toBe(2);
		expect(legs[1].fromAddress).toBe("Versailles");
		expect(legs[1].toAddress).toBe("Paris");
		expect(legs[1].distanceKm).toBe(22);
	});

	it("should calculate legs for a 3-stop excursion (Paris → Versailles → Giverny → Paris)", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...parisCoords, address: "Paris" },
			stops: [
				{ address: "Versailles", latitude: versaillesCoords.lat, longitude: versaillesCoords.lng, order: 1 },
				{ address: "Giverny", latitude: givernyCoords.lat, longitude: givernyCoords.lng, order: 2 },
			],
		};

		// Mock distances
		const legDistances = [22, 65, 75]; // Paris→Versailles, Versailles→Giverny, Giverny→Paris
		const legDurations = [35, 55, 70];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);

		expect(legs).toHaveLength(3);
		
		expect(legs[0].fromAddress).toBe("Paris");
		expect(legs[0].toAddress).toBe("Versailles");
		
		expect(legs[1].fromAddress).toBe("Versailles");
		expect(legs[1].toAddress).toBe("Giverny");
		
		expect(legs[2].fromAddress).toBe("Giverny");
		expect(legs[2].toAddress).toBe("Paris");
	});

	it("should calculate correct costs for each leg", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...versaillesCoords, address: "Versailles" },
			stops: [],
		};

		const legDistances = [22];
		const legDurations = [35];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);

		expect(legs).toHaveLength(1);
		
		const leg = legs[0];
		
		// Verify cost components
		// Fuel: 22km * (7.5/100) * 1.80 = 2.97
		expect(leg.cost.fuel).toBeCloseTo(2.97, 1);
		
		// Tolls: 22km * 0.12 = 2.64
		expect(leg.cost.tolls).toBeCloseTo(2.64, 1);
		
		// Wear: 22km * 0.08 = 1.76
		expect(leg.cost.wear).toBeCloseTo(1.76, 1);
		
		// Driver: 35min / 60 * 30 = 17.50
		expect(leg.cost.driver).toBeCloseTo(17.50, 1);
		
		// Total should be sum of all components
		const expectedTotal = leg.cost.fuel + leg.cost.tolls + leg.cost.wear + leg.cost.driver;
		expect(leg.cost.total).toBeCloseTo(expectedTotal, 2);
	});

	it("should sort stops by order", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...parisCoords, address: "Paris" },
			stops: [
				{ address: "Giverny", latitude: givernyCoords.lat, longitude: givernyCoords.lng, order: 2 },
				{ address: "Versailles", latitude: versaillesCoords.lat, longitude: versaillesCoords.lng, order: 1 },
			],
		};

		const legDistances = [22, 65, 75];
		const legDurations = [35, 55, 70];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);

		// Should be sorted: Paris → Versailles → Giverny → Paris
		expect(legs[0].toAddress).toBe("Versailles");
		expect(legs[1].toAddress).toBe("Giverny");
		expect(legs[2].toAddress).toBe("Paris");
	});
});

// ============================================================================
// buildExcursionTripAnalysis Tests
// ============================================================================

describe("buildExcursionTripAnalysis", () => {
	it("should build TripAnalysis with correct totals", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...parisCoords, address: "Paris" },
			stops: [
				{ address: "Versailles", latitude: versaillesCoords.lat, longitude: versaillesCoords.lng, order: 1 },
			],
		};

		const legDistances = [22, 22];
		const legDurations = [35, 35];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);
		const tripAnalysis = buildExcursionTripAnalysis(legs, mockSettings);

		// Verify totals
		expect(tripAnalysis.totalDistanceKm).toBe(44); // 22 + 22
		expect(tripAnalysis.totalDurationMinutes).toBe(70); // 35 + 35
		expect(tripAnalysis.totalInternalCost).toBeGreaterThan(0);
		
		// Verify excursion legs are included
		expect(tripAnalysis.excursionLegs).toHaveLength(2);
		
		// Verify totalStops (intermediate stops, not including pickup/dropoff)
		expect(tripAnalysis.totalStops).toBe(1);
		
		// Verify routing source
		expect(tripAnalysis.routingSource).toBe("GOOGLE_API");
	});

	it("should detect multi-day excursions", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...parisCoords, address: "Paris" },
			stops: [],
		};

		const legDistances = [100];
		const legDurations = [120];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);
		
		// Same day
		const sameDayAnalysis = buildExcursionTripAnalysis(
			legs,
			mockSettings,
			"2025-12-20T18:00:00Z",
			"2025-12-20T08:00:00Z",
		);
		expect(sameDayAnalysis.isMultiDay).toBe(false);

		// Different days
		const multiDayAnalysis = buildExcursionTripAnalysis(
			legs,
			mockSettings,
			"2025-12-21T18:00:00Z",
			"2025-12-20T08:00:00Z",
		);
		expect(multiDayAnalysis.isMultiDay).toBe(true);
	});

	it("should have correct cost breakdown structure", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...versaillesCoords, address: "Versailles" },
			stops: [],
		};

		const legDistances = [22];
		const legDurations = [35];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);
		const tripAnalysis = buildExcursionTripAnalysis(legs, mockSettings);

		// Verify cost breakdown structure
		expect(tripAnalysis.costBreakdown).toBeDefined();
		expect(tripAnalysis.costBreakdown.fuel).toBeDefined();
		expect(tripAnalysis.costBreakdown.tolls).toBeDefined();
		expect(tripAnalysis.costBreakdown.wear).toBeDefined();
		expect(tripAnalysis.costBreakdown.driver).toBeDefined();
		expect(tripAnalysis.costBreakdown.parking).toBeDefined();
		expect(tripAnalysis.costBreakdown.total).toBeGreaterThan(0);
	});

	it("should create compatible service segment for backward compatibility", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...versaillesCoords, address: "Versailles" },
			stops: [],
		};

		const legDistances = [22];
		const legDurations = [35];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);
		const tripAnalysis = buildExcursionTripAnalysis(legs, mockSettings);

		// Verify segments structure for backward compatibility
		expect(tripAnalysis.segments).toBeDefined();
		expect(tripAnalysis.segments.approach).toBeNull();
		expect(tripAnalysis.segments.service).toBeDefined();
		expect(tripAnalysis.segments.return).toBeNull();
		
		// Service segment should contain total excursion data
		expect(tripAnalysis.segments.service.distanceKm).toBe(22);
		expect(tripAnalysis.segments.service.durationMinutes).toBe(35);
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle excursion with no intermediate stops", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...versaillesCoords, address: "Versailles" },
			stops: [],
		};

		const legDistances = [22];
		const legDurations = [35];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);

		expect(legs).toHaveLength(1);
		expect(legs[0].fromAddress).toBe("Paris");
		expect(legs[0].toAddress).toBe("Versailles");
	});

	it("should handle 4-stop excursion (max common case)", () => {
		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...parisCoords, address: "Paris" },
			stops: [
				{ address: "Versailles", latitude: versaillesCoords.lat, longitude: versaillesCoords.lng, order: 1 },
				{ address: "Chartres", latitude: chartresCoords.lat, longitude: chartresCoords.lng, order: 2 },
				{ address: "Giverny", latitude: givernyCoords.lat, longitude: givernyCoords.lng, order: 3 },
			],
		};

		const legDistances = [22, 75, 80, 75];
		const legDurations = [35, 60, 65, 70];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, mockSettings);

		expect(legs).toHaveLength(4);
		
		const tripAnalysis = buildExcursionTripAnalysis(legs, mockSettings);
		expect(tripAnalysis.totalDistanceKm).toBe(252); // 22 + 75 + 80 + 75
		expect(tripAnalysis.totalStops).toBe(3);
	});

	it("should use default values when settings are missing", () => {
		const minimalSettings: OrganizationPricingSettings = {
			baseRatePerKm: 2.5,
			baseRatePerHour: 45,
			targetMarginPercent: 25,
		};

		const input: ExcursionCalculationInput = {
			pickup: { ...parisCoords, address: "Paris" },
			dropoff: { ...versaillesCoords, address: "Versailles" },
			stops: [],
		};

		const legDistances = [22];
		const legDurations = [35];

		const legs = calculateExcursionLegs(input, legDistances, legDurations, minimalSettings);

		// Should not throw, should use defaults
		expect(legs).toHaveLength(1);
		expect(legs[0].cost.total).toBeGreaterThan(0);
	});
});
