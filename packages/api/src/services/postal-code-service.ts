/**
 * Postal Code Service - Story 11.2
 *
 * Service for geocoding French postal codes and retrieving their boundaries.
 * Uses OpenStreetMap Nominatim API for boundary data.
 *
 * Note: For production, consider using static GeoJSON data from La Poste/INSEE
 * to avoid rate limiting and improve performance.
 */

import * as turf from "@turf/turf";
import type { Feature, MultiPolygon, Polygon } from "geojson";

// Types
export interface PostalCodeBoundary {
	postalCode: string;
	name: string;
	geometry: Polygon | MultiPolygon;
	center: {
		latitude: number;
		longitude: number;
	};
	boundingBox: {
		minLat: number;
		maxLat: number;
		minLng: number;
		maxLng: number;
	};
}

export interface PostalCodeValidationResult {
	postalCode: string;
	isValid: boolean;
	error?: string;
	boundary?: PostalCodeBoundary;
}

export interface MergedZoneResult {
	geometry: Polygon | MultiPolygon;
	center: {
		latitude: number;
		longitude: number;
	};
	postalCodes: string[];
	totalArea: number; // in km²
}

// French postal code regex (5 digits)
const FRENCH_POSTAL_CODE_REGEX = /^[0-9]{5}$/;

// Nominatim API base URL
const NOMINATIM_API = "https://nominatim.openstreetmap.org";

// Rate limiting: Nominatim requires max 1 request per second
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1100; // 1.1 seconds to be safe

async function rateLimitedFetch(url: string): Promise<Response> {
	const now = Date.now();
	const timeSinceLastRequest = now - lastRequestTime;

	if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
		await new Promise((resolve) =>
			setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
		);
	}

	lastRequestTime = Date.now();

	return fetch(url, {
		headers: {
			"User-Agent": "SixiemeEtoile-VTC-ERP/1.0 (contact@sixieme-etoile.fr)",
			Accept: "application/json",
		},
	});
}

/**
 * Validate a French postal code format
 */
export function validatePostalCodeFormat(
	postalCode: string,
	countryCode = "FR"
): { isValid: boolean; error?: string } {
	if (countryCode !== "FR") {
		return {
			isValid: false,
			error: "Only French postal codes are supported in this version",
		};
	}

	const trimmed = postalCode.trim();

	if (!FRENCH_POSTAL_CODE_REGEX.test(trimmed)) {
		return {
			isValid: false,
			error: "French postal codes must be exactly 5 digits",
		};
	}

	// Additional validation for French departments
	const department = parseInt(trimmed.substring(0, 2), 10);

	// Valid French departments: 01-95 (mainland), 97x (overseas)
	if (department === 0 || (department > 95 && department < 97) || department > 98) {
		// Special case: Corsica uses 20xxx but is split into 2A and 2B
		if (department !== 20) {
			return {
				isValid: false,
				error: "Invalid French department code",
			};
		}
	}

	return { isValid: true };
}

/**
 * Fetch postal code boundary from Nominatim
 */
export async function fetchPostalCodeBoundary(
	postalCode: string,
	countryCode = "FR"
): Promise<PostalCodeBoundary | null> {
	const validation = validatePostalCodeFormat(postalCode, countryCode);
	if (!validation.isValid) {
		throw new Error(validation.error);
	}

	try {
		// Search for the postal code with polygon geometry
		const searchUrl = `${NOMINATIM_API}/search?postalcode=${postalCode}&country=${countryCode}&format=json&polygon_geojson=1&limit=1`;

		const response = await rateLimitedFetch(searchUrl);

		if (!response.ok) {
			throw new Error(`Nominatim API error: ${response.status}`);
		}

		const results = await response.json();

		if (!results || results.length === 0) {
			return null;
		}

		const result = results[0];

		// Check if we have geometry data
		if (!result.geojson) {
			// If no polygon, try to get boundary from OSM relation
			return await fetchPostalCodeBoundaryFromOSM(postalCode, countryCode);
		}

		const geometry = result.geojson as { type: string; coordinates: unknown };

		// Ensure it's a valid polygon type
		if (geometry.type !== "Polygon" && geometry.type !== "MultiPolygon") {
			// Convert point to a small circle as fallback
			if (geometry.type === "Point") {
				const [lng, lat] = geometry.coordinates as [number, number];
				const circle = turf.circle([lng, lat], 1, { units: "kilometers", steps: 32 });
				return {
					postalCode,
					name: result.display_name || postalCode,
					geometry: circle.geometry as Polygon,
					center: { latitude: lat, longitude: lng },
					boundingBox: {
						minLat: parseFloat(result.boundingbox[0]),
						maxLat: parseFloat(result.boundingbox[1]),
						minLng: parseFloat(result.boundingbox[2]),
						maxLng: parseFloat(result.boundingbox[3]),
					},
				};
			}
			return null;
		}

		return {
			postalCode,
			name: result.display_name || postalCode,
			geometry: geometry as Polygon | MultiPolygon,
			center: {
				latitude: parseFloat(result.lat),
				longitude: parseFloat(result.lon),
			},
			boundingBox: {
				minLat: parseFloat(result.boundingbox[0]),
				maxLat: parseFloat(result.boundingbox[1]),
				minLng: parseFloat(result.boundingbox[2]),
				maxLng: parseFloat(result.boundingbox[3]),
			},
		};
	} catch (error) {
		console.error(`Error fetching boundary for postal code ${postalCode}:`, error);
		throw error;
	}
}

/**
 * Alternative method to fetch boundary from OSM directly
 */
async function fetchPostalCodeBoundaryFromOSM(
	postalCode: string,
	countryCode: string
): Promise<PostalCodeBoundary | null> {
	try {
		// Use Overpass API to get postal code boundary
		const overpassQuery = `
			[out:json][timeout:25];
			area["ISO3166-1"="${countryCode}"]->.searchArea;
			(
				relation["boundary"="postal_code"]["postal_code"="${postalCode}"](area.searchArea);
			);
			out geom;
		`;

		const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

		const response = await rateLimitedFetch(overpassUrl);

		if (!response.ok) {
			return null;
		}

		const data = await response.json();

		if (!data.elements || data.elements.length === 0) {
			return null;
		}

		// Convert OSM relation to GeoJSON polygon
		const element = data.elements[0];
		if (element.type !== "relation" || !element.members) {
			return null;
		}

		// Extract outer ways and build polygon
		const outerWays = element.members.filter(
			(m: { role: string; type: string }) => m.role === "outer" && m.type === "way"
		);

		if (outerWays.length === 0) {
			return null;
		}

		// Build coordinates from ways
		const coordinates: number[][][] = [];
		for (const way of outerWays) {
			if (way.geometry) {
				const ring = way.geometry.map((p: { lon: number; lat: number }) => [p.lon, p.lat]);
				// Close the ring if needed
				if (
					ring.length > 0 &&
					(ring[0][0] !== ring[ring.length - 1][0] ||
						ring[0][1] !== ring[ring.length - 1][1])
				) {
					ring.push(ring[0]);
				}
				coordinates.push(ring);
			}
		}

		if (coordinates.length === 0) {
			return null;
		}

		const geometry: Polygon = {
			type: "Polygon",
			coordinates,
		};

		// Calculate center
		const centroid = turf.centroid(geometry);
		const bbox = turf.bbox(geometry);

		return {
			postalCode,
			name: element.tags?.name || postalCode,
			geometry,
			center: {
				latitude: centroid.geometry.coordinates[1],
				longitude: centroid.geometry.coordinates[0],
			},
			boundingBox: {
				minLng: bbox[0],
				minLat: bbox[1],
				maxLng: bbox[2],
				maxLat: bbox[3],
			},
		};
	} catch (error) {
		console.error(`Error fetching OSM boundary for ${postalCode}:`, error);
		return null;
	}
}

/**
 * Validate and fetch boundaries for multiple postal codes
 */
export async function validatePostalCodes(
	postalCodes: string[],
	countryCode = "FR"
): Promise<PostalCodeValidationResult[]> {
	const results: PostalCodeValidationResult[] = [];

	for (const postalCode of postalCodes) {
		const trimmed = postalCode.trim();

		// Format validation
		const formatValidation = validatePostalCodeFormat(trimmed, countryCode);
		if (!formatValidation.isValid) {
			results.push({
				postalCode: trimmed,
				isValid: false,
				error: formatValidation.error,
			});
			continue;
		}

		// Try to fetch boundary
		try {
			const boundary = await fetchPostalCodeBoundary(trimmed, countryCode);

			if (boundary) {
				results.push({
					postalCode: trimmed,
					isValid: true,
					boundary,
				});
			} else {
				results.push({
					postalCode: trimmed,
					isValid: false,
					error: "Postal code not found or no boundary data available",
				});
			}
		} catch (error) {
			results.push({
				postalCode: trimmed,
				isValid: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}

	return results;
}

/**
 * Merge multiple postal code boundaries into a single polygon
 */
export function mergePostalCodeBoundaries(
	boundaries: PostalCodeBoundary[]
): MergedZoneResult | null {
	if (boundaries.length === 0) {
		return null;
	}

	if (boundaries.length === 1) {
		const boundary = boundaries[0];
		const area = turf.area(boundary.geometry) / 1_000_000; // Convert m² to km²

		return {
			geometry: boundary.geometry,
			center: boundary.center,
			postalCodes: [boundary.postalCode],
			totalArea: area,
		};
	}

	try {
		// Convert all boundaries to features
		const features: Feature<Polygon | MultiPolygon>[] = boundaries.map((b) => ({
			type: "Feature" as const,
			properties: { postalCode: b.postalCode },
			geometry: b.geometry,
		}));

		// Union all polygons
		let merged = features[0];

		for (let i = 1; i < features.length; i++) {
			try {
				const unionResult = turf.union(
					turf.featureCollection([merged, features[i]])
				);
				if (unionResult) {
					merged = unionResult as Feature<Polygon | MultiPolygon>;
				}
			} catch (unionError) {
				// If union fails (non-adjacent polygons), try buffer + union
				console.warn(
					`Union failed for postal code ${boundaries[i].postalCode}, trying with buffer`
				);

				// Add small buffer to handle gaps
				const buffered1 = turf.buffer(merged, 0.01, { units: "kilometers" });
				const buffered2 = turf.buffer(features[i], 0.01, { units: "kilometers" });

				if (buffered1 && buffered2) {
					const bufferedUnion = turf.union(
						turf.featureCollection([buffered1, buffered2])
					);
					if (bufferedUnion) {
						// Remove the buffer
						const unbuffered = turf.buffer(bufferedUnion, -0.01, {
							units: "kilometers",
						});
						if (unbuffered) {
							merged = unbuffered as Feature<Polygon | MultiPolygon>;
						}
					}
				}
			}
		}

		// Calculate center of merged geometry
		const centroid = turf.centroid(merged);
		const area = turf.area(merged) / 1_000_000; // Convert m² to km²

		// Simplify the geometry to reduce complexity
		const simplified = turf.simplify(merged, {
			tolerance: 0.0001,
			highQuality: true,
		});

		return {
			geometry: (simplified || merged).geometry as Polygon | MultiPolygon,
			center: {
				latitude: centroid.geometry.coordinates[1],
				longitude: centroid.geometry.coordinates[0],
			},
			postalCodes: boundaries.map((b) => b.postalCode),
			totalArea: area,
		};
	} catch (error) {
		console.error("Error merging postal code boundaries:", error);
		return null;
	}
}

/**
 * Get boundaries for postal codes and merge them
 */
export async function getPostalCodeZoneGeometry(
	postalCodes: string[],
	countryCode = "FR"
): Promise<{
	success: boolean;
	result?: MergedZoneResult;
	validationResults: PostalCodeValidationResult[];
	errors: string[];
}> {
	const errors: string[] = [];

	// Validate and fetch all postal codes
	const validationResults = await validatePostalCodes(postalCodes, countryCode);

	// Collect valid boundaries
	const validBoundaries: PostalCodeBoundary[] = [];

	for (const result of validationResults) {
		if (result.isValid && result.boundary) {
			validBoundaries.push(result.boundary);
		} else if (!result.isValid) {
			errors.push(`${result.postalCode}: ${result.error}`);
		}
	}

	if (validBoundaries.length === 0) {
		return {
			success: false,
			validationResults,
			errors: errors.length > 0 ? errors : ["No valid postal codes found"],
		};
	}

	// Merge boundaries
	const merged = mergePostalCodeBoundaries(validBoundaries);

	if (!merged) {
		return {
			success: false,
			validationResults,
			errors: ["Failed to merge postal code boundaries"],
		};
	}

	return {
		success: true,
		result: merged,
		validationResults,
		errors,
	};
}

/**
 * Search for postal codes by partial match (for autocomplete)
 * Note: This is a basic implementation. For production, use a local database.
 */
export async function searchPostalCodes(
	query: string,
	countryCode = "FR",
	limit = 10
): Promise<{ postalCode: string; name: string }[]> {
	if (query.length < 2) {
		return [];
	}

	try {
		const searchUrl = `${NOMINATIM_API}/search?postalcode=${query}*&country=${countryCode}&format=json&limit=${limit}`;

		const response = await rateLimitedFetch(searchUrl);

		if (!response.ok) {
			return [];
		}

		const results = await response.json();

		// Extract unique postal codes
		const seen = new Set<string>();
		const postalCodes: { postalCode: string; name: string }[] = [];

		for (const result of results) {
			// Try to extract postal code from address
			const address = result.address || {};
			const postalCode = address.postcode;

			if (postalCode && !seen.has(postalCode)) {
				seen.add(postalCode);
				postalCodes.push({
					postalCode,
					name: result.display_name?.split(",")[0] || postalCode,
				});
			}
		}

		return postalCodes;
	} catch (error) {
		console.error("Error searching postal codes:", error);
		return [];
	}
}
