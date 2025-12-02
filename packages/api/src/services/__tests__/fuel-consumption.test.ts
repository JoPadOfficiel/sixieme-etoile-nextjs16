/**
 * Fuel Consumption Resolution Tests
 * Story 15.2: Use Vehicle-Specific Fuel Consumption in All Pricing Paths
 */

import { describe, it, expect } from "vitest";
import {
	resolveFuelConsumption,
	DEFAULT_COST_PARAMETERS,
	type FuelConsumptionResolution,
} from "../pricing-engine";

describe("resolveFuelConsumption", () => {
	describe("Priority 1: Vehicle-specific consumption", () => {
		it("should use vehicle consumption when available", () => {
			const result = resolveFuelConsumption(7.0, 18.0, 8.0);
			expect(result.consumptionL100km).toBe(7.0);
			expect(result.source).toBe("VEHICLE");
		});

		it("should use vehicle consumption even when category is higher", () => {
			const result = resolveFuelConsumption(5.5, 18.0, 10.0);
			expect(result.consumptionL100km).toBe(5.5);
			expect(result.source).toBe("VEHICLE");
		});

		it("should skip vehicle consumption if zero", () => {
			const result = resolveFuelConsumption(0, 18.0, 8.0);
			expect(result.consumptionL100km).toBe(18.0);
			expect(result.source).toBe("CATEGORY");
		});

		it("should skip vehicle consumption if negative", () => {
			const result = resolveFuelConsumption(-5, 18.0, 8.0);
			expect(result.consumptionL100km).toBe(18.0);
			expect(result.source).toBe("CATEGORY");
		});
	});

	describe("Priority 2: Category average consumption", () => {
		it("should use category consumption when vehicle is null", () => {
			const result = resolveFuelConsumption(null, 18.0, 8.0);
			expect(result.consumptionL100km).toBe(18.0);
			expect(result.source).toBe("CATEGORY");
		});

		it("should use category consumption when vehicle is undefined", () => {
			const result = resolveFuelConsumption(undefined, 12.0, 8.0);
			expect(result.consumptionL100km).toBe(12.0);
			expect(result.source).toBe("CATEGORY");
		});

		it("should skip category consumption if zero", () => {
			const result = resolveFuelConsumption(null, 0, 10.0);
			expect(result.consumptionL100km).toBe(10.0);
			expect(result.source).toBe("ORGANIZATION");
		});
	});

	describe("Priority 3: Organization settings", () => {
		it("should use org consumption when vehicle and category are null", () => {
			const result = resolveFuelConsumption(null, null, 10.0);
			expect(result.consumptionL100km).toBe(10.0);
			expect(result.source).toBe("ORGANIZATION");
		});

		it("should use org consumption when vehicle and category are undefined", () => {
			const result = resolveFuelConsumption(undefined, undefined, 9.5);
			expect(result.consumptionL100km).toBe(9.5);
			expect(result.source).toBe("ORGANIZATION");
		});

		it("should skip org consumption if zero", () => {
			const result = resolveFuelConsumption(null, null, 0);
			expect(result.consumptionL100km).toBe(DEFAULT_COST_PARAMETERS.fuelConsumptionL100km);
			expect(result.source).toBe("DEFAULT");
		});
	});

	describe("Priority 4: System default", () => {
		it("should use default when all are null", () => {
			const result = resolveFuelConsumption(null, null, null);
			expect(result.consumptionL100km).toBe(DEFAULT_COST_PARAMETERS.fuelConsumptionL100km);
			expect(result.source).toBe("DEFAULT");
		});

		it("should use default when all are undefined", () => {
			const result = resolveFuelConsumption(undefined, undefined, undefined);
			expect(result.consumptionL100km).toBe(8.0); // DEFAULT_COST_PARAMETERS.fuelConsumptionL100km
			expect(result.source).toBe("DEFAULT");
		});

		it("should use default when all are zero", () => {
			const result = resolveFuelConsumption(0, 0, 0);
			expect(result.consumptionL100km).toBe(8.0);
			expect(result.source).toBe("DEFAULT");
		});
	});

	describe("Real-world scenarios", () => {
		it("should handle Berline category (5.5 L/100km)", () => {
			// No vehicle selected, using category consumption
			const result = resolveFuelConsumption(null, 5.5, 8.0);
			expect(result.consumptionL100km).toBe(5.5);
			expect(result.source).toBe("CATEGORY");
		});

		it("should handle Autocar category (18 L/100km)", () => {
			// No vehicle selected, using category consumption
			const result = resolveFuelConsumption(null, 18.0, 8.0);
			expect(result.consumptionL100km).toBe(18.0);
			expect(result.source).toBe("CATEGORY");
		});

		it("should handle vehicle with custom consumption", () => {
			// Specific vehicle with 7L/100km in Berline category (5.5L)
			const result = resolveFuelConsumption(7.0, 5.5, 8.0);
			expect(result.consumptionL100km).toBe(7.0);
			expect(result.source).toBe("VEHICLE");
		});

		it("should handle new category without consumption set", () => {
			// New category without averageConsumptionL100km, org has 10L
			const result = resolveFuelConsumption(null, null, 10.0);
			expect(result.consumptionL100km).toBe(10.0);
			expect(result.source).toBe("ORGANIZATION");
		});

		it("should handle fresh organization with no settings", () => {
			// No vehicle, no category consumption, no org settings
			const result = resolveFuelConsumption(null, null, null);
			expect(result.consumptionL100km).toBe(8.0);
			expect(result.source).toBe("DEFAULT");
		});
	});

	describe("Fuel cost calculation impact", () => {
		const fuelPricePerLiter = 1.789;
		const distanceKm = 100;

		function calculateFuelCost(consumptionL100km: number): number {
			return Math.round(distanceKm * (consumptionL100km / 100) * fuelPricePerLiter * 100) / 100;
		}

		it("should calculate correct fuel cost for Berline (5.5 L/100km)", () => {
			const resolution = resolveFuelConsumption(null, 5.5, 8.0);
			const fuelCost = calculateFuelCost(resolution.consumptionL100km);
			expect(fuelCost).toBe(9.84); // 5.5 × 1.789 = 9.8395 → 9.84
		});

		it("should calculate correct fuel cost for Autocar (18 L/100km)", () => {
			const resolution = resolveFuelConsumption(null, 18.0, 8.0);
			const fuelCost = calculateFuelCost(resolution.consumptionL100km);
			expect(fuelCost).toBe(32.2); // 18 × 1.789 = 32.202 → 32.20
		});

		it("should show significant difference between categories", () => {
			const berlineResolution = resolveFuelConsumption(null, 5.5, 8.0);
			const autocarResolution = resolveFuelConsumption(null, 18.0, 8.0);
			
			const berlineCost = calculateFuelCost(berlineResolution.consumptionL100km);
			const autocarCost = calculateFuelCost(autocarResolution.consumptionL100km);
			
			// Autocar should cost ~3.27× more than Berline
			const ratio = autocarCost / berlineCost;
			expect(ratio).toBeCloseTo(18.0 / 5.5, 1); // ~3.27
		});

		it("should demonstrate the problem with fixed 8.0 L/100km default", () => {
			// Using default (old behavior)
			const defaultResolution = resolveFuelConsumption(null, null, null);
			const defaultCost = calculateFuelCost(defaultResolution.consumptionL100km);
			
			// Using correct Autocar consumption
			const autocarResolution = resolveFuelConsumption(null, 18.0, 8.0);
			const autocarCost = calculateFuelCost(autocarResolution.consumptionL100km);
			
			// Default underestimates by 125%!
			const underestimation = ((autocarCost - defaultCost) / defaultCost) * 100;
			expect(underestimation).toBeCloseTo(125, 0);
		});
	});
});
