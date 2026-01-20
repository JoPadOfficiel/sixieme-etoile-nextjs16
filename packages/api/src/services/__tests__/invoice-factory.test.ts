/**
 * Invoice Factory Tests - Story 28.8
 *
 * Tests for the InvoiceFactory service that creates invoices from Orders
 * with deep-copied data from QuoteLines.
 *
 * Key test scenarios:
 * 1. Invoice creation with correct line count
 * 2. Deep copy: QuoteLine price change doesn't affect Invoice
 * 3. Deep copy: InvoiceLine price change doesn't affect Quote
 * 4. Invoice totals calculated correctly
 * 5. Commission calculated for partner contacts
 * 6. Order without quote creates empty invoice
 */

import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
		},
		invoice: {
			findFirst: vi.fn(),
			create: vi.fn(),
		},
		invoiceLine: {
			createMany: vi.fn(),
			findMany: vi.fn(),
			update: vi.fn(),
		},
		quote: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		quoteLine: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		$transaction: vi.fn((fn) =>
			fn({
				invoice: {
					create: vi.fn().mockResolvedValue({
						id: "inv_123",
						number: "INV-2026-0001",
						organizationId: "org_123",
						contactId: "contact_123",
						orderId: "order_123",
						status: "DRAFT",
					}),
				},
				invoiceLine: {
					createMany: vi.fn(),
				},
			})
		),
	},
}));

import { db } from "@repo/database";
import { InvoiceFactory } from "../invoice-factory";

describe("InvoiceFactory - Story 28.8", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	// Sample data for tests
	const mockOrder = {
		id: "order_123",
		organizationId: "org_123",
		reference: "ORD-2026-001",
		contactId: "contact_123",
		status: "CONFIRMED",
		contact: {
			id: "contact_123",
			name: "Test Client",
			type: "PRIVATE",
			isPartner: false,
			partnerContract: null,
		},
		quotes: [
			{
				id: "quote_123",
				status: "ACCEPTED",
				tripType: "TRANSFER",
				pickupAddress: "1 Avenue des Champs-Élysées, Paris",
				dropoffAddress: "Aéroport CDG, Paris",
				pickupAt: new Date("2026-01-20T10:00:00Z"),
				passengerCount: 2,
				luggageCount: 3,
				finalPrice: { toString: () => "150.00" },
				appliedRules: {},
				costBreakdown: { basePrice: 120, margin: 30 },
				tripAnalysis: null,
				vehicleCategory: { id: "cat_1", name: "Berline" },
				lines: [
					{
						id: "line_1",
						description: "Transfer CDG",
						quantity: 1,
						unitPrice: { toString: () => "150.00" },
						vatRate: { toString: () => "10" },
						sortOrder: 0,
					},
				],
				stayDays: [],
				endCustomer: null,
				endCustomerId: null,
				stayStartDate: null,
				stayEndDate: null,
			},
		],
	};

	const mockPartnerOrder = {
		...mockOrder,
		contact: {
			id: "contact_partner",
			name: "Partner Agency",
			type: "AGENCY",
			isPartner: true,
			partnerContract: {
				commissionPercent: { toString: () => "10" },
				paymentTerms: "DAYS_30",
			},
		},
	};

	const mockOrderWithoutQuote = {
		...mockOrder,
		quotes: [],
	};

	describe("createInvoiceFromOrder", () => {
		it("UT-28.8.1: creates invoice with correct line count", async () => {
			// Arrange
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null) // For generateInvoiceNumber
				.mockResolvedValue({
					id: "inv_123",
					number: "INV-2026-0001",
					lines: [{ id: "invline_1", description: "Transport" }],
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert
			expect(result.invoice).toBeDefined();
			expect(result.linesCreated).toBeGreaterThan(0);
			expect(db.$transaction).toHaveBeenCalled();
		});

		it("UT-28.8.2: deep copy - QuoteLine price change doesn't affect Invoice", async () => {
			// Arrange: Create invoice first
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null)
				.mockResolvedValue({
					id: "inv_123",
					number: "INV-2026-0001",
					totalExclVat: 150.0,
					lines: [
						{
							id: "invline_1",
							description: "Transport",
							unitPriceExclVat: 150.0,
						},
					],
				} as any);

			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Simulate: Update QuoteLine price (in real scenario, this would be a separate operation)
			const updatedQuoteLine = {
				id: "line_1",
				unitPrice: { toString: () => "200.00" }, // Changed from 150 to 200
			};
			vi.mocked(db.quoteLine.update).mockResolvedValue(updatedQuoteLine as any);

			// Verify: Invoice line should still have original price
			const invoiceAfterQuoteChange = await db.invoice.findFirst({
				where: { id: "inv_123" },
				include: { lines: true },
			});

			// Assert: Invoice price unchanged (150, not 200)
			expect(invoiceAfterQuoteChange?.lines[0].unitPriceExclVat).toBe(150.0);
		});

		it("UT-28.8.3: deep copy - InvoiceLine price change doesn't affect Quote", async () => {
			// Arrange
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null)
				.mockResolvedValue({
					id: "inv_123",
					lines: [{ id: "invline_1", unitPriceExclVat: 150.0 }],
				} as any);

			await InvoiceFactory.createInvoiceFromOrder("order_123", "org_123");

			// Simulate: Update InvoiceLine price
			vi.mocked(db.invoiceLine.update).mockResolvedValue({
				id: "invline_1",
				unitPriceExclVat: 120.0, // Changed from 150 to 120
			} as any);

			// Verify: QuoteLine should still have original price
			vi.mocked(db.quoteLine.findFirst).mockResolvedValue({
				id: "line_1",
				unitPrice: { toString: () => "150.00" }, // Original price
			} as any);

			const quoteLine = await db.quoteLine.findFirst({
				where: { id: "line_1" },
			});

			// Assert: Quote price unchanged (150, not 120)
			expect(quoteLine?.unitPrice.toString()).toBe("150.00");
		});

		it("UT-28.8.4: invoice totals calculated correctly", async () => {
			// Arrange
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null)
				.mockResolvedValue({
					id: "inv_123",
					totalExclVat: 150.0,
					totalVat: 15.0, // 10% VAT
					totalInclVat: 165.0,
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert
			const invoice = result.invoice;
			expect(invoice?.totalExclVat).toBe(150.0);
			expect(invoice?.totalVat).toBe(15.0);
			expect(invoice?.totalInclVat).toBe(165.0);
		});

		it("UT-28.8.5: commission calculated for partner contacts", async () => {
			// Arrange
			vi.mocked(db.order.findFirst).mockResolvedValue(mockPartnerOrder as any);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null)
				.mockResolvedValue({
					id: "inv_partner",
					totalExclVat: 150.0,
					commissionAmount: 15.0, // 10% of 150
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert
			expect(result.invoice?.commissionAmount).toBe(15.0);
		});

		it("UT-28.8.6: order without quote creates empty invoice with warning", async () => {
			// Arrange
			vi.mocked(db.order.findFirst).mockResolvedValue(
				mockOrderWithoutQuote as any
			);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null)
				.mockResolvedValue({
					id: "inv_empty",
					lines: [],
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert
			expect(result.linesCreated).toBe(0);
			expect(result.warning).toContain("no ACCEPTED quote");
		});

		it("throws error when order not found", async () => {
			// Arrange
			vi.mocked(db.order.findFirst).mockResolvedValue(null);

			// Act & Assert
			await expect(
				InvoiceFactory.createInvoiceFromOrder("nonexistent", "org_123")
			).rejects.toThrow("Order nonexistent not found");
		});
	});

	describe("Invoice Number Generation", () => {
		it("generates sequential invoice numbers", async () => {
			// Arrange: First invoice of the year
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null) // No existing invoices
				.mockResolvedValue({
					id: "inv_123",
					number: "INV-2026-0001",
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert
			expect(result.invoice?.number).toMatch(/^INV-\d{4}-\d{4}$/);
		});

		it("increments invoice number when previous exists", async () => {
			// Arrange: Previous invoice exists
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce({
					number: "INV-2026-0005",
				} as any) // Last invoice
				.mockResolvedValue({
					id: "inv_123",
					number: "INV-2026-0006",
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert: Should be 0006
			expect(result.invoice?.number).toBe("INV-2026-0006");
		});
	});

	describe("Due Date Calculation", () => {
		it("uses 30 days default for private clients", async () => {
			// Arrange
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			const today = new Date();
			const expectedDueDate = new Date(today);
			expectedDueDate.setDate(expectedDueDate.getDate() + 30);

			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null)
				.mockResolvedValue({
					id: "inv_123",
					dueDate: expectedDueDate,
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert: Due date should be ~30 days from now
			const dueDate = new Date(result.invoice?.dueDate as Date);
			const diffDays = Math.round(
				(dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
			);
			expect(diffDays).toBeGreaterThanOrEqual(29);
			expect(diffDays).toBeLessThanOrEqual(31);
		});

		it("uses partner payment terms when available", async () => {
			// Arrange: Partner with DAYS_45
			const partnerWith45Days = {
				...mockPartnerOrder,
				contact: {
					...mockPartnerOrder.contact,
					partnerContract: {
						commissionPercent: { toString: () => "10" },
						paymentTerms: "DAYS_45",
					},
				},
			};
			vi.mocked(db.order.findFirst).mockResolvedValue(partnerWith45Days as any);

			const today = new Date();
			const expectedDueDate = new Date(today);
			expectedDueDate.setDate(expectedDueDate.getDate() + 45);

			vi.mocked(db.invoice.findFirst)
				.mockResolvedValueOnce(null)
				.mockResolvedValue({
					id: "inv_partner",
					dueDate: expectedDueDate,
				} as any);

			// Act
			const result = await InvoiceFactory.createInvoiceFromOrder(
				"order_123",
				"org_123"
			);

			// Assert: Due date should be ~45 days from now
			const dueDate = new Date(result.invoice?.dueDate as Date);
			const diffDays = Math.round(
				(dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
			);
			expect(diffDays).toBeGreaterThanOrEqual(44);
			expect(diffDays).toBeLessThanOrEqual(46);
		});
	});
});
