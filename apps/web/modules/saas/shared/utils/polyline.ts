/**
 * Polyline Utilities
 *
 * Story 27.7: Live Map Mission Context Layer
 *
 * Shared utilities for decoding Google encoded polylines.
 * Used by DispatchMapGoogle and ModernRouteMap components.
 */

/**
 * Decodes a Google encoded polyline string into an array of coordinates.
 *
 * @param encoded - The encoded polyline string from Google Routes API
 * @returns Array of lat/lng coordinates
 *
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */
export function decodePolyline(
	encoded: string
): Array<{ lat: number; lng: number }> {
	const points: Array<{ lat: number; lng: number }> = [];
	let index = 0;
	const len = encoded.length;
	let lat = 0;
	let lng = 0;

	while (index < len) {
		let shift = 0;
		let result = 0;
		let byte: number;

		// Decode latitude
		do {
			byte = encoded.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);

		const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
		lat += deltaLat;

		shift = 0;
		result = 0;

		// Decode longitude
		do {
			byte = encoded.charCodeAt(index++) - 63;
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20);

		const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
		lng += deltaLng;

		points.push({ lat: lat / 1e5, lng: lng / 1e5 });
	}

	return points;
}
