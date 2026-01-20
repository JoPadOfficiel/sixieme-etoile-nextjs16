/**
 * Pending Charges Service Tests
 * Story 28.12: Post-Mission Pending Charges
 */

import { db } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChargesService } from "../services/pending-charges";

// Mock dependencies
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
		},
		invoice: {
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		invoiceLine: {
			create: vi.fn(),
			findMany: vi.fn(),
		},
	},
}));

describe("PendingChargesService", () => {
	const mockOrderId = "order-123";
	const mockOrgId = "org-123";

	beforeEach(() => {
		vi.resetAllMocks();
	});

	describe("detectPendingCharges", () => {
		it("should return empty list when no missions have execution data", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue({
				id: mockOrderId,
				missions: [
					{
						id: "mission-1",
						executionData: null,
					},
				],
				invoices: [],
			} as any);

			const result = await PendingChargesService.detectPendingCharges(
				mockOrderId,
				mockOrgId,
			);

			expect(result.pendingCharges).toHaveLength(0);
			expect(result.totalPending).toBe(0);
		});

		it("should detect waiting time charges", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue({
				id: mockOrderId,
				missions: [
					{
						id: "mission-1",
						sourceData: { pickupAddress: "Paris" },
						executionData: {
							waitingTimeMinutes: 25, // 25 - 15 = 10 min billable
						},
					},
				],
				invoices: [],
			} as any);

			const result = await PendingChargesService.detectPendingCharges(
				mockOrderId,
				mockOrgId,
			);

			expect(result.pendingCharges).toHaveLength(1);
			expect(result.pendingCharges[0]).toMatchObject({
				type: "WAITING_TIME",
				amount: 5.0, // 10 min * 0.50
				missionId: "mission-1",
			});
		});

		it("should ignore waiting time below threshold", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue({
				id: mockOrderId,
				missions: [
					{
						id: "mission-1",
						executionData: {
							waitingTimeMinutes: 10, // Included
						},
					},
				],
				invoices: [],
			} as any);

			const result = await PendingChargesService.detectPendingCharges(
				mockOrderId,
				mockOrgId,
			);

			expect(result.pendingCharges).toHaveLength(0);
		});

		it("should detect extra kilometers", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue({
				id: mockOrderId,
				missions: [
					{
						id: "mission-1",
						sourceData: {
							pickupAddress: "A",
							dropoffAddress: "B",
							estimatedDistance: 10,
						},
						executionData: {
							actualDistanceKm: 15, // +5 km
						},
					},
				],
				invoices: [],
			} as any);

			const result = await PendingChargesService.detectPendingCharges(
				mockOrderId,
				mockOrgId,
			);

			expect(result.pendingCharges).toHaveLength(1);
			expect(result.pendingCharges[0]).toMatchObject({
				type: "EXTRA_KM",
				amount: 10.0, // 5 km * 2.0
				missionId: "mission-1",
			});
		});

		it("should ignore already invoiced charges", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue({
				id: mockOrderId,
				missions: [
					{
						id: "mission-1",
						sourceData: { pickupAddress: "Paris", dropoffAddress: "Lyon" },
						executionData: {
							waitingTimeMinutes: 30, // 15 min billable = 7.50
						},
					},
				],
				invoices: [
					{
						lines: [
							{
								description: "Waiting Time (15 min) - Paris → Lyon", // Already invoiced
							},
						],
					},
				],
			} as any);

			const result = await PendingChargesService.detectPendingCharges(
				mockOrderId,
				mockOrgId,
			);

			expect(result.pendingCharges).toHaveLength(0);
		});
	});

	describe("addChargeToInvoice", () => {
		it("should create invoice line and update totals", async () => {
			const mockInvoiceId = "inv-123";
			const mockCharge = {
				id: "charge-1",
				orderId: mockOrderId,
				missionId: "mission-1",
				missionLabel: "Paris",
				type: "WAITING_TIME",
				description: "Waiting Time",
				amount: 11.0, // TTC
				vatRate: 10,
				invoiced: false,
			};

			vi.mocked(db.invoice.findFirst).mockResolvedValue({
				id: mockInvoiceId,
				lines: [{ sortOrder: 1 }],
			} as any);

			vi.mocked(db.invoiceLine.create).mockResolvedValue({
				id: "line-new",
			} as any);
			vi.mocked(db.invoiceLine.findMany).mockResolvedValue([
				{ totalExclVat: 10, totalVat: 1 }, // Existing line
				{ totalExclVat: 10, totalVat: 1 }, // New line
			] as any);

			await PendingChargesService.addChargeToInvoice(
				mockCharge as any,
				mockInvoiceId,
				mockOrgId,
			);

			expect(db.invoiceLine.create).toHaveBeenCalledWith(
				expect.objectContaining({
					data: expect.objectContaining({
						invoiceId: mockInvoiceId,
						description: "Waiting Time - Paris",
						vatRate: 10,
						unitPriceExclVat: 10, // 11 / 1.1
						sourceData: {
							pendingChargeId: "charge-1",
							missionId: "mission-1",
							chargeType: "WAITING_TIME",
							addedFromPendingCharges: true,
						},
					}),
				}),
			);

			expect(db.invoice.update).toHaveBeenCalledWith({
				where: { id: mockInvoiceId },
				data: {
					totalExclVat: 20,
					totalVat: 2,
					totalInclVat: 22,
				},
			});
		});
	});
});
