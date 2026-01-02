/**
 * Pricing Engine - Re-export Module
 * 
 * Story 19-15: This file has been decomposed into modular components.
 * It now re-exports from the pricing/ directory for backward compatibility.
 * 
 * Architecture:
 * - pricing/types.ts: All type definitions
 * - pricing/constants.ts: All constants
 * - pricing/cost-calculator.ts: Cost calculation functions
 * - pricing/zone-resolver.ts: Zone resolution
 * - pricing/dynamic-pricing.ts: Dynamic pricing
 * - pricing/multiplier-engine.ts: Multiplier application
 * - pricing/profitability.ts: Profitability indicators
 * - pricing/shadow-calculator.ts: Shadow calculation
 * - pricing/trip-type-pricing.ts: Trip type specific pricing
 * 
 * @deprecated Import from "./pricing" instead
 */

// Re-export everything from the modular pricing directory
export * from "./pricing";

// Re-export compliance integration from compliance-validator
export {
	integrateComplianceInPricing,
	type ComplianceValidationInput,
	type ComplianceValidationResult,
	type RSERules,
	type AlternativeCostParameters,
	type StaffingSelectionPolicy,
} from "./compliance-validator";

// Story 20.4: Import types for integrateComplianceIntoPricing
import type {
	ComplianceIntegrationInput,
	ComplianceIntegrationResult,
	CompliancePlan,
	AppliedRule,
} from "./pricing/types";

import {
	integrateComplianceInPricing as _integrateComplianceInPricing,
	DEFAULT_ALTERNATIVE_COST_PARAMETERS,
	type RSERules as RSERulesType,
} from "./compliance-validator";

/**
 * Story 20.4: Integrate compliance validation into pricing with proper result format
 * 
 * This function wraps integrateComplianceInPricing to return the expected
 * ComplianceIntegrationResult format with tripAnalysis, additionalStaffingCost, and appliedRule.
 * 
 * @param input - Compliance integration input with trip analysis and settings
 * @returns ComplianceIntegrationResult with updated tripAnalysis containing compliancePlan
 */
export function integrateComplianceIntoPricing(
	input: ComplianceIntegrationInput
): ComplianceIntegrationResult {
	// Extract parameters
	const rules = (input.rules as RSERulesType | null) ?? null;
	const costParameters = input.costParameters ?? DEFAULT_ALTERNATIVE_COST_PARAMETERS;
	const policy = input.staffingSelectionPolicy ?? "CHEAPEST";

	// Call the underlying compliance integration
	const { complianceResult, staffingSelection } = _integrateComplianceInPricing(
		{
			organizationId: input.organizationId,
			vehicleCategoryId: input.vehicleCategoryId,
			regulatoryCategory: input.regulatoryCategory,
			licenseCategoryId: input.licenseCategoryId,
			tripAnalysis: input.tripAnalysis,
			pickupAt: input.pickupAt,
			estimatedDropoffAt: input.estimatedDropoffAt,
		},
		rules,
		costParameters,
		policy,
	);

	// Build compliancePlan for tripAnalysis
	let compliancePlan: CompliancePlan | null = null;
	let additionalStaffingCost = 0;
	let appliedRule: AppliedRule | null = null;

	if (input.regulatoryCategory === "LIGHT") {
		// LIGHT vehicles: no compliance plan needed
		compliancePlan = null;
	} else if (complianceResult.isCompliant) {
		// Compliant HEAVY trip: NONE plan (no additional staffing required)
		compliancePlan = {
			planType: "NONE",
			isRequired: false,
			additionalCost: 0,
			costBreakdown: {
				extraDriverCost: 0,
				hotelCost: 0,
				mealAllowance: 0,
				otherCosts: 0,
			},
			adjustedSchedule: {
				daysRequired: 1,
				driversRequired: 1,
				hotelNightsRequired: 0,
			},
			originalViolations: [],
			selectedReason: "Trip is compliant - no staffing plan required",
		};
	} else if (staffingSelection.selectedPlan) {
		// Non-compliant HEAVY trip: use selected staffing plan
		const plan = staffingSelection.selectedPlan;
		compliancePlan = {
			planType: plan.type,
			isRequired: true,
			additionalCost: plan.additionalCost.total,
			costBreakdown: plan.additionalCost.breakdown,
			adjustedSchedule: {
				daysRequired: plan.adjustedSchedule.daysRequired,
				driversRequired: plan.adjustedSchedule.driversRequired,
				hotelNightsRequired: plan.adjustedSchedule.hotelNightsRequired,
			},
			originalViolations: staffingSelection.originalViolations.map(v => ({
				type: v.type,
				message: v.message,
				actual: v.actual,
				limit: v.limit,
			})),
			selectedReason: staffingSelection.selectionReason,
		};
		additionalStaffingCost = plan.additionalCost.total;

		// Create applied rule for transparency (AC7)
		appliedRule = {
			type: "COMPLIANCE_STAFFING",
			planType: plan.type,
			additionalCost: plan.additionalCost.total,
			description: staffingSelection.selectionReason,
			violations: staffingSelection.originalViolations.length,
		};
	} else {
		// Non-compliant but no feasible plan available
		compliancePlan = {
			planType: "NONE",
			isRequired: true,
			additionalCost: 0,
			costBreakdown: {
				extraDriverCost: 0,
				hotelCost: 0,
				mealAllowance: 0,
				otherCosts: 0,
			},
			adjustedSchedule: {
				daysRequired: 1,
				driversRequired: 1,
				hotelNightsRequired: 0,
			},
			originalViolations: staffingSelection.originalViolations.map(v => ({
				type: v.type,
				message: v.message,
				actual: v.actual,
				limit: v.limit,
			})),
			selectedReason: staffingSelection.selectionReason,
		};
	}

	// Return result with updated tripAnalysis containing compliancePlan
	return {
		tripAnalysis: {
			...input.tripAnalysis,
			compliancePlan,
		},
		additionalStaffingCost,
		appliedRule,
	};
}
