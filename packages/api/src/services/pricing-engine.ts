/**
 * Pricing Engine Service
 * Implements the Engagement Rule for partner grid pricing (Method 1)
 * and fallback to dynamic pricing (Method 2)
 * Story 4.3: Adds multiplier support (advanced rates + seasonal multipliers)
 * Story 7.4: Adds commission integration for partner profitability
 */

import type { GeoPoint, ZoneData, ZoneConflictStrategy } from "../lib/geo-utils";

// Story 17.2: Zone multiplier aggregation strategy
export type ZoneMultiplierAggregationStrategy =
	| "MAX"           // Math.max(pickup, dropoff) - use highest multiplier
	| "PICKUP_ONLY"   // Use pickup zone multiplier only
	| "DROPOFF_ONLY"  // Use dropoff zone multiplier only
	| "AVERAGE";      // (pickup + dropoff) / 2 - average of both
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
import {
	integrateComplianceInPricing,
	type ComplianceValidationInput,
	type RSERules,
	type AlternativeCostParameters,
	type RegulatoryCategory,
	DEFAULT_ALTERNATIVE_COST_PARAMETERS,
	type StaffingSelectionPolicy as ComplianceStaffingPolicy,
} from "./compliance-validator";
import {
	calculateTcoCost,
	buildTcoConfig,
	getTcoSource,
	hasTcoConfig,
	hasCategoryTcoDefaults,
	type TcoConfig,
	type VehicleForTco,
	type VehicleCategoryForTco,
	type TcoCostComponent as TcoCalculatorResult,
} from "./tco-calculator";
import type { TransversalDecompositionResult } from "./transversal-decomposition";

// Europe/Paris timezone constant
const PARIS_TZ = "Europe/Paris";

// ============================================================================
// Types
// ============================================================================

export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type GridType = "ZoneRoute" | "ExcursionPackage" | "DispoPackage";
export type TripType = "transfer" | "excursion" | "dispo";
export type ProfitabilityIndicator = "green" | "orange" | "red";

// Story 15.2: Fuel consumption source for transparency
export type FuelConsumptionSource = "VEHICLE" | "CATEGORY" | "ORGANIZATION" | "DEFAULT";

// Story 15.6: Fuel type for accurate fuel cost calculation
export type FuelType = "DIESEL" | "GASOLINE" | "LPG" | "ELECTRIC";

/**
 * Story 15.6: Default fuel prices per type
 * DIESEL: 1.789€/L, GASOLINE: 1.899€/L, LPG: 0.999€/L, ELECTRIC: 0.25€/kWh
 */
export const DEFAULT_FUEL_PRICES: Record<FuelType, number> = {
	DIESEL: 1.789,
	GASOLINE: 1.899,
	LPG: 0.999,
	ELECTRIC: 0.25, // per kWh
};

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
	// Story 16.6: Round trip flag for transfer pricing
	isRoundTrip?: boolean;
	// Story 16.8: DISPO-specific fields
	durationHours?: number;
	maxKilometers?: number;
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
	// Story 17.15: Client difficulty score for Patience Tax
	difficultyScore?: number | null;
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
		// Story 18.8: Temporal Vector fields
		isTemporalVector?: boolean;
		minimumDurationHours?: number | null;
		destinationName?: string | null;
		destinationDescription?: string | null;
		includedDurationHours?: number;
		allowedOriginZones?: Array<{ pricingZoneId: string; pricingZone?: { id: string; name: string; code: string } }>;
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

// Story 17.9: Time bucket interpolation strategy for MAD pricing
export type TimeBucketInterpolationStrategy = "ROUND_UP" | "ROUND_DOWN" | "PROPORTIONAL";

// Story 17.9: Time bucket data for MAD pricing
export interface MadTimeBucketData {
	id: string;
	durationHours: number;
	vehicleCategoryId: string;
	price: number;
	isActive: boolean;
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
	// Story 15.5: Trip type specific settings
	excursionMinimumHours?: number;      // Default: 4
	excursionSurchargePercent?: number;  // Default: 15
	dispoIncludedKmPerHour?: number;     // Default: 50
	dispoOverageRatePerKm?: number;      // Default: 0.50
	// Story 17.1: Zone conflict resolution strategy
	zoneConflictStrategy?: ZoneConflictStrategy | null;
	// Story 17.2: Zone multiplier aggregation strategy
	zoneMultiplierAggregationStrategy?: ZoneMultiplierAggregationStrategy | null;
	// Story 17.3: Staffing selection policy
	staffingSelectionPolicy?: StaffingSelectionPolicy | null;
	// Story 17.9: Time bucket configuration for MAD pricing
	timeBucketInterpolationStrategy?: TimeBucketInterpolationStrategy | null;
	madTimeBuckets?: MadTimeBucketData[];
	// Story 17.15: Client difficulty multipliers (Patience Tax)
	difficultyMultipliers?: Record<string, number> | null;
	// Story 18.2: Dense zone detection for Transfer-to-MAD switching
	denseZoneSpeedThreshold?: number | null;  // km/h, default: 15
	autoSwitchToMAD?: boolean;                // default: false
	denseZoneCodes?: string[];                // default: ["PARIS_0"]
	// Story 18.3: Round-trip to MAD detection
	minWaitingTimeForSeparateTransfers?: number | null;  // minutes, default: 180 (3h)
	maxReturnDistanceKm?: number | null;                 // km, default: 50
	roundTripBuffer?: number | null;                     // minutes, default: 30
	autoSwitchRoundTripToMAD?: boolean;                  // default: false
	// Story 18.7: Transit discount configuration for transversal trips
	transitDiscountEnabled?: boolean;                    // default: false
	transitDiscountPercent?: number;                     // default: 10 (%)
	transitZoneCodes?: string[];                         // default: ["PARIS_0", "PARIS_10"]
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
 * Story 17.8: Added estimatedEndAt for weighted day/night rate calculation
 */
export interface MultiplierContext {
	pickupAt: Date | null;  // Trip pickup time (Europe/Paris business time)
	estimatedEndAt: Date | null;  // Story 17.8: Estimated end time for weighted rate calculation
	distanceKm: number;
	pickupZoneId: string | null;
	dropoffZoneId: string | null;
}

/**
 * Story 17.8: Weighted night rate details for transparency
 */
export interface WeightedNightRateDetails {
	nightPeriodStart: string;  // "22:00"
	nightPeriodEnd: string;    // "06:00"
	tripStart: string;         // ISO timestamp
	tripEnd: string;           // ISO timestamp
	nightMinutes: number;      // Minutes of trip in night period
	totalMinutes: number;      // Total trip duration
	nightPercentage: number;   // Percentage of trip in night period (0-100)
	baseAdjustment: number;    // Original rate adjustment (e.g., 20 for +20%)
	effectiveAdjustment: number; // Weighted adjustment applied
}

/**
 * Applied multiplier rule for transparency
 * Story 17.8: Added optional weightedDetails for weighted night rate
 */
export interface AppliedMultiplierRule extends AppliedRule {
	type: "ADVANCED_RATE" | "SEASONAL_MULTIPLIER";
	ruleId: string;
	ruleName: string;
	adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT" | "MULTIPLIER";
	adjustmentValue: number;
	priceBefore: number;
	priceAfter: number;
	// Story 17.8: Weighted night rate details (only for NIGHT rates with estimatedEndAt)
	weightedDetails?: WeightedNightRateDetails;
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
 * Story 17.2: Updated to include aggregation strategy information
 */
export interface AppliedZoneMultiplierRule extends AppliedRule {
	type: "ZONE_MULTIPLIER";
	zoneId: string;
	zoneName: string;
	zoneCode: string;
	multiplier: number;
	source: "pickup" | "dropoff" | "both"; // Story 17.2: "both" for AVERAGE strategy
	priceBefore: number;
	priceAfter: number;
	// Story 17.2: Aggregation strategy information
	strategy?: ZoneMultiplierAggregationStrategy;
	pickupZone?: { code: string; name: string; multiplier: number };
	dropoffZone?: { code: string; name: string; multiplier: number };
}

/**
 * Result of zone multiplier application
 * Story 16.3: appliedRule is now always present for transparency
 */
export interface ZoneMultiplierResult {
	adjustedPrice: number;
	appliedMultiplier: number;
	appliedRule: AppliedRule; // Story 16.3: Always present
}

// ============================================================================
// Story 16.6: Round Trip Multiplier Types
// ============================================================================

/**
 * Story 16.6: Applied round trip multiplier rule for transparency
 */
export interface AppliedRoundTripRule extends AppliedRule {
	type: "ROUND_TRIP";
	description: string;
	multiplier: 2;
	priceBeforeRoundTrip: number;
	priceAfterRoundTrip: number;
	internalCostBeforeRoundTrip: number;
	internalCostAfterRoundTrip: number;
}

/**
 * Story 16.6: Result of round trip multiplier application
 */
export interface RoundTripMultiplierResult {
	adjustedPrice: number;
	adjustedInternalCost: number;
	appliedRule: AppliedRoundTripRule | null;
}

// ============================================================================
// Story 17.15: Client Difficulty Score (Patience Tax) Types
// ============================================================================

/**
 * Story 17.15: Default difficulty multipliers if not configured
 * Scale 1-5 where higher score = more difficult client = higher multiplier
 */
export const DEFAULT_DIFFICULTY_MULTIPLIERS: Record<number, number> = {
	1: 1.00, // No adjustment
	2: 1.02, // +2%
	3: 1.05, // +5%
	4: 1.08, // +8%
	5: 1.10, // +10%
};

/**
 * Story 17.15: Applied client difficulty multiplier rule for transparency
 */
export interface AppliedClientDifficultyRule extends AppliedRule {
	type: "CLIENT_DIFFICULTY_MULTIPLIER";
	description: string;
	difficultyScore: number;
	multiplier: number;
	priceBefore: number;
	priceAfter: number;
}

/**
 * Story 17.15: Result of client difficulty multiplier application
 */
export interface ClientDifficultyMultiplierResult {
	adjustedPrice: number;
	appliedRule: AppliedClientDifficultyRule | null;
}

/**
 * Story 17.15: Apply client difficulty multiplier (Patience Tax)
 * 
 * @param price - Current price before difficulty adjustment
 * @param difficultyScore - Client's difficulty score (1-5), null if not set
 * @param configuredMultipliers - Organization's configured multipliers, null uses defaults
 * @returns Adjusted price and applied rule (null if no adjustment)
 */
export function applyClientDifficultyMultiplier(
	price: number,
	difficultyScore: number | null | undefined,
	configuredMultipliers?: Record<string, number> | null,
): ClientDifficultyMultiplierResult {
	// No adjustment if no difficulty score
	if (difficultyScore == null || difficultyScore < 1 || difficultyScore > 5) {
		return { adjustedPrice: price, appliedRule: null };
	}

	// Get multiplier from configured or defaults
	// configuredMultipliers uses string keys from JSON, DEFAULT uses number keys
	let multiplier = 1.0;
	if (configuredMultipliers) {
		multiplier = configuredMultipliers[String(difficultyScore)] ?? 1.0;
	} else {
		multiplier = DEFAULT_DIFFICULTY_MULTIPLIERS[difficultyScore] ?? 1.0;
	}

	// No adjustment if multiplier is 1.0 (neutral)
	if (multiplier === 1.0) {
		return { adjustedPrice: price, appliedRule: null };
	}

	const adjustedPrice = Math.round(price * multiplier * 100) / 100;
	const percentChange = Math.round((multiplier - 1) * 100 * 100) / 100;

	return {
		adjustedPrice,
		appliedRule: {
			type: "CLIENT_DIFFICULTY_MULTIPLIER",
			description: `Client difficulty adjustment: +${percentChange}% (score ${difficultyScore}/5)`,
			difficultyScore,
			multiplier,
			priceBefore: price,
			priceAfter: adjustedPrice,
		},
	};
}

// ============================================================================
// Story 15.3: Vehicle Category Multiplier Types
// ============================================================================

/**
 * Story 15.3: Vehicle category information for pricing
 * Story 15.4: Extended with default rates
 */
export interface VehicleCategoryInfo {
	id: string;
	code: string;
	name: string;
	priceMultiplier: number;
	// Story 15.4: Category-specific rates (null = use org rates)
	defaultRatePerKm: number | null;
	defaultRatePerHour: number | null;
	// Story 15.6: Fuel type for accurate fuel cost (null = DIESEL)
	fuelType: FuelType | null;
}

// ============================================================================
// Story 15.4: Rate Resolution Types
// ============================================================================

/**
 * Story 15.4: Source of the rates used for pricing
 */
export type RateSource = "CATEGORY" | "ORGANIZATION";

/**
 * Story 15.4: Resolved rates with source information
 */
export interface ResolvedRates {
	ratePerKm: number;
	ratePerHour: number;
	rateSource: RateSource;
}

/**
 * Story 15.4: Resolve rates with fallback chain
 * Priority: Category → Organization
 * 
 * @param vehicleCategory - Category with optional rates
 * @param orgSettings - Organization pricing settings (fallback)
 * @returns Resolved rates with source
 */
export function resolveRates(
	vehicleCategory: VehicleCategoryInfo | undefined,
	orgSettings: { baseRatePerKm: number; baseRatePerHour: number },
): ResolvedRates {
	// Check if category has BOTH rates set
	if (
		vehicleCategory?.defaultRatePerKm != null &&
		vehicleCategory?.defaultRatePerHour != null
	) {
		return {
			ratePerKm: vehicleCategory.defaultRatePerKm,
			ratePerHour: vehicleCategory.defaultRatePerHour,
			rateSource: "CATEGORY",
		};
	}

	// Fallback to organization rates
	return {
		ratePerKm: orgSettings.baseRatePerKm,
		ratePerHour: orgSettings.baseRatePerHour,
		rateSource: "ORGANIZATION",
	};
}

// ============================================================================
// Story 15.6: Fuel Type Resolution
// ============================================================================

/**
 * Story 15.6: Get fuel price for a specific fuel type
 * Falls back to default prices if not in custom prices
 * 
 * @param fuelType - Type of fuel
 * @param customPrices - Optional custom prices per fuel type
 * @returns Price per liter (or kWh for electric)
 */
export function getFuelPrice(
	fuelType: FuelType,
	customPrices?: Partial<Record<FuelType, number>>,
): number {
	return customPrices?.[fuelType] ?? DEFAULT_FUEL_PRICES[fuelType];
}

/**
 * Story 15.6: Resolve fuel type with fallback to DIESEL
 * 
 * @param vehicleCategory - Category with optional fuel type
 * @returns Resolved fuel type (defaults to DIESEL)
 */
export function resolveFuelType(
	vehicleCategory: VehicleCategoryInfo | undefined,
): FuelType {
	return vehicleCategory?.fuelType ?? "DIESEL";
}

/**
 * Story 15.6: Calculate fuel cost with correct fuel type
 * 
 * @param distanceKm - Distance in km
 * @param consumptionL100km - Fuel consumption in L/100km
 * @param fuelType - Type of fuel
 * @param customPrices - Optional custom prices per fuel type
 * @returns Fuel cost component with all details
 */
export function calculateFuelCost(
	distanceKm: number,
	consumptionL100km: number,
	fuelType: FuelType,
	customPrices?: Partial<Record<FuelType, number>>,
): FuelCostComponent {
	const pricePerLiter = getFuelPrice(fuelType, customPrices);
	const litersUsed = (distanceKm / 100) * consumptionL100km;
	const amount = Math.round(litersUsed * pricePerLiter * 100) / 100;

	return {
		amount,
		distanceKm,
		consumptionL100km,
		pricePerLiter,
		fuelType,
	};
}

/**
 * Story 15.3: Applied vehicle category multiplier rule for transparency
 */
export interface AppliedVehicleCategoryMultiplierRule extends AppliedRule {
	type: "VEHICLE_CATEGORY_MULTIPLIER";
	categoryId: string;
	categoryCode: string;
	categoryName: string;
	multiplier: number;
	priceBefore: number;
	priceAfter: number;
}

/**
 * Story 15.3: Result of vehicle category multiplier application
 */
export interface VehicleCategoryMultiplierResult {
	adjustedPrice: number;
	appliedRule: AppliedVehicleCategoryMultiplierRule | null;
}

// ============================================================================
// Story 15.5: Trip Type Pricing Types
// ============================================================================

/**
 * Story 15.5: Applied trip type rule for transparency
 * Story 17.9: Extended for time bucket pricing
 */
export interface AppliedTripTypeRule extends AppliedRule {
	type: "TRIP_TYPE" | "TIME_BUCKET";
	tripType: TripType;
	description: string;
	// Excursion specific
	minimumApplied?: boolean;
	requestedHours?: number;
	effectiveHours?: number;
	surchargePercent?: number;
	surchargeAmount?: number;
	// Dispo specific
	includedKm?: number;
	actualKm?: number;
	overageKm?: number;
	overageRatePerKm?: number;
	overageAmount?: number;
	// Story 17.9: Time bucket specific
	timeBucketUsed?: {
		durationHours: number;
		price: number;
	};
	interpolationStrategy?: TimeBucketInterpolationStrategy;
	lowerBucket?: { durationHours: number; price: number };
	upperBucket?: { durationHours: number; price: number };
	bucketPrice?: number;  // Price from bucket before overage
	extraHoursCharged?: number;  // Hours beyond max bucket
	extraHoursAmount?: number;   // Amount for extra hours
	// Common
	basePriceBeforeAdjustment: number;
	priceAfterAdjustment: number;
}

/**
 * Story 15.5: Result of trip type pricing calculation
 */
export interface TripTypePricingResult {
	price: number;
	rule: AppliedTripTypeRule | null;
}

/**
 * Story 17.10: Applied zone surcharge rule for transparency
 */
export interface AppliedZoneSurchargeRule extends AppliedRule {
	type: "ZONE_SURCHARGE";
	description: string;
	pickupZone: {
		zoneId: string;
		zoneName: string;
		zoneCode: string;
		parkingSurcharge: number;
		accessFee: number;
		total: number;
	} | null;
	dropoffZone: {
		zoneId: string;
		zoneName: string;
		zoneCode: string;
		parkingSurcharge: number;
		accessFee: number;
		total: number;
	} | null;
	totalSurcharge: number;
}

// ============================================================================
// Story 18.10: Hierarchical Pricing Algorithm Types
// ============================================================================

/**
 * Story 18.10: Hierarchical pricing level names
 */
export type HierarchicalPricingLevel = 1 | 2 | 3 | 4;

export type HierarchicalPricingLevelName =
	| "INTRA_CENTRAL_FLAT_RATE"    // Priority 1
	| "INTER_ZONE_FORFAIT"         // Priority 2
	| "SAME_RING_DYNAMIC"          // Priority 3
	| "HOROKILOMETRIC_FALLBACK";   // Priority 4

/**
 * Story 18.10: Reason why a level was skipped
 */
export type SkippedLevelReason =
	| "NOT_APPLICABLE"       // Trip doesn't match criteria (e.g., not intra-central)
	| "NO_RATE_CONFIGURED"   // No flat rate or forfait configured
	| "DISABLED_BY_CONFIG"   // Level disabled in org settings
	| "ZONE_MISMATCH";       // Zones don't match (e.g., not same ring)

/**
 * Story 18.10: Information about a skipped hierarchical level
 */
export interface SkippedLevel {
	level: HierarchicalPricingLevel;
	levelName: HierarchicalPricingLevelName;
	reason: SkippedLevelReason;
	details?: string;
}

/**
 * Story 18.10: Hierarchical pricing configuration from organization settings
 */
export interface HierarchicalPricingConfig {
	enabled: boolean;
	skipLevel1?: boolean;  // Skip intra-central flat rate
	skipLevel2?: boolean;  // Skip inter-zone forfait
	skipLevel3?: boolean;  // Skip same-ring dynamic
	centralZoneCodes?: string[];  // Zone codes considered "central" (e.g., ["PARIS_0", "Z_0"])
}

/**
 * Story 18.10: Default hierarchical pricing configuration
 */
export const DEFAULT_HIERARCHICAL_PRICING_CONFIG: HierarchicalPricingConfig = {
	enabled: true,
	skipLevel1: false,
	skipLevel2: false,
	skipLevel3: false,
	centralZoneCodes: ["PARIS_0", "Z_0", "BUSSY_0"],
};

/**
 * Story 18.10: Intra-central flat rate data
 */
export interface IntraCentralFlatRateData {
	id: string;
	vehicleCategoryId: string;
	flatRate: number;
	description: string | null;
	isActive: boolean;
}

/**
 * Story 18.10: Result of hierarchical pricing evaluation
 */
export interface HierarchicalPricingResult {
	level: HierarchicalPricingLevel;
	levelName: HierarchicalPricingLevelName;
	reason: string;
	skippedLevels: SkippedLevel[];
	appliedPrice: number;
	// Additional details for transparency
	details?: {
		flatRateId?: string;
		forfaitId?: string;
		ringMultiplier?: number;
		ringCode?: string;
	};
}

/**
 * Story 18.10: Applied hierarchical pricing rule for transparency
 */
export interface AppliedHierarchicalPricingRule extends AppliedRule {
	type: "HIERARCHICAL_PRICING";
	level: HierarchicalPricingLevel;
	levelName: HierarchicalPricingLevelName;
	reason: string;
	skippedLevels: SkippedLevel[];
	appliedPrice: number;
	details?: {
		flatRateId?: string;
		forfaitId?: string;
		ringMultiplier?: number;
		ringCode?: string;
	};
}

/**
 * Story 18.10: Extended zone data with isCentralZone flag
 */
export interface ZoneDataWithCentralFlag extends ZoneData {
	isCentralZone?: boolean;
}

// ============================================================================
// Cost Breakdown Types (Story 4.2)
// ============================================================================

export interface FuelCostComponent {
	amount: number;
	distanceKm: number;
	consumptionL100km: number;
	pricePerLiter: number;
	// Story 15.6: Track fuel type used for transparency
	fuelType: FuelType;
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

/**
 * Story 17.10: Zone surcharge component for friction costs
 */
export interface ZoneSurchargeComponent {
	zoneId: string;
	zoneName: string;
	zoneCode: string;
	parkingSurcharge: number;
	accessFee: number;
	total: number;
	description: string | null;
}

/**
 * Story 17.10: Combined zone surcharges for pickup and dropoff
 */
export interface ZoneSurcharges {
	pickup: ZoneSurchargeComponent | null;
	dropoff: ZoneSurchargeComponent | null;
	total: number;
}

/**
 * Story 17.14: TCO cost component (replaces wear when configured)
 */
export interface TcoCostComponent {
	amount: number;
	distanceKm: number;
	depreciation: {
		amount: number;
		ratePerKm: number;
		method: "LINEAR" | "DECLINING_BALANCE";
	};
	maintenance: {
		amount: number;
		ratePerKm: number;
	};
	insurance: {
		amount: number;
		ratePerKm: number;
	};
	totalRatePerKm: number;
	source: "VEHICLE" | "CATEGORY"; // Where TCO config came from
}

export interface CostBreakdown {
	fuel: FuelCostComponent;
	tolls: TollCostComponent;
	wear: WearCostComponent;
	driver: DriverCostComponent;
	parking: ParkingCostComponent;
	// Story 17.10: Zone surcharges (friction costs)
	zoneSurcharges?: ZoneSurcharges;
	// Story 17.14: TCO replaces wear when configured on vehicle
	tco?: TcoCostComponent;
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
 * Story 17.1: Fuel price source information for transparency
 * Now includes real-time pricing and international route info
 */
export interface FuelPriceSourceInfo {
	pricePerLitre: number;
	currency: "EUR";
	source: "REALTIME" | "CACHE" | "DEFAULT";
	fetchedAt: string | null; // ISO timestamp or null if default
	isStale: boolean;
	fuelType: string;
	countryCode: string;
	// Story 17.1: International route info
	countriesOnRoute?: string[];
	routePrices?: Array<{
		point: "pickup" | "dropoff" | "stop";
		country: string;
		pricePerLitre: number;
	}>;
}

/**
 * Story 16.7: Excursion leg for multi-stop excursions
 * Each leg represents a segment between two consecutive stops
 */
export interface ExcursionLeg {
	order: number;
	fromAddress: string;
	toAddress: string;
	fromCoords: { lat: number; lng: number };
	toCoords: { lat: number; lng: number };
	distanceKm: number;
	durationMinutes: number;
	cost: {
		fuel: number;
		tolls: number;
		wear: number;
		driver: number;
		total: number;
	};
}

// ============================================================================
// Story 17.3: Compliance Plan Types
// ============================================================================

/**
 * Story 17.3: Staffing plan type
 */
export type StaffingPlanType = 'DOUBLE_CREW' | 'RELAY_DRIVER' | 'MULTI_DAY' | 'NONE';

/**
 * Story 17.3: Staffing selection policy
 */
export type StaffingSelectionPolicy = 'CHEAPEST' | 'FASTEST' | 'PREFER_INTERNAL';

/**
 * Story 17.3: Compliance-driven staffing plan
 * Automatically selected when RSE violations are detected for heavy vehicles
 */
export interface CompliancePlan {
	/** Type of staffing plan applied */
	planType: StaffingPlanType;
	/** Whether a staffing plan was required due to violations */
	isRequired: boolean;
	/** Total additional cost in EUR */
	additionalCost: number;
	/** Breakdown of additional costs */
	costBreakdown: {
		extraDriverCost: number;
		hotelCost: number;
		mealAllowance: number;
		otherCosts: number;
	};
	/** Adjusted schedule with staffing plan */
	adjustedSchedule: {
		daysRequired: number;
		driversRequired: number;
		hotelNightsRequired: number;
	};
	/** Original violations that triggered the plan */
	originalViolations: Array<{
		type: string;
		message: string;
		actual: number;
		limit: number;
	}>;
	/** Reason for selecting this plan */
	selectedReason: string;
}

/**
 * Story 17.3: Input for compliance integration in pricing
 */
export interface ComplianceIntegrationInput {
	/** Organization ID for loading RSE rules */
	organizationId: string;
	/** Vehicle category ID */
	vehicleCategoryId: string;
	/** Regulatory category (LIGHT or HEAVY) */
	regulatoryCategory: RegulatoryCategory;
	/** License category ID (optional) */
	licenseCategoryId?: string;
	/** Trip analysis with segment data */
	tripAnalysis: TripAnalysis;
	/** Pickup time */
	pickupAt: Date;
	/** Estimated dropoff time (optional) */
	estimatedDropoffAt?: Date;
	/** RSE rules (optional, will use defaults if not provided) */
	rules?: RSERules | null;
	/** Cost parameters for alternatives (optional, will use defaults) */
	costParameters?: AlternativeCostParameters;
	/** Staffing selection policy (optional, defaults to CHEAPEST) */
	staffingSelectionPolicy?: StaffingSelectionPolicy;
}

/**
 * Story 17.3: Result of compliance integration
 */
export interface ComplianceIntegrationResult {
	/** Updated trip analysis with compliancePlan */
	tripAnalysis: TripAnalysis;
	/** Additional cost from staffing plan (0 if no plan needed) */
	additionalStaffingCost: number;
	/** Applied rule for transparency */
	appliedRule: AppliedRule | null;
}

/**
 * Story 17.3: Integrate compliance validation into pricing
 * Checks for RSE violations and automatically selects the best staffing plan
 * 
 * @param input - Compliance integration input
 * @returns Updated trip analysis with compliance plan and additional costs
 */
export function integrateComplianceIntoPricing(
	input: ComplianceIntegrationInput,
): ComplianceIntegrationResult {
	// Skip compliance for light vehicles
	if (input.regulatoryCategory !== "HEAVY") {
		return {
			tripAnalysis: {
				...input.tripAnalysis,
				compliancePlan: null,
			},
			additionalStaffingCost: 0,
			appliedRule: null,
		};
	}

	// Build compliance validation input
	const complianceInput: ComplianceValidationInput = {
		organizationId: input.organizationId,
		vehicleCategoryId: input.vehicleCategoryId,
		regulatoryCategory: input.regulatoryCategory,
		licenseCategoryId: input.licenseCategoryId,
		tripAnalysis: input.tripAnalysis,
		pickupAt: input.pickupAt,
		estimatedDropoffAt: input.estimatedDropoffAt,
	};

	// Get staffing policy (default to CHEAPEST)
	const policy: ComplianceStaffingPolicy = input.staffingSelectionPolicy ?? "CHEAPEST";

	// Run compliance integration
	const { complianceResult, staffingSelection } = integrateComplianceInPricing(
		complianceInput,
		input.rules ?? null,
		input.costParameters ?? DEFAULT_ALTERNATIVE_COST_PARAMETERS,
		policy,
	);

	// If no staffing plan needed (compliant trip)
	if (!staffingSelection.isRequired || !staffingSelection.selectedPlan) {
		const compliancePlan: CompliancePlan = {
			planType: "NONE",
			isRequired: false,
			additionalCost: 0,
			costBreakdown: {
				extraDriverCost: 0,
				hotelCost: 0,
				mealAllowance: 0,
				otherCosts: 0,
			},
			adjustedSchedule: {
				daysRequired: 1,
				driversRequired: 1,
				hotelNightsRequired: 0,
			},
			originalViolations: [],
			selectedReason: staffingSelection.selectionReason,
		};

		return {
			tripAnalysis: {
				...input.tripAnalysis,
				compliancePlan,
			},
			additionalStaffingCost: 0,
			appliedRule: null,
		};
	}

	// Build compliance plan from selected alternative
	const selectedPlan = staffingSelection.selectedPlan;
	const compliancePlan: CompliancePlan = {
		planType: selectedPlan.type as StaffingPlanType,
		isRequired: true,
		additionalCost: selectedPlan.additionalCost.total,
		costBreakdown: {
			extraDriverCost: selectedPlan.additionalCost.breakdown.extraDriverCost,
			hotelCost: selectedPlan.additionalCost.breakdown.hotelCost,
			mealAllowance: selectedPlan.additionalCost.breakdown.mealAllowance,
			otherCosts: selectedPlan.additionalCost.breakdown.otherCosts,
		},
		adjustedSchedule: {
			daysRequired: selectedPlan.adjustedSchedule.daysRequired,
			driversRequired: selectedPlan.adjustedSchedule.driversRequired,
			hotelNightsRequired: selectedPlan.adjustedSchedule.hotelNightsRequired,
		},
		originalViolations: staffingSelection.originalViolations.map(v => ({
			type: v.type,
			message: v.message,
			actual: v.actual,
			limit: v.limit,
		})),
		selectedReason: staffingSelection.selectionReason,
	};

	// Build applied rule for transparency
	const appliedRule: AppliedRule = {
		type: "COMPLIANCE_STAFFING",
		description: `RSE compliance: ${selectedPlan.title} - ${staffingSelection.selectionReason}`,
		planType: selectedPlan.type,
		additionalCost: selectedPlan.additionalCost.total,
		costBreakdown: selectedPlan.additionalCost.breakdown,
		adjustedSchedule: selectedPlan.adjustedSchedule,
		violationsResolved: staffingSelection.originalViolations.length,
		policy: policy,
	};

	return {
		tripAnalysis: {
			...input.tripAnalysis,
			compliancePlan,
		},
		additionalStaffingCost: selectedPlan.additionalCost.total,
		appliedRule,
	};
}

/**
 * Story 17.13: Zone segment info for multi-zone trip transparency
 */
export interface ZoneSegmentInfo {
	zoneId: string;
	zoneCode: string;
	zoneName: string;
	distanceKm: number;
	durationMinutes: number;
	priceMultiplier: number;
	surchargesApplied: number;
	entryPoint: { lat: number; lng: number };
	exitPoint: { lat: number; lng: number };
}

// ============================================================================
// Story 18.2: Dense Zone Detection Types
// ============================================================================

/**
 * Story 18.2: Dense zone detection result
 * Used to determine if a Transfer trip should switch to MAD pricing
 */
export interface DenseZoneDetection {
	isIntraDenseZone: boolean;
	pickupZoneCode: string | null;
	dropoffZoneCode: string | null;
	denseZoneCodes: string[];
	commercialSpeedKmh: number | null;
	speedThreshold: number;
	isBelowThreshold: boolean;
}

/**
 * Story 18.2: MAD suggestion for Transfer trips in dense zones
 * Provides comparison between Transfer and MAD pricing
 */
export interface MadSuggestion {
	type: "CONSIDER_MAD_PRICING";
	transferPrice: number;
	madPrice: number;
	priceDifference: number;
	percentageGain: number;
	recommendation: string;
	autoSwitched: boolean;
}

// ============================================================================
// Story 18.8: Temporal Vector Types
// ============================================================================

/**
 * Story 18.8: Temporal vector result for classic destinations
 * Used to enforce minimum durations for well-known excursion destinations
 */
export interface TemporalVectorResult {
	isTemporalVector: boolean;
	destinationName: string;
	minimumDurationHours: number;
	actualEstimatedDurationHours: number;
	durationUsed: number;
	durationSource: "TEMPORAL_VECTOR" | "ACTUAL_ESTIMATE";
	packageId: string;
	packageName: string;
	packagePrice: number;
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
	
	// Story 16.7: Excursion legs for multi-stop excursions
	excursionLegs?: ExcursionLeg[];
	isMultiDay?: boolean;
	totalStops?: number;
	
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
	
	// Story 15.2: Fuel consumption source for transparency
	fuelConsumptionSource?: FuelConsumptionSource;
	fuelConsumptionL100km?: number;
	
	// Story 17.3: Compliance-driven staffing plan
	compliancePlan?: CompliancePlan | null;
	
	// Story 17.13: Route segmentation for multi-zone trips
	zoneSegments?: ZoneSegmentInfo[] | null;
	routeSegmentation?: {
		weightedMultiplier: number;
		totalSurcharges: number;
		zonesTraversed: string[];
		segmentationMethod: "POLYLINE" | "FALLBACK";
	} | null;
	
	// Story 18.2: Dense zone detection for Transfer-to-MAD switching
	denseZoneDetection?: DenseZoneDetection | null;
	madSuggestion?: MadSuggestion | null;
	
	// Story 18.3: Round-trip to MAD detection
	roundTripDetection?: RoundTripDetection | null;
	roundTripSuggestion?: RoundTripMadSuggestion | null;
	
	// Story 18.4: Loss of exploitation for multi-day missions
	lossOfExploitation?: LossOfExploitationResult | null;
	
	// Story 18.5: Stay vs Return Empty scenario comparison
	stayVsReturnComparison?: StayVsReturnComparison | null;
	
	// Story 18.6: Multi-scenario route optimization
	routeScenarios?: RouteScenarios | null;
	
	// Story 18.7: Transversal trip decomposition
	transversalDecomposition?: TransversalDecompositionResult | null;
	
	// Story 18.8: Temporal vector for classic destinations
	temporalVector?: TemporalVectorResult | null;
}

/**
 * Story 17.5: Calculate estimated end time for a quote
 * Used for driver availability detection and weighted day/night rate calculation
 * 
 * @param pickupAt - The pickup time as a Date object
 * @param tripAnalysis - The trip analysis containing duration information
 * @returns The estimated end time, or null if duration is not available
 */
export function calculateEstimatedEndAt(
	pickupAt: Date,
	tripAnalysis: TripAnalysis | null | undefined
): Date | null {
	if (!tripAnalysis) {
		return null;
	}

	// Get base duration from tripAnalysis
	let totalMinutes = tripAnalysis.totalDurationMinutes;

	// If compliance plan requires multi-day, adjust duration
	// Multi-day missions: estimate end as daysRequired * 24 hours from pickup
	if (tripAnalysis.compliancePlan?.planType === "MULTI_DAY") {
		const daysRequired = tripAnalysis.compliancePlan.adjustedSchedule?.daysRequired;
		if (daysRequired && daysRequired > 0) {
			totalMinutes = daysRequired * 24 * 60;
		}
	}

	if (!totalMinutes || totalMinutes <= 0) {
		return null;
	}

	// Add duration to pickupAt
	const endAt = new Date(pickupAt);
	endAt.setMinutes(endAt.getMinutes() + totalMinutes);
	return endAt;
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

// ============================================================================
// Story 15.2: Fuel Consumption Resolution
// ============================================================================

/**
 * Story 15.2: Result of fuel consumption resolution
 */
export interface FuelConsumptionResolution {
	consumptionL100km: number;
	source: FuelConsumptionSource;
}

/**
 * Story 15.2: Resolve fuel consumption using fallback chain
 * 
 * Priority order:
 * 1. Vehicle-specific consumption (when vehicle is selected)
 * 2. Category average consumption
 * 3. Organization settings
 * 4. System default (8.0 L/100km)
 * 
 * @param vehicleConsumption - Vehicle.consumptionLPer100Km (from selected vehicle)
 * @param categoryConsumption - VehicleCategory.averageConsumptionL100km
 * @param orgConsumption - OrganizationPricingSettings.fuelConsumptionL100km
 * @returns Resolved consumption value and its source
 */
export function resolveFuelConsumption(
	vehicleConsumption: number | null | undefined,
	categoryConsumption: number | null | undefined,
	orgConsumption: number | null | undefined,
): FuelConsumptionResolution {
	// Priority 1: Vehicle-specific consumption
	if (vehicleConsumption != null && vehicleConsumption > 0) {
		return { consumptionL100km: vehicleConsumption, source: "VEHICLE" };
	}
	
	// Priority 2: Category average consumption
	if (categoryConsumption != null && categoryConsumption > 0) {
		return { consumptionL100km: categoryConsumption, source: "CATEGORY" };
	}
	
	// Priority 3: Organization settings
	if (orgConsumption != null && orgConsumption > 0) {
		return { consumptionL100km: orgConsumption, source: "ORGANIZATION" };
	}
	
	// Priority 4: System default
	return {
		consumptionL100km: DEFAULT_COST_PARAMETERS.fuelConsumptionL100km,
		source: "DEFAULT",
	};
}

// Note: calculateFuelCost moved to Story 15.6 section above

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
 * Story 17.10: Create a zone surcharge component from zone data
 */
function createZoneSurchargeComponent(zone: ZoneData): ZoneSurchargeComponent {
	const parkingSurcharge = zone.fixedParkingSurcharge ?? 0;
	const accessFee = zone.fixedAccessFee ?? 0;
	const total = Math.round((parkingSurcharge + accessFee) * 100) / 100;
	
	return {
		zoneId: zone.id,
		zoneName: zone.name,
		zoneCode: zone.code,
		parkingSurcharge,
		accessFee,
		total,
		description: zone.surchargeDescription ?? null,
	};
}

/**
 * Story 17.10: Calculate zone surcharges for pickup and dropoff zones
 * Avoids double-counting if pickup and dropoff are in the same zone
 * 
 * @param pickupZone - The resolved pickup zone (or null)
 * @param dropoffZone - The resolved dropoff zone (or null)
 * @returns Combined zone surcharges with total
 */
export function calculateZoneSurcharges(
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
): ZoneSurcharges {
	// Calculate pickup zone surcharges
	const pickup = pickupZone ? createZoneSurchargeComponent(pickupZone) : null;
	
	// Calculate dropoff zone surcharges, but avoid double-counting if same zone
	const dropoff = dropoffZone && dropoffZone.id !== pickupZone?.id
		? createZoneSurchargeComponent(dropoffZone)
		: null;
	
	// Calculate total
	const total = Math.round(((pickup?.total ?? 0) + (dropoff?.total ?? 0)) * 100) / 100;
	
	return { pickup, dropoff, total };
}

/**
 * Calculate complete cost breakdown (Story 4.2 + 15.6)
 * Returns all cost components and total internal cost
 * Story 15.6: Now accepts fuelType for accurate fuel cost
 */
export function calculateCostBreakdown(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	parkingCost: number = 0,
	parkingDescription: string = "",
	fuelType: FuelType = "DIESEL",
): CostBreakdown {
	// Use settings or defaults
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	// Story 15.6: Calculate fuel with correct fuel type
	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelType);
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
 * Story 15.6: Now accepts fuelType for accurate fuel cost
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
 * @param fuelType - Optional fuel type (defaults to DIESEL)
 * @returns Cost breakdown with toll source information
 */
export async function calculateCostBreakdownWithTolls(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	tollConfig?: TollConfig,
	parkingCost: number = 0,
	parkingDescription: string = "",
	fuelType: FuelType = "DIESEL",
): Promise<{ breakdown: CostBreakdown; tollSource: TollSource }> {
	// Use settings or defaults
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	// Story 15.6: Calculate fuel with correct fuel type
	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelType);
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

/**
 * Story 17.14: Vehicle data for TCO calculation
 */
export interface VehicleWithTco {
	id: string;
	purchasePrice?: number | null;
	expectedLifespanKm?: number | null;
	expectedLifespanYears?: number | null;
	annualMaintenanceBudget?: number | null;
	annualInsuranceCost?: number | null;
	depreciationMethod?: "LINEAR" | "DECLINING_BALANCE" | null;
	currentOdometerKm?: number | null;
}

/**
 * Story 17.14: Vehicle category data for TCO defaults
 */
export interface VehicleCategoryWithTco {
	defaultPurchasePrice?: number | null;
	defaultExpectedLifespanKm?: number | null;
	defaultExpectedLifespanYears?: number | null;
	defaultAnnualMaintenanceBudget?: number | null;
	defaultAnnualInsuranceCost?: number | null;
	defaultDepreciationMethod?: "LINEAR" | "DECLINING_BALANCE" | null;
}

/**
 * Story 17.14: Calculate cost breakdown with TCO instead of wear when configured
 * 
 * This function replaces the generic wear cost with vehicle-specific TCO
 * (depreciation + maintenance + insurance) when TCO is configured on the vehicle
 * or its category.
 * 
 * @param distanceKm - Distance in kilometers
 * @param durationMinutes - Duration in minutes
 * @param settings - Organization pricing settings
 * @param vehicle - Optional vehicle with TCO configuration
 * @param vehicleCategory - Optional vehicle category with TCO defaults
 * @param parkingCost - Optional parking cost
 * @param parkingDescription - Optional parking description
 * @param fuelType - Optional fuel type (defaults to DIESEL)
 * @returns Cost breakdown with TCO when configured, otherwise with wear
 */
export function calculateCostBreakdownWithTco(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	vehicle?: VehicleWithTco | null,
	vehicleCategory?: VehicleCategoryWithTco | null,
	parkingCost: number = 0,
	parkingDescription: string = "",
	fuelType: FuelType = "DIESEL",
): { breakdown: CostBreakdown; tcoApplied: boolean; tcoSource: "VEHICLE" | "CATEGORY" | null } {
	// Use settings or defaults
	const fuelConsumptionL100km = settings.fuelConsumptionL100km ?? DEFAULT_COST_PARAMETERS.fuelConsumptionL100km;
	const tollCostPerKm = settings.tollCostPerKm ?? DEFAULT_COST_PARAMETERS.tollCostPerKm;
	const wearCostPerKm = settings.wearCostPerKm ?? DEFAULT_COST_PARAMETERS.wearCostPerKm;
	const driverHourlyCost = settings.driverHourlyCost ?? DEFAULT_COST_PARAMETERS.driverHourlyCost;

	// Calculate base costs
	const fuel = calculateFuelCost(distanceKm, fuelConsumptionL100km, fuelType);
	const tolls = calculateTollCost(distanceKm, tollCostPerKm);
	const driver = calculateDriverCost(durationMinutes, driverHourlyCost);
	const parking: ParkingCostComponent = {
		amount: parkingCost,
		description: parkingDescription,
	};

	// Try to build TCO config from vehicle or category
	const tcoConfig = vehicle ? buildTcoConfig(
		vehicle as VehicleForTco,
		vehicleCategory as VehicleCategoryForTco | undefined
	) : null;

	let wear: WearCostComponent;
	let tco: TcoCostComponent | undefined;
	let tcoApplied = false;
	let tcoSource: "VEHICLE" | "CATEGORY" | null = null;

	if (tcoConfig) {
		// Calculate TCO instead of wear
		const tcoResult = calculateTcoCost(distanceKm, tcoConfig);
		tcoSource = getTcoSource(
			vehicle as VehicleForTco,
			vehicleCategory as VehicleCategoryForTco | undefined
		);
		
		tco = {
			amount: tcoResult.amount,
			distanceKm: tcoResult.distanceKm,
			depreciation: tcoResult.depreciation,
			maintenance: tcoResult.maintenance,
			insurance: tcoResult.insurance,
			totalRatePerKm: tcoResult.totalRatePerKm,
			source: tcoSource!,
		};
		
		// Set wear to zero since TCO replaces it
		wear = {
			amount: 0,
			distanceKm,
			ratePerKm: 0,
		};
		
		tcoApplied = true;
	} else {
		// Use standard wear cost
		wear = calculateWearCost(distanceKm, wearCostPerKm);
	}

	// Calculate total (use TCO amount if applied, otherwise wear)
	const wearOrTcoAmount = tcoApplied ? tco!.amount : wear.amount;
	const total = Math.round(
		(fuel.amount + tolls.amount + wearOrTcoAmount + driver.amount + parking.amount) * 100
	) / 100;

	return {
		breakdown: {
			fuel,
			tolls,
			wear,
			driver,
			parking,
			tco,
			total,
		},
		tcoApplied,
		tcoSource,
	};
}

/**
 * Story 17.14: Create TCO applied rule for transparency
 */
export function createTcoAppliedRule(
	tco: TcoCostComponent,
	vehicleId: string,
	vehicleName?: string,
): AppliedRule {
	return {
		type: "TCO_COST",
		description: `TCO replaces generic wear cost (source: ${tco.source})`,
		vehicleId,
		vehicleName: vehicleName ?? "Unknown",
		totalAmount: tco.amount,
		distanceKm: tco.distanceKm,
		totalRatePerKm: tco.totalRatePerKm,
		depreciation: {
			amount: tco.depreciation.amount,
			ratePerKm: tco.depreciation.ratePerKm,
			method: tco.depreciation.method,
		},
		maintenance: {
			amount: tco.maintenance.amount,
			ratePerKm: tco.maintenance.ratePerKm,
		},
		insurance: {
			amount: tco.insurance.amount,
			ratePerKm: tco.insurance.ratePerKm,
		},
		source: tco.source,
	};
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
		fuel: { amount: 0, distanceKm: 0, consumptionL100km: 0, pricePerLiter: 0, fuelType: "DIESEL" },
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

// ============================================================================
// Story 16.7: Excursion Multi-Stop Calculation
// ============================================================================

/**
 * Story 16.7: Input for excursion leg calculation
 */
export interface ExcursionStop {
	address: string;
	latitude: number;
	longitude: number;
	order: number;
}

/**
 * Story 16.7: Input for excursion calculation
 */
export interface ExcursionCalculationInput {
	pickup: { lat: number; lng: number; address?: string };
	dropoff: { lat: number; lng: number; address?: string };
	stops: ExcursionStop[];
	returnDate?: string; // ISO date string
	pickupAt?: string; // ISO date string
}

/**
 * Story 16.7: Calculate excursion legs from pickup, stops, and dropoff
 * Creates an array of ExcursionLeg objects for multi-stop excursions
 * 
 * @param input - Excursion calculation input with stops
 * @param legDistances - Array of distances for each leg (from routing)
 * @param legDurations - Array of durations for each leg (from routing)
 * @param settings - Organization pricing settings for cost calculation
 * @returns Array of ExcursionLeg objects
 */
export function calculateExcursionLegs(
	input: ExcursionCalculationInput,
	legDistances: number[],
	legDurations: number[],
	settings: OrganizationPricingSettings,
): ExcursionLeg[] {
	// Build the full route: pickup → stop1 → stop2 → ... → dropoff
	const sortedStops = [...input.stops].sort((a, b) => a.order - b.order);
	
	const waypoints: Array<{
		address: string;
		lat: number;
		lng: number;
	}> = [
		{ address: input.pickup.address ?? "Pickup", lat: input.pickup.lat, lng: input.pickup.lng },
		...sortedStops.map(s => ({ address: s.address, lat: s.latitude, lng: s.longitude })),
		{ address: input.dropoff.address ?? "Dropoff", lat: input.dropoff.lat, lng: input.dropoff.lng },
	];
	
	const legs: ExcursionLeg[] = [];
	
	for (let i = 0; i < waypoints.length - 1; i++) {
		const from = waypoints[i];
		const to = waypoints[i + 1];
		const distanceKm = legDistances[i] ?? 0;
		const durationMinutes = legDurations[i] ?? 0;
		
		// Calculate cost for this leg
		const legCost = calculateLegCost(distanceKm, durationMinutes, settings);
		
		legs.push({
			order: i + 1,
			fromAddress: from.address,
			toAddress: to.address,
			fromCoords: { lat: from.lat, lng: from.lng },
			toCoords: { lat: to.lat, lng: to.lng },
			distanceKm: Math.round(distanceKm * 100) / 100,
			durationMinutes: Math.round(durationMinutes * 100) / 100,
			cost: legCost,
		});
	}
	
	return legs;
}

/**
 * Story 16.7: Calculate cost for a single excursion leg
 */
function calculateLegCost(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): ExcursionLeg["cost"] {
	// Use defaults if settings are not provided
	const fuelConsumption = settings.fuelConsumptionL100km ?? 7.5;
	const fuelPrice = settings.fuelPricePerLiter ?? 1.80;
	const tollRate = settings.tollCostPerKm ?? 0.12;
	const wearRate = settings.wearCostPerKm ?? 0.08;
	const driverRate = settings.driverHourlyCost ?? 30;
	
	const fuel = Math.round(
		distanceKm * (fuelConsumption / 100) * fuelPrice * 100
	) / 100;
	
	const tolls = Math.round(distanceKm * tollRate * 100) / 100;
	
	const wear = Math.round(distanceKm * wearRate * 100) / 100;
	
	const driver = Math.round(
		(durationMinutes / 60) * driverRate * 100
	) / 100;
	
	const total = Math.round((fuel + tolls + wear + driver) * 100) / 100;
	
	return { fuel, tolls, wear, driver, total };
}

/**
 * Story 16.7: Build TripAnalysis for excursion with multiple stops
 * 
 * @param legs - Array of ExcursionLeg objects
 * @param settings - Organization pricing settings
 * @param returnDate - Optional return date for multi-day excursions
 * @param pickupAt - Pickup date/time
 * @returns Complete TripAnalysis with excursion legs
 */
export function buildExcursionTripAnalysis(
	legs: ExcursionLeg[],
	settings: OrganizationPricingSettings,
	returnDate?: string,
	pickupAt?: string,
): TripAnalysis {
	const calculatedAt = new Date().toISOString();
	
	// Calculate totals from all legs
	const totalDistanceKm = legs.reduce((sum, leg) => sum + leg.distanceKm, 0);
	const totalDurationMinutes = legs.reduce((sum, leg) => sum + leg.durationMinutes, 0);
	const totalInternalCost = legs.reduce((sum, leg) => sum + leg.cost.total, 0);
	
	// Use defaults if settings are not provided
	const fuelConsumption = settings.fuelConsumptionL100km ?? 7.5;
	const fuelPrice = settings.fuelPricePerLiter ?? 1.80;
	const tollRate = settings.tollCostPerKm ?? 0.12;
	const wearRate = settings.wearCostPerKm ?? 0.08;
	const driverRate = settings.driverHourlyCost ?? 30;
	
	// Combine cost breakdowns with proper types
	const costBreakdown: CostBreakdown = {
		fuel: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.fuel, 0) * 100) / 100,
			distanceKm: totalDistanceKm,
			consumptionL100km: fuelConsumption,
			pricePerLiter: fuelPrice,
			fuelType: "DIESEL",
		},
		tolls: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.tolls, 0) * 100) / 100,
			distanceKm: totalDistanceKm,
			ratePerKm: tollRate,
			source: "ESTIMATE",
		},
		wear: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.wear, 0) * 100) / 100,
			distanceKm: totalDistanceKm,
			ratePerKm: wearRate,
		},
		driver: {
			amount: Math.round(legs.reduce((sum, leg) => sum + leg.cost.driver, 0) * 100) / 100,
			durationMinutes: totalDurationMinutes,
			hourlyRate: driverRate,
		},
		parking: {
			amount: 0,
			description: "Not applicable for excursions",
		},
		total: Math.round(totalInternalCost * 100) / 100,
	};
	
	// Check if multi-day excursion
	let isMultiDay = false;
	if (returnDate && pickupAt) {
		const pickupDate = new Date(pickupAt).toDateString();
		const returnDateStr = new Date(returnDate).toDateString();
		isMultiDay = pickupDate !== returnDateStr;
	}
	
	// Create a service segment for compatibility
	const serviceSegment: SegmentAnalysis = {
		name: "service",
		description: `Excursion with ${legs.length} legs`,
		distanceKm: totalDistanceKm,
		durationMinutes: totalDurationMinutes,
		cost: costBreakdown,
		isEstimated: false,
	};
	
	return {
		costBreakdown,
		segments: {
			approach: null,
			service: serviceSegment,
			return: null,
		},
		excursionLegs: legs,
		isMultiDay,
		totalStops: legs.length - 1, // Number of intermediate stops (excluding pickup/dropoff)
		totalDistanceKm: Math.round(totalDistanceKm * 100) / 100,
		totalDurationMinutes: Math.round(totalDurationMinutes * 100) / 100,
		totalInternalCost: Math.round(totalInternalCost * 100) / 100,
		calculatedAt,
		routingSource: "GOOGLE_API",
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

// ============================================================================
// Story 17.8: Weighted Day/Night Rate Calculation
// ============================================================================

/**
 * Convert time string "HH:MM" to minutes since midnight
 */
function parseTimeToMinutes(timeStr: string): number {
	const { hours, minutes } = parseTimeString(timeStr);
	return hours * 60 + minutes;
}

/**
 * Get minutes since midnight for a Date
 */
function getMinutesSinceMidnight(date: Date): number {
	return date.getHours() * 60 + date.getMinutes();
}

/**
 * Calculate the overlap in minutes between a time range and a night period segment
 * @param rangeStart - Start of range in minutes since midnight
 * @param rangeEnd - End of range in minutes since midnight
 * @param segmentStart - Start of night segment in minutes since midnight
 * @param segmentEnd - End of night segment in minutes since midnight
 */
function calculateSegmentOverlap(
	rangeStart: number,
	rangeEnd: number,
	segmentStart: number,
	segmentEnd: number,
): number {
	const overlapStart = Math.max(rangeStart, segmentStart);
	const overlapEnd = Math.min(rangeEnd, segmentEnd);
	return Math.max(0, overlapEnd - overlapStart);
}

/**
 * Story 17.8: Calculate minutes of trip that fall within night period
 * Handles overnight ranges like 22:00-06:00 and trips crossing midnight
 * 
 * @param pickupAt - Trip start time
 * @param estimatedEndAt - Trip end time
 * @param nightStart - Night period start time in "HH:MM" format (e.g., "22:00")
 * @param nightEnd - Night period end time in "HH:MM" format (e.g., "06:00")
 * @returns Number of minutes of the trip that fall within the night period
 */
export function calculateNightOverlapMinutes(
	pickupAt: Date,
	estimatedEndAt: Date,
	nightStart: string,
	nightEnd: string,
): number {
	const tripDurationMs = estimatedEndAt.getTime() - pickupAt.getTime();
	if (tripDurationMs <= 0) {
		return 0;
	}
	
	const tripDurationMinutes = Math.round(tripDurationMs / 60000);
	const nightStartMinutes = parseTimeToMinutes(nightStart);
	const nightEndMinutes = parseTimeToMinutes(nightEnd);
	
	// Check if this is an overnight range (e.g., 22:00-06:00)
	const isOvernightRange = nightStartMinutes > nightEndMinutes;
	
	// For trips that span multiple days, we need to iterate day by day
	// Most trips are same-day or overnight, so we optimize for that case
	
	// Get the start of the day for pickupAt
	const startOfPickupDay = new Date(pickupAt);
	startOfPickupDay.setHours(0, 0, 0, 0);
	
	// Get the start of the day for estimatedEndAt
	const startOfEndDay = new Date(estimatedEndAt);
	startOfEndDay.setHours(0, 0, 0, 0);
	
	// Calculate number of days the trip spans
	const daysDiff = Math.round((startOfEndDay.getTime() - startOfPickupDay.getTime()) / (24 * 60 * 60 * 1000));
	
	let totalNightMinutes = 0;
	
	// Process each day the trip spans
	for (let dayOffset = 0; dayOffset <= daysDiff; dayOffset++) {
		const currentDayStart = new Date(startOfPickupDay);
		currentDayStart.setDate(currentDayStart.getDate() + dayOffset);
		
		const currentDayEnd = new Date(currentDayStart);
		currentDayEnd.setDate(currentDayEnd.getDate() + 1);
		
		// Calculate the portion of the trip that falls on this day
		const tripStartOnDay = Math.max(pickupAt.getTime(), currentDayStart.getTime());
		const tripEndOnDay = Math.min(estimatedEndAt.getTime(), currentDayEnd.getTime());
		
		if (tripStartOnDay >= tripEndOnDay) {
			continue; // No trip time on this day
		}
		
		// Convert to minutes since midnight for this day
		const tripStartMinutes = Math.round((tripStartOnDay - currentDayStart.getTime()) / 60000);
		const tripEndMinutes = Math.round((tripEndOnDay - currentDayStart.getTime()) / 60000);
		
		if (isOvernightRange) {
			// Night period spans midnight: 22:00-24:00 and 00:00-06:00
			// Segment 1: nightStartMinutes to 1440 (midnight)
			totalNightMinutes += calculateSegmentOverlap(
				tripStartMinutes, tripEndMinutes,
				nightStartMinutes, 1440
			);
			// Segment 2: 0 to nightEndMinutes
			totalNightMinutes += calculateSegmentOverlap(
				tripStartMinutes, tripEndMinutes,
				0, nightEndMinutes
			);
		} else {
			// Normal range (e.g., 09:00-18:00)
			totalNightMinutes += calculateSegmentOverlap(
				tripStartMinutes, tripEndMinutes,
				nightStartMinutes, nightEndMinutes
			);
		}
	}
	
	// Ensure we don't exceed total trip duration (rounding errors)
	return Math.min(totalNightMinutes, tripDurationMinutes);
}

/**
 * Story 17.8: Result of weighted night rate calculation
 */
export interface WeightedNightRateResult {
	adjustedPrice: number;
	nightMinutes: number;
	totalMinutes: number;
	nightPercentage: number;
	baseAdjustment: number;
	effectiveAdjustment: number;
}

/**
 * Story 17.8: Calculate weighted night rate for a trip
 * Returns null if weighted calculation is not possible (fallback to binary)
 * 
 * @param basePrice - Price before night rate adjustment
 * @param pickupAt - Trip start time
 * @param estimatedEndAt - Trip end time (null = fallback to binary)
 * @param rate - The night rate configuration
 * @returns Weighted rate result, or null if binary fallback should be used
 */
export function calculateWeightedNightRate(
	basePrice: number,
	pickupAt: Date,
	estimatedEndAt: Date | null,
	rate: AdvancedRateData,
): WeightedNightRateResult | null {
	// Fallback to binary if no estimatedEndAt or missing time config
	if (!estimatedEndAt || !rate.startTime || !rate.endTime) {
		return null;
	}
	
	const totalMinutes = Math.round(
		(estimatedEndAt.getTime() - pickupAt.getTime()) / 60000
	);
	
	if (totalMinutes <= 0) {
		return null;
	}
	
	const nightMinutes = calculateNightOverlapMinutes(
		pickupAt, estimatedEndAt, rate.startTime, rate.endTime
	);
	
	// If no night overlap, no adjustment needed
	if (nightMinutes === 0) {
		return {
			adjustedPrice: basePrice,
			nightMinutes: 0,
			totalMinutes,
			nightPercentage: 0,
			baseAdjustment: rate.value,
			effectiveAdjustment: 0,
		};
	}
	
	const nightPercentage = (nightMinutes / totalMinutes) * 100;
	const nightFraction = nightMinutes / totalMinutes;
	
	// Calculate effective adjustment based on rate type
	let adjustedPrice: number;
	let effectiveAdjustment: number;
	
	if (rate.adjustmentType === "PERCENTAGE") {
		// Weighted percentage: apply rate.value% to nightFraction of the price
		effectiveAdjustment = rate.value * nightFraction;
		adjustedPrice = Math.round(basePrice * (1 + effectiveAdjustment / 100) * 100) / 100;
	} else {
		// Fixed amount: apply nightFraction of the fixed amount
		effectiveAdjustment = rate.value * nightFraction;
		adjustedPrice = Math.round((basePrice + effectiveAdjustment) * 100) / 100;
	}
	
	return {
		adjustedPrice,
		nightMinutes,
		totalMinutes,
		nightPercentage: Math.round(nightPercentage * 100) / 100,
		baseAdjustment: rate.value,
		effectiveAdjustment: Math.round(effectiveAdjustment * 100) / 100,
	};
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
 * Story 17.8: NIGHT rates use weighted calculation when estimatedEndAt is available
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
		// Story 17.8: For NIGHT rates, try weighted calculation first
		if (rate.appliesTo === "NIGHT" && rate.isActive && context.pickupAt) {
			const weightedResult = calculateWeightedNightRate(
				currentPrice,
				context.pickupAt,
				context.estimatedEndAt,
				rate,
			);
			
			if (weightedResult) {
				// Weighted calculation succeeded
				if (weightedResult.nightMinutes > 0) {
					const priceBefore = currentPrice;
					currentPrice = weightedResult.adjustedPrice;
					
					const nightPercentageRounded = Math.round(weightedResult.nightPercentage);
					appliedRules.push({
						type: "ADVANCED_RATE",
						description: `Applied NIGHT rate: ${rate.name} (${nightPercentageRounded}% of trip)`,
						ruleId: rate.id,
						ruleName: rate.name,
						adjustmentType: rate.adjustmentType,
						adjustmentValue: weightedResult.effectiveAdjustment,
						priceBefore,
						priceAfter: currentPrice,
						weightedDetails: {
							nightPeriodStart: rate.startTime!,
							nightPeriodEnd: rate.endTime!,
							tripStart: context.pickupAt.toISOString(),
							tripEnd: context.estimatedEndAt!.toISOString(),
							nightMinutes: weightedResult.nightMinutes,
							totalMinutes: weightedResult.totalMinutes,
							nightPercentage: weightedResult.nightPercentage,
							baseAdjustment: weightedResult.baseAdjustment,
							effectiveAdjustment: weightedResult.effectiveAdjustment,
						},
					});
				}
				// If nightMinutes is 0, no rate applies - skip to next rate
				continue;
			}
			// Weighted calculation failed (no estimatedEndAt), fall through to binary
		}
		
		// Binary evaluation for WEEKEND rates and fallback for NIGHT
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
// Story 17.2: Added configurable aggregation strategy support
// ============================================================================

/**
 * Story 17.2: Calculate effective multiplier based on aggregation strategy
 * 
 * @param pickupMultiplier - The pickup zone multiplier
 * @param dropoffMultiplier - The dropoff zone multiplier
 * @param strategy - The aggregation strategy to use (null = MAX for backward compatibility)
 * @returns Effective multiplier and source information
 */
export function calculateEffectiveZoneMultiplier(
	pickupMultiplier: number,
	dropoffMultiplier: number,
	strategy: ZoneMultiplierAggregationStrategy | null,
): { multiplier: number; source: "pickup" | "dropoff" | "both" } {
	// Default to MAX for backward compatibility
	const effectiveStrategy = strategy ?? "MAX";

	switch (effectiveStrategy) {
		case "MAX": {
			const isPickupHigher = pickupMultiplier >= dropoffMultiplier;
			return {
				multiplier: Math.max(pickupMultiplier, dropoffMultiplier),
				source: isPickupHigher ? "pickup" : "dropoff",
			};
		}
		case "PICKUP_ONLY":
			return { multiplier: pickupMultiplier, source: "pickup" };
		case "DROPOFF_ONLY":
			return { multiplier: dropoffMultiplier, source: "dropoff" };
		case "AVERAGE":
			return {
				multiplier: Math.round(((pickupMultiplier + dropoffMultiplier) / 2) * 1000) / 1000,
				source: "both",
			};
		default:
			// Fallback to MAX
			return {
				multiplier: Math.max(pickupMultiplier, dropoffMultiplier),
				source: pickupMultiplier >= dropoffMultiplier ? "pickup" : "dropoff",
			};
	}
}

/**
 * Apply zone pricing multiplier based on pickup and dropoff zones
 * 
 * Story 16.3: Always includes ZONE_MULTIPLIER rule for transparency
 * Story 17.2: Added configurable aggregation strategy support
 * 
 * @param basePrice - The base price before zone multiplier
 * @param pickupZone - The pickup zone data (may include priceMultiplier)
 * @param dropoffZone - The dropoff zone data (may include priceMultiplier)
 * @param strategy - The aggregation strategy to use (null = MAX for backward compatibility)
 * @returns Zone multiplier result with adjusted price and applied rule
 */
export function applyZoneMultiplier(
	basePrice: number,
	pickupZone: ZoneData | null,
	dropoffZone: ZoneData | null,
	strategy?: ZoneMultiplierAggregationStrategy | null,
): ZoneMultiplierResult {
	const pickupMultiplier = pickupZone?.priceMultiplier ?? 1.0;
	const dropoffMultiplier = dropoffZone?.priceMultiplier ?? 1.0;
	
	// Story 17.2: Calculate effective multiplier based on strategy
	const { multiplier: effectiveMultiplier, source } = calculateEffectiveZoneMultiplier(
		pickupMultiplier,
		dropoffMultiplier,
		strategy ?? null,
	);
	
	// Determine source zone for description
	const sourceZone = source === "pickup" ? pickupZone : 
		source === "dropoff" ? dropoffZone : null;
	
	const adjustedPrice = Math.round(basePrice * effectiveMultiplier * 100) / 100;
	
	// Story 17.2: Determine the effective strategy for transparency
	const effectiveStrategy: ZoneMultiplierAggregationStrategy = strategy ?? "MAX";
	
	// Build description based on strategy
	let description: string;
	if (effectiveMultiplier === 1.0) {
		description = `Zone multiplier: no adjustment (${pickupZone?.code ?? "UNKNOWN"} → ${dropoffZone?.code ?? "UNKNOWN"})`;
	} else if (source === "both") {
		description = `Zone multiplier applied: average of ${pickupZone?.name ?? "Unknown"} (${pickupMultiplier}×) and ${dropoffZone?.name ?? "Unknown"} (${dropoffMultiplier}×) = ${effectiveMultiplier}×`;
	} else {
		description = `Zone multiplier applied: ${sourceZone?.name ?? "Unknown"} (${effectiveMultiplier}×) [${effectiveStrategy}]`;
	}
	
	// Story 16.3 + 17.2: Always include ZONE_MULTIPLIER rule for transparency
	const appliedRule: AppliedRule = {
		type: "ZONE_MULTIPLIER",
		description,
		strategy: effectiveStrategy,
		pickupZone: {
			code: pickupZone?.code ?? "UNKNOWN",
			name: pickupZone?.name ?? "Unknown",
			multiplier: pickupMultiplier,
		},
		dropoffZone: {
			code: dropoffZone?.code ?? "UNKNOWN",
			name: dropoffZone?.name ?? "Unknown",
			multiplier: dropoffMultiplier,
		},
		appliedMultiplier: effectiveMultiplier,
		source,
		priceBefore: basePrice,
		priceAfter: adjustedPrice,
	};
	
	return {
		adjustedPrice,
		appliedMultiplier: effectiveMultiplier,
		appliedRule,
	};
}

// ============================================================================
// Story 16.6: Round Trip Multiplier Application
// ============================================================================

/**
 * Story 16.6: Apply round trip multiplier (×2) for transfer quotes
 * 
 * This function doubles both the price and internal cost for round-trip transfers.
 * It always returns a rule when isRoundTrip is true for transparency.
 * 
 * @param price - The price before round trip multiplier
 * @param internalCost - The internal cost before round trip multiplier
 * @param isRoundTrip - Whether this is a round trip
 * @returns Adjusted price, internal cost, and applied rule
 */
export function applyRoundTripMultiplier(
	price: number,
	internalCost: number,
	isRoundTrip: boolean,
): RoundTripMultiplierResult {
	// Not a round trip - return unchanged
	if (!isRoundTrip) {
		return {
			adjustedPrice: price,
			adjustedInternalCost: internalCost,
			appliedRule: null,
		};
	}

	// Apply ×2 multiplier
	const adjustedPrice = Math.round(price * 2 * 100) / 100;
	const adjustedInternalCost = Math.round(internalCost * 2 * 100) / 100;

	const appliedRule: AppliedRoundTripRule = {
		type: "ROUND_TRIP",
		description: "Round trip multiplier applied (×2)",
		multiplier: 2,
		priceBeforeRoundTrip: price,
		priceAfterRoundTrip: adjustedPrice,
		internalCostBeforeRoundTrip: internalCost,
		internalCostAfterRoundTrip: adjustedInternalCost,
	};

	return {
		adjustedPrice,
		adjustedInternalCost,
		appliedRule,
	};
}

// ============================================================================
// Story 15.3: Vehicle Category Multiplier Application
// ============================================================================

/**
 * Story 15.3: Apply vehicle category price multiplier
 * 
 * This function applies the category's priceMultiplier to the base price.
 * It returns the adjusted price and an optional rule if multiplier != 1.0.
 * 
 * @param basePrice - The price before category multiplier
 * @param vehicleCategory - The vehicle category info (optional)
 * @returns Adjusted price and applied rule (if multiplier != 1.0)
 */
export function applyVehicleCategoryMultiplier(
	basePrice: number,
	vehicleCategory: VehicleCategoryInfo | undefined,
): VehicleCategoryMultiplierResult {
	// No category info - return unchanged
	if (!vehicleCategory) {
		return { adjustedPrice: basePrice, appliedRule: null };
	}

	const multiplier = vehicleCategory.priceMultiplier;

	// Neutral multiplier (1.0) - no rule added
	if (multiplier === 1.0) {
		return { adjustedPrice: basePrice, appliedRule: null };
	}

	const adjustedPrice = Math.round(basePrice * multiplier * 100) / 100;

	const appliedRule: AppliedVehicleCategoryMultiplierRule = {
		type: "VEHICLE_CATEGORY_MULTIPLIER",
		description: `Vehicle category multiplier applied: ${vehicleCategory.name} (${multiplier}×)`,
		categoryId: vehicleCategory.id,
		categoryCode: vehicleCategory.code,
		categoryName: vehicleCategory.name,
		multiplier,
		priceBefore: basePrice,
		priceAfter: adjustedPrice,
	};

	return { adjustedPrice, appliedRule };
}

// ============================================================================
// Story 15.5: Trip Type Pricing Functions
// ============================================================================

/**
 * Story 15.5: Calculate excursion price with minimum duration and surcharge
 * 
 * Excursion pricing logic:
 * 1. Apply minimum duration (default 4h)
 * 2. Calculate base price: effectiveDuration × ratePerHour
 * 3. Apply surcharge percentage (default 15%)
 * 
 * @param durationMinutes - Requested duration in minutes
 * @param ratePerHour - Hourly rate to use
 * @param settings - Organization pricing settings
 * @returns Price and applied rule
 */
export function calculateExcursionPrice(
	durationMinutes: number,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	const minimumHours = settings.excursionMinimumHours ?? 4;
	const surchargePercent = settings.excursionSurchargePercent ?? 15;

	const requestedHours = durationMinutes / 60;
	const effectiveHours = Math.max(requestedHours, minimumHours);
	const minimumApplied = effectiveHours > requestedHours;

	const basePrice = Math.round(effectiveHours * ratePerHour * 100) / 100;
	const surchargeAmount = Math.round(basePrice * surchargePercent / 100 * 100) / 100;
	const price = Math.round((basePrice + surchargeAmount) * 100) / 100;

	const rule: AppliedTripTypeRule = {
		type: "TRIP_TYPE",
		tripType: "excursion",
		description: `Excursion pricing: ${effectiveHours}h × ${ratePerHour}€/h + ${surchargePercent}% surcharge${minimumApplied ? ` (minimum ${minimumHours}h applied)` : ""}`,
		minimumApplied,
		requestedHours: Math.round(requestedHours * 100) / 100,
		effectiveHours,
		surchargePercent,
		surchargeAmount,
		basePriceBeforeAdjustment: basePrice,
		priceAfterAdjustment: price,
	};

	return { price, rule };
}

/**
 * Story 15.5: Calculate dispo price with overage
 * 
 * Dispo pricing logic:
 * 1. Calculate base price: duration × ratePerHour
 * 2. Calculate included km: duration × includedKmPerHour
 * 3. Calculate overage: max(0, actualKm - includedKm) × overageRatePerKm
 * 4. Total = basePrice + overageAmount
 * 
 * @param durationMinutes - Requested duration in minutes
 * @param distanceKm - Actual distance in km
 * @param ratePerHour - Hourly rate to use
 * @param settings - Organization pricing settings
 * @returns Price and applied rule
 */
export function calculateDispoPrice(
	durationMinutes: number,
	distanceKm: number,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	const includedKmPerHour = settings.dispoIncludedKmPerHour ?? 50;
	const overageRatePerKm = settings.dispoOverageRatePerKm ?? 0.50;

	const hours = durationMinutes / 60;
	const basePrice = Math.round(hours * ratePerHour * 100) / 100;

	const includedKm = Math.round(hours * includedKmPerHour * 100) / 100;
	const overageKm = Math.max(0, Math.round((distanceKm - includedKm) * 100) / 100);
	const overageAmount = Math.round(overageKm * overageRatePerKm * 100) / 100;
	const price = Math.round((basePrice + overageAmount) * 100) / 100;

	const rule: AppliedTripTypeRule = {
		type: "TRIP_TYPE",
		tripType: "dispo",
		description: `Dispo pricing: ${hours}h × ${ratePerHour}€/h${overageKm > 0 ? ` + ${overageKm}km overage × ${overageRatePerKm}€/km` : ""}`,
		includedKm,
		actualKm: distanceKm,
		overageKm,
		overageRatePerKm,
		overageAmount,
		basePriceBeforeAdjustment: basePrice,
		priceAfterAdjustment: price,
	};

	return { price, rule };
}

/**
 * Story 17.9: Calculate dispo price using time buckets with interpolation
 * 
 * Time bucket pricing logic:
 * 1. Find applicable buckets for the vehicle category
 * 2. If duration is below minimum bucket, fallback to hourly rate
 * 3. If duration is above maximum bucket, use max bucket + hourly for extra
 * 4. If duration matches a bucket exactly, use that bucket price
 * 5. If duration is between buckets, apply interpolation strategy
 * 6. Add overage for km exceeding included distance
 * 
 * @param durationMinutes - Requested duration in minutes
 * @param distanceKm - Actual distance in km
 * @param vehicleCategoryId - Vehicle category for bucket lookup
 * @param ratePerHour - Hourly rate (fallback and extra hours)
 * @param settings - Organization pricing settings with buckets
 * @returns Price and applied rule
 */
export function calculateDispoPriceWithBuckets(
	durationMinutes: number,
	distanceKm: number,
	vehicleCategoryId: string,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	const buckets = settings.madTimeBuckets ?? [];
	const strategy = settings.timeBucketInterpolationStrategy ?? "ROUND_UP";
	const includedKmPerHour = settings.dispoIncludedKmPerHour ?? 50;
	const overageRatePerKm = settings.dispoOverageRatePerKm ?? 0.50;

	// Filter active buckets for this vehicle category, sorted by duration
	const applicableBuckets = buckets
		.filter(b => b.isActive && b.vehicleCategoryId === vehicleCategoryId)
		.sort((a, b) => a.durationHours - b.durationHours);

	const hours = durationMinutes / 60;

	// If no buckets configured, fallback to standard hourly calculation
	if (applicableBuckets.length === 0) {
		return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);
	}

	const minBucket = applicableBuckets[0];
	const maxBucket = applicableBuckets[applicableBuckets.length - 1];

	let bucketPrice: number;
	let description: string;
	let timeBucketUsed: { durationHours: number; price: number } | undefined;
	let lowerBucket: { durationHours: number; price: number } | undefined;
	let upperBucket: { durationHours: number; price: number } | undefined;
	let extraHoursCharged = 0;
	let extraHoursAmount = 0;

	// Case 1: Duration below minimum bucket - fallback to hourly rate
	if (hours < minBucket.durationHours) {
		return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);
	}

	// Case 2: Duration above maximum bucket - use max bucket + hourly for extra
	if (hours > maxBucket.durationHours) {
		bucketPrice = maxBucket.price;
		extraHoursCharged = Math.round((hours - maxBucket.durationHours) * 100) / 100;
		extraHoursAmount = Math.round(extraHoursCharged * ratePerHour * 100) / 100;
		timeBucketUsed = { durationHours: maxBucket.durationHours, price: maxBucket.price };
		description = `Time bucket: ${maxBucket.durationHours}h bucket (${maxBucket.price}€) + ${extraHoursCharged}h extra × ${ratePerHour}€/h`;
	}
	// Case 3: Duration matches a bucket exactly
	else {
		const exactMatch = applicableBuckets.find(b => b.durationHours === Math.floor(hours) || b.durationHours === Math.ceil(hours));
		
		if (exactMatch && Math.abs(exactMatch.durationHours - hours) < 0.01) {
			bucketPrice = exactMatch.price;
			timeBucketUsed = { durationHours: exactMatch.durationHours, price: exactMatch.price };
			description = `Time bucket: ${exactMatch.durationHours}h bucket (${exactMatch.price}€)`;
		}
		// Case 4: Duration between buckets - apply interpolation
		else {
			// Find surrounding buckets
			let lower: MadTimeBucketData | undefined;
			let upper: MadTimeBucketData | undefined;

			for (let i = 0; i < applicableBuckets.length - 1; i++) {
				if (applicableBuckets[i].durationHours <= hours && applicableBuckets[i + 1].durationHours >= hours) {
					lower = applicableBuckets[i];
					upper = applicableBuckets[i + 1];
					break;
				}
			}

			if (!lower || !upper) {
				// Edge case: use closest bucket
				const closest = applicableBuckets.reduce((prev, curr) =>
					Math.abs(curr.durationHours - hours) < Math.abs(prev.durationHours - hours) ? curr : prev
				);
				bucketPrice = closest.price;
				timeBucketUsed = { durationHours: closest.durationHours, price: closest.price };
				description = `Time bucket: ${closest.durationHours}h bucket (${closest.price}€) [closest match]`;
			} else {
				lowerBucket = { durationHours: lower.durationHours, price: lower.price };
				upperBucket = { durationHours: upper.durationHours, price: upper.price };

				switch (strategy) {
					case "ROUND_UP":
						bucketPrice = upper.price;
						timeBucketUsed = { durationHours: upper.durationHours, price: upper.price };
						description = `Time bucket: ${hours}h → ${upper.durationHours}h bucket (${upper.price}€) [ROUND_UP]`;
						break;

					case "ROUND_DOWN":
						bucketPrice = lower.price;
						timeBucketUsed = { durationHours: lower.durationHours, price: lower.price };
						description = `Time bucket: ${hours}h → ${lower.durationHours}h bucket (${lower.price}€) [ROUND_DOWN]`;
						break;

					case "PROPORTIONAL":
					default:
						// Linear interpolation: price = lower + ((hours - lowerDuration) / (upperDuration - lowerDuration)) * (upperPrice - lowerPrice)
						const ratio = (hours - lower.durationHours) / (upper.durationHours - lower.durationHours);
						bucketPrice = Math.round((lower.price + ratio * (upper.price - lower.price)) * 100) / 100;
						description = `Time bucket: ${hours}h interpolated between ${lower.durationHours}h (${lower.price}€) and ${upper.durationHours}h (${upper.price}€) = ${bucketPrice}€ [PROPORTIONAL]`;
						break;
				}
			}
		}
	}

	// Calculate overage (same logic as standard dispo)
	const includedKm = Math.round(hours * includedKmPerHour * 100) / 100;
	const overageKm = Math.max(0, Math.round((distanceKm - includedKm) * 100) / 100);
	const overageAmount = Math.round(overageKm * overageRatePerKm * 100) / 100;

	// Total price = bucket price + extra hours + overage
	const totalPrice = Math.round((bucketPrice + extraHoursAmount + overageAmount) * 100) / 100;

	if (overageKm > 0) {
		description += ` + ${overageKm}km overage × ${overageRatePerKm}€/km`;
	}

	const rule: AppliedTripTypeRule = {
		type: "TIME_BUCKET",
		tripType: "dispo",
		description,
		// Standard dispo fields
		includedKm,
		actualKm: distanceKm,
		overageKm,
		overageRatePerKm,
		overageAmount,
		// Time bucket specific fields
		timeBucketUsed,
		interpolationStrategy: strategy,
		lowerBucket,
		upperBucket,
		bucketPrice,
		extraHoursCharged: extraHoursCharged > 0 ? extraHoursCharged : undefined,
		extraHoursAmount: extraHoursAmount > 0 ? extraHoursAmount : undefined,
		basePriceBeforeAdjustment: bucketPrice + extraHoursAmount,
		priceAfterAdjustment: totalPrice,
	};

	return { price: totalPrice, rule };
}

/**
 * Story 17.9: Smart dispo pricing - uses buckets if configured, otherwise hourly
 */
export function calculateSmartDispoPrice(
	durationMinutes: number,
	distanceKm: number,
	vehicleCategoryId: string,
	ratePerHour: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	// Check if time buckets are configured for this vehicle category
	const buckets = settings.madTimeBuckets ?? [];
	const hasBucketsForCategory = buckets.some(
		b => b.isActive && b.vehicleCategoryId === vehicleCategoryId
	);

	if (hasBucketsForCategory && settings.timeBucketInterpolationStrategy) {
		return calculateDispoPriceWithBuckets(
			durationMinutes,
			distanceKm,
			vehicleCategoryId,
			ratePerHour,
			settings,
		);
	}

	// Fallback to standard hourly calculation
	return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);
}

/**
 * Story 15.5: Apply trip type specific pricing
 * Story 17.9: Updated to use smart dispo pricing with bucket support
 * 
 * @param tripType - Type of trip (transfer, excursion, dispo)
 * @param distanceKm - Distance in km
 * @param durationMinutes - Duration in minutes
 * @param ratePerHour - Hourly rate to use
 * @param standardBasePrice - Standard base price (for transfer)
 * @param settings - Organization pricing settings
 * @param vehicleCategoryId - Vehicle category for bucket lookup (optional, required for bucket pricing)
 * @returns Price and optional rule
 */
export function applyTripTypePricing(
	tripType: TripType,
	distanceKm: number,
	durationMinutes: number,
	ratePerHour: number,
	standardBasePrice: number,
	settings: OrganizationPricingSettings,
): TripTypePricingResult {
	// Transfer uses standard pricing (no adjustment)
	if (tripType === "transfer") {
		return { price: standardBasePrice, rule: null };
	}

	// Excursion: minimum duration + surcharge
	if (tripType === "excursion") {
		return calculateExcursionPrice(durationMinutes, ratePerHour, settings);
	}

	// Dispo: hourly + overage
	if (tripType === "dispo") {
		return calculateDispoPrice(durationMinutes, distanceKm, ratePerHour, settings);
	}

	// Unknown trip type: use standard pricing
	return { price: standardBasePrice, rule: null };
}

// ============================================================================
// Story 18.2: Dense Zone Detection Functions
// ============================================================================

/**
 * Story 18.2: Default dense zone codes (Paris intra-muros)
 */
export const DEFAULT_DENSE_ZONE_CODES = ["PARIS_0"];

/**
 * Story 18.2: Default speed threshold for dense zone detection (km/h)
 */
export const DEFAULT_DENSE_ZONE_SPEED_THRESHOLD = 15.0;

/**
 * Story 18.2: Detect if a trip is within a dense zone with low commercial speed
 * 
 * A trip is considered "intra-dense-zone" when:
 * 1. Both pickup and dropoff are in zones marked as "dense"
 * 2. The commercial speed (distance/duration) is below the configured threshold
 * 
 * @param pickupZone - Zone data for pickup location (or null if not in any zone)
 * @param dropoffZone - Zone data for dropoff location (or null if not in any zone)
 * @param distanceKm - Estimated distance in km
 * @param durationMinutes - Estimated duration in minutes
 * @param settings - Organization pricing settings with dense zone configuration
 * @returns Dense zone detection result
 */
export function detectDenseZone(
	pickupZone: { code: string } | null,
	dropoffZone: { code: string } | null,
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
): DenseZoneDetection {
	// Get configuration with defaults
	const denseZoneCodes = settings.denseZoneCodes?.length 
		? settings.denseZoneCodes 
		: DEFAULT_DENSE_ZONE_CODES;
	const speedThreshold = settings.denseZoneSpeedThreshold ?? DEFAULT_DENSE_ZONE_SPEED_THRESHOLD;
	
	const pickupCode = pickupZone?.code ?? null;
	const dropoffCode = dropoffZone?.code ?? null;
	
	// Check if both pickup and dropoff are in dense zones
	const pickupInDense = pickupCode !== null && denseZoneCodes.includes(pickupCode);
	const dropoffInDense = dropoffCode !== null && denseZoneCodes.includes(dropoffCode);
	const isIntraDenseZone = pickupInDense && dropoffInDense;
	
	// Calculate commercial speed (km/h)
	// Commercial speed = distance / time, where time is in hours
	const durationHours = durationMinutes / 60;
	const commercialSpeedKmh = durationHours > 0 
		? Math.round((distanceKm / durationHours) * 100) / 100 
		: null;
	
	// Check if speed is below threshold
	const isBelowThreshold = commercialSpeedKmh !== null && commercialSpeedKmh < speedThreshold;
	
	return {
		isIntraDenseZone,
		pickupZoneCode: pickupCode,
		dropoffZoneCode: dropoffCode,
		denseZoneCodes,
		commercialSpeedKmh,
		speedThreshold,
		isBelowThreshold,
	};
}

/**
 * Story 18.2: Calculate MAD price suggestion for Transfer trips in dense zones
 * 
 * When a Transfer trip is in a dense zone with low commercial speed,
 * this function calculates what the price would be using MAD (dispo) pricing
 * and provides a comparison to help the operator make a decision.
 * 
 * @param transferPrice - The calculated Transfer price
 * @param durationMinutes - Trip duration in minutes
 * @param distanceKm - Trip distance in km
 * @param settings - Organization pricing settings
 * @param autoSwitch - Whether auto-switch is enabled
 * @returns MAD suggestion with price comparison
 */
export function calculateMadSuggestion(
	transferPrice: number,
	durationMinutes: number,
	distanceKm: number,
	settings: OrganizationPricingSettings,
	autoSwitch: boolean,
): MadSuggestion {
	// Calculate equivalent MAD price using dispo pricing logic
	const madResult = calculateDispoPrice(
		durationMinutes, 
		distanceKm, 
		settings.baseRatePerHour, 
		settings
	);
	const madPrice = madResult.price;
	
	// Calculate price difference and percentage gain
	const priceDifference = Math.round((madPrice - transferPrice) * 100) / 100;
	const percentageGain = transferPrice > 0 
		? Math.round((priceDifference / transferPrice) * 100 * 100) / 100 
		: 0;
	
	// Generate recommendation message
	let recommendation: string;
	if (priceDifference > 0) {
		recommendation = `MAD pricing recommandé: +${priceDifference.toFixed(2)}€ (+${percentageGain.toFixed(1)}%) - Vitesse commerciale trop basse pour le pricing au km`;
	} else if (priceDifference < 0) {
		recommendation = `Transfer pricing optimal pour ce trajet (MAD serait ${Math.abs(priceDifference).toFixed(2)}€ moins cher)`;
	} else {
		recommendation = `Prix équivalent entre Transfer et MAD`;
	}
	
	return {
		type: "CONSIDER_MAD_PRICING",
		transferPrice,
		madPrice,
		priceDifference,
		percentageGain,
		recommendation,
		autoSwitched: autoSwitch && priceDifference > 0,
	};
}

/**
 * Story 18.2: Applied rule for auto-switched MAD pricing
 */
export interface AutoSwitchedToMadRule extends AppliedRule {
	type: "AUTO_SWITCHED_TO_MAD";
	description: string;
	originalTripType: "transfer";
	originalPrice: number;
	madPrice: number;
	priceDifference: number;
	commercialSpeedKmh: number;
	speedThreshold: number;
	denseZoneCodes: string[];
}

/**
 * Story 18.2: Build the auto-switched rule for transparency
 */
export function buildAutoSwitchedToMadRule(
	detection: DenseZoneDetection,
	suggestion: MadSuggestion,
): AutoSwitchedToMadRule {
	return {
		type: "AUTO_SWITCHED_TO_MAD",
		description: `Auto-switched from Transfer to MAD pricing due to low commercial speed (${detection.commercialSpeedKmh?.toFixed(1)} km/h < ${detection.speedThreshold} km/h threshold) in dense zone`,
		originalTripType: "transfer",
		originalPrice: suggestion.transferPrice,
		madPrice: suggestion.madPrice,
		priceDifference: suggestion.priceDifference,
		commercialSpeedKmh: detection.commercialSpeedKmh ?? 0,
		speedThreshold: detection.speedThreshold,
		denseZoneCodes: detection.denseZoneCodes,
	};
}

// ============================================================================
// Story 18.3: Round-Trip to MAD Detection Types and Functions
// ============================================================================

/**
 * Story 18.3: Default thresholds for round-trip to MAD detection
 */
export const DEFAULT_MIN_WAITING_TIME_FOR_SEPARATE_TRANSFERS = 180; // 3 hours in minutes
export const DEFAULT_MAX_RETURN_DISTANCE_KM = 50; // km
export const DEFAULT_ROUND_TRIP_BUFFER = 30; // minutes

/**
 * Story 18.3: Round-trip detection result
 * Used to determine if a round-trip should switch to MAD pricing
 */
export interface RoundTripDetection {
	isRoundTrip: boolean;
	waitingTimeMinutes: number | null;
	returnToBaseMinutes: number | null;
	bufferMinutes: number;
	isDriverBlocked: boolean;
	exceedsMaxReturnDistance: boolean;
	totalMissionDurationMinutes: number | null;
	// Thresholds used for transparency
	minWaitingTimeThreshold: number;
	maxReturnDistanceKm: number;
}

/**
 * Story 18.3: Round-trip MAD suggestion
 * Provides comparison between 2×Transfer and MAD pricing for round-trips
 */
export interface RoundTripMadSuggestion {
	type: "ROUND_TRIP_TO_MAD";
	twoTransferPrice: number;
	madPrice: number;
	priceDifference: number;
	percentageGain: number;
	recommendation: string;
	autoSwitched: boolean;
	// Details for transparency
	details: {
		distanceKm: number;
		durationAllerMinutes: number;
		waitingTimeMinutes: number;
		totalMissionMinutes: number;
		returnToBaseMinutes: number;
		isDriverBlocked: boolean;
		exceedsMaxReturnDistance: boolean;
	};
}

/**
 * Story 18.3: Applied rule for auto-switched round-trip to MAD
 */
export interface AppliedRoundTripToMadRule extends AppliedRule {
	type: "AUTO_SWITCHED_ROUND_TRIP_TO_MAD";
	description: string;
	originalTwoTransferPrice: number;
	newMadPrice: number;
	priceDifference: number;
	reason: "DRIVER_BLOCKED" | "EXCEEDS_MAX_RETURN_DISTANCE";
	waitingTimeMinutes: number;
	returnToBaseMinutes: number;
	totalMissionMinutes: number;
}

/**
 * Story 18.3: Detect if a round-trip has a blocked driver
 * 
 * A driver is considered "blocked" when:
 * 1. The waiting time on-site is less than the time to return to base + buffer
 * 2. OR the distance exceeds the max return distance threshold
 * 
 * @param isRoundTrip - Whether this is a round-trip request
 * @param distanceKm - One-way distance in km
 * @param durationAllerMinutes - One-way duration in minutes
 * @param waitingTimeMinutes - Waiting time on-site in minutes (null if not specified)
 * @param settings - Organization pricing settings with round-trip thresholds
 * @returns Round-trip detection result
 */
export function detectRoundTripBlocked(
	isRoundTrip: boolean,
	distanceKm: number,
	durationAllerMinutes: number,
	waitingTimeMinutes: number | null,
	settings: OrganizationPricingSettings,
): RoundTripDetection {
	// Get configuration with defaults
	const minWaitingTime = settings.minWaitingTimeForSeparateTransfers ?? DEFAULT_MIN_WAITING_TIME_FOR_SEPARATE_TRANSFERS;
	const maxReturnDistance = Number(settings.maxReturnDistanceKm ?? DEFAULT_MAX_RETURN_DISTANCE_KM);
	const buffer = settings.roundTripBuffer ?? DEFAULT_ROUND_TRIP_BUFFER;

	// Not a round-trip - return early
	if (!isRoundTrip) {
		return {
			isRoundTrip: false,
			waitingTimeMinutes: null,
			returnToBaseMinutes: null,
			bufferMinutes: buffer,
			isDriverBlocked: false,
			exceedsMaxReturnDistance: false,
			totalMissionDurationMinutes: null,
			minWaitingTimeThreshold: minWaitingTime,
			maxReturnDistanceKm: maxReturnDistance,
		};
	}

	// Calculate return to base time (2× aller duration for round trip to base)
	const returnToBaseMinutes = durationAllerMinutes * 2;

	// Check if distance exceeds max return distance
	const exceedsMaxReturnDistance = distanceKm > maxReturnDistance;

	// Calculate if driver is blocked
	// Driver is blocked if:
	// 1. Distance exceeds max return distance (driver can't reasonably return)
	// 2. OR waiting time < time to return to base + buffer
	const effectiveWaitingTime = waitingTimeMinutes ?? 0;
	const isDriverBlocked = exceedsMaxReturnDistance ||
		(effectiveWaitingTime < returnToBaseMinutes + buffer);

	// Total mission duration: aller + attente + retour + buffer
	const totalMissionDurationMinutes =
		durationAllerMinutes + effectiveWaitingTime + durationAllerMinutes + buffer;

	return {
		isRoundTrip: true,
		waitingTimeMinutes: effectiveWaitingTime,
		returnToBaseMinutes,
		bufferMinutes: buffer,
		isDriverBlocked,
		exceedsMaxReturnDistance,
		totalMissionDurationMinutes,
		minWaitingTimeThreshold: minWaitingTime,
		maxReturnDistanceKm: maxReturnDistance,
	};
}

/**
 * Story 18.3: Calculate MAD price suggestion for round-trip
 * 
 * When a round-trip has a blocked driver (waiting time too short to return),
 * this function calculates what the price would be using MAD pricing
 * for the total mission duration and provides a comparison.
 * 
 * @param twoTransferPrice - The calculated 2×Transfer price
 * @param distanceKm - One-way distance in km
 * @param durationAllerMinutes - One-way duration in minutes
 * @param waitingTimeMinutes - Waiting time on-site in minutes
 * @param detection - Round-trip detection result
 * @param settings - Organization pricing settings
 * @param autoSwitch - Whether auto-switch is enabled
 * @returns Round-trip MAD suggestion with price comparison
 */
export function calculateRoundTripMadSuggestion(
	twoTransferPrice: number,
	distanceKm: number,
	durationAllerMinutes: number,
	waitingTimeMinutes: number,
	detection: RoundTripDetection,
	settings: OrganizationPricingSettings,
	autoSwitch: boolean,
): RoundTripMadSuggestion {
	// Calculate total mission duration in minutes
	const totalMissionMinutes = detection.totalMissionDurationMinutes ??
		(durationAllerMinutes * 2 + waitingTimeMinutes + (settings.roundTripBuffer ?? DEFAULT_ROUND_TRIP_BUFFER));

	// Calculate equivalent MAD price using dispo pricing logic
	// For MAD, we use the total mission duration and only outbound distance
	const madResult = calculateDispoPrice(
		totalMissionMinutes,
		distanceKm, // Only outbound distance for MAD (driver stays on-site)
		settings.baseRatePerHour,
		settings,
	);
	const madPrice = madResult.price;

	// Calculate price difference and percentage gain
	const priceDifference = Math.round((madPrice - twoTransferPrice) * 100) / 100;
	const percentageGain = twoTransferPrice > 0
		? Math.round((priceDifference / twoTransferPrice) * 100 * 100) / 100
		: 0;

	// Generate recommendation message
	let recommendation: string;
	if (detection.exceedsMaxReturnDistance) {
		recommendation = `MAD pricing recommandé: distance trop longue pour retour base (${distanceKm.toFixed(1)}km > ${detection.maxReturnDistanceKm}km)`;
	} else if (detection.isDriverBlocked && priceDifference > 0) {
		recommendation = `MAD pricing recommandé: chauffeur bloqué sur place (attente ${waitingTimeMinutes}min < retour base ${detection.returnToBaseMinutes}min + buffer ${detection.bufferMinutes}min). Gain: +${priceDifference.toFixed(2)}€ (+${percentageGain.toFixed(1)}%)`;
	} else if (detection.isDriverBlocked && priceDifference <= 0) {
		recommendation = `Chauffeur bloqué sur place mais 2×Transfer reste optimal (MAD serait ${Math.abs(priceDifference).toFixed(2)}€ moins cher)`;
	} else {
		recommendation = `2×Transfer optimal pour ce trajet - temps d'attente suffisant pour retour base`;
	}

	// Determine if we should auto-switch
	// Only auto-switch if driver is blocked AND MAD is more profitable
	const shouldAutoSwitch = autoSwitch && detection.isDriverBlocked && priceDifference > 0;

	return {
		type: "ROUND_TRIP_TO_MAD",
		twoTransferPrice,
		madPrice,
		priceDifference,
		percentageGain,
		recommendation,
		autoSwitched: shouldAutoSwitch,
		details: {
			distanceKm,
			durationAllerMinutes,
			waitingTimeMinutes,
			totalMissionMinutes,
			returnToBaseMinutes: detection.returnToBaseMinutes ?? 0,
			isDriverBlocked: detection.isDriverBlocked,
			exceedsMaxReturnDistance: detection.exceedsMaxReturnDistance,
		},
	};
}

/**
 * Story 18.3: Build the auto-switched round-trip to MAD rule for transparency
 */
export function buildAutoSwitchedRoundTripToMadRule(
	detection: RoundTripDetection,
	suggestion: RoundTripMadSuggestion,
): AppliedRoundTripToMadRule {
	const reason: "DRIVER_BLOCKED" | "EXCEEDS_MAX_RETURN_DISTANCE" = 
		detection.exceedsMaxReturnDistance ? "EXCEEDS_MAX_RETURN_DISTANCE" : "DRIVER_BLOCKED";

	let description: string;
	if (detection.exceedsMaxReturnDistance) {
		description = `Auto-switched round-trip to MAD: distance (${suggestion.details.distanceKm.toFixed(1)}km) exceeds max return distance (${detection.maxReturnDistanceKm}km)`;
	} else {
		description = `Auto-switched round-trip to MAD: driver blocked on-site (waiting ${suggestion.details.waitingTimeMinutes}min < return time ${detection.returnToBaseMinutes}min + buffer ${detection.bufferMinutes}min)`;
	}

	return {
		type: "AUTO_SWITCHED_ROUND_TRIP_TO_MAD",
		description,
		originalTwoTransferPrice: suggestion.twoTransferPrice,
		newMadPrice: suggestion.madPrice,
		priceDifference: suggestion.priceDifference,
		reason,
		waitingTimeMinutes: suggestion.details.waitingTimeMinutes,
		returnToBaseMinutes: suggestion.details.returnToBaseMinutes,
		totalMissionMinutes: suggestion.details.totalMissionMinutes,
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
 * Story 18.8: Match a temporal vector for an excursion
 * Temporal vectors are excursion packages with guaranteed minimum durations
 * for classic destinations (Normandy, Loire Valley, etc.)
 * 
 * @param dropoffZone - The dropoff zone (destination)
 * @param pickupZone - The pickup zone (origin)
 * @param vehicleCategoryId - The vehicle category ID
 * @param estimatedDurationMinutes - The estimated trip duration from routing
 * @param contractExcursions - The excursion packages from partner contract
 * @returns TemporalVectorResult if a matching temporal vector is found, null otherwise
 */
export function matchTemporalVector(
	dropoffZone: ZoneData | null,
	pickupZone: ZoneData | null,
	vehicleCategoryId: string,
	estimatedDurationMinutes: number,
	contractExcursions: ExcursionPackageAssignment[],
): TemporalVectorResult | null {
	// Filter to temporal vectors only
	const temporalVectors = contractExcursions.filter(
		(ep) => ep.excursionPackage.isTemporalVector && ep.excursionPackage.isActive
	);

	if (temporalVectors.length === 0) {
		return null;
	}

	for (const assignment of temporalVectors) {
		const pkg = assignment.excursionPackage;

		// Check vehicle category
		if (pkg.vehicleCategoryId !== vehicleCategoryId) {
			continue;
		}

		// Check destination zone match (required for temporal vectors)
		if (pkg.destinationZoneId) {
			if (!dropoffZone || pkg.destinationZoneId !== dropoffZone.id) {
				continue;
			}
		}

		// Check origin zone is allowed (if allowedOriginZones configured)
		if (pkg.allowedOriginZones && pkg.allowedOriginZones.length > 0) {
			const originAllowed = pkg.allowedOriginZones.some(
				(oz) => oz.pricingZoneId === pickupZone?.id
			);
			if (!originAllowed) {
				continue;
			}
		}

		// Match found - calculate duration
		const minimumDurationHours = pkg.minimumDurationHours != null ? Number(pkg.minimumDurationHours) : 0;
		const actualEstimatedDurationHours = estimatedDurationMinutes / 60;
		const durationUsed = Math.max(minimumDurationHours, actualEstimatedDurationHours);

		// Get effective price (considering partner override)
		const catalogPrice = Number(pkg.price);
		const overridePrice = assignment.overridePrice != null ? Number(assignment.overridePrice) : null;
		const effectivePrice = (overridePrice !== null && overridePrice > 0) ? overridePrice : catalogPrice;

		return {
			isTemporalVector: true,
			destinationName: pkg.destinationName || pkg.name,
			minimumDurationHours,
			actualEstimatedDurationHours,
			durationUsed,
			durationSource: actualEstimatedDurationHours >= minimumDurationHours
				? "ACTUAL_ESTIMATE"
				: "TEMPORAL_VECTOR",
			packageId: pkg.id,
			packageName: pkg.name,
			packagePrice: effectivePrice,
		};
	}

	return null;
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
// Story 18.10: Hierarchical Pricing Algorithm
// ============================================================================

/**
 * Story 18.10: Check if a zone is a central zone
 * Uses isCentralZone flag first, then falls back to code pattern matching
 * 
 * @param zone - Zone to check
 * @param config - Hierarchical pricing config with centralZoneCodes
 * @returns true if zone is considered central
 */
export function isCentralZone(
	zone: ZoneDataWithCentralFlag | null,
	config: HierarchicalPricingConfig,
): boolean {
	if (!zone) return false;
	
	// First check the explicit flag
	if (zone.isCentralZone === true) return true;
	
	// Fall back to code pattern matching
	const centralCodes = config.centralZoneCodes ?? DEFAULT_HIERARCHICAL_PRICING_CONFIG.centralZoneCodes ?? [];
	return centralCodes.includes(zone.code);
}

/**
 * Story 18.10: Check if two zones are in the same ring
 * Rings are identified by zone code patterns (e.g., PARIS_20, PARIS_30)
 * 
 * @param zone1 - First zone
 * @param zone2 - Second zone
 * @returns Object with isSameRing flag and ring info
 */
export function checkSameRing(
	zone1: ZoneData | null,
	zone2: ZoneData | null,
): { isSameRing: boolean; ringCode: string | null; ringMultiplier: number | null } {
	if (!zone1 || !zone2) {
		return { isSameRing: false, ringCode: null, ringMultiplier: null };
	}
	
	// Extract ring identifier from zone codes
	// Pattern: PREFIX_DISTANCE (e.g., PARIS_20, BUSSY_10)
	const getRingId = (code: string): string | null => {
		const match = code.match(/^([A-Z]+)_(\d+)$/);
		if (match) {
			return `${match[1]}_${match[2]}`;
		}
		return null;
	};
	
	const ring1 = getRingId(zone1.code);
	const ring2 = getRingId(zone2.code);
	
	if (ring1 && ring2 && ring1 === ring2) {
		// Same ring - use the zone's multiplier
		const multiplier = zone1.priceMultiplier ?? 1.0;
		return { isSameRing: true, ringCode: ring1, ringMultiplier: multiplier };
	}
	
	return { isSameRing: false, ringCode: null, ringMultiplier: null };
}

/**
 * Story 18.10: Find intra-central flat rate for a vehicle category
 * 
 * @param vehicleCategoryId - Vehicle category ID
 * @param flatRates - Available flat rates
 * @returns Matching flat rate or null
 */
export function findIntraCentralFlatRate(
	vehicleCategoryId: string,
	flatRates: IntraCentralFlatRateData[],
): IntraCentralFlatRateData | null {
	return flatRates.find(
		(rate) => rate.vehicleCategoryId === vehicleCategoryId && rate.isActive
	) ?? null;
}

/**
 * Story 18.10: Evaluate hierarchical pricing algorithm
 * 
 * Evaluates pricing in strict priority order:
 * 1. Intra-Central Flat Rate (both points in central zone + flat rate exists)
 * 2. Inter-Zone Forfait (defined forfait between zones)
 * 3. Same-Ring Dynamic (both points in same outer ring)
 * 4. Horokilometric Fallback (standard dynamic pricing)
 * 
 * @param pickupZone - Pickup zone (with isCentralZone flag)
 * @param dropoffZone - Dropoff zone (with isCentralZone flag)
 * @param vehicleCategoryId - Vehicle category ID
 * @param config - Hierarchical pricing configuration
 * @param intraCentralFlatRates - Available intra-central flat rates
 * @param matchedForfait - Pre-matched forfait from grid search (if any)
 * @param dynamicPrice - Calculated dynamic price (for fallback)
 * @returns Hierarchical pricing result with level, price, and skipped levels
 */
export function evaluateHierarchicalPricing(
	pickupZone: ZoneDataWithCentralFlag | null,
	dropoffZone: ZoneDataWithCentralFlag | null,
	vehicleCategoryId: string,
	config: HierarchicalPricingConfig,
	intraCentralFlatRates: IntraCentralFlatRateData[],
	matchedForfait: { id: string; price: number } | null,
	dynamicPrice: number,
): HierarchicalPricingResult {
	const skippedLevels: SkippedLevel[] = [];
	
	// If hierarchical pricing is disabled, go straight to fallback
	if (!config.enabled) {
		return {
			level: 4,
			levelName: "HOROKILOMETRIC_FALLBACK",
			reason: "Hierarchical pricing disabled - using standard dynamic pricing",
			skippedLevels: [],
			appliedPrice: dynamicPrice,
		};
	}
	
	// -------------------------------------------------------------------------
	// Priority 1: Intra-Central Flat Rate
	// -------------------------------------------------------------------------
	if (!config.skipLevel1) {
		const pickupIsCentral = isCentralZone(pickupZone, config);
		const dropoffIsCentral = isCentralZone(dropoffZone, config);
		
		if (pickupIsCentral && dropoffIsCentral) {
			// Both zones are central - look for flat rate
			const flatRate = findIntraCentralFlatRate(vehicleCategoryId, intraCentralFlatRates);
			
			if (flatRate) {
				return {
					level: 1,
					levelName: "INTRA_CENTRAL_FLAT_RATE",
					reason: `Intra-central flat rate applied: ${pickupZone?.code} → ${dropoffZone?.code}`,
					skippedLevels,
					appliedPrice: flatRate.flatRate,
					details: {
						flatRateId: flatRate.id,
					},
				};
			} else {
				skippedLevels.push({
					level: 1,
					levelName: "INTRA_CENTRAL_FLAT_RATE",
					reason: "NO_RATE_CONFIGURED",
					details: `No flat rate configured for vehicle category in central zones`,
				});
			}
		} else {
			skippedLevels.push({
				level: 1,
				levelName: "INTRA_CENTRAL_FLAT_RATE",
				reason: "NOT_APPLICABLE",
				details: `Trip is not intra-central (pickup: ${pickupIsCentral}, dropoff: ${dropoffIsCentral})`,
			});
		}
	} else {
		skippedLevels.push({
			level: 1,
			levelName: "INTRA_CENTRAL_FLAT_RATE",
			reason: "DISABLED_BY_CONFIG",
		});
	}
	
	// -------------------------------------------------------------------------
	// Priority 2: Inter-Zone Forfait
	// -------------------------------------------------------------------------
	if (!config.skipLevel2) {
		if (matchedForfait) {
			return {
				level: 2,
				levelName: "INTER_ZONE_FORFAIT",
				reason: `Inter-zone forfait applied: ${pickupZone?.code ?? "?"} → ${dropoffZone?.code ?? "?"}`,
				skippedLevels,
				appliedPrice: matchedForfait.price,
				details: {
					forfaitId: matchedForfait.id,
				},
			};
		} else {
			skippedLevels.push({
				level: 2,
				levelName: "INTER_ZONE_FORFAIT",
				reason: "NO_RATE_CONFIGURED",
				details: `No forfait configured for ${pickupZone?.code ?? "?"} → ${dropoffZone?.code ?? "?"}`,
			});
		}
	} else {
		skippedLevels.push({
			level: 2,
			levelName: "INTER_ZONE_FORFAIT",
			reason: "DISABLED_BY_CONFIG",
		});
	}
	
	// -------------------------------------------------------------------------
	// Priority 3: Same-Ring Dynamic
	// -------------------------------------------------------------------------
	if (!config.skipLevel3) {
		const ringCheck = checkSameRing(pickupZone, dropoffZone);
		
		if (ringCheck.isSameRing && ringCheck.ringMultiplier !== null) {
			// Apply ring multiplier to dynamic price
			const ringAdjustedPrice = Math.round(dynamicPrice * ringCheck.ringMultiplier * 100) / 100;
			
			return {
				level: 3,
				levelName: "SAME_RING_DYNAMIC",
				reason: `Same-ring dynamic pricing: ${ringCheck.ringCode} (${ringCheck.ringMultiplier}×)`,
				skippedLevels,
				appliedPrice: ringAdjustedPrice,
				details: {
					ringMultiplier: ringCheck.ringMultiplier,
					ringCode: ringCheck.ringCode ?? undefined,
				},
			};
		} else {
			skippedLevels.push({
				level: 3,
				levelName: "SAME_RING_DYNAMIC",
				reason: "ZONE_MISMATCH",
				details: `Zones are not in the same ring (${pickupZone?.code ?? "?"} vs ${dropoffZone?.code ?? "?"})`,
			});
		}
	} else {
		skippedLevels.push({
			level: 3,
			levelName: "SAME_RING_DYNAMIC",
			reason: "DISABLED_BY_CONFIG",
		});
	}
	
	// -------------------------------------------------------------------------
	// Priority 4: Horokilometric Fallback (always available)
	// -------------------------------------------------------------------------
	return {
		level: 4,
		levelName: "HOROKILOMETRIC_FALLBACK",
		reason: "Standard horokilometric calculation (no higher priority matched)",
		skippedLevels,
		appliedPrice: dynamicPrice,
	};
}

/**
 * Story 18.10: Build applied hierarchical pricing rule for transparency
 */
export function buildHierarchicalPricingRule(
	result: HierarchicalPricingResult,
): AppliedHierarchicalPricingRule {
	return {
		type: "HIERARCHICAL_PRICING",
		description: result.reason,
		level: result.level,
		levelName: result.levelName,
		reason: result.reason,
		skippedLevels: result.skippedLevels,
		appliedPrice: result.appliedPrice,
		details: result.details,
	};
}

// ============================================================================
// Dynamic Pricing (Story 4.1 - Base Dynamic Price Calculation)
// ============================================================================

/**
 * Result of dynamic base price calculation with full details
 * PRD Formula: basePrice = max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)
 * Story 15.4: Added rateSource for transparency
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
		// Story 15.4: Track rate source for transparency
		rateSource?: RateSource;
	};
}

/**
 * Default pricing settings when organization has none configured
 */
export const DEFAULT_PRICING_SETTINGS: OrganizationPricingSettings = {
	baseRatePerKm: 2.5,
	baseRatePerHour: 45.0,
	targetMarginPercent: 20.0,
	// Story 15.5: Trip type defaults
	excursionMinimumHours: 4,
	excursionSurchargePercent: 15,
	dispoIncludedKmPerHour: 50,
	dispoOverageRatePerKm: 0.50,
};

/**
 * Calculate dynamic base price with full calculation details (Story 4.1)
 * Story 15.4: Now accepts optional category rates
 * PRD Formula: basePrice = max(distanceKm × baseRatePerKm, durationHours × baseRatePerHour)
 * 
 * @param distanceKm - Trip distance in kilometers
 * @param durationMinutes - Trip duration in minutes
 * @param settings - Organization pricing settings
 * @param categoryRates - Optional category-specific rates (Story 15.4)
 * @returns Full calculation result with inputs and intermediate values
 */
export function calculateDynamicBasePrice(
	distanceKm: number,
	durationMinutes: number,
	settings: OrganizationPricingSettings,
	categoryRates?: { ratePerKm: number; ratePerHour: number; rateSource: RateSource } | null,
): DynamicBaseCalculationResult {
	const durationHours = durationMinutes / 60;

	// Story 15.4: Use category rates if provided, otherwise org rates
	const ratePerKm = categoryRates?.ratePerKm ?? settings.baseRatePerKm;
	const ratePerHour = categoryRates?.ratePerHour ?? settings.baseRatePerHour;
	const rateSource: RateSource = categoryRates?.rateSource ?? "ORGANIZATION";

	// Calculate both price methods
	const distanceBasedPrice = Math.round(distanceKm * ratePerKm * 100) / 100;
	const durationBasedPrice = Math.round(durationHours * ratePerHour * 100) / 100;

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
			baseRatePerKm: ratePerKm,
			baseRatePerHour: ratePerHour,
			targetMarginPercent: settings.targetMarginPercent,
			rateSource, // Story 15.4: Track rate source
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
	// Story 15.3: Vehicle category for price multiplier
	vehicleCategory?: VehicleCategoryInfo;
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
	const { contact, zones, pricingSettings, advancedRates = [], seasonalMultipliers = [], vehicleCategory } = context;

	// Default values for distance/duration estimation
	const estimatedDistanceKm = request.estimatedDistanceKm ?? 30;
	const estimatedDurationMinutes = request.estimatedDurationMinutes ?? 45;

	// Initialize search details collector
	let routesChecked: RouteCheckResult[] = [];
	let excursionsChecked: ExcursionCheckResult[] = [];
	let disposChecked: DispoCheckResult[] = [];

	// Build multiplier context (Story 4.3)
	const pickupAt = request.pickupAt ? new Date(request.pickupAt) : null;
	
	// Story 17.8: Calculate estimatedEndAt for weighted day/night rate
	const estimatedEndAt = pickupAt 
		? new Date(pickupAt.getTime() + estimatedDurationMinutes * 60000)
		: null;

	// Map pickup/dropoff to zones early for multiplier context (Story 4.3)
	// This is needed even for private clients to support ZONE_SCENARIO rates
	// Story 17.1: Pass zone conflict resolution strategy from settings
	const zoneConflictStrategy = pricingSettings.zoneConflictStrategy ?? null;
	const pickupZone = findZoneForPoint(request.pickup, zones, zoneConflictStrategy);
	const dropoffZone = findZoneForPoint(request.dropoff, zones, zoneConflictStrategy);

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
			// Story 17.8: Added estimatedEndAt for weighted day/night rate
			{
				pickupAt,
				estimatedEndAt,
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
			// Story 15.3: Pass vehicle category for price multiplier
			vehicleCategory,
			// Story 15.5: Pass trip type for differentiated pricing
			request.tripType,
			// Story 16.6: Pass round trip flag
			request.isRoundTrip ?? false,
			// Story 17.15: Pass client difficulty score for Patience Tax
			contact.difficultyScore ?? null,
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
			// Story 17.8: Added estimatedEndAt for weighted day/night rate
			{
				pickupAt,
				estimatedEndAt,
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
			// Story 15.3: Pass vehicle category for price multiplier
			vehicleCategory,
			// Story 15.5: Pass trip type for differentiated pricing
			request.tripType,
			// Story 16.6: Pass round trip flag
			request.isRoundTrip ?? false,
			// Story 17.15: Pass client difficulty score for Patience Tax
			contact.difficultyScore ?? null,
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
				null, // shadowInput
				// Story 16.6: Pass round trip flag
				request.isRoundTrip ?? false,
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
				null, // shadowInput
				// Story 16.6: Pass round trip flag (excursions don't use round trip)
				false,
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
				null, // shadowInput
				// Story 16.6: Pass round trip flag (dispos don't use round trip)
				false,
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
		// Story 17.8: Added estimatedEndAt for weighted day/night rate
		{
			pickupAt,
			estimatedEndAt,
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
		// Story 15.3: Pass vehicle category for price multiplier
		vehicleCategory,
		// Story 15.5: Pass trip type for differentiated pricing
		request.tripType,
		// Story 16.6: Pass round trip flag
		request.isRoundTrip ?? false,
		// Story 17.15: Pass client difficulty score for Patience Tax
		contact.difficultyScore ?? null,
	);
}

/**
 * Build a dynamic pricing result with enhanced calculation details (Story 4.1 + 4.2 + 4.3 + 4.6 + 11.3 + 15.5 + 16.6 + 17.15)
 * Story 4.3: Now applies multipliers (advanced rates + seasonal) to the base price
 * Story 4.6: Now includes full shadow calculation with segments A/B/C
 * Story 11.3: Now applies zone pricing multipliers
 * Story 15.5: Now applies trip type specific pricing
 * Story 16.6: Now applies round trip multiplier (×2) for transfers
 * Story 17.15: Now applies client difficulty multiplier (Patience Tax)
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
	// Story 15.3: Vehicle category for price multiplier
	vehicleCategory: VehicleCategoryInfo | undefined = undefined,
	// Story 15.5: Trip type for differentiated pricing
	tripType: TripType = "transfer",
	// Story 16.6: Round trip flag for transfer pricing
	isRoundTrip: boolean = false,
	// Story 17.15: Client difficulty score for Patience Tax
	clientDifficultyScore: number | null = null,
): PricingResult {
	// Story 15.4: Resolve rates with fallback chain (Category → Organization)
	const resolvedRates = resolveRates(vehicleCategory, settings);
	
	// Calculate with full details using resolved rates
	const calculation = calculateDynamicBasePrice(distanceKm, durationMinutes, settings, resolvedRates);
	
	// Story 15.5: Apply trip type specific pricing BEFORE margin
	const tripTypePricingResult = applyTripTypePricing(
		tripType,
		distanceKm,
		durationMinutes,
		resolvedRates.ratePerHour,
		calculation.basePrice,
		settings,
	);
	
	// Use trip type adjusted price or standard base price
	const effectiveBasePrice = tripTypePricingResult.price;
	
	// Apply margin to the effective base price
	let price = Math.round(effectiveBasePrice * (1 + settings.targetMarginPercent / 100) * 100) / 100;
	
	// Add enhanced calculation rule (Story 4.1 - AC3, Story 15.4 - rate source)
	appliedRules.push({
		type: "DYNAMIC_BASE_CALCULATION",
		description: `Base price calculated using ${tripType === "transfer" ? "max(distance, duration) formula" : tripType + " pricing"} - ${calculation.selectedMethod} method selected (rates from ${resolvedRates.rateSource})`,
		inputs: calculation.inputs,
		calculation: {
			distanceBasedPrice: calculation.distanceBasedPrice,
			durationBasedPrice: calculation.durationBasedPrice,
			selectedMethod: calculation.selectedMethod,
			basePrice: effectiveBasePrice,
			priceWithMargin: price,
		},
		usingDefaultSettings,
	});

	// Story 15.5: Add trip type rule if applicable
	if (tripTypePricingResult.rule) {
		appliedRules.push(tripTypePricingResult.rule);
	}

	// Story 15.3: Apply vehicle category multiplier FIRST (after base price, before zone)
	const categoryMultiplierResult = applyVehicleCategoryMultiplier(price, vehicleCategory);
	if (categoryMultiplierResult.appliedRule) {
		price = categoryMultiplierResult.adjustedPrice;
		appliedRules.push(categoryMultiplierResult.appliedRule);
	}

	// Story 11.3 + 16.3 + 17.2: Apply zone pricing multiplier (after category multiplier)
	// Always add the zone multiplier rule for transparency
	// Story 17.2: Pass aggregation strategy from settings
	const zoneMultiplierResult = applyZoneMultiplier(
		price,
		pickupZone,
		dropoffZone,
		settings.zoneMultiplierAggregationStrategy,
	);
	price = zoneMultiplierResult.adjustedPrice;
	appliedRules.push(zoneMultiplierResult.appliedRule);

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

	// Story 17.15: Apply client difficulty multiplier (Patience Tax)
	// Applied after all other multipliers, before round trip
	if (clientDifficultyScore != null) {
		const difficultyResult = applyClientDifficultyMultiplier(
			price,
			clientDifficultyScore,
			settings.difficultyMultipliers as Record<string, number> | null,
		);
		if (difficultyResult.appliedRule) {
			price = difficultyResult.adjustedPrice;
			appliedRules.push(difficultyResult.appliedRule);
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
	let internalCost = tripAnalysis.totalInternalCost;
	
	// Story 17.10: Calculate and add zone surcharges (friction costs)
	const zoneSurcharges = calculateZoneSurcharges(pickupZone, dropoffZone);
	if (zoneSurcharges.total > 0) {
		internalCost = Math.round((internalCost + zoneSurcharges.total) * 100) / 100;
		
		// Add zone surcharge rule for transparency
		const zoneSurchargeRule: AppliedZoneSurchargeRule = {
			type: "ZONE_SURCHARGE",
			description: `Zone surcharges applied: ${zoneSurcharges.total}€ (friction costs)`,
			pickupZone: zoneSurcharges.pickup ? {
				zoneId: zoneSurcharges.pickup.zoneId,
				zoneName: zoneSurcharges.pickup.zoneName,
				zoneCode: zoneSurcharges.pickup.zoneCode,
				parkingSurcharge: zoneSurcharges.pickup.parkingSurcharge,
				accessFee: zoneSurcharges.pickup.accessFee,
				total: zoneSurcharges.pickup.total,
			} : null,
			dropoffZone: zoneSurcharges.dropoff ? {
				zoneId: zoneSurcharges.dropoff.zoneId,
				zoneName: zoneSurcharges.dropoff.zoneName,
				zoneCode: zoneSurcharges.dropoff.zoneCode,
				parkingSurcharge: zoneSurcharges.dropoff.parkingSurcharge,
				accessFee: zoneSurcharges.dropoff.accessFee,
				total: zoneSurcharges.dropoff.total,
			} : null,
			totalSurcharge: zoneSurcharges.total,
		};
		appliedRules.push(zoneSurchargeRule);
		
		// Store zone surcharges in trip analysis for transparency
		tripAnalysis.costBreakdown.zoneSurcharges = zoneSurcharges;
		tripAnalysis.costBreakdown.total = Math.round((tripAnalysis.costBreakdown.total + zoneSurcharges.total) * 100) / 100;
	}
	
	// Story 16.6: Apply round trip multiplier (×2) LAST, after all other adjustments
	// Only applies to TRANSFER trip type with isRoundTrip = true
	if (isRoundTrip && tripType === "transfer") {
		const roundTripResult = applyRoundTripMultiplier(price, internalCost, true);
		price = roundTripResult.adjustedPrice;
		internalCost = roundTripResult.adjustedInternalCost;
		if (roundTripResult.appliedRule) {
			appliedRules.push(roundTripResult.appliedRule);
		}
	}
	
	const margin = Math.round((price - internalCost) * 100) / 100;
	const marginPercent =
		price > 0 ? Math.round((margin / price) * 100 * 100) / 100 : 0;

	// Add cost breakdown rule (Story 4.2 + 17.10: zone surcharges)
	appliedRules.push({
		type: "COST_BREAKDOWN",
		description: "Internal cost calculated with operational components",
		costBreakdown: {
			fuel: tripAnalysis.costBreakdown.fuel.amount,
			tolls: tripAnalysis.costBreakdown.tolls.amount,
			wear: tripAnalysis.costBreakdown.wear.amount,
			driver: tripAnalysis.costBreakdown.driver.amount,
			parking: tripAnalysis.costBreakdown.parking.amount,
			// Story 17.10: Include zone surcharges in cost breakdown
			zoneSurcharges: tripAnalysis.costBreakdown.zoneSurcharges?.total ?? 0,
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
 * Build a FIXED_GRID pricing result with cost analysis (Story 4.2 - AC5, Story 4.6, Story 16.6)
 * Story 4.6: Now includes full shadow calculation with segments A/B/C
 * Story 16.6: Now applies round trip multiplier (×2) for transfers
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
	// Story 16.6: Round trip flag for transfer pricing
	isRoundTrip: boolean = false,
): PricingResult {
	// Story 4.6: Calculate shadow segments (A/B/C)
	const tripAnalysis = calculateShadowSegments(
		shadowInput,
		distanceKm,
		durationMinutes,
		settings,
	);
	
	// Use total internal cost from shadow calculation
	let internalCost = tripAnalysis.totalInternalCost;
	
	// Story 16.6: Apply round trip multiplier (×2) for grid prices too
	if (isRoundTrip) {
		const roundTripResult = applyRoundTripMultiplier(price, internalCost, true);
		price = roundTripResult.adjustedPrice;
		internalCost = roundTripResult.adjustedInternalCost;
		if (roundTripResult.appliedRule) {
			appliedRules.push(roundTripResult.appliedRule);
		}
	}
	
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

// ============================================================================
// Story 18.4: Loss of Exploitation (Opportunity Cost) Calculation
// ============================================================================

/**
 * Story 18.4: Daily revenue source for transparency
 */
export type DailyRevenueSource = "CONFIGURED" | "MAD_BUCKET_8H" | "HOURLY_RATE_8H";

/**
 * Story 18.4: Seasonality period classification
 */
export type SeasonalityPeriod = "HIGH_SEASON" | "LOW_SEASON" | "DEFAULT";

/**
 * Story 18.4: Loss of exploitation calculation result
 */
export interface LossOfExploitationResult {
	// Mission analysis
	totalDays: number;
	idleDays: number;
	isMultiDay: boolean;
	
	// Revenue calculation
	dailyReferenceRevenue: number;
	dailyRevenueSource: DailyRevenueSource;
	vehicleCategoryId: string | null;
	vehicleCategoryName: string | null;
	
	// Seasonality
	seasonalityCoefficient: number;
	seasonalityPeriod: SeasonalityPeriod;
	seasonalityMultiplierName: string | null;
	
	// Final calculation
	lossOfExploitation: number; // idleDays × dailyRevenue × coefficient
	
	// Breakdown for transparency
	calculation: {
		formula: string; // e.g., "2 × 400€ × 0.80 = 640€"
		idleDays: number;
		dailyRevenue: number;
		coefficient: number;
		total: number;
	};
}

/**
 * Story 18.4: Applied rule for loss of exploitation
 */
export interface AppliedLossOfExploitationRule extends AppliedRule {
	type: "LOSS_OF_EXPLOITATION";
	description: string;
	amount: number;
	details: {
		idleDays: number;
		dailyRevenue: number;
		seasonalityCoefficient: number;
		seasonalityPeriod: string;
	};
}

/**
 * Story 18.4: Default seasonality coefficients
 */
export const DEFAULT_SEASONALITY_COEFFICIENTS = {
	DEFAULT: 0.65,      // 65% - standard period
	HIGH_SEASON: 0.80,  // 80% - high demand period
	LOW_SEASON: 0.50,   // 50% - low demand period
};

/**
 * Story 18.4: Calculate idle days for a multi-day mission
 * 
 * Idle days = total calendar days - days with significant activity
 * For simplicity, we use: idleDays = totalDays - 2 (first and last day are active)
 * This is a conservative estimate that can be refined later.
 * 
 * @param pickupAt - Mission start date/time
 * @param estimatedEndAt - Mission end date/time
 * @returns Object with totalDays, idleDays, and isMultiDay flag
 */
export function calculateIdleDays(
	pickupAt: Date,
	estimatedEndAt: Date,
): { totalDays: number; idleDays: number; isMultiDay: boolean } {
	// Calculate total calendar days
	const pickupDate = new Date(pickupAt);
	const endDate = new Date(estimatedEndAt);
	
	// Set to start of day for accurate day counting
	pickupDate.setHours(0, 0, 0, 0);
	endDate.setHours(0, 0, 0, 0);
	
	const msPerDay = 24 * 60 * 60 * 1000;
	const totalDays = Math.ceil((endDate.getTime() - pickupDate.getTime()) / msPerDay) + 1;
	
	const isMultiDay = totalDays > 1;
	
	// For single-day missions, no idle days
	if (!isMultiDay) {
		return { totalDays: 1, idleDays: 0, isMultiDay: false };
	}
	
	// For multi-day missions:
	// - Day 1: Active (outbound travel + service)
	// - Day N: Active (service + return travel)
	// - Days 2 to N-1: Potentially idle
	// 
	// Conservative estimate: all middle days are idle
	const idleDays = Math.max(0, totalDays - 2);
	
	return { totalDays, idleDays, isMultiDay };
}

/**
 * Story 18.4: Get daily reference revenue for a vehicle category (sync version)
 * 
 * This is a simplified sync version that uses provided data.
 * For async version with DB lookups, use getDailyReferenceRevenueAsync.
 * 
 * Priority:
 * 1. VehicleCategory.dailyReferenceRevenue (if configured)
 * 2. 8h × VehicleCategory.defaultRatePerHour
 * 3. 8h × OrganizationPricingSettings.baseRatePerHour
 * 
 * @param vehicleCategory - Vehicle category with optional dailyReferenceRevenue and defaultRatePerHour
 * @param baseRatePerHour - Organization base rate per hour
 * @returns Object with revenue amount and source
 */
export function getDailyReferenceRevenue(
	vehicleCategory: { dailyReferenceRevenue?: number | null; defaultRatePerHour?: number | null } | null,
	baseRatePerHour: number,
): { revenue: number; source: DailyRevenueSource } {
	// Priority 1: Configured daily reference revenue
	if (vehicleCategory?.dailyReferenceRevenue) {
		return {
			revenue: Number(vehicleCategory.dailyReferenceRevenue),
			source: "CONFIGURED",
		};
	}
	
	// Priority 2: 8h × category hourly rate
	if (vehicleCategory?.defaultRatePerHour) {
		return {
			revenue: 8 * Number(vehicleCategory.defaultRatePerHour),
			source: "HOURLY_RATE_8H",
		};
	}
	
	// Priority 3: 8h × org base rate
	return {
		revenue: 8 * baseRatePerHour,
		source: "HOURLY_RATE_8H",
	};
}

/**
 * Story 18.4: Get seasonality coefficient for a given date
 * 
 * Uses existing SeasonalMultiplier to determine if date is in high/low season,
 * then applies the corresponding coefficient.
 * 
 * @param date - The date to check
 * @param seasonalMultiplier - Active seasonal multiplier for this date (if any)
 * @param settings - Organization pricing settings with seasonality coefficients
 * @returns Object with coefficient, period classification, and multiplier name
 */
export function getSeasonalityCoefficient(
	date: Date,
	seasonalMultiplier: { name: string; multiplier: number } | null,
	settings: {
		defaultSeasonalityCoefficient?: number | null;
		highSeasonCoefficient?: number | null;
		lowSeasonCoefficient?: number | null;
	},
): {
	coefficient: number;
	period: SeasonalityPeriod;
	multiplierName: string | null;
} {
	const defaultCoeff = settings.defaultSeasonalityCoefficient 
		? Number(settings.defaultSeasonalityCoefficient) 
		: DEFAULT_SEASONALITY_COEFFICIENTS.DEFAULT;
	const highSeasonCoeff = settings.highSeasonCoefficient 
		? Number(settings.highSeasonCoefficient) 
		: DEFAULT_SEASONALITY_COEFFICIENTS.HIGH_SEASON;
	const lowSeasonCoeff = settings.lowSeasonCoefficient 
		? Number(settings.lowSeasonCoefficient) 
		: DEFAULT_SEASONALITY_COEFFICIENTS.LOW_SEASON;
	
	if (!seasonalMultiplier) {
		return {
			coefficient: defaultCoeff,
			period: "DEFAULT",
			multiplierName: null,
		};
	}
	
	// Determine if high or low season based on multiplier value
	const multiplierValue = Number(seasonalMultiplier.multiplier);
	
	if (multiplierValue >= 1.1) {
		// High season (multiplier >= 1.1 means +10% or more)
		return {
			coefficient: highSeasonCoeff,
			period: "HIGH_SEASON",
			multiplierName: seasonalMultiplier.name,
		};
	} else if (multiplierValue <= 0.95) {
		// Low season (multiplier <= 0.95 means -5% or more discount)
		return {
			coefficient: lowSeasonCoeff,
			period: "LOW_SEASON",
			multiplierName: seasonalMultiplier.name,
		};
	}
	
	// Default season
	return {
		coefficient: defaultCoeff,
		period: "DEFAULT",
		multiplierName: seasonalMultiplier.name,
	};
}

/**
 * Story 18.4: Settings type for loss of exploitation calculation
 * Allows both full OrganizationPricingSettings and partial settings objects
 */
export interface LossOfExploitationSettings {
	baseRatePerHour?: number | { toNumber?: () => number } | null;
	defaultSeasonalityCoefficient?: number | { toNumber?: () => number } | null;
	highSeasonCoefficient?: number | { toNumber?: () => number } | null;
	lowSeasonCoefficient?: number | { toNumber?: () => number } | null;
}

/**
 * Story 18.4: Calculate loss of exploitation for a multi-day mission
 * 
 * @param pickupAt - Mission start date/time
 * @param estimatedEndAt - Mission end date/time
 * @param vehicleCategory - Vehicle category data
 * @param seasonalMultiplier - Active seasonal multiplier (if any)
 * @param settings - Organization pricing settings (or partial settings)
 * @returns LossOfExploitationResult with full calculation details
 */
export function calculateLossOfExploitation(
	pickupAt: Date,
	estimatedEndAt: Date,
	vehicleCategory: { 
		id: string; 
		name: string; 
		dailyReferenceRevenue?: number | null; 
		defaultRatePerHour?: number | null;
	} | null,
	seasonalMultiplier: { name: string; multiplier: number } | null,
	settings: LossOfExploitationSettings,
): LossOfExploitationResult {
	// Step 1: Calculate idle days
	const { totalDays, idleDays, isMultiDay } = calculateIdleDays(pickupAt, estimatedEndAt);
	
	// Step 2: Get daily reference revenue
	// Handle Decimal type from Prisma
	const rawBaseRate = settings.baseRatePerHour;
	const baseRatePerHour = rawBaseRate 
		? (typeof rawBaseRate === 'number' ? rawBaseRate : Number(rawBaseRate))
		: 50;
	const { revenue: dailyReferenceRevenue, source: dailyRevenueSource } = 
		getDailyReferenceRevenue(vehicleCategory, baseRatePerHour);
	
	// Step 3: Get seasonality coefficient
	// Convert Decimal types to numbers for the coefficient function
	const coeffSettings = {
		defaultSeasonalityCoefficient: settings.defaultSeasonalityCoefficient 
			? (typeof settings.defaultSeasonalityCoefficient === 'number' 
				? settings.defaultSeasonalityCoefficient 
				: Number(settings.defaultSeasonalityCoefficient))
			: null,
		highSeasonCoefficient: settings.highSeasonCoefficient
			? (typeof settings.highSeasonCoefficient === 'number'
				? settings.highSeasonCoefficient
				: Number(settings.highSeasonCoefficient))
			: null,
		lowSeasonCoefficient: settings.lowSeasonCoefficient
			? (typeof settings.lowSeasonCoefficient === 'number'
				? settings.lowSeasonCoefficient
				: Number(settings.lowSeasonCoefficient))
			: null,
	};
	const { coefficient: seasonalityCoefficient, period: seasonalityPeriod, multiplierName } = 
		getSeasonalityCoefficient(pickupAt, seasonalMultiplier, coeffSettings);
	
	// Step 4: Calculate loss of exploitation
	const lossOfExploitation = Math.round(
		idleDays * dailyReferenceRevenue * seasonalityCoefficient * 100
	) / 100;
	
	// Build formula string for transparency
	const formula = idleDays > 0
		? `${idleDays} × ${dailyReferenceRevenue.toFixed(2)}€ × ${(seasonalityCoefficient * 100).toFixed(0)}% = ${lossOfExploitation.toFixed(2)}€`
		: "N/A (no idle days)";
	
	return {
		totalDays,
		idleDays,
		isMultiDay,
		dailyReferenceRevenue,
		dailyRevenueSource,
		vehicleCategoryId: vehicleCategory?.id ?? null,
		vehicleCategoryName: vehicleCategory?.name ?? null,
		seasonalityCoefficient,
		seasonalityPeriod,
		seasonalityMultiplierName: multiplierName,
		lossOfExploitation,
		calculation: {
			formula,
			idleDays,
			dailyRevenue: dailyReferenceRevenue,
			coefficient: seasonalityCoefficient,
			total: lossOfExploitation,
		},
	};
}

/**
 * Story 18.4: Build applied rule for loss of exploitation
 * 
 * @param result - The loss of exploitation calculation result
 * @returns AppliedLossOfExploitationRule or null if no idle days
 */
export function buildLossOfExploitationRule(
	result: LossOfExploitationResult,
): AppliedLossOfExploitationRule | null {
	if (result.idleDays === 0 || result.lossOfExploitation === 0) {
		return null;
	}
	
	const periodLabel = result.seasonalityPeriod === "HIGH_SEASON" 
		? "haute saison"
		: result.seasonalityPeriod === "LOW_SEASON"
		? "basse saison"
		: "période standard";
	
	return {
		type: "LOSS_OF_EXPLOITATION",
		description: `Perte d'exploitation: ${result.idleDays} jour(s) × ${result.dailyReferenceRevenue.toFixed(2)}€ × ${(result.seasonalityCoefficient * 100).toFixed(0)}% (${periodLabel})`,
		amount: result.lossOfExploitation,
		details: {
			idleDays: result.idleDays,
			dailyRevenue: result.dailyReferenceRevenue,
			seasonalityCoefficient: result.seasonalityCoefficient,
			seasonalityPeriod: result.seasonalityPeriod,
		},
	};
}

// ============================================================================
// Story 18.5: Stay vs Return Empty Scenario Comparison
// ============================================================================

/**
 * Story 18.5: Stay on-site scenario costs
 */
export interface StayOnSiteScenario {
	hotelCost: number;
	mealCost: number;
	driverPremium: number;
	lossOfExploitation: number;
	totalCost: number;
	breakdown: {
		nights: number;
		hotelCostPerNight: number;
		days: number;
		mealCostPerDay: number;
		driverPremiumPerNight: number;
		idleDays: number;
		dailyRevenue: number;
		seasonalityCoefficient: number;
	};
}

/**
 * Story 18.5: Return empty scenario costs
 */
export interface ReturnEmptyScenario {
	isViable: boolean;
	reason: string | null;
	emptyTripsCount: number;
	totalEmptyDistanceKm: number;
	fuelCost: number;
	tollCost: number;
	driverTimeCost: number;
	totalCost: number;
	breakdown: {
		distanceOneWayKm: number;
		durationOneWayMinutes: number;
		fuelCostPerKm: number;
		tollCostPerTrip: number;
		driverHourlyRate: number;
		tripsPerIdleDay: number;
	};
}

/**
 * Story 18.5: Stay vs Return comparison result
 */
export interface StayVsReturnComparison {
	isApplicable: boolean;
	stayScenario: StayOnSiteScenario | null;
	returnScenario: ReturnEmptyScenario | null;
	recommendedScenario: "STAY_ON_SITE" | "RETURN_EMPTY" | null;
	selectedScenario: "STAY_ON_SITE" | "RETURN_EMPTY" | null;
	scenarioOverridden: boolean;
	costDifference: number;
	percentageSavings: number;
	recommendation: string;
}

/**
 * Story 18.5: Applied rule for scenario selection
 */
export interface AppliedScenarioSelectionRule extends AppliedRule {
	type: "MULTI_DAY_SCENARIO_SELECTION";
	description: string;
	selectedScenario: "STAY_ON_SITE" | "RETURN_EMPTY";
	scenarioCost: number;
	alternativeCost: number;
	savings: number;
	overridden: boolean;
}

/**
 * Story 18.5: Default settings for stay vs return comparison
 */
export const DEFAULT_STAY_VS_RETURN_SETTINGS = {
	maxReturnEmptyDistanceKm: 300,
	minIdleDaysForComparison: 1,
	hotelCostPerNight: 120,
	mealCostPerDay: 25,
	driverOvernightPremium: 50,
	fuelCostPerKm: 0.15,
	driverHourlyRate: 25,
};

/**
 * Story 18.5: Calculate costs for staying on-site during multi-day mission
 * 
 * @param totalDays - Total calendar days of the mission
 * @param idleDays - Number of idle days (from Story 18.4)
 * @param lossOfExploitationResult - Loss of exploitation calculation (from Story 18.4)
 * @param staffingSettings - Hotel, meal, and driver premium costs
 * @returns StayOnSiteScenario with full cost breakdown
 */
export function calculateStayOnSiteScenario(
	totalDays: number,
	idleDays: number,
	lossOfExploitationResult: LossOfExploitationResult,
	staffingSettings: {
		hotelCostPerNight: number;
		mealCostPerDay: number;
		driverOvernightPremium: number;
	},
): StayOnSiteScenario {
	const nights = Math.max(0, totalDays - 1); // One less night than days
	
	const hotelCost = Math.round(nights * staffingSettings.hotelCostPerNight * 100) / 100;
	const mealCost = Math.round(totalDays * staffingSettings.mealCostPerDay * 100) / 100;
	const driverPremium = Math.round(nights * staffingSettings.driverOvernightPremium * 100) / 100;
	const lossOfExploitation = lossOfExploitationResult.lossOfExploitation;
	
	const totalCost = Math.round((hotelCost + mealCost + driverPremium + lossOfExploitation) * 100) / 100;
	
	return {
		hotelCost,
		mealCost,
		driverPremium,
		lossOfExploitation,
		totalCost,
		breakdown: {
			nights,
			hotelCostPerNight: staffingSettings.hotelCostPerNight,
			days: totalDays,
			mealCostPerDay: staffingSettings.mealCostPerDay,
			driverPremiumPerNight: staffingSettings.driverOvernightPremium,
			idleDays,
			dailyRevenue: lossOfExploitationResult.dailyReferenceRevenue,
			seasonalityCoefficient: lossOfExploitationResult.seasonalityCoefficient,
		},
	};
}

/**
 * Story 18.5: Calculate costs for returning empty each day
 * 
 * @param distanceOneWayKm - One-way distance from base to mission location
 * @param durationOneWayMinutes - One-way duration in minutes
 * @param idleDays - Number of idle days
 * @param tollCostPerTrip - Toll cost for one trip
 * @param settings - Fuel cost, driver rate, and max distance threshold
 * @returns ReturnEmptyScenario with full cost breakdown
 */
export function calculateReturnEmptyScenario(
	distanceOneWayKm: number,
	durationOneWayMinutes: number,
	idleDays: number,
	tollCostPerTrip: number,
	settings: {
		fuelCostPerKm: number;
		driverHourlyRate: number;
		maxReturnEmptyDistanceKm: number;
	},
): ReturnEmptyScenario {
	const maxDistance = settings.maxReturnEmptyDistanceKm;
	
	// Check if return empty is viable
	if (distanceOneWayKm > maxDistance) {
		return {
			isViable: false,
			reason: `Distance trop longue pour retour à vide (${distanceOneWayKm.toFixed(0)}km > ${maxDistance}km)`,
			emptyTripsCount: 0,
			totalEmptyDistanceKm: 0,
			fuelCost: 0,
			tollCost: 0,
			driverTimeCost: 0,
			totalCost: Number.POSITIVE_INFINITY, // Not viable
			breakdown: {
				distanceOneWayKm,
				durationOneWayMinutes,
				fuelCostPerKm: settings.fuelCostPerKm,
				tollCostPerTrip,
				driverHourlyRate: settings.driverHourlyRate,
				tripsPerIdleDay: 2,
			},
		};
	}
	
	// For each idle day: 1 return trip (evening) + 1 outbound trip (morning)
	const tripsPerIdleDay = 2;
	const emptyTripsCount = idleDays * tripsPerIdleDay;
	const totalEmptyDistanceKm = emptyTripsCount * distanceOneWayKm;
	
	const fuelCost = Math.round(totalEmptyDistanceKm * settings.fuelCostPerKm * 100) / 100;
	const tollCost = Math.round(emptyTripsCount * tollCostPerTrip * 100) / 100;
	const driverTimeHours = (emptyTripsCount * durationOneWayMinutes) / 60;
	const driverTimeCost = Math.round(driverTimeHours * settings.driverHourlyRate * 100) / 100;
	
	const totalCost = Math.round((fuelCost + tollCost + driverTimeCost) * 100) / 100;
	
	return {
		isViable: true,
		reason: null,
		emptyTripsCount,
		totalEmptyDistanceKm,
		fuelCost,
		tollCost,
		driverTimeCost,
		totalCost,
		breakdown: {
			distanceOneWayKm,
			durationOneWayMinutes,
			fuelCostPerKm: settings.fuelCostPerKm,
			tollCostPerTrip,
			driverHourlyRate: settings.driverHourlyRate,
			tripsPerIdleDay,
		},
	};
}

/**
 * Story 18.5: Compare stay on-site vs return empty scenarios
 * 
 * @param stayScenario - Stay on-site scenario costs
 * @param returnScenario - Return empty scenario costs
 * @returns Comparison result with recommendation
 */
export function compareStayVsReturn(
	stayScenario: StayOnSiteScenario,
	returnScenario: ReturnEmptyScenario,
): {
	recommendedScenario: "STAY_ON_SITE" | "RETURN_EMPTY";
	costDifference: number;
	percentageSavings: number;
	recommendation: string;
} {
	// If return empty is not viable, stay is the only option
	if (!returnScenario.isViable) {
		return {
			recommendedScenario: "STAY_ON_SITE",
			costDifference: 0,
			percentageSavings: 0,
			recommendation: `Rester sur place (seule option viable) - ${returnScenario.reason}`,
		};
	}
	
	const stayCost = stayScenario.totalCost;
	const returnCost = returnScenario.totalCost;
	
	if (stayCost <= returnCost) {
		const savings = Math.round((returnCost - stayCost) * 100) / 100;
		const percentage = returnCost > 0 
			? Math.round((savings / returnCost) * 100 * 10) / 10 
			: 0;
		return {
			recommendedScenario: "STAY_ON_SITE",
			costDifference: savings,
			percentageSavings: percentage,
			recommendation: `Rester sur place recommandé - Économie de ${savings.toFixed(2)}€ (${percentage}%)`,
		};
	} else {
		const savings = Math.round((stayCost - returnCost) * 100) / 100;
		const percentage = stayCost > 0 
			? Math.round((savings / stayCost) * 100 * 10) / 10 
			: 0;
		return {
			recommendedScenario: "RETURN_EMPTY",
			costDifference: savings,
			percentageSavings: percentage,
			recommendation: `Retour à vide recommandé - Économie de ${savings.toFixed(2)}€ (${percentage}%)`,
		};
	}
}

/**
 * Story 18.5: Settings type for stay vs return comparison
 */
export interface StayVsReturnSettings {
	maxReturnEmptyDistanceKm?: number | { toNumber?: () => number } | null;
	minIdleDaysForComparison?: number | null;
	hotelCostPerNight?: number | { toNumber?: () => number } | null;
	mealCostPerDay?: number | { toNumber?: () => number } | null;
	driverOvernightPremium?: number | { toNumber?: () => number } | null;
	fuelConsumptionL100km?: number | { toNumber?: () => number } | null;
	fuelPricePerLiter?: number | { toNumber?: () => number } | null;
	driverHourlyCost?: number | { toNumber?: () => number } | null;
	baseRatePerHour?: number | { toNumber?: () => number } | null;
}

/**
 * Story 18.5: Helper to convert Decimal to number
 */
function toNumber(value: number | { toNumber?: () => number } | null | undefined, defaultValue: number): number {
	if (value == null) return defaultValue;
	if (typeof value === 'number') return value;
	if (typeof value.toNumber === 'function') return value.toNumber();
	return Number(value) || defaultValue;
}

/**
 * Story 18.5: Calculate stay vs return comparison for a multi-day mission
 * 
 * @param lossOfExploitationResult - Loss of exploitation calculation (from Story 18.4)
 * @param distanceOneWayKm - One-way distance from base to mission location
 * @param durationOneWayMinutes - One-way duration in minutes
 * @param tollCostPerTrip - Toll cost for one trip
 * @param settings - Organization pricing settings
 * @returns StayVsReturnComparison with full analysis
 */
export function calculateStayVsReturnComparison(
	lossOfExploitationResult: LossOfExploitationResult,
	distanceOneWayKm: number,
	durationOneWayMinutes: number,
	tollCostPerTrip: number,
	settings: StayVsReturnSettings,
): StayVsReturnComparison {
	// Check if comparison is applicable
	const minIdleDays = settings.minIdleDaysForComparison ?? DEFAULT_STAY_VS_RETURN_SETTINGS.minIdleDaysForComparison;
	
	if (!lossOfExploitationResult.isMultiDay || lossOfExploitationResult.idleDays < minIdleDays) {
		return {
			isApplicable: false,
			stayScenario: null,
			returnScenario: null,
			recommendedScenario: null,
			selectedScenario: null,
			scenarioOverridden: false,
			costDifference: 0,
			percentageSavings: 0,
			recommendation: "Non applicable - Mission sur une seule journée ou sans jours d'inactivité suffisants",
		};
	}
	
	// Build staffing settings
	const staffingSettings = {
		hotelCostPerNight: toNumber(settings.hotelCostPerNight, DEFAULT_STAY_VS_RETURN_SETTINGS.hotelCostPerNight),
		mealCostPerDay: toNumber(settings.mealCostPerDay, DEFAULT_STAY_VS_RETURN_SETTINGS.mealCostPerDay),
		driverOvernightPremium: toNumber(settings.driverOvernightPremium, DEFAULT_STAY_VS_RETURN_SETTINGS.driverOvernightPremium),
	};
	
	// Build return settings
	// Calculate fuel cost per km from consumption and price
	const fuelConsumption = toNumber(settings.fuelConsumptionL100km, 8.0); // L/100km
	const fuelPrice = toNumber(settings.fuelPricePerLiter, 1.80); // EUR/L
	const fuelCostPerKm = (fuelConsumption / 100) * fuelPrice;
	
	const returnSettings = {
		fuelCostPerKm,
		driverHourlyRate: toNumber(settings.driverHourlyCost, DEFAULT_STAY_VS_RETURN_SETTINGS.driverHourlyRate),
		maxReturnEmptyDistanceKm: toNumber(settings.maxReturnEmptyDistanceKm, DEFAULT_STAY_VS_RETURN_SETTINGS.maxReturnEmptyDistanceKm),
	};
	
	// Calculate both scenarios
	const stayScenario = calculateStayOnSiteScenario(
		lossOfExploitationResult.totalDays,
		lossOfExploitationResult.idleDays,
		lossOfExploitationResult,
		staffingSettings,
	);
	
	const returnScenario = calculateReturnEmptyScenario(
		distanceOneWayKm,
		durationOneWayMinutes,
		lossOfExploitationResult.idleDays,
		tollCostPerTrip,
		returnSettings,
	);
	
	// Compare and get recommendation
	const comparison = compareStayVsReturn(stayScenario, returnScenario);
	
	return {
		isApplicable: true,
		stayScenario,
		returnScenario,
		recommendedScenario: comparison.recommendedScenario,
		selectedScenario: comparison.recommendedScenario, // Default to recommended
		scenarioOverridden: false,
		costDifference: comparison.costDifference,
		percentageSavings: comparison.percentageSavings,
		recommendation: comparison.recommendation,
	};
}

/**
 * Story 18.5: Build applied rule for scenario selection
 * 
 * @param comparison - The stay vs return comparison result
 * @returns AppliedScenarioSelectionRule or null if not applicable
 */
export function buildScenarioSelectionRule(
	comparison: StayVsReturnComparison,
): AppliedScenarioSelectionRule | null {
	if (!comparison.isApplicable || !comparison.selectedScenario) {
		return null;
	}
	
	const selectedCost = comparison.selectedScenario === "STAY_ON_SITE"
		? comparison.stayScenario?.totalCost ?? 0
		: comparison.returnScenario?.totalCost ?? 0;
		
	const alternativeCost = comparison.selectedScenario === "STAY_ON_SITE"
		? (comparison.returnScenario?.isViable ? comparison.returnScenario.totalCost : 0)
		: comparison.stayScenario?.totalCost ?? 0;
	
	const scenarioLabel = comparison.selectedScenario === "STAY_ON_SITE"
		? "Rester sur place"
		: "Retour à vide";
	
	return {
		type: "MULTI_DAY_SCENARIO_SELECTION",
		description: `Stratégie multi-jours: ${scenarioLabel} (${selectedCost.toFixed(2)}€)`,
		selectedScenario: comparison.selectedScenario,
		scenarioCost: selectedCost,
		alternativeCost,
		savings: comparison.costDifference,
		overridden: comparison.scenarioOverridden,
	};
}

// ============================================================================
// Story 18.6: Multi-Scenario Route Optimization Types
// ============================================================================

/**
 * Story 18.6: Route scenario type
 * - MIN_TIME: Fastest route using pessimistic traffic model
 * - MIN_DISTANCE: Shortest distance route
 * - MIN_TCO: Route optimizing total cost of ownership
 */
export type RouteScenarioType = "MIN_TIME" | "MIN_DISTANCE" | "MIN_TCO";

/**
 * Story 18.6: Single route scenario with full cost breakdown
 */
export interface RouteScenario {
	/** Scenario type identifier */
	type: RouteScenarioType;
	/** Human-readable label */
	label: string;
	/** Route duration in minutes */
	durationMinutes: number;
	/** Route distance in kilometers */
	distanceKm: number;
	/** Toll cost in EUR */
	tollCost: number;
	/** Fuel cost in EUR */
	fuelCost: number;
	/** Driver time cost in EUR */
	driverCost: number;
	/** Wear/TCO cost in EUR */
	wearCost: number;
	/** Total Cost of Ownership (sum of all costs) */
	tco: number;
	/** Encoded polyline for map display (optional) */
	encodedPolyline?: string | null;
	/** Whether this scenario came from cache */
	isFromCache: boolean;
	/** Whether this is the recommended scenario */
	isRecommended: boolean;
}

/**
 * Story 18.6: Complete route scenarios result
 */
export interface RouteScenarios {
	/** Array of calculated scenarios */
	scenarios: RouteScenario[];
	/** Currently selected scenario type */
	selectedScenario: RouteScenarioType;
	/** Reason for selection */
	selectionReason: string;
	/** Whether the selection was overridden by operator */
	selectionOverridden: boolean;
	/** Whether fallback was used (API failure) */
	fallbackUsed: boolean;
	/** Fallback reason if applicable */
	fallbackReason?: string;
	/** Calculation timestamp */
	calculatedAt: string;
}

/**
 * Story 18.6: Applied rule for route scenario selection
 */
export interface AppliedRouteScenarioRule extends AppliedRule {
	type: "ROUTE_SCENARIO_SELECTION";
	description: string;
	selectedScenario: RouteScenarioType;
	selectedTco: number;
	alternativeScenarios: Array<{
		type: RouteScenarioType;
		tco: number;
		difference: number;
	}>;
	savingsVsWorst: number;
	percentageSavings: number;
}

/**
 * Story 18.6: Configuration for route scenario calculation
 */
export interface RouteScenarioConfig {
	/** Google Maps API key */
	apiKey: string;
	/** Driver hourly cost in EUR */
	driverHourlyCost: number;
	/** Fuel consumption in L/100km */
	fuelConsumptionL100km: number;
	/** Fuel price per liter in EUR */
	fuelPricePerLiter: number;
	/** Wear/TCO cost per km in EUR */
	wearCostPerKm: number;
	/** Fallback toll rate per km (when API fails) */
	fallbackTollRatePerKm: number;
}

/**
 * Story 18.6: Default route scenario labels
 */
export const ROUTE_SCENARIO_LABELS: Record<RouteScenarioType, string> = {
	MIN_TIME: "Temps minimum",
	MIN_DISTANCE: "Distance minimum",
	MIN_TCO: "Coût optimal (TCO)",
};

/**
 * Story 18.6: Calculate TCO for a single route scenario
 * 
 * TCO = Driver cost + Fuel cost + Toll cost + Wear cost
 * 
 * @param durationMinutes - Route duration in minutes
 * @param distanceKm - Route distance in km
 * @param tollCost - Toll cost in EUR
 * @param config - Cost configuration
 * @returns Object with individual costs and total TCO
 */
export function calculateScenarioTco(
	durationMinutes: number,
	distanceKm: number,
	tollCost: number,
	config: RouteScenarioConfig,
): {
	driverCost: number;
	fuelCost: number;
	wearCost: number;
	tco: number;
} {
	// Driver cost = duration × hourly rate
	const driverCost = Math.round(
		(durationMinutes / 60) * config.driverHourlyCost * 100
	) / 100;
	
	// Fuel cost = distance × consumption × price
	const fuelCost = Math.round(
		(distanceKm / 100) * config.fuelConsumptionL100km * config.fuelPricePerLiter * 100
	) / 100;
	
	// Wear cost = distance × rate
	const wearCost = Math.round(distanceKm * config.wearCostPerKm * 100) / 100;
	
	// Total TCO
	const tco = Math.round((driverCost + fuelCost + tollCost + wearCost) * 100) / 100;
	
	return { driverCost, fuelCost, wearCost, tco };
}

/**
 * Story 18.6: Select optimal scenario based on TCO
 * 
 * @param scenarios - Array of calculated scenarios
 * @returns Selected scenario type and reason
 */
export function selectOptimalScenario(
	scenarios: RouteScenario[],
): { selectedScenario: RouteScenarioType; selectionReason: string } {
	if (scenarios.length === 0) {
		return {
			selectedScenario: "MIN_TCO",
			selectionReason: "No scenarios available",
		};
	}
	
	// Find scenario with lowest TCO
	const sorted = [...scenarios].sort((a, b) => a.tco - b.tco);
	const best = sorted[0];
	
	// Check if MIN_TCO is actually the best
	const minTcoScenario = scenarios.find(s => s.type === "MIN_TCO");
	
	if (minTcoScenario && minTcoScenario.tco <= best.tco) {
		return {
			selectedScenario: "MIN_TCO",
			selectionReason: `Coût total optimal: ${minTcoScenario.tco.toFixed(2)}€`,
		};
	}
	
	// Otherwise select the actual best
	const savings = sorted.length > 1 
		? sorted[sorted.length - 1].tco - best.tco 
		: 0;
	
	return {
		selectedScenario: best.type,
		selectionReason: `Meilleur TCO: ${best.tco.toFixed(2)}€ (économie de ${savings.toFixed(2)}€ vs pire option)`,
	};
}

/**
 * Story 18.6: Build applied rule for route scenario selection
 * 
 * @param routeScenarios - The complete route scenarios result
 * @returns AppliedRouteScenarioRule for transparency
 */
export function buildRouteScenarioRule(
	routeScenarios: RouteScenarios,
): AppliedRouteScenarioRule | null {
	if (!routeScenarios.scenarios.length) {
		return null;
	}
	
	const selected = routeScenarios.scenarios.find(
		s => s.type === routeScenarios.selectedScenario
	);
	
	if (!selected) {
		return null;
	}
	
	// Calculate alternatives comparison
	const alternatives = routeScenarios.scenarios
		.filter(s => s.type !== routeScenarios.selectedScenario)
		.map(s => ({
			type: s.type,
			tco: s.tco,
			difference: Math.round((s.tco - selected.tco) * 100) / 100,
		}));
	
	// Calculate savings vs worst option
	const worstTco = Math.max(...routeScenarios.scenarios.map(s => s.tco));
	const savingsVsWorst = Math.round((worstTco - selected.tco) * 100) / 100;
	const percentageSavings = worstTco > 0 
		? Math.round((savingsVsWorst / worstTco) * 100 * 100) / 100 
		: 0;
	
	return {
		type: "ROUTE_SCENARIO_SELECTION",
		description: `Scénario de route: ${ROUTE_SCENARIO_LABELS[selected.type]} (${selected.tco.toFixed(2)}€)`,
		selectedScenario: routeScenarios.selectedScenario,
		selectedTco: selected.tco,
		alternativeScenarios: alternatives,
		savingsVsWorst,
		percentageSavings,
	};
}
