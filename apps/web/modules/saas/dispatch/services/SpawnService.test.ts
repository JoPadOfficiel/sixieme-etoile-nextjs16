import { QuoteLineType } from "@prisma/client";
import { db } from "@repo/database";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SpawnService } from "./SpawnService";

// Mock database
// Mock database
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findUnique: vi.fn(),
		},
		mission: {
			create: vi.fn(),
		},
		$transaction: vi.fn((callback) => callback(db)),
	},
}));

describe("SpawnService", () => {
	let service: SpawnService;

	beforeEach(() => {
		service = new SpawnService();
		vi.clearAllMocks();
	});

	it("should spawn missions for children of a GROUP line", async () => {
		const mockOrder = {
			id: "order-1",
			organizationId: "org-1",
			quotes: [
				{
					id: "quote-1",
					status: "ACCEPTED",
					organizationId: "org-1",
					pickupAt: new Date("2026-06-01T09:00:00Z"),
					lines: [
						{
							id: "line-group",
							type: QuoteLineType.GROUP,
							parentId: null,
							children: [
								{
									id: "child-1",
									type: "CALCULATED",
									quantity: 1,
									label: "Transfer 1",
								},
								{
									id: "child-2",
									type: "CALCULATED",
									quantity: 1,
									label: "Transfer 2",
								},
							],
						},
					],
				},
			],
		};

		(db.order.findUnique as any).mockResolvedValue(mockOrder);
		(db.mission.create as any).mockImplementation((args) =>
			Promise.resolve({ id: "mission-" + Math.random(), ...args.data }),
		);

		const missions = await service.execute("order-1");

		expect(missions).toHaveLength(2);
		expect(db.mission.create).toHaveBeenCalledTimes(2);

		// Check links
		expect(db.mission.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					quoteLineId: "child-1",
					quoteId: "quote-1",
					orderId: "order-1",
				}),
			}),
		);
	});

	it("should spawn multiple missions for Multi-Day line", async () => {
		const mockOrder = {
			id: "order-2",
			organizationId: "org-1",
			quotes: [
				{
					id: "quote-2",
					status: "ACCEPTED",
					organizationId: "org-1",
					pickupAt: new Date("2026-06-01T09:00:00Z"),
					lines: [
						{
							id: "line-multi",
							type: "CALCULATED",
							parentId: null,
							quantity: 3,
							label: "Mise à disposition 3 Jours",
							children: [],
						},
					],
				},
			],
		};

		(db.order.findUnique as any).mockResolvedValue(mockOrder);

		const missions = await service.execute("order-2");

		expect(missions).toHaveLength(3);

		// Check Dates
		// Call 1: June 1st
		// Call 2: June 2nd
		// Call 3: June 3rd

		const calls = (db.mission.create as any).mock.calls;
		const date1 = calls[0][0].data.startAt;
		const date2 = calls[1][0].data.startAt;
		const date3 = calls[2][0].data.startAt;

		expect(date1.toISOString()).toContain("2026-06-01");
		expect(date2.toISOString()).toContain("2026-06-02");
		expect(date3.toISOString()).toContain("2026-06-03");
	});

	// Story 28.6: Test dispatchable flag
	it("should skip lines with dispatchable: false", async () => {
		const mockOrder = {
			id: "order-3",
			organizationId: "org-1",
			quotes: [
				{
					id: "quote-3",
					status: "ACCEPTED",
					organizationId: "org-1",
					pickupAt: new Date("2026-06-01T09:00:00Z"),
					lines: [
						{
							id: "line-dispatchable",
							type: "CALCULATED",
							parentId: null,
							quantity: 1,
							label: "Transfer with dispatch",
							dispatchable: true,
							children: [],
						},
						{
							id: "line-not-dispatchable",
							type: "CALCULATED",
							parentId: null,
							quantity: 1,
							label: "Fee - no dispatch",
							dispatchable: false,
							children: [],
						},
					],
				},
			],
		};

		(db.order.findUnique as any).mockResolvedValue(mockOrder);
		(db.mission.create as any).mockImplementation((args) =>
			Promise.resolve({ id: "mission-" + Math.random(), ...args.data }),
		);

		const missions = await service.execute("order-3");

		// Only 1 mission should be created (the dispatchable one)
		expect(missions).toHaveLength(1);
		expect(db.mission.create).toHaveBeenCalledTimes(1);

		// Verify it's the correct line
		expect(db.mission.create).toHaveBeenCalledWith(
			expect.objectContaining({
				data: expect.objectContaining({
					quoteLineId: "line-dispatchable",
				}),
			}),
		);
	});

	it("should default dispatchable to true when not specified", async () => {
		const mockOrder = {
			id: "order-4",
			organizationId: "org-1",
			quotes: [
				{
					id: "quote-4",
					status: "ACCEPTED",
					organizationId: "org-1",
					pickupAt: new Date("2026-06-01T09:00:00Z"),
					lines: [
						{
							id: "line-no-flag",
							type: "CALCULATED",
							parentId: null,
							quantity: 1,
							label: "Transfer without explicit dispatchable",
							// dispatchable not set - should default to true
							children: [],
						},
					],
				},
			],
		};

		(db.order.findUnique as any).mockResolvedValue(mockOrder);
		(db.mission.create as any).mockImplementation((args) =>
			Promise.resolve({ id: "mission-" + Math.random(), ...args.data }),
		);

		const missions = await service.execute("order-4");

		// Mission should be created (default dispatchable = true)
		expect(missions).toHaveLength(1);
		expect(db.mission.create).toHaveBeenCalledTimes(1);
	});
});
