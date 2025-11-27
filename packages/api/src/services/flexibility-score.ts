/**
 * Flexibility Score Service
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 *
 * Calculates a flexibility/fitness score for vehicle/driver candidates based on:
 * - Number of valid driver licenses (more = higher score)
 * - Driver availability/schedule slack (more slack = higher score)
 * - Distance from base to pickup (closer = higher score)
 * - RSE counters remaining capacity (more capacity = higher score)
 *
 * The score is normalized to 0-100 range with equal weights (25% each factor).
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Input for flexibility score calculation
 */
export interface FlexibilityScoreInput {
	// Driver factors
	driverLicenseCount: number;
	maxLicenseCount: number; // For normalization (e.g., 3)
	driverAvailabilityHours: number;
	maxAvailabilityHours: number; // e.g., 8

	// Distance factor
	baseDistanceKm: number;
	maxDistanceKm: number; // e.g., 100 (Haversine threshold)

	// RSE factors
	remainingDrivingHours: number;
	maxDrivingHours: number; // e.g., 10
	remainingAmplitudeHours: number;
	maxAmplitudeHours: number; // e.g., 14
}

/**
 * Score breakdown by factor
 */
export interface ScoreBreakdown {
	licensesScore: number; // 0-25 (weight: 25%)
	availabilityScore: number; // 0-25 (weight: 25%)
	distanceScore: number; // 0-25 (weight: 25%)
	rseCapacityScore: number; // 0-25 (weight: 25%)
}

/**
 * Result of flexibility score calculation
 */
export interface FlexibilityScoreResult {
	totalScore: number; // 0-100
	breakdown: ScoreBreakdown;
}

// ============================================================================
// Constants
// ============================================================================

/** Weight for each factor (25% each) */
export const SCORE_WEIGHT = 25;

/** Default max values for normalization */
export const DEFAULT_MAX_LICENSE_COUNT = 3;
export const DEFAULT_MAX_AVAILABILITY_HOURS = 8;
export const DEFAULT_MAX_DISTANCE_KM = 100;
export const DEFAULT_MAX_DRIVING_HOURS = 10;
export const DEFAULT_MAX_AMPLITUDE_HOURS = 14;

// ============================================================================
// Score Calculation
// ============================================================================

/**
 * Calculate flexibility score for a vehicle/driver candidate
 *
 * @param input - Score calculation input
 * @returns Score result with total and breakdown
 */
export function calculateFlexibilityScore(
	input: FlexibilityScoreInput,
): FlexibilityScoreResult {
	// Licenses: more licenses = higher score
	const licensesScore = Math.min(
		(input.driverLicenseCount / input.maxLicenseCount) * SCORE_WEIGHT,
		SCORE_WEIGHT,
	);

	// Availability: more slack = higher score
	const availabilityScore = Math.min(
		(input.driverAvailabilityHours / input.maxAvailabilityHours) * SCORE_WEIGHT,
		SCORE_WEIGHT,
	);

	// Distance: closer = higher score (inverse relationship)
	const distanceRatio = Math.max(
		1 - input.baseDistanceKm / input.maxDistanceKm,
		0,
	);
	const distanceScore = distanceRatio * SCORE_WEIGHT;

	// RSE capacity: more remaining = higher score
	const drivingRatio =
		input.maxDrivingHours > 0
			? input.remainingDrivingHours / input.maxDrivingHours
			: 1;
	const amplitudeRatio =
		input.maxAmplitudeHours > 0
			? input.remainingAmplitudeHours / input.maxAmplitudeHours
			: 1;
	const rseCapacityScore = ((drivingRatio + amplitudeRatio) / 2) * SCORE_WEIGHT;

	// Calculate total score
	const totalScore = Math.round(
		licensesScore + availabilityScore + distanceScore + rseCapacityScore,
	);

	return {
		totalScore: Math.max(0, Math.min(100, totalScore)),
		breakdown: {
			licensesScore: Math.round(licensesScore * 10) / 10,
			availabilityScore: Math.round(availabilityScore * 10) / 10,
			distanceScore: Math.round(distanceScore * 10) / 10,
			rseCapacityScore: Math.round(rseCapacityScore * 10) / 10,
		},
	};
}

/**
 * Calculate flexibility score with default max values
 *
 * @param params - Simplified input parameters
 * @returns Score result
 */
export function calculateFlexibilityScoreSimple(params: {
	licenseCount: number;
	availabilityHours: number;
	distanceKm: number;
	remainingDrivingHours: number;
	remainingAmplitudeHours: number;
}): FlexibilityScoreResult {
	return calculateFlexibilityScore({
		driverLicenseCount: params.licenseCount,
		maxLicenseCount: DEFAULT_MAX_LICENSE_COUNT,
		driverAvailabilityHours: params.availabilityHours,
		maxAvailabilityHours: DEFAULT_MAX_AVAILABILITY_HOURS,
		baseDistanceKm: params.distanceKm,
		maxDistanceKm: DEFAULT_MAX_DISTANCE_KM,
		remainingDrivingHours: params.remainingDrivingHours,
		maxDrivingHours: DEFAULT_MAX_DRIVING_HOURS,
		remainingAmplitudeHours: params.remainingAmplitudeHours,
		maxAmplitudeHours: DEFAULT_MAX_AMPLITUDE_HOURS,
	});
}

/**
 * Get score level based on total score
 *
 * @param score - Total flexibility score (0-100)
 * @returns Score level for UI display
 */
export function getScoreLevel(
	score: number,
): "excellent" | "good" | "fair" | "poor" {
	if (score >= 80) return "excellent";
	if (score >= 60) return "good";
	if (score >= 40) return "fair";
	return "poor";
}

/**
 * Get score color class based on total score
 *
 * @param score - Total flexibility score (0-100)
 * @returns Tailwind color class
 */
export function getScoreColorClass(score: number): string {
	if (score >= 70) return "text-green-600 dark:text-green-400";
	if (score >= 40) return "text-orange-600 dark:text-orange-400";
	return "text-red-600 dark:text-red-400";
}

/**
 * Get score background color class based on total score
 *
 * @param score - Total flexibility score (0-100)
 * @returns Tailwind background color class
 */
export function getScoreBgColorClass(score: number): string {
	if (score >= 70) return "bg-green-500/10";
	if (score >= 40) return "bg-orange-500/10";
	return "bg-red-500/10";
}
