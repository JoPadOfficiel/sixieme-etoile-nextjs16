/**
 * Fuel Type Tests
 * Story 15.6: Use Correct Fuel Type from Vehicle/Category
 */

import { describe, it, expect } from "vitest";
import {
	getFuelPrice,
	resolveFuelType,
	calculateFuelCost,
	DEFAULT_FUEL_PRICES,
	type FuelType,
	type VehicleCategoryInfo,
} from "../pricing-engine";

// Helper to create a VehicleCategoryInfo
function createCategory(
	overrides: Partial<VehicleCategoryInfo> & { id: string; code: string; name: string; priceMultiplier: number }
): VehicleCategoryInfo {
	return {
		defaultRatePerKm: null,
		defaultRatePerHour: null,
		fuelType: null,
		...overrides,
	};
}

describe("DEFAULT_FUEL_PRICES", () => {
	it("should have correct default prices", () => {
		expect(DEFAULT_FUEL_PRICES.DIESEL).toBe(1.789);
		expect(DEFAULT_FUEL_PRICES.GASOLINE).toBe(1.899);
		expect(DEFAULT_FUEL_PRICES.LPG).toBe(0.999);
		expect(DEFAULT_FUEL_PRICES.ELECTRIC).toBe(0.25);
	});
});

describe("getFuelPrice", () => {
	describe("Default Prices", () => {
		it("should return DIESEL default price", () => {
			const price = getFuelPrice("DIESEL");
			expect(price).toBe(1.789);
		});

		it("should return GASOLINE default price", () => {
			const price = getFuelPrice("GASOLINE");
			expect(price).toBe(1.899);
		});

		it("should return LPG default price", () => {
			const price = getFuelPrice("LPG");
			expect(price).toBe(0.999);
		});

		it("should return ELECTRIC default price", () => {
			const price = getFuelPrice("ELECTRIC");
			expect(price).toBe(0.25);
		});
	});

	describe("Custom Prices", () => {
		it("should use custom LPG price when provided", () => {
			const price = getFuelPrice("LPG", { LPG: 1.05 });
			expect(price).toBe(1.05);
		});

		it("should use custom DIESEL price when provided", () => {
			const price = getFuelPrice("DIESEL", { DIESEL: 1.95 });
			expect(price).toBe(1.95);
		});

		it("should fallback to default when custom price not provided for type", () => {
			const price = getFuelPrice("GASOLINE", { DIESEL: 1.95 });
			expect(price).toBe(1.899); // Default GASOLINE price
		});

		it("should use custom price from partial record", () => {
			const customPrices: Partial<Record<FuelType, number>> = {
				LPG: 0.85,
				ELECTRIC: 0.20,
			};
			expect(getFuelPrice("LPG", customPrices)).toBe(0.85);
			expect(getFuelPrice("ELECTRIC", customPrices)).toBe(0.20);
			expect(getFuelPrice("DIESEL", customPrices)).toBe(1.789); // Default
		});
	});
});

describe("resolveFuelType", () => {
	describe("Category with Fuel Type", () => {
		it("should return LPG when category has LPG", () => {
			const category = createCategory({
				id: "cat-lpg",
				code: "LPG_VAN",
				name: "LPG Van",
				priceMultiplier: 1.0,
				fuelType: "LPG",
			});
			expect(resolveFuelType(category)).toBe("LPG");
		});

		it("should return GASOLINE when category has GASOLINE", () => {
			const category = createCategory({
				id: "cat-gas",
				code: "GASOLINE_CAR",
				name: "Gasoline Car",
				priceMultiplier: 1.0,
				fuelType: "GASOLINE",
			});
			expect(resolveFuelType(category)).toBe("GASOLINE");
		});

		it("should return ELECTRIC when category has ELECTRIC", () => {
			const category = createCategory({
				id: "cat-ev",
				code: "ELECTRIC_CAR",
				name: "Electric Car",
				priceMultiplier: 1.0,
				fuelType: "ELECTRIC",
			});
			expect(resolveFuelType(category)).toBe("ELECTRIC");
		});

		it("should return DIESEL when category has DIESEL", () => {
			const category = createCategory({
				id: "cat-diesel",
				code: "DIESEL_CAR",
				name: "Diesel Car",
				priceMultiplier: 1.0,
				fuelType: "DIESEL",
			});
			expect(resolveFuelType(category)).toBe("DIESEL");
		});
	});

	describe("Fallback to DIESEL", () => {
		it("should fallback to DIESEL when fuelType is null", () => {
			const category = createCategory({
				id: "cat-null",
				code: "NULL_FUEL",
				name: "Null Fuel",
				priceMultiplier: 1.0,
				fuelType: null,
			});
			expect(resolveFuelType(category)).toBe("DIESEL");
		});

		it("should fallback to DIESEL when category is undefined", () => {
			expect(resolveFuelType(undefined)).toBe("DIESEL");
		});
	});
});

describe("calculateFuelCost", () => {
	describe("DIESEL Fuel Cost", () => {
		it("should calculate DIESEL fuel cost correctly", () => {
			// 100km × 10L/100km × 1.789€/L = 17.89€
			const result = calculateFuelCost(100, 10, "DIESEL");
			expect(result.amount).toBe(17.89);
			expect(result.fuelType).toBe("DIESEL");
			expect(result.pricePerLiter).toBe(1.789);
			expect(result.distanceKm).toBe(100);
			expect(result.consumptionL100km).toBe(10);
		});
	});

	describe("LPG Fuel Cost", () => {
		it("should calculate LPG fuel cost correctly", () => {
			// 100km × 10L/100km × 0.999€/L = 9.99€
			const result = calculateFuelCost(100, 10, "LPG");
			expect(result.amount).toBe(9.99);
			expect(result.fuelType).toBe("LPG");
			expect(result.pricePerLiter).toBe(0.999);
		});

		it("should show significant savings vs DIESEL", () => {
			const lpgResult = calculateFuelCost(100, 10, "LPG");
			const dieselResult = calculateFuelCost(100, 10, "DIESEL");
			
			// LPG: 9.99€, DIESEL: 17.89€
			expect(lpgResult.amount).toBe(9.99);
			expect(dieselResult.amount).toBe(17.89);
			
			// LPG is 44% cheaper
			const savings = (dieselResult.amount - lpgResult.amount) / dieselResult.amount;
			expect(savings).toBeCloseTo(0.44, 1);
		});
	});

	describe("GASOLINE Fuel Cost", () => {
		it("should calculate GASOLINE fuel cost correctly", () => {
			// 100km × 8L/100km × 1.899€/L = 15.19€
			const result = calculateFuelCost(100, 8, "GASOLINE");
			expect(result.amount).toBe(15.19);
			expect(result.fuelType).toBe("GASOLINE");
			expect(result.pricePerLiter).toBe(1.899);
		});
	});

	describe("ELECTRIC Fuel Cost", () => {
		it("should calculate ELECTRIC fuel cost correctly", () => {
			// 100km × 20kWh/100km × 0.25€/kWh = 5.00€
			const result = calculateFuelCost(100, 20, "ELECTRIC");
			expect(result.amount).toBe(5);
			expect(result.fuelType).toBe("ELECTRIC");
			expect(result.pricePerLiter).toBe(0.25);
		});

		it("should show significant savings vs DIESEL", () => {
			const electricResult = calculateFuelCost(100, 20, "ELECTRIC");
			const dieselResult = calculateFuelCost(100, 10, "DIESEL");
			
			// ELECTRIC: 5€, DIESEL: 17.89€
			expect(electricResult.amount).toBe(5);
			expect(dieselResult.amount).toBe(17.89);
			
			// ELECTRIC is 72% cheaper
			const savings = (dieselResult.amount - electricResult.amount) / dieselResult.amount;
			expect(savings).toBeCloseTo(0.72, 1);
		});
	});

	describe("Custom Prices", () => {
		it("should use custom LPG price", () => {
			const result = calculateFuelCost(100, 10, "LPG", { LPG: 1.10 });
			// 100km × 10L/100km × 1.10€/L = 11.00€
			expect(result.amount).toBe(11);
			expect(result.pricePerLiter).toBe(1.10);
		});
	});

	describe("Rounding", () => {
		it("should round to 2 decimal places", () => {
			// 50km × 7L/100km × 1.789€/L = 6.2615€ → 6.26€
			const result = calculateFuelCost(50, 7, "DIESEL");
			expect(result.amount).toBe(6.26);
		});
	});
});

describe("Real-world Pricing Scenarios", () => {
	it("should show correct fuel cost for Autocar (DIESEL)", () => {
		// Autocar: 18L/100km, 200km trip
		const result = calculateFuelCost(200, 18, "DIESEL");
		// 200km × 18L/100km × 1.789€/L = 64.40€
		expect(result.amount).toBe(64.4);
		expect(result.fuelType).toBe("DIESEL");
	});

	it("should show correct fuel cost for LPG Van", () => {
		// LPG Van: 12L/100km, 200km trip
		const result = calculateFuelCost(200, 12, "LPG");
		// 200km × 12L/100km × 0.999€/L = 23.98€
		expect(result.amount).toBe(23.98);
		expect(result.fuelType).toBe("LPG");
	});

	it("should show correct fuel cost for Electric Tesla", () => {
		// Tesla: 15kWh/100km, 200km trip
		const result = calculateFuelCost(200, 15, "ELECTRIC");
		// 200km × 15kWh/100km × 0.25€/kWh = 7.50€
		expect(result.amount).toBe(7.5);
		expect(result.fuelType).toBe("ELECTRIC");
	});

	it("should compare fuel costs across all types for same trip", () => {
		const distanceKm = 100;
		const consumption = 10; // L/100km or kWh/100km

		const dieselCost = calculateFuelCost(distanceKm, consumption, "DIESEL");
		const gasolineCost = calculateFuelCost(distanceKm, consumption, "GASOLINE");
		const lpgCost = calculateFuelCost(distanceKm, consumption, "LPG");
		const electricCost = calculateFuelCost(distanceKm, consumption, "ELECTRIC");

		// Verify ordering: ELECTRIC < LPG < DIESEL < GASOLINE
		expect(electricCost.amount).toBeLessThan(lpgCost.amount);
		expect(lpgCost.amount).toBeLessThan(dieselCost.amount);
		expect(dieselCost.amount).toBeLessThan(gasolineCost.amount);
	});
});
