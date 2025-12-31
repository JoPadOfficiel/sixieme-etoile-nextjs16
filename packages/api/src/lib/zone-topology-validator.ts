/**
 * Zone Topology Validator
 * Story 17.11: Zone Topology Validation Tools
 *
 * Detects overlaps, gaps, and coverage issues in zone configuration
 */

import {
	type GeoPoint,
	type GeoPolygon,
	type ZoneData,
	haversineDistance,
	isPointInPolygon,
	isPointInRadius,
} from "./geo-utils";

/**
 * Validation result interfaces
 */
export interface ZoneValidationResult {
	isValid: boolean;
	summary: {
		totalZones: number;
		activeZones: number;
		overlapsCount: number;
		missingFieldsCount: number;
		warningsCount: number;
	};
	overlaps: ZoneOverlapIssue[];
	missingFields: ZoneMissingFieldIssue[];
	warnings: ZoneWarning[];
}

export interface ZoneOverlapIssue {
	severity: "INFO" | "WARNING";
	zone1: { id: string; name: string; code: string };
	zone2: { id: string; name: string; code: string };
	overlapType:
		| "POLYGON_POLYGON"
		| "POLYGON_RADIUS"
		| "RADIUS_RADIUS"
		| "POINT_OVERLAP";
	message: string;
	suggestion: string;
}

export interface ZoneMissingFieldIssue {
	severity: "WARNING" | "ERROR";
	zone: { id: string; name: string; code: string };
	field: string;
	message: string;
	suggestion: string;
}

export interface ZoneWarning {
	severity: "INFO" | "WARNING";
	type: string;
	message: string;
	suggestion: string;
}

export interface ValidationOptions {
	conflictStrategyConfigured: boolean;
	checkCoverageGaps: boolean;
	boundingBox?: {
		minLat: number;
		maxLat: number;
		minLng: number;
		maxLng: number;
	};
}

/**
 * Check if two RADIUS zones overlap
 * Two circles overlap if distance between centers < sum of radii
 */
export function doRadiusZonesOverlap(
	zone1: ZoneData,
	zone2: ZoneData,
): boolean {
	if (
		zone1.centerLatitude === null ||
		zone1.centerLongitude === null ||
		zone1.radiusKm === null ||
		zone2.centerLatitude === null ||
		zone2.centerLongitude === null ||
		zone2.radiusKm === null
	) {
		return false;
	}

	const center1: GeoPoint = {
		lat: zone1.centerLatitude,
		lng: zone1.centerLongitude,
	};
	const center2: GeoPoint = {
		lat: zone2.centerLatitude,
		lng: zone2.centerLongitude,
	};

	const distance = haversineDistance(center1, center2);
	return distance < zone1.radiusKm + zone2.radiusKm;
}

/**
 * Check if a POLYGON and RADIUS zone overlap
 * - Check if circle center is in polygon
 * - Check if any polygon vertex is in circle
 * - Check if circle intersects any polygon edge (simplified: check edge midpoints)
 */
export function doPolygonAndRadiusOverlap(
	polygonZone: ZoneData,
	radiusZone: ZoneData,
): boolean {
	if (
		!polygonZone.geometry ||
		radiusZone.centerLatitude === null ||
		radiusZone.centerLongitude === null ||
		radiusZone.radiusKm === null
	) {
		return false;
	}

	const circleCenter: GeoPoint = {
		lat: radiusZone.centerLatitude,
		lng: radiusZone.centerLongitude,
	};
	const radiusKm = radiusZone.radiusKm;

	// Check if circle center is inside polygon
	if (isPointInPolygon(circleCenter, polygonZone.geometry)) {
		return true;
	}

	// Check if any polygon vertex is inside circle
	const ring = polygonZone.geometry.coordinates?.[0];
	if (!ring || ring.length < 3) {
		return false;
	}

	for (const coord of ring) {
		const vertex: GeoPoint = { lat: coord[1], lng: coord[0] };
		if (isPointInRadius(vertex, circleCenter, radiusKm)) {
			return true;
		}
	}

	// Check edge midpoints (simplified edge intersection check)
	for (let i = 0; i < ring.length - 1; i++) {
		const midpoint: GeoPoint = {
			lat: (ring[i][1] + ring[i + 1][1]) / 2,
			lng: (ring[i][0] + ring[i + 1][0]) / 2,
		};
		if (isPointInRadius(midpoint, circleCenter, radiusKm)) {
			return true;
		}
	}

	return false;
}

/**
 * Check if two POLYGON zones overlap
 * Simplified: check if any vertex of polygon A is inside polygon B, or vice versa
 */
export function doPolygonZonesOverlap(
	zone1: ZoneData,
	zone2: ZoneData,
): boolean {
	if (!zone1.geometry || !zone2.geometry) {
		return false;
	}

	const ring1 = zone1.geometry.coordinates?.[0];
	const ring2 = zone2.geometry.coordinates?.[0];

	if (!ring1 || !ring2 || ring1.length < 3 || ring2.length < 3) {
		return false;
	}

	// Check if any vertex of polygon1 is inside polygon2
	for (const coord of ring1) {
		const vertex: GeoPoint = { lat: coord[1], lng: coord[0] };
		if (isPointInPolygon(vertex, zone2.geometry)) {
			return true;
		}
	}

	// Check if any vertex of polygon2 is inside polygon1
	for (const coord of ring2) {
		const vertex: GeoPoint = { lat: coord[1], lng: coord[0] };
		if (isPointInPolygon(vertex, zone1.geometry)) {
			return true;
		}
	}

	return false;
}

/**
 * Check if two POINT zones overlap (same location within tolerance)
 */
export function doPointZonesOverlap(zone1: ZoneData, zone2: ZoneData): boolean {
	if (
		zone1.centerLatitude === null ||
		zone1.centerLongitude === null ||
		zone2.centerLatitude === null ||
		zone2.centerLongitude === null
	) {
		return false;
	}

	const center1: GeoPoint = {
		lat: zone1.centerLatitude,
		lng: zone1.centerLongitude,
	};
	const center2: GeoPoint = {
		lat: zone2.centerLatitude,
		lng: zone2.centerLongitude,
	};

	// POINT zones have 100m effective radius, so overlap if within 200m
	const distance = haversineDistance(center1, center2);
	return distance < 0.2; // 200 meters
}

/**
 * Detect all overlapping zone pairs
 */
export function detectZoneOverlaps(
	zones: ZoneData[],
	conflictStrategyConfigured: boolean,
): ZoneOverlapIssue[] {
	const overlaps: ZoneOverlapIssue[] = [];
	const activeZones = zones.filter((z) => z.isActive);

	for (let i = 0; i < activeZones.length; i++) {
		for (let j = i + 1; j < activeZones.length; j++) {
			const zone1 = activeZones[i];
			const zone2 = activeZones[j];

			let overlaps_detected = false;
			let overlapType: ZoneOverlapIssue["overlapType"] = "POLYGON_POLYGON";

			// Check based on zone types
			if (zone1.zoneType === "RADIUS" && zone2.zoneType === "RADIUS") {
				overlaps_detected = doRadiusZonesOverlap(zone1, zone2);
				overlapType = "RADIUS_RADIUS";
			} else if (zone1.zoneType === "POLYGON" && zone2.zoneType === "POLYGON") {
				overlaps_detected = doPolygonZonesOverlap(zone1, zone2);
				overlapType = "POLYGON_POLYGON";
			} else if (zone1.zoneType === "POLYGON" && zone2.zoneType === "RADIUS") {
				overlaps_detected = doPolygonAndRadiusOverlap(zone1, zone2);
				overlapType = "POLYGON_RADIUS";
			} else if (zone1.zoneType === "RADIUS" && zone2.zoneType === "POLYGON") {
				overlaps_detected = doPolygonAndRadiusOverlap(zone2, zone1);
				overlapType = "POLYGON_RADIUS";
			} else if (zone1.zoneType === "POINT" && zone2.zoneType === "POINT") {
				overlaps_detected = doPointZonesOverlap(zone1, zone2);
				overlapType = "POINT_OVERLAP";
			} else if (zone1.zoneType === "POINT" || zone2.zoneType === "POINT") {
				// POINT with RADIUS or POLYGON
				const pointZone = zone1.zoneType === "POINT" ? zone1 : zone2;
				const otherZone = zone1.zoneType === "POINT" ? zone2 : zone1;

				if (
					pointZone.centerLatitude !== null &&
					pointZone.centerLongitude !== null
				) {
					const point: GeoPoint = {
						lat: pointZone.centerLatitude,
						lng: pointZone.centerLongitude,
					};

					if (otherZone.zoneType === "RADIUS") {
						if (
							otherZone.centerLatitude !== null &&
							otherZone.centerLongitude !== null &&
							otherZone.radiusKm !== null
						) {
							overlaps_detected = isPointInRadius(
								point,
								{
									lat: otherZone.centerLatitude,
									lng: otherZone.centerLongitude,
								},
								otherZone.radiusKm,
							);
						}
					} else if (otherZone.zoneType === "POLYGON" && otherZone.geometry) {
						overlaps_detected = isPointInPolygon(point, otherZone.geometry);
					}
					overlapType = "POINT_OVERLAP";
				}
			}

			if (overlaps_detected) {
				overlaps.push({
					severity: conflictStrategyConfigured ? "INFO" : "WARNING",
					zone1: { id: zone1.id, name: zone1.name, code: zone1.code },
					zone2: { id: zone2.id, name: zone2.name, code: zone2.code },
					overlapType,
					message: `Zones "${zone1.name}" and "${zone2.name}" overlap geographically`,
					suggestion: conflictStrategyConfigured
						? "Overlap will be resolved using configured conflict strategy"
						: "Configure zone priorities or enable a conflict resolution strategy in organization settings",
				});
			}
		}
	}

	return overlaps;
}

/**
 * Detect zones with missing required fields
 */
export function detectMissingFields(
	zones: ZoneData[],
	conflictStrategyConfigured: boolean,
	conflictStrategy?: string | null,
): ZoneMissingFieldIssue[] {
	const issues: ZoneMissingFieldIssue[] = [];

	for (const zone of zones) {
		if (!zone.isActive) continue;

		// Check RADIUS zone has radiusKm
		if (zone.zoneType === "RADIUS" && zone.radiusKm === null) {
			issues.push({
				severity: "ERROR",
				zone: { id: zone.id, name: zone.name, code: zone.code },
				field: "radiusKm",
				message: `RADIUS zone "${zone.name}" is missing radius value`,
				suggestion: "Set a radius value in kilometers for this zone",
			});
		}

		// Check POLYGON zone has valid geometry
		if (zone.zoneType === "POLYGON") {
			if (!zone.geometry) {
				issues.push({
					severity: "ERROR",
					zone: { id: zone.id, name: zone.name, code: zone.code },
					field: "geometry",
					message: `POLYGON zone "${zone.name}" is missing geometry data`,
					suggestion: "Draw the zone boundary on the map",
				});
			} else {
				const ring = (zone.geometry as GeoPolygon).coordinates?.[0];
				if (!ring || ring.length < 4) {
					// Minimum 3 points + closing point
					issues.push({
						severity: "ERROR",
						zone: { id: zone.id, name: zone.name, code: zone.code },
						field: "geometry",
						message: `POLYGON zone "${zone.name}" has invalid geometry (needs at least 3 points)`,
						suggestion: "Redraw the zone boundary with at least 3 points",
					});
				}
			}
		}

		// Check POINT/RADIUS zones have center coordinates
		if (
			(zone.zoneType === "POINT" || zone.zoneType === "RADIUS") &&
			(zone.centerLatitude === null || zone.centerLongitude === null)
		) {
			issues.push({
				severity: "ERROR",
				zone: { id: zone.id, name: zone.name, code: zone.code },
				field: "centerLatitude/centerLongitude",
				message: `Zone "${zone.name}" is missing center coordinates`,
				suggestion: "Set the center point for this zone",
			});
		}

		// Check priority is set when using PRIORITY or COMBINED strategy
		if (
			conflictStrategyConfigured &&
			(conflictStrategy === "PRIORITY" || conflictStrategy === "COMBINED")
		) {
			if (zone.priority === undefined || zone.priority === 0) {
				issues.push({
					severity: "WARNING",
					zone: { id: zone.id, name: zone.name, code: zone.code },
					field: "priority",
					message: `Zone "${zone.name}" has no priority set (using ${conflictStrategy} strategy)`,
					suggestion:
						"Set a priority value (1-100) to control conflict resolution order",
				});
			}
		}
	}

	return issues;
}

/**
 * Generate general warnings about zone configuration
 */
export function generateWarnings(
	zones: ZoneData[],
	options: ValidationOptions,
): ZoneWarning[] {
	const warnings: ZoneWarning[] = [];
	const activeZones = zones.filter((z) => z.isActive);

	// Warning if no zones configured
	if (activeZones.length === 0) {
		warnings.push({
			severity: "WARNING",
			type: "NO_ZONES",
			message: "No active pricing zones configured",
			suggestion: "Create at least one pricing zone to enable zone-based pricing",
		});
	}

	// Warning about coverage gaps (informational only without bounding box)
	if (options.checkCoverageGaps && !options.boundingBox) {
		warnings.push({
			severity: "INFO",
			type: "COVERAGE_CHECK_LIMITED",
			message:
				"Full coverage gap detection requires a reference bounding box",
			suggestion:
				"Configure an operating region bounding box in organization settings for complete gap analysis",
		});
	}

	// Warning if many zones have default multiplier
	const defaultMultiplierZones = activeZones.filter(
		(z) => z.priceMultiplier === undefined || z.priceMultiplier === 1.0,
	);
	if (
		defaultMultiplierZones.length > 0 &&
		defaultMultiplierZones.length === activeZones.length
	) {
		warnings.push({
			severity: "INFO",
			type: "ALL_DEFAULT_MULTIPLIERS",
			message: "All zones use the default price multiplier (1.0×)",
			suggestion:
				"Consider setting different multipliers for zones to reflect pricing variations",
		});
	}

	return warnings;
}

/**
 * Main validation function
 * Validates zone topology and returns comprehensive results
 */
export function validateZoneTopology(
	zones: ZoneData[],
	options: ValidationOptions,
	conflictStrategy?: string | null,
): ZoneValidationResult {
	const activeZones = zones.filter((z) => z.isActive);

	// Detect overlaps
	const overlaps = detectZoneOverlaps(zones, options.conflictStrategyConfigured);

	// Detect missing fields
	const missingFields = detectMissingFields(
		zones,
		options.conflictStrategyConfigured,
		conflictStrategy,
	);

	// Generate warnings
	const warnings = generateWarnings(zones, options);

	// Calculate summary
	const hasErrors = missingFields.some((f) => f.severity === "ERROR");
	const hasWarnings =
		overlaps.some((o) => o.severity === "WARNING") ||
		missingFields.some((f) => f.severity === "WARNING") ||
		warnings.some((w) => w.severity === "WARNING");

	return {
		isValid: !hasErrors,
		summary: {
			totalZones: zones.length,
			activeZones: activeZones.length,
			overlapsCount: overlaps.length,
			missingFieldsCount: missingFields.length,
			warningsCount: warnings.filter((w) => w.severity === "WARNING").length,
		},
		overlaps,
		missingFields,
		warnings,
	};
}
