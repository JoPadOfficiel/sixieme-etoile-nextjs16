/**
 * Empty-Leg Service
 *
 * Story 8.5: Model & Surface Empty-Leg Opportunities
 *
 * This service provides functionality to:
 * - Detect empty-leg opportunities from confirmed missions
 * - Match booking requests to available empty legs
 * - Calculate pricing for empty-leg bookings
 * - Manage empty-leg lifecycle (creation, expiration)
 *
 * @see FR53 - Empty-leg detection and pricing strategies
 */

import { haversineDistance, type GeoPoint } from "../lib/geo-utils";

// ============================================================================
// Types
// ============================================================================

/**
 * Pricing strategy types for empty legs
 */
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

/**
 * Empty-leg status based on time window
 */
export type EmptyLegStatus = "AVAILABLE" | "EXPIRING_SOON" | "EXPIRED";

/**
 * Configuration for empty-leg detection and matching
 */
export interface EmptyLegConfig {
	/** Default time window duration in hours after dropoff */
	defaultWindowHours: number;
	/** Maximum distance in km for matching pickup/dropoff to empty leg corridor */
	maxMatchDistanceKm: number;
	/** Minutes before expiry to show "expiring soon" status */
	expiringThresholdMinutes: number;
	/** Estimated average speed in km/h for duration calculations */
	averageSpeedKmh: number;
}

export const DEFAULT_EMPTY_LEG_CONFIG: EmptyLegConfig = {
	defaultWindowHours: 4,
	maxMatchDistanceKm: 15,
	expiringThresholdMinutes: 60,
	averageSpeedKmh: 50,
};

/**
 * Empty-leg opportunity data structure
 */
export interface EmptyLegData {
	id: string;
	vehicleId: string;
	fromAddress: string | null;
	fromLatitude: number | null;
	fromLongitude: number | null;
	toAddress: string | null;
	toLatitude: number | null;
	toLongitude: number | null;
	estimatedDistanceKm: number | null;
	estimatedDurationMins: number | null;
	windowStart: Date;
	windowEnd: Date;
	pricingStrategy: PricingStrategy | null;
	isActive: boolean;
}

/**
 * Mission data for creating empty legs
 */
export interface MissionForEmptyLeg {
	id: string;
	dropoffAddress: string | null;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	pickupAt: Date;
	assignedVehicleId: string | null;
	tripAnalysis: unknown;
}

/**
 * Vehicle with base information
 */
export interface VehicleWithBase {
	id: string;
	operatingBase: {
		id: string;
		name: string;
		addressLine1: string;
		city: string;
		latitude: number;
		longitude: number;
	};
}

/**
 * Request data for matching empty legs
 */
export interface MatchRequest {
	pickupLat: number;
	pickupLng: number;
	dropoffLat: number;
	dropoffLng: number;
	pickupAt: Date;
}

/**
 * Empty-leg match result
 */
export interface EmptyLegMatch {
	emptyLegId: string;
	emptyLeg: EmptyLegData;
	matchScore: number; // 0-100
	pickupProximityKm: number;
	dropoffProximityKm: number;
}

/**
 * Empty-leg creation result
 */
export interface CreateEmptyLegResult {
	id: string;
	vehicleId: string;
	fromAddress: string;
	fromLatitude: number;
	fromLongitude: number;
	toAddress: string;
	toLatitude: number;
	toLongitude: number;
	estimatedDistanceKm: number;
	estimatedDurationMins: number;
	windowStart: Date;
	windowEnd: Date;
	pricingStrategy: PricingStrategy | null;
	sourceMissionId: string;
}

// ============================================================================
// Status Functions
// ============================================================================

/**
 * Get empty-leg status based on time window
 */
export function getEmptyLegStatus(
	windowStart: Date,
	windowEnd: Date,
	config: EmptyLegConfig = DEFAULT_EMPTY_LEG_CONFIG,
): EmptyLegStatus {
	const now = new Date();

	// Check if expired
	if (windowEnd <= now) {
		return "EXPIRED";
	}

	// Check if expiring soon
	const expiringThresholdMs = config.expiringThresholdMinutes * 60 * 1000;
	const timeUntilExpiry = windowEnd.getTime() - now.getTime();

	if (timeUntilExpiry <= expiringThresholdMs) {
		return "EXPIRING_SOON";
	}

	return "AVAILABLE";
}

/**
 * Check if an empty leg is currently valid (active and not expired)
 */
export function isEmptyLegValid(emptyLeg: EmptyLegData): boolean {
	if (!emptyLeg.isActive) {
		return false;
	}

	const status = getEmptyLegStatus(emptyLeg.windowStart, emptyLeg.windowEnd);
	return status !== "EXPIRED";
}

// ============================================================================
// Distance & Duration Calculations
// ============================================================================

/**
 * Calculate estimated distance between two points
 */
export function calculateDistance(
	from: GeoPoint,
	to: GeoPoint,
): number {
	return haversineDistance(from, to);
}

/**
 * Calculate estimated duration in minutes based on distance
 */
export function calculateDuration(
	distanceKm: number,
	config: EmptyLegConfig = DEFAULT_EMPTY_LEG_CONFIG,
): number {
	// duration (hours) = distance / speed
	// duration (minutes) = (distance / speed) * 60
	return Math.round((distanceKm / config.averageSpeedKmh) * 60);
}

/**
 * Estimate dropoff time based on pickup time and trip analysis
 */
export function estimateDropoffTime(
	pickupAt: Date,
	tripAnalysis: unknown,
): Date {
	// Try to extract service duration from trip analysis
	let serviceDurationMinutes = 60; // Default 1 hour

	if (tripAnalysis && typeof tripAnalysis === "object") {
		const analysis = tripAnalysis as Record<string, unknown>;

		// Try to get service duration from segments
		if (analysis.segments && typeof analysis.segments === "object") {
			const segments = analysis.segments as Record<string, unknown>;
			if (segments.service && typeof segments.service === "object") {
				const service = segments.service as Record<string, unknown>;
				if (typeof service.durationMinutes === "number") {
					serviceDurationMinutes = service.durationMinutes;
				}
			}
		}

		// Fallback: try to get from routing
		if (analysis.routing && typeof analysis.routing === "object") {
			const routing = analysis.routing as Record<string, unknown>;
			if (typeof routing.serviceDurationMinutes === "number") {
				serviceDurationMinutes = routing.serviceDurationMinutes;
			}
		}
	}

	return new Date(pickupAt.getTime() + serviceDurationMinutes * 60 * 1000);
}

// ============================================================================
// Empty-Leg Creation
// ============================================================================

/**
 * Calculate empty-leg data from a mission and vehicle
 */
export function calculateEmptyLegData(
	mission: MissionForEmptyLeg,
	vehicle: VehicleWithBase,
	options?: {
		windowEndHours?: number;
		pricingStrategy?: PricingStrategy;
	},
	config: EmptyLegConfig = DEFAULT_EMPTY_LEG_CONFIG,
): CreateEmptyLegResult {
	const windowEndHours = options?.windowEndHours ?? config.defaultWindowHours;

	// From: mission dropoff location
	const fromLat = mission.dropoffLatitude ?? 0;
	const fromLng = mission.dropoffLongitude ?? 0;

	// To: vehicle's base location
	const toLat = Number(vehicle.operatingBase.latitude);
	const toLng = Number(vehicle.operatingBase.longitude);

	// Calculate distance and duration
	const distanceKm = calculateDistance(
		{ lat: fromLat, lng: fromLng },
		{ lat: toLat, lng: toLng },
	);
	const durationMins = calculateDuration(distanceKm, config);

	// Calculate time window
	const dropoffTime = estimateDropoffTime(mission.pickupAt, mission.tripAnalysis);
	const windowStart = dropoffTime;
	const windowEnd = new Date(dropoffTime.getTime() + windowEndHours * 60 * 60 * 1000);

	// Build to address
	const toAddress = `${vehicle.operatingBase.addressLine1}, ${vehicle.operatingBase.city}`;

	return {
		id: "", // Will be set by database
		vehicleId: vehicle.id,
		fromAddress: mission.dropoffAddress ?? "",
		fromLatitude: fromLat,
		fromLongitude: fromLng,
		toAddress,
		toLatitude: toLat,
		toLongitude: toLng,
		estimatedDistanceKm: Math.round(distanceKm * 100) / 100,
		estimatedDurationMins: durationMins,
		windowStart,
		windowEnd,
		pricingStrategy: options?.pricingStrategy ?? null,
		sourceMissionId: mission.id,
	};
}

/**
 * Validate mission for empty-leg creation
 */
export function validateMissionForEmptyLeg(
	mission: MissionForEmptyLeg,
): { valid: boolean; error?: string } {
	if (!mission.assignedVehicleId) {
		return { valid: false, error: "Mission has no assigned vehicle" };
	}

	if (!mission.dropoffLatitude || !mission.dropoffLongitude) {
		return { valid: false, error: "Mission has no dropoff coordinates" };
	}

	return { valid: true };
}

// ============================================================================
// Empty-Leg Matching
// ============================================================================

/**
 * Calculate match score between a request and an empty leg
 * Score is 0-100, higher is better
 */
export function calculateMatchScore(
	request: MatchRequest,
	emptyLeg: EmptyLegData,
	config: EmptyLegConfig = DEFAULT_EMPTY_LEG_CONFIG,
): { score: number; pickupProximityKm: number; dropoffProximityKm: number } {
	// Check if empty leg has coordinates
	if (
		emptyLeg.fromLatitude === null ||
		emptyLeg.fromLongitude === null ||
		emptyLeg.toLatitude === null ||
		emptyLeg.toLongitude === null
	) {
		return { score: 0, pickupProximityKm: Infinity, dropoffProximityKm: Infinity };
	}

	// Calculate distances
	// Request pickup should be near empty leg's "from" (dropoff of original mission)
	const pickupProximityKm = calculateDistance(
		{ lat: request.pickupLat, lng: request.pickupLng },
		{ lat: emptyLeg.fromLatitude, lng: emptyLeg.fromLongitude },
	);

	// Request dropoff should be near empty leg's "to" (vehicle's base)
	const dropoffProximityKm = calculateDistance(
		{ lat: request.dropoffLat, lng: request.dropoffLng },
		{ lat: emptyLeg.toLatitude, lng: emptyLeg.toLongitude },
	);

	// Check if within threshold
	if (
		pickupProximityKm > config.maxMatchDistanceKm ||
		dropoffProximityKm > config.maxMatchDistanceKm
	) {
		return { score: 0, pickupProximityKm, dropoffProximityKm };
	}

	// Calculate score based on proximity (closer = higher score)
	// Max score for each component is 50 (total 100)
	const pickupScore = Math.max(0, 50 - (pickupProximityKm / config.maxMatchDistanceKm) * 50);
	const dropoffScore = Math.max(0, 50 - (dropoffProximityKm / config.maxMatchDistanceKm) * 50);

	const score = Math.round(pickupScore + dropoffScore);

	return { score, pickupProximityKm, dropoffProximityKm };
}

/**
 * Check if request time falls within empty leg's time window
 */
export function isTimeWindowValid(
	requestPickupAt: Date,
	windowStart: Date,
	windowEnd: Date,
): boolean {
	return requestPickupAt >= windowStart && requestPickupAt <= windowEnd;
}

/**
 * Find matching empty legs for a booking request
 */
export function findMatchingEmptyLegs(
	emptyLegs: EmptyLegData[],
	request: MatchRequest,
	config: EmptyLegConfig = DEFAULT_EMPTY_LEG_CONFIG,
): EmptyLegMatch[] {
	const matches: EmptyLegMatch[] = [];

	for (const emptyLeg of emptyLegs) {
		// Skip inactive or expired empty legs
		if (!isEmptyLegValid(emptyLeg)) {
			continue;
		}

		// Check time window
		if (!isTimeWindowValid(request.pickupAt, emptyLeg.windowStart, emptyLeg.windowEnd)) {
			continue;
		}

		// Calculate match score
		const { score, pickupProximityKm, dropoffProximityKm } = calculateMatchScore(
			request,
			emptyLeg,
			config,
		);

		// Only include if score > 0 (within distance threshold)
		if (score > 0) {
			matches.push({
				emptyLegId: emptyLeg.id,
				emptyLeg,
				matchScore: score,
				pickupProximityKm: Math.round(pickupProximityKm * 100) / 100,
				dropoffProximityKm: Math.round(dropoffProximityKm * 100) / 100,
			});
		}
	}

	// Sort by match score descending
	matches.sort((a, b) => b.matchScore - a.matchScore);

	return matches;
}

// ============================================================================
// Pricing Calculations
// ============================================================================

/**
 * Parse pricing strategy from JSON
 */
export function parsePricingStrategy(json: unknown): PricingStrategy | null {
	if (!json || typeof json !== "object") {
		return null;
	}

	const strategy = json as Record<string, unknown>;

	if (strategy.type === "PERCENTAGE_DISCOUNT" && typeof strategy.value === "number") {
		return { type: "PERCENTAGE_DISCOUNT", value: strategy.value };
	}

	if (strategy.type === "FIXED_PRICE" && typeof strategy.value === "number") {
		return { type: "FIXED_PRICE", value: strategy.value };
	}

	if (strategy.type === "COST_PLUS_MARGIN" && typeof strategy.marginPercent === "number") {
		return { type: "COST_PLUS_MARGIN", marginPercent: strategy.marginPercent };
	}

	return null;
}

/**
 * Calculate suggested price for an empty-leg booking
 */
export function calculateEmptyLegPrice(
	pricingStrategy: PricingStrategy | null,
	standardPrice: number,
	internalCost: number,
): { price: number; savingsPercent: number } {
	if (!pricingStrategy) {
		// No strategy, return standard price
		return { price: standardPrice, savingsPercent: 0 };
	}

	let price: number;

	switch (pricingStrategy.type) {
		case "PERCENTAGE_DISCOUNT":
			// Apply percentage discount to standard price
			price = standardPrice * (1 - pricingStrategy.value / 100);
			break;

		case "FIXED_PRICE":
			// Use fixed price
			price = pricingStrategy.value;
			break;

		case "COST_PLUS_MARGIN":
			// Calculate price as cost + margin
			price = internalCost * (1 + pricingStrategy.marginPercent / 100);
			break;

		default:
			price = standardPrice;
	}

	// Ensure price is not negative
	price = Math.max(0, price);

	// Round to 2 decimal places
	price = Math.round(price * 100) / 100;

	// Calculate savings percentage
	const savingsPercent =
		standardPrice > 0
			? Math.round(((standardPrice - price) / standardPrice) * 100)
			: 0;

	return { price, savingsPercent };
}

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

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate a unique ID for empty legs (for client-side use before DB save)
 */
export function generateEmptyLegId(): string {
	return `el_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Format time window for display
 */
export function formatTimeWindow(windowStart: Date, windowEnd: Date): string {
	const formatTime = (date: Date) => {
		return date.toLocaleTimeString("fr-FR", {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDate = (date: Date) => {
		return date.toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "2-digit",
		});
	};

	const startDate = formatDate(windowStart);
	const endDate = formatDate(windowEnd);

	if (startDate === endDate) {
		return `${startDate} ${formatTime(windowStart)} - ${formatTime(windowEnd)}`;
	}

	return `${startDate} ${formatTime(windowStart)} - ${endDate} ${formatTime(windowEnd)}`;
}

/**
 * Calculate time remaining until window end
 */
export function getTimeRemaining(windowEnd: Date): {
	hours: number;
	minutes: number;
	isExpired: boolean;
} {
	const now = new Date();
	const diff = windowEnd.getTime() - now.getTime();

	if (diff <= 0) {
		return { hours: 0, minutes: 0, isExpired: true };
	}

	const hours = Math.floor(diff / (1000 * 60 * 60));
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

	return { hours, minutes, isExpired: false };
}
