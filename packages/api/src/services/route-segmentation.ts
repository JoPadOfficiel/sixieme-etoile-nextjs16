/**
 * Route Segmentation Service
 * Story 17.13: Route Segmentation for Multi-Zone Trips
 * 
 * Segments a route polyline by pricing zones and calculates
 * distance/duration per zone for proportional pricing.
 */

import type { GeoPoint, ZoneData, ZoneConflictStrategy } from "../lib/geo-utils";
import { findZoneForPoint, isPointInZone } from "../lib/geo-utils";
import {
	decodePolyline,
	segmentDistance,
	simplifyPolyline,
	findZoneCrossingPoint,
} from "../lib/polyline-utils";

/**
 * Represents a segment of the route within a single zone
 */
export interface ZoneSegment {
	zoneId: string;
	zoneCode: string;
	zoneName: string;
	distanceKm: number;
	durationMinutes: number;
	priceMultiplier: number;
	surchargesApplied: number; // Sum of parking + access fees
	entryPoint: GeoPoint;
	exitPoint: GeoPoint;
}

/**
 * Result of route segmentation
 */
export interface RouteSegmentationResult {
	segments: ZoneSegment[];
	weightedMultiplier: number;
	totalSurcharges: number;
	zonesTraversed: string[]; // Zone codes in order of traversal
	totalDistanceKm: number;
	segmentationMethod: "POLYLINE" | "FALLBACK";
}

/**
 * Internal structure for tracking zone transitions
 */
interface ZoneTransition {
	zone: ZoneData | null;
	entryPoint: GeoPoint;
	distanceKm: number;
}

/**
 * Default zone data for points outside all zones
 */
const OUTSIDE_ZONE: Omit<ZoneData, "geometry"> = {
	id: "OUTSIDE",
	code: "OUTSIDE_ZONES",
	name: "Outside Defined Zones",
	zoneType: "POLYGON",
	centerLatitude: null,
	centerLongitude: null,
	radiusKm: null,
	isActive: true,
	priceMultiplier: 1.0,
	priority: 0,
	fixedParkingSurcharge: null,
	fixedAccessFee: null,
	surchargeDescription: null,
};

/**
 * Segment a route by pricing zones
 * 
 * @param polyline - Encoded polyline string from Google Routes API
 * @param zones - Array of pricing zones to match against
 * @param totalDurationMinutes - Total trip duration for proportional duration calculation
 * @param zoneConflictStrategy - Strategy for resolving zone conflicts (Story 17.1)
 * @returns Route segmentation result with per-zone breakdown
 */
export function segmentRouteByZones(
	polyline: string,
	zones: ZoneData[],
	totalDurationMinutes: number,
	zoneConflictStrategy?: ZoneConflictStrategy | null,
): RouteSegmentationResult {
	// Decode the polyline
	const rawPoints = decodePolyline(polyline);
	
	if (rawPoints.length < 2) {
		return createEmptyResult();
	}

	// Simplify polyline for performance (keep points at least 50m apart)
	const points = simplifyPolyline(rawPoints, 0.05);

	// Track zone transitions
	const transitions: ZoneTransition[] = [];
	let currentZone = findZoneForPoint(points[0], zones, zoneConflictStrategy);
	let currentTransition: ZoneTransition = {
		zone: currentZone,
		entryPoint: points[0],
		distanceKm: 0,
	};

	// Process each segment of the polyline
	for (let i = 0; i < points.length - 1; i++) {
		const p1 = points[i];
		const p2 = points[i + 1];
		const segDist = segmentDistance(p1, p2);
		
		const nextZone = findZoneForPoint(p2, zones, zoneConflictStrategy);
		const currentZoneId = currentZone?.id ?? "OUTSIDE";
		const nextZoneId = nextZone?.id ?? "OUTSIDE";

		if (currentZoneId !== nextZoneId) {
			// Zone transition detected - find the crossing point
			const crossingPoint = findZoneCrossingPoint(
				p1,
				p2,
				(point) => {
					const zone = findZoneForPoint(point, zones, zoneConflictStrategy);
					return (zone?.id ?? "OUTSIDE") === currentZoneId;
				},
			);

			// Add distance to current zone (up to crossing point)
			const distToCrossing = segmentDistance(p1, crossingPoint);
			currentTransition.distanceKm += distToCrossing;

			// Save current transition
			transitions.push({
				...currentTransition,
			});

			// Start new transition
			currentZone = nextZone;
			currentTransition = {
				zone: nextZone,
				entryPoint: crossingPoint,
				distanceKm: segmentDistance(crossingPoint, p2),
			};
		} else {
			// Same zone - accumulate distance
			currentTransition.distanceKm += segDist;
		}
	}

	// Don't forget the last transition
	transitions.push(currentTransition);

	// Calculate total distance for duration proportioning
	const totalDistanceKm = transitions.reduce((sum, t) => sum + t.distanceKm, 0);

	// Build zone segments
	const segments: ZoneSegment[] = [];
	const zonesTraversed: string[] = [];
	const surchargedZones = new Set<string>(); // Track zones that have had surcharges applied
	let totalSurcharges = 0;

	for (let i = 0; i < transitions.length; i++) {
		const transition = transitions[i];
		const zone = transition.zone;
		const zoneData = zone ?? (OUTSIDE_ZONE as unknown as ZoneData);

		// Calculate proportional duration
		const durationProportion = totalDistanceKm > 0 
			? transition.distanceKm / totalDistanceKm 
			: 1 / transitions.length;
		const durationMinutes = Math.round(totalDurationMinutes * durationProportion * 100) / 100;

		// Calculate surcharges (only once per zone)
		let segmentSurcharges = 0;
		if (zone && !surchargedZones.has(zone.id)) {
			const parkingSurcharge = zone.fixedParkingSurcharge ?? 0;
			const accessFee = zone.fixedAccessFee ?? 0;
			segmentSurcharges = parkingSurcharge + accessFee;
			totalSurcharges += segmentSurcharges;
			surchargedZones.add(zone.id);
		}

		// Determine exit point
		const exitPoint = i < transitions.length - 1
			? transitions[i + 1].entryPoint
			: points[points.length - 1];

		segments.push({
			zoneId: zoneData.id,
			zoneCode: zoneData.code,
			zoneName: zoneData.name,
			distanceKm: Math.round(transition.distanceKm * 1000) / 1000,
			durationMinutes,
			priceMultiplier: zoneData.priceMultiplier ?? 1.0,
			surchargesApplied: segmentSurcharges,
			entryPoint: transition.entryPoint,
			exitPoint,
		});

		// Track zone traversal order (unique codes only for display)
		if (!zonesTraversed.includes(zoneData.code)) {
			zonesTraversed.push(zoneData.code);
		}
	}

	// Calculate weighted multiplier
	const weightedMultiplier = calculateWeightedMultiplier(segments, totalDistanceKm);

	return {
		segments,
		weightedMultiplier,
		totalSurcharges,
		zonesTraversed,
		totalDistanceKm: Math.round(totalDistanceKm * 1000) / 1000,
		segmentationMethod: "POLYLINE",
	};
}

/**
 * Calculate weighted average multiplier based on distance in each zone
 * 
 * Formula: Σ(distance_i × multiplier_i) / total_distance
 * 
 * @param segments - Zone segments with distances and multipliers
 * @param totalDistanceKm - Total route distance
 * @returns Weighted average multiplier
 */
export function calculateWeightedMultiplier(
	segments: ZoneSegment[],
	totalDistanceKm: number,
): number {
	if (segments.length === 0 || totalDistanceKm <= 0) {
		return 1.0;
	}

	const weightedSum = segments.reduce(
		(sum, seg) => sum + seg.distanceKm * seg.priceMultiplier,
		0,
	);

	const weighted = weightedSum / totalDistanceKm;
	
	// Round to 3 decimal places
	return Math.round(weighted * 1000) / 1000;
}

/**
 * Create an empty result for invalid inputs
 */
function createEmptyResult(): RouteSegmentationResult {
	return {
		segments: [],
		weightedMultiplier: 1.0,
		totalSurcharges: 0,
		zonesTraversed: [],
		totalDistanceKm: 0,
		segmentationMethod: "FALLBACK",
	};
}

/**
 * Create a fallback result using pickup/dropoff zones only
 * Used when no polyline is available
 * 
 * @param pickupZone - Zone containing the pickup point
 * @param dropoffZone - Zone containing the dropoff point
 * @param totalDistanceKm - Estimated total distance
 * @param totalDurationMinutes - Estimated total duration
 * @returns Simplified segmentation result
 */
export function createFallbackSegmentation(
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	totalDistanceKm: number,
	totalDurationMinutes: number,
): RouteSegmentationResult {
	const segments: ZoneSegment[] = [];
	const zonesTraversed: string[] = [];
	let totalSurcharges = 0;

	// If same zone or one is null, create single segment
	if (!pickupZone && !dropoffZone) {
		return createEmptyResult();
	}

	const isSameZone = pickupZone?.id === dropoffZone?.id;

	if (isSameZone || !dropoffZone) {
		// Single zone segment
		const zone = pickupZone ?? (OUTSIDE_ZONE as unknown as ZoneData);
		const surcharges = (zone.fixedParkingSurcharge ?? 0) + (zone.fixedAccessFee ?? 0);
		totalSurcharges = surcharges;

		segments.push({
			zoneId: zone.id,
			zoneCode: zone.code,
			zoneName: zone.name,
			distanceKm: totalDistanceKm,
			durationMinutes: totalDurationMinutes,
			priceMultiplier: zone.priceMultiplier ?? 1.0,
			surchargesApplied: surcharges,
			entryPoint: { lat: 0, lng: 0 }, // Unknown without polyline
			exitPoint: { lat: 0, lng: 0 },
		});
		zonesTraversed.push(zone.code);
	} else if (!pickupZone) {
		// Only dropoff zone known
		const zone = dropoffZone;
		const surcharges = (zone.fixedParkingSurcharge ?? 0) + (zone.fixedAccessFee ?? 0);
		totalSurcharges = surcharges;

		segments.push({
			zoneId: zone.id,
			zoneCode: zone.code,
			zoneName: zone.name,
			distanceKm: totalDistanceKm,
			durationMinutes: totalDurationMinutes,
			priceMultiplier: zone.priceMultiplier ?? 1.0,
			surchargesApplied: surcharges,
			entryPoint: { lat: 0, lng: 0 },
			exitPoint: { lat: 0, lng: 0 },
		});
		zonesTraversed.push(zone.code);
	} else {
		// Two different zones - split 50/50 as estimate
		const halfDistance = totalDistanceKm / 2;
		const halfDuration = totalDurationMinutes / 2;

		// Pickup zone segment
		const pickupSurcharges = (pickupZone.fixedParkingSurcharge ?? 0) + (pickupZone.fixedAccessFee ?? 0);
		segments.push({
			zoneId: pickupZone.id,
			zoneCode: pickupZone.code,
			zoneName: pickupZone.name,
			distanceKm: halfDistance,
			durationMinutes: halfDuration,
			priceMultiplier: pickupZone.priceMultiplier ?? 1.0,
			surchargesApplied: pickupSurcharges,
			entryPoint: { lat: 0, lng: 0 },
			exitPoint: { lat: 0, lng: 0 },
		});
		zonesTraversed.push(pickupZone.code);
		totalSurcharges += pickupSurcharges;

		// Dropoff zone segment
		const dropoffSurcharges = (dropoffZone.fixedParkingSurcharge ?? 0) + (dropoffZone.fixedAccessFee ?? 0);
		segments.push({
			zoneId: dropoffZone.id,
			zoneCode: dropoffZone.code,
			zoneName: dropoffZone.name,
			distanceKm: halfDistance,
			durationMinutes: halfDuration,
			priceMultiplier: dropoffZone.priceMultiplier ?? 1.0,
			surchargesApplied: dropoffSurcharges,
			entryPoint: { lat: 0, lng: 0 },
			exitPoint: { lat: 0, lng: 0 },
		});
		zonesTraversed.push(dropoffZone.code);
		totalSurcharges += dropoffSurcharges;
	}

	const weightedMultiplier = calculateWeightedMultiplier(segments, totalDistanceKm);

	return {
		segments,
		weightedMultiplier,
		totalSurcharges,
		zonesTraversed,
		totalDistanceKm,
		segmentationMethod: "FALLBACK",
	};
}

/**
 * Build an applied rule for route segmentation transparency
 */
export function buildRouteSegmentationRule(
	result: RouteSegmentationResult,
	priceBefore: number,
	priceAfter: number,
): {
	type: "ROUTE_SEGMENTATION";
	description: string;
	segmentationMethod: "POLYLINE" | "FALLBACK";
	zonesTraversed: string[];
	segmentCount: number;
	weightedMultiplier: number;
	totalSurcharges: number;
	segments: Array<{
		zoneCode: string;
		zoneName: string;
		distanceKm: number;
		multiplier: number;
	}>;
	priceBefore: number;
	priceAfter: number;
} {
	const segmentSummary = result.segments.map((s) => ({
		zoneCode: s.zoneCode,
		zoneName: s.zoneName,
		distanceKm: s.distanceKm,
		multiplier: s.priceMultiplier,
	}));

	const description = result.segmentationMethod === "POLYLINE"
		? `Route segmented across ${result.segments.length} zone(s): ${result.zonesTraversed.join(" → ")}. Weighted multiplier: ${result.weightedMultiplier}×`
		: `Fallback segmentation (no polyline): ${result.zonesTraversed.join(" → ")}. Weighted multiplier: ${result.weightedMultiplier}×`;

	return {
		type: "ROUTE_SEGMENTATION",
		description,
		segmentationMethod: result.segmentationMethod,
		zonesTraversed: result.zonesTraversed,
		segmentCount: result.segments.length,
		weightedMultiplier: result.weightedMultiplier,
		totalSurcharges: result.totalSurcharges,
		segments: segmentSummary,
		priceBefore,
		priceAfter,
	};
}
