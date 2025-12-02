/**
 * Vehicle Category Rates Tests
 * Story 15.4: Use Vehicle Category Default Rates for Dynamic Pricing
 */

import { describe, it, expect } from "vitest";
import {
	resolveRates,
	calculateDynamicBasePrice,
	type VehicleCategoryInfo,
	type OrganizationPricingSettings,
} from "../pricing-engine";

// Helper to create a VehicleCategoryInfo
function createCategory(
	overrides: Partial<VehicleCategoryInfo> & { id: string; code: string; name: string; priceMultiplier: number }
): VehicleCategoryInfo {
	return {
		defaultRatePerKm: null,
		defaultRatePerHour: null,
		...overrides,
	};
}

// Default organization settings for tests
const defaultOrgSettings: OrganizationPricingSettings = {
	baseRatePerKm: 1.80,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
};

describe("resolveRates", () => {
	describe("Category Rates", () => {
		it("should use category rates when both are set", () => {
			const category = createCategory({
				id: "cat-autocar",
				code: "AUTOCAR",
				name: "Autocar",
				priceMultiplier: 2.5,
				defaultRatePerKm: 4.50,
				defaultRatePerHour: 120.0,
			});

			const result = resolveRates(category, defaultOrgSettings);

			expect(result.ratePerKm).toBe(4.50);
			expect(result.ratePerHour).toBe(120.0);
			expect(result.rateSource).toBe("CATEGORY");
		});

		it("should use category rates for Luxe", () => {
			const category = createCategory({
				id: "cat-luxe",
				code: "LUXE",
				name: "Luxe",
				priceMultiplier: 2.0,
				defaultRatePerKm: 3.50,
				defaultRatePerHour: 90.0,
			});

			const result = resolveRates(category, defaultOrgSettings);

			expect(result.ratePerKm).toBe(3.50);
			expect(result.ratePerHour).toBe(90.0);
			expect(result.rateSource).toBe("CATEGORY");
		});

		it("should use category rates for Minibus", () => {
			const category = createCategory({
				id: "cat-minibus",
				code: "MINIBUS",
				name: "Minibus",
				priceMultiplier: 1.8,
				defaultRatePerKm: 3.00,
				defaultRatePerHour: 75.0,
			});

			const result = resolveRates(category, defaultOrgSettings);

			expect(result.ratePerKm).toBe(3.00);
			expect(result.ratePerHour).toBe(75.0);
			expect(result.rateSource).toBe("CATEGORY");
		});
	});

	describe("Fallback to Organization Rates", () => {
		it("should fallback when category rates are null", () => {
			const category = createCategory({
				id: "cat-new",
				code: "NEW",
				name: "New Category",
				priceMultiplier: 1.0,
				defaultRatePerKm: null,
				defaultRatePerHour: null,
			});

			const result = resolveRates(category, defaultOrgSettings);

			expect(result.ratePerKm).toBe(1.80);
			expect(result.ratePerHour).toBe(45.0);
			expect(result.rateSource).toBe("ORGANIZATION");
		});

		it("should fallback when only ratePerKm is null", () => {
			const category = createCategory({
				id: "cat-partial",
				code: "PARTIAL",
				name: "Partial",
				priceMultiplier: 1.0,
				defaultRatePerKm: null,
				defaultRatePerHour: 60.0,
			});

			const result = resolveRates(category, defaultOrgSettings);

			// Both must be set to use category rates
			expect(result.ratePerKm).toBe(1.80);
			expect(result.ratePerHour).toBe(45.0);
			expect(result.rateSource).toBe("ORGANIZATION");
		});

		it("should fallback when only ratePerHour is null", () => {
			const category = createCategory({
				id: "cat-partial",
				code: "PARTIAL",
				name: "Partial",
				priceMultiplier: 1.0,
				defaultRatePerKm: 2.50,
				defaultRatePerHour: null,
			});

			const result = resolveRates(category, defaultOrgSettings);

			// Both must be set to use category rates
			expect(result.ratePerKm).toBe(1.80);
			expect(result.ratePerHour).toBe(45.0);
			expect(result.rateSource).toBe("ORGANIZATION");
		});

		it("should fallback when category is undefined", () => {
			const result = resolveRates(undefined, defaultOrgSettings);

			expect(result.ratePerKm).toBe(1.80);
			expect(result.ratePerHour).toBe(45.0);
			expect(result.rateSource).toBe("ORGANIZATION");
		});
	});
});

describe("calculateDynamicBasePrice with category rates", () => {
	describe("Autocar Pricing (4.50€/km)", () => {
		it("should calculate 100km trip with Autocar rates", () => {
			const categoryRates = {
				ratePerKm: 4.50,
				ratePerHour: 120.0,
				rateSource: "CATEGORY" as const,
			};

			const result = calculateDynamicBasePrice(
				100, // 100km
				90,  // 90 minutes
				defaultOrgSettings,
				categoryRates,
			);

			// Distance: 100 × 4.50 = 450€
			// Duration: 1.5h × 120 = 180€
			// MAX = 450€
			expect(result.distanceBasedPrice).toBe(450);
			expect(result.durationBasedPrice).toBe(180);
			expect(result.selectedMethod).toBe("distance");
			expect(result.basePrice).toBe(450);
			expect(result.inputs.rateSource).toBe("CATEGORY");
		});

		it("should use duration when higher for Autocar", () => {
			const categoryRates = {
				ratePerKm: 4.50,
				ratePerHour: 120.0,
				rateSource: "CATEGORY" as const,
			};

			const result = calculateDynamicBasePrice(
				20,  // 20km (short distance)
				180, // 3 hours (long duration)
				defaultOrgSettings,
				categoryRates,
			);

			// Distance: 20 × 4.50 = 90€
			// Duration: 3h × 120 = 360€
			// MAX = 360€
			expect(result.distanceBasedPrice).toBe(90);
			expect(result.durationBasedPrice).toBe(360);
			expect(result.selectedMethod).toBe("duration");
			expect(result.basePrice).toBe(360);
		});
	});

	describe("Berline Pricing (org rates)", () => {
		it("should use org rates when category rates are null", () => {
			const result = calculateDynamicBasePrice(
				100, // 100km
				90,  // 90 minutes
				defaultOrgSettings,
				null, // No category rates
			);

			// Distance: 100 × 1.80 = 180€
			// Duration: 1.5h × 45 = 67.5€
			// MAX = 180€
			expect(result.distanceBasedPrice).toBe(180);
			expect(result.durationBasedPrice).toBe(67.5);
			expect(result.selectedMethod).toBe("distance");
			expect(result.basePrice).toBe(180);
		});
	});

	describe("Price Comparison", () => {
		it("should show significant difference between Autocar and Berline", () => {
			const autocarRates = {
				ratePerKm: 4.50,
				ratePerHour: 120.0,
				rateSource: "CATEGORY" as const,
			};

			const autocarResult = calculateDynamicBasePrice(
				100, 90, defaultOrgSettings, autocarRates,
			);

			const berlineResult = calculateDynamicBasePrice(
				100, 90, defaultOrgSettings, null,
			);

			// Autocar: 450€ base, Berline: 180€ base
			expect(autocarResult.basePrice).toBe(450);
			expect(berlineResult.basePrice).toBe(180);

			// Autocar is 2.5× more expensive on base rate
			const ratio = autocarResult.basePrice / berlineResult.basePrice;
			expect(ratio).toBe(2.5);
		});
	});

	describe("Rate Source Tracking", () => {
		it("should track CATEGORY source in inputs", () => {
			const categoryRates = {
				ratePerKm: 3.00,
				ratePerHour: 75.0,
				rateSource: "CATEGORY" as const,
			};

			const result = calculateDynamicBasePrice(
				50, 60, defaultOrgSettings, categoryRates,
			);

			expect(result.inputs.baseRatePerKm).toBe(3.00);
			expect(result.inputs.baseRatePerHour).toBe(75.0);
			expect(result.inputs.rateSource).toBe("CATEGORY");
		});

		it("should track ORGANIZATION source when no category rates", () => {
			const result = calculateDynamicBasePrice(
				50, 60, defaultOrgSettings, null,
			);

			expect(result.inputs.baseRatePerKm).toBe(1.80);
			expect(result.inputs.baseRatePerHour).toBe(45.0);
			expect(result.inputs.rateSource).toBe("ORGANIZATION");
		});
	});

	describe("Margin Application", () => {
		it("should apply margin after base price calculation", () => {
			const categoryRates = {
				ratePerKm: 4.50,
				ratePerHour: 120.0,
				rateSource: "CATEGORY" as const,
			};

			const result = calculateDynamicBasePrice(
				100, 90, defaultOrgSettings, categoryRates,
			);

			// Base: 450€, Margin: 20%
			// Price with margin: 450 × 1.20 = 540€
			expect(result.basePrice).toBe(450);
			expect(result.priceWithMargin).toBe(540);
		});
	});
});
