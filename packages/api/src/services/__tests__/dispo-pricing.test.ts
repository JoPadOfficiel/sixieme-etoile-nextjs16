/**
 * Story 16.8: DISPO (Mise à Disposition) Pricing Tests
 *
 * Tests for:
 * - calculateDispoPrice() - Calculate hourly pricing with overage
 * - Included km calculation
 * - Overage calculation
 */

import { describe, it, expect } from "vitest";
import {
	calculateDispoPrice,
	applyTripTypePricing,
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
	dispoIncludedKmPerHour: 50,
	dispoOverageRatePerKm: 0.50,
};

// ============================================================================
// calculateDispoPrice Tests
// ============================================================================

describe("calculateDispoPrice", () => {
	it("should calculate base price for 4-hour dispo (AC1)", () => {
		const durationMinutes = 4 * 60; // 4 hours
		const distanceKm = 150; // Under included km
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		// Base price: 4h × 45€/h = 180€
		expect(result.price).toBe(180);
		expect(result.rule).not.toBeNull();
		expect(result.rule?.tripType).toBe("dispo");
		expect(result.rule?.basePriceBeforeAdjustment).toBe(180);
	});

	it("should calculate included km correctly (AC2)", () => {
		const durationMinutes = 4 * 60; // 4 hours
		const distanceKm = 150;
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		// Included km: 4h × 50 km/h = 200 km
		expect(result.rule?.includedKm).toBe(200);
	});

	it("should calculate overage when distance exceeds included km (AC3)", () => {
		const durationMinutes = 4 * 60; // 4 hours
		const distanceKm = 250; // 50 km over included
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		// Base price: 4h × 45€/h = 180€
		// Included km: 4h × 50 km/h = 200 km
		// Overage: (250 - 200) × 0.50€/km = 25€
		// Total: 180 + 25 = 205€
		expect(result.rule?.includedKm).toBe(200);
		expect(result.rule?.actualKm).toBe(250);
		expect(result.rule?.overageKm).toBe(50);
		expect(result.rule?.overageAmount).toBe(25);
		expect(result.price).toBe(205);
	});

	it("should not charge overage when under included km", () => {
		const durationMinutes = 4 * 60; // 4 hours
		const distanceKm = 150; // Under 200 km included
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		expect(result.rule?.overageKm).toBe(0);
		expect(result.rule?.overageAmount).toBe(0);
		expect(result.price).toBe(180); // Just base price
	});

	it("should use default values when settings are missing", () => {
		const minimalSettings: OrganizationPricingSettings = {
			baseRatePerKm: 2.5,
			baseRatePerHour: 45,
			targetMarginPercent: 25,
		};

		const durationMinutes = 2 * 60; // 2 hours
		const distanceKm = 150; // Over default 100 km included
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, minimalSettings);

		// Default: 50 km/h, 0.50€/km overage
		// Included: 2h × 50 = 100 km
		// Overage: (150 - 100) × 0.50 = 25€
		// Base: 2h × 45 = 90€
		// Total: 90 + 25 = 115€
		expect(result.rule?.includedKm).toBe(100);
		expect(result.rule?.overageKm).toBe(50);
		expect(result.rule?.overageAmount).toBe(25);
		expect(result.price).toBe(115);
	});

	it("should handle fractional hours", () => {
		const durationMinutes = 90; // 1.5 hours
		const distanceKm = 50;
		const ratePerHour = 60;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		// Base price: 1.5h × 60€/h = 90€
		// Included km: 1.5h × 50 = 75 km
		expect(result.price).toBe(90);
		expect(result.rule?.includedKm).toBe(75);
	});

	it("should include description with overage details", () => {
		const durationMinutes = 4 * 60;
		const distanceKm = 250;
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		expect(result.rule?.description).toContain("Dispo pricing");
		expect(result.rule?.description).toContain("4h");
		expect(result.rule?.description).toContain("45€/h");
		expect(result.rule?.description).toContain("50km overage");
		expect(result.rule?.description).toContain("0.5€/km");
	});
});

// ============================================================================
// applyTripTypePricing Tests for DISPO
// ============================================================================

describe("applyTripTypePricing for DISPO", () => {
	it("should route to calculateDispoPrice for dispo trip type", () => {
		const result = applyTripTypePricing(
			"dispo",
			150, // distanceKm
			240, // durationMinutes (4h)
			45,  // ratePerHour
			100, // standardBasePrice (ignored for dispo)
			mockSettings,
		);

		expect(result.rule).not.toBeNull();
		expect(result.rule?.tripType).toBe("dispo");
		expect(result.price).toBe(180); // 4h × 45€
	});

	it("should use standard pricing for transfer", () => {
		const result = applyTripTypePricing(
			"transfer",
			50,
			60,
			45,
			125, // standardBasePrice
			mockSettings,
		);

		expect(result.rule).toBeNull();
		expect(result.price).toBe(125);
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("Edge Cases", () => {
	it("should handle zero distance", () => {
		const result = calculateDispoPrice(240, 0, 45, mockSettings);

		expect(result.rule?.actualKm).toBe(0);
		expect(result.rule?.overageKm).toBe(0);
		expect(result.rule?.overageAmount).toBe(0);
		expect(result.price).toBe(180);
	});

	it("should handle very long dispo (8 hours)", () => {
		const durationMinutes = 8 * 60;
		const distanceKm = 500; // 100 km over 400 included
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		// Base: 8h × 45 = 360€
		// Included: 8h × 50 = 400 km
		// Overage: (500 - 400) × 0.50 = 50€
		// Total: 360 + 50 = 410€
		expect(result.rule?.includedKm).toBe(400);
		expect(result.rule?.overageKm).toBe(100);
		expect(result.price).toBe(410);
	});

	it("should handle custom overage rate", () => {
		const customSettings: OrganizationPricingSettings = {
			...mockSettings,
			dispoOverageRatePerKm: 0.75, // Higher rate
		};

		const result = calculateDispoPrice(240, 250, 45, customSettings);

		// Overage: 50 km × 0.75€ = 37.50€
		expect(result.rule?.overageRatePerKm).toBe(0.75);
		expect(result.rule?.overageAmount).toBe(37.5);
		expect(result.price).toBe(217.5); // 180 + 37.50
	});

	it("should handle custom included km per hour", () => {
		const customSettings: OrganizationPricingSettings = {
			...mockSettings,
			dispoIncludedKmPerHour: 40, // Lower included km
		};

		const result = calculateDispoPrice(240, 200, 45, customSettings);

		// Included: 4h × 40 = 160 km
		// Overage: (200 - 160) × 0.50 = 20€
		expect(result.rule?.includedKm).toBe(160);
		expect(result.rule?.overageKm).toBe(40);
		expect(result.rule?.overageAmount).toBe(20);
		expect(result.price).toBe(200); // 180 + 20
	});
});

// ============================================================================
// Story 19.4: DISPO Pricing Formula Fix Tests
// ============================================================================

describe("Story 19.4: DISPO uses durationHours instead of route duration", () => {
	it("should include requestedDurationHours in the rule for transparency", () => {
		const durationMinutes = 4 * 60; // 4 hours
		const distanceKm = 150;
		const ratePerHour = 45;

		const result = calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, mockSettings);

		// Story 19.4: requestedDurationHours should be included for transparency
		expect(result.rule?.requestedDurationHours).toBe(4);
	});

	it("should calculate price based on provided duration, not route estimate", () => {
		// Scenario: User requests 4h DISPO, but route estimate is only 30 minutes
		// The price should be based on 4h, not 30 minutes
		const requestedDurationMinutes = 4 * 60; // 4 hours (from durationHours)
		const distanceKm = 100;
		const ratePerHour = 45;

		// Using requestedDurationMinutes (correct behavior after fix)
		const result = calculateDispoPrice(requestedDurationMinutes, distanceKm, ratePerHour, mockSettings);

		// Correct: 4h × 45€/h = 180€
		// This demonstrates that DISPO pricing uses the provided duration (4h)
		// NOT the route duration estimate which would be much shorter
		expect(result.price).toBe(180);
		expect(result.rule?.requestedDurationHours).toBe(4);
		expect(result.rule?.includedKm).toBe(200); // 4h × 50km/h
		
		// The key insight: if we had used route duration (e.g., 30 min for 100km),
		// the price would have been only ~22.50€ instead of 180€
		// Story 19.4 ensures buildDynamicResult passes the correct duration
	});

	it("should calculate overage correctly with requested duration", () => {
		// 8h DISPO with 500km actual distance
		const requestedDurationMinutes = 8 * 60;
		const distanceKm = 500;
		const ratePerHour = 45;

		const result = calculateDispoPrice(requestedDurationMinutes, distanceKm, ratePerHour, mockSettings);

		// Base: 8h × 45€ = 360€
		// Included: 8h × 50km/h = 400km
		// Overage: (500 - 400) × 0.50€ = 50€
		// Total: 360 + 50 = 410€
		expect(result.price).toBe(410);
		expect(result.rule?.requestedDurationHours).toBe(8);
		expect(result.rule?.includedKm).toBe(400);
		expect(result.rule?.overageKm).toBe(100);
		expect(result.rule?.overageAmount).toBe(50);
	});
});
