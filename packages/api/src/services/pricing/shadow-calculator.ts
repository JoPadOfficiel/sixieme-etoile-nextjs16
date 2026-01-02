/**
 * Shadow Calculator Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * 
 * This module handles shadow calculation (segments A/B/C):
 * - Segment A (Approach): Base → Pickup
 * - Segment B (Service): Pickup → Dropoff
 * - Segment C (Return): Dropoff → Base
 */

import type {
	OrganizationPricingSettings,
	TripAnalysis,
	SegmentAnalysis,
	ShadowCalculationInput,
	VehicleSelectionInfo,
	CostBreakdown,
} from "./types";
import { calculateCostBreakdown, combineCostBreakdowns } from "./cost-calculator";

// ============================================================================
// Segment Analysis Creation
// ============================================================================

/**
 * Create a segment analysis with full cost breakdown
 */
function createSegmentAnalysis(
	name: "approach" | "service" | "return",
	description: string,
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	isEstimated: boolean,
): SegmentAnalysis {
	const cost = calculateCostBreakdown(distanceKm, durationMinutes, settings);
	return {
		name,
		description,
		distanceKm: Math.round(distanceKm * 100) / 100,
		durationMinutes: Math.round(durationMinutes * 100) / 100,
		cost,
		isEstimated,
	};
}

// ============================================================================
// Shadow Calculation
// ============================================================================

/**
 * Calculate shadow segments for a trip (Story 4.6)
 * 
 * This function computes the full operational loop:
 * - Segment A (Approach): Base → Pickup
 * - Segment B (Service): Pickup → Dropoff
 * - Segment C (Return): Dropoff → Base
 * 
 * @param input - Shadow calculation input (from vehicle selection or estimates)
 * @param serviceDistanceKm - Service segment distance (required)
 * @param serviceDurationMinutes - Service segment duration (required)
 * @param settings - Organization pricing settings for cost calculation
 * @returns Complete TripAnalysis with segment breakdown
 */
export function calculateShadowSegments(
	input: ShadowCalculationInput | null,
	serviceDistanceKm: number,
	serviceDurationMinutes: number,
	settings: OrganizationPricingSettings,
): TripAnalysis {
	const calculatedAt = new Date().toISOString();
	
	let routingSource: TripAnalysis["routingSource"] = "HAVERSINE_ESTIMATE";
	if (input?.routingSource === "GOOGLE_API") {
		routingSource = "GOOGLE_API";
	} else if (input?.vehicleSelection) {
		routingSource = "VEHICLE_SELECTION";
	}

	const hasVehicleSegments = input && 
		input.approachDistanceKm !== undefined && 
		input.returnDistanceKm !== undefined;

	const serviceSegment = createSegmentAnalysis(
		"service",
		"Pickup → Dropoff (client trip)",
		input?.serviceDistanceKm ?? serviceDistanceKm,
		input?.serviceDurationMinutes ?? serviceDurationMinutes,
		settings,
		routingSource === "HAVERSINE_ESTIMATE",
	);

	let approachSegment: SegmentAnalysis | null = null;
	let returnSegment: SegmentAnalysis | null = null;

	if (hasVehicleSegments) {
		approachSegment = createSegmentAnalysis(
			"approach",
			"Base → Pickup (deadhead)",
			input.approachDistanceKm!,
			input.approachDurationMinutes ?? 0,
			settings,
			routingSource === "HAVERSINE_ESTIMATE",
		);

		returnSegment = createSegmentAnalysis(
			"return",
			"Dropoff → Base (deadhead)",
			input.returnDistanceKm!,
			input.returnDurationMinutes ?? 0,
			settings,
			routingSource === "HAVERSINE_ESTIMATE",
		);
	}

	const allSegments = [approachSegment, serviceSegment, returnSegment].filter(
		(s): s is SegmentAnalysis => s !== null,
	);
	
	const totalDistanceKm = allSegments.reduce((sum, s) => sum + s.distanceKm, 0);
	const totalDurationMinutes = allSegments.reduce((sum, s) => sum + s.durationMinutes, 0);
	const totalInternalCost = allSegments.reduce((sum, s) => sum + s.cost.total, 0);

	const costBreakdown = combineCostBreakdowns(allSegments.map(s => s.cost));

	return {
		costBreakdown,
		vehicleSelection: input?.vehicleSelection,
		segments: {
			approach: approachSegment,
			service: serviceSegment,
			return: returnSegment,
		},
		totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
		totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
		totalInternalCost: Math.round(totalInternalCost * 100) / 100,
		calculatedAt,
		routingSource,
	};
}

// ============================================================================
// Vehicle Selection Input Builder
// ============================================================================

/**
 * Build shadow calculation input from vehicle selection result
 */
export function buildShadowInputFromVehicleSelection(
	vehicleResult: {
		selectedCandidate?: {
			approachDistanceKm: number;
			approachDurationMinutes: number;
			serviceDistanceKm: number;
			serviceDurationMinutes: number;
			returnDistanceKm: number;
			returnDurationMinutes: number;
			routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
			vehicleId: string;
			vehicleName: string;
			baseId: string;
			baseName: string;
		} | null;
		candidatesConsidered: number;
		candidatesAfterCapacityFilter: number;
		candidatesAfterHaversineFilter: number;
		candidatesWithRouting: number;
		selectionCriterion: "MINIMAL_COST" | "BEST_MARGIN";
		fallbackUsed: boolean;
		fallbackReason?: string;
	} | null,
): ShadowCalculationInput | null {
	if (!vehicleResult) {
		return null;
	}

	const vehicleSelection: VehicleSelectionInfo = {
		candidatesConsidered: vehicleResult.candidatesConsidered,
		candidatesAfterCapacityFilter: vehicleResult.candidatesAfterCapacityFilter,
		candidatesAfterHaversineFilter: vehicleResult.candidatesAfterHaversineFilter,
		candidatesWithRouting: vehicleResult.candidatesWithRouting,
		selectionCriterion: vehicleResult.selectionCriterion,
		fallbackUsed: vehicleResult.fallbackUsed,
		fallbackReason: vehicleResult.fallbackReason,
	};

	if (vehicleResult.selectedCandidate) {
		const candidate = vehicleResult.selectedCandidate;
		vehicleSelection.selectedVehicle = {
			vehicleId: candidate.vehicleId,
			vehicleName: candidate.vehicleName,
			baseId: candidate.baseId,
			baseName: candidate.baseName,
		};
		vehicleSelection.routingSource = candidate.routingSource;

		return {
			approachDistanceKm: candidate.approachDistanceKm,
			approachDurationMinutes: candidate.approachDurationMinutes,
			serviceDistanceKm: candidate.serviceDistanceKm,
			serviceDurationMinutes: candidate.serviceDurationMinutes,
			returnDistanceKm: candidate.returnDistanceKm,
			returnDurationMinutes: candidate.returnDurationMinutes,
			routingSource: candidate.routingSource,
			vehicleSelection,
		};
	}

	return {
		vehicleSelection,
	};
}

// ============================================================================
// Estimated End Time Calculation
// ============================================================================

/**
 * Story 17.5: Calculate estimated end time for a quote
 * Used for driver availability detection and weighted day/night rate calculation
 * 
 * @param pickupAt - The pickup time as a Date object
 * @param tripAnalysis - The trip analysis containing duration information
 * @returns The estimated end time, or null if duration is not available
 */
export function calculateEstimatedEndAt(
	pickupAt: Date,
	tripAnalysis: TripAnalysis | null | undefined
): Date | null {
	if (!tripAnalysis) {
		return null;
	}

	let totalMinutes = tripAnalysis.totalDurationMinutes;

	if (tripAnalysis.compliancePlan?.planType === "MULTI_DAY") {
		const daysRequired = tripAnalysis.compliancePlan.adjustedSchedule?.daysRequired;
		if (daysRequired && daysRequired > 0) {
			totalMinutes = daysRequired * 24 * 60;
		}
	}

	if (!totalMinutes || totalMinutes <= 0) {
		return null;
	}

	const endAt = new Date(pickupAt);
	endAt.setMinutes(endAt.getMinutes() + totalMinutes);
	return endAt;
}
