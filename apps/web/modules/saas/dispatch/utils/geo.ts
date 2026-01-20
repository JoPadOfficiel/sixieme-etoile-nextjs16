/**
 * Geospatial Utilities for Dispatch
 *
 * Story 27.8: Map Smart Assignment Suggestions
 *
 * Provides distance calculation and driver suggestion algorithms
 * for the dispatch map component.
 */

import type { DriverPosition } from "../mocks/driverPositions";

/**
 * Suggested driver with distance and rank
 */
export interface SuggestedDriver {
	driverId: string;
	driverName: string;
	distanceKm: number;
	rank: 1 | 2 | 3;
	lat: number;
	lng: number;
	status: "ACTIVE" | "INACTIVE";
}

/**
 * Convert degrees to radians
 */
function toRad(deg: number): number {
	return deg * (Math.PI / 180);
}

/**
 * Calculate the distance in kilometers between two GPS coordinates
 * using the Haversine formula.
 *
 * Accuracy: ~0.5% for distances < 100km
 * Performance: O(1) - constant time calculation
 *
 * @param lat1 - Latitude of point 1
 * @param lng1 - Longitude of point 1
 * @param lat2 - Latitude of point 2
 * @param lng2 - Longitude of point 2
 * @returns Distance in kilometers
 */
export function haversineDistance(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number
): number {
	const R = 6371; // Earth's radius in km

	const dLat = toRad(lat2 - lat1);
	const dLng = toRad(lng2 - lng1);

	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

/**
 * Find the N nearest drivers to a given pickup location.
 *
 * Only considers drivers with status "ACTIVE".
 * Returns drivers sorted by distance (closest first).
 *
 * Performance:
 * - Distance calculation: O(n)
 * - Sorting: O(n log n)
 * - Total: O(n log n) where n = number of drivers
 *
 * @param pickupLat - Pickup latitude
 * @param pickupLng - Pickup longitude
 * @param drivers - Array of driver positions
 * @param topN - Number of nearest drivers to return (default: 3)
 * @returns Array of suggested drivers with distance and rank
 */
export function findNearestDrivers(
	pickupLat: number,
	pickupLng: number,
	drivers: DriverPosition[],
	topN: number = 3
): SuggestedDriver[] {
	// Filter active drivers only
	const activeDrivers = drivers.filter(
		(d) => d.status === "ACTIVE" && d.lat != null && d.lng != null
	);

	// Calculate distance for each driver
	const driversWithDistance = activeDrivers.map((driver) => ({
		driverId: driver.id,
		driverName: driver.name,
		distanceKm: haversineDistance(pickupLat, pickupLng, driver.lat, driver.lng),
		lat: driver.lat,
		lng: driver.lng,
		status: driver.status,
	}));

	// Sort by distance (ascending)
	driversWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);

	// Take top N and assign ranks
	return driversWithDistance.slice(0, topN).map((driver, index) => ({
		...driver,
		rank: (index + 1) as 1 | 2 | 3,
	}));
}

/**
 * Check if a driver is in the suggested list
 *
 * @param driverId - Driver ID to check
 * @param suggestions - Array of suggested drivers
 * @returns The suggestion if found, null otherwise
 */
export function getSuggestionForDriver(
	driverId: string,
	suggestions: SuggestedDriver[]
): SuggestedDriver | null {
	return suggestions.find((s) => s.driverId === driverId) ?? null;
}

/**
 * Format distance for display
 *
 * @param distanceKm - Distance in kilometers
 * @returns Formatted string (e.g., "2.3 km" or "450 m")
 */
export function formatDistance(distanceKm: number): string {
	if (distanceKm < 1) {
		return `${Math.round(distanceKm * 1000)} m`;
	}
	return `${distanceKm.toFixed(1)} km`;
}
