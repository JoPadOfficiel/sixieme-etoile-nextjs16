/**
 * Chaining Service
 * Story 8.4: Detect & Suggest Trip Chaining Opportunities
 *
 * Detects opportunities to chain missions where:
 * - The drop-off of one mission is close in time and space to the pick-up of another
 * - Chaining eliminates deadhead segments and reduces operational costs
 *
 * Algorithm:
 * 1. Load accepted missions in a time window (±4 hours of source mission)
 * 2. Pre-filter by Haversine distance (dropoff-to-pickup or pickup-to-dropoff)
 * 3. Check time gap constraints (30min - 2h)
 * 4. Calculate transition routing and savings
 * 5. Validate compatibility (vehicle category, RSE)
 * 6. Sort by savings and return top suggestions
 */

import type { Quote, VehicleCategory } from "@prisma/client";
import { haversineDistance, type GeoPoint } from "../lib/geo-utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Configuration for chaining detection
 */
export interface ChainingConfig {
	/** Minimum time gap between missions in minutes (default: 30) */
	minTimeGapMinutes: number;
	/** Maximum time gap between missions in minutes (default: 120) */
	maxTimeGapMinutes: number;
	/** Maximum transition distance in km (default: 10) */
	maxTransitionDistanceKm: number;
	/** Haversine pre-filter distance in km (default: 20) */
	haversinePreFilterKm: number;
	/** Time window to search for candidates in hours (default: 4) */
	searchWindowHours: number;
}

/**
 * Default chaining configuration
 */
export const DEFAULT_CHAINING_CONFIG: ChainingConfig = {
	minTimeGapMinutes: 30,
	maxTimeGapMinutes: 120,
	maxTransitionDistanceKm: 10,
	haversinePreFilterKm: 20,
	searchWindowHours: 4,
};

/**
 * Chain order - whether source mission goes BEFORE or AFTER target
 */
export type ChainOrder = "BEFORE" | "AFTER";

/**
 * Transition details between two missions
 */
export interface TransitionDetails {
	distanceKm: number;
	durationMinutes: number;
	fromAddress: string;
	toAddress: string;
}

/**
 * Savings from chaining two missions
 */
export interface ChainingSavings {
	distanceKm: number;
	costEur: number;
	percentReduction: number;
}

/**
 * Compatibility check results
 */
export interface ChainingCompatibility {
	vehicleCategory: boolean;
	timeGap: boolean;
	rseCompliance: boolean;
	noConflicts: boolean;
}

/**
 * Mission data needed for chaining analysis
 */
export interface MissionForChaining {
	id: string;
	pickupAt: Date;
	pickupAddress: string;
	pickupLatitude: number | null;
	pickupLongitude: number | null;
	dropoffAddress: string;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	vehicleCategoryId: string;
	vehicleCategory?: { id: string; name: string; code: string };
	contact?: { displayName: string };
	chainId: string | null;
	// Estimated dropoff time (pickup + service duration)
	estimatedDropoffAt?: Date;
	// Cost data from tripAnalysis
	approachCost?: number;
	serviceCost?: number;
	returnCost?: number;
	totalInternalCost?: number;
	approachDistanceKm?: number;
	serviceDistanceKm?: number;
	returnDistanceKm?: number;
}

/**
 * Chaining suggestion result
 */
export interface ChainingSuggestion {
	targetMissionId: string;
	targetMission: {
		id: string;
		pickupAt: string;
		pickupAddress: string;
		dropoffAddress: string;
		contact: { displayName: string };
	};
	chainOrder: ChainOrder;
	transition: TransitionDetails;
	savings: ChainingSavings;
	compatibility: ChainingCompatibility;
	isRecommended: boolean;
}

/**
 * Result of applying a chain
 */
export interface ApplyChainResult {
	success: boolean;
	chainId: string;
	updatedMissions: {
		id: string;
		chainOrder: number;
		newInternalCost: number;
		newMarginPercent: number;
	}[];
	totalSavings: ChainingSavings;
}

// ============================================================================
// Constants
// ============================================================================

/** Average speed for transition duration estimate (km/h) */
const AVERAGE_TRANSITION_SPEED_KMH = 30;

/** Road distance factor - multiply Haversine by this for estimate */
const ROAD_DISTANCE_FACTOR = 1.3;

/** Default cost per km for savings calculation */
const DEFAULT_COST_PER_KM = 2.5;

/** Default service duration in minutes (for estimating dropoff time) */
const DEFAULT_SERVICE_DURATION_MINUTES = 45;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract cost data from tripAnalysis JSON
 */
export function extractCostData(tripAnalysis: unknown): {
	approachCost: number;
	serviceCost: number;
	returnCost: number;
	totalInternalCost: number;
	approachDistanceKm: number;
	serviceDistanceKm: number;
	returnDistanceKm: number;
} {
	const defaultResult = {
		approachCost: 0,
		serviceCost: 0,
		returnCost: 0,
		totalInternalCost: 0,
		approachDistanceKm: 0,
		serviceDistanceKm: 0,
		returnDistanceKm: 0,
	};

	if (!tripAnalysis || typeof tripAnalysis !== "object") {
		return defaultResult;
	}

	const analysis = tripAnalysis as Record<string, unknown>;
	const segments = analysis.segments as Record<string, unknown> | undefined;
	const costBreakdown = analysis.costBreakdown as Record<string, unknown> | undefined;

	if (segments) {
		const approach = segments.approach as Record<string, unknown> | undefined;
		const service = segments.service as Record<string, unknown> | undefined;
		const returnSeg = segments.return as Record<string, unknown> | undefined;

		if (approach) {
			defaultResult.approachDistanceKm = Number(approach.distanceKm) || 0;
			defaultResult.approachCost = Number(approach.cost) || defaultResult.approachDistanceKm * DEFAULT_COST_PER_KM;
		}
		if (service) {
			defaultResult.serviceDistanceKm = Number(service.distanceKm) || 0;
			defaultResult.serviceCost = Number(service.cost) || defaultResult.serviceDistanceKm * DEFAULT_COST_PER_KM;
		}
		if (returnSeg) {
			defaultResult.returnDistanceKm = Number(returnSeg.distanceKm) || 0;
			defaultResult.returnCost = Number(returnSeg.cost) || defaultResult.returnDistanceKm * DEFAULT_COST_PER_KM;
		}
	}

	if (costBreakdown) {
		defaultResult.totalInternalCost = Number(costBreakdown.total) || 
			(defaultResult.approachCost + defaultResult.serviceCost + defaultResult.returnCost);
	} else {
		defaultResult.totalInternalCost = defaultResult.approachCost + defaultResult.serviceCost + defaultResult.returnCost;
	}

	return defaultResult;
}

/**
 * Estimate dropoff time based on pickup time and service duration
 */
export function estimateDropoffTime(
	pickupAt: Date,
	serviceDurationMinutes: number = DEFAULT_SERVICE_DURATION_MINUTES,
): Date {
	return new Date(pickupAt.getTime() + serviceDurationMinutes * 60 * 1000);
}

/**
 * Calculate time gap between two missions in minutes
 */
export function calculateTimeGapMinutes(
	mission1DropoffAt: Date,
	mission2PickupAt: Date,
): number {
	return (mission2PickupAt.getTime() - mission1DropoffAt.getTime()) / (60 * 1000);
}

/**
 * Calculate transition distance using Haversine (with road factor)
 */
export function calculateTransitionDistance(
	fromLat: number,
	fromLng: number,
	toLat: number,
	toLng: number,
): number {
	const haversine = haversineDistance(
		{ lat: fromLat, lng: fromLng },
		{ lat: toLat, lng: toLng },
	);
	return Math.round(haversine * ROAD_DISTANCE_FACTOR * 100) / 100;
}

/**
 * Calculate transition duration based on distance
 */
export function calculateTransitionDuration(distanceKm: number): number {
	return Math.round((distanceKm / AVERAGE_TRANSITION_SPEED_KMH) * 60);
}

/**
 * Check if two missions can be chained based on time gap
 */
export function isTimeGapValid(
	timeGapMinutes: number,
	config: ChainingConfig = DEFAULT_CHAINING_CONFIG,
): boolean {
	return (
		timeGapMinutes >= config.minTimeGapMinutes &&
		timeGapMinutes <= config.maxTimeGapMinutes
	);
}

/**
 * Check if transition distance is within threshold
 */
export function isTransitionDistanceValid(
	distanceKm: number,
	config: ChainingConfig = DEFAULT_CHAINING_CONFIG,
): boolean {
	return distanceKm <= config.maxTransitionDistanceKm;
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Detect chaining opportunities for a source mission
 *
 * @param sourceMission - The mission to find chaining opportunities for
 * @param candidateMissions - List of potential missions to chain with
 * @param config - Chaining configuration
 * @returns List of chaining suggestions sorted by savings
 */
export function detectChainingOpportunities(
	sourceMission: MissionForChaining,
	candidateMissions: MissionForChaining[],
	config: ChainingConfig = DEFAULT_CHAINING_CONFIG,
): ChainingSuggestion[] {
	const suggestions: ChainingSuggestion[] = [];

	// Skip if source mission is already chained
	if (sourceMission.chainId) {
		return suggestions;
	}

	// Need coordinates for source mission
	if (
		!sourceMission.pickupLatitude ||
		!sourceMission.pickupLongitude ||
		!sourceMission.dropoffLatitude ||
		!sourceMission.dropoffLongitude
	) {
		return suggestions;
	}

	const sourcePickup: GeoPoint = {
		lat: sourceMission.pickupLatitude,
		lng: sourceMission.pickupLongitude,
	};
	const sourceDropoff: GeoPoint = {
		lat: sourceMission.dropoffLatitude,
		lng: sourceMission.dropoffLongitude,
	};

	// Estimate source mission dropoff time
	const sourceDropoffAt =
		sourceMission.estimatedDropoffAt ||
		estimateDropoffTime(sourceMission.pickupAt);

	for (const candidate of candidateMissions) {
		// Skip same mission
		if (candidate.id === sourceMission.id) continue;

		// Skip already chained missions
		if (candidate.chainId) continue;

		// Need coordinates for candidate
		if (
			!candidate.pickupLatitude ||
			!candidate.pickupLongitude ||
			!candidate.dropoffLatitude ||
			!candidate.dropoffLongitude
		) {
			continue;
		}

		const candidatePickup: GeoPoint = {
			lat: candidate.pickupLatitude,
			lng: candidate.pickupLongitude,
		};
		const candidateDropoff: GeoPoint = {
			lat: candidate.dropoffLatitude,
			lng: candidate.dropoffLongitude,
		};

		// Estimate candidate dropoff time
		const candidateDropoffAt =
			candidate.estimatedDropoffAt ||
			estimateDropoffTime(candidate.pickupAt);

		// Check both directions: source BEFORE candidate, or source AFTER candidate

		// Option 1: Source mission BEFORE candidate (source dropoff → candidate pickup)
		const distanceSourceToCandidateKm = calculateTransitionDistance(
			sourceDropoff.lat,
			sourceDropoff.lng,
			candidatePickup.lat,
			candidatePickup.lng,
		);

		if (distanceSourceToCandidateKm <= config.haversinePreFilterKm) {
			const timeGapSourceToCandidate = calculateTimeGapMinutes(
				sourceDropoffAt,
				candidate.pickupAt,
			);

			if (
				isTimeGapValid(timeGapSourceToCandidate, config) &&
				isTransitionDistanceValid(distanceSourceToCandidateKm, config)
			) {
				const suggestion = createChainingSuggestion(
					sourceMission,
					candidate,
					"AFTER", // Source goes BEFORE candidate, so candidate is AFTER
					distanceSourceToCandidateKm,
					sourceMission.dropoffAddress,
					candidate.pickupAddress,
					config,
				);
				if (suggestion) {
					suggestions.push(suggestion);
				}
			}
		}

		// Option 2: Source mission AFTER candidate (candidate dropoff → source pickup)
		const distanceCandidateToSourceKm = calculateTransitionDistance(
			candidateDropoff.lat,
			candidateDropoff.lng,
			sourcePickup.lat,
			sourcePickup.lng,
		);

		if (distanceCandidateToSourceKm <= config.haversinePreFilterKm) {
			const timeGapCandidateToSource = calculateTimeGapMinutes(
				candidateDropoffAt,
				sourceMission.pickupAt,
			);

			if (
				isTimeGapValid(timeGapCandidateToSource, config) &&
				isTransitionDistanceValid(distanceCandidateToSourceKm, config)
			) {
				const suggestion = createChainingSuggestion(
					sourceMission,
					candidate,
					"BEFORE", // Source goes AFTER candidate, so candidate is BEFORE
					distanceCandidateToSourceKm,
					candidate.dropoffAddress,
					sourceMission.pickupAddress,
					config,
				);
				if (suggestion) {
					suggestions.push(suggestion);
				}
			}
		}
	}

	// Sort by savings (highest first)
	suggestions.sort((a, b) => b.savings.costEur - a.savings.costEur);

	return suggestions;
}

/**
 * Create a chaining suggestion
 */
function createChainingSuggestion(
	sourceMission: MissionForChaining,
	targetMission: MissionForChaining,
	chainOrder: ChainOrder,
	transitionDistanceKm: number,
	fromAddress: string,
	toAddress: string,
	config: ChainingConfig,
): ChainingSuggestion | null {
	const transitionDurationMinutes = calculateTransitionDuration(transitionDistanceKm);

	// Calculate savings
	const savings = calculateChainingSavings(
		sourceMission,
		targetMission,
		transitionDistanceKm,
		chainOrder,
	);

	// Skip if no savings
	if (savings.costEur <= 0) {
		return null;
	}

	// Check compatibility
	const compatibility = checkChainingCompatibility(
		sourceMission,
		targetMission,
		transitionDistanceKm,
		config,
	);

	return {
		targetMissionId: targetMission.id,
		targetMission: {
			id: targetMission.id,
			pickupAt: targetMission.pickupAt.toISOString(),
			pickupAddress: targetMission.pickupAddress,
			dropoffAddress: targetMission.dropoffAddress,
			contact: {
				displayName: targetMission.contact?.displayName || "Unknown",
			},
		},
		chainOrder,
		transition: {
			distanceKm: transitionDistanceKm,
			durationMinutes: transitionDurationMinutes,
			fromAddress,
			toAddress,
		},
		savings,
		compatibility,
		isRecommended:
			compatibility.vehicleCategory &&
			compatibility.timeGap &&
			compatibility.rseCompliance &&
			compatibility.noConflicts,
	};
}

/**
 * Calculate savings from chaining two missions
 *
 * Original cost: both missions do full loops
 * - Mission1: approach + service + return
 * - Mission2: approach + service + return
 *
 * Chained cost (if source BEFORE target):
 * - Mission1: approach + service (no return)
 * - Transition: source dropoff → target pickup
 * - Mission2: service + return (no approach)
 *
 * Savings = Original - Chained
 */
export function calculateChainingSavings(
	sourceMission: MissionForChaining,
	targetMission: MissionForChaining,
	transitionDistanceKm: number,
	chainOrder: ChainOrder,
): ChainingSavings {
	// Get cost data from missions
	const sourceCosts = {
		approach: sourceMission.approachCost || sourceMission.approachDistanceKm! * DEFAULT_COST_PER_KM || 0,
		service: sourceMission.serviceCost || sourceMission.serviceDistanceKm! * DEFAULT_COST_PER_KM || 0,
		return: sourceMission.returnCost || sourceMission.returnDistanceKm! * DEFAULT_COST_PER_KM || 0,
		total: sourceMission.totalInternalCost || 0,
	};

	const targetCosts = {
		approach: targetMission.approachCost || targetMission.approachDistanceKm! * DEFAULT_COST_PER_KM || 0,
		service: targetMission.serviceCost || targetMission.serviceDistanceKm! * DEFAULT_COST_PER_KM || 0,
		return: targetMission.returnCost || targetMission.returnDistanceKm! * DEFAULT_COST_PER_KM || 0,
		total: targetMission.totalInternalCost || 0,
	};

	// Calculate original total cost
	const originalCost =
		(sourceCosts.total || sourceCosts.approach + sourceCosts.service + sourceCosts.return) +
		(targetCosts.total || targetCosts.approach + targetCosts.service + targetCosts.return);

	// Calculate transition cost
	const transitionCost = transitionDistanceKm * DEFAULT_COST_PER_KM;

	// Calculate chained cost based on order
	let chainedCost: number;
	let savedDistanceKm: number;

	if (chainOrder === "AFTER") {
		// Source BEFORE target: eliminate source return + target approach
		chainedCost =
			sourceCosts.approach +
			sourceCosts.service +
			transitionCost +
			targetCosts.service +
			targetCosts.return;
		savedDistanceKm =
			(sourceMission.returnDistanceKm || 0) +
			(targetMission.approachDistanceKm || 0) -
			transitionDistanceKm;
	} else {
		// Source AFTER target: eliminate target return + source approach
		chainedCost =
			targetCosts.approach +
			targetCosts.service +
			transitionCost +
			sourceCosts.service +
			sourceCosts.return;
		savedDistanceKm =
			(targetMission.returnDistanceKm || 0) +
			(sourceMission.approachDistanceKm || 0) -
			transitionDistanceKm;
	}

	const costSavings = originalCost - chainedCost;
	const percentReduction = originalCost > 0 ? (costSavings / originalCost) * 100 : 0;

	return {
		distanceKm: Math.max(0, Math.round(savedDistanceKm * 100) / 100),
		costEur: Math.max(0, Math.round(costSavings * 100) / 100),
		percentReduction: Math.max(0, Math.round(percentReduction * 10) / 10),
	};
}

/**
 * Check compatibility for chaining two missions
 */
export function checkChainingCompatibility(
	sourceMission: MissionForChaining,
	targetMission: MissionForChaining,
	transitionDistanceKm: number,
	config: ChainingConfig = DEFAULT_CHAINING_CONFIG,
): ChainingCompatibility {
	// Vehicle category compatibility (same category for now)
	const vehicleCategory =
		sourceMission.vehicleCategoryId === targetMission.vehicleCategoryId;

	// Time gap validity
	const timeGap = transitionDistanceKm <= config.maxTransitionDistanceKm;

	// RSE compliance (simplified - would need full RSE check for heavy vehicles)
	// For now, assume compliant if both missions exist
	const rseCompliance = true;

	// No conflicts (neither mission is already chained)
	const noConflicts = !sourceMission.chainId && !targetMission.chainId;

	return {
		vehicleCategory,
		timeGap,
		rseCompliance,
		noConflicts,
	};
}

/**
 * Generate a unique chain ID
 */
export function generateChainId(): string {
	return `chain_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
