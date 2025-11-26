/**
 * Vehicle Selection Service
 * Story 4.5: Multi-Base Candidate Selection & Pre-Filter
 * 
 * Implements the multi-base vehicle selection algorithm:
 * 1. Filter by capacity and status
 * 2. Haversine pre-filter to eliminate distant bases
 * 3. Google Distance Matrix for precise routing (top N candidates)
 * 4. Select optimal vehicle/base by minimal internal cost
 * 
 * Designed to be reusable by Epic 8 (Dispatch)
 */

import type { GeoPoint } from "../lib/geo-utils";
import { haversineDistance } from "../lib/geo-utils";
import { calculateCostBreakdown, type OrganizationPricingSettings } from "./pricing-engine";

// ============================================================================
// Types
// ============================================================================

/**
 * Vehicle candidate from database
 */
export interface VehicleCandidate {
	vehicleId: string;
	vehicleName: string;
	vehicleCategoryId: string;
	regulatoryCategory: "LIGHT" | "HEAVY";
	baseId: string;
	baseName: string;
	baseLocation: GeoPoint;
	passengerCapacity: number;
	luggageCapacity: number | null;
	consumptionLPer100Km: number | null;
	costPerKm: number | null;
	averageSpeedKmh: number | null;
	status: "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE";
}

/**
 * Candidate with Haversine distance calculated
 */
export interface CandidateWithDistance extends VehicleCandidate {
	haversineDistanceKm: number;
	isWithinThreshold: boolean;
}

/**
 * Candidate with full routing information
 */
export interface CandidateWithRouting extends CandidateWithDistance {
	// Approach segment: Base → Pickup
	approachDistanceKm: number;
	approachDurationMinutes: number;
	// Service segment: Pickup → Dropoff
	serviceDistanceKm: number;
	serviceDurationMinutes: number;
	// Return segment: Dropoff → Base
	returnDistanceKm: number;
	returnDurationMinutes: number;
	// Totals
	totalDistanceKm: number;
	totalDurationMinutes: number;
	// Cost
	internalCost: number;
	// Routing source
	routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
}

/**
 * Selection criteria
 */
export type SelectionCriterion = "MINIMAL_COST" | "BEST_MARGIN";

/**
 * Result of vehicle selection
 */
export interface VehicleSelectionResult {
	selectedCandidate: CandidateWithRouting | null;
	candidatesConsidered: number;
	candidatesAfterCapacityFilter: number;
	candidatesAfterHaversineFilter: number;
	candidatesWithRouting: number;
	selectionCriterion: SelectionCriterion;
	fallbackUsed: boolean;
	fallbackReason?: string;
	allCandidates?: CandidateWithRouting[];
}

/**
 * Input for vehicle selection
 */
export interface VehicleSelectionInput {
	organizationId: string;
	pickup: GeoPoint;
	dropoff: GeoPoint;
	passengerCount: number;
	luggageCount?: number;
	vehicleCategoryId?: string;
	haversineThresholdKm?: number;
	maxCandidatesForRouting?: number;
	selectionCriterion?: SelectionCriterion;
	includeAllCandidates?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

/** Default Haversine threshold in km - bases beyond this are eliminated */
export const DEFAULT_HAVERSINE_THRESHOLD_KM = 100;

/** Default max candidates to send to routing API */
export const DEFAULT_MAX_CANDIDATES_FOR_ROUTING = 5;

/** Road distance factor - multiply Haversine by this for estimate */
export const ROAD_DISTANCE_FACTOR = 1.3;

/** Average speed for duration estimate when no API (km/h) */
export const DEFAULT_AVERAGE_SPEED_KMH = 50;

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Filter vehicles by capacity requirements
 * AC1: Capacity-Compatible Vehicle Filtering
 */
export function filterByCapacity(
	vehicles: VehicleCandidate[],
	passengerCount: number,
	luggageCount?: number,
	vehicleCategoryId?: string,
): VehicleCandidate[] {
	return vehicles.filter((vehicle) => {
		// Check passenger capacity
		if (vehicle.passengerCapacity < passengerCount) {
			return false;
		}

		// Check luggage capacity if specified
		if (luggageCount !== undefined && luggageCount > 0) {
			if (vehicle.luggageCapacity === null || vehicle.luggageCapacity < luggageCount) {
				return false;
			}
		}

		// Check vehicle category if specified
		if (vehicleCategoryId && vehicle.vehicleCategoryId !== vehicleCategoryId) {
			return false;
		}

		return true;
	});
}

/**
 * Filter vehicles by status - only ACTIVE vehicles are eligible
 * AC9: Active Vehicle Status Filter
 */
export function filterByStatus(vehicles: VehicleCandidate[]): VehicleCandidate[] {
	return vehicles.filter((vehicle) => vehicle.status === "ACTIVE");
}

/**
 * Calculate Haversine distance and filter by threshold
 * AC2: Haversine Pre-Filter
 */
export function filterByHaversineDistance(
	vehicles: VehicleCandidate[],
	pickup: GeoPoint,
	thresholdKm: number = DEFAULT_HAVERSINE_THRESHOLD_KM,
): CandidateWithDistance[] {
	return vehicles
		.map((vehicle) => {
			const distance = haversineDistance(vehicle.baseLocation, pickup);
			return {
				...vehicle,
				haversineDistanceKm: Math.round(distance * 100) / 100,
				isWithinThreshold: distance <= thresholdKm,
			};
		})
		.filter((candidate) => candidate.isWithinThreshold)
		.sort((a, b) => a.haversineDistanceKm - b.haversineDistanceKm);
}

/**
 * Get top N candidates by Haversine distance
 * AC3: Routing API for Remaining Candidates (limit)
 */
export function getTopCandidates(
	candidates: CandidateWithDistance[],
	maxCandidates: number = DEFAULT_MAX_CANDIDATES_FOR_ROUTING,
): CandidateWithDistance[] {
	// Already sorted by filterByHaversineDistance
	return candidates.slice(0, maxCandidates);
}

// ============================================================================
// Routing Functions
// ============================================================================

/**
 * Google Distance Matrix API response types
 */
interface DistanceMatrixElement {
	distance: { value: number; text: string };
	duration: { value: number; text: string };
	status: string;
}

interface DistanceMatrixRow {
	elements: DistanceMatrixElement[];
}

interface DistanceMatrixResponse {
	rows: DistanceMatrixRow[];
	status: string;
}

/**
 * Call Google Distance Matrix API for a single origin-destination pair
 */
async function callGoogleDistanceMatrix(
	origin: GeoPoint,
	destination: GeoPoint,
	apiKey: string,
): Promise<{ distanceKm: number; durationMinutes: number } | null> {
	try {
		const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
		url.searchParams.set("origins", `${origin.lat},${origin.lng}`);
		url.searchParams.set("destinations", `${destination.lat},${destination.lng}`);
		url.searchParams.set("mode", "driving");
		url.searchParams.set("key", apiKey);

		const response = await fetch(url.toString());
		if (!response.ok) {
			console.error(`Google Distance Matrix API error: ${response.status}`);
			return null;
		}

		const data = (await response.json()) as DistanceMatrixResponse;
		if (data.status !== "OK" || !data.rows?.[0]?.elements?.[0]) {
			console.error(`Google Distance Matrix API status: ${data.status}`);
			return null;
		}

		const element = data.rows[0].elements[0];
		if (element.status !== "OK") {
			console.error(`Google Distance Matrix element status: ${element.status}`);
			return null;
		}

		return {
			distanceKm: element.distance.value / 1000,
			durationMinutes: element.duration.value / 60,
		};
	} catch (error) {
		console.error("Google Distance Matrix API call failed:", error);
		return null;
	}
}

/**
 * Estimate routing using Haversine distance (fallback when no API)
 */
export function estimateRoutingFromHaversine(
	origin: GeoPoint,
	destination: GeoPoint,
	averageSpeedKmh: number = DEFAULT_AVERAGE_SPEED_KMH,
): { distanceKm: number; durationMinutes: number } {
	const haversine = haversineDistance(origin, destination);
	const roadDistance = haversine * ROAD_DISTANCE_FACTOR;
	const durationHours = roadDistance / averageSpeedKmh;

	return {
		distanceKm: Math.round(roadDistance * 100) / 100,
		durationMinutes: Math.round(durationHours * 60 * 100) / 100,
	};
}

/**
 * Get routing for all three segments (approach, service, return)
 * AC3, AC5, AC6: Routing for segments
 */
export async function getRoutingForCandidate(
	candidate: CandidateWithDistance,
	pickup: GeoPoint,
	dropoff: GeoPoint,
	pricingSettings: OrganizationPricingSettings,
	googleMapsApiKey?: string,
): Promise<CandidateWithRouting> {
	let routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE" = "HAVERSINE_ESTIMATE";
	let approach: { distanceKm: number; durationMinutes: number };
	let service: { distanceKm: number; durationMinutes: number };
	let returnSeg: { distanceKm: number; durationMinutes: number };

	const averageSpeed = candidate.averageSpeedKmh ?? DEFAULT_AVERAGE_SPEED_KMH;

	if (googleMapsApiKey) {
		// Try Google Distance Matrix API
		const [approachResult, serviceResult, returnResult] = await Promise.all([
			callGoogleDistanceMatrix(candidate.baseLocation, pickup, googleMapsApiKey),
			callGoogleDistanceMatrix(pickup, dropoff, googleMapsApiKey),
			callGoogleDistanceMatrix(dropoff, candidate.baseLocation, googleMapsApiKey),
		]);

		if (approachResult && serviceResult && returnResult) {
			routingSource = "GOOGLE_API";
			approach = approachResult;
			service = serviceResult;
			returnSeg = returnResult;
		} else {
			// Fallback to Haversine estimate
			approach = estimateRoutingFromHaversine(candidate.baseLocation, pickup, averageSpeed);
			service = estimateRoutingFromHaversine(pickup, dropoff, averageSpeed);
			returnSeg = estimateRoutingFromHaversine(dropoff, candidate.baseLocation, averageSpeed);
		}
	} else {
		// No API key - use Haversine estimates
		approach = estimateRoutingFromHaversine(candidate.baseLocation, pickup, averageSpeed);
		service = estimateRoutingFromHaversine(pickup, dropoff, averageSpeed);
		returnSeg = estimateRoutingFromHaversine(dropoff, candidate.baseLocation, averageSpeed);
	}

	// Calculate totals
	const totalDistanceKm = approach.distanceKm + service.distanceKm + returnSeg.distanceKm;
	const totalDurationMinutes = approach.durationMinutes + service.durationMinutes + returnSeg.durationMinutes;

	// Calculate internal cost using the cost breakdown
	// Use vehicle-specific consumption if available, otherwise use settings
	const effectiveSettings: OrganizationPricingSettings = {
		...pricingSettings,
		fuelConsumptionL100km: candidate.consumptionLPer100Km ?? pricingSettings.fuelConsumptionL100km,
	};

	const costBreakdown = calculateCostBreakdown(
		totalDistanceKm,
		totalDurationMinutes,
		effectiveSettings,
	);

	return {
		...candidate,
		approachDistanceKm: Math.round(approach.distanceKm * 100) / 100,
		approachDurationMinutes: Math.round(approach.durationMinutes * 100) / 100,
		serviceDistanceKm: Math.round(service.distanceKm * 100) / 100,
		serviceDurationMinutes: Math.round(service.durationMinutes * 100) / 100,
		returnDistanceKm: Math.round(returnSeg.distanceKm * 100) / 100,
		returnDurationMinutes: Math.round(returnSeg.durationMinutes * 100) / 100,
		totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
		totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
		internalCost: costBreakdown.total,
		routingSource,
	};
}

/**
 * Get routing for multiple candidates
 */
export async function getRoutingForCandidates(
	candidates: CandidateWithDistance[],
	pickup: GeoPoint,
	dropoff: GeoPoint,
	pricingSettings: OrganizationPricingSettings,
	googleMapsApiKey?: string,
): Promise<CandidateWithRouting[]> {
	const results = await Promise.all(
		candidates.map((candidate) =>
			getRoutingForCandidate(candidate, pickup, dropoff, pricingSettings, googleMapsApiKey),
		),
	);
	return results;
}

// ============================================================================
// Selection Functions
// ============================================================================

/**
 * Select optimal candidate based on criterion
 * AC4: Optimal Base/Vehicle Selection
 */
export function selectOptimalCandidate(
	candidates: CandidateWithRouting[],
	criterion: SelectionCriterion = "MINIMAL_COST",
	_sellingPrice?: number, // For BEST_MARGIN criterion
): CandidateWithRouting | null {
	if (candidates.length === 0) {
		return null;
	}

	if (criterion === "MINIMAL_COST") {
		// Sort by internal cost ascending
		const sorted = [...candidates].sort((a, b) => a.internalCost - b.internalCost);
		return sorted[0];
	}

	// BEST_MARGIN: would need selling price to calculate margin
	// For now, fall back to minimal cost
	const sorted = [...candidates].sort((a, b) => a.internalCost - b.internalCost);
	return sorted[0];
}

// ============================================================================
// Main Selection Function
// ============================================================================

/**
 * Select optimal vehicle/base for a trip
 * Main entry point for vehicle selection
 */
export async function selectOptimalVehicle(
	input: VehicleSelectionInput,
	vehicles: VehicleCandidate[],
	pricingSettings: OrganizationPricingSettings,
	googleMapsApiKey?: string,
): Promise<VehicleSelectionResult> {
	const {
		pickup,
		dropoff,
		passengerCount,
		luggageCount,
		vehicleCategoryId,
		haversineThresholdKm = DEFAULT_HAVERSINE_THRESHOLD_KM,
		maxCandidatesForRouting = DEFAULT_MAX_CANDIDATES_FOR_ROUTING,
		selectionCriterion = "MINIMAL_COST",
		includeAllCandidates = false,
	} = input;

	const candidatesConsidered = vehicles.length;

	// AC8: Handle empty fleet
	if (vehicles.length === 0) {
		return {
			selectedCandidate: null,
			candidatesConsidered: 0,
			candidatesAfterCapacityFilter: 0,
			candidatesAfterHaversineFilter: 0,
			candidatesWithRouting: 0,
			selectionCriterion,
			fallbackUsed: true,
			fallbackReason: "NO_VEHICLES_IN_FLEET",
		};
	}

	// Step 1: Filter by status (AC9)
	const activeVehicles = filterByStatus(vehicles);
	if (activeVehicles.length === 0) {
		return {
			selectedCandidate: null,
			candidatesConsidered,
			candidatesAfterCapacityFilter: 0,
			candidatesAfterHaversineFilter: 0,
			candidatesWithRouting: 0,
			selectionCriterion,
			fallbackUsed: true,
			fallbackReason: "NO_ACTIVE_VEHICLES",
		};
	}

	// Step 2: Filter by capacity (AC1)
	const capacityFiltered = filterByCapacity(
		activeVehicles,
		passengerCount,
		luggageCount,
		vehicleCategoryId,
	);
	const candidatesAfterCapacityFilter = capacityFiltered.length;

	if (capacityFiltered.length === 0) {
		return {
			selectedCandidate: null,
			candidatesConsidered,
			candidatesAfterCapacityFilter: 0,
			candidatesAfterHaversineFilter: 0,
			candidatesWithRouting: 0,
			selectionCriterion,
			fallbackUsed: true,
			fallbackReason: "NO_VEHICLES_MATCH_CAPACITY",
		};
	}

	// Step 3: Filter by Haversine distance (AC2)
	const haversineFiltered = filterByHaversineDistance(
		capacityFiltered,
		pickup,
		haversineThresholdKm,
	);
	const candidatesAfterHaversineFilter = haversineFiltered.length;

	if (haversineFiltered.length === 0) {
		return {
			selectedCandidate: null,
			candidatesConsidered,
			candidatesAfterCapacityFilter,
			candidatesAfterHaversineFilter: 0,
			candidatesWithRouting: 0,
			selectionCriterion,
			fallbackUsed: true,
			fallbackReason: "ALL_BASES_TOO_FAR",
		};
	}

	// Step 4: Get top candidates for routing (AC3)
	const topCandidates = getTopCandidates(haversineFiltered, maxCandidatesForRouting);

	// Step 5: Get routing for candidates (AC5, AC6)
	const candidatesWithRouting = await getRoutingForCandidates(
		topCandidates,
		pickup,
		dropoff,
		pricingSettings,
		googleMapsApiKey,
	);

	// Step 6: Select optimal candidate (AC4)
	const selectedCandidate = selectOptimalCandidate(candidatesWithRouting, selectionCriterion);

	return {
		selectedCandidate,
		candidatesConsidered,
		candidatesAfterCapacityFilter,
		candidatesAfterHaversineFilter,
		candidatesWithRouting: candidatesWithRouting.length,
		selectionCriterion,
		fallbackUsed: false,
		allCandidates: includeAllCandidates ? candidatesWithRouting : undefined,
	};
}

// ============================================================================
// Database Loading Helper
// ============================================================================

/**
 * Transform database vehicle records to VehicleCandidate format
 */
export function transformVehicleToCandidate(
	vehicle: {
		id: string;
		internalName: string | null;
		registrationNumber: string;
		vehicleCategoryId: string;
		vehicleCategory: {
			regulatoryCategory: "LIGHT" | "HEAVY";
		};
		operatingBaseId: string;
		operatingBase: {
			id: string;
			name: string;
			latitude: number | { toNumber(): number };
			longitude: number | { toNumber(): number };
		};
		passengerCapacity: number;
		luggageCapacity: number | null;
		consumptionLPer100Km: number | { toNumber(): number } | null;
		costPerKm: number | { toNumber(): number } | null;
		averageSpeedKmh: number | null;
		status: "ACTIVE" | "MAINTENANCE" | "OUT_OF_SERVICE";
	},
): VehicleCandidate {
	// Handle Prisma Decimal type
	const toNumber = (val: number | { toNumber(): number } | null): number | null => {
		if (val === null) return null;
		if (typeof val === "number") return val;
		return val.toNumber();
	};

	return {
		vehicleId: vehicle.id,
		vehicleName: vehicle.internalName ?? vehicle.registrationNumber,
		vehicleCategoryId: vehicle.vehicleCategoryId,
		regulatoryCategory: vehicle.vehicleCategory.regulatoryCategory,
		baseId: vehicle.operatingBaseId,
		baseName: vehicle.operatingBase.name,
		baseLocation: {
			lat: typeof vehicle.operatingBase.latitude === "number" 
				? vehicle.operatingBase.latitude 
				: vehicle.operatingBase.latitude.toNumber(),
			lng: typeof vehicle.operatingBase.longitude === "number"
				? vehicle.operatingBase.longitude
				: vehicle.operatingBase.longitude.toNumber(),
		},
		passengerCapacity: vehicle.passengerCapacity,
		luggageCapacity: vehicle.luggageCapacity,
		consumptionLPer100Km: toNumber(vehicle.consumptionLPer100Km),
		costPerKm: toNumber(vehicle.costPerKm),
		averageSpeedKmh: vehicle.averageSpeedKmh,
		status: vehicle.status,
	};
}
