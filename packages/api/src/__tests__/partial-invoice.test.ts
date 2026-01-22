import { db } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceFactory } from "../services/invoice-factory";

// Mock database
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
		},
		invoice: {
			findFirst: vi.fn(),
			create: vi.fn(),
			update: vi.fn(),
		},
		invoiceLine: {
			createMany: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(db)),
	},
}));

describe("InvoiceFactory - Partial Invoicing", () => {
	const mockOrderId = "order-123";
	const mockOrganizationId = "org-123";

	const mockOrder = {
		id: mockOrderId,
		organizationId: mockOrganizationId,
		reference: "ORD-2025-001",
		quotes: [
			{
				id: "quote-1",
				status: "ACCEPTED",
				finalPrice: 1000,
				contact: { partnerContract: null },
				lines: [
					{ id: "line-1", totalPrice: 500, label: "Transfer 1", vatRate: 10 },
					{ id: "line-2", totalPrice: 500, label: "Transfer 2", vatRate: 10 },
				],
			},
		],
		invoices: [],
		contact: {
			partnerContract: null,
		},
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("calculateOrderBalance", () => {
		it("should return correct balance when no invoices exist", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);

			const balance = await InvoiceFactory.calculateOrderBalance(
				mockOrderId,
				mockOrganizationId,
			);

			// 1000 + 10% VAT approx = 1100
			expect(balance.totalAmount).toBe(1100);
			expect(balance.invoicedAmount).toBe(0);
			expect(balance.remainingBalance).toBe(1100);
		});

		it("should return correct balance with existing invoices", async () => {
			const orderWithInvoice = {
				...mockOrder,
				invoices: [{ totalInclVat: 330 }],
			};
			vi.mocked(db.order.findFirst).mockResolvedValue(orderWithInvoice as any);

			const balance = await InvoiceFactory.calculateOrderBalance(
				mockOrderId,
				mockOrganizationId,
			);

			expect(balance.totalAmount).toBe(1100);
			expect(balance.invoicedAmount).toBe(330);
			expect(balance.remainingBalance).toBe(770);
		});
	});

	describe("createPartialInvoice", () => {
		it("should create deposit invoice correctly", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.invoice.findFirst).mockResolvedValue(null); // No last invoice
			vi.mocked(db.invoice.create).mockResolvedValue({
				id: "inv-new",
				number: "INV-2025-0001",
			} as any);

			const result = await InvoiceFactory.createPartialInvoice(
				mockOrderId,
				mockOrganizationId,
				{
					mode: "DEPOSIT_PERCENT",
					depositPercent: 30,
				},
			);

			// 30% of 1100 = 330
			expect(db.invoice.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						totalInclVat: 330,
						commissionAmount: null,
					}),
				}),
			);
		});

		it("should create full balance invoice correctly", async () => {
			const orderWithInvoice = {
				...mockOrder,
				invoices: [{ totalInclVat: 330 }], // 330 paid
			};
			vi.mocked(db.order.findFirst).mockResolvedValue(orderWithInvoice as any);
			vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv-new" } as any);

			const result = await InvoiceFactory.createPartialInvoice(
				mockOrderId,
				mockOrganizationId,
				{
					mode: "FULL_BALANCE",
				},
			);

			// Remaining: 1100 - 330 = 770
			expect(db.invoice.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						totalInclVat: 770,
					}),
				}),
			);
		});

		it("should throw if deposit amount exceeds balance", async () => {
			const orderWithInvoice = {
				...mockOrder,
				invoices: [{ totalInclVat: 1000 }], // Almost fully paid
			};
			vi.mocked(db.order.findFirst).mockResolvedValue(orderWithInvoice as any);

			await expect(
				InvoiceFactory.createPartialInvoice(mockOrderId, mockOrganizationId, {
					mode: "DEPOSIT_PERCENT",
					depositPercent: 50, // Would be 550, but only 100 left
				}),
			).rejects.toThrow(/exceeds remaining balance/);
		});
	});
});
