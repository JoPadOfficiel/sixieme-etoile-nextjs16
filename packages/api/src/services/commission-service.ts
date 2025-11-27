/**
 * Commission Service
 * Story 7.4: Integrate Commission Calculation into Invoices
 *
 * Centralizes commission calculation logic to avoid double-dipping (FR36).
 * Used by both invoice creation and pricing engine for profitability calculations.
 *
 * @see docs/bmad/prd.md - FR2, FR36
 * @see docs/bmad/epics.md - Epic 7, Story 7.4
 */

// ============================================================================
// Types
// ============================================================================

/**
 * Input for commission calculation
 */
export interface CommissionCalculationInput {
	/** Total amount excluding VAT (base for commission calculation) */
	totalExclVat: number;
	/** Commission percentage from partner contract (0-100) */
	commissionPercent: number;
}

/**
 * Result of commission calculation
 */
export interface CommissionCalculationResult {
	/** Calculated commission amount in EUR */
	commissionAmount: number;
	/** Net amount after deducting commission */
	netAmountAfterCommission: number;
	/** Commission percentage used */
	commissionPercent: number;
}

/**
 * Input for effective margin calculation with commission
 */
export interface EffectiveMarginInput {
	/** Selling price (final price to client) */
	sellingPrice: number;
	/** Internal cost (operational cost) */
	internalCost: number;
	/** Commission amount to deduct */
	commissionAmount: number;
}

/**
 * Result of effective margin calculation
 */
export interface EffectiveMarginResult {
	/** Effective margin after commission */
	margin: number;
	/** Effective margin percentage */
	marginPercent: number;
	/** Gross margin (before commission) */
	grossMargin: number;
	/** Gross margin percentage */
	grossMarginPercent: number;
}

/**
 * Complete commission data for UI display
 */
export interface CommissionData {
	/** Commission percentage from partner contract */
	commissionPercent: number;
	/** Calculated commission amount */
	commissionAmount: number;
	/** Effective margin after commission */
	effectiveMargin: number;
	/** Effective margin percentage */
	effectiveMarginPercent: number;
	/** Net amount after commission */
	netAmountAfterCommission: number;
}

// ============================================================================
// Commission Calculation Functions
// ============================================================================

/**
 * Calculate commission for partner invoices
 *
 * Formula: commissionAmount = totalExclVat × (commissionPercent / 100)
 *
 * @param input - Commission calculation input
 * @returns Commission calculation result with amount and net value
 *
 * @example
 * ```typescript
 * const result = calculateCommission({
 *   totalExclVat: 150,
 *   commissionPercent: 10,
 * });
 * // result.commissionAmount = 15.00
 * // result.netAmountAfterCommission = 135.00
 * ```
 */
export function calculateCommission(
	input: CommissionCalculationInput,
): CommissionCalculationResult {
	const { totalExclVat, commissionPercent } = input;

	// Handle edge cases
	if (commissionPercent <= 0 || totalExclVat <= 0) {
		return {
			commissionAmount: 0,
			netAmountAfterCommission: Math.max(0, totalExclVat),
			commissionPercent: Math.max(0, commissionPercent),
		};
	}

	// Cap commission at 100%
	const effectivePercent = Math.min(commissionPercent, 100);

	// Calculate commission with proper rounding (2 decimal places)
	const commissionAmount =
		Math.round(((totalExclVat * effectivePercent) / 100) * 100) / 100;
	const netAmountAfterCommission =
		Math.round((totalExclVat - commissionAmount) * 100) / 100;

	return {
		commissionAmount,
		netAmountAfterCommission,
		commissionPercent: effectivePercent,
	};
}

/**
 * Calculate effective margin including commission
 *
 * Formula:
 * - Effective Margin = Selling Price - Internal Cost - Commission
 * - Effective Margin % = (Effective Margin / Selling Price) × 100
 *
 * Used by pricing engine for partner quotes to show true profitability.
 *
 * @param input - Effective margin calculation input
 * @returns Margin values including both gross and effective (after commission)
 *
 * @example
 * ```typescript
 * const result = calculateEffectiveMargin({
 *   sellingPrice: 150,
 *   internalCost: 80,
 *   commissionAmount: 15,
 * });
 * // result.grossMargin = 70 (150 - 80)
 * // result.grossMarginPercent = 46.67%
 * // result.margin = 55 (150 - 80 - 15)
 * // result.marginPercent = 36.67%
 * ```
 */
export function calculateEffectiveMargin(
	input: EffectiveMarginInput,
): EffectiveMarginResult {
	const { sellingPrice, internalCost, commissionAmount } = input;

	// Handle edge case: zero or negative selling price
	if (sellingPrice <= 0) {
		return {
			margin: -internalCost - commissionAmount,
			marginPercent: 0,
			grossMargin: -internalCost,
			grossMarginPercent: 0,
		};
	}

	// Calculate gross margin (before commission)
	const grossMargin = Math.round((sellingPrice - internalCost) * 100) / 100;
	const grossMarginPercent =
		Math.round(((grossMargin / sellingPrice) * 100) * 100) / 100;

	// Calculate effective margin (after commission)
	const margin =
		Math.round((sellingPrice - internalCost - commissionAmount) * 100) / 100;
	const marginPercent =
		Math.round(((margin / sellingPrice) * 100) * 100) / 100;

	return {
		margin,
		marginPercent,
		grossMargin,
		grossMarginPercent,
	};
}

/**
 * Get complete commission data for UI display
 *
 * Combines commission calculation and effective margin into a single
 * data structure suitable for TripTransparencyPanel and InvoiceDetail.
 *
 * @param sellingPrice - Final selling price
 * @param internalCost - Internal operational cost
 * @param commissionPercent - Commission percentage from partner contract
 * @returns Complete commission data for UI
 *
 * @example
 * ```typescript
 * const data = getCommissionData(150, 80, 10);
 * // data.commissionPercent = 10
 * // data.commissionAmount = 15.00
 * // data.effectiveMargin = 55.00
 * // data.effectiveMarginPercent = 36.67
 * // data.netAmountAfterCommission = 135.00
 * ```
 */
export function getCommissionData(
	sellingPrice: number,
	internalCost: number,
	commissionPercent: number,
): CommissionData {
	// Calculate commission
	const commissionResult = calculateCommission({
		totalExclVat: sellingPrice,
		commissionPercent,
	});

	// Calculate effective margin
	const marginResult = calculateEffectiveMargin({
		sellingPrice,
		internalCost,
		commissionAmount: commissionResult.commissionAmount,
	});

	return {
		commissionPercent: commissionResult.commissionPercent,
		commissionAmount: commissionResult.commissionAmount,
		effectiveMargin: marginResult.margin,
		effectiveMarginPercent: marginResult.marginPercent,
		netAmountAfterCommission: commissionResult.netAmountAfterCommission,
	};
}

/**
 * Contact type for commission functions
 * Supports Prisma Decimal type for commissionPercent
 */
type ContactWithContract = {
	isPartner: boolean;
	partnerContract?: {
		commissionPercent: number | string | { toString(): string } | null;
	} | null;
};

/**
 * Check if a contact has commission configured
 *
 * @param contact - Contact with optional partner contract
 * @returns True if contact is a partner with commission > 0
 */
export function hasCommission(contact: ContactWithContract): boolean {
	if (!contact.isPartner || !contact.partnerContract) {
		return false;
	}

	const rawPercent = contact.partnerContract.commissionPercent;
	const percent = typeof rawPercent === "object" && rawPercent !== null
		? Number(rawPercent.toString())
		: Number(rawPercent);
	return !isNaN(percent) && percent > 0;
}

/**
 * Extract commission percentage from contact
 *
 * @param contact - Contact with optional partner contract
 * @returns Commission percentage or 0 if not applicable
 */
export function getCommissionPercent(contact: ContactWithContract): number {
	if (!hasCommission(contact)) {
		return 0;
	}

	const rawPercent = contact.partnerContract!.commissionPercent;
	return typeof rawPercent === "object" && rawPercent !== null
		? Number(rawPercent.toString())
		: Number(rawPercent);
}
