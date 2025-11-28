/**
 * CollectAPI Gas Prices Client
 *
 * Client for interacting with CollectAPI Gas Prices API.
 * Used to fetch fuel prices by coordinates for the pricing engine.
 *
 * Story 9.6: Settings → Integrations (Google Maps & CollectAPI)
 *
 * API Documentation: https://collectapi.com/api/gasPrice/gas-prices-api
 *
 * @see docs/bmad/prd.md#FR41 - Fuel price cache source
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * CollectAPI base URL
 */
export const COLLECTAPI_BASE_URL = "https://api.collectapi.com/gasPrice";

/**
 * Default coordinates for testing (Paris, France)
 */
export const DEFAULT_TEST_COORDINATES = {
	lat: 48.8566,
	lng: 2.3522,
};

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT_MS = 10000;

// ============================================================================
// Types
// ============================================================================

/**
 * Fuel types supported by CollectAPI
 */
export type CollectAPIFuelType = "gasoline" | "diesel" | "lpg";

/**
 * Raw response from CollectAPI /fromCoordinates endpoint
 */
export interface CollectAPIResponse {
	success: boolean;
	result: Array<{
		country: string;
		gasoline: string;
		diesel: string;
		lpg: string;
		currency: string;
	}>;
}

/**
 * Parsed fuel prices from CollectAPI
 */
export interface FuelPrices {
	country: string;
	gasoline: number;
	diesel: number;
	lpg: number;
	currency: string;
	fetchedAt: Date;
}

/**
 * Result of a connection test
 */
export interface ConnectionTestResult {
	success: boolean;
	status: "connected" | "invalid" | "error" | "timeout";
	latencyMs?: number;
	message: string;
	details?: FuelPrices;
	error?: string;
}

/**
 * Parameters for fetching fuel prices
 */
export interface FetchFuelPricesParams {
	apiKey: string;
	lat: number;
	lng: number;
	fuelType?: CollectAPIFuelType;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when CollectAPI returns an error
 */
export class CollectAPIError extends Error {
	constructor(
		message: string,
		public readonly statusCode?: number,
		public readonly response?: unknown,
	) {
		super(message);
		this.name = "CollectAPIError";
	}
}

/**
 * Error thrown when API key is invalid
 */
export class InvalidAPIKeyError extends CollectAPIError {
	constructor(message = "Invalid CollectAPI key") {
		super(message, 401);
		this.name = "InvalidAPIKeyError";
	}
}

/**
 * Error thrown when request times out
 */
export class TimeoutError extends CollectAPIError {
	constructor(message = "Request timed out") {
		super(message);
		this.name = "TimeoutError";
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create authorization header for CollectAPI
 */
function createAuthHeader(apiKey: string): string {
	return `apikey ${apiKey}`;
}

/**
 * Build URL for /fromCoordinates endpoint
 */
function buildCoordinatesUrl(lat: number, lng: number, fuelType?: CollectAPIFuelType): string {
	const url = new URL(`${COLLECTAPI_BASE_URL}/fromCoordinates`);
	url.searchParams.set("lat", lat.toString());
	url.searchParams.set("lng", lng.toString());
	if (fuelType) {
		url.searchParams.set("type", fuelType);
	}
	return url.toString();
}

/**
 * Parse numeric price from string
 */
function parsePrice(value: string): number {
	const parsed = parseFloat(value);
	return isNaN(parsed) ? 0 : parsed;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch fuel prices from CollectAPI by coordinates
 *
 * @param params - Parameters including API key and coordinates
 * @returns Promise<FuelPrices> with parsed fuel prices
 * @throws CollectAPIError if the request fails
 * @throws InvalidAPIKeyError if the API key is invalid
 * @throws TimeoutError if the request times out
 *
 * @example
 * const prices = await fetchFuelPrices({
 *   apiKey: "your-api-key",
 *   lat: 48.8566,
 *   lng: 2.3522,
 * });
 * console.log(`Diesel price: ${prices.diesel} ${prices.currency}`);
 */
export async function fetchFuelPrices(params: FetchFuelPricesParams): Promise<FuelPrices> {
	const { apiKey, lat, lng, fuelType } = params;

	const url = buildCoordinatesUrl(lat, lng, fuelType);

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const response = await fetch(url, {
			method: "GET",
			headers: {
				authorization: createAuthHeader(apiKey),
				"content-type": "application/json",
			},
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		// Handle HTTP errors
		if (!response.ok) {
			if (response.status === 401 || response.status === 403) {
				throw new InvalidAPIKeyError();
			}
			const errorText = await response.text().catch(() => "Unknown error");
			throw new CollectAPIError(
				`CollectAPI request failed: ${response.status} ${response.statusText}`,
				response.status,
				errorText,
			);
		}

		const data: CollectAPIResponse = await response.json();

		// Check API-level success
		if (!data.success) {
			throw new CollectAPIError("CollectAPI returned success: false", undefined, data);
		}

		// Check for results
		if (!data.result || data.result.length === 0) {
			throw new CollectAPIError("No fuel price data returned for coordinates");
		}

		const result = data.result[0];

		return {
			country: result.country,
			gasoline: parsePrice(result.gasoline),
			diesel: parsePrice(result.diesel),
			lpg: parsePrice(result.lpg),
			currency: result.currency.toUpperCase(),
			fetchedAt: new Date(),
		};
	} catch (error) {
		clearTimeout(timeoutId);

		if (error instanceof CollectAPIError) {
			throw error;
		}

		if (error instanceof Error && error.name === "AbortError") {
			throw new TimeoutError();
		}

		throw new CollectAPIError(
			`Failed to fetch fuel prices: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}
}

/**
 * Test CollectAPI connection with the given API key
 *
 * Uses Paris coordinates by default for testing.
 *
 * @param apiKey - The CollectAPI key to test
 * @param testCoordinates - Optional coordinates for testing (default: Paris)
 * @returns Promise<ConnectionTestResult> with test results
 *
 * @example
 * const result = await testCollectAPIConnection("your-api-key");
 * if (result.success) {
 *   console.log("Connected! Diesel price:", result.details?.diesel);
 * } else {
 *   console.error("Connection failed:", result.error);
 * }
 */
export async function testCollectAPIConnection(
	apiKey: string,
	testCoordinates: { lat: number; lng: number } = DEFAULT_TEST_COORDINATES,
): Promise<ConnectionTestResult> {
	const startTime = Date.now();

	try {
		const prices = await fetchFuelPrices({
			apiKey,
			lat: testCoordinates.lat,
			lng: testCoordinates.lng,
		});

		const latencyMs = Date.now() - startTime;

		return {
			success: true,
			status: "connected",
			latencyMs,
			message: `Connected successfully. Fuel prices for ${prices.country} retrieved.`,
			details: prices,
		};
	} catch (error) {
		const latencyMs = Date.now() - startTime;

		if (error instanceof InvalidAPIKeyError) {
			return {
				success: false,
				status: "invalid",
				latencyMs,
				message: "Invalid API key",
				error: error.message,
			};
		}

		if (error instanceof TimeoutError) {
			return {
				success: false,
				status: "timeout",
				latencyMs,
				message: "Request timed out",
				error: error.message,
			};
		}

		return {
			success: false,
			status: "error",
			latencyMs,
			message: "Connection failed",
			error: error instanceof Error ? error.message : "Unknown error",
		};
	}
}

/**
 * Convert USD price to EUR (approximate)
 *
 * Note: For production, use a proper exchange rate API.
 * This is a rough conversion for display purposes only.
 *
 * @param usdPrice - Price in USD
 * @param exchangeRate - EUR/USD exchange rate (default: 0.92)
 * @returns Price in EUR
 */
export function convertUsdToEur(usdPrice: number, exchangeRate = 0.92): number {
	return Math.round(usdPrice * exchangeRate * 100) / 100;
}
