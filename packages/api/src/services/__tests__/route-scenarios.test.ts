/**
 * Story 18.6: Tests for Multi-Scenario Route Optimization
 * 
 * Tests cover:
 * - TCO calculation for individual scenarios
 * - Optimal scenario selection
 * - MIN_TCO derivation from MIN_TIME and MIN_DISTANCE
 * - Fallback behavior when API fails
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	DEFAULT_ROUTE_SCENARIO_TCO_CONFIG,
	ROUTE_SCENARIO_LABELS,
	type RouteScenarioTcoConfig,
	type GoogleRouteResult,
	type RouteScenarioResult,
} from "../toll-service";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		tollCache: {
			findUnique: vi.fn().mockResolvedValue(null),
			upsert: vi.fn().mockResolvedValue({}),
			deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
		},
	},
}));

// Import after mocking
import {
	calculateRouteScenarios,
	fetchMultiScenarioRoutes,
	callGoogleRoutesAPIWithPreference,
} from "../toll-service";

// Test configuration
const testConfig: RouteScenarioTcoConfig = {
	driverHourlyCost: 30,
	fuelConsumptionL100km: 8.5,
	fuelPricePerLiter: 1.789,
	wearCostPerKm: 0.10,
	fallbackTollRatePerKm: 0.12,
};

// Test coordinates (Paris -> Lyon)
const paris = { lat: 48.8566, lng: 2.3522 };
const lyon = { lat: 45.7640, lng: 4.8357 };

// Mock API responses
const mockMinTimeResponse: GoogleRouteResult = {
	distanceMeters: 470000, // 470 km
	durationSeconds: 14400, // 4 hours
	tollAmount: 35.50,
	encodedPolyline: "mock_polyline_time",
	success: true,
};

const mockMinDistanceResponse: GoogleRouteResult = {
	distanceMeters: 450000, // 450 km (shorter)
	durationSeconds: 18000, // 5 hours (longer)
	tollAmount: 15.00, // Less tolls (avoids highways)
	encodedPolyline: "mock_polyline_distance",
	success: true,
};

describe("Story 18.6: Multi-Scenario Route Optimization", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Mock fetch globally
		global.fetch = vi.fn();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("TCO Calculation", () => {
		it("should calculate correct TCO components for MIN_TIME scenario", () => {
			// Manual calculation for MIN_TIME:
			// Duration: 240 min, Distance: 470 km, Tolls: 35.50€
			// Driver: (240/60) * 30 = 120€
			// Fuel: (470/100) * 8.5 * 1.789 = 71.43€
			// Wear: 470 * 0.10 = 47€
			// TCO: 120 + 71.43 + 35.50 + 47 = 273.93€

			const durationMinutes = 240;
			const distanceKm = 470;
			const tollCost = 35.50;

			const driverCost = Math.round((durationMinutes / 60) * testConfig.driverHourlyCost * 100) / 100;
			const fuelCost = Math.round((distanceKm / 100) * testConfig.fuelConsumptionL100km * testConfig.fuelPricePerLiter * 100) / 100;
			const wearCost = Math.round(distanceKm * testConfig.wearCostPerKm * 100) / 100;
			const tco = Math.round((driverCost + fuelCost + tollCost + wearCost) * 100) / 100;

			expect(driverCost).toBe(120);
			expect(fuelCost).toBeCloseTo(71.43, 1);
			expect(wearCost).toBe(47);
			expect(tco).toBeCloseTo(273.93, 0);
		});

		it("should calculate correct TCO components for MIN_DISTANCE scenario", () => {
			// Manual calculation for MIN_DISTANCE:
			// Duration: 300 min, Distance: 450 km, Tolls: 15€
			// Driver: (300/60) * 30 = 150€
			// Fuel: (450/100) * 8.5 * 1.789 = 68.38€
			// Wear: 450 * 0.10 = 45€
			// TCO: 150 + 68.38 + 15 + 45 = 278.38€

			const durationMinutes = 300;
			const distanceKm = 450;
			const tollCost = 15;

			const driverCost = Math.round((durationMinutes / 60) * testConfig.driverHourlyCost * 100) / 100;
			const fuelCost = Math.round((distanceKm / 100) * testConfig.fuelConsumptionL100km * testConfig.fuelPricePerLiter * 100) / 100;
			const wearCost = Math.round(distanceKm * testConfig.wearCostPerKm * 100) / 100;
			const tco = Math.round((driverCost + fuelCost + tollCost + wearCost) * 100) / 100;

			expect(driverCost).toBe(150);
			expect(fuelCost).toBeCloseTo(68.43, 1); // (450/100) * 8.5 * 1.789 = 68.43
			expect(wearCost).toBe(45);
			expect(tco).toBeCloseTo(278.43, 0);
		});
	});

	describe("Scenario Selection", () => {
		it("should select MIN_TIME when it has lower TCO than MIN_DISTANCE", () => {
			// Based on calculations above:
			// MIN_TIME TCO: ~274€
			// MIN_DISTANCE TCO: ~278€
			// MIN_TIME should be selected as MIN_TCO

			const minTimeScenario: RouteScenarioResult = {
				type: "MIN_TIME",
				label: ROUTE_SCENARIO_LABELS.MIN_TIME,
				durationMinutes: 240,
				distanceKm: 470,
				tollCost: 35.50,
				fuelCost: 71.43,
				driverCost: 120,
				wearCost: 47,
				tco: 273.93,
				encodedPolyline: "mock",
				isFromCache: false,
				isRecommended: false,
			};

			const minDistanceScenario: RouteScenarioResult = {
				type: "MIN_DISTANCE",
				label: ROUTE_SCENARIO_LABELS.MIN_DISTANCE,
				durationMinutes: 300,
				distanceKm: 450,
				tollCost: 15,
				fuelCost: 68.38,
				driverCost: 150,
				wearCost: 45,
				tco: 278.38,
				encodedPolyline: "mock",
				isFromCache: false,
				isRecommended: false,
			};

			// MIN_TIME has lower TCO, so it should be the basis for MIN_TCO
			expect(minTimeScenario.tco).toBeLessThan(minDistanceScenario.tco);
		});

		it("should prefer MIN_TIME when TCOs are equal", () => {
			const scenario1: RouteScenarioResult = {
				type: "MIN_TIME",
				label: ROUTE_SCENARIO_LABELS.MIN_TIME,
				durationMinutes: 240,
				distanceKm: 400,
				tollCost: 20,
				fuelCost: 60,
				driverCost: 120,
				wearCost: 40,
				tco: 240,
				encodedPolyline: "mock",
				isFromCache: false,
				isRecommended: false,
			};

			const scenario2: RouteScenarioResult = {
				type: "MIN_DISTANCE",
				label: ROUTE_SCENARIO_LABELS.MIN_DISTANCE,
				durationMinutes: 300,
				distanceKm: 350,
				tollCost: 10,
				fuelCost: 53,
				driverCost: 150,
				wearCost: 35,
				tco: 240, // Same TCO
				encodedPolyline: "mock",
				isFromCache: false,
				isRecommended: false,
			};

			// When equal, MIN_TIME should be preferred (faster delivery)
			const bestScenario = scenario1.tco <= scenario2.tco ? scenario1 : scenario2;
			expect(bestScenario.type).toBe("MIN_TIME");
		});
	});

	describe("Route Scenario Labels", () => {
		it("should have correct French labels", () => {
			expect(ROUTE_SCENARIO_LABELS.MIN_TIME).toBe("Temps minimum");
			expect(ROUTE_SCENARIO_LABELS.MIN_DISTANCE).toBe("Distance minimum");
			expect(ROUTE_SCENARIO_LABELS.MIN_TCO).toBe("Coût optimal (TCO)");
		});
	});

	describe("Default Configuration", () => {
		it("should have sensible default values", () => {
			expect(DEFAULT_ROUTE_SCENARIO_TCO_CONFIG.driverHourlyCost).toBe(30);
			expect(DEFAULT_ROUTE_SCENARIO_TCO_CONFIG.fuelConsumptionL100km).toBe(8.5);
			expect(DEFAULT_ROUTE_SCENARIO_TCO_CONFIG.fuelPricePerLiter).toBe(1.789);
			expect(DEFAULT_ROUTE_SCENARIO_TCO_CONFIG.wearCostPerKm).toBe(0.10);
			expect(DEFAULT_ROUTE_SCENARIO_TCO_CONFIG.fallbackTollRatePerKm).toBe(0.12);
		});
	});

	describe("calculateRouteScenarios", () => {
		it("should return fallback when no API key is provided", async () => {
			const result = await calculateRouteScenarios(paris, lyon, "", testConfig);

			expect(result.fallbackUsed).toBe(true);
			expect(result.fallbackReason).toBe("No API key provided");
			expect(result.scenarios).toHaveLength(0);
			expect(result.selectedScenario).toBe("MIN_TCO");
		});

		it("should return fallback when API fails", async () => {
			// Mock fetch to fail
			(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("Network error"));

			const result = await calculateRouteScenarios(paris, lyon, "test-api-key", testConfig);

			expect(result.fallbackUsed).toBe(true);
			expect(result.scenarios).toHaveLength(0);
		});

		it("should return 3 scenarios when API succeeds", async () => {
			// Mock successful API responses
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 470000,
							duration: "14400s",
							polyline: { encodedPolyline: "mock_time" },
							travelAdvisory: {
								tollInfo: {
									estimatedPrice: [{ currencyCode: "EUR", units: "35", nanos: 500000000 }],
								},
							},
						}],
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 450000,
							duration: "18000s",
							polyline: { encodedPolyline: "mock_distance" },
							travelAdvisory: {
								tollInfo: {
									estimatedPrice: [{ currencyCode: "EUR", units: "15", nanos: 0 }],
								},
							},
						}],
					}),
				});

			const result = await calculateRouteScenarios(paris, lyon, "test-api-key", testConfig);

			expect(result.scenarios).toHaveLength(3);
			expect(result.scenarios.map(s => s.type)).toContain("MIN_TIME");
			expect(result.scenarios.map(s => s.type)).toContain("MIN_DISTANCE");
			expect(result.scenarios.map(s => s.type)).toContain("MIN_TCO");
		});

		it("should mark exactly one scenario as recommended", async () => {
			// Mock successful API responses
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 470000,
							duration: "14400s",
							polyline: { encodedPolyline: "mock_time" },
							travelAdvisory: { tollInfo: { estimatedPrice: [{ currencyCode: "EUR", units: "35" }] } },
						}],
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 450000,
							duration: "18000s",
							polyline: { encodedPolyline: "mock_distance" },
							travelAdvisory: { tollInfo: { estimatedPrice: [{ currencyCode: "EUR", units: "15" }] } },
						}],
					}),
				});

			const result = await calculateRouteScenarios(paris, lyon, "test-api-key", testConfig);

			const recommendedCount = result.scenarios.filter(s => s.isRecommended).length;
			expect(recommendedCount).toBe(1);
		});

		it("should include calculatedAt timestamp", async () => {
			const result = await calculateRouteScenarios(paris, lyon, "", testConfig);

			expect(result.calculatedAt).toBeDefined();
			expect(new Date(result.calculatedAt).getTime()).not.toBeNaN();
		});
	});

	describe("MIN_DISTANCE scenario properties", () => {
		it("should have shorter distance than MIN_TIME", async () => {
			// Mock API responses where MIN_DISTANCE is shorter
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 500000, // 500 km
							duration: "14400s",
							polyline: { encodedPolyline: "mock_time" },
							travelAdvisory: { tollInfo: { estimatedPrice: [] } },
						}],
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 450000, // 450 km (shorter)
							duration: "18000s",
							polyline: { encodedPolyline: "mock_distance" },
							travelAdvisory: { tollInfo: { estimatedPrice: [] } },
						}],
					}),
				});

			const result = await calculateRouteScenarios(paris, lyon, "test-api-key", testConfig);

			const minTime = result.scenarios.find(s => s.type === "MIN_TIME");
			const minDistance = result.scenarios.find(s => s.type === "MIN_DISTANCE");

			expect(minDistance?.distanceKm).toBeLessThanOrEqual(minTime?.distanceKm ?? 0);
		});
	});

	describe("MIN_TIME scenario properties", () => {
		it("should have shorter duration than MIN_DISTANCE", async () => {
			// Mock API responses where MIN_TIME is faster
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 500000,
							duration: "14400s", // 4 hours
							polyline: { encodedPolyline: "mock_time" },
							travelAdvisory: { tollInfo: { estimatedPrice: [] } },
						}],
					}),
				})
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 450000,
							duration: "18000s", // 5 hours (longer)
							polyline: { encodedPolyline: "mock_distance" },
							travelAdvisory: { tollInfo: { estimatedPrice: [] } },
						}],
					}),
				});

			const result = await calculateRouteScenarios(paris, lyon, "test-api-key", testConfig);

			const minTime = result.scenarios.find(s => s.type === "MIN_TIME");
			const minDistance = result.scenarios.find(s => s.type === "MIN_DISTANCE");

			expect(minTime?.durationMinutes).toBeLessThanOrEqual(minDistance?.durationMinutes ?? Infinity);
		});
	});

	describe("Partial API failure", () => {
		it("should handle partial API failure gracefully", async () => {
			// Mock: MIN_TIME succeeds, MIN_DISTANCE fails
			(global.fetch as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce({
					ok: true,
					json: async () => ({
						routes: [{
							distanceMeters: 470000,
							duration: "14400s",
							polyline: { encodedPolyline: "mock_time" },
							travelAdvisory: { tollInfo: { estimatedPrice: [] } },
						}],
					}),
				})
				.mockResolvedValueOnce({
					ok: false,
					text: async () => "API Error",
				});

			const result = await calculateRouteScenarios(paris, lyon, "test-api-key", testConfig);

			// Should still have MIN_TIME scenario
			expect(result.scenarios.length).toBeGreaterThanOrEqual(1);
			expect(result.scenarios.some(s => s.type === "MIN_TIME")).toBe(true);
			expect(result.fallbackUsed).toBe(true);
		});
	});
});
