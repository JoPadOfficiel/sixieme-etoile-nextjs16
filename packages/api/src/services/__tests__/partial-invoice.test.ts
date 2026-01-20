import { db } from "@repo/database";
import Decimal from "decimal.js";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceFactory } from "../invoice-factory";

// Mock dependencies
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
		},
		$transaction: vi.fn((callback) => callback(db)),
	},
}));

vi.mock("../commission-service", () => ({
	getCommissionPercent: vi.fn().mockReturnValue(0),
	calculateCommission: vi.fn().mockReturnValue({ commissionAmount: 0 }),
}));

describe("InvoiceFactory.calculateOrderBalance", () => {
	it("should calculate balance correctly with no invoices", async () => {
		vi.mocked(db.order.findFirst).mockResolvedValue({
			id: "order1",
			quotes: [
				{
					finalPrice: new Decimal(1000),
					lines: [
						{ totalPrice: new Decimal(909.09) }, // 1000 TTC approx
					],
				},
			],
			invoices: [],
		} as any);

		const balance = await InvoiceFactory.calculateOrderBalance(
			"order1",
			"org1",
		);

		expect(balance.totalAmount).toBe(1000); // 909.09 * 1.1 ~= 1000
		expect(balance.invoicedAmount).toBe(0);
		expect(balance.remainingBalance).toBe(1000);
	});

	it("should calculate balance correctly with existing invoices", async () => {
		vi.mocked(db.order.findFirst).mockResolvedValue({
			id: "order1",
			quotes: [
				{
					finalPrice: new Decimal(1000),
					lines: [{ totalPrice: new Decimal(909.09) }],
				},
			],
			invoices: [{ totalInclVat: new Decimal(300) }],
		} as any);

		const balance = await InvoiceFactory.calculateOrderBalance(
			"order1",
			"org1",
		);

		expect(balance.totalAmount).toBe(1000);
		expect(balance.invoicedAmount).toBe(300);
		expect(balance.remainingBalance).toBe(700);
	});
});

describe("InvoiceFactory.createPartialInvoice", () => {
	const mockOrder = {
		id: "order1",
		reference: "ORD-001",
		contactId: "contact1",
		quotes: [
			{
				id: "quote1",
				finalPrice: new Decimal(1000),
				lines: [
					{
						id: "line1",
						label: "Service 1",
						quantity: 1,
						unitPrice: 500,
						totalPrice: 500,
						vatRate: 10,
						type: "SERVICE",
					},
					{
						id: "line2",
						label: "Service 2",
						quantity: 1,
						unitPrice: 409.09,
						totalPrice: 409.09,
						vatRate: 10,
						type: "SERVICE",
					},
				],
			},
		],
		contact: { partnerContract: null },
		invoices: [],
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should create DEPOSIT_PERCENT invoice correctly", async () => {
		vi.mocked(db.order.findFirst)
			.mockResolvedValueOnce(mockOrder as any) // For calculateOrderBalance
			.mockResolvedValueOnce(mockOrder as any); // For createPartialInvoice

		vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv1" } as any);
		vi.mocked(db.invoice.findFirst).mockResolvedValue({
			id: "inv1",
			number: "INV-2024-001",
			totalInclVat: 300,
		} as any);

		const result = await InvoiceFactory.createPartialInvoice("order1", "org1", {
			mode: "DEPOSIT_PERCENT",
			depositPercent: 30,
		});

		// 30% of 1000 = 300
		expect(db.invoice.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					totalInclVat: 300,
					notes: expect.stringContaining("Acompte 30%"),
				}),
			}),
		);
	});

	it("should create FULL_BALANCE invoice correctly", async () => {
		// Setup order with existing invoice
		const partialPaidOrder = {
			...mockOrder,
			invoices: [{ totalInclVat: new Decimal(300) }],
		};

		vi.mocked(db.order.findFirst)
			.mockResolvedValueOnce(partialPaidOrder as any) // For calculateOrderBalance
			.mockResolvedValueOnce(partialPaidOrder as any); // For createPartialInvoice

		vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv2" } as any);
		vi.mocked(db.invoice.findFirst).mockResolvedValue({
			id: "inv2",
			number: "INV-2024-001",
		} as any);

		await InvoiceFactory.createPartialInvoice("order1", "org1", {
			mode: "FULL_BALANCE",
		});

		// Total 1000 - Paid 300 = Remaining 700
		expect(db.invoice.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					totalInclVat: 700,
					notes: expect.stringContaining("Solde"),
				}),
			}),
		);
	});

	it("should throw error if deposit exceeds balance", async () => {
		// Setup order with existing invoice of 800
		const heavyPaidOrder = {
			...mockOrder,
			invoices: [{ totalInclVat: new Decimal(800) }],
		};

		vi.mocked(db.order.findFirst).mockResolvedValue(heavyPaidOrder as any);

		await expect(
			InvoiceFactory.createPartialInvoice("order1", "org1", {
				mode: "DEPOSIT_PERCENT",
				depositPercent: 50, // 500 > 200 remaining
			}),
		).rejects.toThrow(/exceeds remaining balance/);
	});
});
