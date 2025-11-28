/**
 * Story 6.8: Quote Costs API Tests
 * 
 * Tests for manual editing of cost components on quotes.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { quoteCostsRouter } from "../quote-costs";

// Mock database
vi.mock("@repo/database", () => ({
  db: {
    quote: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    member: {
      findFirst: vi.fn(),
    },
  },
}));

// Mock organization middleware
vi.mock("../../../middleware/organization", () => ({
  organizationMiddleware: vi.fn((c, next) => {
    c.set("organizationId", "test-org-id");
    c.set("session", { userId: "admin-user-id" });
    return next();
  }),
}));

import { db } from "@repo/database";

const mockTripAnalysis = {
  costBreakdown: {
    fuel: { amount: 15, distanceKm: 50, consumptionL100km: 8, pricePerLiter: 1.8 },
    tolls: { amount: 10, distanceKm: 50, ratePerKm: 0.2 },
    wear: { amount: 5, distanceKm: 50, ratePerKm: 0.1 },
    driver: { amount: 25, durationMinutes: 60, hourlyRate: 25 },
    parking: { amount: 5, description: "Airport parking" },
    total: 60,
  },
  totalDistanceKm: 50,
  totalDurationMinutes: 60,
  totalInternalCost: 60,
  calculatedAt: new Date().toISOString(),
  routingSource: "GOOGLE_API",
  segments: {
    approach: null,
    service: {
      name: "service",
      description: "Service segment",
      distanceKm: 50,
      durationMinutes: 60,
      cost: { total: 60 },
      isEstimated: false,
    },
    return: null,
  },
};

const mockQuote = {
  id: "quote-1",
  organizationId: "test-org-id",
  status: "DRAFT",
  finalPrice: 100,
  internalCost: 60,
  marginPercent: 40,
  tripAnalysis: mockTripAnalysis,
};

describe("Quote Costs API - Story 6.8", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("PATCH /quotes/:quoteId/costs", () => {
    it("should update fuel cost as admin", async () => {
      const mockDb = db as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
        member: {
          findFirst: ReturnType<typeof vi.fn>;
        };
      };

      mockDb.member.findFirst.mockResolvedValue({ role: "admin" });
      mockDb.quote.findFirst.mockResolvedValue(mockQuote);
      mockDb.quote.update.mockResolvedValue({
        ...mockQuote,
        internalCost: 65,
        marginPercent: 35,
      });

      const app = new Hono().route("/", quoteCostsRouter);
      const client = testClient(app);

      const response = await client.quotes[":quoteId"].costs.$patch({
        param: { quoteId: "quote-1" },
        json: {
          componentName: "fuel",
          value: 20,
          reason: "Adjusted for actual fuel consumption",
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.updatedCosts.fuel).toBe(20);
      expect(data.updatedCosts.total).toBe(65); // 20 + 10 + 5 + 25 + 5
      expect(data.costOverrides.hasManualEdits).toBe(true);
    });

    it("should recalculate margin after cost update", async () => {
      const mockDb = db as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>;
          update: ReturnType<typeof vi.fn>;
        };
        member: {
          findFirst: ReturnType<typeof vi.fn>;
        };
      };

      mockDb.member.findFirst.mockResolvedValue({ role: "admin" });
      mockDb.quote.findFirst.mockResolvedValue(mockQuote);
      mockDb.quote.update.mockResolvedValue({
        ...mockQuote,
        internalCost: 75,
        marginPercent: 25,
      });

      const app = new Hono().route("/", quoteCostsRouter);
      const client = testClient(app);

      const response = await client.quotes[":quoteId"].costs.$patch({
        param: { quoteId: "quote-1" },
        json: {
          componentName: "tolls",
          value: 25, // Increase from 10 to 25
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      // New total: 15 + 25 + 5 + 25 + 5 = 75
      // Margin: 100 - 75 = 25
      // Margin %: 25 / 100 * 100 = 25%
      expect(data.updatedCosts.total).toBe(75);
      expect(data.marginPercent).toBe(25);
      expect(data.profitabilityIndicator).toBe("orange"); // 25% is orange
    });

    it("should reject update from non-admin user", async () => {
      const mockDb = db as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>;
        };
        member: {
          findFirst: ReturnType<typeof vi.fn>;
        };
      };

      mockDb.member.findFirst.mockResolvedValue({ role: "member" });

      const app = new Hono().route("/", quoteCostsRouter);
      const client = testClient(app);

      const response = await client.quotes[":quoteId"].costs.$patch({
        param: { quoteId: "quote-1" },
        json: {
          componentName: "fuel",
          value: 20,
        },
      });

      expect(response.status).toBe(403);
    });

    it("should reject update on non-DRAFT quote", async () => {
      const mockDb = db as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>;
        };
        member: {
          findFirst: ReturnType<typeof vi.fn>;
        };
      };

      mockDb.member.findFirst.mockResolvedValue({ role: "admin" });
      mockDb.quote.findFirst.mockResolvedValue({
        ...mockQuote,
        status: "SENT",
      });

      const app = new Hono().route("/", quoteCostsRouter);
      const client = testClient(app);

      const response = await client.quotes[":quoteId"].costs.$patch({
        param: { quoteId: "quote-1" },
        json: {
          componentName: "fuel",
          value: 20,
        },
      });

      expect(response.status).toBe(400);
    });

    it("should return 404 for non-existent quote", async () => {
      const mockDb = db as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>;
        };
        member: {
          findFirst: ReturnType<typeof vi.fn>;
        };
      };

      mockDb.member.findFirst.mockResolvedValue({ role: "admin" });
      mockDb.quote.findFirst.mockResolvedValue(null);

      const app = new Hono().route("/", quoteCostsRouter);
      const client = testClient(app);

      const response = await client.quotes[":quoteId"].costs.$patch({
        param: { quoteId: "non-existent" },
        json: {
          componentName: "fuel",
          value: 20,
        },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("GET /quotes/:quoteId/costs", () => {
    it("should return current cost overrides", async () => {
      const mockDb = db as unknown as {
        quote: {
          findFirst: ReturnType<typeof vi.fn>;
        };
      };

      mockDb.quote.findFirst.mockResolvedValue({
        ...mockQuote,
        tripAnalysis: {
          ...mockTripAnalysis,
          costOverrides: {
            overrides: [
              {
                componentName: "fuel",
                originalValue: 15,
                editedValue: 20,
                editedBy: "admin-user-id",
                editedAt: new Date().toISOString(),
              },
            ],
            hasManualEdits: true,
            lastEditedAt: new Date().toISOString(),
            lastEditedBy: "admin-user-id",
          },
        },
      });

      const app = new Hono().route("/", quoteCostsRouter);
      const client = testClient(app);

      const response = await client.quotes[":quoteId"].costs.$get({
        param: { quoteId: "quote-1" },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.quoteId).toBe("quote-1");
      expect(data.costOverrides.hasManualEdits).toBe(true);
    });
  });
});
