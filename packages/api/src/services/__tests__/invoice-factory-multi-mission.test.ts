/**
 * Invoice Factory Multi-Mission Tests
 * Story 29.5: Implement Multi-Mission Invoicing & Sync
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import Decimal from "decimal.js";
import { InvoiceFactory } from "../invoice-factory";
import { db } from "@repo/database";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
		},
		invoice: {
			create: vi.fn(),
			findFirst: vi.fn(),
		},
		invoiceLine: {
			createMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

describe("InvoiceFactory - Multi-Mission (Story 29.5)", () => {
	const mockOrderId = "order-multi-mission";
	const mockOrganizationId = "org-123";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Multi-Quote Support", () => {
		it("should aggregate lines from all accepted quotes", async () => {
			// Mock order with multiple accepted quotes
			const mockOrder = {
				id: mockOrderId,
				organizationId: mockOrganizationId,
				reference: "ORD-MULTI-001",
				contact: {
					id: "contact-123",
					type: "AGENCY",
					partnerContract: { paymentTerms: "30" },
				},
				quotes: [
					{
						id: "quote-1",
						status: "ACCEPTED",
						finalPrice: new Decimal(150.0),
						totalExclVat: new Decimal(136.36),
						totalVat: new Decimal(13.64),
						appliedRules: JSON.stringify({ optionalFees: [], promotions: [] }),
						tripType: "TRANSFER",
						pickupAddress: "CDG Airport",
						dropoffAddress: "Paris",
						pickupAt: new Date("2026-01-25T10:00:00Z"),
						passengerCount: 2,
						luggageCount: 2,
						vehicleCategory: { name: "Berline" },
						endCustomer: { firstName: "John", lastName: "Doe" },
						lines: [
							{
								id: "line-1",
								label: "Transfert CDG → Paris",
								description: "Aéroport à hôtel",
								quantity: new Decimal(1),
								unitPrice: new Decimal(136.36),
								totalPrice: new Decimal(136.36),
								vatRate: new Decimal(10),
								type: "CALCULATED",
								sortOrder: 0,
								sourceData: {
									tripType: "TRANSFER",
									pickupAt: "2026-01-25T10:00:00Z",
									pickupAddress: "CDG Airport Terminal 2E",
									dropoffAddress: "Hotel Ritz Paris",
								},
							},
						],
						stayDays: [],
					},
					{
						id: "quote-2",
						status: "ACCEPTED",
						finalPrice: new Decimal(200.0),
						totalExclVat: new Decimal(181.82),
						totalVat: new Decimal(18.18),
						appliedRules: JSON.stringify({ optionalFees: [], promotions: [] }),
						tripType: "DISPO",
						pickupAddress: "Paris",
						dropoffAddress: "Versailles",
						pickupAt: new Date("2026-01-26T14:00:00Z"),
						passengerCount: 4,
						luggageCount: 4,
						vehicleCategory: { name: "VAN_PREMIUM" },
						endCustomer: { firstName: "John", lastName: "Doe" },
						lines: [
							{
								id: "line-2",
								label: "Mise à disposition Paris",
								description: "Journée complète",
								quantity: new Decimal(1),
								unitPrice: new Decimal(181.82),
								totalPrice: new Decimal(181.82),
								vatRate: new Decimal(10),
								type: "CALCULATED",
								sortOrder: 1,
								sourceData: {
									tripType: "DISPO",
									pickupAt: "2026-01-26T14:00:00Z",
									pickupAddress: "Paris Centre",
									dropoffAddress: "Versailles Château",
								},
							},
						],
						stayDays: [],
					},
				],
				invoices: [],
			};

			const mockInvoice = {
				id: "invoice-123",
				number: "INV-2026-0001",
				status: "DRAFT",
				totalExclVat: new Decimal(318.18),
				totalVat: new Decimal(31.82),
				totalInclVat: new Decimal(350.00),
				contact: {},
				endCustomer: null,
				lines: [],
			};

			// Mock database responses
			const mockDb = {
				invoice: {
					create: vi.fn().mockResolvedValue(mockInvoice),
				},
				invoiceLine: {
					createMany: vi.fn().mockResolvedValue({ count: 2 }),
				},
			};
			
			(db.order.findFirst as any).mockResolvedValue(mockOrder);
			(db.$transaction as any).mockImplementation(async (callback: any) => {
				return await callback(mockDb);
			});
			(db.invoice.findFirst as any).mockResolvedValue(mockInvoice);

			// Execute
			const result = await InvoiceFactory.createInvoiceFromOrder(
				mockOrderId,
				mockOrganizationId,
			);

			// Verify
			expect(result.linesCreated).toBe(2);
			expect(result.invoice?.totalExclVat.toString()).toBe("318.18");
			expect(result.invoice?.totalVat.toString()).toBe("31.82");
			expect(result.invoice?.totalInclVat.toString()).toBe("350");

			// Verify createMany was called with quoteLineId
			expect(mockDb.invoiceLine.createMany).toHaveBeenCalledWith({
				data: expect.arrayContaining([
					expect.objectContaining({
						quoteLineId: "line-1",
						description: expect.stringContaining("Transfer - 25/01/2026"),
					}),
					expect.objectContaining({
						quoteLineId: "line-2",
						description: expect.stringContaining("Mise à disposition - 26/01/2026"),
					}),
				]),
			});
		});
	});

	describe("Enriched Descriptions", () => {
		it("should format descriptions with date and route", async () => {
			const mockOrder = {
				id: mockOrderId,
				organizationId: mockOrganizationId,
				reference: "ORD-DESC-001",
				contact: {
					id: "contact-123",
					type: "AGENCY",
					partnerContract: { paymentTerms: "30" },
				},
				quotes: [
					{
						id: "quote-1",
						status: "ACCEPTED",
						finalPrice: new Decimal(150.0),
						totalExclVat: new Decimal(136.36),
						totalVat: new Decimal(13.64),
						appliedRules: JSON.stringify({ optionalFees: [], promotions: [] }),
						tripType: "TRANSFER",
						pickupAddress: "CDG Airport",
						dropoffAddress: "Paris",
						pickupAt: new Date("2026-01-25T10:00:00Z"),
						passengerCount: 2,
						luggageCount: 2,
						vehicleCategory: { name: "Berline" },
						endCustomer: { firstName: "John", lastName: "Doe" },
						lines: [
							{
								id: "line-1",
								label: "Transfert CDG → Paris",
								description: "Aéroport à hôtel",
								quantity: new Decimal(1),
								unitPrice: new Decimal(136.36),
								totalPrice: new Decimal(136.36),
								vatRate: new Decimal(10),
								type: "CALCULATED",
								sortOrder: 0,
								sourceData: {
									tripType: "TRANSFER",
									pickupAt: "2026-01-25T10:00:00Z",
									pickupAddress: "CDG Airport Terminal 2E",
									dropoffAddress: "Hotel Ritz Paris, Place Vendôme",
								},
							},
						],
						stayDays: [],
					},
				],
				invoices: [],
			};

			const mockInvoice = {
				id: "invoice-123",
				number: "INV-2026-0001",
				status: "DRAFT",
				totalExclVat: new Decimal(136.36),
				totalVat: new Decimal(13.64),
				totalInclVat: new Decimal(150.00),
				contact: {},
				endCustomer: null,
				lines: [],
			};

			const mockDb = {
				invoice: {
					create: vi.fn().mockResolvedValue(mockInvoice),
				},
				invoiceLine: {
					createMany: vi.fn().mockResolvedValue({ count: 1 }),
				},
			};

			(db.order.findFirst as any).mockResolvedValue(mockOrder);
			(db.$transaction as any).mockImplementation(async (callback: any) => {
				return await callback(mockDb);
			});
			(db.invoice.findFirst as any).mockResolvedValue(mockInvoice);

			const result = await InvoiceFactory.createInvoiceFromOrder(
				mockOrderId,
				mockOrganizationId,
			);

			// Should format enriched description with date and route
			expect(mockDb.invoiceLine.createMany).toHaveBeenCalledWith({
				data: expect.arrayContaining([
					expect.objectContaining({
						quoteLineId: "line-1",
						description: expect.stringContaining("Transfer - 25/01/2026"),
					}),
				]),
			});
		});
	});

	describe("quoteLineId Traceability", () => {
		it("should store quoteLineId for each invoice line", async () => {
			const mockOrder = {
				id: mockOrderId,
				organizationId: mockOrganizationId,
				reference: "ORD-TRACE-001",
				contact: {
					id: "contact-123",
					type: "AGENCY",
					partnerContract: { paymentTerms: "30" },
				},
				quotes: [
					{
						id: "quote-1",
						status: "ACCEPTED",
						finalPrice: new Decimal(150.0),
						totalExclVat: new Decimal(136.36),
						totalVat: new Decimal(13.64),
						appliedRules: JSON.stringify({ optionalFees: [], promotions: [] }),
						tripType: "TRANSFER",
						pickupAddress: "CDG Airport",
						dropoffAddress: "Paris",
						pickupAt: new Date("2026-01-25T10:00:00Z"),
						passengerCount: 2,
						luggageCount: 2,
						vehicleCategory: { name: "Berline" },
						endCustomer: { firstName: "John", lastName: "Doe" },
						lines: [
							{
								id: "line-1",
								label: "Transfert principal",
								description: "Aéroport à hôtel",
								quantity: new Decimal(1),
								unitPrice: new Decimal(100.00),
								totalPrice: new Decimal(100.00),
								vatRate: new Decimal(10),
								type: "CALCULATED",
								sortOrder: 0,
							},
							{
								id: "line-2",
								label: "Supplément bagages",
								description: "Bagages supplémentaires",
								quantity: new Decimal(2),
								unitPrice: new Decimal(18.18),
								totalPrice: new Decimal(36.36),
								vatRate: new Decimal(10),
								type: "OPTIONAL_FEE",
								sortOrder: 1,
							},
						],
						stayDays: [],
					},
				],
				invoices: [],
			};

			const mockInvoice = {
				id: "invoice-123",
				number: "INV-2026-0001",
				status: "DRAFT",
				totalExclVat: new Decimal(136.36),
				totalVat: new Decimal(13.64),
				totalInclVat: new Decimal(150.00),
				contact: {},
				endCustomer: null,
				lines: [],
			};

			const mockDb = {
				invoice: {
					create: vi.fn().mockResolvedValue(mockInvoice),
				},
				invoiceLine: {
					createMany: vi.fn().mockResolvedValue({ count: 2 }),
				},
			};
			
			(db.order.findFirst as any).mockResolvedValue(mockOrder);
			(db.$transaction as any).mockImplementation(async (callback: any) => {
				return await callback(mockDb);
			});
			(db.invoice.findFirst as any).mockResolvedValue(mockInvoice);

			const result = await InvoiceFactory.createInvoiceFromOrder(
				mockOrderId,
				mockOrganizationId,
			);

			// Verify both lines have quoteLineId
			expect(mockDb.invoiceLine.createMany).toHaveBeenCalledWith({
				data: expect.arrayContaining([
					expect.objectContaining({
						quoteLineId: "line-1",
						lineType: "SERVICE",
					}),
					expect.objectContaining({
						quoteLineId: "line-2",
						lineType: "OPTIONAL_FEE",
					}),
				]),
			});
		});
	});
});
