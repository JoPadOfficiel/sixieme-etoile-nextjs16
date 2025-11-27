/**
 * Advanced Rate Modifier Types
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 */

// ============================================================================
// Core Types
// ============================================================================

export type AdvancedRateAppliesTo =
	| "NIGHT"
	| "WEEKEND"
	| "LONG_DISTANCE"
	| "ZONE_SCENARIO"
	| "HOLIDAY";

export type AdjustmentType = "PERCENTAGE" | "FIXED_AMOUNT";

export interface AdvancedRate {
	id: string;
	name: string;
	appliesTo: AdvancedRateAppliesTo;
	startTime: string | null;
	endTime: string | null;
	daysOfWeek: string | null;
	minDistanceKm: number | null;
	maxDistanceKm: number | null;
	zoneId: string | null;
	zoneName: string | null;
	adjustmentType: AdjustmentType;
	value: number;
	priority: number;
	isActive: boolean;
	createdAt: string;
	updatedAt: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface AdvancedRateStats {
	night: number;
	weekend: number;
	longDistance: number;
	zoneScenario: number;
	holiday: number;
	totalActive: number;
}

export interface ListAdvancedRatesResponse {
	data: AdvancedRate[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export type AdvancedRateStatsResponse = AdvancedRateStats;

// ============================================================================
// API Request Types
// ============================================================================

export interface CreateAdvancedRateRequest {
	name: string;
	appliesTo: AdvancedRateAppliesTo;
	startTime?: string | null;
	endTime?: string | null;
	daysOfWeek?: string | null;
	minDistanceKm?: number | null;
	maxDistanceKm?: number | null;
	zoneId?: string | null;
	adjustmentType: AdjustmentType;
	value: number;
	priority?: number;
	isActive?: boolean;
}

export interface UpdateAdvancedRateRequest {
	name?: string;
	appliesTo?: AdvancedRateAppliesTo;
	startTime?: string | null;
	endTime?: string | null;
	daysOfWeek?: string | null;
	minDistanceKm?: number | null;
	maxDistanceKm?: number | null;
	zoneId?: string | null;
	adjustmentType?: AdjustmentType;
	value?: number;
	priority?: number;
	isActive?: boolean;
}

// ============================================================================
// Filter Types
// ============================================================================

export type AdvancedRateTypeFilter =
	| "all"
	| "NIGHT"
	| "WEEKEND"
	| "LONG_DISTANCE"
	| "ZONE_SCENARIO"
	| "HOLIDAY";

export type AdvancedRateStatusFilter = "all" | "active" | "inactive";

export interface AdvancedRateFilters {
	type?: AdvancedRateTypeFilter;
	status?: AdvancedRateStatusFilter;
	search?: string;
	page?: number;
	limit?: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get type badge color classes
 */
export function getTypeColor(type: AdvancedRateAppliesTo): string {
	switch (type) {
		case "NIGHT":
			return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
		case "WEEKEND":
			return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
		case "LONG_DISTANCE":
			return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
		case "ZONE_SCENARIO":
			return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200";
		case "HOLIDAY":
			return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200";
		default:
			return "bg-gray-100 text-gray-800";
	}
}

/**
 * Get status badge color classes
 */
export function getStatusColor(isActive: boolean): string {
	return isActive
		? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
		: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200";
}

/**
 * Format adjustment value for display
 * e.g., PERCENTAGE 20 -> "+20%", FIXED_AMOUNT 15 -> "+15.00€"
 */
export function formatAdjustment(
	adjustmentType: AdjustmentType,
	value: number
): string {
	const sign = value >= 0 ? "+" : "";
	if (adjustmentType === "PERCENTAGE") {
		return `${sign}${value.toFixed(0)}%`;
	}
	return `${sign}${value.toFixed(2)}€`;
}

/**
 * Format time range for display
 */
export function formatTimeRange(
	startTime: string | null,
	endTime: string | null
): string {
	if (!startTime || !endTime) return "-";
	return `${startTime} - ${endTime}`;
}

/**
 * Format days of week for display
 */
export function formatDaysOfWeek(
	daysOfWeek: string | null,
	dayNames: Record<string, string>
): string {
	if (!daysOfWeek) return "-";
	const days = daysOfWeek.split(",").map((d) => d.trim());
	return days.map((d) => dayNames[d] || d).join(", ");
}

/**
 * Format distance range for display
 */
export function formatDistanceRange(
	minDistanceKm: number | null,
	maxDistanceKm: number | null
): string {
	if (minDistanceKm === null) return "-";
	if (maxDistanceKm === null) {
		return `≥ ${minDistanceKm}km`;
	}
	return `${minDistanceKm}km - ${maxDistanceKm}km`;
}

/**
 * Get conditions display based on rate type
 */
export function getConditionsDisplay(
	rate: AdvancedRate,
	dayNames: Record<string, string>
): string {
	switch (rate.appliesTo) {
		case "NIGHT":
			return formatTimeRange(rate.startTime, rate.endTime);
		case "WEEKEND":
		case "HOLIDAY":
			const time = formatTimeRange(rate.startTime, rate.endTime);
			const days = formatDaysOfWeek(rate.daysOfWeek, dayNames);
			return `${time} (${days})`;
		case "LONG_DISTANCE":
			return formatDistanceRange(rate.minDistanceKm, rate.maxDistanceKm);
		case "ZONE_SCENARIO":
			return rate.zoneName ? `Zone: ${rate.zoneName}` : "-";
		default:
			return "-";
	}
}

/**
 * Check if time fields are required for a given type
 */
export function requiresTimeFields(type: AdvancedRateAppliesTo): boolean {
	return type === "NIGHT" || type === "WEEKEND" || type === "HOLIDAY";
}

/**
 * Check if days of week field is required for a given type
 */
export function requiresDaysOfWeek(type: AdvancedRateAppliesTo): boolean {
	return type === "WEEKEND" || type === "HOLIDAY";
}

/**
 * Check if distance fields are required for a given type
 */
export function requiresDistanceFields(type: AdvancedRateAppliesTo): boolean {
	return type === "LONG_DISTANCE";
}

/**
 * Check if zone field is required for a given type
 */
export function requiresZoneField(type: AdvancedRateAppliesTo): boolean {
	return type === "ZONE_SCENARIO";
}

/**
 * Parse days of week string to array of numbers
 */
export function parseDaysOfWeek(daysOfWeek: string | null): number[] {
	if (!daysOfWeek) return [];
	return daysOfWeek
		.split(",")
		.map((d) => parseInt(d.trim(), 10))
		.filter((d) => !isNaN(d));
}

/**
 * Format array of day numbers to comma-separated string
 */
export function formatDaysOfWeekToString(days: number[]): string {
	return days.sort((a, b) => a - b).join(",");
}
