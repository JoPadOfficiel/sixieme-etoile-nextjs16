/**
 * Fuel Price Cache Refresh Job
 *
 * Background job to refresh fuel prices from CollectAPI into the FuelPriceCache table.
 * Designed to run daily at 04:00 Europe/Paris via cron.
 *
 * Story 9.7: Fuel Price Cache Refresh & Staleness Rules
 *
 * Key behaviors:
 * - Fetches prices for all fuel types (DIESEL, GASOLINE, LPG)
 * - Uses Paris coordinates as reference point
 * - Converts USD to EUR using fixed rate
 * - Upserts entries for idempotence
 * - Logs success/failure for each fuel type
 * - Does not delete existing cache on failure
 *
 * @see docs/bmad/prd.md#FR41 - Fuel price cache
 * @see packages/api/src/lib/collectapi-client.ts - CollectAPI client
 */

import { db } from "@repo/database";
import type { FuelType } from "@prisma/client";
import {
	fetchFuelPrices,
	DEFAULT_TEST_COORDINATES,
	USD_TO_EUR_RATE,
	CollectAPIError,
	InvalidAPIKeyError,
	TimeoutError,
} from "../lib/collectapi-client";
import { resolveApiKey } from "../lib/integration-keys";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Fuel types to refresh
 */
export const FUEL_TYPES_TO_REFRESH: FuelType[] = ["DIESEL", "GASOLINE", "LPG"];

/**
 * Default country code for France
 */
export const DEFAULT_COUNTRY_CODE = "FR";

/**
 * Delay between API calls in milliseconds (to avoid rate limiting)
 */
export const API_CALL_DELAY_MS = 1000;

/**
 * Maximum retry attempts for failed API calls
 */
export const MAX_RETRY_ATTEMPTS = 3;

/**
 * Base delay for exponential backoff (ms)
 */
export const RETRY_BASE_DELAY_MS = 2000;

// ============================================================================
// Types
// ============================================================================

/**
 * Result of a single fuel type refresh
 */
export interface FuelTypeRefreshResult {
	fuelType: FuelType;
	success: boolean;
	price?: number;
	currency?: string;
	error?: string;
}

/**
 * Result of the complete refresh job
 */
export interface RefreshJobResult {
	success: boolean;
	totalTypes: number;
	updatedCount: number;
	failedCount: number;
	results: FuelTypeRefreshResult[];
	errors: string[];
	timestamp: Date;
	durationMs: number;
}

/**
 * Parameters for the refresh job
 */
export interface RefreshJobParams {
	/** API key for CollectAPI (if not provided, will be resolved from settings/env) */
	apiKey?: string;
	/** Organization ID for API key resolution (optional) */
	organizationId?: string;
	/** Reference coordinates for fuel prices */
	coordinates?: { lat: number; lng: number };
	/** Country code */
	countryCode?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Sleep for a specified duration
 */
function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
	return RETRY_BASE_DELAY_MS * Math.pow(2, attempt);
}

/**
 * Log with timestamp prefix
 */
function log(level: "info" | "warn" | "error", message: string): void {
	const timestamp = new Date().toISOString();
	const prefix = `[FuelCacheRefresh][${timestamp}]`;
	switch (level) {
		case "info":
			console.log(`${prefix} ${message}`);
			break;
		case "warn":
			console.warn(`${prefix} ${message}`);
			break;
		case "error":
			console.error(`${prefix} ${message}`);
			break;
	}
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Refresh a single fuel type in the cache
 *
 * @param apiKey - CollectAPI key
 * @param fuelType - Fuel type to refresh
 * @param coordinates - Reference coordinates
 * @param countryCode - Country code
 * @returns Promise<FuelTypeRefreshResult>
 */
async function refreshSingleFuelType(
	apiKey: string,
	fuelType: FuelType,
	coordinates: { lat: number; lng: number },
	countryCode: string,
): Promise<FuelTypeRefreshResult> {
	let lastError: Error | null = null;

	for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
		try {
			if (attempt > 0) {
				const delay = getBackoffDelay(attempt - 1);
				log("info", `Retry attempt ${attempt + 1} for ${fuelType} after ${delay}ms`);
				await sleep(delay);
			}

			// Fetch prices from CollectAPI
			const prices = await fetchFuelPrices({
				apiKey,
				lat: coordinates.lat,
				lng: coordinates.lng,
			});

			// Get the price for the specific fuel type
			let price: number;
			switch (fuelType) {
				case "DIESEL":
					price = prices.diesel;
					break;
				case "GASOLINE":
					price = prices.gasoline;
					break;
				case "LPG":
					price = prices.lpg;
					break;
				default:
					throw new Error(`Unknown fuel type: ${fuelType}`);
			}

			// Upsert into database
			await db.fuelPriceCache.upsert({
				where: {
					countryCode_fuelType: {
						countryCode,
						fuelType,
					},
				},
				update: {
					pricePerLitre: price,
					latitude: coordinates.lat,
					longitude: coordinates.lng,
					fetchedAt: new Date(),
				},
				create: {
					countryCode,
					fuelType,
					pricePerLitre: price,
					latitude: coordinates.lat,
					longitude: coordinates.lng,
					currency: "EUR",
					source: "COLLECT_API",
					fetchedAt: new Date(),
				},
			});

			log("info", `Successfully refreshed ${fuelType}: ${price} EUR`);

			return {
				fuelType,
				success: true,
				price,
				currency: "EUR",
			};
		} catch (error) {
			lastError = error instanceof Error ? error : new Error(String(error));

			// Don't retry for invalid API key
			if (error instanceof InvalidAPIKeyError) {
				log("error", `Invalid API key for ${fuelType}: ${error.message}`);
				break;
			}

			log("warn", `Attempt ${attempt + 1} failed for ${fuelType}: ${lastError.message}`);
		}
	}

	// All retries failed
	const errorMessage = lastError?.message || "Unknown error";
	log("error", `Failed to refresh ${fuelType} after ${MAX_RETRY_ATTEMPTS} attempts: ${errorMessage}`);

	return {
		fuelType,
		success: false,
		error: errorMessage,
	};
}

/**
 * Refresh all fuel prices in the cache
 *
 * This is the main entry point for the refresh job.
 * It fetches prices for all fuel types and upserts them into the cache.
 *
 * @param params - Job parameters
 * @returns Promise<RefreshJobResult>
 *
 * @example
 * // Run with default settings (uses env API key)
 * const result = await refreshFuelPriceCache();
 *
 * @example
 * // Run with specific organization's API key
 * const result = await refreshFuelPriceCache({
 *   organizationId: "org-123"
 * });
 *
 * @example
 * // Run with explicit API key
 * const result = await refreshFuelPriceCache({
 *   apiKey: "your-api-key"
 * });
 */
export async function refreshFuelPriceCache(
	params: RefreshJobParams = {},
): Promise<RefreshJobResult> {
	const startTime = Date.now();
	const {
		coordinates = DEFAULT_TEST_COORDINATES,
		countryCode = DEFAULT_COUNTRY_CODE,
	} = params;

	log("info", "Starting fuel price cache refresh job");
	log("info", `Coordinates: ${coordinates.lat}, ${coordinates.lng}`);
	log("info", `Country: ${countryCode}`);
	log("info", `Fuel types: ${FUEL_TYPES_TO_REFRESH.join(", ")}`);

	// Resolve API key
	let apiKey = params.apiKey;
	if (!apiKey) {
		if (params.organizationId) {
			const resolvedKey = await resolveApiKey(params.organizationId, "collectApi");
			if (resolvedKey) {
				apiKey = resolvedKey;
			}
		}
		if (!apiKey) {
			// Fallback to environment variable (support multiple naming conventions)
			apiKey = process.env.COLLECTAPI_KEY || process.env.COLLECT_API_KEY || process.env.COLLECTAPI_API_KEY;
		}
	}

	if (!apiKey) {
		const error = "No CollectAPI key available (checked org settings and environment)";
		log("error", error);
		return {
			success: false,
			totalTypes: FUEL_TYPES_TO_REFRESH.length,
			updatedCount: 0,
			failedCount: FUEL_TYPES_TO_REFRESH.length,
			results: FUEL_TYPES_TO_REFRESH.map((fuelType) => ({
				fuelType,
				success: false,
				error,
			})),
			errors: [error],
			timestamp: new Date(),
			durationMs: Date.now() - startTime,
		};
	}

	log("info", "API key resolved successfully");

	// Refresh each fuel type
	const results: FuelTypeRefreshResult[] = [];
	const errors: string[] = [];

	for (let i = 0; i < FUEL_TYPES_TO_REFRESH.length; i++) {
		const fuelType = FUEL_TYPES_TO_REFRESH[i];

		// Add delay between API calls (except for first one)
		if (i > 0) {
			await sleep(API_CALL_DELAY_MS);
		}

		const result = await refreshSingleFuelType(apiKey, fuelType, coordinates, countryCode);
		results.push(result);

		if (!result.success && result.error) {
			errors.push(`${fuelType}: ${result.error}`);
		}
	}

	const updatedCount = results.filter((r) => r.success).length;
	const failedCount = results.filter((r) => !r.success).length;
	const success = failedCount === 0;
	const durationMs = Date.now() - startTime;

	log(
		success ? "info" : "warn",
		`Refresh job completed: ${updatedCount}/${FUEL_TYPES_TO_REFRESH.length} updated in ${durationMs}ms`,
	);

	if (errors.length > 0) {
		log("warn", `Errors: ${errors.join("; ")}`);
	}

	return {
		success,
		totalTypes: FUEL_TYPES_TO_REFRESH.length,
		updatedCount,
		failedCount,
		results,
		errors,
		timestamp: new Date(),
		durationMs,
	};
}

/**
 * Get the current state of the fuel price cache
 *
 * Useful for monitoring and debugging.
 *
 * @param countryCode - Country code to query
 * @returns Promise with cache entries and staleness info
 */
export async function getFuelCacheStatus(
	countryCode: string = DEFAULT_COUNTRY_CODE,
): Promise<{
	entries: Array<{
		fuelType: FuelType;
		pricePerLitre: number;
		fetchedAt: Date;
		isStale: boolean;
	}>;
	lastRefresh: Date | null;
	stalenessThresholdHours: number;
}> {
	const STALENESS_HOURS = 48;
	const stalenessThreshold = new Date(Date.now() - STALENESS_HOURS * 60 * 60 * 1000);

	const entries = await db.fuelPriceCache.findMany({
		where: { countryCode },
		orderBy: { fuelType: "asc" },
	});

	const mappedEntries = entries.map((entry) => ({
		fuelType: entry.fuelType,
		pricePerLitre: Number(entry.pricePerLitre),
		fetchedAt: entry.fetchedAt,
		isStale: entry.fetchedAt < stalenessThreshold,
	}));

	const lastRefresh = entries.length > 0
		? entries.reduce((latest, entry) =>
				entry.fetchedAt > latest ? entry.fetchedAt : latest,
			entries[0].fetchedAt)
		: null;

	return {
		entries: mappedEntries,
		lastRefresh,
		stalenessThresholdHours: STALENESS_HOURS,
	};
}
