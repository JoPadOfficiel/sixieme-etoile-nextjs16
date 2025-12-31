/**
 * Polyline Utilities
 * Story 17.13: Route Segmentation for Multi-Zone Trips
 * 
 * Implements Google Encoded Polyline Algorithm for decoding route polylines
 * @see https://developers.google.com/maps/documentation/utilities/polylinealgorithm
 */

import type { GeoPoint } from "./geo-utils";

/**
 * Decode a Google Encoded Polyline into an array of coordinates
 * 
 * The encoding process converts a binary value into a series of character codes
 * for ASCII characters using the familiar base64 encoding scheme.
 * 
 * @param encoded - The encoded polyline string from Google Routes API
 * @returns Array of lat/lng coordinates
 * @throws Error if the polyline is invalid
 */
export function decodePolyline(encoded: string): GeoPoint[] {
	if (!encoded || encoded.length === 0) {
		return [];
	}

	const points: GeoPoint[] = [];
	let index = 0;
	let lat = 0;
	let lng = 0;

	while (index < encoded.length) {
		// Decode latitude
		let shift = 0;
		let result = 0;
		let byte: number;

		do {
			byte = encoded.charCodeAt(index++) - 63;
			if (byte < 0 || byte > 63) {
				throw new Error(`Invalid polyline character at index ${index - 1}`);
			}
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20 && index < encoded.length);

		const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
		lat += deltaLat;

		// Decode longitude
		shift = 0;
		result = 0;

		do {
			byte = encoded.charCodeAt(index++) - 63;
			if (byte < 0 || byte > 63) {
				throw new Error(`Invalid polyline character at index ${index - 1}`);
			}
			result |= (byte & 0x1f) << shift;
			shift += 5;
		} while (byte >= 0x20 && index < encoded.length);

		const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
		lng += deltaLng;

		// Google uses 5 decimal places of precision (1e5)
		points.push({
			lat: lat / 1e5,
			lng: lng / 1e5,
		});
	}

	return points;
}

/**
 * Calculate the distance between two points using Haversine formula
 * 
 * @param p1 - First point
 * @param p2 - Second point
 * @returns Distance in kilometers
 */
export function segmentDistance(p1: GeoPoint, p2: GeoPoint): number {
	const R = 6371; // Earth's radius in kilometers
	const dLat = toRadians(p2.lat - p1.lat);
	const dLng = toRadians(p2.lng - p1.lng);
	
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(toRadians(p1.lat)) *
			Math.cos(toRadians(p2.lat)) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
	return degrees * (Math.PI / 180);
}

/**
 * Calculate the total distance of a polyline
 * 
 * @param points - Array of points
 * @returns Total distance in kilometers
 */
export function calculatePolylineDistance(points: GeoPoint[]): number {
	if (points.length < 2) {
		return 0;
	}

	let totalDistance = 0;
	for (let i = 0; i < points.length - 1; i++) {
		totalDistance += segmentDistance(points[i], points[i + 1]);
	}
	return totalDistance;
}

/**
 * Simplify a polyline by removing points that are very close together
 * Uses Douglas-Peucker-like simplification based on distance threshold
 * 
 * @param points - Array of points
 * @param minDistanceKm - Minimum distance between points (default: 0.05km = 50m)
 * @returns Simplified array of points
 */
export function simplifyPolyline(
	points: GeoPoint[],
	minDistanceKm = 0.05,
): GeoPoint[] {
	if (points.length <= 2) {
		return points;
	}

	const simplified: GeoPoint[] = [points[0]];
	let lastPoint = points[0];

	for (let i = 1; i < points.length - 1; i++) {
		const distance = segmentDistance(lastPoint, points[i]);
		if (distance >= minDistanceKm) {
			simplified.push(points[i]);
			lastPoint = points[i];
		}
	}

	// Always include the last point
	simplified.push(points[points.length - 1]);

	return simplified;
}

/**
 * Find the point where a line segment crosses from one zone to another
 * Uses binary search for efficiency
 * 
 * @param p1 - Start point (in zone A)
 * @param p2 - End point (in zone B)
 * @param isInZoneA - Function to check if a point is in zone A
 * @param precision - Precision in km (default: 0.01km = 10m)
 * @returns Approximate crossing point
 */
export function findZoneCrossingPoint(
	p1: GeoPoint,
	p2: GeoPoint,
	isInZoneA: (point: GeoPoint) => boolean,
	precision = 0.01,
): GeoPoint {
	const distance = segmentDistance(p1, p2);
	
	// If points are very close, return midpoint
	if (distance < precision) {
		return {
			lat: (p1.lat + p2.lat) / 2,
			lng: (p1.lng + p2.lng) / 2,
		};
	}

	// Binary search for the crossing point
	let low = 0;
	let high = 1;
	let iterations = 0;
	const maxIterations = 20; // Prevent infinite loops

	while (high - low > precision / distance && iterations < maxIterations) {
		const mid = (low + high) / 2;
		const midPoint: GeoPoint = {
			lat: p1.lat + (p2.lat - p1.lat) * mid,
			lng: p1.lng + (p2.lng - p1.lng) * mid,
		};

		if (isInZoneA(midPoint)) {
			low = mid;
		} else {
			high = mid;
		}
		iterations++;
	}

	// Return the point at the crossing
	const t = (low + high) / 2;
	return {
		lat: p1.lat + (p2.lat - p1.lat) * t,
		lng: p1.lng + (p2.lng - p1.lng) * t,
	};
}
