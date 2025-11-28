/**
 * Invoice Line Builder Service
 * Story 7.3: Implement VAT Breakdown for Transport & Ancillary Services
 *
 * Extracts optional fees and promotions from quote's appliedRules
 * and builds invoice lines with appropriate VAT rates.
 */

// ============================================================================
// Types
// ============================================================================

export interface AppliedOptionalFee {
	id: string;
	name: string;
	description?: string;
	amount: number;
	vatRate: number;
	isTaxable: boolean;
}

export interface AppliedPromotion {
	id: string;
	code: string;
	description?: string;
	discountAmount: number;
	discountType: "FIXED" | "PERCENTAGE";
}

export interface ParsedAppliedRules {
	optionalFees: AppliedOptionalFee[];
	promotions: AppliedPromotion[];
}

export interface InvoiceLineInput {
	lineType: "SERVICE" | "OPTIONAL_FEE" | "PROMOTION_ADJUSTMENT" | "OTHER";
	description: string;
	quantity: number;
	unitPriceExclVat: number;
	vatRate: number;
	totalExclVat: number;
	totalVat: number;
	sortOrder: number;
}

export interface InvoiceTotals {
	totalExclVat: number;
	totalVat: number;
	totalInclVat: number;
}

// ============================================================================
// Constants
// ============================================================================

/** Transport VAT rate in France (10%) */
export const TRANSPORT_VAT_RATE = 10;

/** Default VAT rate for ancillary services in France (20%) */
export const DEFAULT_ANCILLARY_VAT_RATE = 20;

// ============================================================================
// Parser Functions
// ============================================================================

/**
 * Parse appliedRules JSON from a quote to extract optional fees and promotions.
 * Handles null, undefined, or malformed data gracefully.
 *
 * @param appliedRules - The appliedRules JSON field from a Quote
 * @returns Parsed optional fees and promotions
 */
export function parseAppliedRules(appliedRules: unknown): ParsedAppliedRules {
	const result: ParsedAppliedRules = {
		optionalFees: [],
		promotions: [],
	};

	if (!appliedRules || typeof appliedRules !== "object") {
		return result;
	}

	const rules = appliedRules as Record<string, unknown>;

	// Parse optional fees (check both legacy 'optionalFees' and new 'selectedOptionalFees' format)
	const optionalFeesArray = Array.isArray(rules.optionalFees) 
		? rules.optionalFees 
		: Array.isArray(rules.selectedOptionalFees) 
			? rules.selectedOptionalFees 
			: [];
	
	for (const fee of optionalFeesArray) {
		if (isValidOptionalFee(fee)) {
			result.optionalFees.push({
				id: String(fee.id || ""),
				name: String(fee.name || "Optional Fee"),
				description: fee.description ? String(fee.description) : undefined,
				amount: Number(fee.amount) || 0,
				vatRate: fee.vatRate !== undefined ? Number(fee.vatRate) : DEFAULT_ANCILLARY_VAT_RATE,
				isTaxable: fee.isTaxable !== false, // Default to true
			});
		}
	}

	// Parse promotions
	if (Array.isArray(rules.promotions)) {
		for (const promo of rules.promotions) {
			if (isValidPromotion(promo)) {
				result.promotions.push({
					id: String(promo.id || ""),
					code: String(promo.code || "PROMO"),
					description: promo.description ? String(promo.description) : undefined,
					discountAmount: Math.abs(Number(promo.discountAmount) || 0),
					discountType: promo.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
				});
			}
		}
	}

	// Also check for single promotion (legacy format)
	if (rules.promotion && typeof rules.promotion === "object") {
		const promo = rules.promotion as Record<string, unknown>;
		if (isValidPromotion(promo)) {
			result.promotions.push({
				id: String(promo.id || ""),
				code: String(promo.code || "PROMO"),
				description: promo.description ? String(promo.description) : undefined,
				discountAmount: Math.abs(Number(promo.discountAmount) || 0),
				discountType: promo.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
			});
		}
	}

	// Parse addedFees (manually added fees and promotions via dialog)
	if (Array.isArray(rules.addedFees)) {
		for (const addedFee of rules.addedFees) {
			if (addedFee && typeof addedFee === "object") {
				const fee = addedFee as Record<string, unknown>;
				if (fee.type === "fee") {
					// It's a fee
					result.optionalFees.push({
						id: String(fee.id || ""),
						name: String(fee.name || "Custom Fee"),
						description: fee.description ? String(fee.description) : undefined,
						amount: Number(fee.amount) || 0,
						vatRate: fee.vatRate !== undefined ? Number(fee.vatRate) : DEFAULT_ANCILLARY_VAT_RATE,
						isTaxable: true,
					});
				} else if (fee.type === "promotion") {
					// It's a promotion
					result.promotions.push({
						id: String(fee.id || ""),
						code: fee.promoCode ? String(fee.promoCode) : "PROMO",
						description: fee.description ? String(fee.description) : undefined,
						discountAmount: Math.abs(Number(fee.amount) || 0),
						discountType: fee.discountType === "PERCENTAGE" ? "PERCENTAGE" : "FIXED",
					});
				}
			}
		}
	}

	return result;
}

/**
 * Type guard for optional fee objects
 */
function isValidOptionalFee(obj: unknown): obj is Record<string, unknown> {
	if (!obj || typeof obj !== "object") return false;
	const fee = obj as Record<string, unknown>;
	return typeof fee.amount === "number" && fee.amount > 0;
}

/**
 * Type guard for promotion objects
 */
function isValidPromotion(obj: unknown): obj is Record<string, unknown> {
	if (!obj || typeof obj !== "object") return false;
	const promo = obj as Record<string, unknown>;
	return typeof promo.discountAmount === "number" && promo.discountAmount !== 0;
}

// ============================================================================
// Line Builder Functions
// ============================================================================

/**
 * Round a number to 2 decimal places for currency
 */
function roundCurrency(value: number): number {
	return Math.round(value * 100) / 100;
}

/**
 * Calculate VAT amount from excl. VAT amount and rate
 */
function calculateVat(amountExclVat: number, vatRate: number): number {
	return roundCurrency(amountExclVat * (vatRate / 100));
}

/**
 * Build invoice lines from quote data and parsed applied rules.
 *
 * @param transportAmount - The base transport amount (quote.finalPrice minus fees/promos)
 * @param pickupAddress - Pickup address for description
 * @param dropoffAddress - Dropoff address for description
 * @param parsedRules - Parsed optional fees and promotions
 * @returns Array of invoice line inputs
 */
export function buildInvoiceLines(
	transportAmount: number,
	pickupAddress: string,
	dropoffAddress: string,
	parsedRules: ParsedAppliedRules,
): InvoiceLineInput[] {
	const lines: InvoiceLineInput[] = [];
	let sortOrder = 0;

	// 1. Transport line (always present)
	const transportExclVat = roundCurrency(transportAmount);
	const transportVat = calculateVat(transportExclVat, TRANSPORT_VAT_RATE);

	lines.push({
		lineType: "SERVICE",
		description: `Transport: ${pickupAddress} → ${dropoffAddress}`,
		quantity: 1,
		unitPriceExclVat: transportExclVat,
		vatRate: TRANSPORT_VAT_RATE,
		totalExclVat: transportExclVat,
		totalVat: transportVat,
		sortOrder: sortOrder++,
	});

	// 2. Optional fee lines
	for (const fee of parsedRules.optionalFees) {
		const feeExclVat = roundCurrency(fee.amount);
		const effectiveVatRate = fee.isTaxable ? fee.vatRate : 0;
		const feeVat = calculateVat(feeExclVat, effectiveVatRate);

		lines.push({
			lineType: "OPTIONAL_FEE",
			description: fee.name,
			quantity: 1,
			unitPriceExclVat: feeExclVat,
			vatRate: effectiveVatRate,
			totalExclVat: feeExclVat,
			totalVat: feeVat,
			sortOrder: sortOrder++,
		});
	}

	// 3. Promotion adjustment lines (negative amounts)
	for (const promo of parsedRules.promotions) {
		const discountExclVat = roundCurrency(-promo.discountAmount); // Negative
		// Promotions apply to transport, so use transport VAT rate
		const discountVat = calculateVat(discountExclVat, TRANSPORT_VAT_RATE);

		lines.push({
			lineType: "PROMOTION_ADJUSTMENT",
			description: `Promotion: ${promo.code}`,
			quantity: 1,
			unitPriceExclVat: discountExclVat,
			vatRate: TRANSPORT_VAT_RATE,
			totalExclVat: discountExclVat,
			totalVat: discountVat,
			sortOrder: sortOrder++,
		});
	}

	return lines;
}

/**
 * Calculate invoice totals from lines.
 * Ensures rounding consistency.
 *
 * @param lines - Array of invoice lines
 * @returns Invoice totals
 */
export function calculateInvoiceTotals(lines: InvoiceLineInput[]): InvoiceTotals {
	let totalExclVat = 0;
	let totalVat = 0;

	for (const line of lines) {
		totalExclVat += line.totalExclVat;
		totalVat += line.totalVat;
	}

	// Round final totals
	totalExclVat = roundCurrency(totalExclVat);
	totalVat = roundCurrency(totalVat);
	const totalInclVat = roundCurrency(totalExclVat + totalVat);

	return {
		totalExclVat,
		totalVat,
		totalInclVat,
	};
}

/**
 * Calculate the transport amount by subtracting optional fees from final price.
 * This is needed because finalPrice includes everything.
 *
 * @param finalPrice - The quote's final price
 * @param parsedRules - Parsed optional fees and promotions
 * @returns The transport-only amount
 */
export function calculateTransportAmount(
	finalPrice: number,
	parsedRules: ParsedAppliedRules,
): number {
	let transportAmount = finalPrice;

	// Subtract optional fees (they are added on top)
	for (const fee of parsedRules.optionalFees) {
		transportAmount -= fee.amount;
	}

	// Add back promotions (they are discounts, so negative in finalPrice)
	for (const promo of parsedRules.promotions) {
		transportAmount += promo.discountAmount;
	}

	return roundCurrency(transportAmount);
}
