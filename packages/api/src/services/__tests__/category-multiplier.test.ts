/**
 * Vehicle Category Multiplier Tests
 * Story 15.3: Apply Vehicle Category Price Multipliers in Dynamic Pricing
 */

import { describe, it, expect } from "vitest";
import {
	applyVehicleCategoryMultiplier,
	type VehicleCategoryInfo,
	type AppliedVehicleCategoryMultiplierRule,
} from "../pricing-engine";

describe("applyVehicleCategoryMultiplier", () => {
	describe("Multiplier Application", () => {
		it("should apply 2.5× multiplier for Autocar", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-autocar",
				code: "AUTOCAR",
				name: "Autocar",
				priceMultiplier: 2.5,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(250);
			expect(result.appliedRule).not.toBeNull();
			expect(result.appliedRule?.type).toBe("VEHICLE_CATEGORY_MULTIPLIER");
			expect(result.appliedRule?.multiplier).toBe(2.5);
			expect(result.appliedRule?.priceBefore).toBe(100);
			expect(result.appliedRule?.priceAfter).toBe(250);
		});

		it("should apply 2.0× multiplier for Luxe", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-luxe",
				code: "LUXE",
				name: "Luxe",
				priceMultiplier: 2.0,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(200);
			expect(result.appliedRule?.categoryCode).toBe("LUXE");
			expect(result.appliedRule?.categoryName).toBe("Luxe");
		});

		it("should apply 1.8× multiplier for Minibus", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-minibus",
				code: "MINIBUS",
				name: "Minibus",
				priceMultiplier: 1.8,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(180);
			expect(result.appliedRule?.multiplier).toBe(1.8);
		});

		it("should apply 1.3× multiplier for Van Premium", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-van",
				code: "VAN_PREMIUM",
				name: "Van Premium",
				priceMultiplier: 1.3,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(130);
		});
	});

	describe("Neutral Multiplier (1.0×)", () => {
		it("should not add rule for Berline with 1.0× multiplier", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-berline",
				code: "BERLINE",
				name: "Berline",
				priceMultiplier: 1.0,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(100);
			expect(result.appliedRule).toBeNull();
		});

		it("should return unchanged price for neutral multiplier", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-standard",
				code: "STANDARD",
				name: "Standard",
				priceMultiplier: 1.0,
			};

			const result = applyVehicleCategoryMultiplier(150.50, category);

			expect(result.adjustedPrice).toBe(150.50);
			expect(result.appliedRule).toBeNull();
		});
	});

	describe("Undefined Category", () => {
		it("should handle undefined category", () => {
			const result = applyVehicleCategoryMultiplier(100, undefined);

			expect(result.adjustedPrice).toBe(100);
			expect(result.appliedRule).toBeNull();
		});

		it("should return unchanged price for undefined category", () => {
			const result = applyVehicleCategoryMultiplier(250.75, undefined);

			expect(result.adjustedPrice).toBe(250.75);
			expect(result.appliedRule).toBeNull();
		});
	});

	describe("Rounding", () => {
		it("should round to 2 decimal places", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-custom",
				code: "CUSTOM",
				name: "Custom",
				priceMultiplier: 1.333,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(133.3);
		});

		it("should handle complex decimal multiplication", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-test",
				code: "TEST",
				name: "Test",
				priceMultiplier: 1.15,
			};

			const result = applyVehicleCategoryMultiplier(99.99, category);

			// 99.99 × 1.15 = 114.9885 → 114.99
			expect(result.adjustedPrice).toBe(114.99);
		});
	});

	describe("Rule Details", () => {
		it("should include all required fields in applied rule", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-123",
				code: "VAN_PREMIUM",
				name: "Van Premium",
				priceMultiplier: 1.5,
			};

			const result = applyVehicleCategoryMultiplier(200, category);

			expect(result.appliedRule).toEqual({
				type: "VEHICLE_CATEGORY_MULTIPLIER",
				description: "Vehicle category multiplier applied: Van Premium (1.5×)",
				categoryId: "cat-123",
				categoryCode: "VAN_PREMIUM",
				categoryName: "Van Premium",
				multiplier: 1.5,
				priceBefore: 200,
				priceAfter: 300,
			});
		});

		it("should generate correct description", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-autocar",
				code: "AUTOCAR",
				name: "Autocar",
				priceMultiplier: 2.5,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.appliedRule?.description).toBe(
				"Vehicle category multiplier applied: Autocar (2.5×)"
			);
		});
	});

	describe("Real-world Pricing Scenarios", () => {
		it("should correctly price Paris-CDG with Autocar (2.5×)", () => {
			// Base price for Paris-CDG: 100€
			const basePrice = 100;
			const category: VehicleCategoryInfo = {
				id: "cat-autocar",
				code: "AUTOCAR",
				name: "Autocar",
				priceMultiplier: 2.5,
			};

			const result = applyVehicleCategoryMultiplier(basePrice, category);

			// Expected: 100 × 2.5 = 250€
			expect(result.adjustedPrice).toBe(250);
		});

		it("should correctly price Paris-CDG with Berline (1.0×)", () => {
			// Base price for Paris-CDG: 100€
			const basePrice = 100;
			const category: VehicleCategoryInfo = {
				id: "cat-berline",
				code: "BERLINE",
				name: "Berline",
				priceMultiplier: 1.0,
			};

			const result = applyVehicleCategoryMultiplier(basePrice, category);

			// Expected: 100 × 1.0 = 100€ (no change)
			expect(result.adjustedPrice).toBe(100);
			expect(result.appliedRule).toBeNull();
		});

		it("should show significant price difference between categories", () => {
			const basePrice = 150;

			const berlineResult = applyVehicleCategoryMultiplier(basePrice, {
				id: "1", code: "BERLINE", name: "Berline", priceMultiplier: 1.0,
			});

			const autocarResult = applyVehicleCategoryMultiplier(basePrice, {
				id: "2", code: "AUTOCAR", name: "Autocar", priceMultiplier: 2.5,
			});

			// Berline: 150€, Autocar: 375€
			expect(berlineResult.adjustedPrice).toBe(150);
			expect(autocarResult.adjustedPrice).toBe(375);

			// Autocar is 2.5× more expensive
			const ratio = autocarResult.adjustedPrice / berlineResult.adjustedPrice;
			expect(ratio).toBe(2.5);
		});
	});

	describe("Edge Cases", () => {
		it("should handle zero base price", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-test",
				code: "TEST",
				name: "Test",
				priceMultiplier: 2.0,
			};

			const result = applyVehicleCategoryMultiplier(0, category);

			expect(result.adjustedPrice).toBe(0);
			expect(result.appliedRule?.priceAfter).toBe(0);
		});

		it("should handle very small multiplier", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-discount",
				code: "DISCOUNT",
				name: "Discount",
				priceMultiplier: 0.5,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(50);
		});

		it("should handle very large multiplier", () => {
			const category: VehicleCategoryInfo = {
				id: "cat-vip",
				code: "VIP",
				name: "VIP",
				priceMultiplier: 5.0,
			};

			const result = applyVehicleCategoryMultiplier(100, category);

			expect(result.adjustedPrice).toBe(500);
		});
	});
});
