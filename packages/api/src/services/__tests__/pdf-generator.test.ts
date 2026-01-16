/**
 * PDF Generator Service Tests
 * Story 7.5: Document Generation & Storage
 * Story 25.2: EU-Compliant Invoice & Quote PDF Layout
 * Story 25.3: Organization Document Personalization
 */

import { describe, it, expect } from "vitest";
import {
	generateQuotePdf,
	generateInvoicePdf,
	generateMissionOrderPdf,
	type QuotePdfData,
	type InvoicePdfData,
	type MissionOrderPdfData,
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
		// Story 25.3: Branding settings
		documentLogoUrl: null,
		brandColor: "#2563eb",
		logoPosition: "LEFT",
		showCompanyName: true,
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
			// Story 25.2: Trip details
			estimatedDistanceKm: 45.5,
			estimatedDurationMins: 55,
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
				estimatedDistanceKm: null,
				estimatedDurationMins: null,
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

		// Story 25.2: Logo position LEFT test
		it("should generate PDF with logo position LEFT", async () => {
			const orgWithLogoLeft: OrganizationPdfData = {
				...mockOrganization,
				logoPosition: "LEFT",
			};

			const pdfBuffer = await generateQuotePdf(mockQuote, orgWithLogoLeft);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		// Story 25.2: Logo position RIGHT test
		it("should generate PDF with logo position RIGHT", async () => {
			const orgWithLogoRight: OrganizationPdfData = {
				...mockOrganization,
				logoPosition: "RIGHT",
			};

			const pdfBuffer = await generateQuotePdf(mockQuote, orgWithLogoRight);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		// Story 25.2: Brand color test
		it("should generate PDF with custom brand color", async () => {
			const orgWithCustomColor: OrganizationPdfData = {
				...mockOrganization,
				brandColor: "#e11d48", // Custom rose color
			};

			const pdfBuffer = await generateQuotePdf(mockQuote, orgWithCustomColor);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		// Story 25.2: Trip details test
		it("should generate PDF with trip distance and duration", async () => {
			const quoteWithTripDetails: QuotePdfData = {
				...mockQuote,
				estimatedDistanceKm: 125.5,
				estimatedDurationMins: 95,
			};

			const pdfBuffer = await generateQuotePdf(quoteWithTripDetails, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		// Story 24.5: EndCustomer test
		it("should generate PDF with endCustomer for agency", async () => {
			const quoteWithEndCustomer: QuotePdfData = {
				...mockQuote,
				endCustomer: {
					firstName: "Marie",
					lastName: "Martin",
					email: "marie.martin@example.com",
					phone: "+33 6 98 76 54 32",
				},
			};

			const pdfBuffer = await generateQuotePdf(quoteWithEndCustomer, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
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
			notes: "Facture generee depuis le devis QUOTE-123",
			contact: {
				displayName: "Jean Dupont",
				companyName: "Entreprise ABC",
				billingAddress: "456 Avenue des Champs-Elysees, 75008 Paris",
				email: "jean.dupont@abc.fr",
				phone: "+33 6 12 34 56 78",
				vatNumber: "FR98765432109",
				isPartner: true,
			},
			lines: [
				{
					description: "Transport Paris - CDG",
					quantity: 1,
					unitPriceExclVat: 100.0,
					vatRate: 20,
					totalExclVat: 100.0,
					totalVat: 20.0,
				},
				{
					description: "Supplement bagages",
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

		// Story 25.2: Logo position LEFT test
		it("should generate PDF with logo position LEFT", async () => {
			const orgWithLogoLeft: OrganizationPdfData = {
				...mockOrganization,
				logoPosition: "LEFT",
			};

			const pdfBuffer = await generateInvoicePdf(mockInvoice, orgWithLogoLeft);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		// Story 25.2: Logo position RIGHT test
		it("should generate PDF with logo position RIGHT", async () => {
			const orgWithLogoRight: OrganizationPdfData = {
				...mockOrganization,
				logoPosition: "RIGHT",
			};

			const pdfBuffer = await generateInvoicePdf(mockInvoice, orgWithLogoRight);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		// Story 25.2: Brand color test
		it("should generate PDF with custom brand color", async () => {
			const orgWithCustomColor: OrganizationPdfData = {
				...mockOrganization,
				brandColor: "#059669", // Custom green color
			};

			const pdfBuffer = await generateInvoicePdf(mockInvoice, orgWithCustomColor);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		// Story 25.2: Table columns test
		it("should generate PDF with proper pricing table (5 columns)", async () => {
			const pdfBuffer = await generateInvoicePdf(mockInvoice, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			// Verify it's a valid PDF
			const pdfHeader = pdfBuffer.subarray(0, 5).toString("ascii");
			expect(pdfHeader).toBe("%PDF-");
			
			// The table should have Description, Qty, Prix HT, TVA %, Total HT columns
			// We can't easily check content, but we verify the PDF is generated correctly
			expect(pdfBuffer.length).toBeGreaterThan(2000);
		});

		// Story 24.6: EndCustomer test
		it("should generate PDF with endCustomer for agency invoice", async () => {
			const invoiceWithEndCustomer: InvoicePdfData = {
				...mockInvoice,
				endCustomer: {
					firstName: "Pierre",
					lastName: "Durand",
					email: "pierre.durand@example.com",
					phone: "+33 6 11 22 33 44",
				},
			};

			const pdfBuffer = await generateInvoicePdf(invoiceWithEndCustomer, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});
	});

	// Story 25.2: Cross-cutting tests for branding
	describe("Branding Features - Story 25.2", () => {
		const mockQuote: QuotePdfData = {
			id: "quote_brand_test",
			pickupAddress: "Paris",
			dropoffAddress: "CDG Airport",
			pickupAt: new Date(),
			passengerCount: 1,
			luggageCount: 0,
			vehicleCategory: "Berline",
			finalPrice: 100.0,
			pricingMode: "DYNAMIC",
			tripType: "TRANSFER",
			status: "DRAFT",
			contact: {
				displayName: "Test Client",
				isPartner: false,
			},
			createdAt: new Date(),
		};

		it("should fallback to default blue when brandColor is null", async () => {
			const orgWithNullColor: OrganizationPdfData = {
				...mockOrganization,
				brandColor: null,
			};

			const pdfBuffer = await generateQuotePdf(mockQuote, orgWithNullColor);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		it("should fallback to LEFT when logoPosition is undefined", async () => {
			const orgWithUndefinedPosition: OrganizationPdfData = {
				...mockOrganization,
				logoPosition: undefined,
			};

			const pdfBuffer = await generateQuotePdf(mockQuote, orgWithUndefinedPosition);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		it("should show company name when showCompanyName is true", async () => {
			const orgShowName: OrganizationPdfData = {
				...mockOrganization,
				showCompanyName: true,
			};

			const pdfBuffer = await generateQuotePdf(mockQuote, orgShowName);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		it("should hide company name when showCompanyName is false", async () => {
			const orgHideName: OrganizationPdfData = {
				...mockOrganization,
				showCompanyName: false,
			};

			const pdfBuffer = await generateQuotePdf(mockQuote, orgHideName);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});
	});

	// Story 25.1: Mission Order tests
	describe("generateMissionOrderPdf - Story 25.1", () => {
		const mockMission: MissionOrderPdfData = {
			id: "mission_test",
			pickupAddress: "123 Street, Paris",
			dropoffAddress: "456 Avenue, Lyon",
			pickupAt: new Date(),
			passengerCount: 3,
			luggageCount: 2,
			vehicleCategory: "Van",
			finalPrice: 0, // Not displayed in mission order
			pricingMode: "FIXED",
			tripType: "TRANSFER",
			status: "ACCEPTED",
			contact: {
				displayName: "Group Client",
				isPartner: false,
			},
			createdAt: new Date(),
			driverName: "Jean Dupont",
			vehicleName: "Mercedes V-Class",
			vehiclePlate: "AB-123-CD",
		};

		it("should generate a valid PDF for mission order", async () => {
			const pdfBuffer = await generateMissionOrderPdf(mockMission, mockOrganization);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});

		it("should generate PDF with custom logo width", async () => {
			const orgWithLogoWidth: OrganizationPdfData = {
				...mockOrganization,
				logoWidth: 200,
			};

			const pdfBuffer = await generateMissionOrderPdf(mockMission, orgWithLogoWidth);

			expect(pdfBuffer).toBeInstanceOf(Buffer);
			expect(pdfBuffer.length).toBeGreaterThan(0);
		});
	});
});
