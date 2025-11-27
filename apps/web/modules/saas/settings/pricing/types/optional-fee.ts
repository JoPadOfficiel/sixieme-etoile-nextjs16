/**
 * Optional Fee Types
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
 */

// ============================================================================
// Core Types
// ============================================================================

export type AmountType = "FIXED" | "PERCENTAGE";

export type AutoApplyRuleType =
	| "AIRPORT_PICKUP"
	| "AIRPORT_DROPOFF"
	| "BAGGAGE_OVER_CAPACITY"
	| "NIGHT_SERVICE"
	| "CUSTOM";

export interface AutoApplyRule {
	type: AutoApplyRuleType;
	condition?: string;
}

export interface OptionalFee {
	id: string;
	name: string;
	description: string | null;
	amountType: AmountType;
	amount: number;
	isTaxable: boolean;
	vatRate: number;
	autoApplyRules: AutoApplyRule[] | null;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface OptionalFeeStats {
	fixed: number;
	percentage: number;
	taxable: number;
	totalActive: number;
}

export interface ListOptionalFeesResponse {
	data: OptionalFee[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type OptionalFeeStatsResponse = OptionalFeeStats;

// ============================================================================
// API Request Types
// ============================================================================

export interface CreateOptionalFeeRequest {
	name: string;
	description?: string | null;
	amountType: AmountType;
	amount: number;
	isTaxable?: boolean;
	vatRate?: number;
	autoApplyRules?: AutoApplyRule[] | null;
	isActive?: boolean;
}

export interface UpdateOptionalFeeRequest {
	name?: string;
	description?: string | null;
	amountType?: AmountType;
	amount?: number;
	isTaxable?: boolean;
	vatRate?: number;
	autoApplyRules?: AutoApplyRule[] | null;
	isActive?: boolean;
}

// ============================================================================
// Filter Types
// ============================================================================

export type OptionalFeeTypeFilter = "all" | "FIXED" | "PERCENTAGE";
export type OptionalFeeStatusFilter = "all" | "active" | "inactive";

export interface OptionalFeeFilters {
	type?: OptionalFeeTypeFilter;
	status?: OptionalFeeStatusFilter;
	search?: string;
	page?: number;
	limit?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get status badge color classes
 */
export function getStatusColor(isActive: boolean): string {
	if (isActive) {
		return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
	}
	return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

/**
 * Get amount type badge color classes
 */
export function getAmountTypeColor(amountType: AmountType): string {
	switch (amountType) {
		case "FIXED":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		case "PERCENTAGE":
			return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

/**
 * Format amount for display
 * e.g., FIXED: 15 -> "15.00€", PERCENTAGE: 10 -> "10%"
 */
export function formatAmount(amount: number, amountType: AmountType): string {
	if (amountType === "FIXED") {
		return `${amount.toFixed(2)}€`;
	}
	return `${amount.toFixed(0)}%`;
}

/**
 * Format VAT rate for display
 * e.g., 20 -> "20%", null/0 -> "N/A"
 */
export function formatVatRate(vatRate: number | null, isTaxable: boolean): string {
	if (!isTaxable || vatRate === null) {
		return "N/A";
	}
	return `${vatRate.toFixed(0)}%`;
}

/**
 * Get auto-apply rules count text
 */
export function getAutoApplyRulesText(rules: AutoApplyRule[] | null): string {
	if (!rules || rules.length === 0) {
		return "None";
	}
	return `${rules.length} rule${rules.length > 1 ? "s" : ""}`;
}

/**
 * Check if fee has auto-apply rules
 */
export function hasAutoApplyRules(rules: AutoApplyRule[] | null): boolean {
	return rules !== null && rules.length > 0;
}

/**
 * Get auto-apply rule type label
 */
export function getAutoApplyRuleLabel(type: AutoApplyRuleType): string {
	const labels: Record<AutoApplyRuleType, string> = {
		AIRPORT_PICKUP: "Airport Pickup",
		AIRPORT_DROPOFF: "Airport Dropoff",
		BAGGAGE_OVER_CAPACITY: "Baggage Over Capacity",
		NIGHT_SERVICE: "Night Service",
		CUSTOM: "Custom",
	};
	return labels[type] || type;
}
