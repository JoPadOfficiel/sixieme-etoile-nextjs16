/**
 * Fuel Price Service
 *
 * Provides real-time fuel price resolution based on route coordinates.
 * Supports international trips by fetching prices from CollectAPI based on GPS coordinates.
 *
 * Story 17.1: Real-time Fuel Pricing for International Routes
 *
 * Key behaviors:
 * - Fetches fuel prices in real-time from CollectAPI based on route coordinates
 * - Calculates average fuel price across pickup, dropoff, and intermediate stops
 * - Supports international trips (any country covered by CollectAPI)
 * - Falls back to cache, then defaults if API fails
 * - Caches results briefly to avoid duplicate API calls within same request
 *
 * Related FRs:
 * - FR14: Operational cost components include fuel cost
 * - FR41: Fuel price from external provider (now real-time)
 */

import { db } from "@repo/database";
import type { FuelType } from "@prisma/client";
import { DEFAULT_COST_PARAMETERS } from "./pricing/constants";
import {
	fetchFuelPrices,
	type FuelPrices,
	CollectAPIError,
} from "../lib/collectapi-client";
import { resolveApiKey } from "../lib/integration-keys";

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
 * Used as fallback when country cannot be determined.
 */
export const DEFAULT_COUNTRY_CODE = "FR";

/**
 * Default fuel type for vehicles.
 * Most VTC vehicles use diesel.
 */
export const DEFAULT_FUEL_TYPE: FuelType = "DIESEL";

/**
 * Request timeout for real-time API calls (ms)
 */
export const REALTIME_API_TIMEOUT_MS = 5000;

/**
 * In-memory cache for fuel prices during a single pricing calculation
 * Prevents duplicate API calls for the same coordinates
 */
const requestCache = new Map<string, { price: FuelPrices; timestamp: number }>();
const REQUEST_CACHE_TTL_MS = 60000; // 1 minute

// ============================================================================
// Types
// ============================================================================

/**
 * Coordinate point for route-based fuel pricing
 */
export interface RoutePoint {
	lat: number;
	lng: number;
}

/**
 * Parameters for fuel price resolution
 */
export interface FuelPriceParams {
	/** Country code (default: "FR") - used for cache fallback */
	countryCode?: string;
	/** Fuel type (default: "DIESEL") */
	fuelType?: FuelType;
	/** Pickup coordinates for real-time pricing */
	pickup?: RoutePoint;
	/** Dropoff coordinates for real-time pricing */
	dropoff?: RoutePoint;
	/** Intermediate stops for excursion pricing */
	stops?: RoutePoint[];
	/** Organization ID for API key resolution */
	organizationId?: string;
	/** Force real-time API call (skip cache) */
	forceRealTime?: boolean;
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
	source: "REALTIME" | "CACHE" | "DEFAULT";
	/** When the price was fetched (null if using default) */
	fetchedAt: Date | null;
	/** Whether the cached price is older than staleness threshold */
	isStale: boolean;
	/** Fuel type used for the query */
	fuelType: FuelType;
	/** Country code detected from coordinates */
	countryCode: string;
	/** Countries traversed on the route (for international trips) */
	countriesOnRoute?: string[];
	/** Individual prices per route point (for transparency) */
	routePrices?: Array<{
		point: "pickup" | "dropoff" | "stop";
		country: string;
		pricePerLitre: number;
	}>;
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

/**
 * Generate cache key for request-level caching
 */
function getCacheKey(lat: number, lng: number): string {
	// Round to 2 decimal places for cache key (approx 1km precision)
	return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/**
 * Get cached price from request cache if still valid
 */
function getFromRequestCache(key: string): FuelPrices | null {
	const cached = requestCache.get(key);
	if (!cached) return null;
	
	if (Date.now() - cached.timestamp > REQUEST_CACHE_TTL_MS) {
		requestCache.delete(key);
		return null;
	}
	
	return cached.price;
}

/**
 * Store price in request cache
 */
function setInRequestCache(key: string, price: FuelPrices): void {
	requestCache.set(key, { price, timestamp: Date.now() });
	
	// Clean up old entries periodically
	if (requestCache.size > 100) {
		const now = Date.now();
		for (const [k, v] of Array.from(requestCache.entries())) {
			if (now - v.timestamp > REQUEST_CACHE_TTL_MS) {
				requestCache.delete(k);
			}
		}
	}
}

/**
 * Fetch fuel price for a single coordinate point
 * Uses request cache to avoid duplicate API calls
 */
async function fetchPriceForPoint(
	apiKey: string,
	point: RoutePoint,
	fuelType: FuelType,
): Promise<{ price: number; country: string } | null> {
	const cacheKey = getCacheKey(point.lat, point.lng);
	
	// Check request cache first
	const cached = getFromRequestCache(cacheKey);
	if (cached) {
		const price = fuelType === "DIESEL" ? cached.diesel : 
					  fuelType === "GASOLINE" ? cached.gasoline : cached.lpg;
		return { price, country: cached.country };
	}
	
	try {
		console.log(`[FuelPriceService] Fetching real-time fuel price for ${point.lat}, ${point.lng}`);
		
		const prices = await fetchFuelPrices({
			apiKey,
			lat: point.lat,
			lng: point.lng,
		});
		
		// Cache the result
		setInRequestCache(cacheKey, prices);
		
		const price = fuelType === "DIESEL" ? prices.diesel : 
					  fuelType === "GASOLINE" ? prices.gasoline : prices.lpg;
		
		console.log(`[FuelPriceService] Got price ${price} EUR for ${prices.country}`);
		
		return { price, country: prices.country };
	} catch (error) {
		console.error(`[FuelPriceService] Failed to fetch price for ${point.lat}, ${point.lng}: ${error}`);
		return null;
	}
}

/**
 * Calculate average fuel price across multiple route points
 * Returns weighted average based on route segments
 */
async function calculateRouteFuelPrice(
	apiKey: string,
	params: FuelPriceParams,
): Promise<FuelPriceResult | null> {
	const { pickup, dropoff, stops, fuelType = DEFAULT_FUEL_TYPE } = params;
	
	if (!pickup) {
		return null;
	}
	
	const routePrices: FuelPriceResult["routePrices"] = [];
	const countriesSet = new Set<string>();
	let totalPrice = 0;
	let pointCount = 0;
	
	// Fetch price for pickup
	const pickupResult = await fetchPriceForPoint(apiKey, pickup, fuelType);
	if (pickupResult) {
		routePrices.push({
			point: "pickup",
			country: pickupResult.country,
			pricePerLitre: pickupResult.price,
		});
		countriesSet.add(pickupResult.country);
		totalPrice += pickupResult.price;
		pointCount++;
	}
	
	// Fetch prices for stops (if any)
	if (stops && stops.length > 0) {
		for (const stop of stops) {
			const stopResult = await fetchPriceForPoint(apiKey, stop, fuelType);
			if (stopResult) {
				routePrices.push({
					point: "stop",
					country: stopResult.country,
					pricePerLitre: stopResult.price,
				});
				countriesSet.add(stopResult.country);
				totalPrice += stopResult.price;
				pointCount++;
			}
		}
	}
	
	// Fetch price for dropoff (if provided)
	if (dropoff) {
		const dropoffResult = await fetchPriceForPoint(apiKey, dropoff, fuelType);
		if (dropoffResult) {
			routePrices.push({
				point: "dropoff",
				country: dropoffResult.country,
				pricePerLitre: dropoffResult.price,
			});
			countriesSet.add(dropoffResult.country);
			totalPrice += dropoffResult.price;
			pointCount++;
		}
	}
	
	if (pointCount === 0) {
		return null;
	}
	
	const averagePrice = Math.round((totalPrice / pointCount) * 100) / 100;
	const countriesOnRoute = Array.from(countriesSet);
	
	return {
		pricePerLitre: averagePrice,
		currency: "EUR",
		source: "REALTIME",
		fetchedAt: new Date(),
		isStale: false,
		fuelType,
		countryCode: countriesOnRoute[0] || DEFAULT_COUNTRY_CODE,
		countriesOnRoute,
		routePrices,
	};
}

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Get fuel price based on route coordinates (real-time) with fallback to cache/default
 *
 * This function:
 * 1. If route coordinates provided (pickup/dropoff/stops), fetches real-time prices from CollectAPI
 * 2. Calculates average price across all route points for international trips
 * 3. Falls back to database cache if API fails
 * 4. Falls back to DEFAULT_COST_PARAMETERS.fuelPricePerLiter if no cache
 *
 * @param params - Parameters including route coordinates for real-time pricing
 * @returns Promise<FuelPriceResult> with price and metadata
 *
 * @example
 * // Get real-time fuel price for a route (Paris to Brussels)
 * const result = await getFuelPrice({
 *   pickup: { lat: 48.8566, lng: 2.3522 },
 *   dropoff: { lat: 50.8503, lng: 4.3517 },
 *   organizationId: "org-123",
 * });
 *
 * @example
 * // Get real-time price for excursion with stops
 * const result = await getFuelPrice({
 *   pickup: { lat: 48.8566, lng: 2.3522 },
 *   stops: [{ lat: 49.2583, lng: 4.0317 }], // Reims
 *   dropoff: { lat: 48.8566, lng: 2.3522 },
 *   organizationId: "org-123",
 * });
 *
 * @example
 * // Fallback to cache (no coordinates)
 * const result = await getFuelPrice();
 */
export async function getFuelPrice(
	params: FuelPriceParams = {},
): Promise<FuelPriceResult> {
	const {
		countryCode = DEFAULT_COUNTRY_CODE,
		fuelType = DEFAULT_FUEL_TYPE,
		pickup,
		dropoff,
		stops,
		organizationId,
		forceRealTime = false,
	} = params;

	// If route coordinates are provided, try real-time pricing
	if (pickup || forceRealTime) {
		try {
			// Resolve API key
			let apiKey: string | null = null;
			if (organizationId) {
				console.log(`[FuelPriceService] Resolving API key for org: ${organizationId}`);
				apiKey = await resolveApiKey(organizationId, "collectApi");
				console.log(`[FuelPriceService] Org API key resolved: ${apiKey ? "YES" : "NO"}`);
			}
			if (!apiKey) {
				// Fallback to environment variable (support multiple naming conventions)
				const envKey = process.env.COLLECTAPI_KEY || process.env.COLLECT_API_KEY || process.env.COLLECTAPI_API_KEY || null;
				console.log(`[FuelPriceService] Env API key found: ${envKey ? "YES" : "NO"}`);
				apiKey = envKey;
				
				// Remove "apikey " prefix if present (some users include it in the env var)
				if (apiKey && apiKey.toLowerCase().startsWith("apikey ")) {
					apiKey = apiKey.substring(7).trim();
					console.log(`[FuelPriceService] Stripped 'apikey ' prefix from env var`);
				}
			}

			if (apiKey && pickup) {
				console.log(`[FuelPriceService] Attempting real-time fuel pricing for route at ${pickup.lat}, ${pickup.lng}`);
				
				const routeResult = await calculateRouteFuelPrice(apiKey, {
					pickup,
					dropoff,
					stops,
					fuelType,
				});

				if (routeResult) {
					console.log(
						`[FuelPriceService] Real-time pricing successful: ${routeResult.pricePerLitre} EUR ` +
						`(countries: ${routeResult.countriesOnRoute?.join(", ")})`
					);
					return routeResult;
				}
			} else if (!apiKey) {
				console.warn(`[FuelPriceService] No CollectAPI key available, falling back to cache`);
			}
		} catch (error) {
			console.error(`[FuelPriceService] Real-time pricing failed, falling back to cache: ${error}`);
		}
	}

	// Fallback to database cache
	try {
		const cached = await db.fuelPriceCache.findFirst({
			where: {
				countryCode,
				fuelType,
			},
			orderBy: { fetchedAt: "desc" },
		});

		if (!cached) {
			console.warn(
				`[FuelPriceService] No cache entry found for ${countryCode}/${fuelType}, using default price`,
			);
			return createDefaultFuelPriceResult(fuelType, countryCode);
		}

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
