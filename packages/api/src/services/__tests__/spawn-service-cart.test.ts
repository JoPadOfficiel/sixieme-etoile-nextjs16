import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SpawnService } from "../spawn-service";

/**
 * Story 29.1: Shopping Cart Spawning Logic
 * Unit tests for SpawnService refactor (Multi-Mission per Quote)
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

describe("SpawnService - Shopping Cart Logic", () => {
	const ORG_ID = "org-1";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("execute with Shopping Cart lines", () => {
		it("should spawn missions with addresses from Line sourceData when available", async () => {
			// Scenario: Quote has generic header but specific lines for different trips
			const mockOrder = {
				id: "order-cart-1",
				organizationId: ORG_ID,
				reference: "ORD-2026-CART-1",
				quotes: [
					{
						id: "quote-1",
						tripType: "TRANSFER",
						// Header Data (Fallback)
						pickupAt: new Date("2026-01-20T10:00:00Z"),
						estimatedEndAt: new Date("2026-01-20T11:00:00Z"),
						pickupAddress: "Header Pickup (Paris)",
						dropoffAddress: "Header Dropoff (Lyon)",
						passengerCount: 1,
						vehicleCategory: { name: "BERLINE" },
						lines: [
							// Line 1: Explicit different trip (Marseille -> Nice)
							{
								id: "line-1",
								type: "CALCULATED",
								label: "Trip 1",
								sourceData: {
									pickupAddress: "Line 1 Pickup (Marseille)",
									dropoffAddress: "Line 1 Dropoff (Nice)",
									pickupAt: "2026-02-01T08:00:00Z",
									passengerCount: 4,
								},
							},
							// Line 2: No specific data, should match Header
							{
								id: "line-2",
								type: "CALCULATED",
								label: "Trip 2",
								sourceData: {}, // Empty sourceData
							},
						],
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([]) // No existing missions
				.mockResolvedValueOnce([
					{ id: "m-1", quoteLineId: "line-1" },
					{ id: "m-2", quoteLineId: "line-2" },
				] as any);

			// Mock transaction to capture input data
			let capturedCreateData: any[] = [];
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				if (typeof fn === "function") {
					return fn({
						mission: {
							createMany: vi.fn().mockImplementation((args) => {
								capturedCreateData = args.data;
								return { count: args.data.length };
							}),
						},
					} as any);
				}
				return undefined;
			});

			await SpawnService.execute("order-cart-1", ORG_ID);

			expect(capturedCreateData).toHaveLength(2);

			// Check Line 1 Data (Should override Header)
			const mission1 = capturedCreateData.find(
				(m) => m.quoteLineId === "line-1",
			);
			expect(mission1).toBeDefined();
			expect(mission1.sourceData.pickupAddress).toBe(
				"Line 1 Pickup (Marseille)",
			);
			expect(mission1.sourceData.dropoffAddress).toBe("Line 1 Dropoff (Nice)");
			expect(mission1.sourceData.passengerCount).toBe(4);
			// Check Date override
			expect(new Date(mission1.startAt).toISOString()).toContain("2026-02-01");

			// Check Line 2 Data (Should fallback to Header)
			const mission2 = capturedCreateData.find(
				(m) => m.quoteLineId === "line-2",
			);
			expect(mission2).toBeDefined();
			expect(mission2.sourceData.pickupAddress).toBe("Header Pickup (Paris)");
			expect(mission2.sourceData.passengerCount).toBe(1);
			// Check Date fallback
			expect(new Date(mission2.startAt).toISOString()).toContain("2026-01-20");
		});

		it("should handle mixed trip types in line sourceData", async () => {
			const mockOrder = {
				id: "order-cart-2",
				organizationId: ORG_ID,
				reference: "ORD-2026-CART-2",
				quotes: [
					{
						id: "quote-mixed",
						tripType: "TRANSFER", // Header says TRANSFER
						pickupAt: new Date("2026-01-20T10:00:00Z"), // HIGH: Added missing pickupAt
						pickupAddress: "Paris",
						lines: [
							{
								id: "line-dispo",
								type: "CALCULATED",
								label: "Disposal Day",
								sourceData: {
									tripType: "DISPO", // Line says DISPO
									pickupAddress: "London",
									durationHours: 4,
								},
							},
						],
						vehicleCategory: { name: "VAN" },
					},
				],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);
			vi.mocked(db.mission.findMany)
				.mockResolvedValueOnce([])
				.mockResolvedValueOnce([{ id: "m-1" } as any]);

			let capturedCreateData: any[] = [];
			vi.mocked(db.$transaction).mockImplementation(async (fn) => {
				// @ts-ignore
				return fn({
					mission: {
						createMany: (args) => {
							capturedCreateData = args.data;
							return { count: 1 };
						},
					},
				});
			});

			await SpawnService.execute("order-cart-2", ORG_ID);

			expect(capturedCreateData).toHaveLength(1);
			const mission = capturedCreateData[0];
			expect(mission.sourceData.tripType).toBe("DISPO");
			expect(mission.sourceData.pickupAddress).toBe("London");
		});
	});
});
