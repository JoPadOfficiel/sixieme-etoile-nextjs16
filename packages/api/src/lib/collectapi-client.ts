/**
 * CollectAPI Gas Prices Client
 *
 * Client for interacting with CollectAPI Gas Prices API.
 * Used to fetch fuel prices by GPS coordinates for the pricing engine.
 *
 * Story 9.6: Settings → Integrations (Google Maps & CollectAPI)
 *
 * API Documentation: https://collectapi.com/api/gasPrice/gas-prices-api
 *
 * Uses /gasPrice/fromCoordinates endpoint which:
 * - Returns prices based on GPS coordinates (lat/lng)
 * - Prices in USD (conversion to EUR done separately)
 * - Precise pricing per location
 *
 * @see docs/bmad/prd.md#FR41 - Fuel price cache source
 * @see docs/api/collectapi-technical-guide.md
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

/**
 * USD to EUR exchange rate (approximate)
 * Updated periodically - for production, use a real-time exchange rate API
 */
export const USD_TO_EUR_RATE = 0.92;

// ============================================================================
// Types
// ============================================================================

/**
 * Fuel types supported by CollectAPI
 */
export type CollectAPIFuelType = "gasoline" | "diesel" | "lpg";

/**
 * Raw response from CollectAPI /fromCoordinates endpoint
 * Returns a single result object based on coordinates
 */
export interface CollectAPIResponse {
	success: boolean;
	result: {
		country: string;
		gasoline: string;
		diesel: string;
		lpg: string;
		currency: string;
	};
	error?: string;
	message?: string;
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
 * Parameters for fetching fuel prices by coordinates
 */
export interface FetchFuelPricesParams {
	apiKey: string;
	lat: number;
	lng: number;
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
 * Handles cases where the API key already includes the "apikey " prefix
 */
function createAuthHeader(apiKey: string): string {
	// If the key already starts with "apikey ", don't add it again
	if (apiKey.toLowerCase().startsWith("apikey ")) {
		return apiKey;
	}
	return `apikey ${apiKey}`;
}

/**
 * Build URL for /fromCoordinates endpoint
 */
function buildCoordinatesUrl(lat: number, lng: number): string {
	return `${COLLECTAPI_BASE_URL}/fromCoordinates?lat=${lat}&lng=${lng}`;
}

/**
 * Parse numeric price from string
 */
function parsePrice(value: string): number {
	if (!value || value === "-") return 0;
	const parsed = parseFloat(value);
	return isNaN(parsed) ? 0 : parsed;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Fetch fuel prices from CollectAPI using fromCoordinates endpoint
 * Returns prices based on GPS coordinates
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
	const { apiKey, lat, lng } = params;

	const url = buildCoordinatesUrl(lat, lng);

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
			const errorMsg = data.error || data.message || "CollectAPI returned success: false";
			if (errorMsg.toLowerCase().includes("apikey")) {
				throw new InvalidAPIKeyError(errorMsg);
			}
			throw new CollectAPIError(errorMsg, undefined, data);
		}

		// Check for result object
		if (!data.result || !data.result.country) {
			throw new CollectAPIError("No fuel price data returned for coordinates");
		}

		// Parse prices and convert from USD to EUR
		const gasolineUsd = parsePrice(data.result.gasoline);
		const dieselUsd = parsePrice(data.result.diesel);
		const lpgUsd = parsePrice(data.result.lpg);

		return {
			country: data.result.country,
			gasoline: convertUsdToEur(gasolineUsd),
			diesel: convertUsdToEur(dieselUsd),
			lpg: convertUsdToEur(lpgUsd),
			currency: "EUR", // Always return EUR after conversion
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
 * Convert USD price to EUR
 * @param usdPrice - Price in USD
 * @param rate - Exchange rate (default from USD_TO_EUR_RATE)
 */
export function convertUsdToEur(usdPrice: number, rate = USD_TO_EUR_RATE): number {
	return Math.round(usdPrice * rate * 100) / 100;
}
