/**
 * Seasonal Multiplier Types
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 */

// ============================================================================
// Core Types
// ============================================================================

export type SeasonalMultiplierStatus = "active" | "upcoming" | "expired";

export interface SeasonalMultiplier {
	id: string;
	name: string;
	description: string | null;
	startDate: string; // ISO date string
	endDate: string; // ISO date string
	multiplier: number;
	priority: number;
	isActive: boolean;
	vehicleCategoryIds: string[];
	vehicleCategoryNames: string[];
	status: SeasonalMultiplierStatus;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface SeasonalMultiplierStats {
	currentlyActive: number;
	upcoming: number;
	total: number;
}

export interface ListSeasonalMultipliersResponse {
	data: SeasonalMultiplier[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type SeasonalMultiplierStatsResponse = SeasonalMultiplierStats;

// ============================================================================
// API Request Types
// ============================================================================

export interface CreateSeasonalMultiplierRequest {
	name: string;
	description?: string | null;
	startDate: string;
	endDate: string;
	multiplier: number;
	priority?: number;
	isActive?: boolean;
	vehicleCategoryIds?: string[];
}

export interface UpdateSeasonalMultiplierRequest {
	name?: string;
	description?: string | null;
	startDate?: string;
	endDate?: string;
	multiplier?: number;
	priority?: number;
	isActive?: boolean;
	vehicleCategoryIds?: string[];
}

// ============================================================================
// Filter Types
// ============================================================================

export type SeasonalMultiplierStatusFilter = "all" | "active" | "upcoming" | "expired";

export interface SeasonalMultiplierFilters {
	status?: SeasonalMultiplierStatusFilter;
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
export function getStatusColor(status: SeasonalMultiplierStatus): string {
	switch (status) {
		case "active":
			return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
		case "upcoming":
			return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
		case "expired":
			return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

/**
 * Format multiplier as percentage change
 * e.g., 1.3 -> "+30%", 0.8 -> "-20%"
 */
export function formatMultiplierAsPercent(multiplier: number): string {
	const percentChange = (multiplier - 1) * 100;
	const sign = percentChange >= 0 ? "+" : "";
	return `${sign}${percentChange.toFixed(0)}%`;
}

/**
 * Format multiplier as factor
 * e.g., 1.3 -> "1.30x"
 */
export function formatMultiplierAsFactor(multiplier: number): string {
	return `${multiplier.toFixed(2)}x`;
}

/**
 * Format date range for display
 */
export function formatDateRange(startDate: string, endDate: string, locale = "fr-FR"): string {
	const start = new Date(startDate);
	const end = new Date(endDate);
	const formatter = new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
	return `${formatter.format(start)} - ${formatter.format(end)}`;
}

/**
 * Format single date for display
 */
export function formatDate(date: string, locale = "fr-FR"): string {
	return new Intl.DateTimeFormat(locale, {
		day: "numeric",
		month: "short",
		year: "numeric",
	}).format(new Date(date));
}

/**
 * Convert Date to ISO date string (YYYY-MM-DD)
 */
export function toISODateString(date: Date): string {
	return date.toISOString().split("T")[0];
}
