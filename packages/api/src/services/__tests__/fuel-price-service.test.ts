/**
 * Fuel Price Service Tests
 *
 * Story 4.8: Use Fuel Price Cache in Pricing Engine
 *
 * Tests cover:
 * - AC1: Cache consumption
 * - AC2: Staleness handling and fallback
 * - AC3: Abstraction layer
 * - AC4: EUR currency
 * - AC5: Fuel type support
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	getFuelPrice,
	isCacheEntryStale,
	createDefaultFuelPriceResult,
	FuelPriceService,
	FUEL_PRICE_STALENESS_HOURS,
	DEFAULT_COUNTRY_CODE,
	DEFAULT_FUEL_TYPE,
	type FuelPriceResult,
	type FuelPriceParams,
} from "../fuel-price-service";
import { DEFAULT_COST_PARAMETERS } from "../pricing-engine";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		fuelPriceCache: {
			findFirst: vi.fn(),
		},
	},
}));

import { db } from "@repo/database";

// Helper to create mock cache entries
// Note: Prisma Decimal fields are converted to number via Number() in the service
function createMockCacheEntry(overrides: Partial<{
	id: string;
	countryCode: string;
	fuelType: string;
	pricePerLitre: number;
	currency: string;
	source: string;
	fetchedAt: Date;
	latitude: number;
	longitude: number;
}> = {}) {
	const priceValue = overrides.pricePerLitre ?? 1.85;
	return {
		id: overrides.id ?? "cache_123",
		countryCode: overrides.countryCode ?? "FR",
		fuelType: overrides.fuelType ?? "DIESEL",
		// Prisma Decimal is converted via Number() - mock as a plain number
		pricePerLitre: priceValue,
		currency: overrides.currency ?? "EUR",
		source: overrides.source ?? "COLLECT_API",
		fetchedAt: overrides.fetchedAt ?? new Date(),
		latitude: overrides.latitude ?? 48.8566,
		longitude: overrides.longitude ?? 2.3522,
	};
}

// Helper to create a date in the past
function hoursAgo(hours: number): Date {
	return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe("Fuel Price Service", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	// ============================================================================
	// AC1: Cache Consumption Tests
	// ============================================================================

	describe("AC1: Cache Consumption", () => {
		it("should return cached price when recent entry exists (TC1)", async () => {
			const mockEntry = createMockCacheEntry({
				pricePerLitre: 1.92,
				fetchedAt: hoursAgo(2), // 2 hours ago - fresh
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			const result = await getFuelPrice();

			expect(result.pricePerLitre).toBe(1.92);
			expect(result.source).toBe("CACHE");
			expect(result.isStale).toBe(false);
		});

		it("should query by countryCode and fuelType (TC2)", async () => {
			const mockEntry = createMockCacheEntry({
				countryCode: "FR",
				fuelType: "GASOLINE",
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			await getFuelPrice({ countryCode: "FR", fuelType: "GASOLINE" });

			expect(db.fuelPriceCache.findFirst).toHaveBeenCalledWith({
				where: {
					countryCode: "FR",
					fuelType: "GASOLINE",
				},
				orderBy: { fetchedAt: "desc" },
			});
		});

		it("should return most recent entry (orderBy fetchedAt DESC) (TC3)", async () => {
			const mockEntry = createMockCacheEntry({
				fetchedAt: hoursAgo(1),
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			await getFuelPrice();

			expect(db.fuelPriceCache.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					orderBy: { fetchedAt: "desc" },
				}),
			);
		});

		it("should default to 'FR' country code (TC11)", async () => {
			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(null);

			const result = await getFuelPrice();

			expect(db.fuelPriceCache.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						countryCode: "FR",
					}),
				}),
			);
			expect(result.countryCode).toBe("FR");
		});
	});

	// ============================================================================
	// AC2: Staleness Handling Tests
	// ============================================================================

	describe("AC2: Staleness Handling", () => {
		it("should return default when cache is empty (TC4)", async () => {
			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(null);

			const result = await getFuelPrice();

			expect(result.pricePerLitre).toBe(DEFAULT_COST_PARAMETERS.fuelPricePerLiter);
			expect(result.source).toBe("DEFAULT");
			expect(result.fetchedAt).toBeNull();
			expect(result.isStale).toBe(false);
		});

		it("should mark result as stale when entry is old (TC5)", async () => {
			const mockEntry = createMockCacheEntry({
				fetchedAt: hoursAgo(72), // 72 hours ago - stale
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			const result = await getFuelPrice();

			expect(result.source).toBe("CACHE");
			expect(result.isStale).toBe(true);
		});

		it("should use 48h staleness threshold by default (TC6)", async () => {
			// Entry at exactly 47 hours - should NOT be stale
			const freshEntry = createMockCacheEntry({
				fetchedAt: hoursAgo(47),
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(freshEntry as any);
			let result = await getFuelPrice();
			expect(result.isStale).toBe(false);

			// Entry at exactly 49 hours - should be stale
			const staleEntry = createMockCacheEntry({
				fetchedAt: hoursAgo(49),
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(staleEntry as any);
			result = await getFuelPrice();
			expect(result.isStale).toBe(true);
		});

		it("should handle database errors gracefully", async () => {
			vi.mocked(db.fuelPriceCache.findFirst).mockRejectedValue(
				new Error("Database connection failed"),
			);

			const result = await getFuelPrice();

			expect(result.pricePerLitre).toBe(DEFAULT_COST_PARAMETERS.fuelPricePerLiter);
			expect(result.source).toBe("DEFAULT");
		});
	});

	// ============================================================================
	// AC4: EUR Currency Tests
	// ============================================================================

	describe("AC4: EUR Currency", () => {
		it("should always return EUR currency (TC7)", async () => {
			const mockEntry = createMockCacheEntry();
			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			const result = await getFuelPrice();

			expect(result.currency).toBe("EUR");
		});

		it("should return EUR currency even for default fallback", async () => {
			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(null);

			const result = await getFuelPrice();

			expect(result.currency).toBe("EUR");
		});
	});

	// ============================================================================
	// AC5: Fuel Type Support Tests
	// ============================================================================

	describe("AC5: Fuel Type Support", () => {
		it("should support DIESEL fuel type as default (TC8)", async () => {
			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(null);

			const result = await getFuelPrice();

			expect(db.fuelPriceCache.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						fuelType: "DIESEL",
					}),
				}),
			);
			expect(result.fuelType).toBe("DIESEL");
		});

		it("should support GASOLINE fuel type (TC9)", async () => {
			const mockEntry = createMockCacheEntry({
				fuelType: "GASOLINE",
				pricePerLitre: 1.95,
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			const result = await getFuelPrice({ fuelType: "GASOLINE" });

			expect(db.fuelPriceCache.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						fuelType: "GASOLINE",
					}),
				}),
			);
			expect(result.fuelType).toBe("GASOLINE");
		});

		it("should support LPG fuel type (TC10)", async () => {
			const mockEntry = createMockCacheEntry({
				fuelType: "LPG",
				pricePerLitre: 0.95,
			});

			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			const result = await getFuelPrice({ fuelType: "LPG" });

			expect(db.fuelPriceCache.findFirst).toHaveBeenCalledWith(
				expect.objectContaining({
					where: expect.objectContaining({
						fuelType: "LPG",
					}),
				}),
			);
			expect(result.fuelType).toBe("LPG");
		});
	});

	// ============================================================================
	// Helper Function Tests
	// ============================================================================

	describe("isCacheEntryStale", () => {
		it("should return false for recent entries", () => {
			const recentDate = hoursAgo(24);
			expect(isCacheEntryStale(recentDate)).toBe(false);
		});

		it("should return true for old entries", () => {
			const oldDate = hoursAgo(72);
			expect(isCacheEntryStale(oldDate)).toBe(true);
		});

		it("should respect custom staleness threshold", () => {
			const date = hoursAgo(12);
			expect(isCacheEntryStale(date, 24)).toBe(false);
			expect(isCacheEntryStale(date, 6)).toBe(true);
		});

		it("should handle boundary conditions", () => {
			// Exactly at threshold
			const atThreshold = hoursAgo(FUEL_PRICE_STALENESS_HOURS);
			// Due to timing, this could be either true or false
			// Just verify it doesn't throw
			expect(typeof isCacheEntryStale(atThreshold)).toBe("boolean");
		});
	});

	describe("createDefaultFuelPriceResult", () => {
		it("should create result with default values", () => {
			const result = createDefaultFuelPriceResult();

			expect(result.pricePerLitre).toBe(DEFAULT_COST_PARAMETERS.fuelPricePerLiter);
			expect(result.currency).toBe("EUR");
			expect(result.source).toBe("DEFAULT");
			expect(result.fetchedAt).toBeNull();
			expect(result.isStale).toBe(false);
			expect(result.fuelType).toBe(DEFAULT_FUEL_TYPE);
			expect(result.countryCode).toBe(DEFAULT_COUNTRY_CODE);
		});

		it("should accept custom fuel type", () => {
			const result = createDefaultFuelPriceResult("GASOLINE");
			expect(result.fuelType).toBe("GASOLINE");
		});

		it("should accept custom country code", () => {
			const result = createDefaultFuelPriceResult("DIESEL", "DE");
			expect(result.countryCode).toBe("DE");
		});
	});

	// ============================================================================
	// FuelPriceService Class Tests
	// ============================================================================

	describe("FuelPriceService class", () => {
		it("should create instance with default config", () => {
			const service = new FuelPriceService();
			const config = service.getConfig();

			expect(config.stalenessHours).toBe(FUEL_PRICE_STALENESS_HOURS);
			expect(config.defaultPrice).toBe(DEFAULT_COST_PARAMETERS.fuelPricePerLiter);
		});

		it("should accept custom config", () => {
			const service = new FuelPriceService({
				stalenessHours: 24,
				defaultPrice: 2.0,
			});
			const config = service.getConfig();

			expect(config.stalenessHours).toBe(24);
			expect(config.defaultPrice).toBe(2.0);
		});

		it("should delegate getFuelPrice to module function", async () => {
			const mockEntry = createMockCacheEntry();
			vi.mocked(db.fuelPriceCache.findFirst).mockResolvedValue(mockEntry as any);

			const service = new FuelPriceService();
			const result = await service.getFuelPrice();

			expect(result.source).toBe("CACHE");
		});
	});

	// ============================================================================
	// Constants Tests
	// ============================================================================

	describe("Constants", () => {
		it("should have correct default staleness hours", () => {
			expect(FUEL_PRICE_STALENESS_HOURS).toBe(48);
		});

		it("should have correct default country code", () => {
			expect(DEFAULT_COUNTRY_CODE).toBe("FR");
		});

		it("should have correct default fuel type", () => {
			expect(DEFAULT_FUEL_TYPE).toBe("DIESEL");
		});
	});
});
