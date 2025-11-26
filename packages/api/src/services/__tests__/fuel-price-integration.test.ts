/**
 * Fuel Price Service Integration Tests
 *
 * Story 4.8: Use Fuel Price Cache in Pricing Engine
 *
 * These tests verify the integration between the fuel price service
 * and the actual database. They require a seeded database.
 *
 * Run seed first: pnpm --filter @repo/database db:seed
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@repo/database";
import {
	getFuelPrice,
	isCacheEntryStale,
	FUEL_PRICE_STALENESS_HOURS,
	DEFAULT_COUNTRY_CODE,
	DEFAULT_FUEL_TYPE,
} from "../fuel-price-service";

// Skip these tests if running in CI without a real database
const SKIP_INTEGRATION = process.env.CI === "true" && !process.env.DATABASE_URL;

describe.skipIf(SKIP_INTEGRATION)("Fuel Price Service - Integration Tests", () => {
	let initialCacheCount: number;

	beforeAll(async () => {
		// Check if we have seeded data
		initialCacheCount = await db.fuelPriceCache.count();
		if (initialCacheCount === 0) {
			console.warn(
				"⚠️ No fuel price cache entries found. Run: pnpm --filter @repo/database db:seed",
			);
		}
	});

	afterAll(async () => {
		// Don't disconnect - let the test runner handle it
	});

	describe("IT1: Full pricing flow uses cached fuel price", () => {
		it("should return cached DIESEL price for France", async () => {
			// Skip if no data
			if (initialCacheCount === 0) {
				console.log("Skipping: No cache data available");
				return;
			}

			const result = await getFuelPrice({
				countryCode: "FR",
				fuelType: "DIESEL",
			});

			// Should get price from cache
			expect(result.source).toBe("CACHE");
			expect(result.currency).toBe("EUR");
			expect(result.countryCode).toBe("FR");
			expect(result.fuelType).toBe("DIESEL");
			expect(result.pricePerLitre).toBeGreaterThan(0);
			expect(result.pricePerLitre).toBeLessThan(5); // Sanity check
			expect(result.fetchedAt).toBeInstanceOf(Date);
		});

		it("should return cached GASOLINE price for France", async () => {
			if (initialCacheCount === 0) return;

			const result = await getFuelPrice({
				countryCode: "FR",
				fuelType: "GASOLINE",
			});

			expect(result.source).toBe("CACHE");
			expect(result.fuelType).toBe("GASOLINE");
			expect(result.pricePerLitre).toBeGreaterThan(0);
		});

		it("should return cached LPG price for France", async () => {
			if (initialCacheCount === 0) return;

			const result = await getFuelPrice({
				countryCode: "FR",
				fuelType: "LPG",
			});

			expect(result.source).toBe("CACHE");
			expect(result.fuelType).toBe("LPG");
			expect(result.pricePerLitre).toBeGreaterThan(0);
			// LPG is typically cheaper than diesel/gasoline
			expect(result.pricePerLitre).toBeLessThan(1.5);
		});
	});

	describe("IT2: Pricing continues with default when cache empty", () => {
		it("should return default price for non-existent country", async () => {
			const result = await getFuelPrice({
				countryCode: "XX", // Non-existent country
				fuelType: "DIESEL",
			});

			expect(result.source).toBe("DEFAULT");
			expect(result.pricePerLitre).toBe(1.80); // Default from DEFAULT_COST_PARAMETERS
			expect(result.fetchedAt).toBeNull();
			expect(result.isStale).toBe(false);
		});
	});

	describe("IT3: Staleness detection works correctly", () => {
		it("should detect stale entries (72h old entry in seed)", async () => {
			if (initialCacheCount === 0) return;

			// The seed creates an entry that is 72 hours old
			// Query directly to find it
			const staleEntry = await db.fuelPriceCache.findFirst({
				where: {
					countryCode: "FR",
					fuelType: "DIESEL",
				},
				orderBy: { fetchedAt: "asc" }, // Get oldest first
			});

			if (staleEntry) {
				const isStale = isCacheEntryStale(staleEntry.fetchedAt);
				// Entry from 72h ago should be stale (threshold is 48h)
				expect(isStale).toBe(true);
			}
		});

		it("should return most recent entry (not stale one)", async () => {
			if (initialCacheCount === 0) return;

			const result = await getFuelPrice({
				countryCode: "FR",
				fuelType: "DIESEL",
			});

			// Should get the most recent entry, not the stale one
			expect(result.source).toBe("CACHE");
			// Most recent entries should not be stale
			expect(result.isStale).toBe(false);
		});
	});

	describe("IT4: Database query performance", () => {
		it("should resolve fuel price quickly (< 100ms)", async () => {
			if (initialCacheCount === 0) return;

			const start = Date.now();
			await getFuelPrice({ countryCode: "FR", fuelType: "DIESEL" });
			const duration = Date.now() - start;

			expect(duration).toBeLessThan(100);
		});

		it("should handle multiple concurrent requests", async () => {
			if (initialCacheCount === 0) return;

			const requests = Array(10)
				.fill(null)
				.map(() => getFuelPrice({ countryCode: "FR", fuelType: "DIESEL" }));

			const results = await Promise.all(requests);

			// All should succeed
			expect(results).toHaveLength(10);
			results.forEach((result) => {
				expect(result.source).toBe("CACHE");
				expect(result.pricePerLitre).toBeGreaterThan(0);
			});
		});
	});

	describe("IT5: Data integrity checks", () => {
		it("should return consistent prices for same query", async () => {
			if (initialCacheCount === 0) return;

			const result1 = await getFuelPrice({ countryCode: "FR", fuelType: "DIESEL" });
			const result2 = await getFuelPrice({ countryCode: "FR", fuelType: "DIESEL" });

			expect(result1.pricePerLitre).toBe(result2.pricePerLitre);
			expect(result1.fetchedAt?.getTime()).toBe(result2.fetchedAt?.getTime());
		});

		it("should return different prices for different fuel types", async () => {
			if (initialCacheCount === 0) return;

			const diesel = await getFuelPrice({ countryCode: "FR", fuelType: "DIESEL" });
			const gasoline = await getFuelPrice({ countryCode: "FR", fuelType: "GASOLINE" });
			const lpg = await getFuelPrice({ countryCode: "FR", fuelType: "LPG" });

			// All should be from cache
			expect(diesel.source).toBe("CACHE");
			expect(gasoline.source).toBe("CACHE");
			expect(lpg.source).toBe("CACHE");

			// Prices should be different (based on seed data)
			// LPG is typically cheapest
			expect(lpg.pricePerLitre).toBeLessThan(diesel.pricePerLitre);
		});
	});
});
