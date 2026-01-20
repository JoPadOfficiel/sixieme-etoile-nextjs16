import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PendingChargesService } from "../pending-charges";

// Mock the database module
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

// Import after mocking
import { db } from "@repo/database";

describe("PendingChargesService", () => {
	const ORG_ID = "org-1";

	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("detectPendingCharges", () => {
		it("should exclude internal missions from pending charges", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				missions: [
					{
						id: "mission-1",
						label: "Regular Mission",
						isInternal: false,
						executionData: {
							waitingTimeMinutes: 30, // 15 mins billable
						},
						sourceData: {
							pickupAddress: "A",
							dropoffAddress: "B",
						},
					},
					{
						id: "mission-internal",
						label: "Internal Mission",
						isInternal: true, // Should be skipped
						executionData: {
							waitingTimeMinutes: 60, // Would be 45 mins billable if not skipped
						},
						sourceData: {
							isInternal: true,
							label: "Internal Mission",
						},
					},
				],
				invoices: [],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);

			const result = await PendingChargesService.detectPendingCharges(
				"order-1",
				ORG_ID,
			);

			// Should only find charges for mission-1
			expect(result.pendingCharges).toHaveLength(1);
			expect(result.pendingCharges[0].missionId).toBe("mission-1");
			expect(result.pendingCharges[0].type).toBe("WAITING_TIME");
			expect(result.pendingCharges[0].description).toContain("15 min");

			// Verify internal mission was ignored
			const internalCharges = result.pendingCharges.find(
				(c) => c.missionId === "mission-internal",
			);
			expect(internalCharges).toBeUndefined();
		});

		it("should exclude internal missions even with other charge types", async () => {
			const mockOrder = {
				id: "order-1",
				organizationId: ORG_ID,
				missions: [
					{
						id: "mission-internal-2",
						isInternal: true,
						executionData: {
							parkingCost: 50,
							additionalTolls: 20,
						},
					},
				],
				invoices: [],
			};

			vi.mocked(db.order.findFirst).mockResolvedValue(mockOrder as any);

			const result = await PendingChargesService.detectPendingCharges(
				"order-1",
				ORG_ID,
			);

			expect(result.pendingCharges).toHaveLength(0);
		});
	});
});
