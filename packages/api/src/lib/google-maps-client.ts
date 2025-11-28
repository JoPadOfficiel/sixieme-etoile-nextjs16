/**
 * Google Maps API Client
 *
 * Client for testing Google Maps API connectivity.
 * Uses the Geocoding API to validate API keys.
 *
 * Story 9.6: Settings → Integrations (Google Maps & CollectAPI)
 *
 * API Documentation: https://developers.google.com/maps/documentation
 */

// ============================================================================
// Configuration
// ============================================================================

/**
 * Google Maps Geocoding API base URL
 */
export const GOOGLE_MAPS_GEOCODING_URL = "https://maps.googleapis.com/maps/api/geocode/json";

/**
 * Default test address (Paris, France)
 */
export const DEFAULT_TEST_ADDRESS = "Paris, France";

/**
 * Request timeout in milliseconds
 */
export const REQUEST_TIMEOUT_MS = 10000;

// ============================================================================
// Types
// ============================================================================

/**
 * Google Maps Geocoding API response
 */
export interface GoogleMapsGeocodingResponse {
	status: string;
	results: Array<{
		formatted_address: string;
		geometry: {
			location: {
				lat: number;
				lng: number;
			};
		};
		place_id: string;
	}>;
	error_message?: string;
}

/**
 * Result of a connection test
 */
export interface GoogleMapsTestResult {
	success: boolean;
	status: "connected" | "invalid" | "error" | "timeout" | "quota_exceeded";
	latencyMs?: number;
	message: string;
	details?: {
		address: string;
		location?: {
			lat: number;
			lng: number;
		};
	};
	error?: string;
}

// ============================================================================
// Error Classes
// ============================================================================

/**
 * Error thrown when Google Maps API returns an error
 */
export class GoogleMapsError extends Error {
	constructor(
		message: string,
		public readonly status?: string,
		public readonly response?: unknown,
	) {
		super(message);
		this.name = "GoogleMapsError";
	}
}

/**
 * Error thrown when API key is invalid
 */
export class InvalidGoogleMapsKeyError extends GoogleMapsError {
	constructor(message = "Invalid Google Maps API key") {
		super(message, "REQUEST_DENIED");
		this.name = "InvalidGoogleMapsKeyError";
	}
}

/**
 * Error thrown when quota is exceeded
 */
export class QuotaExceededError extends GoogleMapsError {
	constructor(message = "Google Maps API quota exceeded") {
		super(message, "OVER_QUERY_LIMIT");
		this.name = "QuotaExceededError";
	}
}

/**
 * Error thrown when request times out
 */
export class TimeoutError extends GoogleMapsError {
	constructor(message = "Request timed out") {
		super(message);
		this.name = "TimeoutError";
	}
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Build URL for Geocoding API
 */
function buildGeocodingUrl(address: string, apiKey: string): string {
	const url = new URL(GOOGLE_MAPS_GEOCODING_URL);
	url.searchParams.set("address", address);
	url.searchParams.set("key", apiKey);
	return url.toString();
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Test Google Maps API connection with the given API key
 *
 * Uses the Geocoding API to validate the key by geocoding a test address.
 *
 * @param apiKey - The Google Maps API key to test
 * @param testAddress - Optional address for testing (default: Paris, France)
 * @returns Promise<GoogleMapsTestResult> with test results
 *
 * @example
 * const result = await testGoogleMapsConnection("your-api-key");
 * if (result.success) {
 *   console.log("Connected! Location:", result.details?.location);
 * } else {
 *   console.error("Connection failed:", result.error);
 * }
 */
export async function testGoogleMapsConnection(
	apiKey: string,
	testAddress: string = DEFAULT_TEST_ADDRESS,
): Promise<GoogleMapsTestResult> {
	const startTime = Date.now();

	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

	try {
		const url = buildGeocodingUrl(testAddress, apiKey);

		const response = await fetch(url, {
			method: "GET",
			signal: controller.signal,
		});

		clearTimeout(timeoutId);

		const latencyMs = Date.now() - startTime;

		// Handle HTTP errors
		if (!response.ok) {
			return {
				success: false,
				status: "error",
				latencyMs,
				message: `HTTP error: ${response.status} ${response.statusText}`,
				error: `HTTP ${response.status}`,
			};
		}

		const data: GoogleMapsGeocodingResponse = await response.json();

		// Check API status
		switch (data.status) {
			case "OK":
				const result = data.results[0];
				return {
					success: true,
					status: "connected",
					latencyMs,
					message: "Connected successfully. Geocoding API is working.",
					details: {
						address: result?.formatted_address || testAddress,
						location: result?.geometry?.location,
					},
				};

			case "REQUEST_DENIED":
				return {
					success: false,
					status: "invalid",
					latencyMs,
					message: data.error_message || "API key is invalid or restricted",
					error: data.error_message || "REQUEST_DENIED",
				};

			case "OVER_QUERY_LIMIT":
				return {
					success: false,
					status: "quota_exceeded",
					latencyMs,
					message: "API quota exceeded. Please check your billing.",
					error: "OVER_QUERY_LIMIT",
				};

			case "ZERO_RESULTS":
				// Key is valid but no results for address - still counts as connected
				return {
					success: true,
					status: "connected",
					latencyMs,
					message: "Connected successfully. No results for test address but API is working.",
					details: {
						address: testAddress,
					},
				};

			default:
				return {
					success: false,
					status: "error",
					latencyMs,
					message: data.error_message || `Unexpected status: ${data.status}`,
					error: data.status,
				};
		}
	} catch (error) {
		clearTimeout(timeoutId);

		const latencyMs = Date.now() - startTime;

		if (error instanceof Error && error.name === "AbortError") {
			return {
				success: false,
				status: "timeout",
				latencyMs,
				message: "Request timed out",
				error: "TIMEOUT",
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
 * Geocode an address using Google Maps API
 *
 * @param apiKey - The Google Maps API key
 * @param address - The address to geocode
 * @returns Promise with geocoding result
 */
export async function geocodeAddress(
	apiKey: string,
	address: string,
): Promise<{
	success: boolean;
	location?: { lat: number; lng: number };
	formattedAddress?: string;
	error?: string;
}> {
	const result = await testGoogleMapsConnection(apiKey, address);

	if (result.success && result.details?.location) {
		return {
			success: true,
			location: result.details.location,
			formattedAddress: result.details.address,
		};
	}

	return {
		success: false,
		error: result.error || result.message,
	};
}
