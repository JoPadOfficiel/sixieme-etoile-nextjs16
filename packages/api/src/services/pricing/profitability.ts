/**
 * Profitability Module
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 * 
 * This module handles profitability calculation and indicators:
 * - Profitability indicator calculation (green/orange/red)
 * - Profitability data for UI display
 * - Commission-aware profitability calculation
 * - Threshold management
 */

import type {
	ProfitabilityIndicator,
	ProfitabilityThresholds,
	ProfitabilityIndicatorData,
	OrganizationPricingSettings,
} from "./types";
import { DEFAULT_PROFITABILITY_THRESHOLDS } from "./constants";
import {
	getCommissionData,
	type CommissionData,
} from "../commission-service";

// ============================================================================
// Profitability Indicator Calculation
// ============================================================================

/**
 * Get human-readable label for profitability indicator
 */
export function getProfitabilityLabel(indicator: ProfitabilityIndicator): string {
	switch (indicator) {
		case "green":
			return "Profitable";
		case "orange":
			return "Low margin";
		case "red":
			return "Loss";
	}
}

/**
 * Get detailed description for profitability indicator tooltip
 */
export function getProfitabilityDescription(
	indicator: ProfitabilityIndicator,
	marginPercent: number,
	thresholds: ProfitabilityThresholds,
): string {
	const marginStr = marginPercent.toFixed(1);
	const greenStr = thresholds.greenThreshold.toFixed(0);
	const orangeStr = thresholds.orangeThreshold.toFixed(0);
	
	switch (indicator) {
		case "green":
			return `Margin: ${marginStr}% (≥${greenStr}% target)`;
		case "orange":
			return `Margin: ${marginStr}% (below ${greenStr}% target)`;
		case "red":
			return `Margin: ${marginStr}% (loss - below ${orangeStr}%)`;
	}
}

/**
 * Calculate profitability indicator based on margin percentage
 * Story 4.7: Now supports configurable thresholds
 * 
 * @param marginPercent - The margin percentage to classify
 * @param thresholds - Optional custom thresholds (defaults to PRD values)
 * @returns The profitability indicator state
 */
export function calculateProfitabilityIndicator(
	marginPercent: number,
	thresholds: ProfitabilityThresholds = DEFAULT_PROFITABILITY_THRESHOLDS,
): ProfitabilityIndicator {
	if (marginPercent >= thresholds.greenThreshold) return "green";
	if (marginPercent >= thresholds.orangeThreshold) return "orange";
	return "red";
}

/**
 * Story 4.7: Get complete profitability indicator data for UI
 * Returns all information needed for the ProfitabilityIndicator component
 * 
 * @param marginPercent - The margin percentage
 * @param thresholds - Optional custom thresholds (defaults to PRD values)
 * @returns Complete profitability data including indicator, label, and tooltip info
 */
export function getProfitabilityIndicatorData(
	marginPercent: number,
	thresholds: ProfitabilityThresholds = DEFAULT_PROFITABILITY_THRESHOLDS,
): ProfitabilityIndicatorData {
	const indicator = calculateProfitabilityIndicator(marginPercent, thresholds);
	const label = getProfitabilityLabel(indicator);
	const description = getProfitabilityDescription(indicator, marginPercent, thresholds);
	
	return {
		indicator,
		marginPercent: Math.round(marginPercent * 100) / 100,
		thresholds,
		label,
		description,
	};
}

/**
 * Story 4.7: Extract profitability thresholds from organization settings
 * Falls back to default thresholds if not configured
 */
export function getThresholdsFromSettings(
	settings: OrganizationPricingSettings,
): ProfitabilityThresholds {
	return {
		greenThreshold: settings.greenMarginThreshold ?? DEFAULT_PROFITABILITY_THRESHOLDS.greenThreshold,
		orangeThreshold: settings.orangeMarginThreshold ?? DEFAULT_PROFITABILITY_THRESHOLDS.orangeThreshold,
	};
}

// ============================================================================
// Commission-Aware Profitability Calculation
// ============================================================================

/**
 * Story 7.4: Calculate profitability including partner commission
 * 
 * For partner quotes, the effective margin is reduced by the commission amount.
 * This provides accurate profitability indicators for B2B contracts.
 * 
 * Formula:
 * - Effective Margin = Selling Price - Internal Cost - Commission
 * - Effective Margin % = (Effective Margin / Selling Price) × 100
 * 
 * @param sellingPrice - Final selling price
 * @param internalCost - Internal operational cost
 * @param commissionPercent - Commission percentage from partner contract (0 for private clients)
 * @param thresholds - Profitability thresholds for indicator classification
 * @returns Profitability data with commission information
 */
export function calculateProfitabilityWithCommission(
	sellingPrice: number,
	internalCost: number,
	commissionPercent: number,
	thresholds: ProfitabilityThresholds = DEFAULT_PROFITABILITY_THRESHOLDS,
): {
	profitabilityData: ProfitabilityIndicatorData;
	commissionData: CommissionData | undefined;
	margin: number;
	marginPercent: number;
} {
	const commissionData = commissionPercent > 0
		? getCommissionData(sellingPrice, internalCost, commissionPercent)
		: undefined;

	let margin: number;
	let marginPercent: number;

	if (commissionData) {
		margin = commissionData.effectiveMargin;
		marginPercent = commissionData.effectiveMarginPercent;
	} else {
		margin = Math.round((sellingPrice - internalCost) * 100) / 100;
		marginPercent = sellingPrice > 0
			? Math.round(((margin / sellingPrice) * 100) * 100) / 100
			: 0;
	}

	const profitabilityData = getProfitabilityIndicatorData(marginPercent, thresholds);

	return {
		profitabilityData,
		commissionData,
		margin,
		marginPercent,
	};
}
