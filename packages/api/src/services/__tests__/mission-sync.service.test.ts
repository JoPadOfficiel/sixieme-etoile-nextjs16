/**
 * Story 27.2: Mission Synchronization Service - Integration Tests
 *
 * Tests the synchronization between QuoteLines and Missions.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MissionSyncService } from "../mission-sync.service";
import { db } from "@repo/database";
import type { MissionStatus, QuoteLineType } from "@prisma/client";

// Mock the database
vi.mock("@repo/database", () => ({
  db: {
    quote: {
      findUnique: vi.fn(),
    },
    mission: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

describe("MissionSyncService", () => {
  let service: MissionSyncService;
  const mockPrisma = db as unknown as {
    quote: {
      findUnique: ReturnType<typeof vi.fn>;
    };
    mission: {
      create: ReturnType<typeof vi.fn>;
      update: ReturnType<typeof vi.fn>;
      delete: ReturnType<typeof vi.fn>;
    };
    $transaction: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    // Create service with mocked db
    service = new MissionSyncService(mockPrisma as any);

    // Reset all mocks
    vi.clearAllMocks();

    // Default transaction implementation - execute callback with mock tx
    mockPrisma.$transaction.mockImplementation(async (callback: Function) => {
      return callback(mockPrisma);
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("syncQuoteMissions", () => {
    it("should create missions for CALCULATED quote lines", async () => {
      // Given: A quote with 2 lines - 1 CALCULATED, 1 MANUAL
      const mockQuote = createMockQuote({
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "CALCULATED",
            sourceData: { pickupAddress: "CDG", dropoffAddress: "Paris" },
          }),
          createMockQuoteLine({
            id: "line-2",
            type: "MANUAL",
            sourceData: null,
          }),
        ],
        missions: [],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.create.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Only 1 mission is created (for CALCULATED line)
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(result.deleted).toBe(0);
      expect(mockPrisma.mission.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.mission.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: "org-1",
          quoteId: "quote-1",
          quoteLineId: "line-1",
          status: "PENDING",
        }),
      });
    });

    it("should update mission timing when quote pickupAt changes", async () => {
      // Given: Existing quote with mission, but pickupAt has changed
      const oldPickupAt = new Date("2026-01-20T09:00:00");
      const newPickupAt = new Date("2026-01-20T14:00:00");

      const mockQuote = createMockQuote({
        pickupAt: newPickupAt,
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "CALCULATED",
          }),
        ],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            startAt: oldPickupAt,
            status: "PENDING",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.update.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Mission is updated with new timing
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
      expect(mockPrisma.mission.update).toHaveBeenCalledWith({
        where: { id: "mission-1" },
        data: expect.objectContaining({
          startAt: newPickupAt,
        }),
      });
    });

    it("should NOT update driverId or status when syncing", async () => {
      // Given: Mission with driver assigned
      const pickupAt = new Date("2026-01-20T09:00:00");

      const mockQuote = createMockQuote({
        pickupAt: pickupAt,
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "CALCULATED",
            sourceData: { newData: true }, // Changed sourceData
          }),
        ],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            startAt: pickupAt,
            status: "ASSIGNED",
            driverId: "driver-1",
            sourceData: { oldData: true },
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.update.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Mission is updated but driverId/status are NOT in update data
      expect(result.updated).toBe(1);
      const updateCall = mockPrisma.mission.update.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty("driverId");
      expect(updateCall.data).not.toHaveProperty("status");
      expect(updateCall.data).toHaveProperty("sourceData");
    });

    it("should delete orphan mission when quote line is deleted (unassigned)", async () => {
      // Given: Quote with no lines but has an orphan PENDING mission
      const mockQuote = createMockQuote({
        lines: [], // Line was deleted
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            status: "PENDING",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.delete.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Orphan mission is deleted
      expect(result.deleted).toBe(1);
      expect(mockPrisma.mission.delete).toHaveBeenCalledWith({
        where: { id: "mission-1" },
      });
    });

    it("should preserve mission when quote line is deleted but mission is assigned", async () => {
      // Given: Quote with no lines but has an ASSIGNED mission
      const mockQuote = createMockQuote({
        lines: [], // Line was deleted
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            status: "ASSIGNED",
            driverId: "driver-1",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.update.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Mission is NOT deleted, but detached
      expect(result.deleted).toBe(0);
      expect(result.detached).toBe(1);
      expect(mockPrisma.mission.delete).not.toHaveBeenCalled();
      expect(mockPrisma.mission.update).toHaveBeenCalledWith({
        where: { id: "mission-1" },
        data: { quoteLineId: null },
      });
    });

    it("should not create duplicate missions on multiple syncs", async () => {
      // Given: Quote with 1 line and matching mission (already synced)
      const pickupAt = new Date("2026-01-20T09:00:00");
      const sourceData = { pickupAddress: "CDG" };

      const mockQuote = createMockQuote({
        pickupAt: pickupAt,
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "CALCULATED",
            sourceData: sourceData,
          }),
        ],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            startAt: pickupAt,
            sourceData: sourceData,
            status: "PENDING",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);

      // When: Sync runs multiple times
      const result1 = await service.syncQuoteMissions("quote-1");
      const result2 = await service.syncQuoteMissions("quote-1");
      const result3 = await service.syncQuoteMissions("quote-1");

      // Then: No new missions created, no updates needed
      expect(result1.created).toBe(0);
      expect(result1.updated).toBe(0);
      expect(result2.created).toBe(0);
      expect(result3.created).toBe(0);
      expect(mockPrisma.mission.create).not.toHaveBeenCalled();
    });

    it("should handle quote not found error", async () => {
      // Given: Quote doesn't exist
      mockPrisma.quote.findUnique.mockResolvedValue(null);

      // When: Sync service runs
      const result = await service.syncQuoteMissions("non-existent");

      // Then: Error is recorded
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("UPDATE_FAILED");
      expect(result.errors[0].message).toContain("not found");
    });

    it("should create missions for GROUP lines with timing data", async () => {
      // Given: A quote with GROUP line that has pickupAt in sourceData
      const mockQuote = createMockQuote({
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "GROUP",
            sourceData: { pickupAt: "2026-01-20T08:00:00Z" },
          }),
        ],
        missions: [],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.create.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Mission is created for GROUP line with timing
      expect(result.created).toBe(1);
    });

    it("should NOT create missions for GROUP lines without timing data", async () => {
      // Given: A quote with GROUP line without timing data
      const mockQuote = createMockQuote({
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "GROUP",
            sourceData: { description: "Just a group" }, // No pickupAt
          }),
        ],
        missions: [],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: No mission created
      expect(result.created).toBe(0);
      expect(mockPrisma.mission.create).not.toHaveBeenCalled();
    });

    it("should protect IN_PROGRESS missions from deletion", async () => {
      // Given: Quote line deleted, but mission is IN_PROGRESS
      const mockQuote = createMockQuote({
        lines: [],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            status: "IN_PROGRESS",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.update.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Mission is detached, not deleted
      expect(result.deleted).toBe(0);
      expect(result.detached).toBe(1);
    });

    it("should protect COMPLETED missions from deletion", async () => {
      // Given: Quote line deleted, but mission is COMPLETED
      const mockQuote = createMockQuote({
        lines: [],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            status: "COMPLETED",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.update.mockResolvedValue({ id: "mission-1" });

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Mission is detached, not deleted
      expect(result.deleted).toBe(0);
      expect(result.detached).toBe(1);
    });

    // H3 Fix: Tests for error scenarios
    it("should record error when mission create fails", async () => {
      // Given: Quote with line, but create will fail
      const mockQuote = createMockQuote({
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "CALCULATED",
          }),
        ],
        missions: [],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.create.mockRejectedValue(new Error("Database connection failed"));

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Error is recorded, not thrown
      expect(result.created).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("CREATE_FAILED");
      expect(result.errors[0].quoteLineId).toBe("line-1");
      expect(result.errors[0].message).toContain("Database connection failed");
    });

    it("should record error when mission update fails", async () => {
      // Given: Quote with changed timing, but update will fail
      const oldPickupAt = new Date("2026-01-20T09:00:00");
      const newPickupAt = new Date("2026-01-20T14:00:00");

      const mockQuote = createMockQuote({
        pickupAt: newPickupAt,
        lines: [
          createMockQuoteLine({
            id: "line-1",
            type: "CALCULATED",
          }),
        ],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            startAt: oldPickupAt,
            status: "PENDING",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.update.mockRejectedValue(new Error("Constraint violation"));

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Error is recorded
      expect(result.updated).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("UPDATE_FAILED");
      expect(result.errors[0].missionId).toBe("mission-1");
    });

    it("should record error when mission delete fails", async () => {
      // Given: Orphan PENDING mission, but delete will fail
      const mockQuote = createMockQuote({
        lines: [],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            status: "PENDING",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.delete.mockRejectedValue(new Error("Foreign key constraint"));

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Error is recorded
      expect(result.deleted).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("DELETION_BLOCKED");
      expect(result.errors[0].missionId).toBe("mission-1");
    });

    it("should record error when mission detach fails", async () => {
      // Given: Orphan ASSIGNED mission, but detach (update) will fail
      const mockQuote = createMockQuote({
        lines: [],
        missions: [
          createMockMission({
            id: "mission-1",
            quoteLineId: "line-1",
            status: "ASSIGNED",
          }),
        ],
      });

      mockPrisma.quote.findUnique.mockResolvedValue(mockQuote);
      mockPrisma.mission.update.mockRejectedValue(new Error("Lock timeout"));

      // When: Sync service runs
      const result = await service.syncQuoteMissions("quote-1");

      // Then: Error is recorded
      expect(result.detached).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe("UPDATE_FAILED");
    });
  });
});

// Helper functions to create mock data

function createMockQuote(overrides: Partial<{
  id: string;
  organizationId: string;
  pickupAt: Date;
  estimatedEndAt: Date | null;
  lines: ReturnType<typeof createMockQuoteLine>[];
  missions: ReturnType<typeof createMockMission>[];
}> = {}) {
  return {
    id: overrides.id ?? "quote-1",
    organizationId: overrides.organizationId ?? "org-1",
    pickupAt: overrides.pickupAt ?? new Date("2026-01-20T09:00:00"),
    estimatedEndAt: overrides.estimatedEndAt ?? new Date("2026-01-20T11:00:00"),
    lines: overrides.lines ?? [],
    missions: overrides.missions ?? [],
  };
}

function createMockQuoteLine(overrides: Partial<{
  id: string;
  quoteId: string;
  type: QuoteLineType;
  label: string;
  sourceData: Record<string, unknown> | null;
  parentId: string | null;
}> = {}) {
  return {
    id: overrides.id ?? "line-1",
    quoteId: overrides.quoteId ?? "quote-1",
    type: overrides.type ?? ("CALCULATED" as QuoteLineType),
    label: overrides.label ?? "Transfer CDG → Paris",
    sourceData: overrides.sourceData ?? { pickupAddress: "CDG", dropoffAddress: "Paris" },
    parentId: overrides.parentId ?? null,
  };
}

function createMockMission(overrides: Partial<{
  id: string;
  organizationId: string;
  quoteId: string;
  quoteLineId: string | null;
  driverId: string | null;
  vehicleId: string | null;
  status: MissionStatus;
  startAt: Date;
  endAt: Date | null;
  sourceData: Record<string, unknown> | null;
}> = {}) {
  return {
    id: overrides.id ?? "mission-1",
    organizationId: overrides.organizationId ?? "org-1",
    quoteId: overrides.quoteId ?? "quote-1",
    quoteLineId: overrides.quoteLineId ?? "line-1",
    driverId: overrides.driverId ?? null,
    vehicleId: overrides.vehicleId ?? null,
    status: overrides.status ?? ("PENDING" as MissionStatus),
    startAt: overrides.startAt ?? new Date("2026-01-20T09:00:00"),
    endAt: overrides.endAt ?? new Date("2026-01-20T11:00:00"),
    sourceData: overrides.sourceData ?? null,
  };
}
