/**
 * Promotion Types
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 */

// ============================================================================
// Core Types
// ============================================================================

export type DiscountType = "FIXED" | "PERCENTAGE";

export type PromotionStatus = "active" | "expired" | "upcoming" | "inactive";

export interface Promotion {
	id: string;
	code: string;
	description: string | null;
	discountType: DiscountType;
	value: number;
	validFrom: string;
	validTo: string;
	maxTotalUses: number | null;
	maxUsesPerContact: number | null;
	currentUses: number;
	isActive: boolean;
	status: PromotionStatus;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PromotionStats {
	active: number;
	expired: number;
	upcoming: number;
	totalUses: number;
}

export interface ListPromotionsResponse {
	data: Promotion[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type PromotionStatsResponse = PromotionStats;

export interface ValidatePromoCodeResponse {
	valid: boolean;
	promotion?: Promotion;
	reason?: "NOT_FOUND" | "EXPIRED" | "NOT_STARTED" | "USAGE_LIMIT_REACHED" | "INACTIVE";
}

// ============================================================================
// API Request Types
// ============================================================================

export interface CreatePromotionRequest {
	code: string;
	description?: string | null;
	discountType: DiscountType;
	value: number;
	validFrom: string;
	validTo: string;
	maxTotalUses?: number | null;
	maxUsesPerContact?: number | null;
	isActive?: boolean;
}

export interface UpdatePromotionRequest {
	code?: string;
	description?: string | null;
	discountType?: DiscountType;
	value?: number;
	validFrom?: string;
	validTo?: string;
	maxTotalUses?: number | null;
	maxUsesPerContact?: number | null;
	isActive?: boolean;
}

// ============================================================================
// Filter Types
// ============================================================================

export type PromotionTypeFilter = "all" | "FIXED" | "PERCENTAGE";
export type PromotionStatusFilter = "all" | "active" | "expired" | "upcoming" | "inactive";

export interface PromotionFilters {
	type?: PromotionTypeFilter;
	status?: PromotionStatusFilter;
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
export function getPromotionStatusColor(status: PromotionStatus): string {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
		case "expired":
			return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
		case "upcoming":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		case "inactive":
			return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

/**
 * Get discount type badge color classes
 */
export function getDiscountTypeColor(discountType: DiscountType): string {
	switch (discountType) {
		case "FIXED":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		case "PERCENTAGE":
			return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

/**
 * Format discount value for display
 * e.g., FIXED: 20 -> "-20.00€", PERCENTAGE: 15 -> "-15%"
 */
export function formatDiscountValue(value: number, discountType: DiscountType): string {
	if (discountType === "FIXED") {
		return `-${value.toFixed(2)}€`;
	}
	return `-${value.toFixed(0)}%`;
}

/**
 * Format usage for display
 * e.g., currentUses: 5, maxTotalUses: 100 -> "5/100"
 * e.g., currentUses: 5, maxTotalUses: null -> "5/∞"
 */
export function formatUsage(currentUses: number, maxTotalUses: number | null): string {
	if (maxTotalUses === null) {
		return `${currentUses}/∞`;
	}
	return `${currentUses}/${maxTotalUses}`;
}

/**
 * Format date for display (short format)
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	return date.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
	});
}

/**
 * Format date for input (YYYY-MM-DD)
 */
export function formatDateForInput(dateString: string): string {
	const date = new Date(dateString);
	return date.toISOString().split("T")[0];
}

/**
 * Get status label for display
 */
export function getPromotionStatusLabel(status: PromotionStatus): string {
	const labels: Record<PromotionStatus, string> = {
		active: "Active",
		expired: "Expired",
		upcoming: "Upcoming",
		inactive: "Inactive",
	};
	return labels[status] || status;
}

/**
 * Check if promotion can still be used
 */
export function isPromotionUsable(promotion: Promotion): boolean {
	return promotion.status === "active";
}

/**
 * Get validation reason label
 */
export function getValidationReasonLabel(
	reason: ValidatePromoCodeResponse["reason"]
): string {
	const labels: Record<NonNullable<ValidatePromoCodeResponse["reason"]>, string> = {
		NOT_FOUND: "Promo code not found",
		EXPIRED: "Promo code has expired",
		NOT_STARTED: "Promo code is not yet valid",
		USAGE_LIMIT_REACHED: "Usage limit reached",
		INACTIVE: "Promo code is inactive",
	};
	return reason ? labels[reason] : "Unknown error";
}
