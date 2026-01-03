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
	TimeAnalysis,
	TimeAnalysisBaseTime,
	TimeAnalysisVehicleAdjustment,
	TimeAnalysisTrafficAdjustment,
	TimeAnalysisMandatoryBreaks,
	PositioningCosts,
	PositioningCostItem,
	AvailabilityFeeItem,
	TripType,
} from "./types";
import { calculateCostBreakdown, combineCostBreakdowns } from "./cost-calculator";

// ============================================================================
// Time Analysis Calculation (Story 21.3)
// ============================================================================

/**
 * Vehicle type speed adjustment percentages
 * Heavy vehicles (coaches, minibuses) travel slower than cars
 */
const VEHICLE_SPEED_ADJUSTMENTS: Record<string, { percentage: number; reason: string }> = {
	HEAVY: { percentage: 40, reason: "Coach average speed 70km/h vs car 100km/h" },
	LIGHT: { percentage: 0, reason: "Standard vehicle speed" },
};

/**
 * Traffic adjustment rules based on departure time
 */
interface TrafficRule {
	name: string;
	startHour: number;
	endHour: number;
	percentage: number;
	reason: string;
}

const TRAFFIC_RULES: TrafficRule[] = [
	{ name: "RUSH_HOUR_MORNING", startHour: 7, endHour: 9, percentage: 15, reason: "Rush hour morning" },
	{ name: "RUSH_HOUR_EVENING", startHour: 17, endHour: 19, percentage: 15, reason: "Rush hour evening" },
	{ name: "NIGHT", startHour: 22, endHour: 6, percentage: -10, reason: "Night travel (less traffic)" },
];

/**
 * RSE mandatory break constants
 */
const RSE_BREAK_CONSTANTS = {
	maxContinuousDrivingMinutes: 270, // 4.5 hours
	breakDurationMinutes: 45,
	regulationReference: "RSE Art. 561-2",
};

/**
 * Calculate time analysis breakdown (Story 21.3)
 * 
 * @param baseGoogleDurationMinutes - Base duration from Google Routes API
 * @param routingSource - Source of the routing data
 * @param regulatoryCategory - Vehicle regulatory category (LIGHT/HEAVY)
 * @param vehicleCategoryName - Name of the vehicle category
 * @param pickupAt - Pickup time for traffic adjustment calculation
 * @returns TimeAnalysis object with all breakdown components
 */
export function calculateTimeAnalysis(
	baseGoogleDurationMinutes: number,
	routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE" | "VEHICLE_SELECTION",
	regulatoryCategory: "LIGHT" | "HEAVY" | null,
	vehicleCategoryName: string | null,
	pickupAt: Date | null,
): TimeAnalysis {
	// Base Google time
	const baseGoogleTime: TimeAnalysisBaseTime = {
		durationMinutes: Math.round(baseGoogleDurationMinutes),
		source: routingSource === "GOOGLE_API" ? "GOOGLE_API" : "ESTIMATE",
		fetchedAt: new Date().toISOString(),
	};

	let totalDurationMinutes = baseGoogleDurationMinutes;

	// Vehicle type adjustment (for HEAVY vehicles)
	let vehicleAdjustment: TimeAnalysisVehicleAdjustment | null = null;
	if (regulatoryCategory === "HEAVY") {
		const adjustment = VEHICLE_SPEED_ADJUSTMENTS.HEAVY;
		const additionalMinutes = Math.round(baseGoogleDurationMinutes * (adjustment.percentage / 100));
		vehicleAdjustment = {
			percentage: adjustment.percentage,
			additionalMinutes,
			reason: adjustment.reason,
			vehicleCategoryName: vehicleCategoryName ?? "Heavy Vehicle",
		};
		totalDurationMinutes += additionalMinutes;
	}

	// Traffic adjustment based on pickup time
	let trafficAdjustment: TimeAnalysisTrafficAdjustment | null = null;
	if (pickupAt) {
		const hour = pickupAt.getHours();
		
		for (const rule of TRAFFIC_RULES) {
			let isInRange = false;
			
			// Handle overnight ranges (e.g., 22:00 - 06:00)
			if (rule.startHour > rule.endHour) {
				isInRange = hour >= rule.startHour || hour < rule.endHour;
			} else {
				isInRange = hour >= rule.startHour && hour < rule.endHour;
			}
			
			if (isInRange) {
				const additionalMinutes = Math.round(baseGoogleDurationMinutes * (rule.percentage / 100));
				trafficAdjustment = {
					percentage: rule.percentage,
					additionalMinutes,
					reason: rule.reason,
					appliedRule: rule.name,
				};
				totalDurationMinutes += additionalMinutes;
				break; // Apply only the first matching rule
			}
		}
	}

	// Mandatory breaks for HEAVY vehicles (RSE regulation)
	let mandatoryBreaks: TimeAnalysisMandatoryBreaks | null = null;
	if (regulatoryCategory === "HEAVY") {
		// Calculate driving time (excluding breaks already added)
		const drivingMinutes = baseGoogleDurationMinutes + (vehicleAdjustment?.additionalMinutes ?? 0);
		
		// Calculate number of required breaks
		const breakCount = Math.floor(drivingMinutes / RSE_BREAK_CONSTANTS.maxContinuousDrivingMinutes);
		
		if (breakCount > 0) {
			const totalBreakMinutes = breakCount * RSE_BREAK_CONSTANTS.breakDurationMinutes;
			mandatoryBreaks = {
				breakCount,
				breakDurationMinutes: RSE_BREAK_CONSTANTS.breakDurationMinutes,
				totalBreakMinutes,
				regulationReference: RSE_BREAK_CONSTANTS.regulationReference,
				isHeavyVehicle: true,
			};
			totalDurationMinutes += totalBreakMinutes;
		}
	}

	// Calculate difference from Google Maps
	const differenceFromGoogle = Math.round(totalDurationMinutes - baseGoogleDurationMinutes);

	return {
		baseGoogleTime,
		vehicleAdjustment,
		trafficAdjustment,
		mandatoryBreaks,
		totalDurationMinutes: Math.round(totalDurationMinutes),
		differenceFromGoogle,
	};
}

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

// ============================================================================
// Story 21.6: Positioning Costs Calculation
// ============================================================================

/**
 * Options for positioning costs calculation
 */
export interface PositioningCostsOptions {
	tripType: TripType;
	segments: TripAnalysis["segments"];
	/** Service segment distance for estimation when no vehicle selected */
	serviceDistanceKm?: number;
	/** Service segment duration for estimation when no vehicle selected */
	serviceDurationMinutes?: number;
	/** Pricing settings for cost calculation */
	pricingSettings?: OrganizationPricingSettings;
	/** Total trip duration in hours (for dispo) */
	durationHours?: number;
	/** Included hours in dispo package */
	includedHours?: number;
	/** Hourly rate for availability fee */
	availabilityRatePerHour?: number;
}

/**
 * Calculate positioning costs for a trip (Story 21.6)
 * 
 * This function determines and calculates:
 * - Approach fee: Cost of vehicle traveling from base to pickup
 * - Empty return: Cost of vehicle returning to base after dropoff (estimated if no vehicle)
 * - Availability fee: Extra waiting time cost for dispo trips
 * 
 * When no vehicle is selected (quote creation stage), the empty return is estimated
 * based on the service distance and the emptyReturnCostPercent setting.
 * 
 * @param options - Positioning costs calculation options
 * @returns PositioningCosts object with all positioning cost details
 */
export function calculatePositioningCosts(options: PositioningCostsOptions): PositioningCosts {
	const {
		tripType,
		segments,
		serviceDistanceKm = 0,
		serviceDurationMinutes = 0,
		pricingSettings,
		durationHours,
		includedHours,
		availabilityRatePerHour,
	} = options;

	// Get empty return cost percentage (default 100%)
	const emptyReturnCostPercent = pricingSettings?.emptyReturnCostPercent ?? 100;

	// Approach fee - from segment A (approach) if available
	const approachFee: PositioningCostItem = segments.approach
		? {
				required: true,
				distanceKm: segments.approach.distanceKm,
				durationMinutes: segments.approach.durationMinutes,
				cost: segments.approach.cost.total,
				reason: "Vehicle positioning from base to pickup",
			}
		: {
				required: false,
				distanceKm: 0,
				durationMinutes: 0,
				cost: 0,
				reason: "No vehicle selected - approach cost estimated in base price",
			};

	// Empty return - from segment C (return) if available
	// Note: We do NOT estimate empty return when no vehicle is selected because:
	// - The return distance depends on the vehicle's base location (unknown at quote stage)
	// - Estimating with service distance would be incorrect (return ≠ service trip)
	// - The actual cost will be calculated at dispatch when a vehicle is assigned
	let emptyReturn: PositioningCostItem;
	
	if (segments.return) {
		// Vehicle selected - use actual return segment with cost percentage applied
		const adjustedCost = Math.round(segments.return.cost.total * (emptyReturnCostPercent / 100) * 100) / 100;
		emptyReturn = {
			required: true,
			distanceKm: segments.return.distanceKm,
			durationMinutes: segments.return.durationMinutes,
			cost: adjustedCost,
			reason: `${getEmptyReturnReason(tripType)} (${emptyReturnCostPercent}% of operational cost)`,
		};
	} else {
		// No vehicle selected - cannot estimate return cost (depends on vehicle base location)
		emptyReturn = {
			required: tripType !== "dispo",
			distanceKm: 0,
			durationMinutes: 0,
			cost: 0,
			reason: "Retour à vide sera calculé au dispatch (dépend de la base du véhicule)",
		};
	}

	// Availability fee - only for dispo trips with extra hours
	let availabilityFee: AvailabilityFeeItem | null = null;
	if (tripType === "dispo") {
		const effectiveDurationHours = durationHours ?? 0;
		const effectiveIncludedHours = includedHours ?? 4; // Default 4 hours included
		const effectiveRate = availabilityRatePerHour ?? 50; // Default 50€/hour
		
		const extraHours = Math.max(0, effectiveDurationHours - effectiveIncludedHours);
		const extraCost = Math.round(extraHours * effectiveRate * 100) / 100;
		
		availabilityFee = {
			required: extraHours > 0,
			waitingHours: extraHours,
			ratePerHour: effectiveRate,
			cost: extraCost,
			reason: extraHours > 0
				? `${extraHours.toFixed(1)}h beyond ${effectiveIncludedHours}h included`
				: `Within ${effectiveIncludedHours}h included hours`,
		};
	}

	// Calculate total positioning cost
	const totalPositioningCost = Math.round(
		(approachFee.cost + emptyReturn.cost + (availabilityFee?.cost ?? 0)) * 100
	) / 100;

	return {
		approachFee,
		emptyReturn,
		availabilityFee,
		totalPositioningCost,
	};
}

/**
 * Get the reason string for empty return based on trip type
 */
function getEmptyReturnReason(tripType: TripType): string {
	switch (tripType) {
		case "transfer":
			return "Empty return to base after transfer";
		case "excursion":
			return "Empty return to base after excursion";
		case "dispo":
			return "Empty return to base after mise à disposition";
		default:
			return "Empty return to base";
	}
}
