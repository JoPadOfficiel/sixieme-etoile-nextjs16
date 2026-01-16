import { describe, it, expect, beforeEach, vi } from "vitest";
import { testClient } from "hono/testing";
import { Hono } from "hono";
import { pricingCalculateRouter } from "../pricing-calculate";
import type { ContactData } from "../../../services/pricing/types";

// Mock database
vi.mock("@repo/database", () => ({
  db: {
    contact: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    endCustomer: {
      findUnique: vi.fn(),
    },
    pricingZone: {
      findMany: vi.fn(),
    },
    vehicleCategory: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    organizationPricingSettings: {
      findFirst: vi.fn(),
    },
    organizationIntegrationSettings: {
      findFirst: vi.fn(),
    },
    advancedRate: {
      findMany: vi.fn(),
    },
    seasonalMultiplier: {
      findMany: vi.fn(),
    },
    vehicle: {
      findMany: vi.fn(),
    },
  },
}));

// Mock organization middleware
vi.mock("../../../middleware/organization", () => ({
  organizationMiddleware: vi.fn((c, next) => {
    c.set("organizationId", "test-org-id");
    return next();
  }),
}));

// Mock main calculator
// We need to mock the named export 'calculatePrice'
vi.mock("../../../services/pricing/main-calculator", () => ({
  calculatePrice: vi.fn(),
  calculatePriceWithRealTolls: vi.fn(), // If used
  // Add other exports if needed
  // resolveFuelConsumption moved to cost-calculator mock
  calculateShadowSegments: vi.fn(() => ({})),
  calculateTimeAnalysis: vi.fn(() => ({})),
  calculatePositioningCosts: vi.fn(() => ({})),
  calculateRoundTripSegments: vi.fn(() => ({})),
  extendTripAnalysisForRoundTrip: vi.fn(() => ({})),
  calculateEstimatedEndAt: vi.fn(),
  detectRoundTripBlocked: vi.fn(() => ({ isDriverBlocked: false })),
  detectDenseZone: vi.fn(() => ({ isIntraDenseZone: false })),
}));

// Mock services causing side effects
vi.mock("../../../services/fuel-price-service", () => ({
  fuelPriceService: {
    getPrice: vi.fn().mockResolvedValue(1.5),
  },
  FuelPriceService: vi.fn(),
  getFuelPrice: vi.fn().mockResolvedValue({
    pricePerLitre: 1.5,
    currency: "EUR",
    source: "DEFAULT",
    fetchedAt: null,
    isStale: false,
    fuelType: "DIESEL",
    countryCode: "FR",
  }),
}));

vi.mock("../../../services/pricing/cost-calculator", () => ({
  calculateTripCost: vi.fn(),
  resolveFuelConsumption: vi.fn(() => ({ consumptionL100km: 10, source: "DEFAULT" })),
  calculateCostBreakdown: vi.fn(), // adding this as well just in case
}));

// Mock geo-utils because they are used in the route
vi.mock("../../../lib/geo-utils", () => ({
  isPointInZone: vi.fn(),
  findZonesForPoint: vi.fn(() => []),
  resolveZoneConflict: vi.fn(),
  haversineDistance: vi.fn(() => 10),
  findZoneForPointWithCandidates: vi.fn(() => ({ selectedZone: null, candidateZones: [] })),
}));

// Mock google-routes-client if needed, or rely on undefined API key
vi.mock("../../../lib/google-routes-client", () => ({
  computeRoutes: vi.fn(),
  toRoutesWaypoint: vi.fn(),
}));

// Mock pricing engine logic
import { calculatePrice } from "../../../services/pricing/main-calculator";
import { db } from "@repo/database";

describe("Pricing Calculate API - Bidirectional Pricing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calculates bidirectional pricing for partner contacts", async () => {
    // Setup mocks
    
    // 1. Database mocks
    const mockContact = {
      id: "partner-contact-1",
      isPartner: true,
      partnerContract: { 
        id: "contract-1",
        zoneRoutes: [],
        excursionPackages: [],
        dispoPackages: [],
      },
      difficultyScore: null,
    };
    
    (db.contact.findFirst as any).mockResolvedValue(mockContact);
    (db.pricingZone.findMany as any).mockResolvedValue([]);
    (db.vehicleCategory.findUnique as any).mockResolvedValue({
      id: "cat-1",
      name: "Sedan",
      code: "SEDAN",
      priceMultiplier: 1.0,
      regulatoryCategory: "LIGHT",
    });
    (db.vehicleCategory.findFirst as any).mockResolvedValue({
      id: "cat-1",
      name: "Sedan",
      code: "SEDAN",
      priceMultiplier: 1.0,
      regulatoryCategory: "LIGHT",
    });
    (db.organizationPricingSettings.findFirst as any).mockResolvedValue({
      baseRatePerKm: 1.5,
      baseRatePerHour: 50,
      driverHourlyCost: 20,
    });
    (db.organizationIntegrationSettings.findFirst as any).mockResolvedValue(null);
    (db.advancedRate.findMany as any).mockResolvedValue([]);
    (db.seasonalMultiplier.findMany as any).mockResolvedValue([]);
    (db.vehicle.findMany as any).mockResolvedValue([]);

    // 2. Calculator mock
    // We want different returns for partner vs dynamic
    // calculatePrice is called twice.
    // First call (Partner Grid): returns fixed price
    // Second call (Client Direct): returns dynamic price
    (calculatePrice as any)
      .mockReturnValueOnce({
        price: 100, // Partner Price
        pricingMode: "FIXED_GRID",
        internalCost: 80,
        margin: 20,
        marginPercent: 20,
        tripAnalysis: {},
        appliedRules: [],
      })
      .mockReturnValueOnce({
        price: 120, // Client Direct Price
        pricingMode: "DYNAMIC",
        internalCost: 80,
        margin: 40,
        marginPercent: 33.3,
        tripAnalysis: {},
        appliedRules: [],
      });

    const app = new Hono().route("/", pricingCalculateRouter);
    const client = testClient(app);

    const response = await client.pricing.calculate.$post({
      json: {
        contactId: "partner-contact-1",
        pickup: { lat: 48.8, lng: 2.3, address: "Paris" },
        dropoff: { lat: 48.9, lng: 2.4, address: "Airport" },
        vehicleCategoryId: "cat-1",
        tripType: "transfer",
        pickupAt: new Date().toISOString(),
      } as any,
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;

    // Verify Bidirectional Logic
    expect(calculatePrice).toHaveBeenCalledTimes(2);
    
    // Check returned data
    expect(data.price).toBe(100); // Should return partner price as main price
    expect(data.pricingMode).toBe("PARTNER_GRID"); // Renamed from FIXED_GRID
    
    expect(data.bidirectionalPricing).toBeDefined();
    expect(data.bidirectionalPricing?.partnerGridPrice).toBe(100);
    expect(data.bidirectionalPricing?.clientDirectPrice).toBe(120);
    expect(data.bidirectionalPricing?.priceDifference).toBe(20);
    expect(data.bidirectionalPricing?.priceDifferencePercent).toBe(20);
  });

  it("does NOT calculate bidirectional pricing for private clients", async () => {
     // Setup mocks
    const mockContact = {
      id: "private-contact-1",
      isPartner: false, // Private
      partnerContract: null,
      difficultyScore: null,
    };
    
    (db.contact.findFirst as any).mockResolvedValue(mockContact);
    (db.pricingZone.findMany as any).mockResolvedValue([]);
    (db.vehicleCategory.findUnique as any).mockResolvedValue({
      id: "cat-1",
    });
    (db.vehicleCategory.findFirst as any).mockResolvedValue({
      id: "cat-1",
    });
    (db.organizationPricingSettings.findFirst as any).mockResolvedValue({
      baseRatePerKm: 1.5,
      baseRatePerHour: 50,
      driverHourlyCost: 20,
    });
    (db.organizationIntegrationSettings.findFirst as any).mockResolvedValue(null);
    (db.advancedRate.findMany as any).mockResolvedValue([]);
    (db.seasonalMultiplier.findMany as any).mockResolvedValue([]);
    (db.vehicle.findMany as any).mockResolvedValue([]);

    (calculatePrice as any).mockReturnValue({
      price: 150,
      pricingMode: "DYNAMIC",
      internalCost: 100,
      tripAnalysis: {},
      appliedRules: [],
    });

    const app = new Hono().route("/", pricingCalculateRouter);
    const client = testClient(app);

    const response = await client.pricing.calculate.$post({
      json: {
        contactId: "private-contact-1",
        pickup: { lat: 48.8, lng: 2.3, address: "Paris" },
        vehicleCategoryId: "cat-1",
        tripType: "transfer",
        dropoff: { lat: 48.9, lng: 2.4, address: "Airport" },
      } as any,
    });

    expect(response.status).toBe(200);
    const data = await response.json() as any;

    // Verify Logic
    expect(calculatePrice).toHaveBeenCalledTimes(1); // Only once
    expect(data.bidirectionalPricing).toBeUndefined();
    expect(data.pricingMode).toBe("CLIENT_DIRECT"); // Renamed from DYNAMIC
  });
});
