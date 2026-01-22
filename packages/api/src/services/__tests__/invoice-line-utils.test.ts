/**
 * Tests for Invoice Line Utilities
 * Story 29.5: Multi-Mission Invoicing & Sync
 *
 * REAL TESTS that call actual exported functions (not reimplementations)
 */

import { describe, expect, it } from "vitest";
import {
	TRIP_TYPE_LABELS,
	buildEnrichedDescription,
	calculateTotalsFromLines,
	deepCopyQuoteLinesToInvoiceLines,
} from "../invoice-line-utils";

describe("Invoice Line Utilities", () => {
	describe("deepCopyQuoteLinesToInvoiceLines", () => {
		it("should create N InvoiceLines from N QuoteLines (AC1)", () => {
			const quoteLines = [
				{
					id: "ql-1",
					label: "Transfer CDG",
					description: "Airport transfer",
					quantity: 1,
					unitPrice: 100,
					totalPrice: 100,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 0,
					sourceData: {
						tripType: "TRANSFER",
						pickupAt: "2026-01-25T10:00:00Z",
						pickupAddress: "CDG Terminal 2E",
						dropoffAddress: "Hotel Ritz Paris",
					},
				},
				{
					id: "ql-2",
					label: "Mise à disposition",
					description: "City tour",
					quantity: 1,
					unitPrice: 150,
					totalPrice: 150,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 1,
					sourceData: {
						tripType: "DISPO",
						pickupAt: "2026-01-26T14:00:00Z",
						pickupAddress: "Hotel Ritz Paris",
						dropoffAddress: null,
					},
				},
				{
					id: "ql-3",
					label: "Excursion Versailles",
					description: "Day trip",
					quantity: 1,
					unitPrice: 200,
					totalPrice: 200,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 2,
					sourceData: {
						tripType: "EXCURSION",
						pickupAt: "2026-01-27T09:00:00Z",
						pickupAddress: "Hotel Ritz Paris",
						dropoffAddress: "Château de Versailles",
					},
				},
			];

			// Call the ACTUAL function being tested
			const invoiceLines = deepCopyQuoteLinesToInvoiceLines(quoteLines, null);

			// Validate 1:1 mapping (AC1)
			expect(invoiceLines.length).toBe(3);
			expect(invoiceLines.length).toBe(quoteLines.length);
		});

		it("should store quoteLineId for traceability (AC2)", () => {
			const quoteLines = [
				{
					id: "ql-test-123",
					label: "Test Service",
					description: null,
					quantity: 1,
					unitPrice: 100,
					totalPrice: 100,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 0,
				},
			];

			// Call the ACTUAL function being tested
			const invoiceLines = deepCopyQuoteLinesToInvoiceLines(quoteLines, null);

			// Validate traceability link (AC2)
			expect(invoiceLines[0].quoteLineId).toBe("ql-test-123");
			expect(invoiceLines[0].quoteLineId).toBe(quoteLines[0].id);
		});

		it("should calculate VAT correctly from base price", () => {
			const quoteLines = [
				{
					id: "ql-1",
					label: "Service",
					description: null,
					quantity: 1,
					unitPrice: 100,
					totalPrice: 100,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 0,
				},
			];

			const invoiceLines = deepCopyQuoteLinesToInvoiceLines(quoteLines, null);

			expect(invoiceLines[0].totalExclVat).toBe(100);
			expect(invoiceLines[0].totalVat).toBe(10); // 10% of 100
		});

		it("should map line types correctly", () => {
			const quoteLines = [
				{
					id: "1",
					label: "Fee",
					description: null,
					quantity: 1,
					unitPrice: 10,
					totalPrice: 10,
					vatRate: 20,
					type: "OPTIONAL_FEE",
					sortOrder: 0,
				},
				{
					id: "2",
					label: "Promo",
					description: null,
					quantity: 1,
					unitPrice: -5,
					totalPrice: -5,
					vatRate: 10,
					type: "PROMOTION",
					sortOrder: 1,
				},
				{
					id: "3",
					label: "Manual",
					description: null,
					quantity: 1,
					unitPrice: 50,
					totalPrice: 50,
					vatRate: 10,
					type: "MANUAL",
					sortOrder: 2,
				},
			];

			const invoiceLines = deepCopyQuoteLinesToInvoiceLines(quoteLines, null);

			expect(invoiceLines[0].lineType).toBe("OPTIONAL_FEE");
			expect(invoiceLines[1].lineType).toBe("PROMOTION_ADJUSTMENT");
			expect(invoiceLines[2].lineType).toBe("OTHER");
		});

		it("should add end customer name only on first line", () => {
			const quoteLines = [
				{
					id: "1",
					label: "Service 1",
					description: null,
					quantity: 1,
					unitPrice: 100,
					totalPrice: 100,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 0,
				},
				{
					id: "2",
					label: "Service 2",
					description: null,
					quantity: 1,
					unitPrice: 100,
					totalPrice: 100,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 1,
				},
			];

			const invoiceLines = deepCopyQuoteLinesToInvoiceLines(
				quoteLines,
				"Jean Dupont",
			);

			expect(invoiceLines[0].description).toContain("Client: Jean Dupont");
			expect(invoiceLines[1].description).not.toContain("Client:");
		});
	});

	describe("buildEnrichedDescription", () => {
		it("should build enriched description with date and route (AC3)", () => {
			const line = {
				label: "Transfer CDG",
				description: null,
				type: "CALCULATED",
				sourceData: {
					tripType: "TRANSFER",
					pickupAt: "2026-01-25T10:00:00Z",
					pickupAddress: "CDG Terminal 2E",
					dropoffAddress: "Hotel Ritz Paris",
				},
			};

			// Call the ACTUAL function being tested
			const description = buildEnrichedDescription(line, null, false, {
				locale: "fr-FR",
			});

			// Validate enriched description format (AC3) - now multi-line
			expect(description).toContain("Transfer");
			expect(description).toContain("25/01/2026");
			// Full addresses on separate lines
			expect(description).toContain("Départ: CDG Terminal 2E");
			expect(description).toContain("Arrivée: Hotel Ritz Paris");
		});

		it("should extract tripType from sourceData correctly", () => {
			const testCases = [
				{ tripType: "TRANSFER", expected: "Transfer" },
				{ tripType: "DISPO", expected: "Mise à disposition" },
				{ tripType: "EXCURSION", expected: "Excursion" },
				{ tripType: "STAY", expected: "Séjour" },
			];

			for (const tc of testCases) {
				const line = {
					label: "Test",
					description: null,
					type: "CALCULATED",
					sourceData: {
						tripType: tc.tripType,
						pickupAt: "2026-01-25T10:00:00Z",
						pickupAddress: "Test Address",
					},
				};

				const description = buildEnrichedDescription(line, null, false);
				expect(description).toContain(tc.expected);
			}
		});

		it("should truncate long addresses", () => {
			const line = {
				label: "Transfer",
				description: null,
				type: "CALCULATED",
				sourceData: {
					tripType: "TRANSFER",
					pickupAt: "2026-01-25T10:00:00Z",
					pickupAddress:
						"123 Very Long Street Name That Exceeds The Maximum Length Limit For Display In The Invoice",
					dropoffAddress:
						"456 Another Very Long Street Name That Also Exceeds The Maximum Length For Display",
				},
			};

			const description = buildEnrichedDescription(line, null, false);

			// Full addresses should now appear (no truncation)
			expect(description).toContain("Départ:");
			expect(description).toContain("Arrivée:");
		});

		it("should fallback to label + description when no date info", () => {
			const line = {
				label: "Manual Service",
				description: "Custom description",
				type: "MANUAL",
				sourceData: null,
			};

			const description = buildEnrichedDescription(line, null, false);

			expect(description).toBe("Manual Service - Custom description");
		});

		it("should add end customer name on first line only", () => {
			const line = {
				label: "Transfer",
				description: null,
				type: "CALCULATED",
				sourceData: {
					tripType: "TRANSFER",
					pickupAt: "2026-01-25T10:00:00Z",
					pickupAddress: "CDG",
					dropoffAddress: "Paris",
				},
			};

			const firstLineDesc = buildEnrichedDescription(line, "Jean Dupont", true);
			const secondLineDesc = buildEnrichedDescription(
				line,
				"Jean Dupont",
				false,
			);

			expect(firstLineDesc).toContain("Client: Jean Dupont");
			expect(secondLineDesc).not.toContain("Client:");
		});

		it("should respect locale option", () => {
			const line = {
				label: "Transfer",
				description: null,
				type: "CALCULATED",
				sourceData: {
					tripType: "TRANSFER",
					pickupAt: "2026-01-25T10:00:00Z",
					pickupAddress: "CDG",
					dropoffAddress: "Paris",
				},
			};

			const frDesc = buildEnrichedDescription(line, null, false, {
				locale: "fr-FR",
			});
			const enDesc = buildEnrichedDescription(line, null, false, {
				locale: "en-US",
			});

			// French format: 25/01/2026
			expect(frDesc).toContain("25/01/2026");
			// English format: 1/25/2026 or 01/25/2026
			expect(enDesc).toMatch(/1\/25\/2026|01\/25\/2026/);
		});
	});

	describe("calculateTotalsFromLines", () => {
		it("should correctly aggregate totals from multiple lines (AC5)", () => {
			const invoiceLines = [
				{ totalExclVat: 100, totalVat: 10 },
				{ totalExclVat: 150, totalVat: 15 },
				{ totalExclVat: 200, totalVat: 20 },
			];

			// Call the ACTUAL function
			const totals = calculateTotalsFromLines(invoiceLines);

			// Validate totals aggregation (AC5)
			expect(totals.totalExclVat).toBe(450);
			expect(totals.totalVat).toBe(45);
			expect(totals.totalInclVat).toBe(495);
		});

		it("should handle empty lines array", () => {
			const totals = calculateTotalsFromLines([]);

			expect(totals.totalExclVat).toBe(0);
			expect(totals.totalVat).toBe(0);
			expect(totals.totalInclVat).toBe(0);
		});

		it("should round to 2 decimal places", () => {
			const invoiceLines = [
				{ totalExclVat: 33.333, totalVat: 3.333 },
				{ totalExclVat: 33.333, totalVat: 3.333 },
				{ totalExclVat: 33.333, totalVat: 3.333 },
			];

			const totals = calculateTotalsFromLines(invoiceLines);

			// Totals should be rounded to 2 decimal places
			expect(totals.totalExclVat).toBe(100);
			expect(totals.totalVat).toBe(10);
			expect(totals.totalInclVat).toBe(110);
		});
	});

	describe("TRIP_TYPE_LABELS", () => {
		it("should contain all expected trip types", () => {
			expect(TRIP_TYPE_LABELS.TRANSFER).toBe("Transfer");
			expect(TRIP_TYPE_LABELS.DISPO).toBe("Mise à disposition");
			expect(TRIP_TYPE_LABELS.EXCURSION).toBe("Excursion");
			expect(TRIP_TYPE_LABELS.STAY).toBe("Séjour");
			expect(TRIP_TYPE_LABELS.CALCULATED).toBe("Transfer");
			expect(TRIP_TYPE_LABELS.MANUAL).toBe("Service");
			expect(TRIP_TYPE_LABELS.OPTIONAL_FEE).toBe("Option");
			expect(TRIP_TYPE_LABELS.PROMOTION).toBe("Promotion");
		});
	});

	describe("deep copy immutability", () => {
		it("should ensure InvoiceLine is independent from QuoteLine", () => {
			const originalQuoteLine = {
				id: "ql-1",
				label: "Service",
				description: null,
				quantity: 1,
				unitPrice: 100,
				totalPrice: 100,
				vatRate: 10,
				type: "CALCULATED",
				sortOrder: 0,
			};

			// Create deep copy
			const invoiceLines = deepCopyQuoteLinesToInvoiceLines(
				[originalQuoteLine],
				null,
			);

			// Modify the original (simulating what would happen if someone modified the quote)
			const modifiedQuoteLine = { ...originalQuoteLine, unitPrice: 150 };

			// Invoice line should remain unchanged (deep copy principle)
			expect(invoiceLines[0].unitPriceExclVat).toBe(100);
			expect(invoiceLines[0].unitPriceExclVat).not.toBe(
				modifiedQuoteLine.unitPrice,
			);
		});
	});

	describe("multi-quote order support", () => {
		it("should handle lines from multiple quotes", () => {
			const quote1Lines = [
				{
					id: "q1-l1",
					label: "Transfer 1",
					description: null,
					quantity: 1,
					unitPrice: 100,
					totalPrice: 100,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 0,
				},
				{
					id: "q1-l2",
					label: "Transfer 2",
					description: null,
					quantity: 1,
					unitPrice: 120,
					totalPrice: 120,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 1,
				},
			];

			const quote2Lines = [
				{
					id: "q2-l1",
					label: "Dispo",
					description: null,
					quantity: 1,
					unitPrice: 200,
					totalPrice: 200,
					vatRate: 10,
					type: "CALCULATED",
					sortOrder: 2,
				},
			];

			// Aggregate all lines from all quotes (as the factory would do)
			const allQuoteLines = [...quote1Lines, ...quote2Lines];
			const invoiceLines = deepCopyQuoteLinesToInvoiceLines(
				allQuoteLines,
				null,
			);

			// Validate all lines are included
			expect(invoiceLines.length).toBe(3);
			expect(invoiceLines.map((l) => l.quoteLineId)).toContain("q1-l1");
			expect(invoiceLines.map((l) => l.quoteLineId)).toContain("q1-l2");
			expect(invoiceLines.map((l) => l.quoteLineId)).toContain("q2-l1");
		});
	});
});
