/**
 * Corridor Buffer Service
 * Story 18.1: Corridor Zone Type (Highway Buffers)
 *
 * Generates buffer polygons around polylines for corridor zones
 * Uses Turf.js for geospatial operations
 */

import * as turf from "@turf/turf";
import type { Feature, LineString, Polygon } from "geojson";
import { decodePolyline, calculatePolylineDistance } from "../lib/polyline-utils";
import type { GeoPoint, GeoPolygon } from "../lib/geo-utils";

/**
 * Corridor buffer configuration
 */
export interface CorridorBufferConfig {
	/** Buffer distance in meters (default: 500, range: 100-5000) */
	bufferMeters: number;
	/** Number of steps for buffer smoothness (default: 8) */
	steps?: number;
}

/**
 * Result of corridor buffer generation
 */
export interface CorridorBufferResult {
	/** The generated buffer polygon in GeoJSON format */
	geometry: GeoPolygon;
	/** Length of the corridor centerline in kilometers */
	lengthKm: number;
	/** Center point of the corridor (midpoint of polyline) */
	centerPoint: GeoPoint;
	/** Bounding box [minLng, minLat, maxLng, maxLat] */
	bbox: [number, number, number, number];
}

/**
 * Corridor intersection result
 */
export interface CorridorIntersection {
	/** Distance traveled within the corridor in km */
	distanceKm: number;
	/** Entry point into the corridor */
	entryPoint: GeoPoint;
	/** Exit point from the corridor */
	exitPoint: GeoPoint;
	/** Percentage of total route within corridor */
	percentageOfRoute: number;
}

/**
 * Validate corridor buffer configuration
 * @throws Error if configuration is invalid
 */
export function validateCorridorConfig(config: CorridorBufferConfig): void {
	if (config.bufferMeters < 100 || config.bufferMeters > 5000) {
		throw new Error("Buffer distance must be between 100m and 5000m");
	}
}

/**
 * Generate a buffer polygon around an encoded polyline
 *
 * @param encodedPolyline - Google encoded polyline string
 * @param config - Buffer configuration
 * @returns Buffer result with geometry and metadata
 * @throws Error if polyline is invalid or has fewer than 2 points
 */
export function generateCorridorBuffer(
	encodedPolyline: string,
	config: CorridorBufferConfig,
): CorridorBufferResult {
	validateCorridorConfig(config);

	// Decode the polyline
	const points = decodePolyline(encodedPolyline);

	if (points.length < 2) {
		throw new Error("Corridor must have at least 2 points");
	}

	// Convert to Turf LineString
	const coordinates = points.map((p) => [p.lng, p.lat]);
	const line = turf.lineString(coordinates);

	// Generate buffer (convert meters to kilometers for Turf)
	const bufferKm = config.bufferMeters / 1000;
	const buffered = turf.buffer(line, bufferKm, {
		units: "kilometers",
		steps: config.steps ?? 8,
	});

	if (!buffered || buffered.geometry.type !== "Polygon") {
		throw new Error("Failed to generate corridor buffer");
	}

	// Calculate corridor length
	const lengthKm = calculatePolylineDistance(points);

	// Find center point (midpoint of polyline)
	const midIndex = Math.floor(points.length / 2);
	const centerPoint = points[midIndex];

	// Calculate bounding box
	const bbox = turf.bbox(buffered) as [number, number, number, number];

	// Convert Turf polygon to our GeoPolygon format
	const geometry: GeoPolygon = {
		type: "Polygon",
		coordinates: buffered.geometry.coordinates as number[][][],
	};

	return {
		geometry,
		lengthKm,
		centerPoint,
		bbox,
	};
}

/**
 * Calculate the length of an encoded polyline in kilometers
 *
 * @param encodedPolyline - Google encoded polyline string
 * @returns Length in kilometers
 */
export function calculateCorridorLength(encodedPolyline: string): number {
	const points = decodePolyline(encodedPolyline);
	return calculatePolylineDistance(points);
}

/**
 * Check if a point is inside a corridor zone
 * Uses the pre-computed buffer geometry
 *
 * @param point - The point to check
 * @param corridorGeometry - The corridor buffer polygon
 * @returns True if point is inside the corridor
 */
export function isPointInCorridor(
	point: GeoPoint,
	corridorGeometry: GeoPolygon,
): boolean {
	const turfPoint = turf.point([point.lng, point.lat]);
	const turfPolygon = turf.polygon(corridorGeometry.coordinates);
	return turf.booleanPointInPolygon(turfPoint, turfPolygon);
}

/**
 * Get the intersection of a route polyline with a corridor zone
 * Returns the segments of the route that are within the corridor
 *
 * @param routePolyline - Encoded polyline of the route
 * @param corridorGeometry - The corridor buffer polygon
 * @param totalRouteDistanceKm - Total route distance for percentage calculation
 * @returns Intersection details or null if no intersection
 */
export function getCorridorIntersection(
	routePolyline: string,
	corridorGeometry: GeoPolygon,
	totalRouteDistanceKm: number,
): CorridorIntersection | null {
	const routePoints = decodePolyline(routePolyline);

	if (routePoints.length < 2) {
		return null;
	}

	const turfPolygon = turf.polygon(corridorGeometry.coordinates);

	// Track intersection segments
	let totalIntersectionDistance = 0;
	let entryPoint: GeoPoint | null = null;
	let exitPoint: GeoPoint | null = null;
	let currentlyInCorridor = false;
	let lastPoint = routePoints[0];
	let lastInCorridor = turf.booleanPointInPolygon(
		turf.point([lastPoint.lng, lastPoint.lat]),
		turfPolygon,
	);

	// If starting inside corridor, set entry point
	if (lastInCorridor) {
		entryPoint = lastPoint;
		currentlyInCorridor = true;
	}

	for (let i = 1; i < routePoints.length; i++) {
		const currentPoint = routePoints[i];
		const currentInCorridor = turf.booleanPointInPolygon(
			turf.point([currentPoint.lng, currentPoint.lat]),
			turfPolygon,
		);

		const segmentDistance = turf.distance(
			turf.point([lastPoint.lng, lastPoint.lat]),
			turf.point([currentPoint.lng, currentPoint.lat]),
			{ units: "kilometers" },
		);

		// Entering corridor
		if (!lastInCorridor && currentInCorridor) {
			// Find approximate entry point
			const crossingPoint = findCrossingPoint(
				lastPoint,
				currentPoint,
				turfPolygon,
				false,
			);
			if (!entryPoint) {
				entryPoint = crossingPoint;
			}
			currentlyInCorridor = true;

			// Add partial segment distance (from crossing to current)
			const entryDistance = turf.distance(
				turf.point([crossingPoint.lng, crossingPoint.lat]),
				turf.point([currentPoint.lng, currentPoint.lat]),
				{ units: "kilometers" },
			);
			totalIntersectionDistance += entryDistance;
		}
		// Exiting corridor
		else if (lastInCorridor && !currentInCorridor) {
			// Find approximate exit point
			const crossingPoint = findCrossingPoint(
				lastPoint,
				currentPoint,
				turfPolygon,
				true,
			);
			exitPoint = crossingPoint;
			currentlyInCorridor = false;

			// Add partial segment distance (from last to crossing)
			const exitDistance = turf.distance(
				turf.point([lastPoint.lng, lastPoint.lat]),
				turf.point([crossingPoint.lng, crossingPoint.lat]),
				{ units: "kilometers" },
			);
			totalIntersectionDistance += exitDistance;
		}
		// Fully inside corridor
		else if (lastInCorridor && currentInCorridor) {
			totalIntersectionDistance += segmentDistance;
		}

		lastPoint = currentPoint;
		lastInCorridor = currentInCorridor;
	}

	// If ending inside corridor, set exit point to last point
	if (currentlyInCorridor && !exitPoint) {
		exitPoint = routePoints[routePoints.length - 1];
	}

	// No intersection found
	if (!entryPoint || totalIntersectionDistance === 0) {
		return null;
	}

	return {
		distanceKm: totalIntersectionDistance,
		entryPoint,
		exitPoint: exitPoint || routePoints[routePoints.length - 1],
		percentageOfRoute:
			totalRouteDistanceKm > 0
				? (totalIntersectionDistance / totalRouteDistanceKm) * 100
				: 0,
	};
}

/**
 * Find the approximate crossing point between two points and a polygon boundary
 * Uses binary search for efficiency
 */
function findCrossingPoint(
	p1: GeoPoint,
	p2: GeoPoint,
	polygon: Feature<Polygon>,
	exitingPolygon: boolean,
): GeoPoint {
	let low = 0;
	let high = 1;
	const maxIterations = 15;

	for (let i = 0; i < maxIterations; i++) {
		const mid = (low + high) / 2;
		const midPoint: GeoPoint = {
			lat: p1.lat + (p2.lat - p1.lat) * mid,
			lng: p1.lng + (p2.lng - p1.lng) * mid,
		};

		const isInside = turf.booleanPointInPolygon(
			turf.point([midPoint.lng, midPoint.lat]),
			polygon,
		);

		if (exitingPolygon) {
			// Looking for exit: inside at low, outside at high
			if (isInside) {
				low = mid;
			} else {
				high = mid;
			}
		} else {
			// Looking for entry: outside at low, inside at high
			if (isInside) {
				high = mid;
			} else {
				low = mid;
			}
		}
	}

	const t = (low + high) / 2;
	return {
		lat: p1.lat + (p2.lat - p1.lat) * t,
		lng: p1.lng + (p2.lng - p1.lng) * t,
	};
}

/**
 * Get multiple corridor intersections for a route
 * Handles cases where a route enters and exits a corridor multiple times
 *
 * @param routePolyline - Encoded polyline of the route
 * @param corridorGeometry - The corridor buffer polygon
 * @param totalRouteDistanceKm - Total route distance for percentage calculation
 * @returns Array of intersection segments
 */
export function getCorridorIntersections(
	routePolyline: string,
	corridorGeometry: GeoPolygon,
	totalRouteDistanceKm: number,
): CorridorIntersection[] {
	const routePoints = decodePolyline(routePolyline);

	if (routePoints.length < 2) {
		return [];
	}

	const turfPolygon = turf.polygon(corridorGeometry.coordinates);
	const intersections: CorridorIntersection[] = [];

	let currentSegment: {
		entryPoint: GeoPoint;
		distance: number;
	} | null = null;

	let lastPoint = routePoints[0];
	let lastInCorridor = turf.booleanPointInPolygon(
		turf.point([lastPoint.lng, lastPoint.lat]),
		turfPolygon,
	);

	// If starting inside corridor
	if (lastInCorridor) {
		currentSegment = {
			entryPoint: lastPoint,
			distance: 0,
		};
	}

	for (let i = 1; i < routePoints.length; i++) {
		const currentPoint = routePoints[i];
		const currentInCorridor = turf.booleanPointInPolygon(
			turf.point([currentPoint.lng, currentPoint.lat]),
			turfPolygon,
		);

		const segmentDistance = turf.distance(
			turf.point([lastPoint.lng, lastPoint.lat]),
			turf.point([currentPoint.lng, currentPoint.lat]),
			{ units: "kilometers" },
		);

		// Entering corridor
		if (!lastInCorridor && currentInCorridor) {
			const crossingPoint = findCrossingPoint(
				lastPoint,
				currentPoint,
				turfPolygon,
				false,
			);
			const entryDistance = turf.distance(
				turf.point([crossingPoint.lng, crossingPoint.lat]),
				turf.point([currentPoint.lng, currentPoint.lat]),
				{ units: "kilometers" },
			);
			currentSegment = {
				entryPoint: crossingPoint,
				distance: entryDistance,
			};
		}
		// Exiting corridor
		else if (lastInCorridor && !currentInCorridor && currentSegment) {
			const crossingPoint = findCrossingPoint(
				lastPoint,
				currentPoint,
				turfPolygon,
				true,
			);
			const exitDistance = turf.distance(
				turf.point([lastPoint.lng, lastPoint.lat]),
				turf.point([crossingPoint.lng, crossingPoint.lat]),
				{ units: "kilometers" },
			);

			intersections.push({
				distanceKm: currentSegment.distance + exitDistance,
				entryPoint: currentSegment.entryPoint,
				exitPoint: crossingPoint,
				percentageOfRoute:
					totalRouteDistanceKm > 0
						? ((currentSegment.distance + exitDistance) / totalRouteDistanceKm) * 100
						: 0,
			});
			currentSegment = null;
		}
		// Fully inside corridor
		else if (lastInCorridor && currentInCorridor && currentSegment) {
			currentSegment.distance += segmentDistance;
		}

		lastPoint = currentPoint;
		lastInCorridor = currentInCorridor;
	}

	// If ending inside corridor
	if (currentSegment) {
		intersections.push({
			distanceKm: currentSegment.distance,
			entryPoint: currentSegment.entryPoint,
			exitPoint: routePoints[routePoints.length - 1],
			percentageOfRoute:
				totalRouteDistanceKm > 0
					? (currentSegment.distance / totalRouteDistanceKm) * 100
					: 0,
		});
	}

	return intersections;
}
