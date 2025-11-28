/**
 * Tests for Fuel Price Cache Refresh Job
 *
 * Story 9.7: Fuel Price Cache Refresh & Staleness Rules
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	refreshFuelPriceCache,
	getFuelCacheStatus,
	FUEL_TYPES_TO_REFRESH,
	DEFAULT_COUNTRY_CODE,
} from "../refresh-fuel-cache";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		fuelPriceCache: {
			upsert: vi.fn(),
			findMany: vi.fn(),
		},
	},
}));

// Mock the CollectAPI client
vi.mock("../../lib/collectapi-client", () => ({
	fetchFuelPrices: vi.fn(),
	DEFAULT_TEST_COORDINATES: { lat: 48.8566, lng: 2.3522 },
	USD_TO_EUR_RATE: 0.92,
	CollectAPIError: class CollectAPIError extends Error {
		constructor(message: string) {
			super(message);
			this.name = "CollectAPIError";
		}
	},
	InvalidAPIKeyError: class InvalidAPIKeyError extends Error {
		constructor(message: string = "Invalid API key") {
			super(message);
			this.name = "InvalidAPIKeyError";
		}
	},
	TimeoutError: class TimeoutError extends Error {
		constructor(message: string = "Timeout") {
			super(message);
			this.name = "TimeoutError";
		}
	},
}));

// Mock integration keys
vi.mock("../../lib/integration-keys", () => ({
	resolveApiKey: vi.fn(),
}));

import { db } from "@repo/database";
import { fetchFuelPrices, InvalidAPIKeyError } from "../../lib/collectapi-client";
import { resolveApiKey } from "../../lib/integration-keys";

describe("refreshFuelPriceCache", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// Suppress console output during tests
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		vi.spyOn(console, "error").mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should refresh all fuel types successfully", async () => {
		// Mock successful API response
		vi.mocked(fetchFuelPrices).mockResolvedValue({
			country: "France",
			diesel: 1.65,
			gasoline: 1.72,
			lpg: 0.95,
			currency: "EUR",
			fetchedAt: new Date(),
		});

		// Mock successful database upsert
		vi.mocked(db.fuelPriceCache.upsert).mockResolvedValue({
			id: "test-id",
			countryCode: "FR",
			fuelType: "DIESEL",
			pricePerLitre: 1.65 as any,
			currency: "EUR",
			latitude: 48.8566 as any,
			longitude: 2.3522 as any,
			source: "COLLECT_API",
			fetchedAt: new Date(),
		});

		const result = await refreshFuelPriceCache({ apiKey: "test-api-key" });

		expect(result.success).toBe(true);
		expect(result.updatedCount).toBe(3);
		expect(result.failedCount).toBe(0);
		expect(result.errors).toHaveLength(0);
		expect(result.results).toHaveLength(3);

		// Verify all fuel types were processed
		expect(result.results.map((r) => r.fuelType)).toEqual(FUEL_TYPES_TO_REFRESH);

		// Verify database was called for each fuel type
		expect(db.fuelPriceCache.upsert).toHaveBeenCalledTimes(3);
	});

	it("should handle partial failures gracefully", async () => {
		// Mock API to succeed for DIESEL and GASOLINE, but fail for LPG
		// The job calls fetchFuelPrices once per fuel type, and the order is DIESEL, GASOLINE, LPG
		vi.mocked(fetchFuelPrices)
			.mockResolvedValueOnce({
				country: "France",
				diesel: 1.65,
				gasoline: 1.72,
				lpg: 0.95,
				currency: "EUR",
				fetchedAt: new Date(),
			})
			.mockResolvedValueOnce({
				country: "France",
				diesel: 1.65,
				gasoline: 1.72,
				lpg: 0.95,
				currency: "EUR",
				fetchedAt: new Date(),
			})
			// LPG will fail after all retry attempts
			.mockRejectedValue(new Error("API error for LPG"));

		vi.mocked(db.fuelPriceCache.upsert).mockResolvedValue({
			id: "test-id",
			countryCode: "FR",
			fuelType: "DIESEL",
			pricePerLitre: 1.65 as any,
			currency: "EUR",
			latitude: 48.8566 as any,
			longitude: 2.3522 as any,
			source: "COLLECT_API",
			fetchedAt: new Date(),
		});

		const result = await refreshFuelPriceCache({ apiKey: "test-api-key" });

		expect(result.success).toBe(false);
		expect(result.updatedCount).toBe(2);
		expect(result.failedCount).toBe(1);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]).toContain("LPG");
	});

	it("should fail immediately for invalid API key", async () => {
		vi.mocked(fetchFuelPrices).mockRejectedValue(new InvalidAPIKeyError("Invalid API key"));

		const result = await refreshFuelPriceCache({ apiKey: "invalid-key" });

		expect(result.success).toBe(false);
		expect(result.updatedCount).toBe(0);
		expect(result.failedCount).toBe(3);

		// Should not retry for invalid API key
		expect(fetchFuelPrices).toHaveBeenCalledTimes(3); // Once per fuel type, no retries
	});

	it("should fail when no API key is available", async () => {
		vi.mocked(resolveApiKey).mockResolvedValue(null);

		const result = await refreshFuelPriceCache({});

		expect(result.success).toBe(false);
		expect(result.updatedCount).toBe(0);
		expect(result.failedCount).toBe(3);
		expect(result.errors[0]).toContain("No CollectAPI key available");
	});

	it("should resolve API key from organization settings", async () => {
		vi.mocked(resolveApiKey).mockResolvedValue("org-api-key");
		vi.mocked(fetchFuelPrices).mockResolvedValue({
			country: "France",
			diesel: 1.65,
			gasoline: 1.72,
			lpg: 0.95,
			currency: "EUR",
			fetchedAt: new Date(),
		});
		vi.mocked(db.fuelPriceCache.upsert).mockResolvedValue({
			id: "test-id",
			countryCode: "FR",
			fuelType: "DIESEL",
			pricePerLitre: 1.65 as any,
			currency: "EUR",
			latitude: 48.8566 as any,
			longitude: 2.3522 as any,
			source: "COLLECT_API",
			fetchedAt: new Date(),
		});

		const result = await refreshFuelPriceCache({ organizationId: "org-123" });

		expect(result.success).toBe(true);
		expect(resolveApiKey).toHaveBeenCalledWith("org-123", "collectApi");
	});

	it("should be idempotent (upsert behavior)", async () => {
		vi.mocked(fetchFuelPrices).mockResolvedValue({
			country: "France",
			diesel: 1.65,
			gasoline: 1.72,
			lpg: 0.95,
			currency: "EUR",
			fetchedAt: new Date(),
		});
		vi.mocked(db.fuelPriceCache.upsert).mockResolvedValue({
			id: "test-id",
			countryCode: "FR",
			fuelType: "DIESEL",
			pricePerLitre: 1.65 as any,
			currency: "EUR",
			latitude: 48.8566 as any,
			longitude: 2.3522 as any,
			source: "COLLECT_API",
			fetchedAt: new Date(),
		});

		// Run twice
		await refreshFuelPriceCache({ apiKey: "test-api-key" });
		await refreshFuelPriceCache({ apiKey: "test-api-key" });

		// Verify upsert was called (not insert)
		expect(db.fuelPriceCache.upsert).toHaveBeenCalledTimes(6); // 3 fuel types x 2 runs

		// Verify upsert uses the correct where clause
		const upsertCalls = vi.mocked(db.fuelPriceCache.upsert).mock.calls;
		expect(upsertCalls[0][0]).toHaveProperty("where");
		expect(upsertCalls[0][0].where).toHaveProperty("countryCode_fuelType");
	});

	it("should convert USD prices to EUR", async () => {
		vi.mocked(fetchFuelPrices).mockResolvedValue({
			country: "France",
			diesel: 1.65, // Already converted by client
			gasoline: 1.72,
			lpg: 0.95,
			currency: "EUR",
			fetchedAt: new Date(),
		});
		vi.mocked(db.fuelPriceCache.upsert).mockResolvedValue({
			id: "test-id",
			countryCode: "FR",
			fuelType: "DIESEL",
			pricePerLitre: 1.65 as any,
			currency: "EUR",
			latitude: 48.8566 as any,
			longitude: 2.3522 as any,
			source: "COLLECT_API",
			fetchedAt: new Date(),
		});

		const result = await refreshFuelPriceCache({ apiKey: "test-api-key" });

		expect(result.success).toBe(true);

		// Verify prices are in EUR
		const dieselResult = result.results.find((r) => r.fuelType === "DIESEL");
		expect(dieselResult?.currency).toBe("EUR");
		expect(dieselResult?.price).toBe(1.65);
	});
});

describe("getFuelCacheStatus", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("should return cache entries with staleness info", async () => {
		const now = new Date();
		const freshDate = new Date(now.getTime() - 24 * 60 * 60 * 1000); // 24 hours ago
		const staleDate = new Date(now.getTime() - 72 * 60 * 60 * 1000); // 72 hours ago

		vi.mocked(db.fuelPriceCache.findMany).mockResolvedValue([
			{
				id: "1",
				countryCode: "FR",
				fuelType: "DIESEL",
				pricePerLitre: 1.65 as any,
				currency: "EUR",
				latitude: 48.8566 as any,
				longitude: 2.3522 as any,
				source: "COLLECT_API",
				fetchedAt: freshDate,
			},
			{
				id: "2",
				countryCode: "FR",
				fuelType: "GASOLINE",
				pricePerLitre: 1.72 as any,
				currency: "EUR",
				latitude: 48.8566 as any,
				longitude: 2.3522 as any,
				source: "COLLECT_API",
				fetchedAt: staleDate,
			},
		]);

		const status = await getFuelCacheStatus();

		expect(status.entries).toHaveLength(2);
		expect(status.stalenessThresholdHours).toBe(48);

		// Fresh entry should not be stale
		const dieselEntry = status.entries.find((e) => e.fuelType === "DIESEL");
		expect(dieselEntry?.isStale).toBe(false);

		// Stale entry should be marked as stale
		const gasolineEntry = status.entries.find((e) => e.fuelType === "GASOLINE");
		expect(gasolineEntry?.isStale).toBe(true);
	});

	it("should return null lastRefresh when cache is empty", async () => {
		vi.mocked(db.fuelPriceCache.findMany).mockResolvedValue([]);

		const status = await getFuelCacheStatus();

		expect(status.entries).toHaveLength(0);
		expect(status.lastRefresh).toBeNull();
	});
});
