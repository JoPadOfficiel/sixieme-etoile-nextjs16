import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpawnService } from "../spawn-service";

/**
 * Story 28.4: Spawning Engine - Trigger Logic
 * Story 28.5: Group Spawning Logic (Multi-Day)
 * Unit tests for SpawnService
 *
 * Tests cover:
 * - Tenant scoping (organizationId required)
 * - TripType filtering (only TRANSFER/DISPO)
 * - QuoteLineType filtering (only CALCULATED)
 * - Partial recovery (skip lines with existing missions)
 * - Idempotence
 * - GROUP with children (recursive spawning)
 * - GROUP with date range (multi-day spawning)
 */

// Mock the database module
vi.mock("@repo/database", () => ({
	db: {
		order: {
			findFirst: vi.fn(),
			findUnique: vi.fn(),
		},
		mission: {
			count: vi.fn(),
			createMany: vi.fn(),
			findMany: vi.fn(),
		},
		$transaction: vi.fn(),
	},
}));

// Import after mocking
import { db } from "@repo/database";

describe("SpawnService", () => {
	const ORG_ID = "org-1";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("execute", () => {
		it("should throw error if order not found or access denied", async () => {
			vi.mocked(db.order.findFirst).mockResolvedValue(null);

			await expect(
				SpawnService.execute("non-existent-id", ORG_ID)
			).rejects.toThrow("Order non-existent-id not found or access denied");
		});

		it("should skip lines that already have missions (partial recovery)", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						lines: [
							{ id: "line-1", type: "CALCULATED", label: "Transfer 1" },
							{ id: "line-2", type: "CALCULATED", label: "Transfer 2" },
						],
						vehicleCategory: { name: "BERLINE" },
					},
				],
			};

			// line-1 already has a mission
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([{ quoteLineId: "line-1" }] as any) // existing missions
				.mockResolvedValueOnce([{ id: "mission-2", quoteLineId: "line-2" }] as any); // created missions
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			// Only line-2 should be spawned (line-1 already has mission)
			expect(result).toHaveLength(1);
			expect(result[0].quoteLineId).toBe("line-2");
		});

		it("should skip spawning if all lines already have missions", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						lines: [{ id: "line-1", type: "CALCULATED", label: "Transfer" }],
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany).mockResolvedValue([
				{ quoteLineId: "line-1" },
			] as any);

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toEqual([]);
			expect(db.$transaction).not.toHaveBeenCalled();
		});

		it("should skip spawning if no eligible lines (empty quotes)", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						lines: [], // No CALCULATED lines
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany).mockResolvedValue([]);

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toEqual([]);
			expect(db.$transaction).not.toHaveBeenCalled();
		});

		it("should create missions for CALCULATED lines from TRANSFER quotes", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						estimatedEndAt: new Date("2026-01-20T12:00:00Z"),
						pickupAddress: "CDG Airport",
						pickupLatitude: 49.0097,
						pickupLongitude: 2.5479,
						dropoffAddress: "Paris Center",
						dropoffLatitude: 48.8566,
						dropoffLongitude: 2.3522,
						passengerCount: 4,
						luggageCount: 2,
						vehicleCategoryId: "cat-1",
						vehicleCategory: { name: "BERLINE" },
						pricingMode: "DYNAMIC",
						isRoundTrip: false,
						lines: [
							{
								id: "line-1",
								type: "CALCULATED",
								label: "CDG → Paris",
								description: "Airport transfer",
								sourceData: { distance: 35000 },
								totalPrice: 85.0,
							},
							{
								id: "line-2",
								type: "CALCULATED",
								label: "Paris → CDG",
								description: "Return transfer",
								sourceData: { distance: 35000 },
								totalPrice: 85.0,
							},
						],
					},
				],
			};

			const createdMissions = [
				{ id: "mission-1", quoteLineId: "line-1" },
				{ id: "mission-2", quoteLineId: "line-2" },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([]) // No existing missions
				.mockResolvedValueOnce(createdMissions as any); // Created missions
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toHaveLength(2);
			expect(db.$transaction).toHaveBeenCalled();
		});

		it("should create missions for DISPO tripType", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "DISPO", // DISPO should spawn missions
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						lines: [{ id: "line-1", type: "CALCULATED", label: "MAD Paris" }],
						vehicleCategory: { name: "BERLINE" },
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([{ id: "mission-1", quoteLineId: "line-1" }] as any);
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toHaveLength(1);
		});

		it("should handle multi-quote orders with mixed tripTypes", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [{ id: "line-1", type: "CALCULATED", label: "Trip 1" }],
					},
					{
						id: "quote-2",
						tripType: "DISPO",
						pickupAt: new Date("2026-01-21T10:00:00Z"),
						vehicleCategory: { name: "VAN" },
						lines: [
							{ id: "line-2", type: "CALCULATED", label: "Trip 2" },
							{ id: "line-3", type: "CALCULATED", label: "Trip 3" },
						],
					},
				],
			};

			const createdMissions = [
				{ id: "mission-1", quoteLineId: "line-1", quoteId: "quote-1" },
				{ id: "mission-2", quoteLineId: "line-2", quoteId: "quote-2" },
				{ id: "mission-3", quoteLineId: "line-3", quoteId: "quote-2" },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce(createdMissions as any);
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toHaveLength(3);
		});
	});

	describe("hasMissions", () => {
		it("should return true if missions exist", async () => {
			vi.mocked(db.mission.count).mockResolvedValue(3);

			const result = await SpawnService.hasMissions("order-1");

			expect(result).toBe(true);
			expect(db.mission.count).toHaveBeenCalledWith({
				where: { orderId: "order-1" },
			});
		});

		it("should return false if no missions exist", async () => {
			vi.mocked(db.mission.count).mockResolvedValue(0);

			const result = await SpawnService.hasMissions("order-1");

			expect(result).toBe(false);
		});
	});

	describe("getEligibleLineCount", () => {
		it("should return 0 if order not found", async () => {
			vi.mocked(db.order.findUnique).mockResolvedValue(null);

			const result = await SpawnService.getEligibleLineCount("non-existent");

			expect(result).toBe(0);
		});

		it("should count only CALCULATED lines from TRANSFER/DISPO quotes", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						tripType: "TRANSFER",
						lines: [{ type: "CALCULATED" }, { type: "CALCULATED" }],
					},
					{
						tripType: "DISPO",
						lines: [{ type: "CALCULATED" }],
					},
				],
			};

			vi.mocked(db.order.findUnique).mockResolvedValue(mockOrder as any);

			const result = await SpawnService.getEligibleLineCount("order-1");

			expect(result).toBe(3);
		});
	});

	describe("getSpawnableTripTypes", () => {
		it("should return TRANSFER and DISPO", () => {
			const types = SpawnService.getSpawnableTripTypes();

			expect(types).toContain("TRANSFER");
			expect(types).toContain("DISPO");
			expect(types).not.toContain("EXCURSION");
		});
	});

	// =========================================================================
	// Story 28.5: GROUP Spawning Logic (Multi-Day)
	// =========================================================================

	describe("GROUP spawning (Story 28.5)", () => {
		it("should spawn missions for GROUP with CALCULATED children", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-06-01T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "group-1",
								type: "GROUP",
								label: "Wedding Package",
								sourceData: null,
								children: [
									{ id: "child-1", type: "CALCULATED", label: "Day 1 Transfer", sourceData: {} },
									{ id: "child-2", type: "CALCULATED", label: "Day 2 Transfer", sourceData: {} },
								],
							},
						],
					},
				],
			};

			const createdMissions = [
				{ id: "mission-1", quoteLineId: "child-1" },
				{ id: "mission-2", quoteLineId: "child-2" },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([]) // No existing missions
				.mockResolvedValueOnce(createdMissions as any);
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toHaveLength(2);
			expect(result[0].quoteLineId).toBe("child-1");
			expect(result[1].quoteLineId).toBe("child-2");
		});

		it("should spawn missions for GROUP with date range (Wedding Pack 3 Days)", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "DISPO",
						pickupAt: new Date("2026-06-01T10:00:00Z"),
						pickupAddress: "Paris Center",
						vehicleCategory: { name: "VAN_PREMIUM" },
						lines: [
							{
								id: "group-wedding",
								type: "GROUP",
								label: "Wedding Pack 3 Days",
								sourceData: {
									startDate: "2026-06-01",
									endDate: "2026-06-03",
									packageName: "Wedding VIP",
								},
								children: [], // No children - use date range
							},
						],
					},
				],
			};

			// 3 missions created (one per day)
			const createdMissions = [
				{ id: "mission-1", quoteLineId: "group-wedding", sourceData: { dayIndex: 1 } },
				{ id: "mission-2", quoteLineId: "group-wedding", sourceData: { dayIndex: 2 } },
				{ id: "mission-3", quoteLineId: "group-wedding", sourceData: { dayIndex: 3 } },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce(createdMissions as any);
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toHaveLength(3);
			// All missions linked to the same GROUP line
			expect(result.every((m) => m.quoteLineId === "group-wedding")).toBe(true);
		});

		it("should skip GROUP with MANUAL children only", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-06-01T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "group-1",
								type: "GROUP",
								label: "Manual Items Group",
								sourceData: null,
								children: [
									{ id: "manual-1", type: "MANUAL", label: "Extra fee", sourceData: {} },
									{ id: "manual-2", type: "MANUAL", label: "Tip", sourceData: {} },
								],
							},
						],
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany).mockResolvedValue([]);

			const result = await SpawnService.execute("order-1", ORG_ID);

			// No missions created (MANUAL children don't spawn)
			expect(result).toEqual([]);
			expect(db.$transaction).not.toHaveBeenCalled();
		});

		it("should handle mixed CALCULATED and GROUP lines", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-06-01T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{ id: "calc-1", type: "CALCULATED", label: "Airport Transfer", sourceData: {} },
							{
								id: "group-1",
								type: "GROUP",
								label: "Wedding Pack 3 Days",
								sourceData: {
									startDate: "2026-06-01",
									endDate: "2026-06-03",
								},
								children: [],
							},
						],
					},
				],
			};

			// 1 from CALCULATED + 3 from GROUP = 4 missions
			const createdMissions = [
				{ id: "mission-1", quoteLineId: "calc-1" },
				{ id: "mission-2", quoteLineId: "group-1" },
				{ id: "mission-3", quoteLineId: "group-1" },
				{ id: "mission-4", quoteLineId: "group-1" },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce(createdMissions as any);
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toHaveLength(4);
		});

		it("should skip GROUP line if missions already exist (idempotence)", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "DISPO",
						pickupAt: new Date("2026-06-01T10:00:00Z"),
						vehicleCategory: { name: "VAN" },
						lines: [
							{
								id: "group-1",
								type: "GROUP",
								label: "Wedding Pack",
								sourceData: { startDate: "2026-06-01", endDate: "2026-06-02" },
								children: [],
							},
						],
					},
				],
			};

			// GROUP line already has missions
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany).mockResolvedValue([
				{ quoteLineId: "group-1" },
			] as any);

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toEqual([]);
			expect(db.$transaction).not.toHaveBeenCalled();
		});

		it("should handle single-day GROUP (startDate === endDate)", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "DISPO",
						pickupAt: new Date("2026-06-01T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "group-single",
								type: "GROUP",
								label: "Single Day Event",
								sourceData: {
									startDate: "2026-06-01",
									endDate: "2026-06-01", // Same day
								},
								children: [],
							},
						],
					},
				],
			};

			const createdMissions = [
				{ id: "mission-1", quoteLineId: "group-single", sourceData: { dayIndex: 1, totalDays: 1 } },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce(createdMissions as any);
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({ mission: { createMany: vi.fn() } } as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toHaveLength(1);
		});

		it("should skip GROUP with no children and no date range", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-06-01T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "group-empty",
								type: "GROUP",
								label: "Empty Group",
								sourceData: {}, // No startDate/endDate
								children: [],
							},
						],
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany).mockResolvedValue([]);

			const result = await SpawnService.execute("order-1", ORG_ID);

			expect(result).toEqual([]);
			expect(db.$transaction).not.toHaveBeenCalled();
		});

		// =========================================================================
		// Story 29.4: Chronological Sorting and Sequential Refs
		// =========================================================================

		it("should sort lines chronologically by pickupAt from sourceData", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-001",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "line-c",
								type: "CALCULATED",
								label: "Transfer C (latest)",
								sourceData: { pickupAt: "2026-01-25T14:00:00Z" },
								dispatchable: true,
							},
							{
								id: "line-a",
								type: "CALCULATED",
								label: "Transfer A (earliest)",
								sourceData: { pickupAt: "2026-01-24T08:00:00Z" },
								dispatchable: true,
							},
							{
								id: "line-b",
								type: "CALCULATED",
								label: "Transfer B (middle)",
								sourceData: { pickupAt: "2026-01-25T10:00:00Z" },
								dispatchable: true,
							},
						],
					},
				],
			};

			const createdMissions = [
				{ id: "mission-1", quoteLineId: "line-a", ref: "ORD-2026-001-01", startAt: new Date("2026-01-24T08:00:00Z") },
				{ id: "mission-2", quoteLineId: "line-b", ref: "ORD-2026-001-02", startAt: new Date("2026-01-25T10:00:00Z") },
				{ id: "mission-3", quoteLineId: "line-c", ref: "ORD-2026-001-03", startAt: new Date("2026-01-25T14:00:00Z") },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([]) // No existing missions
				.mockResolvedValueOnce(createdMissions as any); // Created missions

			let capturedData: any[] = [];
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({
						mission: {
							createMany: vi.fn().mockImplementation(({ data }) => {
								capturedData = data;
								return { count: data.length };
							}),
						},
					} as any);
				}
				return undefined;
			});

			const result = await SpawnService.execute("order-1", ORG_ID);

			// Verify 3 missions created
			expect(result).toHaveLength(3);

			// Verify chronological order (line-a first, then line-b, then line-c)
			expect(capturedData[0].quoteLineId).toBe("line-a");
			expect(capturedData[1].quoteLineId).toBe("line-b");
			expect(capturedData[2].quoteLineId).toBe("line-c");

			// Verify sequential refs
			expect(capturedData[0].ref).toBe("ORD-2026-001-01");
			expect(capturedData[1].ref).toBe("ORD-2026-001-02");
			expect(capturedData[2].ref).toBe("ORD-2026-001-03");
		});

		it("should fallback to quote pickupAt when line has no pickupAt in sourceData", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-002",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-01-20T10:00:00Z"), // Fallback date
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "line-with-date",
								type: "CALCULATED",
								label: "Transfer with date",
								sourceData: { pickupAt: "2026-01-22T08:00:00Z" },
								dispatchable: true,
							},
							{
								id: "line-without-date",
								type: "CALCULATED",
								label: "Transfer without date",
								sourceData: {}, // No pickupAt - should use quote's pickupAt
								dispatchable: true,
							},
						],
					},
				],
			};

			const createdMissions = [
				{ id: "mission-1", quoteLineId: "line-without-date", ref: "ORD-2026-002-01", startAt: new Date("2026-01-20T10:00:00Z") },
				{ id: "mission-2", quoteLineId: "line-with-date", ref: "ORD-2026-002-02", startAt: new Date("2026-01-22T08:00:00Z") },
			];

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce(createdMissions as any);

			let capturedData: any[] = [];
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({
						mission: {
							createMany: vi.fn().mockImplementation(({ data }) => {
								capturedData = data;
								return { count: data.length };
							}),
						},
					} as any);
				}
				return undefined;
			});

			await SpawnService.execute("order-1", ORG_ID);

			// line-without-date uses quote's pickupAt (2026-01-20) which is earlier
			// So it should be first in chronological order
			expect(capturedData[0].quoteLineId).toBe("line-without-date");
			expect(capturedData[0].ref).toBe("ORD-2026-002-01");
			expect(capturedData[1].quoteLineId).toBe("line-with-date");
			expect(capturedData[1].ref).toBe("ORD-2026-002-02");
		});

		it("should include sequenceIndex and totalMissionsInOrder in sourceData", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-003",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "line-1",
								type: "CALCULATED",
								label: "Transfer 1",
								sourceData: { pickupAt: "2026-01-20T10:00:00Z" },
								dispatchable: true,
							},
							{
								id: "line-2",
								type: "CALCULATED",
								label: "Transfer 2",
								sourceData: { pickupAt: "2026-01-21T10:00:00Z" },
								dispatchable: true,
							},
						],
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([
					{ id: "m1", quoteLineId: "line-1" },
					{ id: "m2", quoteLineId: "line-2" },
				] as any);

			let capturedData: any[] = [];
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({
						mission: {
							createMany: vi.fn().mockImplementation(({ data }) => {
								capturedData = data;
								return { count: data.length };
							}),
						},
					} as any);
				}
				return undefined;
			});

			await SpawnService.execute("order-1", ORG_ID);

			// Verify sequenceIndex and totalMissionsInOrder
			expect(capturedData[0].sourceData.sequenceIndex).toBe(1);
			expect(capturedData[0].sourceData.totalMissionsInOrder).toBe(2);
			expect(capturedData[1].sourceData.sequenceIndex).toBe(2);
			expect(capturedData[1].sourceData.totalMissionsInOrder).toBe(2);

			// Verify spawnedAt is present
			expect(capturedData[0].sourceData.spawnedAt).toBeDefined();
			expect(capturedData[1].sourceData.spawnedAt).toBeDefined();
		});

		it("should not create duplicate missions on re-spawn (idempotence)", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-004",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						vehicleCategory: { name: "BERLINE" },
						lines: [
							{
								id: "line-1",
								type: "CALCULATED",
								label: "Transfer 1",
								sourceData: {},
								dispatchable: true,
							},
							{
								id: "line-2",
								type: "CALCULATED",
								label: "Transfer 2",
								sourceData: {},
								dispatchable: true,
							},
						],
					},
				],
			};

			// All lines already have missions
			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany).mockResolvedValueOnce([
				{ quoteLineId: "line-1" },
				{ quoteLineId: "line-2" },
			] as any);

			const result = await SpawnService.execute("order-1", ORG_ID);

			// No new missions should be created
			expect(result).toEqual([]);
			expect(db.$transaction).not.toHaveBeenCalled();
		});
	});
});
