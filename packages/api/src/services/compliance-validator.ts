/**
 * Heavy-Vehicle Compliance Validator Service (Story 5.3)
 *
 * Validates heavy-vehicle missions against RSE (Règlement Social Européen) rules:
 * - Maximum daily driving time (typically 10h)
 * - Maximum daily amplitude (typically 14h, 18h with double crew)
 * - Mandatory breaks (45min per 4h30 driving block)
 * - Capped average speed (85 km/h for heavy vehicles)
 *
 * All thresholds are read from OrganizationLicenseRule (zero hardcoding per FR26)
 */

import type { TripAnalysis, SegmentAnalysis } from "./pricing-engine";

// ============================================================================
// Types
// ============================================================================

export type ViolationType =
	| "DRIVING_TIME_EXCEEDED"
	| "AMPLITUDE_EXCEEDED"
	| "BREAK_REQUIRED"
	| "SPEED_LIMIT_EXCEEDED";

export type WarningType = "APPROACHING_LIMIT" | "BREAK_RECOMMENDED";

export type RegulatoryCategory = "LIGHT" | "HEAVY";

export type ComplianceRuleResult = "PASS" | "FAIL" | "WARNING";

/**
 * RSE rules from OrganizationLicenseRule
 */
export interface RSERules {
	licenseCategoryId: string;
	licenseCategoryCode: string;
	maxDailyDrivingHours: number;
	maxDailyAmplitudeHours: number;
	breakMinutesPerDrivingBlock: number;
	drivingBlockHoursForBreak: number;
	cappedAverageSpeedKmh: number | null;
}

/**
 * Default RSE rules for heavy vehicles (used when no org-specific rules exist)
 * These are based on EU RSE regulations
 */
export const DEFAULT_HEAVY_VEHICLE_RSE_RULES: Omit<RSERules, "licenseCategoryId" | "licenseCategoryCode"> = {
	maxDailyDrivingHours: 10,
	maxDailyAmplitudeHours: 14,
	breakMinutesPerDrivingBlock: 45,
	drivingBlockHoursForBreak: 4.5,
	cappedAverageSpeedKmh: 85,
};

/**
 * Warning thresholds (percentage of limit)
 */
export const WARNING_THRESHOLDS = {
	DRIVING_TIME: 0.9, // Warn at 90% of limit
	AMPLITUDE: 0.9,
};

/**
 * Input for compliance validation
 */
export interface ComplianceValidationInput {
	organizationId: string;
	vehicleCategoryId: string;
	regulatoryCategory: RegulatoryCategory;
	licenseCategoryId?: string;
	tripAnalysis: TripAnalysis;
	pickupAt: Date;
	estimatedDropoffAt?: Date;
}

/**
 * Compliance violation with structured error info
 */
export interface ComplianceViolation {
	type: ViolationType;
	message: string;
	actual: number;
	limit: number;
	unit: "hours" | "minutes" | "km/h";
	severity: "BLOCKING";
}

/**
 * Compliance warning (non-blocking)
 */
export interface ComplianceWarning {
	type: WarningType;
	message: string;
	actual: number;
	limit: number;
	percentOfLimit: number;
}

/**
 * Applied compliance rule for transparency
 */
export interface AppliedComplianceRule {
	ruleId: string;
	ruleName: string;
	threshold: number;
	unit: string;
	result: ComplianceRuleResult;
	actualValue?: number;
}

/**
 * Adjusted durations after break injection and speed capping
 */
export interface AdjustedDurations {
	totalDrivingMinutes: number;
	totalAmplitudeMinutes: number;
	injectedBreakMinutes: number;
	cappedSpeedApplied: boolean;
	originalDrivingMinutes: number;
	originalAmplitudeMinutes: number;
}

/**
 * Result of compliance validation
 */
export interface ComplianceValidationResult {
	isCompliant: boolean;
	regulatoryCategory: RegulatoryCategory;
	violations: ComplianceViolation[];
	warnings: ComplianceWarning[];
	adjustedDurations: AdjustedDurations;
	rulesApplied: AppliedComplianceRule[];
	rulesUsed: RSERules | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate total driving time from trip segments (in minutes)
 * Driving time = Approach + Service + Return (all segments)
 */
export function calculateTotalDrivingMinutes(tripAnalysis: TripAnalysis): number {
	let totalMinutes = 0;

	// Approach segment (deadhead)
	if (tripAnalysis.segments.approach) {
		totalMinutes += tripAnalysis.segments.approach.durationMinutes;
	}

	// Service segment (client trip)
	totalMinutes += tripAnalysis.segments.service.durationMinutes;

	// Return segment (deadhead)
	if (tripAnalysis.segments.return) {
		totalMinutes += tripAnalysis.segments.return.durationMinutes;
	}

	return Math.round(totalMinutes * 100) / 100;
}

/**
 * Calculate total amplitude from pickup to end of return (in minutes)
 * Amplitude = Time from start of approach to end of return
 */
export function calculateTotalAmplitudeMinutes(
	tripAnalysis: TripAnalysis,
	pickupAt: Date,
	estimatedDropoffAt?: Date,
): number {
	// If we have explicit dropoff time, use it
	if (estimatedDropoffAt) {
		const amplitudeMs = estimatedDropoffAt.getTime() - pickupAt.getTime();
		// Add approach and return times
		const approachMinutes = tripAnalysis.segments.approach?.durationMinutes ?? 0;
		const returnMinutes = tripAnalysis.segments.return?.durationMinutes ?? 0;
		return Math.round((amplitudeMs / 60000 + approachMinutes + returnMinutes) * 100) / 100;
	}

	// Otherwise, calculate from segment durations
	// Amplitude = Approach + Service + Return
	return calculateTotalDrivingMinutes(tripAnalysis);
}

/**
 * Calculate number of mandatory breaks needed for a driving block
 * Break is required every drivingBlockHoursForBreak hours
 */
export function calculateRequiredBreaks(
	drivingMinutes: number,
	drivingBlockHoursForBreak: number,
): number {
	const drivingBlockMinutes = drivingBlockHoursForBreak * 60;
	if (drivingMinutes <= drivingBlockMinutes) {
		return 0;
	}
	// Number of complete blocks that require a break
	return Math.floor(drivingMinutes / drivingBlockMinutes);
}

/**
 * Calculate total break time to inject (in minutes)
 */
export function calculateInjectedBreakMinutes(
	drivingMinutes: number,
	rules: Pick<RSERules, "drivingBlockHoursForBreak" | "breakMinutesPerDrivingBlock">,
): number {
	const requiredBreaks = calculateRequiredBreaks(
		drivingMinutes,
		rules.drivingBlockHoursForBreak,
	);
	return requiredBreaks * rules.breakMinutesPerDrivingBlock;
}

/**
 * Recalculate segment duration with capped speed
 * If the implied speed exceeds the cap, recalculate duration
 */
export function recalculateWithCappedSpeed(
	distanceKm: number,
	durationMinutes: number,
	cappedSpeedKmh: number,
): { durationMinutes: number; speedWasCapped: boolean } {
	if (distanceKm <= 0 || durationMinutes <= 0) {
		return { durationMinutes, speedWasCapped: false };
	}

	// Calculate implied speed
	const impliedSpeedKmh = (distanceKm / durationMinutes) * 60;

	if (impliedSpeedKmh > cappedSpeedKmh) {
		// Recalculate duration at capped speed
		const newDurationMinutes = (distanceKm / cappedSpeedKmh) * 60;
		return {
			durationMinutes: Math.round(newDurationMinutes * 100) / 100,
			speedWasCapped: true,
		};
	}

	return { durationMinutes, speedWasCapped: false };
}

/**
 * Apply speed capping to all segments and return adjusted trip analysis
 */
export function applySpeedCapping(
	tripAnalysis: TripAnalysis,
	cappedSpeedKmh: number,
): { adjustedTripAnalysis: TripAnalysis; speedWasCapped: boolean } {
	let speedWasCapped = false;
	const adjustedSegments = { ...tripAnalysis.segments };

	// Adjust approach segment
	if (adjustedSegments.approach) {
		const result = recalculateWithCappedSpeed(
			adjustedSegments.approach.distanceKm,
			adjustedSegments.approach.durationMinutes,
			cappedSpeedKmh,
		);
		if (result.speedWasCapped) {
			speedWasCapped = true;
			adjustedSegments.approach = {
				...adjustedSegments.approach,
				durationMinutes: result.durationMinutes,
			};
		}
	}

	// Adjust service segment
	const serviceResult = recalculateWithCappedSpeed(
		adjustedSegments.service.distanceKm,
		adjustedSegments.service.durationMinutes,
		cappedSpeedKmh,
	);
	if (serviceResult.speedWasCapped) {
		speedWasCapped = true;
		adjustedSegments.service = {
			...adjustedSegments.service,
			durationMinutes: serviceResult.durationMinutes,
		};
	}

	// Adjust return segment
	if (adjustedSegments.return) {
		const result = recalculateWithCappedSpeed(
			adjustedSegments.return.distanceKm,
			adjustedSegments.return.durationMinutes,
			cappedSpeedKmh,
		);
		if (result.speedWasCapped) {
			speedWasCapped = true;
			adjustedSegments.return = {
				...adjustedSegments.return,
				durationMinutes: result.durationMinutes,
			};
		}
	}

	// Recalculate totals
	const totalDurationMinutes =
		(adjustedSegments.approach?.durationMinutes ?? 0) +
		adjustedSegments.service.durationMinutes +
		(adjustedSegments.return?.durationMinutes ?? 0);

	return {
		adjustedTripAnalysis: {
			...tripAnalysis,
			segments: adjustedSegments,
			totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
		},
		speedWasCapped,
	};
}

/**
 * Convert minutes to hours with 2 decimal places
 */
export function minutesToHours(minutes: number): number {
	return Math.round((minutes / 60) * 100) / 100;
}

/**
 * Convert hours to minutes
 */
export function hoursToMinutes(hours: number): number {
	return hours * 60;
}

// ============================================================================
// Main Validation Function
// ============================================================================

/**
 * Validate a trip against heavy-vehicle RSE compliance rules
 *
 * This is a pure function for testability - it takes rules as input
 * rather than fetching from DB directly.
 *
 * @param input - Validation input with trip analysis and timing
 * @param rules - RSE rules to validate against (from OrganizationLicenseRule)
 * @returns Validation result with violations, warnings, and adjusted durations
 */
export function validateHeavyVehicleCompliance(
	input: ComplianceValidationInput,
	rules: RSERules | null,
): ComplianceValidationResult {
	const violations: ComplianceViolation[] = [];
	const warnings: ComplianceWarning[] = [];
	const rulesApplied: AppliedComplianceRule[] = [];

	// If not a heavy vehicle, skip validation
	if (input.regulatoryCategory !== "HEAVY") {
		return {
			isCompliant: true,
			regulatoryCategory: input.regulatoryCategory,
			violations: [],
			warnings: [],
			adjustedDurations: {
				totalDrivingMinutes: calculateTotalDrivingMinutes(input.tripAnalysis),
				totalAmplitudeMinutes: calculateTotalAmplitudeMinutes(
					input.tripAnalysis,
					input.pickupAt,
					input.estimatedDropoffAt,
				),
				injectedBreakMinutes: 0,
				cappedSpeedApplied: false,
				originalDrivingMinutes: calculateTotalDrivingMinutes(input.tripAnalysis),
				originalAmplitudeMinutes: calculateTotalAmplitudeMinutes(
					input.tripAnalysis,
					input.pickupAt,
					input.estimatedDropoffAt,
				),
			},
			rulesApplied: [],
			rulesUsed: null,
		};
	}

	// Use provided rules or defaults
	const effectiveRules: RSERules = rules ?? {
		licenseCategoryId: "default",
		licenseCategoryCode: "DEFAULT",
		...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
	};

	// Store original values
	const originalDrivingMinutes = calculateTotalDrivingMinutes(input.tripAnalysis);
	const originalAmplitudeMinutes = calculateTotalAmplitudeMinutes(
		input.tripAnalysis,
		input.pickupAt,
		input.estimatedDropoffAt,
	);

	// Step 1: Apply speed capping if configured
	let adjustedTripAnalysis = input.tripAnalysis;
	let cappedSpeedApplied = false;

	if (effectiveRules.cappedAverageSpeedKmh) {
		const speedResult = applySpeedCapping(
			input.tripAnalysis,
			effectiveRules.cappedAverageSpeedKmh,
		);
		adjustedTripAnalysis = speedResult.adjustedTripAnalysis;
		cappedSpeedApplied = speedResult.speedWasCapped;

		rulesApplied.push({
			ruleId: `speed-cap-${effectiveRules.licenseCategoryId}`,
			ruleName: "Capped Average Speed",
			threshold: effectiveRules.cappedAverageSpeedKmh,
			unit: "km/h",
			result: cappedSpeedApplied ? "PASS" : "PASS", // Speed capping is always applied, not a violation
			actualValue: cappedSpeedApplied ? effectiveRules.cappedAverageSpeedKmh : undefined,
		});
	}

	// Step 2: Calculate driving time with adjusted durations
	const totalDrivingMinutes = calculateTotalDrivingMinutes(adjustedTripAnalysis);
	const maxDrivingMinutes = hoursToMinutes(effectiveRules.maxDailyDrivingHours);

	// Check driving time limit
	if (totalDrivingMinutes > maxDrivingMinutes) {
		violations.push({
			type: "DRIVING_TIME_EXCEEDED",
			message: `Total driving time (${minutesToHours(totalDrivingMinutes)}h) exceeds maximum allowed (${effectiveRules.maxDailyDrivingHours}h)`,
			actual: minutesToHours(totalDrivingMinutes),
			limit: effectiveRules.maxDailyDrivingHours,
			unit: "hours",
			severity: "BLOCKING",
		});
		rulesApplied.push({
			ruleId: `driving-time-${effectiveRules.licenseCategoryId}`,
			ruleName: "Maximum Daily Driving Time",
			threshold: effectiveRules.maxDailyDrivingHours,
			unit: "hours",
			result: "FAIL",
			actualValue: minutesToHours(totalDrivingMinutes),
		});
	} else {
		// Check for warning threshold
		const percentOfLimit = totalDrivingMinutes / maxDrivingMinutes;
		if (percentOfLimit >= WARNING_THRESHOLDS.DRIVING_TIME) {
			warnings.push({
				type: "APPROACHING_LIMIT",
				message: `Driving time (${minutesToHours(totalDrivingMinutes)}h) is approaching the limit (${effectiveRules.maxDailyDrivingHours}h)`,
				actual: minutesToHours(totalDrivingMinutes),
				limit: effectiveRules.maxDailyDrivingHours,
				percentOfLimit: Math.round(percentOfLimit * 100),
			});
			rulesApplied.push({
				ruleId: `driving-time-${effectiveRules.licenseCategoryId}`,
				ruleName: "Maximum Daily Driving Time",
				threshold: effectiveRules.maxDailyDrivingHours,
				unit: "hours",
				result: "WARNING",
				actualValue: minutesToHours(totalDrivingMinutes),
			});
		} else {
			rulesApplied.push({
				ruleId: `driving-time-${effectiveRules.licenseCategoryId}`,
				ruleName: "Maximum Daily Driving Time",
				threshold: effectiveRules.maxDailyDrivingHours,
				unit: "hours",
				result: "PASS",
				actualValue: minutesToHours(totalDrivingMinutes),
			});
		}
	}

	// Step 3: Calculate and inject mandatory breaks
	const injectedBreakMinutes = calculateInjectedBreakMinutes(totalDrivingMinutes, effectiveRules);

	if (injectedBreakMinutes > 0) {
		rulesApplied.push({
			ruleId: `breaks-${effectiveRules.licenseCategoryId}`,
			ruleName: "Mandatory Breaks",
			threshold: effectiveRules.breakMinutesPerDrivingBlock,
			unit: "minutes per block",
			result: "PASS",
			actualValue: injectedBreakMinutes,
		});
	}

	// Step 4: Calculate amplitude (including injected breaks)
	const totalAmplitudeMinutes = calculateTotalAmplitudeMinutes(
		adjustedTripAnalysis,
		input.pickupAt,
		input.estimatedDropoffAt,
	) + injectedBreakMinutes;
	const maxAmplitudeMinutes = hoursToMinutes(effectiveRules.maxDailyAmplitudeHours);

	// Check amplitude limit
	if (totalAmplitudeMinutes > maxAmplitudeMinutes) {
		violations.push({
			type: "AMPLITUDE_EXCEEDED",
			message: `Total work amplitude (${minutesToHours(totalAmplitudeMinutes)}h) exceeds maximum allowed (${effectiveRules.maxDailyAmplitudeHours}h)`,
			actual: minutesToHours(totalAmplitudeMinutes),
			limit: effectiveRules.maxDailyAmplitudeHours,
			unit: "hours",
			severity: "BLOCKING",
		});
		rulesApplied.push({
			ruleId: `amplitude-${effectiveRules.licenseCategoryId}`,
			ruleName: "Maximum Daily Amplitude",
			threshold: effectiveRules.maxDailyAmplitudeHours,
			unit: "hours",
			result: "FAIL",
			actualValue: minutesToHours(totalAmplitudeMinutes),
		});
	} else {
		// Check for warning threshold
		const percentOfLimit = totalAmplitudeMinutes / maxAmplitudeMinutes;
		if (percentOfLimit >= WARNING_THRESHOLDS.AMPLITUDE) {
			warnings.push({
				type: "APPROACHING_LIMIT",
				message: `Work amplitude (${minutesToHours(totalAmplitudeMinutes)}h) is approaching the limit (${effectiveRules.maxDailyAmplitudeHours}h)`,
				actual: minutesToHours(totalAmplitudeMinutes),
				limit: effectiveRules.maxDailyAmplitudeHours,
				percentOfLimit: Math.round(percentOfLimit * 100),
			});
			rulesApplied.push({
				ruleId: `amplitude-${effectiveRules.licenseCategoryId}`,
				ruleName: "Maximum Daily Amplitude",
				threshold: effectiveRules.maxDailyAmplitudeHours,
				unit: "hours",
				result: "WARNING",
				actualValue: minutesToHours(totalAmplitudeMinutes),
			});
		} else {
			rulesApplied.push({
				ruleId: `amplitude-${effectiveRules.licenseCategoryId}`,
				ruleName: "Maximum Daily Amplitude",
				threshold: effectiveRules.maxDailyAmplitudeHours,
				unit: "hours",
				result: "PASS",
				actualValue: minutesToHours(totalAmplitudeMinutes),
			});
		}
	}

	return {
		isCompliant: violations.length === 0,
		regulatoryCategory: input.regulatoryCategory,
		violations,
		warnings,
		adjustedDurations: {
			totalDrivingMinutes,
			totalAmplitudeMinutes,
			injectedBreakMinutes,
			cappedSpeedApplied,
			originalDrivingMinutes,
			originalAmplitudeMinutes,
		},
		rulesApplied,
		rulesUsed: effectiveRules,
	};
}

/**
 * Quick check if a trip is compliant without full details
 * Useful for list views and quick filtering
 */
export function isHeavyVehicleTripCompliant(
	input: ComplianceValidationInput,
	rules: RSERules | null,
): boolean {
	const result = validateHeavyVehicleCompliance(input, rules);
	return result.isCompliant;
}

/**
 * Get a summary of compliance status for display
 */
export function getComplianceSummary(result: ComplianceValidationResult): {
	status: "OK" | "WARNING" | "VIOLATION";
	message: string;
	violationCount: number;
	warningCount: number;
} {
	if (result.violations.length > 0) {
		return {
			status: "VIOLATION",
			message: result.violations[0].message,
			violationCount: result.violations.length,
			warningCount: result.warnings.length,
		};
	}

	if (result.warnings.length > 0) {
		return {
			status: "WARNING",
			message: result.warnings[0].message,
			violationCount: 0,
			warningCount: result.warnings.length,
		};
	}

	return {
		status: "OK",
		message: "All compliance checks passed",
		violationCount: 0,
		warningCount: 0,
	};
}
