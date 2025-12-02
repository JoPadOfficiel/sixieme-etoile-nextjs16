/**
 * Toll Service Tests
 * Story 15.1: Integrate Google Routes API for Real Toll Costs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
	hashCoordinates,
	parseTollAmount,
	calculateFallbackToll,
	callGoogleRoutesAPI,
	getTollCost,
	TOLL_CACHE_TTL_HOURS,
	COORDINATE_PRECISION,
} from "../toll-service";

// Mock the database
vi.mock("@repo/database", () => ({
	db: {
		tollCache: {
			findUnique: vi.fn(),
			upsert: vi.fn(),
			deleteMany: vi.fn(),
		},
	},
}));

import { db } from "@repo/database";

describe("TollService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("hashCoordinates", () => {
		it("should create consistent hash for same coordinates", () => {
			const point = { lat: 48.8566, lng: 2.3522 };
			const hash1 = hashCoordinates(point);
			const hash2 = hashCoordinates(point);
			expect(hash1).toBe(hash2);
		});

		it("should create different hash for different coordinates", () => {
			const point1 = { lat: 48.8566, lng: 2.3522 };
			const point2 = { lat: 45.7640, lng: 4.8357 };
			const hash1 = hashCoordinates(point1);
			const hash2 = hashCoordinates(point2);
			expect(hash1).not.toBe(hash2);
		});

		it("should round coordinates to COORDINATE_PRECISION decimals", () => {
			// These should hash to the same value due to rounding to 4 decimals
			// 48.85661234 rounds to 48.8566, 48.85664999 also rounds to 48.8566
			const point1 = { lat: 48.85661234, lng: 2.35221234 };
			const point2 = { lat: 48.85664999, lng: 2.35224999 };
			const hash1 = hashCoordinates(point1);
			const hash2 = hashCoordinates(point2);
			expect(hash1).toBe(hash2);
		});

		it("should return 16-character hash", () => {
			const point = { lat: 48.8566, lng: 2.3522 };
			const hash = hashCoordinates(point);
			expect(hash.length).toBe(16);
		});
	});

	describe("parseTollAmount", () => {
		it("should parse toll amount from valid response", () => {
			const response = {
				routes: [{
					travelAdvisory: {
						tollInfo: {
							estimatedPrice: [{ currencyCode: "EUR", units: "35" }],
						},
					},
				}],
			};
			expect(parseTollAmount(response)).toBe(35);
		});

		it("should handle nanos in price", () => {
			const response = {
				routes: [{
					travelAdvisory: {
						tollInfo: {
							estimatedPrice: [{ currencyCode: "EUR", units: "35", nanos: 500000000 }],
						},
					},
				}],
			};
			expect(parseTollAmount(response)).toBe(35.5);
		});

		it("should return 0 when no toll info", () => {
			const response = {
				routes: [{ travelAdvisory: {} }],
			};
			expect(parseTollAmount(response)).toBe(0);
		});

		it("should return 0 when no routes", () => {
			const response = { routes: [] };
			expect(parseTollAmount(response)).toBe(0);
		});

		it("should return 0 when empty estimated price", () => {
			const response = {
				routes: [{
					travelAdvisory: {
						tollInfo: {
							estimatedPrice: [],
						},
					},
				}],
			};
			expect(parseTollAmount(response)).toBe(0);
		});

		it("should filter non-EUR currencies", () => {
			const response = {
				routes: [{
					travelAdvisory: {
						tollInfo: {
							estimatedPrice: [
								{ currencyCode: "USD", units: "50" },
								{ currencyCode: "EUR", units: "35" },
							],
						},
					},
				}],
			};
			expect(parseTollAmount(response)).toBe(35);
		});

		it("should sum multiple EUR prices", () => {
			const response = {
				routes: [{
					travelAdvisory: {
						tollInfo: {
							estimatedPrice: [
								{ currencyCode: "EUR", units: "20" },
								{ currencyCode: "EUR", units: "15" },
							],
						},
					},
				}],
			};
			expect(parseTollAmount(response)).toBe(35);
		});
	});

	describe("calculateFallbackToll", () => {
		it("should calculate toll based on distance and rate", () => {
			expect(calculateFallbackToll(100, 0.12)).toBe(12);
		});

		it("should round to 2 decimal places", () => {
			expect(calculateFallbackToll(33.33, 0.12)).toBe(4);
		});

		it("should return 0 for 0 distance", () => {
			expect(calculateFallbackToll(0, 0.12)).toBe(0);
		});

		it("should return 0 for 0 rate", () => {
			expect(calculateFallbackToll(100, 0)).toBe(0);
		});
	});

	describe("callGoogleRoutesAPI", () => {
		it("should call API with correct parameters", async () => {
			const mockFetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					routes: [{
						travelAdvisory: {
							tollInfo: {
								estimatedPrice: [{ currencyCode: "EUR", units: "35" }],
							},
						},
					}],
				}),
			});
			global.fetch = mockFetch;

			const result = await callGoogleRoutesAPI(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				"test-api-key",
			);

			expect(result.success).toBe(true);
			expect(result.tollAmount).toBe(35);
			expect(mockFetch).toHaveBeenCalledWith(
				"https://routes.googleapis.com/directions/v2:computeRoutes",
				expect.objectContaining({
					method: "POST",
					headers: expect.objectContaining({
						"X-Goog-Api-Key": "test-api-key",
					}),
				}),
			);
		});

		it("should return 0 toll for routes without tolls", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					routes: [{ travelAdvisory: {} }],
				}),
			});

			const result = await callGoogleRoutesAPI(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 48.8606, lng: 2.3376 },
				"test-api-key",
			);

			expect(result.success).toBe(true);
			expect(result.tollAmount).toBe(0);
		});

		it("should handle HTTP errors", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: false,
				status: 403,
				text: () => Promise.resolve("Forbidden"),
			});

			const result = await callGoogleRoutesAPI(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				"invalid-key",
			);

			expect(result.success).toBe(false);
			expect(result.error).toContain("HTTP 403");
		});

		it("should handle API error response", async () => {
			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					error: { message: "Invalid API key" },
				}),
			});

			const result = await callGoogleRoutesAPI(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				"invalid-key",
			);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Invalid API key");
		});

		it("should handle network errors", async () => {
			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await callGoogleRoutesAPI(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				"test-api-key",
			);

			expect(result.success).toBe(false);
			expect(result.error).toBe("Network error");
		});
	});

	describe("getTollCost", () => {
		it("should return cached result if valid", async () => {
			const mockCached = {
				tollAmount: 35,
				source: "GOOGLE_API",
				fetchedAt: new Date(),
				expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
			};
			(db.tollCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(mockCached);

			const result = await getTollCost(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				{ apiKey: "test-key", fallbackRatePerKm: 0.12 },
			);

			expect(result.amount).toBe(35);
			expect(result.source).toBe("GOOGLE_API");
			expect(result.isFromCache).toBe(true);
		});

		it("should call API when cache expired", async () => {
			const expiredCache = {
				tollAmount: 30,
				source: "GOOGLE_API",
				fetchedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
				expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
			};
			(db.tollCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(expiredCache);
			(db.tollCache.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					routes: [{
						travelAdvisory: {
							tollInfo: {
								estimatedPrice: [{ currencyCode: "EUR", units: "40" }],
							},
						},
					}],
				}),
			});

			const result = await getTollCost(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				{ apiKey: "test-key", fallbackRatePerKm: 0.12 },
			);

			expect(result.amount).toBe(40);
			expect(result.source).toBe("GOOGLE_API");
			expect(result.isFromCache).toBe(false);
		});

		it("should return fallback marker when API fails", async () => {
			(db.tollCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
			global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

			const result = await getTollCost(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				{ apiKey: "test-key", fallbackRatePerKm: 0.12 },
			);

			expect(result.amount).toBe(-1);
			expect(result.source).toBe("ESTIMATE");
		});

		it("should return fallback marker when no API key", async () => {
			(db.tollCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const result = await getTollCost(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				{ apiKey: "", fallbackRatePerKm: 0.12 },
			);

			expect(result.amount).toBe(-1);
			expect(result.source).toBe("ESTIMATE");
		});

		it("should cache successful API results", async () => {
			(db.tollCache.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
			(db.tollCache.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});

			global.fetch = vi.fn().mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({
					routes: [{
						travelAdvisory: {
							tollInfo: {
								estimatedPrice: [{ currencyCode: "EUR", units: "35" }],
							},
						},
					}],
				}),
			});

			await getTollCost(
				{ lat: 48.8566, lng: 2.3522 },
				{ lat: 45.7640, lng: 4.8357 },
				{ apiKey: "test-key", fallbackRatePerKm: 0.12 },
			);

			expect(db.tollCache.upsert).toHaveBeenCalledWith(
				expect.objectContaining({
					create: expect.objectContaining({
						tollAmount: 35,
						source: "GOOGLE_API",
					}),
				}),
			);
		});
	});
});
