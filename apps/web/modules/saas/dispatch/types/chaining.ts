/**
 * Chaining Types
 * Story 8.4: Detect & Suggest Trip Chaining Opportunities
 *
 * Type definitions for trip chaining functionality in the Dispatch screen.
 */

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
 * Target mission summary in a chaining suggestion
 */
export interface ChainTargetMission {
	id: string;
	pickupAt: string;
	pickupAddress: string;
	dropoffAddress: string;
	contact: {
		displayName: string;
	};
}

/**
 * Chaining suggestion from the API
 */
export interface ChainingSuggestion {
	targetMissionId: string;
	targetMission: ChainTargetMission;
	chainOrder: ChainOrder;
	transition: TransitionDetails;
	savings: ChainingSavings;
	compatibility: ChainingCompatibility;
	isRecommended: boolean;
}

/**
 * Source mission summary in chaining response
 */
export interface ChainSourceMission {
	id: string;
	pickupAt: string;
	pickupAddress: string;
	dropoffAddress: string;
	dropoffAt: string;
}

/**
 * Response from GET /missions/:id/chaining-suggestions
 */
export interface ChainingSuggestionsResponse {
	suggestions: ChainingSuggestion[];
	mission: ChainSourceMission;
}

/**
 * Request body for POST /missions/:id/apply-chain
 */
export interface ApplyChainRequest {
	targetMissionId: string;
	chainOrder: ChainOrder;
}

/**
 * Updated mission info after chaining
 */
export interface UpdatedChainedMission {
	id: string;
	chainOrder: number;
	newInternalCost: number;
	newMarginPercent: number;
}

/**
 * Response from POST /missions/:id/apply-chain
 */
export interface ApplyChainResponse {
	success: boolean;
	chainId: string;
	updatedMissions: UpdatedChainedMission[];
	totalSavings: {
		distanceKm: number;
		costEur: number;
	};
	message: string;
}

/**
 * Response from DELETE /missions/:id/chain
 */
export interface RemoveChainResponse {
	success: boolean;
	affectedMissions: string[];
	message: string;
}

/**
 * Chain info stored on a mission
 */
export interface MissionChainInfo {
	chainId: string | null;
	chainOrder: number | null;
	chainedWithId: string | null;
}
