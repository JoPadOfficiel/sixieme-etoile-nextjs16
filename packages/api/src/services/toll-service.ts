/**
 * Toll Service
 * Fetches real toll costs from Google Routes API with caching
 *
 * Story 15.1: Integrate Google Routes API for Real Toll Costs
 *
 * Key behaviors:
 * - Calls Google Routes API v2 to get real toll costs
 * - Caches results for 24 hours to minimize API costs
 * - Falls back to flat rate when API is unavailable
 * - Provides transparency about toll data source
 *
 * Related FRs:
 * - FR14: Operational cost components include toll cost
 * - FR22: Shadow calculation with real costs
 */

import { db } from "@repo/database";
import { createHash } from "crypto";
import type { GeoPoint } from "../lib/geo-utils";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Cache TTL in hours.
 * Toll prices don't change frequently, 24h is a good balance.
 */
export const TOLL_CACHE_TTL_HOURS = 24;

/**
 * Coordinate precision for cache key hashing.
 * 4 decimal places = ~11 meters accuracy, sufficient for toll calculation.
 */
export const COORDINATE_PRECISION = 4;

/**
 * Google Routes API endpoint
 */
export const GOOGLE_ROUTES_API_URL =
	"https://routes.googleapis.com/directions/v2:computeRoutes";

// ============================================================================
// Types
// ============================================================================

/**
 * Source of toll data
 */
export type TollSource = "GOOGLE_API" | "ESTIMATE";

/**
 * Result of toll cost lookup
 */
export interface TollResult {
	/** Toll amount in EUR (0 if no tolls, -1 if fallback needed) */
	amount: number;
	/** Currency (always EUR for VTC ERP) */
	currency: "EUR";
	/** Source of the toll data */
	source: TollSource;
	/** When the toll was fetched (null if using fallback) */
	fetchedAt: Date | null;
	/** Whether the result came from cache */
	isFromCache: boolean;
}

/**
 * Configuration for toll service
 */
export interface TollServiceConfig {
	/** Google Maps API key with Routes API enabled */
	apiKey: string;
	/** Fallback rate per km when API fails */
	fallbackRatePerKm: number;
	/** Cache TTL in hours (optional, defaults to TOLL_CACHE_TTL_HOURS) */
	cacheTtlHours?: number;
}

/**
 * Google Routes API response types
 */
interface GoogleRoutesResponse {
	routes?: Array<{
		distanceMeters?: number;
		duration?: string;
		travelAdvisory?: {
			tollInfo?: {
				estimatedPrice?: Array<{
					currencyCode: string;
					units?: string;
					nanos?: number;
				}>;
			};
		};
	}>;
	error?: {
		code: number;
		message: string;
		status: string;
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a hash of coordinates for cache key
 * Rounds to COORDINATE_PRECISION decimals for consistent matching
 *
 * @param point - Geographic point
 * @returns 16-character hash string
 */
export function hashCoordinates(point: GeoPoint): string {
	const rounded = `${point.lat.toFixed(COORDINATE_PRECISION)},${point.lng.toFixed(COORDINATE_PRECISION)}`;
	return createHash("sha256").update(rounded).digest("hex").substring(0, 16);
}

/**
 * Parse toll amount from Google Routes API response
 *
 * @param response - Google Routes API response
 * @returns Toll amount in EUR, or 0 if no tolls
 */
export function parseTollAmount(response: GoogleRoutesResponse): number {
	const tollInfo = response.routes?.[0]?.travelAdvisory?.tollInfo;

	if (!tollInfo?.estimatedPrice?.length) {
		// No tolls on this route
		return 0;
	}

	// Sum all EUR toll prices (usually just one)
	const tollAmount = tollInfo.estimatedPrice
		.filter((p) => p.currencyCode === "EUR")
		.reduce((sum, p) => {
			const units = parseInt(p.units || "0", 10);
			const nanos = (p.nanos || 0) / 1_000_000_000;
			return sum + units + nanos;
		}, 0);

	return Math.round(tollAmount * 100) / 100;
}

/**
 * Calculate fallback toll cost using flat rate
 *
 * @param distanceKm - Distance in kilometers
 * @param ratePerKm - Rate per kilometer in EUR
 * @returns Estimated toll cost
 */
export function calculateFallbackToll(
	distanceKm: number,
	ratePerKm: number,
): number {
	return Math.round(distanceKm * ratePerKm * 100) / 100;
}

// ============================================================================
// Google Routes API Integration
// ============================================================================

/**
 * Call Google Routes API to get toll information
 *
 * @param origin - Origin point
 * @param destination - Destination point
 * @param apiKey - Google Maps API key
 * @returns Toll amount and success status
 */
export async function callGoogleRoutesAPI(
	origin: GeoPoint,
	destination: GeoPoint,
	apiKey: string,
): Promise<{ tollAmount: number; success: boolean; error?: string }> {
	try {
		const response = await fetch(GOOGLE_ROUTES_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask":
					"routes.travelAdvisory.tollInfo,routes.distanceMeters,routes.duration",
			},
			body: JSON.stringify({
				origin: {
					location: {
						latLng: { latitude: origin.lat, longitude: origin.lng },
					},
				},
				destination: {
					location: {
						latLng: { latitude: destination.lat, longitude: destination.lng },
					},
				},
				travelMode: "DRIVE",
				routingPreference: "TRAFFIC_AWARE",
				computeAlternativeRoutes: false,
				extraComputations: ["TOLLS"],
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`[TollService] Google Routes API HTTP error: ${response.status} - ${errorText}`,
			);
			return {
				tollAmount: 0,
				success: false,
				error: `HTTP ${response.status}`,
			};
		}

		const data = (await response.json()) as GoogleRoutesResponse;

		if (data.error) {
			console.error(
				`[TollService] Google Routes API error: ${data.error.message}`,
			);
			return {
				tollAmount: 0,
				success: false,
				error: data.error.message,
			};
		}

		const tollAmount = parseTollAmount(data);
		return { tollAmount, success: true };
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error(`[TollService] API call failed: ${errorMessage}`);
		return {
			tollAmount: 0,
			success: false,
			error: errorMessage,
		};
	}
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Check cache for existing toll data
 *
 * @param originHash - Hash of origin coordinates
 * @param destinationHash - Hash of destination coordinates
 * @returns Cached toll result or null
 */
export async function checkTollCache(
	originHash: string,
	destinationHash: string,
): Promise<TollResult | null> {
	try {
		const cached = await db.tollCache.findUnique({
			where: {
				originHash_destinationHash: { originHash, destinationHash },
			},
		});

		if (cached && cached.expiresAt > new Date()) {
			return {
				amount: Number(cached.tollAmount),
				currency: "EUR",
				source: cached.source as TollSource,
				fetchedAt: cached.fetchedAt,
				isFromCache: true,
			};
		}

		return null;
	} catch (error) {
		console.warn(`[TollService] Cache lookup failed:`, error);
		return null;
	}
}

/**
 * Store toll result in cache
 *
 * @param originHash - Hash of origin coordinates
 * @param destinationHash - Hash of destination coordinates
 * @param tollAmount - Toll amount to cache
 * @param ttlHours - Cache TTL in hours
 */
export async function storeTollCache(
	originHash: string,
	destinationHash: string,
	tollAmount: number,
	ttlHours: number = TOLL_CACHE_TTL_HOURS,
): Promise<void> {
	try {
		const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

		await db.tollCache.upsert({
			where: {
				originHash_destinationHash: { originHash, destinationHash },
			},
			create: {
				originHash,
				destinationHash,
				tollAmount,
				currency: "EUR",
				source: "GOOGLE_API",
				expiresAt,
			},
			update: {
				tollAmount,
				fetchedAt: new Date(),
				expiresAt,
			},
		});
	} catch (error) {
		console.warn(`[TollService] Cache write failed:`, error);
	}
}

// ============================================================================
// Main Service Function
// ============================================================================

/**
 * Get toll cost for a route with caching
 *
 * This function:
 * 1. Checks the cache for existing toll data
 * 2. If not cached, calls Google Routes API
 * 3. Caches successful API responses
 * 4. Returns a marker (-1) for fallback if API fails
 *
 * @param origin - Origin point
 * @param destination - Destination point
 * @param config - Service configuration
 * @returns Toll result with amount and source
 *
 * @example
 * ```typescript
 * const result = await getTollCost(
 *   { lat: 48.8566, lng: 2.3522 }, // Paris
 *   { lat: 45.7640, lng: 4.8357 }, // Lyon
 *   { apiKey: "...", fallbackRatePerKm: 0.12 }
 * );
 *
 * if (result.amount >= 0) {
 *   console.log(`Toll: ${result.amount}€ (${result.source})`);
 * } else {
 *   // Use fallback calculation
 *   const fallback = calculateFallbackToll(distanceKm, 0.12);
 * }
 * ```
 */
export async function getTollCost(
	origin: GeoPoint,
	destination: GeoPoint,
	config: TollServiceConfig,
): Promise<TollResult> {
	const originHash = hashCoordinates(origin);
	const destinationHash = hashCoordinates(destination);
	const ttlHours = config.cacheTtlHours ?? TOLL_CACHE_TTL_HOURS;

	// Step 1: Check cache
	const cached = await checkTollCache(originHash, destinationHash);
	if (cached) {
		return cached;
	}

	// Step 2: Call API if key provided
	if (config.apiKey) {
		const { tollAmount, success } = await callGoogleRoutesAPI(
			origin,
			destination,
			config.apiKey,
		);

		if (success) {
			// Step 3: Cache the result
			await storeTollCache(originHash, destinationHash, tollAmount, ttlHours);

			return {
				amount: tollAmount,
				currency: "EUR",
				source: "GOOGLE_API",
				fetchedAt: new Date(),
				isFromCache: false,
			};
		}
	}

	// Step 4: Return marker for fallback
	// The caller should use calculateFallbackToll() with the distance
	return {
		amount: -1, // Marker indicating fallback needed
		currency: "EUR",
		source: "ESTIMATE",
		fetchedAt: null,
		isFromCache: false,
	};
}

// ============================================================================
// Service Class (for dependency injection)
// ============================================================================

/**
 * Toll Service class implementation
 * Provides a class-based interface for dependency injection and testing.
 */
export class TollService {
	private config: TollServiceConfig;

	constructor(config: TollServiceConfig) {
		this.config = config;
	}

	/**
	 * Get toll cost for a route
	 */
	async getTollCost(origin: GeoPoint, destination: GeoPoint): Promise<TollResult> {
		return getTollCost(origin, destination, this.config);
	}

	/**
	 * Calculate fallback toll using flat rate
	 */
	calculateFallback(distanceKm: number): number {
		return calculateFallbackToll(distanceKm, this.config.fallbackRatePerKm);
	}

	/**
	 * Get the current configuration
	 */
	getConfig(): TollServiceConfig {
		return { ...this.config };
	}
}

// ============================================================================
// Story 16.7: Excursion Multi-Stop Routing
// ============================================================================

/**
 * Result of excursion route calculation
 */
export interface ExcursionRouteResult {
	/** Array of leg distances in km */
	legDistances: number[];
	/** Array of leg durations in minutes */
	legDurations: number[];
	/** Total distance in km */
	totalDistanceKm: number;
	/** Total duration in minutes */
	totalDurationMinutes: number;
	/** Whether the API call was successful */
	success: boolean;
	/** Error message if failed */
	error?: string;
}

/**
 * Story 16.7: Call Google Routes API with waypoints for excursion routing
 * 
 * @param origin - Origin point
 * @param destination - Destination point
 * @param waypoints - Array of intermediate waypoints
 * @param apiKey - Google Maps API key
 * @returns Route result with leg distances and durations
 */
export async function callGoogleRoutesAPIWithWaypoints(
	origin: GeoPoint,
	destination: GeoPoint,
	waypoints: GeoPoint[],
	apiKey: string,
): Promise<ExcursionRouteResult> {
	try {
		// Build intermediates array for Google Routes API
		const intermediates = waypoints.map((wp) => ({
			location: {
				latLng: { latitude: wp.lat, longitude: wp.lng },
			},
		}));

		const response = await fetch(GOOGLE_ROUTES_API_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Goog-Api-Key": apiKey,
				"X-Goog-FieldMask":
					"routes.legs.distanceMeters,routes.legs.duration,routes.distanceMeters,routes.duration",
			},
			body: JSON.stringify({
				origin: {
					location: {
						latLng: { latitude: origin.lat, longitude: origin.lng },
					},
				},
				destination: {
					location: {
						latLng: { latitude: destination.lat, longitude: destination.lng },
					},
				},
				intermediates: intermediates.length > 0 ? intermediates : undefined,
				travelMode: "DRIVE",
				routingPreference: "TRAFFIC_AWARE",
				computeAlternativeRoutes: false,
			}),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`[ExcursionRouting] Google Routes API HTTP error: ${response.status} - ${errorText}`,
			);
			return {
				legDistances: [],
				legDurations: [],
				totalDistanceKm: 0,
				totalDurationMinutes: 0,
				success: false,
				error: `HTTP ${response.status}`,
			};
		}

		const data = await response.json() as {
			routes?: Array<{
				distanceMeters?: number;
				duration?: string;
				legs?: Array<{
					distanceMeters?: number;
					duration?: string;
				}>;
			}>;
			error?: { message: string };
		};

		if (data.error) {
			console.error(
				`[ExcursionRouting] Google Routes API error: ${data.error.message}`,
			);
			return {
				legDistances: [],
				legDurations: [],
				totalDistanceKm: 0,
				totalDurationMinutes: 0,
				success: false,
				error: data.error.message,
			};
		}

		const route = data.routes?.[0];
		if (!route) {
			return {
				legDistances: [],
				legDurations: [],
				totalDistanceKm: 0,
				totalDurationMinutes: 0,
				success: false,
				error: "No route found",
			};
		}

		// Parse leg distances and durations
		const legs = route.legs || [];
		const legDistances = legs.map((leg) => 
			leg.distanceMeters ? leg.distanceMeters / 1000 : 0
		);
		const legDurations = legs.map((leg) => {
			if (!leg.duration) return 0;
			// Duration is in format "123s"
			const seconds = parseInt(leg.duration.replace("s", ""), 10);
			return seconds / 60;
		});

		// Calculate totals
		const totalDistanceKm = route.distanceMeters 
			? route.distanceMeters / 1000 
			: legDistances.reduce((sum, d) => sum + d, 0);
		
		const totalDurationMinutes = route.duration
			? parseInt(route.duration.replace("s", ""), 10) / 60
			: legDurations.reduce((sum, d) => sum + d, 0);

		return {
			legDistances,
			legDurations,
			totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
			totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
			success: true,
		};
	} catch (error) {
		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";
		console.error(`[ExcursionRouting] API call failed: ${errorMessage}`);
		return {
			legDistances: [],
			legDurations: [],
			totalDistanceKm: 0,
			totalDurationMinutes: 0,
			success: false,
			error: errorMessage,
		};
	}
}

/**
 * Story 16.7: Calculate excursion route with Haversine fallback
 * Uses Google Routes API if available, falls back to Haversine estimates
 * 
 * @param origin - Origin point
 * @param destination - Destination point
 * @param waypoints - Array of intermediate waypoints
 * @param apiKey - Google Maps API key (optional)
 * @returns Route result with leg distances and durations
 */
export async function calculateExcursionRoute(
	origin: GeoPoint,
	destination: GeoPoint,
	waypoints: GeoPoint[],
	apiKey?: string,
): Promise<ExcursionRouteResult> {
	// Try Google Routes API first if we have an API key
	if (apiKey) {
		const apiResult = await callGoogleRoutesAPIWithWaypoints(
			origin,
			destination,
			waypoints,
			apiKey,
		);
		if (apiResult.success) {
			return apiResult;
		}
		console.warn(`[ExcursionRouting] API failed, falling back to Haversine: ${apiResult.error}`);
	}

	// Fallback to Haversine calculation
	const allPoints = [origin, ...waypoints, destination];
	const legDistances: number[] = [];
	const legDurations: number[] = [];

	for (let i = 0; i < allPoints.length - 1; i++) {
		const from = allPoints[i];
		const to = allPoints[i + 1];
		const distance = haversineDistance(from, to);
		legDistances.push(Math.round(distance * 100) / 100);
		// Estimate duration: 40 km/h average speed
		legDurations.push(Math.round((distance / 40) * 60 * 100) / 100);
	}

	const totalDistanceKm = legDistances.reduce((sum, d) => sum + d, 0);
	const totalDurationMinutes = legDurations.reduce((sum, d) => sum + d, 0);

	return {
		legDistances,
		legDurations,
		totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
		totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
		success: true,
	};
}

/**
 * Calculate Haversine distance between two points
 * @returns Distance in kilometers
 */
function haversineDistance(from: GeoPoint, to: GeoPoint): number {
	const R = 6371; // Earth's radius in km
	const dLat = toRad(to.lat - from.lat);
	const dLng = toRad(to.lng - from.lng);
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRad(from.lat)) *
			Math.cos(toRad(to.lat)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

function toRad(deg: number): number {
	return deg * (Math.PI / 180);
}

// ============================================================================
// Cleanup Function
// ============================================================================

/**
 * Clean up expired cache entries
 * Can be called by a scheduled job
 *
 * @returns Number of entries deleted
 */
export async function cleanupExpiredTollCache(): Promise<number> {
	try {
		const result = await db.tollCache.deleteMany({
			where: {
				expiresAt: { lt: new Date() },
			},
		});
		return result.count;
	} catch (error) {
		console.error(`[TollService] Cache cleanup failed:`, error);
		return 0;
	}
}
