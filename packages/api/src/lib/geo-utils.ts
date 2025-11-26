/**
 * Geographic utilities for point-in-zone detection
 * Used by the pricing engine to match pickup/dropoff to PricingZones
 */

export interface GeoPoint {
	lat: number;
	lng: number;
}

export interface GeoPolygon {
	type: "Polygon";
	coordinates: number[][][]; // [[[lng, lat], [lng, lat], ...]]
}

/**
 * Calculate the Haversine distance between two points in kilometers
 * @param point1 First point
 * @param point2 Second point
 * @returns Distance in kilometers
 */
export function haversineDistance(point1: GeoPoint, point2: GeoPoint): number {
	const R = 6371; // Earth's radius in kilometers

	const lat1Rad = (point1.lat * Math.PI) / 180;
	const lat2Rad = (point2.lat * Math.PI) / 180;
	const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
	const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

	const a =
		Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
		Math.cos(lat1Rad) *
			Math.cos(lat2Rad) *
			Math.sin(deltaLng / 2) *
			Math.sin(deltaLng / 2);

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

/**
 * Check if a point is within a radius of a center point
 * @param point The point to check
 * @param center The center of the radius zone
 * @param radiusKm The radius in kilometers
 * @returns True if the point is within the radius
 */
export function isPointInRadius(
	point: GeoPoint,
	center: GeoPoint,
	radiusKm: number,
): boolean {
	const distance = haversineDistance(point, center);
	return distance <= radiusKm;
}

/**
 * Check if a point is inside a polygon using the ray casting algorithm
 * @param point The point to check
 * @param polygon The polygon (GeoJSON format with coordinates as [lng, lat])
 * @returns True if the point is inside the polygon
 */
export function isPointInPolygon(
	point: GeoPoint,
	polygon: GeoPolygon,
): boolean {
	if (
		!polygon.coordinates ||
		!polygon.coordinates[0] ||
		polygon.coordinates[0].length < 3
	) {
		return false;
	}

	// Get the outer ring of the polygon (first array)
	const ring = polygon.coordinates[0];

	let inside = false;
	const x = point.lng;
	const y = point.lat;

	for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
		const xi = ring[i][0]; // lng
		const yi = ring[i][1]; // lat
		const xj = ring[j][0]; // lng
		const yj = ring[j][1]; // lat

		// Ray casting algorithm
		const intersect =
			yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

		if (intersect) {
			inside = !inside;
		}
	}

	return inside;
}

/**
 * Zone type enum matching Prisma schema
 */
export type ZoneType = "POLYGON" | "RADIUS" | "POINT";

/**
 * Zone data structure for matching
 */
export interface ZoneData {
	id: string;
	name: string;
	code: string;
	zoneType: ZoneType;
	geometry: GeoPolygon | null;
	centerLatitude: number | null;
	centerLongitude: number | null;
	radiusKm: number | null;
	isActive: boolean;
}

/**
 * Check if a point is inside a zone
 * @param point The point to check
 * @param zone The zone data
 * @returns True if the point is inside the zone
 */
export function isPointInZone(point: GeoPoint, zone: ZoneData): boolean {
	if (!zone.isActive) {
		return false;
	}

	switch (zone.zoneType) {
		case "POLYGON":
			if (!zone.geometry) {
				return false;
			}
			return isPointInPolygon(point, zone.geometry);

		case "RADIUS":
			if (
				zone.centerLatitude === null ||
				zone.centerLongitude === null ||
				zone.radiusKm === null
			) {
				return false;
			}
			return isPointInRadius(
				point,
				{ lat: zone.centerLatitude, lng: zone.centerLongitude },
				zone.radiusKm,
			);

		case "POINT":
			// For POINT zones, check if within a very small radius (e.g., 100m)
			if (zone.centerLatitude === null || zone.centerLongitude === null) {
				return false;
			}
			return isPointInRadius(
				point,
				{ lat: zone.centerLatitude, lng: zone.centerLongitude },
				0.1, // 100 meters
			);

		default:
			return false;
	}
}

/**
 * Find all zones that contain a given point
 * @param point The point to check
 * @param zones Array of zones to search
 * @returns Array of zones that contain the point (sorted by specificity - smaller zones first)
 */
export function findZonesForPoint(point: GeoPoint, zones: ZoneData[]): ZoneData[] {
	const matchingZones = zones.filter((zone) => isPointInZone(point, zone));

	// Sort by specificity: POINT > RADIUS (smaller first) > POLYGON
	return matchingZones.sort((a, b) => {
		// POINT zones are most specific
		if (a.zoneType === "POINT" && b.zoneType !== "POINT") return -1;
		if (b.zoneType === "POINT" && a.zoneType !== "POINT") return 1;

		// Then RADIUS zones, sorted by radius (smaller = more specific)
		if (a.zoneType === "RADIUS" && b.zoneType === "RADIUS") {
			return (a.radiusKm ?? 0) - (b.radiusKm ?? 0);
		}
		if (a.zoneType === "RADIUS" && b.zoneType !== "RADIUS") return -1;
		if (b.zoneType === "RADIUS" && a.zoneType !== "RADIUS") return 1;

		// POLYGON zones are least specific
		return 0;
	});
}

/**
 * Find the most specific zone for a point
 * @param point The point to check
 * @param zones Array of zones to search
 * @returns The most specific zone containing the point, or null if none
 */
export function findZoneForPoint(
	point: GeoPoint,
	zones: ZoneData[],
): ZoneData | null {
	const matchingZones = findZonesForPoint(point, zones);
	return matchingZones.length > 0 ? matchingZones[0] : null;
}
