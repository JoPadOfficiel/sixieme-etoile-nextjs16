/**
 * Empty-Leg Types
 *
 * Story 8.5: Model & Surface Empty-Leg Opportunities
 */

// ============================================================================
// Pricing Strategy Types
// ============================================================================

export type PricingStrategyType =
	| "PERCENTAGE_DISCOUNT"
	| "FIXED_PRICE"
	| "COST_PLUS_MARGIN";

export interface PercentageDiscountStrategy {
	type: "PERCENTAGE_DISCOUNT";
	value: number; // e.g., 30 for 30% off
}

export interface FixedPriceStrategy {
	type: "FIXED_PRICE";
	value: number; // e.g., 50 for €50
}

export interface CostPlusMarginStrategy {
	type: "COST_PLUS_MARGIN";
	marginPercent: number; // e.g., 10 for cost + 10%
}

export type PricingStrategy =
	| PercentageDiscountStrategy
	| FixedPriceStrategy
	| CostPlusMarginStrategy;

// ============================================================================
// Empty-Leg Status
// ============================================================================

export type EmptyLegStatus = "AVAILABLE" | "EXPIRING_SOON" | "EXPIRED";

// ============================================================================
// Empty-Leg Data Types
// ============================================================================

export interface EmptyLegCorridor {
	fromAddress: string | null;
	fromLatitude: number | null;
	fromLongitude: number | null;
	toAddress: string | null;
	toLatitude: number | null;
	toLongitude: number | null;
}

export interface EmptyLegVehicle {
	id: string;
	name: string;
	category: {
		id: string;
		name: string;
		code: string;
	};
}

export interface EmptyLegListItem {
	id: string;
	vehicle: EmptyLegVehicle;
	corridor: EmptyLegCorridor;
	estimatedDistanceKm: number | null;
	estimatedDurationMins: number | null;
	windowStart: string;
	windowEnd: string;
	pricingStrategy: PricingStrategy | null;
	status: EmptyLegStatus;
	isActive: boolean;
	sourceMissionId: string | null;
	notes: string | null;
	createdAt: string;
}

export interface EmptyLegDetail extends EmptyLegListItem {
	vehicle: EmptyLegVehicle & {
		registrationNumber: string;
		base: {
			id: string;
			name: string;
			address: string;
		};
	};
	corridor: EmptyLegCorridor & {
		fromZone: { id: string; name: string; code: string } | null;
		toZone: { id: string; name: string; code: string } | null;
	};
	updatedAt: string;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface ListEmptyLegsParams {
	page?: number;
	limit?: number;
	vehicleId?: string;
	fromDate?: string;
	toDate?: string;
	includeExpired?: boolean;
}

export interface ListEmptyLegsResponse {
	data: EmptyLegListItem[];
	meta: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
	};
}

export interface CreateEmptyLegRequest {
	vehicleId: string;
	fromAddress?: string;
	fromLatitude?: number;
	fromLongitude?: number;
	fromZoneId?: string;
	toAddress?: string;
	toLatitude?: number;
	toLongitude?: number;
	toZoneId?: string;
	windowStart: string;
	windowEnd: string;
	pricingStrategy?: PricingStrategy;
	notes?: string;
}

export interface UpdateEmptyLegRequest {
	fromAddress?: string;
	fromLatitude?: number;
	fromLongitude?: number;
	toAddress?: string;
	toLatitude?: number;
	toLongitude?: number;
	windowStart?: string;
	windowEnd?: string;
	pricingStrategy?: PricingStrategy | null;
	isActive?: boolean;
	notes?: string | null;
}

export interface CreateEmptyLegFromMissionRequest {
	windowEndHours?: number;
	pricingStrategy?: PricingStrategy;
}

export interface MatchEmptyLegsParams {
	pickupLatitude: number;
	pickupLongitude: number;
	dropoffLatitude: number;
	dropoffLongitude: number;
	pickupAt: string;
	maxDistanceKm?: number;
}

export interface EmptyLegMatch {
	emptyLegId: string;
	emptyLeg: EmptyLegListItem;
	matchScore: number;
	pickupProximityKm: number;
	dropoffProximityKm: number;
}

export interface MatchEmptyLegsResponse {
	matches: EmptyLegMatch[];
	request: MatchEmptyLegsParams;
}

export interface CreateEmptyLegFromMissionResponse {
	success: boolean;
	message: string;
	emptyLeg: EmptyLegListItem;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format pricing strategy for display
 */
export function formatPricingStrategy(strategy: PricingStrategy | null): string {
	if (!strategy) {
		return "Standard pricing";
	}

	switch (strategy.type) {
		case "PERCENTAGE_DISCOUNT":
			return `${strategy.value}% off`;
		case "FIXED_PRICE":
			return `€${strategy.value} flat`;
		case "COST_PLUS_MARGIN":
			return `Cost + ${strategy.marginPercent}%`;
		default:
			return "Standard pricing";
	}
}

/**
 * Get status badge variant
 */
export function getStatusBadgeVariant(
	status: EmptyLegStatus,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "AVAILABLE":
			return "default";
		case "EXPIRING_SOON":
			return "secondary";
		case "EXPIRED":
			return "destructive";
		default:
			return "outline";
	}
}

/**
 * Calculate time remaining until window end
 */
export function getTimeRemaining(windowEnd: string): {
	hours: number;
	minutes: number;
	isExpired: boolean;
	formatted: string;
} {
	const now = new Date();
	const end = new Date(windowEnd);
	const diff = end.getTime() - now.getTime();

	if (diff <= 0) {
		return { hours: 0, minutes: 0, isExpired: true, formatted: "Expired" };
	}

	const hours = Math.floor(diff / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	let formatted: string;
	if (hours > 0) {
		formatted = `${hours}h ${minutes}m`;
	} else {
		formatted = `${minutes}m`;
	}

	return { hours, minutes, isExpired: false, formatted };
}

/**
 * Format corridor for display
 */
export function formatCorridor(corridor: EmptyLegCorridor): string {
	const from = corridor.fromAddress || "Unknown";
	const to = corridor.toAddress || "Unknown";

	// Truncate long addresses
	const maxLen = 30;
	const fromShort = from.length > maxLen ? `${from.slice(0, maxLen)}...` : from;
	const toShort = to.length > maxLen ? `${to.slice(0, maxLen)}...` : to;

	return `${fromShort} → ${toShort}`;
}
