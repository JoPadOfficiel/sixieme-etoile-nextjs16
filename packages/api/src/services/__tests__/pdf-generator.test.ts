/**
 * PDF Generator Service Tests
 * Story 7.5: Document Generation & Storage
 */

import { describe, it, expect } from "vitest";
import {
	generateQuotePdf,
	generateInvoicePdf,
	type QuotePdfData,
	type InvoicePdfData,
	type OrganizationPdfData,
} from "../pdf-generator";

describe("PDF Generator Service", () => {
	const mockOrganization: OrganizationPdfData = {
		name: "Test VTC Company",
		address: "123 Rue de Paris, 75001 Paris",
		phone: "+33 1 23 45 67 89",
		email: "contact@testvtc.fr",
		siret: "12345678901234",
		vatNumber: "FR12345678901",
		iban: "FR7612345678901234567890123",
		bic: "TESTFRPP",
		logo: null,
	};

	describe("generateQuotePdf", () => {
		const mockQuote: QuotePdfData = {
			id: "quote_123456789",
			pickupAddress: "1 Place de la Concorde, 75008 Paris",
			dropoffAddress: "Aéroport Charles de Gaulle, Terminal 2E",
			pickupAt: new Date("2025-01-15T10:00:00Z"),
			passengerCount: 2,
			luggageCount: 3,
			vehicleCategory: "Berline Premium",
			finalPrice: 150.0,
			internalCost: 80.0,
			marginPercent: 46.67,
			pricingMode: "FIXED_GRID",
			tripType: "TRANSFER",
			status: "SENT",
			validUntil: new Date("2025-02-15T10:00:00Z"),
			notes: "Client VIP - Accueil avec pancarte",
			contact: {
				displayName: "Jean Dupont",
				companyName: "Entreprise ABC",
				billingAddress: "456 Avenue des Champs-Élysées, 75008 Paris",
				email: "jean.dupont@abc.fr",
				phone: "+33 6 12 34 56 78",
				vatNumber: "FR98765432109",
				isPartner: true,
			},
			createdAt: new Date("2025-01-10T14:30:00Z"),
		};

		it("should generate a valid PDF buffer for a quote", async () => {
			const pdfBuffer = await generateQuotePdf(mockQuote, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);

			// Check PDF header magic bytes (%PDF-)
			const pdfHeader = pdfBuffer.subarray(0, 5).toString("ascii");
			expect(pdfHeader).toBe("%PDF-");
		});

		it("should generate PDF without optional fields", async () => {
			const minimalQuote: QuotePdfData = {
				...mockQuote,
				validUntil: null,
				notes: null,
				internalCost: null,
				marginPercent: null,
				contact: {
					...mockQuote.contact,
					companyName: null,
					billingAddress: null,
					vatNumber: null,
				},
			};

			const pdfBuffer = await generateQuotePdf(minimalQuote, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		it("should generate PDF with different statuses", async () => {
			const statuses = ["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"];

			for (const status of statuses) {
				const quoteWithStatus = { ...mockQuote, status };
				const pdfBuffer = await generateQuotePdf(quoteWithStatus, mockOrganization);

				expect(pdfBuffer).toBeInstanceOf(Buffer);
				expect(pdfBuffer.length).toBeGreaterThan(0);
			}
		});
	});

	describe("generateInvoicePdf", () => {
		const mockInvoice: InvoicePdfData = {
			id: "invoice_987654321",
			number: "FAC-2025-0001",
			issueDate: new Date("2025-01-15T00:00:00Z"),
			dueDate: new Date("2025-02-14T00:00:00Z"),
			totalExclVat: 125.0,
			totalVat: 25.0,
			totalInclVat: 150.0,
			commissionAmount: 12.5,
			notes: "Facture générée depuis le devis QUOTE-123",
			contact: {
				displayName: "Jean Dupont",
				companyName: "Entreprise ABC",
				billingAddress: "456 Avenue des Champs-Élysées, 75008 Paris",
				email: "jean.dupont@abc.fr",
				phone: "+33 6 12 34 56 78",
				vatNumber: "FR98765432109",
				isPartner: true,
			},
			lines: [
				{
					description: "Transport Paris → CDG",
					quantity: 1,
					unitPriceExclVat: 100.0,
					vatRate: 20,
					totalExclVat: 100.0,
					totalVat: 20.0,
				},
				{
					description: "Supplément bagages",
					quantity: 1,
					unitPriceExclVat: 25.0,
					vatRate: 20,
					totalExclVat: 25.0,
					totalVat: 5.0,
				},
			],
			paymentTerms: "30 jours",
		};

		it("should generate a valid PDF buffer for an invoice", async () => {
			const pdfBuffer = await generateInvoicePdf(mockInvoice, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);

			// Check PDF header magic bytes (%PDF-)
			const pdfHeader = pdfBuffer.subarray(0, 5).toString("ascii");
			expect(pdfHeader).toBe("%PDF-");
		});

		it("should generate PDF without commission", async () => {
			const invoiceWithoutCommission: InvoicePdfData = {
				...mockInvoice,
				commissionAmount: null,
				contact: {
					...mockInvoice.contact,
					isPartner: false,
				},
			};

			const pdfBuffer = await generateInvoicePdf(invoiceWithoutCommission, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		it("should generate PDF with multiple line items", async () => {
			const invoiceWithManyLines: InvoicePdfData = {
				...mockInvoice,
				lines: [
					...mockInvoice.lines,
					{
						description: "Attente aéroport (30 min)",
						quantity: 1,
						unitPriceExclVat: 15.0,
						vatRate: 20,
						totalExclVat: 15.0,
						totalVat: 3.0,
					},
					{
						description: "Remise fidélité",
						quantity: 1,
						unitPriceExclVat: -10.0,
						vatRate: 20,
						totalExclVat: -10.0,
						totalVat: -2.0,
					},
				],
			};

			const pdfBuffer = await generateInvoicePdf(invoiceWithManyLines, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		it("should generate PDF without optional organization fields", async () => {
			const minimalOrg: OrganizationPdfData = {
				name: "Simple VTC",
				address: null,
				phone: null,
				email: null,
				siret: null,
				vatNumber: null,
				iban: null,
				bic: null,
				logo: null,
			};

			const pdfBuffer = await generateInvoicePdf(mockInvoice, minimalOrg);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});
	});
});
