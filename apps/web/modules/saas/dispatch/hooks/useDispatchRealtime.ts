"use client";

/**
 * useDispatchRealtime Configuration
 *
 * Story 27.13: Real-Time Updates (Polling/Socket)
 *
 * Centralized configuration for real-time data synchronization in the Dispatch module.
 * Phase 1: TanStack Query polling with window focus revalidation.
 * Phase 2 (future): Supabase Realtime or WebSocket integration.
 */

import {
	type QueryObserverOptions,
	keepPreviousData,
} from "@tanstack/react-query";

/**
 * Configuration constants for Dispatch real-time polling.
 * These values are optimized for multi-user synchronization while
 * maintaining reasonable API load.
 */
export const DISPATCH_REALTIME_CONFIG = {
	/**
	 * Polling interval in milliseconds.
	 * 10 seconds provides a good balance between data freshness
	 * and API performance for multi-dispatcher environments.
	 */
	REFETCH_INTERVAL_MS: 10_000, // 10 seconds

	/**
	 * Time before data is considered stale (in milliseconds).
	 * If data was fetched within this window, TanStack Query
	 * will serve the cached data without making a network request.
	 */
	STALE_TIME_MS: 5_000, // 5 seconds

	/**
	 * Whether to refetch when the window regains focus.
	 * Essential for multi-tab workflows where dispatchers
	 * switch between applications.
	 */
	REFETCH_ON_WINDOW_FOCUS: true,

	/**
	 * Number of retry attempts on failure.
	 * Network errors are common; retries ensure resilience.
	 */
	RETRY: 3,

	/**
	 * Delay between retry attempts (exponential backoff).
	 */
	RETRY_DELAY: (attemptIndex: number) =>
		Math.min(1000 * 2 ** attemptIndex, 30000),
} as const;

/**
 * Type for the dispatch query options subset.
 * Explicitly typed for better IDE support and documentation.
 */
type DispatchQueryOptions = Pick<
	QueryObserverOptions,
	| "staleTime"
	| "refetchInterval"
	| "refetchOnWindowFocus"
	| "retry"
	| "retryDelay"
	| "placeholderData"
>;

/**
 * Pre-configured query options for Dispatch data fetching.
 * Apply these to any useQuery call in the Dispatch module to ensure
 * consistent real-time behavior.
 *
 * @example
 * ```typescript
 * const { data } = useQuery({
 *   queryKey: ["missions"],
 *   queryFn: fetchMissions,
 *   ...DISPATCH_QUERY_OPTIONS,
 * });
 * ```
 */
export const DISPATCH_QUERY_OPTIONS: DispatchQueryOptions = {
	staleTime: DISPATCH_REALTIME_CONFIG.STALE_TIME_MS,
	refetchInterval: DISPATCH_REALTIME_CONFIG.REFETCH_INTERVAL_MS,
	refetchOnWindowFocus: DISPATCH_REALTIME_CONFIG.REFETCH_ON_WINDOW_FOCUS,
	retry: DISPATCH_REALTIME_CONFIG.RETRY,
	retryDelay: DISPATCH_REALTIME_CONFIG.RETRY_DELAY,
	/**
	 * Keep previous data while fetching to avoid UI flicker.
	 * This ensures the Gantt chart and mission lists don't flash
	 * empty during refetches.
	 */
	placeholderData: keepPreviousData,
} as const;

export default DISPATCH_QUERY_OPTIONS;
