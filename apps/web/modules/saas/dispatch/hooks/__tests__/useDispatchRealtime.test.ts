"use client";

import { describe, expect, it } from "vitest";
import {
	DISPATCH_QUERY_OPTIONS,
	DISPATCH_REALTIME_CONFIG,
} from "../useDispatchRealtime";

/**
 * Tests for useDispatchRealtime Hook
 *
 * Story 27.13: Real-Time Updates (Polling/Socket)
 *
 * Validates the centralized polling configuration for the Dispatch module.
 */

describe("useDispatchRealtime", () => {
	describe("DISPATCH_REALTIME_CONFIG", () => {
		it("should have a 10-second polling interval", () => {
			expect(DISPATCH_REALTIME_CONFIG.REFETCH_INTERVAL_MS).toBe(10_000);
		});

		it("should have a 5-second stale time", () => {
			expect(DISPATCH_REALTIME_CONFIG.STALE_TIME_MS).toBe(5_000);
		});

		it("should enable window focus revalidation", () => {
			expect(DISPATCH_REALTIME_CONFIG.REFETCH_ON_WINDOW_FOCUS).toBe(true);
		});

		it("should have 3 retry attempts", () => {
			expect(DISPATCH_REALTIME_CONFIG.RETRY).toBe(3);
		});

		it("should have exponential backoff retry delay capped at 30s", () => {
			const retryDelay = DISPATCH_REALTIME_CONFIG.RETRY_DELAY;

			// First retry: 1000 * 2^0 = 1000ms
			expect(retryDelay(0)).toBe(1000);

			// Second retry: 1000 * 2^1 = 2000ms
			expect(retryDelay(1)).toBe(2000);

			// Third retry: 1000 * 2^2 = 4000ms
			expect(retryDelay(2)).toBe(4000);

			// High attempt: should be capped at 30000ms
			expect(retryDelay(10)).toBe(30000);
		});
	});

	describe("DISPATCH_QUERY_OPTIONS", () => {
		it("should spread REFETCH_INTERVAL_MS correctly", () => {
			expect(DISPATCH_QUERY_OPTIONS.refetchInterval).toBe(
				DISPATCH_REALTIME_CONFIG.REFETCH_INTERVAL_MS,
			);
		});

		it("should spread STALE_TIME_MS correctly", () => {
			expect(DISPATCH_QUERY_OPTIONS.staleTime).toBe(
				DISPATCH_REALTIME_CONFIG.STALE_TIME_MS,
			);
		});

		it("should spread REFETCH_ON_WINDOW_FOCUS correctly", () => {
			expect(DISPATCH_QUERY_OPTIONS.refetchOnWindowFocus).toBe(
				DISPATCH_REALTIME_CONFIG.REFETCH_ON_WINDOW_FOCUS,
			);
		});

		it("should spread RETRY correctly", () => {
			expect(DISPATCH_QUERY_OPTIONS.retry).toBe(DISPATCH_REALTIME_CONFIG.RETRY);
		});

		it("should have placeholderData configured for keepPreviousData", () => {
			// keepPreviousData is a function from TanStack Query
			expect(typeof DISPATCH_QUERY_OPTIONS.placeholderData).toBe("function");
		});

		it("should have retryDelay configured", () => {
			expect(DISPATCH_QUERY_OPTIONS.retryDelay).toBe(
				DISPATCH_REALTIME_CONFIG.RETRY_DELAY,
			);
		});
	});

	describe("Configuration Consistency", () => {
		it("staleTime should be less than refetchInterval to avoid redundant requests", () => {
			expect(DISPATCH_REALTIME_CONFIG.STALE_TIME_MS).toBeLessThan(
				DISPATCH_REALTIME_CONFIG.REFETCH_INTERVAL_MS,
			);
		});

		it("polling interval should be reasonable for multi-user sync (5-30 seconds)", () => {
			expect(
				DISPATCH_REALTIME_CONFIG.REFETCH_INTERVAL_MS,
			).toBeGreaterThanOrEqual(5_000);
			expect(DISPATCH_REALTIME_CONFIG.REFETCH_INTERVAL_MS).toBeLessThanOrEqual(
				30_000,
			);
		});
	});
});
