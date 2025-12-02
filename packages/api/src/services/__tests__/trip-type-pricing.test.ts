/**
 * Trip Type Pricing Tests
 * Story 15.5: Differentiate Pricing by Trip Type (Transfer/Excursion/Dispo)
 */

import { describe, it, expect } from "vitest";
import {
	calculateExcursionPrice,
	calculateDispoPrice,
	applyTripTypePricing,
	type OrganizationPricingSettings,
	type TripType,
} from "../pricing-engine";

// Default settings for tests
const defaultSettings: OrganizationPricingSettings = {
	baseRatePerKm: 1.80,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
	// Story 15.5: Trip type defaults
	excursionMinimumHours: 4,
	excursionSurchargePercent: 15,
	dispoIncludedKmPerHour: 50,
	dispoOverageRatePerKm: 0.50,
};

describe("calculateExcursionPrice", () => {
	describe("Minimum Duration", () => {
		it("should apply 4h minimum for 2h excursion", () => {
			// 2h requested, but minimum is 4h
			const result = calculateExcursionPrice(120, 45, defaultSettings);

			expect(result.rule?.minimumApplied).toBe(true);
			expect(result.rule?.requestedHours).toBe(2);
			expect(result.rule?.effectiveHours).toBe(4);
			// 4h × 45€ = 180€ base + 15% surcharge = 27€ → 207€
			expect(result.rule?.basePriceBeforeAdjustment).toBe(180);
			expect(result.rule?.surchargeAmount).toBe(27);
			expect(result.price).toBe(207);
		});

		it("should apply 4h minimum for 1h excursion", () => {
			const result = calculateExcursionPrice(60, 45, defaultSettings);

			expect(result.rule?.minimumApplied).toBe(true);
			expect(result.rule?.requestedHours).toBe(1);
			expect(result.rule?.effectiveHours).toBe(4);
			expect(result.price).toBe(207);
		});

		it("should not apply minimum for 6h excursion", () => {
			const result = calculateExcursionPrice(360, 45, defaultSettings);

			expect(result.rule?.minimumApplied).toBe(false);
			expect(result.rule?.requestedHours).toBe(6);
			expect(result.rule?.effectiveHours).toBe(6);
			// 6h × 45€ = 270€ base + 15% surcharge = 40.5€ → 310.5€
			expect(result.rule?.basePriceBeforeAdjustment).toBe(270);
			expect(result.rule?.surchargeAmount).toBe(40.5);
			expect(result.price).toBe(310.5);
		});

		it("should not apply minimum for exactly 4h excursion", () => {
			const result = calculateExcursionPrice(240, 45, defaultSettings);

			expect(result.rule?.minimumApplied).toBe(false);
			expect(result.rule?.effectiveHours).toBe(4);
			expect(result.price).toBe(207);
		});
	});

	describe("Surcharge", () => {
		it("should apply 15% surcharge", () => {
			const result = calculateExcursionPrice(240, 45, defaultSettings);

			expect(result.rule?.surchargePercent).toBe(15);
			// 4h × 45€ = 180€ × 1.15 = 207€
			expect(result.price).toBe(207);
		});

		it("should apply custom surcharge percentage", () => {
			const customSettings = { ...defaultSettings, excursionSurchargePercent: 20 };
			const result = calculateExcursionPrice(240, 45, customSettings);

			expect(result.rule?.surchargePercent).toBe(20);
			// 4h × 45€ = 180€ × 1.20 = 216€
			expect(result.price).toBe(216);
		});
	});

	describe("Rule Details", () => {
		it("should include all required fields in rule", () => {
			const result = calculateExcursionPrice(120, 45, defaultSettings);

			expect(result.rule).toEqual({
				type: "TRIP_TYPE",
				tripType: "excursion",
				description: expect.stringContaining("Excursion pricing"),
				minimumApplied: true,
				requestedHours: 2,
				effectiveHours: 4,
				surchargePercent: 15,
				surchargeAmount: 27,
				basePriceBeforeAdjustment: 180,
				priceAfterAdjustment: 207,
			});
		});

		it("should generate correct description with minimum applied", () => {
			const result = calculateExcursionPrice(120, 45, defaultSettings);

			expect(result.rule?.description).toContain("minimum 4h applied");
		});

		it("should generate correct description without minimum", () => {
			const result = calculateExcursionPrice(360, 45, defaultSettings);

			expect(result.rule?.description).not.toContain("minimum");
		});
	});

	describe("Custom Minimum Hours", () => {
		it("should use custom minimum hours", () => {
			const customSettings = { ...defaultSettings, excursionMinimumHours: 6 };
			const result = calculateExcursionPrice(240, 45, customSettings);

			expect(result.rule?.minimumApplied).toBe(true);
			expect(result.rule?.effectiveHours).toBe(6);
			// 6h × 45€ = 270€ + 15% = 310.5€
			expect(result.price).toBe(310.5);
		});
	});
});

describe("calculateDispoPrice", () => {
	describe("No Overage", () => {
		it("should calculate base price when under included km", () => {
			// 4h × 50km/h = 200km included, actual 150km → no overage
			const result = calculateDispoPrice(240, 150, 45, defaultSettings);

			expect(result.rule?.includedKm).toBe(200);
			expect(result.rule?.actualKm).toBe(150);
			expect(result.rule?.overageKm).toBe(0);
			expect(result.rule?.overageAmount).toBe(0);
			// 4h × 45€ = 180€
			expect(result.price).toBe(180);
		});

		it("should calculate base price when exactly at included km", () => {
			// 4h × 50km/h = 200km included, actual 200km → no overage
			const result = calculateDispoPrice(240, 200, 45, defaultSettings);

			expect(result.rule?.overageKm).toBe(0);
			expect(result.rule?.overageAmount).toBe(0);
			expect(result.price).toBe(180);
		});
	});

	describe("With Overage", () => {
		it("should calculate overage for 4h/300km dispo", () => {
			// 4h × 50km/h = 200km included, actual 300km → 100km overage
			const result = calculateDispoPrice(240, 300, 45, defaultSettings);

			expect(result.rule?.includedKm).toBe(200);
			expect(result.rule?.actualKm).toBe(300);
			expect(result.rule?.overageKm).toBe(100);
			expect(result.rule?.overageRatePerKm).toBe(0.50);
			expect(result.rule?.overageAmount).toBe(50);
			// 4h × 45€ = 180€ + 100km × 0.50€ = 230€
			expect(result.price).toBe(230);
		});

		it("should calculate overage for 2h/200km dispo", () => {
			// 2h × 50km/h = 100km included, actual 200km → 100km overage
			const result = calculateDispoPrice(120, 200, 45, defaultSettings);

			expect(result.rule?.includedKm).toBe(100);
			expect(result.rule?.overageKm).toBe(100);
			expect(result.rule?.overageAmount).toBe(50);
			// 2h × 45€ = 90€ + 100km × 0.50€ = 140€
			expect(result.price).toBe(140);
		});
	});

	describe("Rule Details", () => {
		it("should include all required fields in rule", () => {
			const result = calculateDispoPrice(240, 300, 45, defaultSettings);

			expect(result.rule).toEqual({
				type: "TRIP_TYPE",
				tripType: "dispo",
				description: expect.stringContaining("Dispo pricing"),
				includedKm: 200,
				actualKm: 300,
				overageKm: 100,
				overageRatePerKm: 0.50,
				overageAmount: 50,
				basePriceBeforeAdjustment: 180,
				priceAfterAdjustment: 230,
			});
		});

		it("should generate correct description with overage", () => {
			const result = calculateDispoPrice(240, 300, 45, defaultSettings);

			expect(result.rule?.description).toContain("overage");
		});

		it("should generate correct description without overage", () => {
			const result = calculateDispoPrice(240, 150, 45, defaultSettings);

			expect(result.rule?.description).not.toContain("overage");
		});
	});

	describe("Custom Settings", () => {
		it("should use custom included km per hour", () => {
			const customSettings = { ...defaultSettings, dispoIncludedKmPerHour: 30 };
			// 4h × 30km/h = 120km included, actual 200km → 80km overage
			const result = calculateDispoPrice(240, 200, 45, customSettings);

			expect(result.rule?.includedKm).toBe(120);
			expect(result.rule?.overageKm).toBe(80);
		});

		it("should use custom overage rate", () => {
			const customSettings = { ...defaultSettings, dispoOverageRatePerKm: 1.00 };
			// 4h × 50km/h = 200km included, actual 300km → 100km × 1.00€ = 100€
			const result = calculateDispoPrice(240, 300, 45, customSettings);

			expect(result.rule?.overageRatePerKm).toBe(1.00);
			expect(result.rule?.overageAmount).toBe(100);
			// 4h × 45€ = 180€ + 100€ = 280€
			expect(result.price).toBe(280);
		});
	});
});

describe("applyTripTypePricing", () => {
	describe("Transfer", () => {
		it("should use standard pricing for transfer", () => {
			const result = applyTripTypePricing(
				"transfer",
				50,
				60,
				45,
				90, // standard base price
				defaultSettings,
			);

			expect(result.price).toBe(90);
			expect(result.rule).toBeNull();
		});

		it("should not add rule for transfer", () => {
			const result = applyTripTypePricing(
				"transfer",
				100,
				120,
				45,
				180,
				defaultSettings,
			);

			expect(result.rule).toBeNull();
		});
	});

	describe("Excursion", () => {
		it("should apply excursion pricing", () => {
			const result = applyTripTypePricing(
				"excursion",
				50,
				120, // 2h
				45,
				90, // ignored for excursion
				defaultSettings,
			);

			// Should use excursion pricing: 4h min × 45€ × 1.15 = 207€
			expect(result.price).toBe(207);
			expect(result.rule?.type).toBe("TRIP_TYPE");
			expect(result.rule?.tripType).toBe("excursion");
		});
	});

	describe("Dispo", () => {
		it("should apply dispo pricing", () => {
			const result = applyTripTypePricing(
				"dispo",
				300, // 300km
				240, // 4h
				45,
				180, // ignored for dispo
				defaultSettings,
			);

			// Should use dispo pricing: 4h × 45€ + 100km × 0.50€ = 230€
			expect(result.price).toBe(230);
			expect(result.rule?.type).toBe("TRIP_TYPE");
			expect(result.rule?.tripType).toBe("dispo");
		});
	});

	describe("Unknown Trip Type", () => {
		it("should use standard pricing for unknown trip type", () => {
			const result = applyTripTypePricing(
				"unknown" as TripType,
				50,
				60,
				45,
				90,
				defaultSettings,
			);

			expect(result.price).toBe(90);
			expect(result.rule).toBeNull();
		});
	});
});

describe("Real-world Pricing Scenarios", () => {
	it("should show significant difference between trip types", () => {
		const distanceKm = 50;
		const durationMinutes = 120; // 2h
		const ratePerHour = 45;
		const standardBasePrice = 90; // MAX(50×1.80, 2×45) = 90€

		const transferResult = applyTripTypePricing(
			"transfer",
			distanceKm,
			durationMinutes,
			ratePerHour,
			standardBasePrice,
			defaultSettings,
		);

		const excursionResult = applyTripTypePricing(
			"excursion",
			distanceKm,
			durationMinutes,
			ratePerHour,
			standardBasePrice,
			defaultSettings,
		);

		// Transfer: 90€
		expect(transferResult.price).toBe(90);

		// Excursion: 4h × 45€ × 1.15 = 207€
		expect(excursionResult.price).toBe(207);

		// Excursion is 2.3× more expensive
		const ratio = excursionResult.price / transferResult.price;
		expect(ratio).toBeCloseTo(2.3, 1);
	});

	it("should calculate dispo with significant overage", () => {
		// 8h dispo with 600km (included: 400km, overage: 200km)
		const result = calculateDispoPrice(480, 600, 45, defaultSettings);

		expect(result.rule?.includedKm).toBe(400);
		expect(result.rule?.overageKm).toBe(200);
		expect(result.rule?.overageAmount).toBe(100);
		// 8h × 45€ = 360€ + 200km × 0.50€ = 460€
		expect(result.price).toBe(460);
	});
});
