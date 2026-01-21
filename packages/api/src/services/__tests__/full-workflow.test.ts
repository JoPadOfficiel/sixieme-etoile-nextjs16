import { db } from "@repo/database";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InvoiceFactory } from "../invoice-factory";
import { PendingChargesService } from "../pending-charges";
import { SpawnService } from "../spawn-service";

// Mock database
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
		},
		mission: {
			createMany: vi.fn(),
			count: vi.fn(),
			findMany: vi.fn(),
		},
		invoice: {
			create: vi.fn(),
			findFirst: vi.fn(),
			update: vi.fn(),
		},
		invoiceLine: {
			create: vi.fn(),
			createMany: vi.fn(),
			findMany: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(db)),
	},
}));

describe("Full Workflow: Order -> Dispatch -> Invoice", () => {
	const ORG_ID = "org-1";
	const ORDER_ID = "order-1";
	const QUOTE_ID = "quote-1";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should execute the full workflow from spawning to invoicing", async () => {
		vi.mocked(db.invoiceLine.findMany).mockResolvedValue([]); // For recalculate

		// 1. Setup Data: Order with Accepted Quote
		const mockOrder = {
			id: ORDER_ID,
			organizationId: ORG_ID,
			contact: { id: "contact-1", vatRate: 20 },
			quotes: [
				{
					id: QUOTE_ID,
					status: "ACCEPTED",
					tripType: "TRANSFER",
					pickupAt: new Date("2024-01-01T10:00:00Z"),
					passengers: 1,
					luggage: 0,
					lines: [
						{
							id: "ql-1",
							type: "CALCULATED",
							label: "Paris -> Lyon",
							totalPriceExclVat: 100,
							unitPrice: 100,
							totalPrice: 100,
							vatRate: 10,
							quantity: 1,
							vehicleCategoryId: "cat-1",
							sourceData: {},
						},
					],
					stayDays: [],
				},
			],
			missions: [], // Initially empty
			invoices: [],
		};

		// Mock DB responses for Spawning
		vi.mocked(db.order.findFirst).mockResolvedValueOnce(mockOrder as any);
		vi.mocked(db.mission.count).mockResolvedValue(0); // No missions yet
		vi.mocked(db.mission.findMany).mockResolvedValue([]); // No existing missions

		// 2. Execute Spawn (Order -> Missions)
		console.log("Step 1: Spawning Missions");
		await SpawnService.execute(ORDER_ID, ORG_ID);

		// Verify missions were created
		expect(db.mission.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({
						orderId: ORDER_ID,
						sourceData: expect.objectContaining({
							lineLabel: "Paris -> Lyon",
						}),
					}),
				]),
			}),
		);

		// 3. Simulate Mission Execution & Pending Charges
		console.log("Step 2: Pending Charges Detection");

		// Setup order state with created missions
		const mockMission = {
			id: "mission-1",
			orderId: ORDER_ID,
			label: "Paris -> Lyon",
			isInternal: false,
			executionData: {
				waitingTimeMinutes: 45, // 30 min billable (assuming 15 min free)
			},
			sourceData: {
				pickupAddress: "Paris",
				dropoffAddress: "Lyon",
			},
			quoteLine: { id: "ql-1" },
		};

		mockOrder.missions = [mockMission] as any;
		vi.mocked(db.order.findFirst).mockResolvedValueOnce(mockOrder as any);

		const pendingResult = await PendingChargesService.detectPendingCharges(
			ORDER_ID,
			ORG_ID,
		);

		// Verify pending charges detected
		expect(pendingResult.pendingCharges).toHaveLength(1);
		expect(pendingResult.pendingCharges[0].type).toBe("WAITING_TIME");
		expect(pendingResult.pendingCharges[0].amount).toBeGreaterThan(0);

		// 4. Create Invoice (Order -> Invoice)
		console.log("Step 3: Invoice Generation");

		// Setup order state for invoicing
		vi.mocked(db.order.findFirst).mockResolvedValueOnce(mockOrder as any);
		vi.mocked(db.invoice.create).mockResolvedValue({ id: "inv-1" } as any);

		await InvoiceFactory.createInvoiceFromOrder(ORDER_ID, ORG_ID);

		// Verify invoice creation
		expect(db.invoice.create).toHaveBeenCalled();
		expect(db.invoiceLine.createMany).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.arrayContaining([
					expect.objectContaining({
						description: "Paris -> Lyon",
						totalExclVat: 100,
					}),
				]),
			}),
		);
	});

	it("should include pending charges when adding to invoice", async () => {
		// Setup pending charge
		const charge = {
			id: "pc-1",
			orderId: "order-1",
			missionId: "mission-1",
			missionLabel: "Mission 1",
			type: "WAITING_TIME" as const,
			description: "Waiting Time",
			amount: 15, // TTC
			vatRate: 20,
			invoiced: false,
		};

		const mockInvoice = {
			id: "inv-1",
			organizationId: "org-1",
			lines: [{ sortOrder: 1 }],
		};

		vi.mocked(db.invoice.findFirst).mockResolvedValue(mockInvoice as any);
		vi.mocked(db.invoiceLine.create).mockResolvedValue({ id: "il-new" } as any);
		vi.mocked(db.invoiceLine.findMany).mockResolvedValue([]); // for recalculate

		await PendingChargesService.addChargeToInvoice(charge, "inv-1", "org-1");

		expect(db.invoiceLine.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					invoiceId: "inv-1",
					description: "Waiting Time - Mission 1",
					totalVat: 2.5, // 15 - (15/1.2) = 15 - 12.5 = 2.5
					totalExclVat: 12.5,
				}),
			}),
		);
	});
});
