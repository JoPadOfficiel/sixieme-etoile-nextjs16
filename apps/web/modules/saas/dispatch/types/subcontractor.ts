/**
 * Subcontractor Types
 * Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions
 */

// ============================================================================
// Subcontractor Types
// ============================================================================

export interface SubcontractorContact {
	id: string;
	displayName: string;
	email: string | null;
	phone: string | null;
	companyName: string | null;
}

export interface SubcontractorZone {
	id: string;
	name: string;
	code: string;
}

export interface SubcontractorVehicleCategory {
	id: string;
	name: string;
	code: string;
}

export interface SubcontractorListItem {
	id: string;
	contact: SubcontractorContact;
	operatingZones: SubcontractorZone[];
	vehicleCategories: SubcontractorVehicleCategory[];
	ratePerKm: number | null;
	ratePerHour: number | null;
	minimumFare: number | null;
	isActive: boolean;
	notes?: string | null;
	createdAt?: string;
	updatedAt?: string;
}

// ============================================================================
// Subcontracting Suggestion Types
// ============================================================================

export interface MarginComparison {
	internalCost: number;
	subcontractorCost: number;
	savings: number;
	savingsPercent: number;
	recommendation: "SUBCONTRACT" | "INTERNAL" | "REVIEW";
}

export interface ZoneMatch {
	pickup: boolean;
	dropoff: boolean;
	score: number;
}

export interface SubcontractingSuggestion {
	subcontractorId: string;
	subcontractor: {
		id: string;
		displayName: string;
		email: string | null;
		phone: string | null;
		companyName: string | null;
	};
	estimatedPrice: number;
	marginIfSubcontracted: number;
	marginPercentIfSubcontracted: number;
	comparison: MarginComparison;
	zoneMatch: ZoneMatch;
}

export interface SubcontractingSuggestionsResult {
	mission: {
		id: string;
		sellingPrice: number;
		internalCost: number;
		marginPercent: number;
	};
	isUnprofitable: boolean;
	unprofitableThreshold: number;
	unprofitableReason: string | null;
	suggestions: SubcontractingSuggestion[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface ListSubcontractorsResponse {
	subcontractors: SubcontractorListItem[];
	total: number;
}

export interface SubcontractorDetailResponse {
	subcontractor: SubcontractorListItem;
}

export interface CreateSubcontractorRequest {
	contactId: string;
	operatingZoneIds?: string[];
	vehicleCategoryIds?: string[];
	ratePerKm?: number;
	ratePerHour?: number;
	minimumFare?: number;
	notes?: string;
}

export interface UpdateSubcontractorRequest {
	operatingZoneIds?: string[];
	vehicleCategoryIds?: string[];
	ratePerKm?: number | null;
	ratePerHour?: number | null;
	minimumFare?: number | null;
	notes?: string | null;
	isActive?: boolean;
}

export interface SubcontractMissionRequest {
	subcontractorId: string;
	agreedPrice: number;
	notes?: string;
}

export interface SubcontractMissionResponse {
	success: boolean;
	mission: {
		id: string;
		isSubcontracted: boolean;
		subcontractorId: string;
		subcontractedPrice: number;
	};
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get recommendation badge color
 */
export function getRecommendationColor(recommendation: MarginComparison["recommendation"]): string {
	switch (recommendation) {
		case "SUBCONTRACT":
			return "text-green-600 bg-green-50";
		case "INTERNAL":
			return "text-blue-600 bg-blue-50";
		case "REVIEW":
			return "text-amber-600 bg-amber-50";
		default:
			return "text-gray-600 bg-gray-50";
	}
}

/**
 * Get zone match badge
 */
export function getZoneMatchLabel(zoneMatch: ZoneMatch): string {
	if (zoneMatch.pickup && zoneMatch.dropoff) {
		return "Full match";
	}
	if (zoneMatch.pickup) {
		return "Pickup match";
	}
	if (zoneMatch.dropoff) {
		return "Dropoff match";
	}
	return "No match";
}

/**
 * Format price in EUR
 */
export function formatPrice(price: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
	}).format(price);
}

/**
 * Format percentage
 */
export function formatPercent(value: number): string {
	return `${value >= 0 ? "+" : ""}${value.toFixed(1)}%`;
}
