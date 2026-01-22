/**
 * Story 29.1: Fix Shopping Cart Persistence & Pricing Aggregation
 * 
 * Tests for multi-item quote creation with QuoteLine persistence
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";

// Mock database
vi.mock("@repo/database", () => ({
  db: {
    quote: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
    quoteLine: {
      createMany: vi.fn(),
      findMany: vi.fn(),
    },
    contact: {
      findFirst: vi.fn(),
    },
    vehicleCategory: {
      findFirst: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock organization middleware
vi.mock("../../../middleware/organization", () => ({
  organizationMiddleware: vi.fn((c, next) => {
    c.set("organizationId", "test-org-id");
    return next();
  }),
}));

// Mock mission sync service
vi.mock("../../../services/mission-sync.service", () => ({
  missionSyncService: {
    syncQuoteMissions: vi.fn().mockResolvedValue(undefined),
  },
}));

import { quotesRouter } from "../quotes";
import { db } from "@repo/database";

// Cast db to access mock functions
const mockDb = db as unknown as {
  quote: {
    create: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
  };
  quoteLine: {
    createMany: ReturnType<typeof vi.fn>;
    findMany: ReturnType<typeof vi.fn>;
  };
  contact: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  vehicleCategory: {
    findFirst: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

describe("Story 29.1: Shopping Cart Persistence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mocks
    mockDb.contact.findFirst.mockResolvedValue({
      id: "contact-1",
      organizationId: "test-org-id",
      displayName: "Test Client",
    });
    
    mockDb.vehicleCategory.findFirst.mockResolvedValue({
      id: "cat-1",
      organizationId: "test-org-id",
      name: "Van Premium",
    });
    
    // Setup transaction mock to execute callback with mock tx client
    mockDb.$transaction.mockImplementation(async (callback: (tx: typeof mockDb) => Promise<unknown>) => {
      // Create a tx client that tracks calls
      const txClient = {
        quote: {
          create: mockDb.quote.create,
        },
        quoteLine: {
          createMany: mockDb.quoteLine.createMany,
          findMany: mockDb.quoteLine.findMany,
        },
      };
      return callback(txClient as unknown as typeof mockDb);
    });
  });

  describe("POST /quotes with lines (Yolo Mode)", () => {
    it("TC1: creates N distinct QuoteLines for N cart items", async () => {
      const createdQuote = {
        id: "quote-123",
        organizationId: "test-org-id",
        finalPrice: 450,
      };
      
      const createdLines = [
        { id: "line-1", type: "CALCULATED", label: "CDG → Paris", totalPrice: { toString: () => "150" }, sortOrder: 0 },
        { id: "line-2", type: "CALCULATED", label: "Paris → Versailles", totalPrice: { toString: () => "200" }, sortOrder: 1 },
        { id: "line-3", type: "CALCULATED", label: "Versailles → CDG", totalPrice: { toString: () => "100" }, sortOrder: 2 },
      ];
      
      mockDb.quote.create.mockResolvedValue(createdQuote);
      mockDb.quoteLine.createMany.mockResolvedValue({ count: 3 });
      mockDb.quoteLine.findMany.mockResolvedValue(createdLines);
      mockDb.quote.findUnique.mockResolvedValue({
        ...createdQuote,
        contact: { id: "contact-1", displayName: "Test Client" },
        vehicleCategory: { id: "cat-1", name: "Van Premium" },
        endCustomer: null,
        lines: createdLines,
      });

      const app = new Hono().route("/", quotesRouter);
      const client = testClient(app);

      const payload = {
        contactId: "contact-1",
        vehicleCategoryId: "cat-1",
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: "2026-01-25T10:00:00Z",
        pickupAddress: "CDG Airport",
        dropoffAddress: "Paris",
        passengerCount: 4,
        luggageCount: 2,
        isYoloMode: true,
        lines: [
          {
            type: "CALCULATED",
            label: "CDG → Paris",
            totalPrice: 150,
            unitPrice: 150,
            sourceData: {
              origin: "CDG Airport",
              destination: "Paris",
              distance: 35,
              duration: 45,
              pickupAt: "2026-01-25T10:00:00Z",
            },
            displayData: {
              label: "CDG → Paris",
              quantity: 1,
              unitPrice: 150,
              vatRate: 10,
              total: 150,
            },
          },
          {
            type: "CALCULATED",
            label: "Paris → Versailles",
            totalPrice: 200,
            unitPrice: 200,
            sourceData: {
              origin: "Paris",
              destination: "Versailles",
              distance: 25,
              duration: 40,
              pickupAt: "2026-01-25T14:00:00Z",
            },
            displayData: {
              label: "Paris → Versailles",
              quantity: 1,
              unitPrice: 200,
              vatRate: 10,
              total: 200,
            },
          },
          {
            type: "CALCULATED",
            label: "Versailles → CDG",
            totalPrice: 100,
            unitPrice: 100,
            sourceData: {
              origin: "Versailles",
              destination: "CDG Airport",
              distance: 45,
              duration: 55,
              pickupAt: "2026-01-25T18:00:00Z",
            },
            displayData: {
              label: "Versailles → CDG",
              quantity: 1,
              unitPrice: 100,
              vatRate: 10,
              total: 100,
            },
          },
        ],
      };

      const response = await client.quotes.$post({
        json: payload as any,
      });

      expect(response.status).toBe(201);
      
      // Verify QuoteLineCreateMany was called with 3 lines
      expect(mockDb.quoteLine.createMany).toHaveBeenCalledTimes(1);
      const createManyCall = mockDb.quoteLine.createMany.mock.calls[0][0];
      expect(createManyCall.data).toHaveLength(3);
      
      // Verify each line has correct sortOrder
      expect(createManyCall.data[0].sortOrder).toBe(0);
      expect(createManyCall.data[1].sortOrder).toBe(1);
      expect(createManyCall.data[2].sortOrder).toBe(2);
      
      // Verify sourceData is preserved
      expect(createManyCall.data[0].sourceData).toEqual(payload.lines[0].sourceData);
      expect(createManyCall.data[1].sourceData).toEqual(payload.lines[1].sourceData);
      expect(createManyCall.data[2].sourceData).toEqual(payload.lines[2].sourceData);
    });

    it("TC3: aggregates finalPrice correctly from lines", async () => {
      const createdQuote = {
        id: "quote-456",
        organizationId: "test-org-id",
        finalPrice: 450,
      };
      
      mockDb.quote.create.mockResolvedValue(createdQuote);
      mockDb.quoteLine.createMany.mockResolvedValue({ count: 3 });
      mockDb.quoteLine.findMany.mockResolvedValue([]);
      mockDb.quote.findUnique.mockResolvedValue({
        ...createdQuote,
        contact: { id: "contact-1" },
        vehicleCategory: { id: "cat-1" },
        endCustomer: null,
        lines: [],
      });

      const app = new Hono().route("/", quotesRouter);
      const client = testClient(app);

      const payload = {
        contactId: "contact-1",
        vehicleCategoryId: "cat-1",
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: "2026-01-25T10:00:00Z",
        pickupAddress: "CDG Airport",
        dropoffAddress: "Paris",
        passengerCount: 4,
        finalPrice: 0,
        lines: [
          { type: "CALCULATED", label: "Line 1", totalPrice: 150 },
          { type: "CALCULATED", label: "Line 2", totalPrice: 200 },
          { type: "CALCULATED", label: "Line 3", totalPrice: 100 },
        ],
      };

      await client.quotes.$post({ json: payload as any });

      // Verify quote was created with aggregated price
      expect(mockDb.quote.create).toHaveBeenCalledTimes(1);
      const createCall = mockDb.quote.create.mock.calls[0][0];
      expect(createCall.data.finalPrice).toBe(450);
    });

    it("TC2: legacy single-item quote without lines works", async () => {
      const createdQuote = {
        id: "quote-789",
        organizationId: "test-org-id",
        finalPrice: 150,
      };
      
      mockDb.quote.create.mockResolvedValue(createdQuote);
      mockDb.quote.findUnique.mockResolvedValue({
        ...createdQuote,
        contact: { id: "contact-1" },
        vehicleCategory: { id: "cat-1" },
        endCustomer: null,
        lines: [],
      });

      const app = new Hono().route("/", quotesRouter);
      const client = testClient(app);

      const payload = {
        contactId: "contact-1",
        vehicleCategoryId: "cat-1",
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: "2026-01-25T10:00:00Z",
        pickupAddress: "CDG Airport",
        dropoffAddress: "Paris",
        passengerCount: 4,
        finalPrice: 150,
      };

      const response = await client.quotes.$post({ json: payload as any });

      expect(response.status).toBe(201);
      
      // Verify QuoteLineCreateMany was NOT called
      expect(mockDb.quoteLine.createMany).not.toHaveBeenCalled();
    });

    it("TC4: sourceData contains complete operational metadata", async () => {
      const createdQuote = { id: "quote-abc", organizationId: "test-org-id" };
      
      mockDb.quote.create.mockResolvedValue(createdQuote);
      mockDb.quoteLine.createMany.mockResolvedValue({ count: 1 });
      mockDb.quoteLine.findMany.mockResolvedValue([]);
      mockDb.quote.findUnique.mockResolvedValue({
        ...createdQuote,
        contact: { id: "contact-1" },
        vehicleCategory: { id: "cat-1" },
        endCustomer: null,
        lines: [],
      });

      const app = new Hono().route("/", quotesRouter);
      const client = testClient(app);

      const sourceData = {
        origin: "Aéroport CDG Terminal 2E",
        destination: "Paris 8ème, Champs-Élysées",
        pickupLatitude: 49.0097,
        pickupLongitude: 2.5479,
        dropoffLatitude: 48.8738,
        dropoffLongitude: 2.2950,
        distance: 35.5,
        duration: 45,
        pickupAt: "2026-01-25T10:00:00Z",
        vehicleCategoryId: "cat-1",
        tripType: "TRANSFER",
        formData: { passengerCount: 4, luggageCount: 2 },
        pricingResult: { price: 150, internalCost: 95 },
      };

      const payload = {
        contactId: "contact-1",
        vehicleCategoryId: "cat-1",
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: "2026-01-25T10:00:00Z",
        pickupAddress: "CDG Airport",
        dropoffAddress: "Paris",
        passengerCount: 4,
        lines: [
          {
            type: "CALCULATED",
            label: "CDG → Paris",
            totalPrice: 150,
            sourceData,
          },
        ],
      };

      await client.quotes.$post({ json: payload as any });

      // Verify sourceData is preserved completely
      const createManyCall = mockDb.quoteLine.createMany.mock.calls[0][0];
      expect(createManyCall.data[0].sourceData).toEqual(sourceData);
      expect(createManyCall.data[0].sourceData.origin).toBe("Aéroport CDG Terminal 2E");
      expect(createManyCall.data[0].sourceData.distance).toBe(35.5);
      expect(createManyCall.data[0].sourceData.formData).toEqual({ passengerCount: 4, luggageCount: 2 });
    });
  });
});
