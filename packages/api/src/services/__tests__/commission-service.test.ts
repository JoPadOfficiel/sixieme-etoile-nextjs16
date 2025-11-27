/**
 * Commission Service Tests
 * Story 7.4: Integrate Commission Calculation into Invoices
 *
 * Tests for centralized commission calculation logic.
 */

import { describe, it, expect } from "vitest";
import {
	calculateCommission,
	calculateEffectiveMargin,
	getCommissionData,
	hasCommission,
	getCommissionPercent,
} from "../commission-service";

describe("Commission Service", () => {
	describe("calculateCommission", () => {
		it("should calculate 10% commission on 150€", () => {
			const result = calculateCommission({
				totalExclVat: 150,
				commissionPercent: 10,
			});

			expect(result.commissionAmount).toBe(15);
			expect(result.netAmountAfterCommission).toBe(135);
			expect(result.commissionPercent).toBe(10);
		});

		it("should calculate 15% commission on 200€", () => {
			const result = calculateCommission({
				totalExclVat: 200,
				commissionPercent: 15,
			});

			expect(result.commissionAmount).toBe(30);
			expect(result.netAmountAfterCommission).toBe(170);
		});

		it("should handle 0% commission", () => {
			const result = calculateCommission({
				totalExclVat: 150,
				commissionPercent: 0,
			});

			expect(result.commissionAmount).toBe(0);
			expect(result.netAmountAfterCommission).toBe(150);
		});

		it("should handle negative commission as 0", () => {
			const result = calculateCommission({
				totalExclVat: 150,
				commissionPercent: -5,
			});

			expect(result.commissionAmount).toBe(0);
			expect(result.netAmountAfterCommission).toBe(150);
		});

		it("should cap commission at 100%", () => {
			const result = calculateCommission({
				totalExclVat: 150,
				commissionPercent: 150,
			});

			expect(result.commissionAmount).toBe(150);
			expect(result.netAmountAfterCommission).toBe(0);
			expect(result.commissionPercent).toBe(100);
		});

		it("should handle zero totalExclVat", () => {
			const result = calculateCommission({
				totalExclVat: 0,
				commissionPercent: 10,
			});

			expect(result.commissionAmount).toBe(0);
			expect(result.netAmountAfterCommission).toBe(0);
		});

		it("should round to 2 decimal places", () => {
			const result = calculateCommission({
				totalExclVat: 100,
				commissionPercent: 12.345,
			});

			// 100 * 12.345 / 100 = 12.345 → rounded to 12.35
			expect(result.commissionAmount).toBe(12.35);
			expect(result.netAmountAfterCommission).toBe(87.65);
		});

		it("should handle decimal amounts correctly", () => {
			const result = calculateCommission({
				totalExclVat: 149.99,
				commissionPercent: 10,
			});

			// 149.99 * 10 / 100 = 14.999 → rounded to 15.00
			expect(result.commissionAmount).toBe(15);
			expect(result.netAmountAfterCommission).toBe(134.99);
		});
	});

	describe("calculateEffectiveMargin", () => {
		it("should calculate effective margin with commission", () => {
			const result = calculateEffectiveMargin({
				sellingPrice: 150,
				internalCost: 80,
				commissionAmount: 15,
			});

			// Gross margin: 150 - 80 = 70 (46.67%)
			// Effective margin: 150 - 80 - 15 = 55 (36.67%)
			expect(result.grossMargin).toBe(70);
			expect(result.grossMarginPercent).toBeCloseTo(46.67, 1);
			expect(result.margin).toBe(55);
			expect(result.marginPercent).toBeCloseTo(36.67, 1);
		});

		it("should calculate margin without commission", () => {
			const result = calculateEffectiveMargin({
				sellingPrice: 150,
				internalCost: 80,
				commissionAmount: 0,
			});

			expect(result.grossMargin).toBe(70);
			expect(result.margin).toBe(70);
			expect(result.grossMarginPercent).toBe(result.marginPercent);
		});

		it("should handle negative margin (loss)", () => {
			const result = calculateEffectiveMargin({
				sellingPrice: 100,
				internalCost: 90,
				commissionAmount: 20,
			});

			// Effective margin: 100 - 90 - 20 = -10
			expect(result.margin).toBe(-10);
			expect(result.marginPercent).toBe(-10);
		});

		it("should handle zero selling price", () => {
			const result = calculateEffectiveMargin({
				sellingPrice: 0,
				internalCost: 50,
				commissionAmount: 10,
			});

			expect(result.margin).toBe(-60);
			expect(result.marginPercent).toBe(0);
		});

		it("should handle high commission reducing margin significantly", () => {
			const result = calculateEffectiveMargin({
				sellingPrice: 100,
				internalCost: 60,
				commissionAmount: 30,
			});

			// Gross margin: 100 - 60 = 40 (40%)
			// Effective margin: 100 - 60 - 30 = 10 (10%)
			expect(result.grossMargin).toBe(40);
			expect(result.margin).toBe(10);
			expect(result.marginPercent).toBe(10);
		});
	});

	describe("getCommissionData", () => {
		it("should return complete commission data for partner quote", () => {
			const data = getCommissionData(150, 80, 10);

			expect(data.commissionPercent).toBe(10);
			expect(data.commissionAmount).toBe(15);
			expect(data.effectiveMargin).toBe(55);
			expect(data.effectiveMarginPercent).toBeCloseTo(36.67, 1);
			expect(data.netAmountAfterCommission).toBe(135);
		});

		it("should return zero commission data for private client", () => {
			const data = getCommissionData(150, 80, 0);

			expect(data.commissionPercent).toBe(0);
			expect(data.commissionAmount).toBe(0);
			expect(data.effectiveMargin).toBe(70);
			expect(data.effectiveMarginPercent).toBeCloseTo(46.67, 1);
			expect(data.netAmountAfterCommission).toBe(150);
		});

		it("should handle high commission scenario", () => {
			const data = getCommissionData(200, 100, 25);

			// Commission: 200 * 25% = 50
			// Effective margin: 200 - 100 - 50 = 50 (25%)
			expect(data.commissionAmount).toBe(50);
			expect(data.effectiveMargin).toBe(50);
			expect(data.effectiveMarginPercent).toBe(25);
			expect(data.netAmountAfterCommission).toBe(150);
		});
	});

	describe("hasCommission", () => {
		it("should return true for partner with commission > 0", () => {
			const contact = {
				isPartner: true,
				partnerContract: { commissionPercent: 10 },
			};

			expect(hasCommission(contact)).toBe(true);
		});

		it("should return false for partner with 0% commission", () => {
			const contact = {
				isPartner: true,
				partnerContract: { commissionPercent: 0 },
			};

			expect(hasCommission(contact)).toBe(false);
		});

		it("should return false for non-partner", () => {
			const contact = {
				isPartner: false,
				partnerContract: null,
			};

			expect(hasCommission(contact)).toBe(false);
		});

		it("should return false for partner without contract", () => {
			const contact = {
				isPartner: true,
				partnerContract: null,
			};

			expect(hasCommission(contact)).toBe(false);
		});

		it("should handle string commission percent", () => {
			const contact = {
				isPartner: true,
				partnerContract: { commissionPercent: "15.5" },
			};

			expect(hasCommission(contact)).toBe(true);
		});

		it("should handle null commission percent", () => {
			const contact = {
				isPartner: true,
				partnerContract: { commissionPercent: null },
			};

			expect(hasCommission(contact)).toBe(false);
		});
	});

	describe("getCommissionPercent", () => {
		it("should return commission percent for partner", () => {
			const contact = {
				isPartner: true,
				partnerContract: { commissionPercent: 12.5 },
			};

			expect(getCommissionPercent(contact)).toBe(12.5);
		});

		it("should return 0 for non-partner", () => {
			const contact = {
				isPartner: false,
				partnerContract: null,
			};

			expect(getCommissionPercent(contact)).toBe(0);
		});

		it("should return 0 for partner with 0% commission", () => {
			const contact = {
				isPartner: true,
				partnerContract: { commissionPercent: 0 },
			};

			expect(getCommissionPercent(contact)).toBe(0);
		});

		it("should parse string commission percent", () => {
			const contact = {
				isPartner: true,
				partnerContract: { commissionPercent: "8.75" },
			};

			expect(getCommissionPercent(contact)).toBe(8.75);
		});
	});

	describe("Profitability Scenarios", () => {
		it("should show green profitability (>= 20% margin)", () => {
			// Price: 200, Cost: 100, Commission: 10% (20)
			// Effective margin: 200 - 100 - 20 = 80 (40%)
			const data = getCommissionData(200, 100, 10);

			expect(data.effectiveMarginPercent).toBe(40);
			// 40% >= 20% → green
		});

		it("should show orange profitability (0-20% margin)", () => {
			// Price: 150, Cost: 100, Commission: 20% (30)
			// Effective margin: 150 - 100 - 30 = 20 (13.33%)
			const data = getCommissionData(150, 100, 20);

			expect(data.effectiveMarginPercent).toBeCloseTo(13.33, 1);
			// 13.33% is between 0% and 20% → orange
		});

		it("should show red profitability (< 0% margin)", () => {
			// Price: 100, Cost: 80, Commission: 25% (25)
			// Effective margin: 100 - 80 - 25 = -5 (-5%)
			const data = getCommissionData(100, 80, 25);

			expect(data.effectiveMargin).toBe(-5);
			expect(data.effectiveMarginPercent).toBe(-5);
			// -5% < 0% → red
		});

		it("should demonstrate commission impact on profitability", () => {
			const priceAndCost = { sellingPrice: 150, internalCost: 80 };

			// Without commission (private client)
			const privateData = getCommissionData(150, 80, 0);
			expect(privateData.effectiveMarginPercent).toBeCloseTo(46.67, 1);

			// With 10% commission (partner)
			const partnerData = getCommissionData(150, 80, 10);
			expect(partnerData.effectiveMarginPercent).toBeCloseTo(36.67, 1);

			// Commission reduces margin by ~10 percentage points
			const marginDrop =
				privateData.effectiveMarginPercent - partnerData.effectiveMarginPercent;
			expect(marginDrop).toBeCloseTo(10, 0);
		});
	});
});
