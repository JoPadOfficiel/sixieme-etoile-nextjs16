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
 * Story 19.1: Fixed maxDailyDrivingHours to 9h (standard limit, 10h allowed 2x/week)
 */
export const DEFAULT_HEAVY_VEHICLE_RSE_RULES: Omit<RSERules, "licenseCategoryId" | "licenseCategoryCode"> = {
	maxDailyDrivingHours: 9, // Standard limit is 9h, can be extended to 10h twice per week
	maxDailyAmplitudeHours: 13, // Standard amplitude is 13h (not 14h)
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
 * Story 22.1: Include round trip return leg segments (returnApproach, returnService, finalReturn)
 */
export function calculateTotalDrivingMinutes(tripAnalysis: TripAnalysis): number {
	let totalMinutes = 0;

	// Approach segment (deadhead)
	if (tripAnalysis.segments.approach) {
		totalMinutes += tripAnalysis.segments.approach.durationMinutes;
	}

	// Service segment (client trip)
	totalMinutes += tripAnalysis.segments.service.durationMinutes;

	// Return segment (deadhead) - only for one-way trips
	if (tripAnalysis.segments.return) {
		totalMinutes += tripAnalysis.segments.return.durationMinutes;
	}

	// Story 22.1: Round trip return leg segments
	if (tripAnalysis.isRoundTrip) {
		// Segment D: Return approach (repositioning for return leg) - only for RETURN_BETWEEN_LEGS mode
		if (tripAnalysis.segments.returnApproach) {
			totalMinutes += tripAnalysis.segments.returnApproach.durationMinutes;
		}
		// Segment E: Return service (client return trip)
		if (tripAnalysis.segments.returnService) {
			totalMinutes += tripAnalysis.segments.returnService.durationMinutes;
		}
		// Segment F: Final return (deadhead back to base)
		if (tripAnalysis.segments.finalReturn) {
			totalMinutes += tripAnalysis.segments.finalReturn.durationMinutes;
		}
	}

	return Math.round(totalMinutes * 100) / 100;
}

/**
 * Calculate total amplitude from pickup to end of return (in minutes)
 * Amplitude = Time from start of approach to end of return
 * Story 22.1: Include round trip return leg segments
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
		let totalMinutes = amplitudeMs / 60000 + approachMinutes + returnMinutes;
		
		// Story 22.1: Add round trip return leg segments
		if (tripAnalysis.isRoundTrip) {
			totalMinutes += (tripAnalysis.segments.returnApproach?.durationMinutes ?? 0);
			totalMinutes += (tripAnalysis.segments.returnService?.durationMinutes ?? 0);
			totalMinutes += (tripAnalysis.segments.finalReturn?.durationMinutes ?? 0);
		}
		
		return Math.round(totalMinutes * 100) / 100;
	}

	// Otherwise, calculate from segment durations
	// Amplitude = Approach + Service + Return (+ round trip segments if applicable)
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

	// Story 22.1: Adjust round trip return leg segments
	if (tripAnalysis.isRoundTrip) {
		if (adjustedSegments.returnApproach) {
			const result = recalculateWithCappedSpeed(
				adjustedSegments.returnApproach.distanceKm,
				adjustedSegments.returnApproach.durationMinutes,
				cappedSpeedKmh,
			);
			if (result.speedWasCapped) {
				speedWasCapped = true;
				adjustedSegments.returnApproach = {
					...adjustedSegments.returnApproach,
					durationMinutes: result.durationMinutes,
				};
			}
		}
		if (adjustedSegments.returnService) {
			const result = recalculateWithCappedSpeed(
				adjustedSegments.returnService.distanceKm,
				adjustedSegments.returnService.durationMinutes,
				cappedSpeedKmh,
			);
			if (result.speedWasCapped) {
				speedWasCapped = true;
				adjustedSegments.returnService = {
					...adjustedSegments.returnService,
					durationMinutes: result.durationMinutes,
				};
			}
		}
		if (adjustedSegments.finalReturn) {
			const result = recalculateWithCappedSpeed(
				adjustedSegments.finalReturn.distanceKm,
				adjustedSegments.finalReturn.durationMinutes,
				cappedSpeedKmh,
			);
			if (result.speedWasCapped) {
				speedWasCapped = true;
				adjustedSegments.finalReturn = {
					...adjustedSegments.finalReturn,
					durationMinutes: result.durationMinutes,
				};
			}
		}
	}

	// Recalculate totals - Story 22.1: Include round trip segments
	let totalDurationMinutes =
		(adjustedSegments.approach?.durationMinutes ?? 0) +
		adjustedSegments.service.durationMinutes +
		(adjustedSegments.return?.durationMinutes ?? 0);
	
	// Add round trip return leg segments
	if (tripAnalysis.isRoundTrip) {
		totalDurationMinutes += (adjustedSegments.returnApproach?.durationMinutes ?? 0);
		totalDurationMinutes += (adjustedSegments.returnService?.durationMinutes ?? 0);
		totalDurationMinutes += (adjustedSegments.finalReturn?.durationMinutes ?? 0);
	}

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

// ============================================================================
// Story 5.4: Alternative Staffing & Scheduling Options
// ============================================================================

/**
 * Alternative types for non-compliant heavy-vehicle missions
 */
export type AlternativeType =
	| "DOUBLE_CREW"      // Add second driver, extend amplitude to 18h
	| "RELAY_DRIVER"     // Split driving between two drivers at handover point
	| "MULTI_DAY";       // Convert to overnight mission with hotel stop

/**
 * Cost parameters for alternative calculations
 */
export interface AlternativeCostParameters {
	driverHourlyCost: number;        // EUR/hour (default: 25)
	hotelCostPerNight: number;       // EUR/night (default: 100)
	mealAllowancePerDay: number;     // EUR/day (default: 30)
}

/**
 * Default cost parameters (used when org-specific not available)
 */
export const DEFAULT_ALTERNATIVE_COST_PARAMETERS: AlternativeCostParameters = {
	driverHourlyCost: 25,
	hotelCostPerNight: 100,
	mealAllowancePerDay: 30,
};

/**
 * Extended staffing cost parameters including additional fees
 * Story 17.4: All parameters configurable per FR66
 */
export interface ExtendedStaffingCostParameters extends AlternativeCostParameters {
	driverOvernightPremium: number;  // EUR premium for overnight missions (default: 50)
	relayDriverFixedFee: number;     // EUR fixed fee for relay driver arrangement (default: 150)
}

/**
 * Default extended staffing costs
 */
export const DEFAULT_EXTENDED_STAFFING_COSTS: ExtendedStaffingCostParameters = {
	...DEFAULT_ALTERNATIVE_COST_PARAMETERS,
	driverOvernightPremium: 50,
	relayDriverFixedFee: 150,
};

/**
 * Organization pricing settings type for staffing costs
 * Matches the Prisma OrganizationPricingSettings model fields
 */
export interface OrganizationStaffingCostSettings {
	hotelCostPerNight: { toNumber: () => number } | null;
	mealCostPerDay: { toNumber: () => number } | null;
	driverOvernightPremium: { toNumber: () => number } | null;
	secondDriverHourlyRate: { toNumber: () => number } | null;
	relayDriverFixedFee: { toNumber: () => number } | null;
}

/**
 * Build AlternativeCostParameters from organization settings
 * Falls back to defaults for any null values
 * Story 17.4: Configurable staffing cost parameters
 */
export function buildCostParametersFromSettings(
	settings: OrganizationStaffingCostSettings | null | undefined
): AlternativeCostParameters {
	if (!settings) {
		return DEFAULT_ALTERNATIVE_COST_PARAMETERS;
	}

	return {
		driverHourlyCost: settings.secondDriverHourlyRate?.toNumber() 
			?? DEFAULT_ALTERNATIVE_COST_PARAMETERS.driverHourlyCost,
		hotelCostPerNight: settings.hotelCostPerNight?.toNumber() 
			?? DEFAULT_ALTERNATIVE_COST_PARAMETERS.hotelCostPerNight,
		mealAllowancePerDay: settings.mealCostPerDay?.toNumber() 
			?? DEFAULT_ALTERNATIVE_COST_PARAMETERS.mealAllowancePerDay,
	};
}

/**
 * Build extended staffing cost parameters from organization settings
 * Includes all staffing-related costs for comprehensive calculations
 * Story 17.4: Configurable staffing cost parameters
 */
export function buildExtendedCostParametersFromSettings(
	settings: OrganizationStaffingCostSettings | null | undefined
): ExtendedStaffingCostParameters {
	if (!settings) {
		return DEFAULT_EXTENDED_STAFFING_COSTS;
	}

	return {
		driverHourlyCost: settings.secondDriverHourlyRate?.toNumber() 
			?? DEFAULT_EXTENDED_STAFFING_COSTS.driverHourlyCost,
		hotelCostPerNight: settings.hotelCostPerNight?.toNumber() 
			?? DEFAULT_EXTENDED_STAFFING_COSTS.hotelCostPerNight,
		mealAllowancePerDay: settings.mealCostPerDay?.toNumber() 
			?? DEFAULT_EXTENDED_STAFFING_COSTS.mealAllowancePerDay,
		driverOvernightPremium: settings.driverOvernightPremium?.toNumber() 
			?? DEFAULT_EXTENDED_STAFFING_COSTS.driverOvernightPremium,
		relayDriverFixedFee: settings.relayDriverFixedFee?.toNumber() 
			?? DEFAULT_EXTENDED_STAFFING_COSTS.relayDriverFixedFee,
	};
}

/**
 * RSE limits for alternative calculations
 */
export const ALTERNATIVE_RSE_LIMITS = {
	DOUBLE_CREW_AMPLITUDE_HOURS: 18,  // Max amplitude with double crew
	MIN_DAILY_REST_HOURS: 11,         // Minimum daily rest period
	MAX_MULTI_DAY_DAYS: 3,            // Maximum days for multi-day alternative
	STANDARD_WORK_DAY_HOURS: 8,       // Standard driver work day
};

/**
 * Cost breakdown for an alternative option
 */
export interface AlternativeCostBreakdown {
	extraDriverCost: number;      // Additional driver hours × hourly rate
	hotelCost: number;            // Overnight accommodation
	mealAllowance: number;        // Driver meal allowance
	otherCosts: number;           // Parking, etc.
}

/**
 * Adjusted schedule for an alternative option
 */
export interface AlternativeAdjustedSchedule {
	totalDrivingMinutes: number;
	totalAmplitudeMinutes: number;
	daysRequired: number;
	driversRequired: number;
	hotelNightsRequired: number;
}

/**
 * Alternative option for a non-compliant mission
 */
export interface AlternativeOption {
	type: AlternativeType;
	title: string;
	description: string;
	
	// Feasibility
	isFeasible: boolean;
	feasibilityReason?: string;
	
	// Cost impact
	additionalCost: {
		total: number;
		currency: "EUR";
		breakdown: AlternativeCostBreakdown;
	};
	
	// Adjusted scheduling
	adjustedSchedule: AlternativeAdjustedSchedule;
	
	// Compliance verification
	wouldBeCompliant: boolean;
	remainingViolations: ComplianceViolation[];
}

/**
 * Input for alternative generation
 */
export interface AlternativesGenerationInput {
	complianceResult: ComplianceValidationResult;
	costParameters: AlternativeCostParameters;
	rules: RSERules | null;
}

/**
 * Result of alternative generation
 */
export interface AlternativesGenerationResult {
	hasAlternatives: boolean;
	alternatives: AlternativeOption[];
	originalViolations: ComplianceViolation[];
	recommendedAlternative?: AlternativeType;
	message: string;
}

// ============================================================================
// Alternative Generation Functions
// ============================================================================

/**
 * Story 19.1: Generate DOUBLE_CREW alternative for driving time AND amplitude violations
 * Double crew allows:
 * - Each driver can drive up to the limit (9h), so total driving can be 2x limit (18h)
 * - Amplitude limit extends from 13h to 21h (with proper rest management)
 * 
 * This is the PRIMARY solution for long trips like Paris → Lyon (10h32)
 */
export function generateDoubleCrewAlternative(
	complianceResult: ComplianceValidationResult,
	costParameters: AlternativeCostParameters | ExtendedStaffingCostParameters,
	rules: RSERules | null,
): AlternativeOption | null {
	// Only applicable for HEAVY vehicles with violations
	if (complianceResult.regulatoryCategory !== "HEAVY") {
		return null;
	}

	// Check for any violation that double crew can solve
	const drivingViolation = complianceResult.violations.find(
		v => v.type === "DRIVING_TIME_EXCEEDED"
	);
	const amplitudeViolation = complianceResult.violations.find(
		v => v.type === "AMPLITUDE_EXCEEDED"
	);

	// Double crew can solve BOTH driving time AND amplitude violations
	if (!drivingViolation && !amplitudeViolation) {
		return null;
	}

	const maxDrivingHours = rules?.maxDailyDrivingHours ?? 9;
	const maxAmplitudeHours = rules?.maxDailyAmplitudeHours ?? 13;
	const doubleCrewAmplitudeLimit = ALTERNATIVE_RSE_LIMITS.DOUBLE_CREW_AMPLITUDE_HOURS; // 18h
	
	// With double crew, each driver can drive up to the limit
	// So total driving capacity is 2 × maxDrivingHours
	const doubleCrewDrivingLimit = maxDrivingHours * 2; // 18h with 9h limit

	const actualDrivingHours = minutesToHours(complianceResult.adjustedDurations.totalDrivingMinutes);
	const actualAmplitudeHours = minutesToHours(complianceResult.adjustedDurations.totalAmplitudeMinutes);

	// Check if double crew would solve the problem
	const drivingFeasible = actualDrivingHours <= doubleCrewDrivingLimit;
	const amplitudeFeasible = actualAmplitudeHours <= doubleCrewAmplitudeLimit;
	const isFeasible = drivingFeasible && amplitudeFeasible;

	// Calculate extra driver cost
	// Story 22.1: Second driver works the ENTIRE trip duration (amplitude), not just driving time
	// Both drivers are present for the whole mission, they just alternate driving
	// Cost = total amplitude hours × hourly rate (second driver is paid for full mission)
	const extraDriverHours = actualAmplitudeHours; // Second driver works the entire mission
	const extraDriverCost = extraDriverHours * costParameters.driverHourlyCost;
	
	// Story 22.1: Calculate hotel and meal costs for double crew
	// For a round trip that exceeds amplitude, both drivers need hotel and meals
	// Hotel: if amplitude > 10h, assume overnight stay required (1 night × 2 drivers)
	// Meals: 2 meals per driver per day (lunch + dinner)
	const needsOvernight = actualAmplitudeHours > 10; // More than 10h = overnight
	const hotelCost = needsOvernight 
		? costParameters.hotelCostPerNight * 2 // 2 drivers × 1 night
		: 0;
	const mealCost = needsOvernight
		? costParameters.mealAllowancePerDay * 2 // 2 drivers × 1 day
		: costParameters.mealAllowancePerDay; // At least 1 meal for long trip
	
	// Story 22.1: Add overnight premium for both drivers if they sleep away from home
	const extendedParams = costParameters as ExtendedStaffingCostParameters;
	const overnightPremium = needsOvernight && extendedParams.driverOvernightPremium
		? extendedParams.driverOvernightPremium * 2 // 2 drivers × 1 night premium
		: 0;

	// Check remaining violations if double crew is applied
	const remainingViolations: ComplianceViolation[] = [];
	
	// With double crew, driving time per driver = total / 2
	const drivingPerDriver = actualDrivingHours / 2;
	if (drivingPerDriver > maxDrivingHours) {
		remainingViolations.push({
			type: "DRIVING_TIME_EXCEEDED",
			message: `Temps de conduite par chauffeur (${drivingPerDriver.toFixed(1)}h) dépasse la limite de ${maxDrivingHours}h`,
			actual: drivingPerDriver,
			limit: maxDrivingHours,
			unit: "hours",
			severity: "BLOCKING",
		});
	}

	// If amplitude still exceeds 18h, add violation
	if (!amplitudeFeasible) {
		remainingViolations.push({
			type: "AMPLITUDE_EXCEEDED",
			message: `Amplitude (${actualAmplitudeHours.toFixed(1)}h) dépasse la limite double équipage de ${doubleCrewAmplitudeLimit}h`,
			actual: actualAmplitudeHours,
			limit: doubleCrewAmplitudeLimit,
			unit: "hours",
			severity: "BLOCKING",
		});
	}

	// Build description based on what violations are being solved
	let description = "Ajouter un second chauffeur pour ";
	const solutions: string[] = [];
	if (drivingViolation) {
		solutions.push(`partager le temps de conduite (${(actualDrivingHours/2).toFixed(1)}h chacun)`);
	}
	if (amplitudeViolation) {
		solutions.push(`étendre l'amplitude à ${doubleCrewAmplitudeLimit}h`);
	}
	description += solutions.join(" et ");

	// Story 22.1: Total cost includes driver, hotel, meals, and overnight premium
	const totalCost = extraDriverCost + hotelCost + mealCost + overnightPremium;

	return {
		type: "DOUBLE_CREW",
		title: "Double Équipage",
		description,
		isFeasible,
		feasibilityReason: isFeasible 
			? undefined 
			: !drivingFeasible 
				? `Temps de conduite (${actualDrivingHours.toFixed(1)}h) dépasse ${doubleCrewDrivingLimit}h même avec double équipage`
				: `Amplitude (${actualAmplitudeHours.toFixed(1)}h) dépasse ${doubleCrewAmplitudeLimit}h même avec double équipage`,
		additionalCost: {
			total: Math.round(totalCost * 100) / 100,
			currency: "EUR",
			breakdown: {
				extraDriverCost: Math.round(extraDriverCost * 100) / 100,
				hotelCost: Math.round(hotelCost * 100) / 100,
				mealAllowance: Math.round(mealCost * 100) / 100,
				otherCosts: Math.round(overnightPremium * 100) / 100, // Overnight premium
			},
		},
		adjustedSchedule: {
			totalDrivingMinutes: complianceResult.adjustedDurations.totalDrivingMinutes,
			totalAmplitudeMinutes: complianceResult.adjustedDurations.totalAmplitudeMinutes,
			daysRequired: needsOvernight ? 2 : 1,
			driversRequired: 2,
			hotelNightsRequired: needsOvernight ? 2 : 0, // 2 drivers × 1 night
		},
		wouldBeCompliant: isFeasible && remainingViolations.length === 0,
		remainingViolations,
	};
}

/**
 * Generate RELAY_DRIVER alternative for driving time violations
 * Relay driver splits driving between two drivers
 */
export function generateRelayDriverAlternative(
	complianceResult: ComplianceValidationResult,
	costParameters: AlternativeCostParameters,
	rules: RSERules | null,
): AlternativeOption | null {
	// Only applicable for HEAVY vehicles with driving time violations
	if (complianceResult.regulatoryCategory !== "HEAVY") {
		return null;
	}

	const drivingViolation = complianceResult.violations.find(
		v => v.type === "DRIVING_TIME_EXCEEDED"
	);

	if (!drivingViolation) {
		return null;
	}

	const actualDrivingHours = drivingViolation.actual;
	const maxDrivingHours = rules?.maxDailyDrivingHours ?? 10;

	// With relay, each driver does half the driving
	const drivingPerDriver = actualDrivingHours / 2;
	const isFeasible = drivingPerDriver <= maxDrivingHours;

	// Calculate extra driver cost (second driver works half the driving time)
	const extraDriverHours = drivingPerDriver;
	const extraDriverCost = extraDriverHours * costParameters.driverHourlyCost;

	// Check remaining violations
	const remainingViolations: ComplianceViolation[] = [];

	// Check amplitude - relay doesn't help with amplitude
	const amplitudeViolation = complianceResult.violations.find(
		v => v.type === "AMPLITUDE_EXCEEDED"
	);
	if (amplitudeViolation) {
		remainingViolations.push(amplitudeViolation);
	}

	// If driving per driver still exceeds limit
	if (!isFeasible) {
		remainingViolations.push({
			type: "DRIVING_TIME_EXCEEDED",
			message: `Driving time per driver (${drivingPerDriver.toFixed(2)}h) still exceeds limit (${maxDrivingHours}h)`,
			actual: drivingPerDriver,
			limit: maxDrivingHours,
			unit: "hours",
			severity: "BLOCKING",
		});
	}

	return {
		type: "RELAY_DRIVER",
		title: "Relay Driver",
		description: `Split driving between two drivers (${drivingPerDriver.toFixed(1)}h each) with handover at midpoint`,
		isFeasible,
		feasibilityReason: isFeasible
			? undefined
			: `Even split (${drivingPerDriver.toFixed(2)}h per driver) exceeds ${maxDrivingHours}h limit`,
		additionalCost: {
			total: Math.round(extraDriverCost * 100) / 100,
			currency: "EUR",
			breakdown: {
				extraDriverCost: Math.round(extraDriverCost * 100) / 100,
				hotelCost: 0,
				mealAllowance: 0,
				otherCosts: 0,
			},
		},
		adjustedSchedule: {
			totalDrivingMinutes: complianceResult.adjustedDurations.totalDrivingMinutes,
			totalAmplitudeMinutes: complianceResult.adjustedDurations.totalAmplitudeMinutes,
			daysRequired: 1,
			driversRequired: 2,
			hotelNightsRequired: 0,
		},
		wouldBeCompliant: isFeasible && remainingViolations.length === 0,
		remainingViolations,
	};
}

/**
 * Generate MULTI_DAY alternative for severe violations
 * Converts to overnight mission with hotel stop
 */
export function generateMultiDayAlternative(
	complianceResult: ComplianceValidationResult,
	costParameters: AlternativeCostParameters,
	rules: RSERules | null,
): AlternativeOption | null {
	// Only applicable for HEAVY vehicles with violations
	if (complianceResult.regulatoryCategory !== "HEAVY") {
		return null;
	}

	if (complianceResult.violations.length === 0) {
		return null;
	}

	const totalAmplitudeHours = minutesToHours(
		complianceResult.adjustedDurations.totalAmplitudeMinutes
	);
	const totalDrivingHours = minutesToHours(
		complianceResult.adjustedDurations.totalDrivingMinutes
	);

	const maxDrivingHours = rules?.maxDailyDrivingHours ?? 10;
	const maxAmplitudeHours = rules?.maxDailyAmplitudeHours ?? 14;
	const minRestHours = ALTERNATIVE_RSE_LIMITS.MIN_DAILY_REST_HOURS;

	// Calculate days required
	// Each day can have max amplitude minus rest time for effective work
	const effectiveWorkHoursPerDay = maxAmplitudeHours;
	const daysRequired = Math.ceil(totalAmplitudeHours / effectiveWorkHoursPerDay);

	// Check feasibility (max 3 days for reasonable alternative)
	const isFeasible = daysRequired <= ALTERNATIVE_RSE_LIMITS.MAX_MULTI_DAY_DAYS;

	// Calculate costs
	const hotelNights = daysRequired - 1;
	const hotelCost = hotelNights * costParameters.hotelCostPerNight;
	const mealAllowance = daysRequired * costParameters.mealAllowancePerDay;
	
	// Additional driver cost for extra days
	const standardWorkDay = ALTERNATIVE_RSE_LIMITS.STANDARD_WORK_DAY_HOURS;
	const extraDays = daysRequired - 1;
	const extraDriverCost = extraDays * standardWorkDay * costParameters.driverHourlyCost;

	const totalCost = hotelCost + mealAllowance + extraDriverCost;

	// Check remaining violations
	const remainingViolations: ComplianceViolation[] = [];

	// With multi-day, driving and amplitude are spread across days
	const drivingPerDay = totalDrivingHours / daysRequired;
	const amplitudePerDay = totalAmplitudeHours / daysRequired;

	if (drivingPerDay > maxDrivingHours) {
		remainingViolations.push({
			type: "DRIVING_TIME_EXCEEDED",
			message: `Daily driving (${drivingPerDay.toFixed(2)}h) exceeds limit (${maxDrivingHours}h) even with ${daysRequired} days`,
			actual: drivingPerDay,
			limit: maxDrivingHours,
			unit: "hours",
			severity: "BLOCKING",
		});
	}

	if (amplitudePerDay > maxAmplitudeHours) {
		remainingViolations.push({
			type: "AMPLITUDE_EXCEEDED",
			message: `Daily amplitude (${amplitudePerDay.toFixed(2)}h) exceeds limit (${maxAmplitudeHours}h) even with ${daysRequired} days`,
			actual: amplitudePerDay,
			limit: maxAmplitudeHours,
			unit: "hours",
			severity: "BLOCKING",
		});
	}

	return {
		type: "MULTI_DAY",
		title: "Multi-Day Mission",
		description: `Convert to ${daysRequired}-day mission with ${hotelNights} overnight stop${hotelNights > 1 ? 's' : ''} and ${minRestHours}h daily rest`,
		isFeasible,
		feasibilityReason: isFeasible
			? undefined
			: `Mission requires ${daysRequired} days, exceeding maximum ${ALTERNATIVE_RSE_LIMITS.MAX_MULTI_DAY_DAYS} days`,
		additionalCost: {
			total: Math.round(totalCost * 100) / 100,
			currency: "EUR",
			breakdown: {
				extraDriverCost: Math.round(extraDriverCost * 100) / 100,
				hotelCost: Math.round(hotelCost * 100) / 100,
				mealAllowance: Math.round(mealAllowance * 100) / 100,
				otherCosts: 0,
			},
		},
		adjustedSchedule: {
			totalDrivingMinutes: complianceResult.adjustedDurations.totalDrivingMinutes,
			totalAmplitudeMinutes: complianceResult.adjustedDurations.totalAmplitudeMinutes,
			daysRequired,
			driversRequired: 1,
			hotelNightsRequired: hotelNights,
		},
		wouldBeCompliant: isFeasible && remainingViolations.length === 0,
		remainingViolations,
	};
}

/**
 * Generate all applicable alternatives for a non-compliant mission
 */
export function generateAlternatives(
	input: AlternativesGenerationInput,
): AlternativesGenerationResult {
	const { complianceResult, costParameters, rules } = input;

	// If already compliant, no alternatives needed
	if (complianceResult.isCompliant) {
		return {
			hasAlternatives: false,
			alternatives: [],
			originalViolations: [],
			message: "Mission is compliant, no alternatives needed",
		};
	}

	// If not a heavy vehicle, no alternatives available
	if (complianceResult.regulatoryCategory !== "HEAVY") {
		return {
			hasAlternatives: false,
			alternatives: [],
			originalViolations: complianceResult.violations,
			message: "Alternatives only available for heavy vehicles",
		};
	}

	const alternatives: AlternativeOption[] = [];

	// Generate all possible alternatives
	const doubleCrew = generateDoubleCrewAlternative(complianceResult, costParameters, rules);
	if (doubleCrew) {
		alternatives.push(doubleCrew);
	}

	const relayDriver = generateRelayDriverAlternative(complianceResult, costParameters, rules);
	if (relayDriver) {
		alternatives.push(relayDriver);
	}

	const multiDay = generateMultiDayAlternative(complianceResult, costParameters, rules);
	if (multiDay) {
		alternatives.push(multiDay);
	}

	// Sort alternatives:
	// 1. Feasible first
	// 2. Would be compliant first
	// 3. Lowest cost first
	alternatives.sort((a, b) => {
		// Feasible first
		if (a.isFeasible !== b.isFeasible) {
			return a.isFeasible ? -1 : 1;
		}
		// Would be compliant first
		if (a.wouldBeCompliant !== b.wouldBeCompliant) {
			return a.wouldBeCompliant ? -1 : 1;
		}
		// Lowest cost first
		return a.additionalCost.total - b.additionalCost.total;
	});

	// Find recommended alternative (first feasible and compliant)
	const recommended = alternatives.find(a => a.isFeasible && a.wouldBeCompliant);

	return {
		hasAlternatives: alternatives.length > 0,
		alternatives,
		originalViolations: complianceResult.violations,
		recommendedAlternative: recommended?.type,
		message: alternatives.length > 0
			? `${alternatives.length} alternative${alternatives.length > 1 ? 's' : ''} available`
			: "No alternatives available for this violation pattern",
	};
}

// ============================================================================
// Story 17.3: Staffing Selection Policy
// ============================================================================

/**
 * Story 17.3: Staffing selection policy type
 */
export type StaffingSelectionPolicy = "CHEAPEST" | "FASTEST" | "PREFER_INTERNAL";

/**
 * Story 17.3: Result of automatic staffing selection
 */
export interface AutomaticStaffingSelectionResult {
	/** The selected staffing plan, or null if no plan needed/available */
	selectedPlan: AlternativeOption | null;
	/** Whether a staffing plan was required due to violations */
	isRequired: boolean;
	/** Reason for the selection */
	selectionReason: string;
	/** All alternatives that were considered */
	alternativesConsidered: AlternativeOption[];
	/** Original violations that triggered the selection */
	originalViolations: ComplianceViolation[];
}

/**
 * Story 17.3: Select the best staffing plan according to the configured policy
 * 
 * @param alternativesResult - Result from generateAlternatives()
 * @param policy - The staffing selection policy (CHEAPEST, FASTEST, PREFER_INTERNAL)
 * @returns The selected plan with selection reason
 */
export function selectBestStaffingPlan(
	alternativesResult: AlternativesGenerationResult,
	policy: StaffingSelectionPolicy = "CHEAPEST",
): AutomaticStaffingSelectionResult {
	// If no alternatives needed (compliant trip)
	if (!alternativesResult.hasAlternatives || alternativesResult.alternatives.length === 0) {
		return {
			selectedPlan: null,
			isRequired: false,
			selectionReason: "No staffing plan required - trip is compliant",
			alternativesConsidered: [],
			originalViolations: alternativesResult.originalViolations,
		};
	}

	// Filter to only feasible and compliant alternatives
	const feasibleAlternatives = alternativesResult.alternatives.filter(
		a => a.isFeasible && a.wouldBeCompliant
	);

	if (feasibleAlternatives.length === 0) {
		// No feasible alternatives - return the best non-feasible one for information
		const bestNonFeasible = alternativesResult.alternatives[0];
		return {
			selectedPlan: bestNonFeasible || null,
			isRequired: true,
			selectionReason: "No feasible staffing plan available - manual intervention required",
			alternativesConsidered: alternativesResult.alternatives,
			originalViolations: alternativesResult.originalViolations,
		};
	}

	let selectedPlan: AlternativeOption;
	let selectionReason: string;

	switch (policy) {
		case "CHEAPEST":
			// Sort by cost ascending
			feasibleAlternatives.sort((a, b) => a.additionalCost.total - b.additionalCost.total);
			selectedPlan = feasibleAlternatives[0];
			selectionReason = `Selected ${selectedPlan.type} as lowest cost option (€${selectedPlan.additionalCost.total})`;
			break;

		case "FASTEST":
			// Sort by days required, then by drivers required (fewer = faster)
			feasibleAlternatives.sort((a, b) => {
				const daysDiff = a.adjustedSchedule.daysRequired - b.adjustedSchedule.daysRequired;
				if (daysDiff !== 0) return daysDiff;
				return a.adjustedSchedule.driversRequired - b.adjustedSchedule.driversRequired;
			});
			selectedPlan = feasibleAlternatives[0];
			selectionReason = `Selected ${selectedPlan.type} as fastest option (${selectedPlan.adjustedSchedule.daysRequired} day(s))`;
			break;

		case "PREFER_INTERNAL":
			// Prefer DOUBLE_CREW over RELAY_DRIVER over MULTI_DAY
			const priorityOrder: AlternativeType[] = ["DOUBLE_CREW", "MULTI_DAY", "RELAY_DRIVER"];
			feasibleAlternatives.sort((a, b) => {
				const aPriority = priorityOrder.indexOf(a.type);
				const bPriority = priorityOrder.indexOf(b.type);
				if (aPriority !== bPriority) return aPriority - bPriority;
				// If same type, prefer cheaper
				return a.additionalCost.total - b.additionalCost.total;
			});
			selectedPlan = feasibleAlternatives[0];
			selectionReason = `Selected ${selectedPlan.type} as preferred internal option`;
			break;

		default:
			// Default to cheapest
			feasibleAlternatives.sort((a, b) => a.additionalCost.total - b.additionalCost.total);
			selectedPlan = feasibleAlternatives[0];
			selectionReason = `Selected ${selectedPlan.type} as default (lowest cost)`;
	}

	return {
		selectedPlan,
		isRequired: true,
		selectionReason,
		alternativesConsidered: alternativesResult.alternatives,
		originalViolations: alternativesResult.originalViolations,
	};
}

/**
 * Story 17.3: Complete compliance integration for pricing
 * Validates compliance, generates alternatives, and selects the best plan
 * 
 * @param input - Compliance validation input
 * @param rules - RSE rules to validate against
 * @param costParameters - Cost parameters for alternative calculations
 * @param policy - Staffing selection policy
 * @returns Complete result with selected staffing plan
 */
export function integrateComplianceInPricing(
	input: ComplianceValidationInput,
	rules: RSERules | null,
	costParameters: AlternativeCostParameters = DEFAULT_ALTERNATIVE_COST_PARAMETERS,
	policy: StaffingSelectionPolicy = "CHEAPEST",
): {
	complianceResult: ComplianceValidationResult;
	staffingSelection: AutomaticStaffingSelectionResult;
} {
	// Step 0: Skip compliance validation for LIGHT vehicles - RSE only applies to HEAVY vehicles
	if (input.regulatoryCategory === "LIGHT") {
		return {
			complianceResult: {
				isCompliant: true,
				regulatoryCategory: "LIGHT",
				violations: [],
				warnings: [],
				adjustedDurations: {
					totalDrivingMinutes: input.tripAnalysis.totalDurationMinutes,
					totalAmplitudeMinutes: input.tripAnalysis.totalDurationMinutes + 60, // Add 1h for breaks estimate
					originalDrivingMinutes: input.tripAnalysis.totalDurationMinutes,
					originalAmplitudeMinutes: input.tripAnalysis.totalDurationMinutes + 60,
					injectedBreakMinutes: 0,
					cappedSpeedApplied: false,
				},
				rulesApplied: [],
				rulesUsed: null, // No RSE rules used for LIGHT vehicles
			},
			staffingSelection: {
				selectedPlan: null,
				isRequired: false,
				selectionReason: "No RSE compliance required for LIGHT vehicles",
				alternativesConsidered: [],
				originalViolations: [],
			},
		};
	}

	// Step 1: Validate compliance (only for HEAVY vehicles)
	const complianceResult = validateHeavyVehicleCompliance(input, rules);

	// Step 2: If compliant, no staffing needed
	if (complianceResult.isCompliant) {
		return {
			complianceResult,
			staffingSelection: {
				selectedPlan: null,
				isRequired: false,
				selectionReason: "No staffing plan required - trip is compliant",
				alternativesConsidered: [],
				originalViolations: [],
			},
		};
	}

	// Step 3: Generate alternatives
	const alternativesResult = generateAlternatives({
		complianceResult,
		costParameters,
		rules,
	});

	// Step 4: Select best plan according to policy
	const staffingSelection = selectBestStaffingPlan(alternativesResult, policy);

	return {
		complianceResult,
		staffingSelection,
	};
}
