/**
 * Fuel Price Service
 *
 * Provides fuel price resolution from cache with fallback to defaults.
 * This service abstracts the fuel price data source (FuelPriceCache table)
 * from the pricing domain code.
 *
 * Story 4.8: Use Fuel Price Cache in Pricing Engine
 *
 * Key behaviors:
 * - Reads from FuelPriceCache table (populated by CollectAPI cron job)
 * - Never calls external APIs during quote pricing
 * - Falls back to default price when cache is empty
 * - Marks prices as stale when older than threshold
 *
 * Related FRs:
 * - FR14: Operational cost components include fuel cost
 * - FR41: Fuel price cache sourced from external provider
 */

import { db } from "@repo/database";
import type { FuelType } from "@prisma/client";
import { DEFAULT_COST_PARAMETERS } from "./pricing-engine";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Staleness threshold in hours.
 * Cache entries older than this are marked as stale but still usable.
 * Default: 48 hours (2 days) - allows for weekend gaps in refresh.
 */
export const FUEL_PRICE_STALENESS_HOURS = 48;

/**
 * Default country code for fuel price queries.
 * VTC ERP is France-only.
 */
export const DEFAULT_COUNTRY_CODE = "FR";

/**
 * Default fuel type for vehicles.
 * Most VTC vehicles use diesel.
 */
export const DEFAULT_FUEL_TYPE: FuelType = "DIESEL";

// ============================================================================
// Types
// ============================================================================

/**
 * Parameters for fuel price resolution
 */
export interface FuelPriceParams {
	/** Country code (default: "FR") */
	countryCode?: string;
	/** Fuel type (default: "DIESEL") */
	fuelType?: FuelType;
	/** Optional latitude for location-based pricing (future enhancement) */
	latitude?: number;
	/** Optional longitude for location-based pricing (future enhancement) */
	longitude?: number;
}

/**
 * Result of fuel price resolution
 */
export interface FuelPriceResult {
	/** Price per litre in EUR */
	pricePerLitre: number;
	/** Currency (always EUR for VTC ERP) */
	currency: "EUR";
	/** Source of the price */
	source: "CACHE" | "DEFAULT";
	/** When the cached price was fetched (null if using default) */
	fetchedAt: Date | null;
	/** Whether the cached price is older than staleness threshold */
	isStale: boolean;
	/** Fuel type used for the query */
	fuelType: FuelType;
	/** Country code used for the query */
	countryCode: string;
}

/**
 * Fuel price service interface for abstraction and testing
 */
export interface IFuelPriceService {
	getFuelPrice(params?: FuelPriceParams): Promise<FuelPriceResult>;
}

/**
 * Configuration for fuel price cache behavior
 */
export interface FuelPriceCacheConfig {
	/** Staleness threshold in hours */
	stalenessHours: number;
	/** Default price when cache is empty (EUR per litre) */
	defaultPrice: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a cache entry is stale based on fetchedAt timestamp
 *
 * @param fetchedAt - When the cache entry was fetched
 * @param stalenessHours - Threshold in hours (default: FUEL_PRICE_STALENESS_HOURS)
 * @returns true if the entry is older than the threshold
 */
export function isCacheEntryStale(
	fetchedAt: Date,
	stalenessHours: number = FUEL_PRICE_STALENESS_HOURS,
): boolean {
	const now = new Date();
	const stalenessThreshold = new Date(now.getTime() - stalenessHours * 60 * 60 * 1000);
	return fetchedAt < stalenessThreshold;
}

/**
 * Create a default fuel price result when cache is empty
 *
 * @param fuelType - Fuel type for the result
 * @param countryCode - Country code for the result
 * @returns FuelPriceResult with default values
 */
export function createDefaultFuelPriceResult(
	fuelType: FuelType = DEFAULT_FUEL_TYPE,
	countryCode: string = DEFAULT_COUNTRY_CODE,
): FuelPriceResult {
	return {
		pricePerLitre: DEFAULT_COST_PARAMETERS.fuelPricePerLiter,
		currency: "EUR",
		source: "DEFAULT",
		fetchedAt: null,
		isStale: false,
		fuelType,
		countryCode,
	};
}

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Get fuel price from cache with fallback to default
 *
 * This function:
 * 1. Queries the FuelPriceCache table for the most recent entry
 * 2. Filters by country code and fuel type
 * 3. Returns the cached price if available
 * 4. Falls back to DEFAULT_COST_PARAMETERS.fuelPricePerLiter if no cache
 * 5. Marks the result as stale if older than FUEL_PRICE_STALENESS_HOURS
 *
 * @param params - Optional parameters for fuel price query
 * @returns Promise<FuelPriceResult> with price and metadata
 *
 * @example
 * // Get default diesel price for France
 * const result = await getFuelPrice();
 *
 * @example
 * // Get gasoline price
 * const result = await getFuelPrice({ fuelType: "GASOLINE" });
 *
 * @example
 * // Check if price is from cache or default
 * const result = await getFuelPrice();
 * if (result.source === "DEFAULT") {
 *   console.warn("Using default fuel price - cache may be empty");
 * }
 */
export async function getFuelPrice(
	params: FuelPriceParams = {},
): Promise<FuelPriceResult> {
	const {
		countryCode = DEFAULT_COUNTRY_CODE,
		fuelType = DEFAULT_FUEL_TYPE,
	} = params;

	try {
		// Query most recent cache entry for the given country and fuel type
		const cached = await db.fuelPriceCache.findFirst({
			where: {
				countryCode,
				fuelType,
			},
			orderBy: { fetchedAt: "desc" },
		});

		if (!cached) {
			// No cache entry found - return default
			console.warn(
				`[FuelPriceService] No cache entry found for ${countryCode}/${fuelType}, using default price`,
			);
			return createDefaultFuelPriceResult(fuelType, countryCode);
		}

		// Check staleness
		const isStale = isCacheEntryStale(cached.fetchedAt);

		if (isStale) {
			console.warn(
				`[FuelPriceService] Cache entry for ${countryCode}/${fuelType} is stale ` +
				`(fetched at ${cached.fetchedAt.toISOString()})`,
			);
		}

		return {
			pricePerLitre: Number(cached.pricePerLitre),
			currency: "EUR",
			source: "CACHE",
			fetchedAt: cached.fetchedAt,
			isStale,
			fuelType: cached.fuelType,
			countryCode: cached.countryCode,
		};
	} catch (error) {
		// Database error - fall back to default
		console.error(
			`[FuelPriceService] Error querying fuel price cache: ${error}`,
		);
		return createDefaultFuelPriceResult(fuelType, countryCode);
	}
}

// ============================================================================
// Service Class (for dependency injection)
// ============================================================================

/**
 * Fuel Price Service class implementation
 *
 * Provides a class-based interface for dependency injection and testing.
 * Wraps the getFuelPrice function.
 */
export class FuelPriceService implements IFuelPriceService {
	private config: FuelPriceCacheConfig;

	constructor(config?: Partial<FuelPriceCacheConfig>) {
		this.config = {
			stalenessHours: config?.stalenessHours ?? FUEL_PRICE_STALENESS_HOURS,
			defaultPrice: config?.defaultPrice ?? DEFAULT_COST_PARAMETERS.fuelPricePerLiter,
		};
	}

	/**
	 * Get fuel price from cache with fallback to default
	 */
	async getFuelPrice(params: FuelPriceParams = {}): Promise<FuelPriceResult> {
		return getFuelPrice(params);
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): FuelPriceCacheConfig {
		return { ...this.config };
	}
}

// ============================================================================
// Exports
// ============================================================================

// Export a default instance for convenience
export const fuelPriceService = new FuelPriceService();
