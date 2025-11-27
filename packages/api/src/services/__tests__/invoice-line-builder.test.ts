/**
 * Tests for Invoice Line Builder Service
 * Story 7.3: Implement VAT Breakdown for Transport & Ancillary Services
 */

import { describe, it, expect } from "vitest";
import {
	parseAppliedRules,
	buildInvoiceLines,
	calculateInvoiceTotals,
	calculateTransportAmount,
	TRANSPORT_VAT_RATE,
	DEFAULT_ANCILLARY_VAT_RATE,
} from "../invoice-line-builder";

describe("invoice-line-builder", () => {
	describe("parseAppliedRules", () => {
		it("should return empty arrays for null input", () => {
			const result = parseAppliedRules(null);
			expect(result.optionalFees).toEqual([]);
			expect(result.promotions).toEqual([]);
		});

		it("should return empty arrays for undefined input", () => {
			const result = parseAppliedRules(undefined);
			expect(result.optionalFees).toEqual([]);
			expect(result.promotions).toEqual([]);
		});

		it("should return empty arrays for empty object", () => {
			const result = parseAppliedRules({});
			expect(result.optionalFees).toEqual([]);
			expect(result.promotions).toEqual([]);
		});

		it("should parse optional fees correctly", () => {
			const appliedRules = {
				optionalFees: [
					{ id: "fee1", name: "Baby Seat", amount: 15, vatRate: 20, isTaxable: true },
					{ id: "fee2", name: "Airport Wait", amount: 25, vatRate: 20, isTaxable: true },
				],
			};

			const result = parseAppliedRules(appliedRules);

			expect(result.optionalFees).toHaveLength(2);
			expect(result.optionalFees[0]).toEqual({
				id: "fee1",
				name: "Baby Seat",
				description: undefined,
				amount: 15,
				vatRate: 20,
				isTaxable: true,
			});
			expect(result.optionalFees[1]).toEqual({
				id: "fee2",
				name: "Airport Wait",
				description: undefined,
				amount: 25,
				vatRate: 20,
				isTaxable: true,
			});
		});

		it("should default vatRate to 20% if not provided", () => {
			const appliedRules = {
				optionalFees: [{ id: "fee1", name: "Test Fee", amount: 10 }],
			};

			const result = parseAppliedRules(appliedRules);

			expect(result.optionalFees[0].vatRate).toBe(DEFAULT_ANCILLARY_VAT_RATE);
		});

		it("should default isTaxable to true if not provided", () => {
			const appliedRules = {
				optionalFees: [{ id: "fee1", name: "Test Fee", amount: 10 }],
			};

			const result = parseAppliedRules(appliedRules);

			expect(result.optionalFees[0].isTaxable).toBe(true);
		});

		it("should parse promotions array correctly", () => {
			const appliedRules = {
				promotions: [
					{ id: "promo1", code: "SUMMER20", discountAmount: 30, discountType: "FIXED" },
				],
			};

			const result = parseAppliedRules(appliedRules);

			expect(result.promotions).toHaveLength(1);
			expect(result.promotions[0]).toEqual({
				id: "promo1",
				code: "SUMMER20",
				description: undefined,
				discountAmount: 30,
				discountType: "FIXED",
			});
		});

		it("should parse single promotion object (legacy format)", () => {
			const appliedRules = {
				promotion: { id: "promo1", code: "LEGACY", discountAmount: 20, discountType: "FIXED" },
			};

			const result = parseAppliedRules(appliedRules);

			expect(result.promotions).toHaveLength(1);
			expect(result.promotions[0].code).toBe("LEGACY");
		});

		it("should ignore invalid optional fees (no amount)", () => {
			const appliedRules = {
				optionalFees: [
					{ id: "fee1", name: "Valid", amount: 10 },
					{ id: "fee2", name: "Invalid" }, // No amount
					{ id: "fee3", name: "Zero", amount: 0 }, // Zero amount
				],
			};

			const result = parseAppliedRules(appliedRules);

			expect(result.optionalFees).toHaveLength(1);
			expect(result.optionalFees[0].name).toBe("Valid");
		});

		it("should make discount amounts positive", () => {
			const appliedRules = {
				promotions: [{ id: "promo1", code: "TEST", discountAmount: -30 }],
			};

			const result = parseAppliedRules(appliedRules);

			expect(result.promotions[0].discountAmount).toBe(30);
		});
	});

	describe("buildInvoiceLines", () => {
		it("should create transport line only when no fees or promotions", () => {
			const parsedRules = { optionalFees: [], promotions: [] };

			const lines = buildInvoiceLines(150, "Paris", "CDG Airport", parsedRules);

			expect(lines).toHaveLength(1);
			expect(lines[0]).toEqual({
				lineType: "SERVICE",
				description: "Transport: Paris → CDG Airport",
				quantity: 1,
				unitPriceExclVat: 150,
				vatRate: TRANSPORT_VAT_RATE,
				totalExclVat: 150,
				totalVat: 15, // 150 * 10%
				sortOrder: 0,
			});
		});

		it("should create lines for optional fees with correct VAT", () => {
			const parsedRules = {
				optionalFees: [
					{ id: "fee1", name: "Baby Seat", amount: 15, vatRate: 20, isTaxable: true },
				],
				promotions: [],
			};

			const lines = buildInvoiceLines(150, "Paris", "CDG", parsedRules);

			expect(lines).toHaveLength(2);
			expect(lines[1]).toEqual({
				lineType: "OPTIONAL_FEE",
				description: "Baby Seat",
				quantity: 1,
				unitPriceExclVat: 15,
				vatRate: 20,
				totalExclVat: 15,
				totalVat: 3, // 15 * 20%
				sortOrder: 1,
			});
		});

		it("should create lines for non-taxable fees with 0% VAT", () => {
			const parsedRules = {
				optionalFees: [
					{ id: "fee1", name: "Non-taxable", amount: 10, vatRate: 20, isTaxable: false },
				],
				promotions: [],
			};

			const lines = buildInvoiceLines(100, "A", "B", parsedRules);

			expect(lines[1].vatRate).toBe(0);
			expect(lines[1].totalVat).toBe(0);
		});

		it("should create promotion lines with negative amounts", () => {
			const parsedRules = {
				optionalFees: [],
				promotions: [
					{ id: "promo1", code: "SUMMER20", discountAmount: 30, discountType: "FIXED" as const },
				],
			};

			const lines = buildInvoiceLines(150, "Paris", "CDG", parsedRules);

			expect(lines).toHaveLength(2);
			expect(lines[1]).toEqual({
				lineType: "PROMOTION_ADJUSTMENT",
				description: "Promotion: SUMMER20",
				quantity: 1,
				unitPriceExclVat: -30,
				vatRate: TRANSPORT_VAT_RATE,
				totalExclVat: -30,
				totalVat: -3, // -30 * 10%
				sortOrder: 1,
			});
		});

		it("should maintain correct sort order for multiple lines", () => {
			const parsedRules = {
				optionalFees: [
					{ id: "fee1", name: "Fee 1", amount: 10, vatRate: 20, isTaxable: true },
					{ id: "fee2", name: "Fee 2", amount: 20, vatRate: 20, isTaxable: true },
				],
				promotions: [
					{ id: "promo1", code: "PROMO", discountAmount: 5, discountType: "FIXED" as const },
				],
			};

			const lines = buildInvoiceLines(100, "A", "B", parsedRules);

			expect(lines).toHaveLength(4);
			expect(lines[0].sortOrder).toBe(0); // Transport
			expect(lines[1].sortOrder).toBe(1); // Fee 1
			expect(lines[2].sortOrder).toBe(2); // Fee 2
			expect(lines[3].sortOrder).toBe(3); // Promo
		});
	});

	describe("calculateInvoiceTotals", () => {
		it("should calculate totals correctly for single line", () => {
			const lines = [
				{
					lineType: "SERVICE" as const,
					description: "Transport",
					quantity: 1,
					unitPriceExclVat: 150,
					vatRate: 10,
					totalExclVat: 150,
					totalVat: 15,
					sortOrder: 0,
				},
			];

			const totals = calculateInvoiceTotals(lines);

			expect(totals.totalExclVat).toBe(150);
			expect(totals.totalVat).toBe(15);
			expect(totals.totalInclVat).toBe(165);
		});

		it("should calculate totals correctly for multiple lines with different VAT rates", () => {
			const lines = [
				{
					lineType: "SERVICE" as const,
					description: "Transport",
					quantity: 1,
					unitPriceExclVat: 150,
					vatRate: 10,
					totalExclVat: 150,
					totalVat: 15,
					sortOrder: 0,
				},
				{
					lineType: "OPTIONAL_FEE" as const,
					description: "Baby Seat",
					quantity: 1,
					unitPriceExclVat: 15,
					vatRate: 20,
					totalExclVat: 15,
					totalVat: 3,
					sortOrder: 1,
				},
				{
					lineType: "OPTIONAL_FEE" as const,
					description: "Airport Wait",
					quantity: 1,
					unitPriceExclVat: 25,
					vatRate: 20,
					totalExclVat: 25,
					totalVat: 5,
					sortOrder: 2,
				},
			];

			const totals = calculateInvoiceTotals(lines);

			expect(totals.totalExclVat).toBe(190);
			expect(totals.totalVat).toBe(23);
			expect(totals.totalInclVat).toBe(213);
		});

		it("should handle negative amounts (promotions)", () => {
			const lines = [
				{
					lineType: "SERVICE" as const,
					description: "Transport",
					quantity: 1,
					unitPriceExclVat: 150,
					vatRate: 10,
					totalExclVat: 150,
					totalVat: 15,
					sortOrder: 0,
				},
				{
					lineType: "PROMOTION_ADJUSTMENT" as const,
					description: "Promo",
					quantity: 1,
					unitPriceExclVat: -30,
					vatRate: 10,
					totalExclVat: -30,
					totalVat: -3,
					sortOrder: 1,
				},
			];

			const totals = calculateInvoiceTotals(lines);

			expect(totals.totalExclVat).toBe(120);
			expect(totals.totalVat).toBe(12);
			expect(totals.totalInclVat).toBe(132);
		});
	});

	describe("calculateTransportAmount", () => {
		it("should return finalPrice when no fees or promotions", () => {
			const parsedRules = { optionalFees: [], promotions: [] };

			const result = calculateTransportAmount(150, parsedRules);

			expect(result).toBe(150);
		});

		it("should subtract optional fees from finalPrice", () => {
			const parsedRules = {
				optionalFees: [
					{ id: "fee1", name: "Fee 1", amount: 15, vatRate: 20, isTaxable: true },
					{ id: "fee2", name: "Fee 2", amount: 25, vatRate: 20, isTaxable: true },
				],
				promotions: [],
			};

			// finalPrice = transport + fees = 150 + 15 + 25 = 190
			const result = calculateTransportAmount(190, parsedRules);

			expect(result).toBe(150); // 190 - 15 - 25
		});

		it("should add back promotions to get transport amount", () => {
			const parsedRules = {
				optionalFees: [],
				promotions: [
					{ id: "promo1", code: "PROMO", discountAmount: 30, discountType: "FIXED" as const },
				],
			};

			// finalPrice = transport - discount = 150 - 30 = 120
			const result = calculateTransportAmount(120, parsedRules);

			expect(result).toBe(150); // 120 + 30
		});

		it("should handle both fees and promotions", () => {
			const parsedRules = {
				optionalFees: [
					{ id: "fee1", name: "Fee", amount: 20, vatRate: 20, isTaxable: true },
				],
				promotions: [
					{ id: "promo1", code: "PROMO", discountAmount: 10, discountType: "FIXED" as const },
				],
			};

			// finalPrice = transport + fee - discount = 150 + 20 - 10 = 160
			const result = calculateTransportAmount(160, parsedRules);

			expect(result).toBe(150); // 160 - 20 + 10
		});

		it("should round to 2 decimal places", () => {
			const parsedRules = {
				optionalFees: [
					{ id: "fee1", name: "Fee", amount: 33.333, vatRate: 20, isTaxable: true },
				],
				promotions: [],
			};

			const result = calculateTransportAmount(183.333, parsedRules);

			expect(result).toBe(150); // Rounded
		});
	});
});
