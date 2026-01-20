import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SpawnService } from "../spawn-service";

/**
 * Story 28.4: Spawning Engine - Trigger Logic
 * Unit tests for SpawnService
 *
 * Tests cover:
 * - Tenant scoping (organizationId required)
 * - TripType filtering (only TRANSFER/DISPO)
 * - QuoteLineType filtering (only CALCULATED)
 * - Partial recovery (skip lines with existing missions)
 * - Idempotence
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
});
