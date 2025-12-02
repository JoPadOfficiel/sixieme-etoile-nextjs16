/**
 * Pricing Engine Service
 * Implements the Engagement Rule for partner grid pricing (Method 1)
 * and fallback to dynamic pricing (Method 2)
 * Story 4.3: Adds multiplier support (advanced rates + seasonal multipliers)
 * Story 7.4: Adds commission integration for partner profitability
 */

import type { GeoPoint, ZoneData } from "../lib/geo-utils";
import { findZoneForPoint } from "../lib/geo-utils";
import {
	calculateCommission,
	calculateEffectiveMargin,
	getCommissionData,
	hasCommission,
	getCommissionPercent,
	type CommissionData,
} from "./commission-service";
import {
	getTollCost,
	calculateFallbackToll,
	type TollResult,
	type TollSource,
} from "./toll-service";

// Europe/Paris timezone constant
const PARIS_TZ = "Europe/Paris";

// ============================================================================
// Types
// ============================================================================

export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type GridType = "ZoneRoute" | "ExcursionPackage" | "DispoPackage";
export type TripType = "transfer" | "excursion" | "dispo";
export type ProfitabilityIndicator = "green" | "orange" | "red";

// Fallback reason for dynamic pricing
export type FallbackReason =
	| "PRIVATE_CLIENT" // Contact is not a partner
	| "NO_CONTRACT" // Partner has no active contract
	| "NO_ZONE_MATCH" // Pickup or dropoff not in any configured zone
	| "NO_ROUTE_MATCH" // No route matches zone pair + vehicle category
	| "NO_EXCURSION_MATCH" // No excursion package matches
	| "NO_DISPO_MATCH" // No dispo package matches
	| null; // Not a fallback (grid matched)

// Rejection reason for grid search
export type RejectionReason =
	| "ZONE_MISMATCH"
	| "CATEGORY_MISMATCH"
	| "DIRECTION_MISMATCH"
	| "INACTIVE";

// Route check result for search details
export interface RouteCheckResult {
	routeId: string;
	routeName: string;
	fromZone: string;
	toZone: string;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

// Excursion check result for search details
export interface ExcursionCheckResult {
	excursionId: string;
	excursionName: string;
	originZone: string | null;
	destinationZone: string | null;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

// Dispo check result for search details
export interface DispoCheckResult {
	dispoId: string;
	dispoName: string;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

// Grid search details for transparency
export interface GridSearchDetails {
	pickupZone: { id: string; name: string; code: string } | null;
	dropoffZone: { id: string; name: string; code: string } | null;
	vehicleCategoryId: string;
	tripType: TripType;
	routesChecked: RouteCheckResult[];
	excursionsChecked: ExcursionCheckResult[];
	disposChecked: DispoCheckResult[];
}

export interface PricingRequest {
	contactId: string;
	pickup: GeoPoint;
	dropoff: GeoPoint;
	vehicleCategoryId: string;
	tripType: TripType;
	pickupAt?: string;
	estimatedDurationMinutes?: number;
	estimatedDistanceKm?: number;
}

export interface AppliedRule {
	type: string;
	description?: string;
	[key: string]: unknown;
}

/**
 * Applied rule for dynamic base calculation (Story 4.1)
 */
export interface DynamicBaseCalculationRule extends AppliedRule {
	type: "DYNAMIC_BASE_CALCULATION";
	description: string;
	inputs: {
		distanceKm: number;
		durationMinutes: number;
		baseRatePerKm: number;
		baseRatePerHour: number;
		targetMarginPercent: number;
	};
	calculation: {
		distanceBasedPrice: number;
		durationBasedPrice: number;
		selectedMethod: "distance" | "duration";
		basePrice: number;
		priceWithMargin: number;
	};
	usingDefaultSettings?: boolean;
}

export interface MatchedGrid {
	type: GridType;
	id: string;
	name: string;
	fromZone?: string;
	toZone?: string;
}

export interface PricingResult {
	pricingMode: PricingMode;
	price: number;
	currency: "EUR";
	internalCost: number;
	margin: number;
	marginPercent: number;
	profitabilityIndicator: ProfitabilityIndicator;
	// Story 4.7: Full profitability data for UI display
	profitabilityData: ProfitabilityIndicatorData;
	matchedGrid: MatchedGrid | null;
	appliedRules: AppliedRule[];
	isContractPrice: boolean;
	// New fields for Story 3.5
	fallbackReason: FallbackReason;
	gridSearchDetails: GridSearchDetails | null;
	// New field for Story 4.2
	tripAnalysis: TripAnalysis;
	// New fields for Story 4.4 (optional, only present after override)
	overrideApplied?: boolean;
	previousPrice?: number;
	// Story 7.4: Commission data for partner quotes
	commissionData?: CommissionData;
}

// ============================================================================
// Story 4.4: Manual Override Types
// ============================================================================

/**
 * Manual override rule for tracking price adjustments (Story 4.4)
 */
export interface ManualOverrideRule extends AppliedRule {
	type: "MANUAL_OVERRIDE";
	previousPrice: number;
	newPrice: number;
	priceChange: number;
	priceChangePercent: number;
	reason?: string;
	overriddenAt: string;
	isContractPriceOverride?: boolean;
}

/**
 * Input for profitability recalculation after price override
 */
export interface RecalculateProfitabilityInput {
	newPrice: number;
	internalCost: number;
	previousPrice: number;
	previousAppliedRules: AppliedRule[];
	reason?: string;
	isContractPrice?: boolean;
}

/**
 * Result of profitability recalculation
 */
export interface RecalculateProfitabilityResult {
	price: number;
	margin: number;
	marginPercent: number;
	profitabilityIndicator: ProfitabilityIndicator;
	appliedRules: AppliedRule[];
	overrideApplied: boolean;
	priceChange: number;
	priceChangePercent: number;
}

/**
 * Override validation error codes
 */
export type OverrideErrorCode = 
	| "BELOW_MINIMUM_MARGIN"
	| "EXCEEDS_ROLE_LIMIT"
	| "INVALID_PRICE"
	| "PRICE_TOO_LOW";

/**
 * Override validation result
 */
export interface OverrideValidationResult {
	isValid: boolean;
	errorCode?: OverrideErrorCode;
	errorMessage?: string;
	details?: {
		requestedPrice: number;
		internalCost: number;
		resultingMargin: number;
		resultingMarginPercent: number;
		minimumMarginPercent?: number;
	};
}

// ============================================================================
// Data Interfaces (from database)
// ============================================================================

export interface ContactData {
	id: string;
	isPartner: boolean;
	partnerContract?: PartnerContractData | null;
}

export interface PartnerContractData {
	id: string;
	zoneRoutes: ZoneRouteAssignment[];
	excursionPackages: ExcursionPackageAssignment[];
	dispoPackages: DispoPackageAssignment[];
}

// Story 14.5: Origin/Destination type for multi-zone and address-based routes
export type OriginDestinationType = "ZONES" | "ADDRESS";

// Story 14.5: Zone data for multi-zone routes
export interface ZoneRouteZoneData {
	zone: { id: string; name: string; code: string };
}

export interface ZoneRouteAssignment {
	zoneRoute: {
		id: string;
		// Legacy fields (backward compatibility) - nullable since Story 14.2
		fromZoneId: string | null;
		toZoneId: string | null;
		// Story 14.5: Multi-zone support
		originType: OriginDestinationType;
		destinationType: OriginDestinationType;
		originZones: ZoneRouteZoneData[];
		destinationZones: ZoneRouteZoneData[];
		// Story 14.5: Address-based route support
		originPlaceId?: string | null;
		originAddress?: string | null;
		originLat?: number | null;
		originLng?: number | null;
		destPlaceId?: string | null;
		destAddress?: string | null;
		destLat?: number | null;
		destLng?: number | null;
		// Existing fields
		vehicleCategoryId: string;
		fixedPrice: number;
		direction: "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
		isActive: boolean;
		// Legacy zone relations (for backward compatibility display)
		fromZone: { id: string; name: string; code: string } | null;
		toZone: { id: string; name: string; code: string } | null;
	};
	// Story 12.2: Partner-specific price override (null = use catalog price)
	overridePrice?: number | null;
}

export interface ExcursionPackageAssignment {
	excursionPackage: {
		id: string;
		name: string;
		originZoneId: string | null;
		destinationZoneId: string | null;
		vehicleCategoryId: string;
		price: number;
		isActive: boolean;
		originZone?: { id: string; name: string; code: string } | null;
		destinationZone?: { id: string; name: string; code: string } | null;
	};
	// Story 12.2: Partner-specific price override (null = use catalog price)
	overridePrice?: number | null;
}

export interface DispoPackageAssignment {
	dispoPackage: {
		id: string;
		name: string;
		vehicleCategoryId: string;
		basePrice: number;
		isActive: boolean;
	};
	// Story 12.2: Partner-specific price override (null = use catalog price)
	overridePrice?: number | null;
}

export interface OrganizationPricingSettings {
	baseRatePerKm: number;
	baseRatePerHour: number;
	targetMarginPercent: number;
	// Cost parameters (Story 4.2)
	fuelConsumptionL100km?: number;
	fuelPricePerLiter?: number;
	tollCostPerKm?: number;
	wearCostPerKm?: number;
	driverHourlyCost?: number;
	// Story 4.7: Profitability thresholds (optional, defaults in pricing-engine.ts)
	greenMarginThreshold?: number;
	orangeMarginThreshold?: number;
}

// ============================================================================
// Multiplier Types (Story 4.3)
// ============================================================================

// Note: LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY removed in Story 11.4
// Zone-based pricing now handled by PricingZone.priceMultiplier (Story 11.3)
export type AdvancedRateAppliesTo = "NIGHT" | "WEEKEND";
export type AdjustmentType = "PERCENTAGE" | "FIXED_AMOUNT";

/**
 * Advanced rate data from database
 */
export interface AdvancedRateData {
	id: string;
	name: string;
	appliesTo: AdvancedRateAppliesTo;
	startTime: string | null;  // HH:MM format
	endTime: string | null;    // HH:MM format
	daysOfWeek: string | null; // e.g. "1,2,3,4,5" for weekdays, "0,6" for weekend
	minDistanceKm: number | null;
	maxDistanceKm: number | null;
	zoneId: string | null;
	adjustmentType: AdjustmentType;
	value: number;  // percentage or fixed amount in EUR
	priority: number;
	isActive: boolean;
}

/**
 * Seasonal multiplier data from database
 */
export interface SeasonalMultiplierData {
	id: string;
	name: string;
	description: string | null;
	startDate: Date;
	endDate: Date;
	multiplier: number;  // e.g., 1.3 for 30% increase
	priority: number;
	isActive: boolean;
}

/**
 * Context for evaluating multipliers
 */
export interface MultiplierContext {
	pickupAt: Date | null;  // Trip pickup time (Europe/Paris business time)
	distanceKm: number;
	pickupZoneId: string | null;
	dropoffZoneId: string | null;
}

/**
 * Applied multiplier rule for transparency
 */
export interface AppliedMultiplierRule extends AppliedRule {
	type: "ADVANCED_RATE" | "SEASONAL_MULTIPLIER";
	ruleId: string;
	ruleName: string;
	adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT" | "MULTIPLIER";
	adjustmentValue: number;
	priceBefore: number;
	priceAfter: number;
}

/**
 * Result of multiplier evaluation
 */
export interface MultiplierEvaluationResult {
	adjustedPrice: number;
	appliedRules: AppliedMultiplierRule[];
}

// ============================================================================
// Story 11.3: Zone Pricing Multiplier Types
// ============================================================================

/**
 * Applied zone multiplier rule for transparency
 */
export interface AppliedZoneMultiplierRule extends AppliedRule {
	type: "ZONE_MULTIPLIER";
	zoneId: string;
	zoneName: string;
	zoneCode: string;
	multiplier: number;
	source: "pickup" | "dropoff";
	priceBefore: number;
	priceAfter: number;
}

/**
 * Result of zone multiplier application
 */
export interface ZoneMultiplierResult {
	adjustedPrice: number;
	appliedMultiplier: number;
	appliedRule: AppliedZoneMultiplierRule | null;
}

// ============================================================================
// Cost Breakdown Types (Story 4.2)
// ============================================================================

export interface FuelCostComponent {
	amount: number;
	distanceKm: number;
	consumptionL100km: number;
	pricePerLiter: number;
}

export interface TollCostComponent {
	amount: number;
	distanceKm: number;
	ratePerKm: number;
	// Story 15.1: Track toll data source for transparency
	source?: "GOOGLE_API" | "ESTIMATE";
	isFromCache?: boolean;
}

export interface WearCostComponent {
	amount: number;
	distanceKm: number;
	ratePerKm: number;
}

export interface DriverCostComponent {
	amount: number;
	durationMinutes: number;
	hourlyRate: number;
}

export interface ParkingCostComponent {
	amount: number;
	description: string;
}

export interface CostBreakdown {
	fuel: FuelCostComponent;
	tolls: TollCostComponent;
	wear: WearCostComponent;
	driver: DriverCostComponent;
	parking: ParkingCostComponent;
	total: number;
}

/**
 * Legacy segment cost (kept for backward compatibility)
 * @deprecated Use SegmentAnalysis instead
 */
export interface SegmentCost {
	distanceKm: number;
	durationMinutes: number;
	cost: number;
}

/**
 * Story 4.6: Detailed analysis of a single trip segment
 * Includes full cost breakdown per segment
 */
export interface SegmentAnalysis {
	name: "approach" | "service" | "return";
	description: string;
	distanceKm: number;
	durationMinutes: number;
	cost: CostBreakdown;
	isEstimated: boolean; // true if calculated from Haversine, false if from routing API
}

/**
 * Story 4.8: Fuel price source information for transparency
 */
export interface FuelPriceSourceInfo {
	pricePerLitre: number;
	currency: "EUR";
	source: "CACHE" | "DEFAULT";
	fetchedAt: string | null; // ISO timestamp or null if default
	isStale: boolean;
	fuelType: string;
	countryCode: string;
}

/**
 * Story 4.6: Complete trip analysis with all segments
 * Stored in Quote.tripAnalysis as JSON
 */
export interface TripAnalysis {
	// Overall cost breakdown (sum of all segments)
	costBreakdown: CostBreakdown;
	
	// Story 4.5: Vehicle selection info
	vehicleSelection?: VehicleSelectionInfo;
	
	// Story 4.6: Segment breakdown (required for full shadow calculation)
	segments: {
		approach: SegmentAnalysis | null; // null if no vehicle selected
		service: SegmentAnalysis;
		return: SegmentAnalysis | null; // null if no vehicle selected
	};
	
	// Totals
	totalDistanceKm: number;
	totalDurationMinutes: number;
	totalInternalCost: number;
	
	// Metadata
	calculatedAt: string; // ISO timestamp
	routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE" | "VEHICLE_SELECTION";
	
	// Story 4.8: Fuel price source for transparency
	fuelPriceSource?: FuelPriceSourceInfo;
	
	// Story 15.1: Toll source for transparency
	tollSource?: "GOOGLE_API" | "ESTIMATE";
}

/**
 * Story 4.5: Vehicle selection information for transparency
 */
export interface VehicleSelectionInfo {
	selectedVehicle?: {
		vehicleId: string;
		vehicleName: string;
		baseId: string;
		baseName: string;
	};
	candidatesConsidered: number;
	candidatesAfterCapacityFilter: number;
	candidatesAfterHaversineFilter: number;
	candidatesWithRouting: number;
	selectionCriterion: "MINIMAL_COST" | "BEST_MARGIN";
	fallbackUsed: boolean;
	fallbackReason?: string;
	routingSource?: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
}

// ============================================================================
// Profitability Calculation (Story 4.7)
// ============================================================================

/**
 * Story 4.7: Configurable thresholds for profitability classification
 * Default values from PRD Appendix B
 */
export interface ProfitabilityThresholds {
	/** Margin >= this value is "green" (profitable). Default: 20% */
	greenThreshold: number;
	/** Margin >= this value (but < green) is "orange" (low margin). Default: 0% */
	orangeThreshold: number;
}

/**
 * Default profitability thresholds per PRD Appendix B
 */
export const DEFAULT_PROFITABILITY_THRESHOLDS: ProfitabilityThresholds = {
	greenThreshold: 20,
	orangeThreshold: 0,
};

/**
 * Story 4.7: Complete profitability indicator data for UI display
 * Includes all information needed for the component and tooltip
 */
export interface ProfitabilityIndicatorData {
	/** The indicator state: green, orange, or red */
	indicator: ProfitabilityIndicator;
	/** The actual margin percentage */
	marginPercent: number;
	/** The thresholds used for classification */
	thresholds: ProfitabilityThresholds;
	/** Human-readable label for the indicator */
	label: string;
	/** Detailed description for tooltip */
	description: string;
}

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
// Story 7.4: Commission-Aware Profitability Calculation
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
 * 
 * @example
 * ```typescript
 * // Partner with 10% commission
 * const result = calculateProfitabilityWithCommission(150, 80, 10);
 * // result.profitabilityData.marginPercent = 36.67% (effective)
 * // result.commissionData.commissionAmount = 15.00
 * 
 * // Private client (no commission)
 * const result = calculateProfitabilityWithCommission(150, 80, 0);
 * // result.profitabilityData.marginPercent = 46.67% (gross)
 * ```
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
	// Get commission data (handles 0% case gracefully)
	const commissionData = commissionPercent > 0
		? getCommissionData(sellingPrice, internalCost, commissionPercent)
		: undefined;

	// Calculate margin (effective if commission, gross otherwise)
	let margin: number;
	let marginPercent: number;

	if (commissionData) {
		margin = commissionData.effectiveMargin;
		marginPercent = commissionData.effectiveMarginPercent;
	} else {
		// No commission - use gross margin
		margin = Math.round((sellingPrice - internalCost) * 100) / 100;
		marginPercent = sellingPrice > 0
			? Math.round(((margin / sellingPrice) * 100) * 100) / 100
			: 0;
	}

	// Get profitability indicator based on effective margin
	const profitabilityData = getProfitabilityIndicatorData(marginPercent, thresholds);

	return {
		profitabilityData,
		commissionData,
		margin,
		marginPercent,
	};
}

/**
 * Story 7.4: Re-export commission service functions for convenience
 * Allows pricing engine consumers to access commission utilities
 */
export {
	calculateCommission,
	calculateEffectiveMargin,
	getCommissionData,
	hasCommission,
	getCommissionPercent,
	type CommissionData,
};

/**
 * Default cost parameters for Paris VTC market (Story 4.2)
 */
export const DEFAULT_COST_PARAMETERS = {
	fuelConsumptionL100km: 8.0,    // Liters per 100km (average berline/van)
	fuelPricePerLiter: 1.80,       // EUR per liter (current diesel price)
	tollCostPerKm: 0.15,           // EUR per km (average autoroute)
	wearCostPerKm: 0.10,           // EUR per km (maintenance, tires, depreciation)
	driverHourlyCost: 25.0,        // EUR per hour (gross + charges)
};

/**
 * Calculate fuel cost
 * Formula: distanceKm × (fuelConsumptionL100km / 100) × fuelPricePerLiter
 */
export function calculateFuelCost(
	distanceKm: number,
	consumptionL100km: number,
	pricePerLiter: number,
): FuelCostComponent {
	const amount = Math.round(distanceKm * (consumptionL100km / 100) * pricePerLiter * 100) / 100;
	return {
		amount,
		distanceKm,
		consumptionL100km,
		pricePerLiter,
	};
}

/**
 * Calculate toll cost
 * Formula: distanceKm × tollCostPerKm
 */
export function calculateTollCost(
	distanceKm: number,
	ratePerKm: number,
): TollCostComponent {
	const amount = Math.round(distanceKm * ratePerKm * 100) / 100;
	return {
		amount,
		distanceKm,
		ratePerKm,
	};
}

/**
 * Calculate vehicle wear cost
 * Formula: distanceKm × wearCostPerKm
 */
export function calculateWearCost(
	distanceKm: number,
	ratePerKm: number,
): WearCostComponent {
	const amount = Math.round(distanceKm * ratePerKm * 100) / 100;
	return {
		amount,
		distanceKm,
		ratePerKm,
	};
}

/**
 * Calculate driver cost
 * Formula: (durationMinutes / 60) × driverHourlyCost
 */
export function calculateDriverCost(
	durationMinutes: number,
	hourlyRate: number,
): DriverCostComponent {
	const amount = Math.round((durationMinutes / 60) * hourlyRate * 100) / 100;
	return {
		amount,
		durationMinutes,
		hourlyRate,
	};
}

/**
 * Calculate complete cost breakdown (Story 4.2)
 * Returns all cost components and total internal cost
 */
export function calculateCostBreakdown(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	parkingCost: number = 0,
	parkingDescription: string = "",
): CostBreakdown {
	// Use settings or defaults
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const fuelPricePerLiter = settings.fuelPricePerLiter ?? DEFAULT_COST_PARAMETERS.fuelPricePerLiter;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	// Calculate each component
	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelPricePerLiter);
	const tolls = calculateTollCost(distanceKm, tollCostPerKm);
	const wear = calculateWearCost(distanceKm, wearCostPerKm);
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	// Calculate total
	const total = Math.round((fuel.amount + tolls.amount + wear.amount + driver.amount + parking.amount) * 100) / 100;

	return {
		fuel,
		tolls,
		wear,
		driver,
		parking,
		total,
	};
}

/**
 * Story 15.1: Toll configuration for async cost calculation
 */
export interface TollConfig {
	origin: GeoPoint;
	destination: GeoPoint;
	apiKey?: string;
}

/**
 * Story 15.1: Calculate cost breakdown with real toll costs from Google Routes API
 * 
 * This async version fetches real toll costs when API key is provided.
 * Falls back to flat rate calculation when API is unavailable.
 * 
 * @param distanceKm - Distance in kilometers
 * @param durationMinutes - Duration in minutes
 * @param settings - Organization pricing settings
 * @param tollConfig - Optional toll configuration with origin/destination and API key
 * @param parkingCost - Optional parking cost
 * @param parkingDescription - Optional parking description
 * @returns Cost breakdown with toll source information
 */
export async function calculateCostBreakdownWithTolls(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	tollConfig?: TollConfig,
	parkingCost: number = 0,
	parkingDescription: string = "",
): Promise<{ breakdown: CostBreakdown; tollSource: TollSource }> {
	// Use settings or defaults
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const fuelPricePerLiter = settings.fuelPricePerLiter ?? DEFAULT_COST_PARAMETERS.fuelPricePerLiter;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	// Calculate non-toll components
	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelPricePerLiter);
	const wear = calculateWearCost(distanceKm, wearCostPerKm);
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	// Calculate toll cost
	let tolls: TollCostComponent;
	let tollSource: TollSource = "ESTIMATE";

	if (tollConfig?.origin && tollConfig?.destination && tollConfig?.apiKey) {
		// Try to get real toll cost from Google Routes API
		const tollResult = await getTollCost(tollConfig.origin, tollConfig.destination, {
			apiKey: tollConfig.apiKey,
			fallbackRatePerKm: tollCostPerKm,
		});

		if (tollResult.amount >= 0) {
			// API returned a valid result (0 or positive)
			tolls = {
				amount: tollResult.amount,
				distanceKm,
				ratePerKm: 0, // Not used for API results
				source: tollResult.source,
				isFromCache: tollResult.isFromCache,
			};
			tollSource = tollResult.source;
		} else {
			// API failed, use fallback
			tolls = {
				amount: calculateFallbackToll(distanceKm, tollCostPerKm),
				distanceKm,
				ratePerKm: tollCostPerKm,
				source: "ESTIMATE",
				isFromCache: false,
			};
			tollSource = "ESTIMATE";
		}
	} else {
		// No toll config or API key - use flat rate estimate
		tolls = {
			amount: Math.round(distanceKm * tollCostPerKm * 100) / 100,
			distanceKm,
			ratePerKm: tollCostPerKm,
			source: "ESTIMATE",
			isFromCache: false,
		};
		tollSource = "ESTIMATE";
	}

	// Calculate total
	const total = Math.round(
		(fuel.amount + tolls.amount + wear.amount + driver.amount + parking.amount) * 100
	) / 100;

	return {
		breakdown: {
			fuel,
			tolls,
			wear,
			driver,
			parking,
			total,
		},
		tollSource,
	};
}

/**
 * Estimate internal cost using detailed cost breakdown (Story 4.2)
 * Replaces the simplified estimateInternalCost function
 */
export function calculateInternalCost(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): number {
	const breakdown = calculateCostBreakdown(distanceKm, durationMinutes, settings);
	return breakdown.total;
}

/**
 * @deprecated Use calculateInternalCost instead (Story 4.2)
 * Estimate internal cost (simplified - kept for backward compatibility)
 * Uses a rough estimate: cost = distance * 2.5 EUR/km
 */
export function estimateInternalCost(distanceKm: number): number {
	const costPerKm = 2.5; // Rough estimate including fuel, driver, wear
	return Math.round(distanceKm * costPerKm * 100) / 100;
}

// ============================================================================
// Shadow Calculation Functions (Story 4.6)
// ============================================================================

/**
 * Input for shadow calculation from vehicle selection
 */
export interface ShadowCalculationInput {
	// From vehicle selection (Story 4.5)
	approachDistanceKm?: number;
	approachDurationMinutes?: number;
	serviceDistanceKm?: number;
	serviceDurationMinutes?: number;
	returnDistanceKm?: number;
	returnDurationMinutes?: number;
	routingSource?: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
	// Vehicle info
	vehicleSelection?: VehicleSelectionInfo;
}

/**
 * Create a segment analysis with full cost breakdown
 */
function createSegmentAnalysis(
	name: "approach" | "service" | "return",
	description: string,
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	isEstimated: boolean,
): SegmentAnalysis {
	const cost = calculateCostBreakdown(distanceKm, durationMinutes, settings);
	return {
		name,
		description,
		distanceKm: Math.round(distanceKm * 100) / 100,
		durationMinutes: Math.round(durationMinutes * 100) / 100,
		cost,
		isEstimated,
	};
}

/**
 * Combine multiple cost breakdowns into a total
 */
function combineCostBreakdowns(breakdowns: CostBreakdown[]): CostBreakdown {
	const combined: CostBreakdown = {
		fuel: { amount: 0, distanceKm: 0, consumptionL100km: 0, pricePerLiter: 0 },
		tolls: { amount: 0, distanceKm: 0, ratePerKm: 0 },
		wear: { amount: 0, distanceKm: 0, ratePerKm: 0 },
		driver: { amount: 0, durationMinutes: 0, hourlyRate: 0 },
		parking: { amount: 0, description: "" },
		total: 0,
	};

	for (const breakdown of breakdowns) {
		combined.fuel.amount += breakdown.fuel.amount;
		combined.fuel.distanceKm += breakdown.fuel.distanceKm;
		combined.tolls.amount += breakdown.tolls.amount;
		combined.tolls.distanceKm += breakdown.tolls.distanceKm;
		combined.wear.amount += breakdown.wear.amount;
		combined.wear.distanceKm += breakdown.wear.distanceKm;
		combined.driver.amount += breakdown.driver.amount;
		combined.driver.durationMinutes += breakdown.driver.durationMinutes;
		combined.parking.amount += breakdown.parking.amount;
		combined.total += breakdown.total;
	}

	// Round totals
	combined.fuel.amount = Math.round(combined.fuel.amount * 100) / 100;
	combined.tolls.amount = Math.round(combined.tolls.amount * 100) / 100;
	combined.wear.amount = Math.round(combined.wear.amount * 100) / 100;
	combined.driver.amount = Math.round(combined.driver.amount * 100) / 100;
	combined.total = Math.round(combined.total * 100) / 100;

	// Use first non-zero rates for display
	const firstWithFuel = breakdowns.find(b => b.fuel.consumptionL100km > 0);
	if (firstWithFuel) {
		combined.fuel.consumptionL100km = firstWithFuel.fuel.consumptionL100km;
		combined.fuel.pricePerLiter = firstWithFuel.fuel.pricePerLiter;
	}
	const firstWithTolls = breakdowns.find(b => b.tolls.ratePerKm > 0);
	if (firstWithTolls) {
		combined.tolls.ratePerKm = firstWithTolls.tolls.ratePerKm;
	}
	const firstWithWear = breakdowns.find(b => b.wear.ratePerKm > 0);
	if (firstWithWear) {
		combined.wear.ratePerKm = firstWithWear.wear.ratePerKm;
	}
	const firstWithDriver = breakdowns.find(b => b.driver.hourlyRate > 0);
	if (firstWithDriver) {
		combined.driver.hourlyRate = firstWithDriver.driver.hourlyRate;
	}

	return combined;
}

/**
 * Calculate shadow segments for a trip (Story 4.6)
 * 
 * This function computes the full operational loop:
 * - Segment A (Approach): Base → Pickup
 * - Segment B (Service): Pickup → Dropoff
 * - Segment C (Return): Dropoff → Base
 * 
 * @param input - Shadow calculation input (from vehicle selection or estimates)
 * @param serviceDistanceKm - Service segment distance (required)
 * @param serviceDurationMinutes - Service segment duration (required)
 * @param settings - Organization pricing settings for cost calculation
 * @returns Complete TripAnalysis with segment breakdown
 */
export function calculateShadowSegments(
	input: ShadowCalculationInput | null,
	serviceDistanceKm: number,
	serviceDurationMinutes: number,
	settings: OrganizationPricingSettings,
): TripAnalysis {
	const calculatedAt = new Date().toISOString();
	
	// Determine routing source
	let routingSource: TripAnalysis["routingSource"] = "HAVERSINE_ESTIMATE";
	if (input?.routingSource === "GOOGLE_API") {
		routingSource = "GOOGLE_API";
	} else if (input?.vehicleSelection) {
		routingSource = "VEHICLE_SELECTION";
	}

	// Check if we have vehicle selection data with segments
	const hasVehicleSegments = input && 
		input.approachDistanceKm !== undefined && 
		input.returnDistanceKm !== undefined;

	// Create service segment (always present)
	const serviceSegment = createSegmentAnalysis(
		"service",
		"Pickup → Dropoff (client trip)",
		input?.serviceDistanceKm ?? serviceDistanceKm,
		input?.serviceDurationMinutes ?? serviceDurationMinutes,
		settings,
		routingSource === "HAVERSINE_ESTIMATE",
	);

	// Create approach and return segments (only if vehicle selected)
	let approachSegment: SegmentAnalysis | null = null;
	let returnSegment: SegmentAnalysis | null = null;

	if (hasVehicleSegments) {
		approachSegment = createSegmentAnalysis(
			"approach",
			"Base → Pickup (deadhead)",
			input.approachDistanceKm!,
			input.approachDurationMinutes ?? 0,
			settings,
			routingSource === "HAVERSINE_ESTIMATE",
		);

		returnSegment = createSegmentAnalysis(
			"return",
			"Dropoff → Base (deadhead)",
			input.returnDistanceKm!,
			input.returnDurationMinutes ?? 0,
			settings,
			routingSource === "HAVERSINE_ESTIMATE",
		);
	}

	// Calculate totals
	const allSegments = [approachSegment, serviceSegment, returnSegment].filter(
		(s): s is SegmentAnalysis => s !== null,
	);
	
	const totalDistanceKm = allSegments.reduce((sum, s) => sum + s.distanceKm, 0);
	const totalDurationMinutes = allSegments.reduce((sum, s) => sum + s.durationMinutes, 0);
	const totalInternalCost = allSegments.reduce((sum, s) => sum + s.cost.total, 0);

	// Combine cost breakdowns
	const costBreakdown = combineCostBreakdowns(allSegments.map(s => s.cost));

	return {
		costBreakdown,
		vehicleSelection: input?.vehicleSelection,
		segments: {
			approach: approachSegment,
			service: serviceSegment,
			return: returnSegment,
		},
		totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
		totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
		totalInternalCost: Math.round(totalInternalCost * 100) / 100,
		calculatedAt,
		routingSource,
	};
}

/**
 * Build shadow calculation input from vehicle selection result
 */
export function buildShadowInputFromVehicleSelection(
	vehicleResult: {
		selectedCandidate?: {
			approachDistanceKm: number;
			approachDurationMinutes: number;
			serviceDistanceKm: number;
			serviceDurationMinutes: number;
			returnDistanceKm: number;
			returnDurationMinutes: number;
			routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
			vehicleId: string;
			vehicleName: string;
			baseId: string;
			baseName: string;
		} | null;
		candidatesConsidered: number;
		candidatesAfterCapacityFilter: number;
		candidatesAfterHaversineFilter: number;
		candidatesWithRouting: number;
		selectionCriterion: "MINIMAL_COST" | "BEST_MARGIN";
		fallbackUsed: boolean;
		fallbackReason?: string;
	} | null,
): ShadowCalculationInput | null {
	if (!vehicleResult) {
		return null;
	}

	const vehicleSelection: VehicleSelectionInfo = {
		candidatesConsidered: vehicleResult.candidatesConsidered,
		candidatesAfterCapacityFilter: vehicleResult.candidatesAfterCapacityFilter,
		candidatesAfterHaversineFilter: vehicleResult.candidatesAfterHaversineFilter,
		candidatesWithRouting: vehicleResult.candidatesWithRouting,
		selectionCriterion: vehicleResult.selectionCriterion,
		fallbackUsed: vehicleResult.fallbackUsed,
		fallbackReason: vehicleResult.fallbackReason,
	};

	if (vehicleResult.selectedCandidate) {
		const candidate = vehicleResult.selectedCandidate;
		vehicleSelection.selectedVehicle = {
			vehicleId: candidate.vehicleId,
			vehicleName: candidate.vehicleName,
			baseId: candidate.baseId,
			baseName: candidate.baseName,
		};
		vehicleSelection.routingSource = candidate.routingSource;

		return {
			approachDistanceKm: candidate.approachDistanceKm,
			approachDurationMinutes: candidate.approachDurationMinutes,
			serviceDistanceKm: candidate.serviceDistanceKm,
			serviceDurationMinutes: candidate.serviceDurationMinutes,
			returnDistanceKm: candidate.returnDistanceKm,
			returnDurationMinutes: candidate.returnDurationMinutes,
			routingSource: candidate.routingSource,
			vehicleSelection,
		};
	}

	// Fallback case - no vehicle selected
	return {
		vehicleSelection,
	};
}

// ============================================================================
// Multiplier Evaluation Functions (Story 4.3)
// ============================================================================

/**
 * Parse time string in HH:MM format to hours and minutes
 */
function parseTimeString(timeStr: string): { hours: number; minutes: number } {
	const [hours, minutes] = timeStr.split(":").map(Number);
	return { hours: hours ?? 0, minutes: minutes ?? 0 };
}

/**
 * Get hour and minute from a Date in Europe/Paris timezone
 * Since we store business times as-is (no TZ conversion), we just extract the values
 */
function getParisTime(date: Date): { hours: number; minutes: number; dayOfWeek: number } {
	// The date is already in Europe/Paris business time (per Story 1.4)
	// We just need to extract the components
	return {
		hours: date.getHours(),
		minutes: date.getMinutes(),
		dayOfWeek: date.getDay(), // 0 = Sunday, 6 = Saturday
	};
}

/**
 * Check if a time is within a time range (handles overnight ranges like 22:00-06:00)
 * @param hours - Current hour (0-23)
 * @param minutes - Current minutes (0-59)
 * @param startTime - Start time in HH:MM format
 * @param endTime - End time in HH:MM format
 */
export function isTimeInRange(
	hours: number,
	minutes: number,
	startTime: string,
	endTime: string,
): boolean {
	const start = parseTimeString(startTime);
	const end = parseTimeString(endTime);
	
	const currentMinutes = hours * 60 + minutes;
	const startMinutes = start.hours * 60 + start.minutes;
	const endMinutes = end.hours * 60 + end.minutes;
	
	// Handle overnight range (e.g., 22:00 to 06:00)
	if (startMinutes > endMinutes) {
		// Time is in range if it's after start OR before end
		return currentMinutes >= startMinutes || currentMinutes < endMinutes;
	}
	
	// Normal range (e.g., 09:00 to 18:00)
	return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

/**
 * Check if a day of week is in the configured days string
 * @param dayOfWeek - Day of week (0 = Sunday, 6 = Saturday)
 * @param daysOfWeek - Comma-separated string of days (e.g., "0,6" for weekend)
 */
export function isDayInRange(dayOfWeek: number, daysOfWeek: string): boolean {
	const days = daysOfWeek.split(",").map(d => parseInt(d.trim(), 10));
	return days.includes(dayOfWeek);
}

/**
 * Check if pickup time qualifies for NIGHT rate
 * Night is typically 22:00-06:00 in Europe/Paris
 */
export function isNightTime(pickupAt: Date, startTime: string, endTime: string): boolean {
	const { hours, minutes } = getParisTime(pickupAt);
	return isTimeInRange(hours, minutes, startTime, endTime);
}

/**
 * Check if pickup time qualifies for WEEKEND rate
 * Weekend is Saturday (6) and Sunday (0)
 */
export function isWeekend(pickupAt: Date, daysOfWeek: string | null): boolean {
	const { dayOfWeek } = getParisTime(pickupAt);
	// Default weekend days if not specified
	const weekendDays = daysOfWeek ?? "0,6";
	return isDayInRange(dayOfWeek, weekendDays);
}

/**
 * @deprecated LONG_DISTANCE rate type removed in Story 11.4
 * Distance-based pricing is now handled by zone multipliers (Story 11.3)
 * This function is kept for backward compatibility but always returns false
 */
export function isLongDistance(
	_distanceKm: number,
	_minDistanceKm: number | null,
	_maxDistanceKm: number | null,
): boolean {
	return false;
}

/**
 * Check if a date is within a date range (inclusive)
 */
export function isWithinDateRange(pickupAt: Date, startDate: Date, endDate: Date): boolean {
	const pickup = pickupAt.getTime();
	const start = startDate.getTime();
	// End date is inclusive, so we add one day
	const end = endDate.getTime() + 24 * 60 * 60 * 1000;
	return pickup >= start && pickup < end;
}

/**
 * Evaluate if an advanced rate applies to the given context
 * Note: LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY removed in Story 11.4
 * Zone-based pricing now handled by PricingZone.priceMultiplier (Story 11.3)
 */
export function evaluateAdvancedRate(
	rate: AdvancedRateData,
	context: MultiplierContext,
): boolean {
	// Skip inactive rates
	if (!rate.isActive) {
		return false;
	}

	// Check based on rate type (only NIGHT and WEEKEND supported)
	switch (rate.appliesTo) {
		case "NIGHT":
			if (!context.pickupAt || !rate.startTime || !rate.endTime) {
				return false;
			}
			return isNightTime(context.pickupAt, rate.startTime, rate.endTime);

		case "WEEKEND":
			if (!context.pickupAt) {
				return false;
			}
			return isWeekend(context.pickupAt, rate.daysOfWeek);

		default:
			// Unknown rate type - skip
			return false;
	}
}

/**
 * Apply an advanced rate adjustment to a price
 */
export function applyAdvancedRateAdjustment(
	price: number,
	rate: AdvancedRateData,
): number {
	if (rate.adjustmentType === "PERCENTAGE") {
		// Percentage adjustment: value is the percentage (e.g., 20 for +20%)
		return Math.round(price * (1 + rate.value / 100) * 100) / 100;
	} else {
		// Fixed amount adjustment
		return Math.round((price + rate.value) * 100) / 100;
	}
}

/**
 * Evaluate and apply all applicable advanced rates
 * Rates are applied in priority order (higher priority first)
 */
export function evaluateAdvancedRates(
	basePrice: number,
	context: MultiplierContext,
	rates: AdvancedRateData[],
): MultiplierEvaluationResult {
	const appliedRules: AppliedMultiplierRule[] = [];
	let currentPrice = basePrice;

	// Sort by priority (higher first)
	const sortedRates = [...rates].sort((a, b) => b.priority - a.priority);

	for (const rate of sortedRates) {
		if (evaluateAdvancedRate(rate, context)) {
			const priceBefore = currentPrice;
			currentPrice = applyAdvancedRateAdjustment(currentPrice, rate);

			appliedRules.push({
				type: "ADVANCED_RATE",
				description: `Applied ${rate.appliesTo} rate: ${rate.name}`,
				ruleId: rate.id,
				ruleName: rate.name,
				adjustmentType: rate.adjustmentType,
				adjustmentValue: rate.value,
				priceBefore,
				priceAfter: currentPrice,
			});
		}
	}

	return {
		adjustedPrice: currentPrice,
		appliedRules,
	};
}

/**
 * Evaluate if a seasonal multiplier applies to the given pickup time
 */
export function evaluateSeasonalMultiplier(
	multiplier: SeasonalMultiplierData,
	pickupAt: Date,
): boolean {
	if (!multiplier.isActive) {
		return false;
	}
	return isWithinDateRange(pickupAt, multiplier.startDate, multiplier.endDate);
}

/**
 * Apply a seasonal multiplier to a price
 */
export function applySeasonalMultiplier(
	price: number,
	multiplier: SeasonalMultiplierData,
): number {
	return Math.round(price * multiplier.multiplier * 100) / 100;
}

/**
 * Evaluate and apply all applicable seasonal multipliers
 * Multipliers are applied in priority order (higher priority first)
 */
export function evaluateSeasonalMultipliers(
	price: number,
	pickupAt: Date | null,
	multipliers: SeasonalMultiplierData[],
): MultiplierEvaluationResult {
	const appliedRules: AppliedMultiplierRule[] = [];
	let currentPrice = price;

	if (!pickupAt) {
		return { adjustedPrice: currentPrice, appliedRules };
	}

	// Sort by priority (higher first)
	const sortedMultipliers = [...multipliers].sort((a, b) => b.priority - a.priority);

	for (const multiplier of sortedMultipliers) {
		if (evaluateSeasonalMultiplier(multiplier, pickupAt)) {
			const priceBefore = currentPrice;
			currentPrice = applySeasonalMultiplier(currentPrice, multiplier);

			appliedRules.push({
				type: "SEASONAL_MULTIPLIER",
				description: `Applied seasonal multiplier: ${multiplier.name}`,
				ruleId: multiplier.id,
				ruleName: multiplier.name,
				adjustmentType: "MULTIPLIER",
				adjustmentValue: multiplier.multiplier,
				priceBefore,
				priceAfter: currentPrice,
			});
		}
	}

	return {
		adjustedPrice: currentPrice,
		appliedRules,
	};
}

/**
 * Apply all multipliers to a base price (Story 4.3)
 * Order: Advanced Rates → Seasonal Multipliers
 */
export function applyAllMultipliers(
	basePrice: number,
	context: MultiplierContext,
	advancedRates: AdvancedRateData[],
	seasonalMultipliers: SeasonalMultiplierData[],
): MultiplierEvaluationResult {
	const allAppliedRules: AppliedMultiplierRule[] = [];

	// Step 1: Apply advanced rates
	const advancedResult = evaluateAdvancedRates(basePrice, context, advancedRates);
	allAppliedRules.push(...advancedResult.appliedRules);

	// Step 2: Apply seasonal multipliers
	const seasonalResult = evaluateSeasonalMultipliers(
		advancedResult.adjustedPrice,
		context.pickupAt,
		seasonalMultipliers,
	);
	allAppliedRules.push(...seasonalResult.appliedRules);

	return {
		adjustedPrice: seasonalResult.adjustedPrice,
		appliedRules: allAppliedRules,
	};
}

// ============================================================================
// Story 11.3: Zone Pricing Multiplier Functions
// ============================================================================

/**
 * Apply zone pricing multiplier based on pickup and dropoff zones
 * Uses the highest multiplier between pickup and dropoff zone (Math.max)
 * 
 * @param basePrice - The base price before zone multiplier
 * @param pickupZone - The pickup zone data (may include priceMultiplier)
 * @param dropoffZone - The dropoff zone data (may include priceMultiplier)
 * @returns Zone multiplier result with adjusted price and applied rule
 */
export function applyZoneMultiplier(
	basePrice: number,
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
): ZoneMultiplierResult {
	const pickupMultiplier = pickupZone?.priceMultiplier ?? 1.0;
	const dropoffMultiplier = dropoffZone?.priceMultiplier ?? 1.0;
	
	// Use the highest multiplier
	const effectiveMultiplier = Math.max(pickupMultiplier, dropoffMultiplier);
	
	// If multiplier is 1.0 (default), no adjustment needed
	if (effectiveMultiplier === 1.0) {
		return {
			adjustedPrice: basePrice,
			appliedMultiplier: 1.0,
			appliedRule: null,
		};
	}
	
	// Determine which zone provided the multiplier
	const isPickupHigher = pickupMultiplier >= dropoffMultiplier;
	const sourceZone = isPickupHigher ? pickupZone : dropoffZone;
	const source: "pickup" | "dropoff" = isPickupHigher ? "pickup" : "dropoff";
	
	const adjustedPrice = Math.round(basePrice * effectiveMultiplier * 100) / 100;
	
	return {
		adjustedPrice,
		appliedMultiplier: effectiveMultiplier,
		appliedRule: sourceZone ? {
			type: "ZONE_MULTIPLIER",
			description: `Zone multiplier applied: ${sourceZone.name} (${effectiveMultiplier}×)`,
			zoneId: sourceZone.id,
			zoneName: sourceZone.name,
			zoneCode: sourceZone.code,
			multiplier: effectiveMultiplier,
			source,
			priceBefore: basePrice,
			priceAfter: adjustedPrice,
		} : null,
	};
}

// ============================================================================
// Grid Matching Functions
// ============================================================================

/**
 * Story 12.2: Matched route with effective price information
 */
export interface MatchedRouteWithPrice {
	route: ZoneRouteAssignment["zoneRoute"];
	catalogPrice: number;
	overridePrice: number | null;
	effectivePrice: number;
	isOverride: boolean;
}

/**
 * Match result with search details
 */
export interface MatchZoneRouteResult {
	matchedRoute: MatchedRouteWithPrice | null;
	routesChecked: RouteCheckResult[];
}

/**
 * Story 12.2: Helper to build matched route with effective price
 */
function buildMatchedRouteWithPrice(
	assignment: ZoneRouteAssignment,
): MatchedRouteWithPrice {
	const route = assignment.zoneRoute;
	const catalogPrice = Number(route.fixedPrice);
	const overridePrice = assignment.overridePrice != null ? Number(assignment.overridePrice) : null;
	const isOverride = overridePrice !== null && overridePrice > 0;
	const effectivePrice = isOverride ? overridePrice : catalogPrice;

	return {
		route,
		catalogPrice,
		overridePrice,
		effectivePrice,
		isOverride,
	};
}

// ============================================================================
// Story 14.5: Multi-Zone and Address-Based Matching Helpers
// ============================================================================

/**
 * Story 14.5: Address matching proximity threshold in meters
 */
const ADDRESS_PROXIMITY_THRESHOLD_METERS = 100;

/**
 * Story 14.5: Calculate distance between two points using Haversine formula
 * Returns distance in meters
 */
function calculateDistanceMeters(
	lat1: number,
	lng1: number,
	lat2: number,
	lng2: number,
): number {
	const R = 6371000; // Earth's radius in meters
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos((lat1 * Math.PI) / 180) *
			Math.cos((lat2 * Math.PI) / 180) *
			Math.sin(dLng / 2) *
			Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

/**
 * Story 14.5: Check if a point matches an address-based route origin/destination
 */
function isAddressMatch(
	point: GeoPoint | null | undefined,
	routeLat: number | null | undefined,
	routeLng: number | null | undefined,
): boolean {
	if (!point || routeLat == null || routeLng == null) {
		return false;
	}
	const distance = calculateDistanceMeters(point.lat, point.lng, routeLat, routeLng);
	return distance <= ADDRESS_PROXIMITY_THRESHOLD_METERS;
}

/**
 * Story 14.5: Check if a zone ID is in the route's origin zones
 */
function isZoneInOriginZones(
	zoneId: string,
	route: ZoneRouteAssignment["zoneRoute"],
): boolean {
	if (!route.originZones || route.originZones.length === 0) {
		return false;
	}
	return route.originZones.some((oz) => oz.zone.id === zoneId);
}

/**
 * Story 14.5: Check if a zone ID is in the route's destination zones
 */
function isZoneInDestinationZones(
	zoneId: string,
	route: ZoneRouteAssignment["zoneRoute"],
): boolean {
	if (!route.destinationZones || route.destinationZones.length === 0) {
		return false;
	}
	return route.destinationZones.some((dz) => dz.zone.id === zoneId);
}

/**
 * Story 14.5: Generate route name for display (handles multi-zone and address routes)
 * Exported as getRouteDisplayName for use in calculatePrice
 */
export function getRouteDisplayName(route: ZoneRouteAssignment["zoneRoute"]): string {
	let originName: string;
	let destName: string;

	// Determine origin name
	if (route.originType === "ADDRESS" && route.originAddress) {
		originName = route.originAddress.substring(0, 30) + (route.originAddress.length > 30 ? "..." : "");
	} else if (route.originZones && route.originZones.length > 0) {
		if (route.originZones.length === 1) {
			originName = route.originZones[0].zone.name;
		} else {
			originName = `[${route.originZones.length} zones]`;
		}
	} else if (route.fromZone) {
		originName = route.fromZone.name;
	} else {
		originName = "Unknown";
	}

	// Determine destination name
	if (route.destinationType === "ADDRESS" && route.destAddress) {
		destName = route.destAddress.substring(0, 30) + (route.destAddress.length > 30 ? "..." : "");
	} else if (route.destinationZones && route.destinationZones.length > 0) {
		if (route.destinationZones.length === 1) {
			destName = route.destinationZones[0].zone.name;
		} else {
			destName = `[${route.destinationZones.length} zones]`;
		}
	} else if (route.toZone) {
		destName = route.toZone.name;
	} else {
		destName = "Unknown";
	}

	return `${originName} → ${destName}`;
}

/**
 * Story 14.5: Get route priority for sorting (lower = higher priority)
 * Priority order:
 * 1. ADDRESS origin + ADDRESS destination (priority 1)
 * 2. ADDRESS origin + ZONES destination (priority 2)
 * 3. ZONES origin + ADDRESS destination (priority 3)
 * 4. ZONES origin + ZONES destination (priority 4)
 * 5. Legacy fromZoneId/toZoneId only (priority 5)
 */
function getRoutePriority(route: ZoneRouteAssignment["zoneRoute"]): number {
	const hasMultiZoneOrigin = route.originZones && route.originZones.length > 0;
	const hasMultiZoneDest = route.destinationZones && route.destinationZones.length > 0;
	const isAddressOrigin = route.originType === "ADDRESS";
	const isAddressDest = route.destinationType === "ADDRESS";

	if (isAddressOrigin && isAddressDest) return 1;
	if (isAddressOrigin && !isAddressDest) return 2;
	if (!isAddressOrigin && isAddressDest) return 3;
	if (hasMultiZoneOrigin || hasMultiZoneDest) return 4;
	return 5; // Legacy routes
}

/**
 * Story 14.5: Check if route matches using multi-zone logic
 * Returns { matchesForward, matchesReverse }
 */
function checkMultiZoneMatch(
	fromZone: ZoneData | null,
	toZone: ZoneData | null,
	route: ZoneRouteAssignment["zoneRoute"],
	pickupPoint?: GeoPoint,
	dropoffPoint?: GeoPoint,
): { matchesForward: boolean; matchesReverse: boolean } {
	let originMatchForward = false;
	let destMatchForward = false;
	let originMatchReverse = false;
	let destMatchReverse = false;

	// Check origin match (forward direction)
	if (route.originType === "ADDRESS") {
		// Address-based origin: check proximity to pickup point
		originMatchForward = isAddressMatch(pickupPoint, route.originLat, route.originLng);
		originMatchReverse = isAddressMatch(dropoffPoint, route.originLat, route.originLng);
	} else {
		// Zone-based origin: check if pickup zone is in originZones
		if (fromZone && route.originZones && route.originZones.length > 0) {
			originMatchForward = isZoneInOriginZones(fromZone.id, route);
		} else if (fromZone && route.fromZoneId) {
			// Fallback to legacy fromZoneId
			originMatchForward = route.fromZoneId === fromZone.id;
		}
		if (toZone && route.originZones && route.originZones.length > 0) {
			originMatchReverse = isZoneInOriginZones(toZone.id, route);
		} else if (toZone && route.fromZoneId) {
			originMatchReverse = route.fromZoneId === toZone.id;
		}
	}

	// Check destination match (forward direction)
	if (route.destinationType === "ADDRESS") {
		// Address-based destination: check proximity to dropoff point
		destMatchForward = isAddressMatch(dropoffPoint, route.destLat, route.destLng);
		destMatchReverse = isAddressMatch(pickupPoint, route.destLat, route.destLng);
	} else {
		// Zone-based destination: check if dropoff zone is in destinationZones
		if (toZone && route.destinationZones && route.destinationZones.length > 0) {
			destMatchForward = isZoneInDestinationZones(toZone.id, route);
		} else if (toZone && route.toZoneId) {
			// Fallback to legacy toZoneId
			destMatchForward = route.toZoneId === toZone.id;
		}
		if (fromZone && route.destinationZones && route.destinationZones.length > 0) {
			destMatchReverse = isZoneInDestinationZones(fromZone.id, route);
		} else if (fromZone && route.toZoneId) {
			destMatchReverse = route.toZoneId === fromZone.id;
		}
	}

	return {
		matchesForward: originMatchForward && destMatchForward,
		matchesReverse: originMatchReverse && destMatchReverse,
	};
}

/**
 * Match a zone route for a transfer with detailed search results
 * Story 12.2: Now returns effective price considering overridePrice
 * Story 14.5: Extended to support multi-zone and address-based routes
 */
export function matchZoneRouteWithDetails(
	fromZone: ZoneData | null,
	toZone: ZoneData | null,
	vehicleCategoryId: string,
	contractRoutes: ZoneRouteAssignment[],
	pickupPoint?: GeoPoint,
	dropoffPoint?: GeoPoint,
): MatchZoneRouteResult {
	const routesChecked: RouteCheckResult[] = [];

	// Story 14.5: Sort routes by priority (address routes first, then multi-zone, then legacy)
	const sortedRoutes = [...contractRoutes].sort((a, b) => {
		return getRoutePriority(a.zoneRoute) - getRoutePriority(b.zoneRoute);
	});

	// Story 14.5: For address-based routes, we can match even without zones
	// but for zone-based routes, we need at least one zone
	const canMatchZoneBased = fromZone || toZone;

	for (const assignment of sortedRoutes) {
		const route = assignment.zoneRoute;
		const routeName = getRouteDisplayName(route);

		// Check if inactive
		if (!route.isActive) {
			routesChecked.push({
				routeId: route.id,
				routeName,
				fromZone: route.fromZone?.name ?? "N/A",
				toZone: route.toZone?.name ?? "N/A",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}

		// Check vehicle category
		if (route.vehicleCategoryId !== vehicleCategoryId) {
			routesChecked.push({
				routeId: route.id,
				routeName,
				fromZone: route.fromZone?.name ?? "N/A",
				toZone: route.toZone?.name ?? "N/A",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}

		// Story 14.5: Use multi-zone matching logic
		const { matchesForward, matchesReverse } = checkMultiZoneMatch(
			fromZone,
			toZone,
			route,
			pickupPoint,
			dropoffPoint,
		);

		// Check direction and return match if found
		if (route.direction === "BIDIRECTIONAL") {
			if (matchesForward || matchesReverse) {
				return { matchedRoute: buildMatchedRouteWithPrice(assignment), routesChecked };
			}
			routesChecked.push({
				routeId: route.id,
				routeName,
				fromZone: route.fromZone?.name ?? "N/A",
				toZone: route.toZone?.name ?? "N/A",
				vehicleCategory: route.vehicleCategoryId,
				rejectionReason: "ZONE_MISMATCH",
			});
		} else if (route.direction === "A_TO_B") {
			if (matchesForward) {
				return { matchedRoute: buildMatchedRouteWithPrice(assignment), routesChecked };
			}
			if (matchesReverse) {
				routesChecked.push({
					routeId: route.id,
					routeName,
					fromZone: route.fromZone?.name ?? "N/A",
					toZone: route.toZone?.name ?? "N/A",
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "DIRECTION_MISMATCH",
				});
			} else {
				routesChecked.push({
					routeId: route.id,
					routeName,
					fromZone: route.fromZone?.name ?? "N/A",
					toZone: route.toZone?.name ?? "N/A",
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
			}
		} else if (route.direction === "B_TO_A") {
			if (matchesReverse) {
				return { matchedRoute: buildMatchedRouteWithPrice(assignment), routesChecked };
			}
			if (matchesForward) {
				routesChecked.push({
					routeId: route.id,
					routeName,
					fromZone: route.fromZone?.name ?? "N/A",
					toZone: route.toZone?.name ?? "N/A",
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "DIRECTION_MISMATCH",
				});
			} else {
				routesChecked.push({
					routeId: route.id,
					routeName,
					fromZone: route.fromZone?.name ?? "N/A",
					toZone: route.toZone?.name ?? "N/A",
					vehicleCategory: route.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
			}
		}
	}

	return { matchedRoute: null, routesChecked };
}

/**
 * Match a zone route for a transfer (backward compatible)
 * Story 12.2: Now returns route only (without price info) for backward compatibility
 */
export function matchZoneRoute(
	fromZone: ZoneData | null,
	toZone: ZoneData | null,
	vehicleCategoryId: string,
	contractRoutes: ZoneRouteAssignment[],
): ZoneRouteAssignment["zoneRoute"] | null {
	const result = matchZoneRouteWithDetails(fromZone, toZone, vehicleCategoryId, contractRoutes);
	return result.matchedRoute?.route ?? null;
}

/**
 * Story 12.2: Matched excursion with effective price information
 */
export interface MatchedExcursionWithPrice {
	excursion: ExcursionPackageAssignment["excursionPackage"];
	catalogPrice: number;
	overridePrice: number | null;
	effectivePrice: number;
	isOverride: boolean;
}

/**
 * Match result with search details for excursions
 */
export interface MatchExcursionResult {
	matchedExcursion: MatchedExcursionWithPrice | null;
	excursionsChecked: ExcursionCheckResult[];
}

/**
 * Story 12.2: Helper to build matched excursion with effective price
 */
function buildMatchedExcursionWithPrice(
	assignment: ExcursionPackageAssignment,
): MatchedExcursionWithPrice {
	const excursion = assignment.excursionPackage;
	const catalogPrice = Number(excursion.price);
	const overridePrice = assignment.overridePrice != null ? Number(assignment.overridePrice) : null;
	const isOverride = overridePrice !== null && overridePrice > 0;
	const effectivePrice = isOverride ? overridePrice : catalogPrice;

	return {
		excursion,
		catalogPrice,
		overridePrice,
		effectivePrice,
		isOverride,
	};
}

/**
 * Match an excursion package with detailed search results
 * Story 12.2: Now returns effective price considering overridePrice
 */
export function matchExcursionPackageWithDetails(
	originZone: ZoneData | null,
	destinationZone: ZoneData | null,
	vehicleCategoryId: string,
	contractExcursions: ExcursionPackageAssignment[],
): MatchExcursionResult {
	const excursionsChecked: ExcursionCheckResult[] = [];

	for (const assignment of contractExcursions) {
		const excursion = assignment.excursionPackage;

		// Check if inactive
		if (!excursion.isActive) {
			excursionsChecked.push({
				excursionId: excursion.id,
				excursionName: excursion.name,
				originZone: excursion.originZone?.name ?? null,
				destinationZone: excursion.destinationZone?.name ?? null,
				vehicleCategory: excursion.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}

		// Check vehicle category
		if (excursion.vehicleCategoryId !== vehicleCategoryId) {
			excursionsChecked.push({
				excursionId: excursion.id,
				excursionName: excursion.name,
				originZone: excursion.originZone?.name ?? null,
				destinationZone: excursion.destinationZone?.name ?? null,
				vehicleCategory: excursion.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}

		// Check origin zone match (if specified)
		if (excursion.originZoneId) {
			if (!originZone || excursion.originZoneId !== originZone.id) {
				excursionsChecked.push({
					excursionId: excursion.id,
					excursionName: excursion.name,
					originZone: excursion.originZone?.name ?? null,
					destinationZone: excursion.destinationZone?.name ?? null,
					vehicleCategory: excursion.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
				continue;
			}
		}

		// Check destination zone match (if specified)
		if (excursion.destinationZoneId) {
			if (!destinationZone || excursion.destinationZoneId !== destinationZone.id) {
				excursionsChecked.push({
					excursionId: excursion.id,
					excursionName: excursion.name,
					originZone: excursion.originZone?.name ?? null,
					destinationZone: excursion.destinationZone?.name ?? null,
					vehicleCategory: excursion.vehicleCategoryId,
					rejectionReason: "ZONE_MISMATCH",
				});
				continue;
			}
		}

		// If we get here, it's a match - Story 12.2: Return with effective price
		return { matchedExcursion: buildMatchedExcursionWithPrice(assignment), excursionsChecked };
	}

	return { matchedExcursion: null, excursionsChecked };
}

/**
 * Match an excursion package (backward compatible)
 * Story 12.2: Now returns excursion only (without price info) for backward compatibility
 */
export function matchExcursionPackage(
	originZone: ZoneData | null,
	destinationZone: ZoneData | null,
	vehicleCategoryId: string,
	contractExcursions: ExcursionPackageAssignment[],
): ExcursionPackageAssignment["excursionPackage"] | null {
	const result = matchExcursionPackageWithDetails(originZone, destinationZone, vehicleCategoryId, contractExcursions);
	return result.matchedExcursion?.excursion ?? null;
}

/**
 * Story 12.2: Matched dispo with effective price information
 */
export interface MatchedDispoWithPrice {
	dispo: DispoPackageAssignment["dispoPackage"];
	catalogPrice: number;
	overridePrice: number | null;
	effectivePrice: number;
	isOverride: boolean;
}

/**
 * Match result with search details for dispos
 */
export interface MatchDispoResult {
	matchedDispo: MatchedDispoWithPrice | null;
	disposChecked: DispoCheckResult[];
}

/**
 * Story 12.2: Helper to build matched dispo with effective price
 */
function buildMatchedDispoWithPrice(
	assignment: DispoPackageAssignment,
): MatchedDispoWithPrice {
	const dispo = assignment.dispoPackage;
	const catalogPrice = Number(dispo.basePrice);
	const overridePrice = assignment.overridePrice != null ? Number(assignment.overridePrice) : null;
	const isOverride = overridePrice !== null && overridePrice > 0;
	const effectivePrice = isOverride ? overridePrice : catalogPrice;

	return {
		dispo,
		catalogPrice,
		overridePrice,
		effectivePrice,
		isOverride,
	};
}

/**
 * Match a dispo package with detailed search results
 * Story 12.2: Now returns effective price considering overridePrice
 */
export function matchDispoPackageWithDetails(
	vehicleCategoryId: string,
	contractDispos: DispoPackageAssignment[],
): MatchDispoResult {
	const disposChecked: DispoCheckResult[] = [];

	for (const assignment of contractDispos) {
		const dispo = assignment.dispoPackage;

		// Check if inactive
		if (!dispo.isActive) {
			disposChecked.push({
				dispoId: dispo.id,
				dispoName: dispo.name,
				vehicleCategory: dispo.vehicleCategoryId,
				rejectionReason: "INACTIVE",
			});
			continue;
		}

		// Check vehicle category
		if (dispo.vehicleCategoryId !== vehicleCategoryId) {
			disposChecked.push({
				dispoId: dispo.id,
				dispoName: dispo.name,
				vehicleCategory: dispo.vehicleCategoryId,
				rejectionReason: "CATEGORY_MISMATCH",
			});
			continue;
		}

		// Match found - Story 12.2: Return with effective price
		return { matchedDispo: buildMatchedDispoWithPrice(assignment), disposChecked };
	}

	return { matchedDispo: null, disposChecked };
}

/**
 * Match a dispo package (backward compatible)
 * Story 12.2: Now returns dispo only (without price info) for backward compatibility
 */
export function matchDispoPackage(
	vehicleCategoryId: string,
	contractDispos: DispoPackageAssignment[],
): DispoPackageAssignment["dispoPackage"] | null {
	const result = matchDispoPackageWithDetails(vehicleCategoryId, contractDispos);
	return result.matchedDispo?.dispo ?? null;
}

// ============================================================================
// Dynamic Pricing (Story 4.1 - Base Dynamic Price Calculation)
// ============================================================================

/**
 * Result of dynamic base price calculation with full details
 * PRD Formula: basePrice = max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)
 */
export interface DynamicBaseCalculationResult {
	distanceBasedPrice: number;
	durationBasedPrice: number;
	selectedMethod: "distance" | "duration";
	basePrice: number;
	priceWithMargin: number;
	inputs: {
		distanceKm: number;
		durationMinutes: number;
		baseRatePerKm: number;
		baseRatePerHour: number;
		targetMarginPercent: number;
	};
}

/**
 * Default pricing settings when organization has none configured
 */
export const DEFAULT_PRICING_SETTINGS: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
};

/**
 * Calculate dynamic base price with full calculation details
 * PRD Formula: basePrice = max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)
 * 
 * @param distanceKm - Trip distance in kilometers
 * @param durationMinutes - Trip duration in minutes
 * @param settings - Organization pricing settings
 * @returns Full calculation result with inputs and intermediate values
 */
export function calculateDynamicBasePrice(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): DynamicBaseCalculationResult {
	const durationHours = durationMinutes / 60;

	// Calculate both price methods
	const distanceBasedPrice = Math.round(distanceKm * settings.baseRatePerKm * 100) / 100;
	const durationBasedPrice = Math.round(durationHours * settings.baseRatePerHour * 100) / 100;

	// Select the higher price (PRD max formula)
	const selectedMethod: "distance" | "duration" = 
		distanceBasedPrice >= durationBasedPrice ? "distance" : "duration";
	const basePrice = Math.max(distanceBasedPrice, durationBasedPrice);

	// Apply target margin
	const priceWithMargin = Math.round(basePrice * (1 + settings.targetMarginPercent / 100) * 100) / 100;

	return {
		distanceBasedPrice,
		durationBasedPrice,
		selectedMethod,
		basePrice,
		priceWithMargin,
		inputs: {
			distanceKm,
			durationMinutes,
			baseRatePerKm: settings.baseRatePerKm,
			baseRatePerHour: settings.baseRatePerHour,
			targetMarginPercent: settings.targetMarginPercent,
		},
	};
}

/**
 * Calculate basic dynamic price (backward compatible)
 * Formula: max(distance * ratePerKm, duration * ratePerHour)
 */
export function calculateDynamicPrice(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): number {
	return calculateDynamicBasePrice(distanceKm, durationMinutes, settings).priceWithMargin;
}

// ============================================================================
// Main Pricing Engine
// ============================================================================

export interface PricingEngineContext {
	contact: ContactData;
	zones: ZoneData[];
	pricingSettings: OrganizationPricingSettings;
	// Story 4.3: Multipliers (optional for backward compatibility)
	advancedRates?: AdvancedRateData[];
	seasonalMultipliers?: SeasonalMultiplierData[];
}

/**
 * Main pricing engine function
 * Implements the Engagement Rule for partners and fallback to dynamic pricing
 */
export function calculatePrice(
	request: PricingRequest,
	context: PricingEngineContext,
): PricingResult {
	const appliedRules: AppliedRule[] = [];
	const { contact, zones, pricingSettings, advancedRates = [], seasonalMultipliers = [] } = context;

	// Default values for distance/duration estimation
	const estimatedDistanceKm = request.estimatedDistanceKm ?? 30;
	const estimatedDurationMinutes = request.estimatedDurationMinutes ?? 45;

	// Initialize search details collector
	let routesChecked: RouteCheckResult[] = [];
	let excursionsChecked: ExcursionCheckResult[] = [];
	let disposChecked: DispoCheckResult[] = [];

	// Build multiplier context (Story 4.3)
	const pickupAt = request.pickupAt ? new Date(request.pickupAt) : null;

	// Map pickup/dropoff to zones early for multiplier context (Story 4.3)
	// This is needed even for private clients to support ZONE_SCENARIO rates
	const pickupZone = findZoneForPoint(request.pickup, zones);
	const dropoffZone = findZoneForPoint(request.dropoff, zones);

	// -------------------------------------------------------------------------
	// Step 1: Check if contact is a partner
	// -------------------------------------------------------------------------
	if (!contact.isPartner) {
		appliedRules.push({
			type: "PRIVATE_CLIENT",
			description: "Private client - grid matching skipped",
		});

		return buildDynamicResult(
			estimatedDistanceKm,
			estimatedDurationMinutes,
			pricingSettings,
			appliedRules,
			"PRIVATE_CLIENT",
			null,
			false,
			// Story 4.3: Pass multiplier context with zone IDs
			{
				pickupAt,
				distanceKm: estimatedDistanceKm,
				pickupZoneId: pickupZone?.id ?? null,
				dropoffZoneId: dropoffZone?.id ?? null,
			},
			advancedRates,
			seasonalMultipliers,
			null, // shadowInput
			// Story 11.3: Pass zones for zone pricing multiplier
			pickupZone,
			dropoffZone,
		);
	}

	// -------------------------------------------------------------------------
	// Step 2: Check if partner has a contract with grids
	// -------------------------------------------------------------------------
	const contract = contact.partnerContract;
	if (!contract) {
		appliedRules.push({
			type: "NO_CONTRACT",
			description: "Partner has no active contract with grids",
		});

		return buildDynamicResult(
			estimatedDistanceKm,
			estimatedDurationMinutes,
			pricingSettings,
			appliedRules,
			"NO_CONTRACT",
			null,
			false,
			// Story 4.3: Pass multiplier context
			{
				pickupAt,
				distanceKm: estimatedDistanceKm,
				pickupZoneId: null,
				dropoffZoneId: null,
			},
			advancedRates,
			seasonalMultipliers,
			null, // shadowInput
			// Story 11.3: No zones for NO_CONTRACT case
			null,
			null,
		);
	}

	// -------------------------------------------------------------------------
	// Step 3: Add zone mapping to applied rules (zones already mapped above)
	// -------------------------------------------------------------------------
	appliedRules.push({
		type: "ZONE_MAPPING",
		description: "Mapped coordinates to zones",
		pickupZone: pickupZone?.name ?? "Unknown",
		pickupZoneId: pickupZone?.id ?? null,
		dropoffZone: dropoffZone?.name ?? "Unknown",
		dropoffZoneId: dropoffZone?.id ?? null,
	});

	// Build base search details
	const baseSearchDetails: Omit<GridSearchDetails, "routesChecked" | "excursionsChecked" | "disposChecked"> = {
		pickupZone: pickupZone ? { id: pickupZone.id, name: pickupZone.name, code: pickupZone.code } : null,
		dropoffZone: dropoffZone ? { id: dropoffZone.id, name: dropoffZone.name, code: dropoffZone.code } : null,
		vehicleCategoryId: request.vehicleCategoryId,
		tripType: request.tripType,
	};

	// -------------------------------------------------------------------------
	// Step 4: Try to match grids based on trip type
	// -------------------------------------------------------------------------

	// 4a: For transfers, try ZoneRoute first
	if (request.tripType === "transfer") {
		// Story 14.5: Pass pickup/dropoff points for address-based route matching
		const routeResult = matchZoneRouteWithDetails(
			pickupZone,
			dropoffZone,
			request.vehicleCategoryId,
			contract.zoneRoutes,
			request.pickup,
			request.dropoff,
		);
		routesChecked = routeResult.routesChecked;

		if (routeResult.matchedRoute) {
			const matchedRouteWithPrice = routeResult.matchedRoute;
			const route = matchedRouteWithPrice.route;
			// Story 12.2: Use effective price (override if set, otherwise catalog)
			const price = matchedRouteWithPrice.effectivePrice;

			// Story 14.5: Generate route name for multi-zone/address routes
			const routeDisplayName = getRouteDisplayName(route);

			// Story 12.2: Add appropriate rule based on price source
			if (matchedRouteWithPrice.isOverride) {
				appliedRules.push({
					type: "PARTNER_OVERRIDE_PRICE",
					description: "Partner-specific negotiated price applied (Engagement Rule)",
					gridType: "ZoneRoute",
					gridId: route.id,
					catalogPrice: matchedRouteWithPrice.catalogPrice,
					overridePrice: matchedRouteWithPrice.overridePrice,
					effectivePrice: price,
				});
			} else {
				appliedRules.push({
					type: "CATALOG_PRICE",
					description: "Catalog grid price applied (Engagement Rule)",
					gridType: "ZoneRoute",
					gridId: route.id,
					catalogPrice: matchedRouteWithPrice.catalogPrice,
					effectivePrice: price,
				});
			}

			return buildGridResult(
				price,
				estimatedDistanceKm,
				estimatedDurationMinutes,
				pricingSettings,
				{
					type: "ZoneRoute",
					id: route.id,
					name: routeDisplayName,
					fromZone: route.fromZone?.name ?? "N/A",
					toZone: route.toZone?.name ?? "N/A",
				},
				appliedRules,
			);
		}
	}

	// 4b: For excursions, try ExcursionPackage
	if (request.tripType === "excursion") {
		const excursionResult = matchExcursionPackageWithDetails(
			pickupZone,
			dropoffZone,
			request.vehicleCategoryId,
			contract.excursionPackages,
		);
		excursionsChecked = excursionResult.excursionsChecked;

		if (excursionResult.matchedExcursion) {
			const matchedExcursionWithPrice = excursionResult.matchedExcursion;
			const excursion = matchedExcursionWithPrice.excursion;
			// Story 12.2: Use effective price (override if set, otherwise catalog)
			const price = matchedExcursionWithPrice.effectivePrice;

			// Story 12.2: Add appropriate rule based on price source
			if (matchedExcursionWithPrice.isOverride) {
				appliedRules.push({
					type: "PARTNER_OVERRIDE_PRICE",
					description: "Partner-specific negotiated price applied (Engagement Rule)",
					gridType: "ExcursionPackage",
					gridId: excursion.id,
					catalogPrice: matchedExcursionWithPrice.catalogPrice,
					overridePrice: matchedExcursionWithPrice.overridePrice,
					effectivePrice: price,
				});
			} else {
				appliedRules.push({
					type: "CATALOG_PRICE",
					description: "Catalog excursion price applied (Engagement Rule)",
					gridType: "ExcursionPackage",
					gridId: excursion.id,
					catalogPrice: matchedExcursionWithPrice.catalogPrice,
					effectivePrice: price,
				});
			}

			return buildGridResult(
				price,
				estimatedDistanceKm,
				estimatedDurationMinutes,
				pricingSettings,
				{
					type: "ExcursionPackage",
					id: excursion.id,
					name: excursion.name,
					fromZone: excursion.originZone?.name,
					toZone: excursion.destinationZone?.name,
				},
				appliedRules,
			);
		}
	}

	// 4c: For dispos, try DispoPackage
	if (request.tripType === "dispo") {
		const dispoResult = matchDispoPackageWithDetails(
			request.vehicleCategoryId,
			contract.dispoPackages,
		);
		disposChecked = dispoResult.disposChecked;

		if (dispoResult.matchedDispo) {
			const matchedDispoWithPrice = dispoResult.matchedDispo;
			const dispo = matchedDispoWithPrice.dispo;
			// Story 12.2: Use effective price (override if set, otherwise catalog)
			const price = matchedDispoWithPrice.effectivePrice;

			// Story 12.2: Add appropriate rule based on price source
			if (matchedDispoWithPrice.isOverride) {
				appliedRules.push({
					type: "PARTNER_OVERRIDE_PRICE",
					description: "Partner-specific negotiated price applied (Engagement Rule)",
					gridType: "DispoPackage",
					gridId: dispo.id,
					catalogPrice: matchedDispoWithPrice.catalogPrice,
					overridePrice: matchedDispoWithPrice.overridePrice,
					effectivePrice: price,
				});
			} else {
				appliedRules.push({
					type: "CATALOG_PRICE",
					description: "Catalog dispo price applied (Engagement Rule)",
					gridType: "DispoPackage",
					gridId: dispo.id,
					catalogPrice: matchedDispoWithPrice.catalogPrice,
					effectivePrice: price,
				});
			}

			return buildGridResult(
				price,
				estimatedDistanceKm,
				estimatedDurationMinutes,
				pricingSettings,
				{
					type: "DispoPackage",
					id: dispo.id,
					name: dispo.name,
				},
				appliedRules,
			);
		}
	}

	// -------------------------------------------------------------------------
	// Step 5: No grid match - fallback to dynamic pricing
	// -------------------------------------------------------------------------

	// Determine fallback reason
	let fallbackReason: FallbackReason;
	if (!pickupZone || !dropoffZone) {
		fallbackReason = "NO_ZONE_MATCH";
	} else if (request.tripType === "transfer") {
		fallbackReason = "NO_ROUTE_MATCH";
	} else if (request.tripType === "excursion") {
		fallbackReason = "NO_EXCURSION_MATCH";
	} else {
		fallbackReason = "NO_DISPO_MATCH";
	}

	// Build complete search details
	const gridSearchDetails: GridSearchDetails = {
		...baseSearchDetails,
		routesChecked,
		excursionsChecked,
		disposChecked,
	};

	// Add search summary to applied rules
	appliedRules.push({
		type: "GRID_SEARCH_ATTEMPTED",
		description: `Searched ${routesChecked.length} routes, ${excursionsChecked.length} excursions, ${disposChecked.length} dispos in partner contract, none matched`,
		routesChecked: routesChecked.length,
		excursionsChecked: excursionsChecked.length,
		disposChecked: disposChecked.length,
	});

	appliedRules.push({
		type: "NO_GRID_MATCH",
		description: "No matching grid found for partner, using dynamic pricing",
		reason: fallbackReason,
		pickupZone: pickupZone?.code ?? "UNKNOWN",
		dropoffZone: dropoffZone?.code ?? "UNKNOWN",
		tripType: request.tripType,
		vehicleCategoryId: request.vehicleCategoryId,
	});

	return buildDynamicResult(
		estimatedDistanceKm,
		estimatedDurationMinutes,
		pricingSettings,
		appliedRules,
		fallbackReason,
		gridSearchDetails,
		false,
		// Story 4.3: Pass multiplier context
		{
			pickupAt,
			distanceKm: estimatedDistanceKm,
			pickupZoneId: pickupZone?.id ?? null,
			dropoffZoneId: dropoffZone?.id ?? null,
		},
		advancedRates,
		seasonalMultipliers,
		null, // shadowInput
		// Story 11.3: Pass zones for zone pricing multiplier
		pickupZone,
		dropoffZone,
	);
}

/**
 * Build a dynamic pricing result with enhanced calculation details (Story 4.1 + 4.2 + 4.3 + 4.6 + 11.3)
 * Story 4.3: Now applies multipliers (advanced rates + seasonal) to the base price
 * Story 4.6: Now includes full shadow calculation with segments A/B/C
 * Story 11.3: Now applies zone pricing multipliers
 */
function buildDynamicResult(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	appliedRules: AppliedRule[],
	fallbackReason: FallbackReason,
	gridSearchDetails: GridSearchDetails | null,
	usingDefaultSettings: boolean = false,
	// Story 4.3: Multiplier parameters
	multiplierContext: MultiplierContext | null = null,
	advancedRates: AdvancedRateData[] = [],
	seasonalMultipliers: SeasonalMultiplierData[] = [],
	// Story 4.6: Shadow calculation input (from vehicle selection)
	shadowInput: ShadowCalculationInput | null = null,
	// Story 11.3: Zone data for zone pricing multipliers
	pickupZone: ZoneData | null = null,
	dropoffZone: ZoneData | null = null,
): PricingResult {
	// Calculate with full details
	const calculation = calculateDynamicBasePrice(distanceKm, durationMinutes, settings);
	let price = calculation.priceWithMargin;
	
	// Add enhanced calculation rule (Story 4.1 - AC3)
	appliedRules.push({
		type: "DYNAMIC_BASE_CALCULATION",
		description: `Base price calculated using max(distance, duration) formula - ${calculation.selectedMethod} method selected`,
		inputs: calculation.inputs,
		calculation: {
			distanceBasedPrice: calculation.distanceBasedPrice,
			durationBasedPrice: calculation.durationBasedPrice,
			selectedMethod: calculation.selectedMethod,
			basePrice: calculation.basePrice,
			priceWithMargin: calculation.priceWithMargin,
		},
		usingDefaultSettings,
	});

	// Story 11.3: Apply zone pricing multiplier FIRST (before other multipliers)
	const zoneMultiplierResult = applyZoneMultiplier(price, pickupZone, dropoffZone);
	if (zoneMultiplierResult.appliedRule) {
		price = zoneMultiplierResult.adjustedPrice;
		appliedRules.push(zoneMultiplierResult.appliedRule);
	}

	// Story 4.3: Apply multipliers if context is provided
	if (multiplierContext && (advancedRates.length > 0 || seasonalMultipliers.length > 0)) {
		const multiplierResult = applyAllMultipliers(
			price,
			multiplierContext,
			advancedRates,
			seasonalMultipliers,
		);
		
		// Update price with multiplier-adjusted value
		if (multiplierResult.appliedRules.length > 0) {
			price = multiplierResult.adjustedPrice;
			// Add all multiplier rules to the applied rules list
			appliedRules.push(...multiplierResult.appliedRules);
		}
	}
	
	// Story 4.6: Calculate shadow segments (A/B/C)
	const tripAnalysis = calculateShadowSegments(
		shadowInput,
		distanceKm,
		durationMinutes,
		settings,
	);
	
	// Use total internal cost from shadow calculation
	const internalCost = tripAnalysis.totalInternalCost;
	const margin = Math.round((price - internalCost) * 100) / 100;
	const marginPercent =
		price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

	// Add cost breakdown rule (Story 4.2)
	appliedRules.push({
		type: "COST_BREAKDOWN",
		description: "Internal cost calculated with operational components",
		costBreakdown: {
			fuel: tripAnalysis.costBreakdown.fuel.amount,
			tolls: tripAnalysis.costBreakdown.tolls.amount,
			wear: tripAnalysis.costBreakdown.wear.amount,
			driver: tripAnalysis.costBreakdown.driver.amount,
			parking: tripAnalysis.costBreakdown.parking.amount,
			total: tripAnalysis.costBreakdown.total,
		},
	});

	// Story 4.6: Add shadow calculation rule
	appliedRules.push({
		type: "SHADOW_CALCULATION",
		description: `Shadow calculation completed with ${tripAnalysis.segments.approach ? "3" : "1"} segment(s)`,
		segments: {
			approach: tripAnalysis.segments.approach ? {
				distanceKm: tripAnalysis.segments.approach.distanceKm,
				durationMinutes: tripAnalysis.segments.approach.durationMinutes,
				cost: tripAnalysis.segments.approach.cost.total,
			} : null,
			service: {
				distanceKm: tripAnalysis.segments.service.distanceKm,
				durationMinutes: tripAnalysis.segments.service.durationMinutes,
				cost: tripAnalysis.segments.service.cost.total,
			},
			return: tripAnalysis.segments.return ? {
				distanceKm: tripAnalysis.segments.return.distanceKm,
				durationMinutes: tripAnalysis.segments.return.durationMinutes,
				cost: tripAnalysis.segments.return.cost.total,
			} : null,
		},
		totalDistanceKm: tripAnalysis.totalDistanceKm,
		totalDurationMinutes: tripAnalysis.totalDurationMinutes,
		totalInternalCost: tripAnalysis.totalInternalCost,
		routingSource: tripAnalysis.routingSource,
	});

	// Story 4.7: Get profitability thresholds from settings
	const thresholds = getThresholdsFromSettings(settings);
	const profitabilityIndicator = calculateProfitabilityIndicator(marginPercent, thresholds);
	const profitabilityData = getProfitabilityIndicatorData(marginPercent, thresholds);

	return {
		pricingMode: "DYNAMIC",
		price,
		currency: "EUR",
		internalCost,
		margin,
		marginPercent,
		profitabilityIndicator,
		profitabilityData,
		matchedGrid: null,
		appliedRules,
		isContractPrice: false,
		fallbackReason,
		gridSearchDetails,
		tripAnalysis,
	};
}

/**
 * Build a FIXED_GRID pricing result with cost analysis (Story 4.2 - AC5, Story 4.6)
 * Story 4.6: Now includes full shadow calculation with segments A/B/C
 */
function buildGridResult(
	price: number,
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	matchedGrid: MatchedGrid,
	appliedRules: AppliedRule[],
	// Story 4.6: Shadow calculation input (from vehicle selection)
	shadowInput: ShadowCalculationInput | null = null,
): PricingResult {
	// Story 4.6: Calculate shadow segments (A/B/C)
	const tripAnalysis = calculateShadowSegments(
		shadowInput,
		distanceKm,
		durationMinutes,
		settings,
	);
	
	// Use total internal cost from shadow calculation
	const internalCost = tripAnalysis.totalInternalCost;
	const margin = Math.round((price - internalCost) * 100) / 100;
	const marginPercent =
		price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

	// Add cost breakdown rule
	appliedRules.push({
		type: "COST_BREAKDOWN",
		description: "Internal cost calculated for profitability analysis",
		costBreakdown: {
			fuel: tripAnalysis.costBreakdown.fuel.amount,
			tolls: tripAnalysis.costBreakdown.tolls.amount,
			wear: tripAnalysis.costBreakdown.wear.amount,
			driver: tripAnalysis.costBreakdown.driver.amount,
			parking: tripAnalysis.costBreakdown.parking.amount,
			total: tripAnalysis.costBreakdown.total,
		},
	});

	// Story 4.6: Add shadow calculation rule
	appliedRules.push({
		type: "SHADOW_CALCULATION",
		description: `Shadow calculation completed with ${tripAnalysis.segments.approach ? "3" : "1"} segment(s) (Grid price - Engagement Rule)`,
		segments: {
			approach: tripAnalysis.segments.approach ? {
				distanceKm: tripAnalysis.segments.approach.distanceKm,
				durationMinutes: tripAnalysis.segments.approach.durationMinutes,
				cost: tripAnalysis.segments.approach.cost.total,
			} : null,
			service: {
				distanceKm: tripAnalysis.segments.service.distanceKm,
				durationMinutes: tripAnalysis.segments.service.durationMinutes,
				cost: tripAnalysis.segments.service.cost.total,
			},
			return: tripAnalysis.segments.return ? {
				distanceKm: tripAnalysis.segments.return.distanceKm,
				durationMinutes: tripAnalysis.segments.return.durationMinutes,
				cost: tripAnalysis.segments.return.cost.total,
			} : null,
		},
		totalDistanceKm: tripAnalysis.totalDistanceKm,
		totalDurationMinutes: tripAnalysis.totalDurationMinutes,
		totalInternalCost: tripAnalysis.totalInternalCost,
		routingSource: tripAnalysis.routingSource,
	});

	// Story 4.7: Get profitability thresholds from settings
	const thresholds = getThresholdsFromSettings(settings);
	const profitabilityIndicator = calculateProfitabilityIndicator(marginPercent, thresholds);
	const profitabilityData = getProfitabilityIndicatorData(marginPercent, thresholds);

	return {
		pricingMode: "FIXED_GRID",
		price,
		currency: "EUR",
		internalCost,
		margin,
		marginPercent,
		profitabilityIndicator,
		profitabilityData,
		matchedGrid,
		appliedRules,
		isContractPrice: true,
		fallbackReason: null,
		gridSearchDetails: null,
		tripAnalysis,
	};
}

// ============================================================================
// Story 4.4: Manual Override Functions
// ============================================================================

/**
 * Validate a price override request
 * Checks minimum margin constraints and price validity
 * 
 * @param newPrice - The new price to validate
 * @param internalCost - The internal cost for margin calculation
 * @param minimumMarginPercent - Optional minimum margin threshold (default: no minimum)
 * @returns Validation result with error details if invalid
 */
export function validatePriceOverride(
	newPrice: number,
	internalCost: number,
	minimumMarginPercent?: number,
): OverrideValidationResult {
	// Check for invalid price
	if (newPrice <= 0) {
		return {
			isValid: false,
			errorCode: "INVALID_PRICE",
			errorMessage: "Price must be greater than zero",
			details: {
				requestedPrice: newPrice,
				internalCost,
				resultingMargin: newPrice - internalCost,
				resultingMarginPercent: 0,
			},
		};
	}

	// Calculate resulting margin
	const resultingMargin = Math.round((newPrice - internalCost) * 100) / 100;
	const resultingMarginPercent = newPrice > 0 
		? Math.round((resultingMargin / newPrice) * 100 * 100) / 100 
		: 0;

	// Check minimum margin constraint if specified
	if (minimumMarginPercent !== undefined && resultingMarginPercent < minimumMarginPercent) {
		return {
			isValid: false,
			errorCode: "BELOW_MINIMUM_MARGIN",
			errorMessage: `Price override rejected: resulting margin (${resultingMarginPercent.toFixed(1)}%) is below minimum threshold (${minimumMarginPercent}%)`,
			details: {
				requestedPrice: newPrice,
				internalCost,
				resultingMargin,
				resultingMarginPercent,
				minimumMarginPercent,
			},
		};
	}

	return {
		isValid: true,
		details: {
			requestedPrice: newPrice,
			internalCost,
			resultingMargin,
			resultingMarginPercent,
			minimumMarginPercent,
		},
	};
}

/**
 * Recalculate profitability after a manual price override
 * Updates margin, marginPercent, profitabilityIndicator and adds MANUAL_OVERRIDE rule
 * 
 * @param input - The recalculation input with new price and context
 * @returns Updated profitability result with override tracking
 */
export function recalculateProfitability(
	input: RecalculateProfitabilityInput,
): RecalculateProfitabilityResult {
	const { newPrice, internalCost, previousPrice, previousAppliedRules, reason, isContractPrice } = input;

	// Calculate new margin
	const margin = Math.round((newPrice - internalCost) * 100) / 100;
	const marginPercent = newPrice > 0 
		? Math.round((margin / newPrice) * 100 * 100) / 100 
		: 0;

	// Calculate price change
	const priceChange = Math.round((newPrice - previousPrice) * 100) / 100;
	const priceChangePercent = previousPrice > 0 
		? Math.round((priceChange / previousPrice) * 100 * 100) / 100 
		: 0;

	// Create MANUAL_OVERRIDE rule
	const overrideRule: ManualOverrideRule = {
		type: "MANUAL_OVERRIDE",
		description: isContractPrice 
			? `Contract price overridden: ${previousPrice.toFixed(2)}€ → ${newPrice.toFixed(2)}€ (Warning: Engagement Rule bypassed)`
			: `Price manually adjusted: ${previousPrice.toFixed(2)}€ → ${newPrice.toFixed(2)}€`,
		previousPrice,
		newPrice,
		priceChange,
		priceChangePercent,
		reason,
		overriddenAt: new Date().toISOString(),
		isContractPriceOverride: isContractPrice,
	};

	// Filter out any previous MANUAL_OVERRIDE rules and add the new one
	const filteredRules = previousAppliedRules.filter(rule => rule.type !== "MANUAL_OVERRIDE");
	const appliedRules: AppliedRule[] = [...filteredRules, overrideRule];

	return {
		price: newPrice,
		margin,
		marginPercent,
		profitabilityIndicator: calculateProfitabilityIndicator(marginPercent),
		appliedRules,
		overrideApplied: true,
		priceChange,
		priceChangePercent,
	};
}

/**
 * Apply a price override to a full PricingResult
 * Combines validation and recalculation into a single operation
 * 
 * @param pricingResult - The original pricing result to override
 * @param newPrice - The new price to apply
 * @param reason - Optional reason for the override
 * @param minimumMarginPercent - Optional minimum margin constraint
 * @returns Updated PricingResult or validation error
 */
export function applyPriceOverride(
	pricingResult: PricingResult,
	newPrice: number,
	reason?: string,
	minimumMarginPercent?: number,
): { success: true; result: PricingResult } | { success: false; error: OverrideValidationResult } {
	// Validate the override
	const validation = validatePriceOverride(newPrice, pricingResult.internalCost, minimumMarginPercent);
	
	if (!validation.isValid) {
		return { success: false, error: validation };
	}

	// Recalculate profitability
	const recalcResult = recalculateProfitability({
		newPrice,
		internalCost: pricingResult.internalCost,
		previousPrice: pricingResult.price,
		previousAppliedRules: pricingResult.appliedRules,
		reason,
		isContractPrice: pricingResult.isContractPrice,
	});

	// Build updated PricingResult
	const updatedResult: PricingResult = {
		...pricingResult,
		price: recalcResult.price,
		margin: recalcResult.margin,
		marginPercent: recalcResult.marginPercent,
		profitabilityIndicator: recalcResult.profitabilityIndicator,
		appliedRules: recalcResult.appliedRules,
		overrideApplied: true,
		previousPrice: pricingResult.price,
	};

	return { success: true, result: updatedResult };
}
