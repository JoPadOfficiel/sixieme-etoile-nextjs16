/**
 * Pricing Engine Types
 * Story 19-15: Extracted from pricing-engine.ts for modular architecture
 */

import type { GeoPoint, ZoneData, ZoneConflictStrategy } from "../../lib/geo-utils";
import type { AlternativeCostParameters, ExtendedStaffingCostParameters, RegulatoryCategory } from "../compliance-validator";
import type { CommissionData } from "../commission-service";
import type { TollSource } from "../toll-service";

// ============================================================================
// Core Types
// ============================================================================

export type PricingMode = "FIXED_GRID" | "DYNAMIC" | "PARTNER_GRID" | "CLIENT_DIRECT" | "MANUAL";
export type GridType = "ZoneRoute" | "ExcursionPackage" | "DispoPackage";
export type TripType = "transfer" | "excursion" | "dispo";
export type ProfitabilityIndicator = "green" | "orange" | "red";
export type FuelConsumptionSource = "VEHICLE" | "CATEGORY" | "ORGANIZATION" | "DEFAULT";
export type FuelType = "DIESEL" | "GASOLINE" | "LPG" | "ELECTRIC";
export type ZoneMultiplierAggregationStrategy = "MAX" | "PICKUP_ONLY" | "DROPOFF_ONLY" | "AVERAGE";
export type AdvancedRateAppliesTo = "NIGHT" | "WEEKEND";
export type AdjustmentType = "PERCENTAGE" | "FIXED_AMOUNT";
export type RateSource = "CATEGORY" | "ORGANIZATION";
export type TimeBucketInterpolationStrategy = "ROUND_UP" | "ROUND_DOWN" | "PROPORTIONAL";
export type StaffingPlanType = "DOUBLE_CREW" | "RELAY_DRIVER" | "MULTI_DAY" | "NONE";
export type StaffingSelectionPolicy = "CHEAPEST" | "FASTEST" | "PREFER_INTERNAL";
export type OriginDestinationType = "ZONES" | "ADDRESS";
export type ExcursionReturnSource = "SHADOW_CALCULATION" | "SYMMETRIC_ESTIMATE";
export type HierarchicalPricingLevel = 1 | 2 | 3 | 4;
export type HierarchicalPricingLevelName = "INTRA_CENTRAL_FLAT_RATE" | "INTER_ZONE_FORFAIT" | "SAME_RING_DYNAMIC" | "HOROKILOMETRIC_FALLBACK";
export type SkippedLevelReason = "NOT_APPLICABLE" | "NO_RATE_CONFIGURED" | "DISABLED_BY_CONFIG" | "ZONE_MISMATCH";
export type OverrideErrorCode = "BELOW_MINIMUM_MARGIN" | "EXCEEDS_ROLE_LIMIT" | "INVALID_PRICE" | "PRICE_TOO_LOW";

export type FallbackReason =
	| "PRIVATE_CLIENT"
	| "NO_CONTRACT"
	| "NO_ZONE_MATCH"
	| "NO_ROUTE_MATCH"
	| "NO_EXCURSION_MATCH"
	| "NO_DISPO_MATCH"
	| null;

export type RejectionReason = "ZONE_MISMATCH" | "CATEGORY_MISMATCH" | "DIRECTION_MISMATCH" | "INACTIVE";

// Re-export external types
export type { GeoPoint, ZoneData, ZoneConflictStrategy };
export type { AlternativeCostParameters, ExtendedStaffingCostParameters, RegulatoryCategory };
export type { CommissionData };
export type { TollSource };

// ============================================================================
// Cost Component Interfaces
// ============================================================================

export interface FuelCostComponent {
	amount: number;
	distanceKm: number;
	consumptionL100km: number;
	pricePerLiter: number;
	fuelType: FuelType;
}

export interface TollCostComponent {
	amount: number;
	distanceKm: number;
	ratePerKm: number;
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

export interface ZoneSurchargeComponent {
	zoneId: string;
	zoneName: string;
	zoneCode: string;
	parkingSurcharge: number;
	accessFee: number;
	total: number;
	description: string | null;
}

export interface ZoneSurcharges {
	pickup: ZoneSurchargeComponent | null;
	dropoff: ZoneSurchargeComponent | null;
	total: number;
}

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
	source: "VEHICLE" | "CATEGORY";
}

export interface CostBreakdown {
	fuel: FuelCostComponent;
	tolls: TollCostComponent;
	wear: WearCostComponent;
	driver: DriverCostComponent;
	parking: ParkingCostComponent;
	zoneSurcharges?: ZoneSurcharges;
	tco?: TcoCostComponent;
	total: number;
}

// ============================================================================
// Request/Response Interfaces
// ============================================================================

export interface PricingRequest {
	contactId: string;
	pickup: GeoPoint;
	dropoff: GeoPoint;
	vehicleCategoryId: string;
	tripType: TripType;
	pickupAt?: string;
	estimatedDurationMinutes?: number;
	estimatedDistanceKm?: number;
	isRoundTrip?: boolean;
	durationHours?: number;
	maxKilometers?: number;
}

export interface AppliedRule {
	type: string;
	description?: string;
	[key: string]: unknown;
}

export interface MatchedGrid {
	type: GridType;
	id: string;
	name: string;
	fromZone?: string;
	toZone?: string;
}

export interface ProfitabilityThresholds {
	greenThreshold: number;
	orangeThreshold: number;
}

export interface ProfitabilityIndicatorData {
	indicator: ProfitabilityIndicator;
	marginPercent: number;
	thresholds: ProfitabilityThresholds;
	label: string;
	description: string;
}

export interface PricingResult {
	pricingMode: PricingMode;
	price: number;
	currency: "EUR";
	internalCost: number;
	margin: number;
	marginPercent: number;
	profitabilityIndicator: ProfitabilityIndicator;
	profitabilityData: ProfitabilityIndicatorData;
	matchedGrid: MatchedGrid | null;
	appliedRules: AppliedRule[];
	isContractPrice: boolean;
	fallbackReason: FallbackReason;
	gridSearchDetails: GridSearchDetails | null;
	tripAnalysis: TripAnalysis;
	overrideApplied?: boolean;
	previousPrice?: number;
	commissionData?: CommissionData;
	// Story 21.9: Validation result
	// Story 21.9: Validation result
	validation?: ValidationResult;
	// Story 24.9: Bidirectional pricing info
	bidirectionalPricing?: BidirectionalPricingInfo;
}

export interface BidirectionalPricingInfo {
	partnerGridPrice: number | null;
	clientDirectPrice: number | null;
	priceDifference: number | null;
	priceDifferencePercent: number | null;
}

// ============================================================================
// Grid Search Interfaces
// ============================================================================

export interface RouteCheckResult {
	routeId: string;
	routeName: string;
	fromZone: string;
	toZone: string;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

export interface ExcursionCheckResult {
	excursionId: string;
	excursionName: string;
	originZone: string | null;
	destinationZone: string | null;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

export interface DispoCheckResult {
	dispoId: string;
	dispoName: string;
	vehicleCategory: string;
	rejectionReason: RejectionReason;
}

export interface GridSearchDetails {
	pickupZone: { id: string; name: string; code: string } | null;
	dropoffZone: { id: string; name: string; code: string } | null;
	vehicleCategoryId: string;
	tripType: TripType;
	routesChecked: RouteCheckResult[];
	excursionsChecked: ExcursionCheckResult[];
	disposChecked: DispoCheckResult[];
}

// ============================================================================
// Data Interfaces (from database)
// ============================================================================

export interface ContactData {
	id: string;
	isPartner: boolean;
	partnerContract?: PartnerContractData | null;
	difficultyScore?: number | null;
}

export interface PartnerContractData {
	id: string;
	zoneRoutes: ZoneRouteAssignment[];
	excursionPackages: ExcursionPackageAssignment[];
	dispoPackages: DispoPackageAssignment[];
}

export interface ZoneRouteZoneData {
	zone: { id: string; name: string; code: string };
}

export interface ZoneRouteAssignment {
	zoneRoute: {
		id: string;
		fromZoneId: string | null;
		toZoneId: string | null;
		originType: OriginDestinationType;
		destinationType: OriginDestinationType;
		originZones: ZoneRouteZoneData[];
		destinationZones: ZoneRouteZoneData[];
		originPlaceId?: string | null;
		originAddress?: string | null;
		originLat?: number | null;
		originLng?: number | null;
		destPlaceId?: string | null;
		destAddress?: string | null;
		destLat?: number | null;
		destLng?: number | null;
		vehicleCategoryId: string;
		fixedPrice: number;
		direction: "BIDIRECTIONAL" | "A_TO_B" | "B_TO_A";
		isActive: boolean;
		fromZone: { id: string; name: string; code: string } | null;
		toZone: { id: string; name: string; code: string } | null;
	};
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
		isTemporalVector?: boolean;
		minimumDurationHours?: number | null;
		destinationName?: string | null;
		destinationDescription?: string | null;
		includedDurationHours?: number;
		allowedOriginZones?: Array<{ pricingZoneId: string; pricingZone?: { id: string; name: string; code: string } }>;
	};
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
	overridePrice?: number | null;
}

export interface MadTimeBucketData {
	id: string;
	durationHours: number;
	vehicleCategoryId: string;
	price: number;
	isActive: boolean;
}

export interface OrganizationPricingSettings {
	organizationId?: string;
	baseRatePerKm: number;
	baseRatePerHour: number;
	targetMarginPercent: number;
	fuelConsumptionL100km?: number;
	fuelPricePerLiter?: number;
	tollCostPerKm?: number;
	wearCostPerKm?: number;
	driverHourlyCost?: number;
	greenMarginThreshold?: number;
	orangeMarginThreshold?: number;
	excursionMinimumHours?: number;
	excursionSurchargePercent?: number;
	dispoIncludedKmPerHour?: number;
	dispoOverageRatePerKm?: number;
	zoneConflictStrategy?: ZoneConflictStrategy | null;
	zoneMultiplierAggregationStrategy?: ZoneMultiplierAggregationStrategy | null;
	staffingSelectionPolicy?: StaffingSelectionPolicy | null;
	staffingCostParameters?: ExtendedStaffingCostParameters | null;
	timeBucketInterpolationStrategy?: TimeBucketInterpolationStrategy | null;
	madTimeBuckets?: MadTimeBucketData[];
	difficultyMultipliers?: Record<string, number> | null;
	denseZoneSpeedThreshold?: number | null;
	autoSwitchToMAD?: boolean;
	denseZoneCodes?: string[];
	minWaitingTimeForSeparateTransfers?: number | null;
	maxReturnDistanceKm?: number | null;
	roundTripBuffer?: number | null;
	autoSwitchRoundTripToMAD?: boolean;
	transitDiscountEnabled?: boolean;
	transitDiscountPercent?: number;
	transitZoneCodes?: string[];
	// Story 21.6: Empty return cost percentage (100 = full cost, 70 = 70%, etc.)
	emptyReturnCostPercent?: number;
}

// ============================================================================
// Multiplier Interfaces
// ============================================================================

export interface AdvancedRateData {
	id: string;
	name: string;
	appliesTo: AdvancedRateAppliesTo;
	startTime: string | null;
	endTime: string | null;
	daysOfWeek: string | null;
	minDistanceKm: number | null;
	maxDistanceKm: number | null;
	zoneId: string | null;
	adjustmentType: AdjustmentType;
	value: number;
	priority: number;
	isActive: boolean;
	// Story 23-7: Optional vehicle category filter
	vehicleCategoryId?: string | null;
	vehicleCategoryIds?: string[] | null;
}

export interface SeasonalMultiplierData {
	id: string;
	name: string;
	description: string | null;
	startDate: Date;
	endDate: Date;
	multiplier: number;
	priority: number;
	isActive: boolean;
	// Story 23-7: Optional vehicle category filter
	vehicleCategoryId?: string | null;
	vehicleCategoryIds?: string[] | null;
}

export interface MultiplierContext {
	pickupAt: Date | null;
	estimatedEndAt: Date | null;
	distanceKm: number;
	pickupZoneId: string | null;
	dropoffZoneId: string | null;
	// Story 23-7: Vehicle category for adjustment filtering
	vehicleCategoryId?: string | null;
}

export interface WeightedNightRateDetails {
	nightPeriodStart: string;
	nightPeriodEnd: string;
	tripStart: string;
	tripEnd: string;
	nightMinutes: number;
	totalMinutes: number;
	nightPercentage: number;
	baseAdjustment: number;
	effectiveAdjustment: number;
}

export interface AppliedMultiplierRule extends AppliedRule {
	type: "ADVANCED_RATE" | "SEASONAL_MULTIPLIER";
	ruleId: string;
	ruleName: string;
	adjustmentType: "PERCENTAGE" | "FIXED_AMOUNT" | "MULTIPLIER";
	adjustmentValue: number;
	priceBefore: number;
	priceAfter: number;
	weightedDetails?: WeightedNightRateDetails;
}

export interface MultiplierEvaluationResult {
	adjustedPrice: number;
	appliedRules: AppliedMultiplierRule[];
}

// ============================================================================
// Zone Multiplier Interfaces
// ============================================================================

export interface AppliedZoneMultiplierRule extends AppliedRule {
	type: "ZONE_MULTIPLIER";
	zoneId: string;
	zoneName: string;
	zoneCode: string;
	multiplier: number;
	source: "pickup" | "dropoff" | "both";
	priceBefore: number;
	priceAfter: number;
	strategy?: ZoneMultiplierAggregationStrategy;
	pickupZone?: { code: string; name: string; multiplier: number };
	dropoffZone?: { code: string; name: string; multiplier: number };
}

export interface ZoneMultiplierResult {
	adjustedPrice: number;
	appliedMultiplier: number;
	appliedRule: AppliedRule;
}

// ============================================================================
// Round Trip Interfaces
// ============================================================================

/**
 * Story 22.1: Round trip calculation mode
 * - WAIT_ON_SITE: Driver waits at dropoff, no return/repositioning between legs
 * - RETURN_BETWEEN_LEGS: Driver returns to base between outbound and return legs
 */
export type RoundTripMode = "WAIT_ON_SITE" | "RETURN_BETWEEN_LEGS";

/**
 * Story 22.1: Extended segment analysis for round trips
 * Adds return leg segments (D, E, F) to the standard A, B, C
 */
export interface RoundTripSegmentAnalysis {
	/** Segment A: Base → Pickup (initial positioning) */
	approach: SegmentAnalysis | null;
	/** Segment B: Pickup → Dropoff (outbound service) */
	service: SegmentAnalysis;
	/** Segment C: Dropoff → Base (empty return after outbound) - null for WAIT_ON_SITE */
	return: SegmentAnalysis | null;
	/** Segment D: Base → Pickup (repositioning for return leg) - null for WAIT_ON_SITE */
	returnApproach: SegmentAnalysis | null;
	/** Segment E: Dropoff → Pickup (return service = inverse of B) */
	returnService: SegmentAnalysis | null;
	/** Segment F: Pickup → Base (final empty return) */
	finalReturn: SegmentAnalysis | null;
}

/**
 * Story 22.1: Cost breakdown per segment for round trips
 */
export interface RoundTripSegmentBreakdown {
	segmentA: number;
	segmentB: number;
	segmentC: number;
	segmentD: number;
	segmentE: number;
	segmentF: number;
	total: number;
}

/**
 * Story 22.1: Applied rule for segment-based round trip calculation
 */
export interface AppliedRoundTripSegmentsRule extends AppliedRule {
	type: "ROUND_TRIP_SEGMENTS";
	description: string;
	roundTripMode: RoundTripMode;
	segmentBreakdown: RoundTripSegmentBreakdown;
	totalBeforeRoundTrip: number;
	totalAfterRoundTrip: number;
	internalCostBeforeRoundTrip: number;
	internalCostAfterRoundTrip: number;
	waitingTimeMinutes?: number;
	waitOnSiteThresholdMinutes?: number;
}

/**
 * Story 22.1: Result of segment-based round trip calculation
 */
export interface RoundTripSegmentsResult {
	adjustedPrice: number;
	adjustedInternalCost: number;
	segments: RoundTripSegmentAnalysis;
	roundTripMode: RoundTripMode;
	appliedRule: AppliedRoundTripSegmentsRule;
}

/**
 * @deprecated Use AppliedRoundTripSegmentsRule instead (Story 22.1)
 * Kept for backward compatibility with existing quotes
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
 * @deprecated Use RoundTripSegmentsResult instead (Story 22.1)
 * Kept for backward compatibility
 */
export interface RoundTripMultiplierResult {
	adjustedPrice: number;
	adjustedInternalCost: number;
	appliedRule: AppliedRoundTripRule | null;
}

// ============================================================================
// Vehicle Category Interfaces
// ============================================================================

export interface VehicleCategoryInfo {
	id: string;
	code: string;
	name: string;
	priceMultiplier: number;
	defaultRatePerKm: number | null;
	defaultRatePerHour: number | null;
	fuelType: FuelType | null;
	regulatoryCategory: RegulatoryCategory | null;
}

export interface ResolvedRates {
	ratePerKm: number;
	ratePerHour: number;
	rateSource: RateSource;
	usedCategoryRates: boolean;
}

export interface AppliedVehicleCategoryMultiplierRule extends AppliedRule {
	type: "VEHICLE_CATEGORY_MULTIPLIER";
	categoryId: string;
	categoryCode: string;
	categoryName: string;
	multiplier: number;
	priceBefore: number;
	priceAfter: number;
	skippedReason?: "CATEGORY_RATES_USED";
}

export interface VehicleCategoryMultiplierResult {
	adjustedPrice: number;
	appliedRule: AppliedVehicleCategoryMultiplierRule | null;
}

// ============================================================================
// Trip Type Pricing Interfaces
// ============================================================================

export interface AppliedTripTypeRule extends AppliedRule {
	type: "TRIP_TYPE" | "TIME_BUCKET";
	tripType: TripType;
	description: string;
	minimumApplied?: boolean;
	requestedHours?: number;
	effectiveHours?: number;
	surchargePercent?: number;
	surchargeAmount?: number;
	includedKm?: number;
	actualKm?: number;
	overageKm?: number;
	overageRatePerKm?: number;
	overageAmount?: number;
	requestedDurationHours?: number;
	usedFallbackDuration?: boolean;
	timeBucketUsed?: { durationHours: number; price: number };
	interpolationStrategy?: TimeBucketInterpolationStrategy;
	lowerBucket?: { durationHours: number; price: number };
	upperBucket?: { durationHours: number; price: number };
	bucketPrice?: number;
	extraHoursCharged?: number;
	extraHoursAmount?: number;
	basePriceBeforeAdjustment: number;
	priceAfterAdjustment: number;
}

export interface TripTypePricingResult {
	price: number;
	rule: AppliedTripTypeRule | null;
}

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
// Excursion Return Trip Interfaces
// ============================================================================

export interface AppliedExcursionReturnTripRule extends AppliedRule {
	type: "EXCURSION_RETURN_TRIP";
	description: string;
	returnDistanceKm: number;
	returnDurationMinutes: number;
	returnCost: number;
	returnSource: ExcursionReturnSource;
	costBreakdown: {
		fuel: number;
		driver: number;
		tolls?: number;
	};
	addedToPrice: number;
}

export interface ExcursionReturnCostResult {
	returnDistanceKm: number;
	returnDurationMinutes: number;
	returnCost: number;
	returnSource: ExcursionReturnSource;
	appliedRule: AppliedExcursionReturnTripRule;
}

// ============================================================================
// Client Difficulty Interfaces
// ============================================================================

// Story 24.8: Score source tracking for difficulty multiplier
export type DifficultyScoreSource = "END_CUSTOMER" | "CONTACT" | "NONE";

// Story 24.8: Resolved difficulty score with source tracking
export interface ResolvedDifficultyScore {
	score: number | null;
	source: DifficultyScoreSource;
	endCustomerId?: string;
}

export interface AppliedClientDifficultyRule extends AppliedRule {
	type: "CLIENT_DIFFICULTY_MULTIPLIER";
	description: string;
	difficultyScore: number;
	multiplier: number;
	priceBefore: number;
	priceAfter: number;
	// Story 24.8: Score source tracking
	scoreSource?: DifficultyScoreSource;
	endCustomerId?: string;
}

export interface ClientDifficultyMultiplierResult {
	adjustedPrice: number;
	appliedRule: AppliedClientDifficultyRule | null;
}

// ============================================================================
// Override Interfaces
// ============================================================================

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

export interface RecalculateProfitabilityInput {
	newPrice: number;
	internalCost: number;
	previousPrice: number;
	previousAppliedRules: AppliedRule[];
	reason?: string;
	isContractPrice?: boolean;
}

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
// Dynamic Base Calculation Interfaces
// ============================================================================

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
		rateSource: RateSource;
	};
}

// ============================================================================
// Shadow Calculation Interfaces
// ============================================================================

export interface SegmentAnalysis {
	name: "approach" | "service" | "return";
	description: string;
	distanceKm: number;
	durationMinutes: number;
	cost: CostBreakdown;
	isEstimated: boolean;
}

export interface ShadowCalculationInput {
	approachDistanceKm?: number;
	approachDurationMinutes?: number;
	serviceDistanceKm?: number;
	serviceDurationMinutes?: number;
	returnDistanceKm?: number;
	returnDurationMinutes?: number;
	routingSource?: "GOOGLE_API" | "HAVERSINE_ESTIMATE";
	vehicleSelection?: VehicleSelectionInfo;
}

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
// Compliance Plan Interfaces
// ============================================================================

export interface CompliancePlan {
	planType: StaffingPlanType;
	isRequired: boolean;
	additionalCost: number;
	costBreakdown: {
		extraDriverCost: number;
		hotelCost: number;
		mealAllowance: number;
		otherCosts: number;
	};
	adjustedSchedule: {
		daysRequired: number;
		driversRequired: number;
		hotelNightsRequired: number;
	};
	originalViolations: Array<{
		type: string;
		message: string;
		actual: number;
		limit: number;
	}>;
	selectedReason: string;
}

export interface ComplianceIntegrationInput {
	organizationId: string;
	vehicleCategoryId: string;
	regulatoryCategory: RegulatoryCategory;
	licenseCategoryId?: string;
	tripAnalysis: TripAnalysis;
	pickupAt: Date;
	estimatedDropoffAt?: Date;
	rules?: unknown;
	costParameters?: AlternativeCostParameters;
	staffingSelectionPolicy?: StaffingSelectionPolicy;
}

export interface ComplianceIntegrationResult {
	tripAnalysis: TripAnalysis;
	additionalStaffingCost: number;
	appliedRule: AppliedRule | null;
}

// ============================================================================
// Fuel Price Source Interfaces
// ============================================================================

export interface FuelPriceSourceInfo {
	pricePerLitre: number;
	currency: "EUR";
	source: "REALTIME" | "CACHE" | "DEFAULT";
	fetchedAt: string | null;
	isStale: boolean;
	fuelType: string;
	countryCode: string;
	countriesOnRoute?: string[];
	routePrices?: Array<{
		point: "pickup" | "dropoff" | "stop";
		country: string;
		pricePerLitre: number;
	}>;
}

// ============================================================================
// Excursion Interfaces
// ============================================================================

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

export interface ExcursionStop {
	address: string;
	latitude: number;
	longitude: number;
	order: number;
}

export interface ExcursionCalculationInput {
	pickup: { lat: number; lng: number; address?: string };
	dropoff: { lat: number; lng: number; address?: string };
	stops: ExcursionStop[];
	returnDate?: string;
	pickupAt?: string;
}

// ============================================================================
// Zone Segment Interfaces
// ============================================================================

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
// Dense Zone Detection Interfaces
// ============================================================================

export interface DenseZoneDetection {
	isIntraDenseZone: boolean;
	pickupZoneCode: string | null;
	dropoffZoneCode: string | null;
	denseZoneCodes: string[];
	commercialSpeedKmh: number | null;
	speedThreshold: number;
	isBelowThreshold: boolean;
}

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
// Round Trip Detection Interfaces
// ============================================================================

export interface RoundTripDetection {
	isRoundTripBlocked: boolean;
	isDriverBlocked: boolean;
	waitingTimeMinutes: number;
	minWaitingTimeForSeparateTransfers: number;
	maxReturnDistanceKm: number;
	returnDistanceKm: number;
	returnToBaseMinutes: number;
	exceedsMaxReturnDistance: boolean;
	reason: string;
}

export interface RoundTripMadSuggestion {
	type: "CONSIDER_MAD_FOR_ROUND_TRIP";
	twoTransfersPrice: number;
	madPrice: number;
	priceDifference: number;
	percentageGain: number;
	recommendation: string;
	autoSwitched: boolean;
}

// ============================================================================
// Loss of Exploitation Interfaces
// ============================================================================

export interface LossOfExploitationResult {
	isApplicable: boolean;
	daysImmobilized: number;
	dailyReferenceRevenue: number;
	seasonalityCoefficient: number;
	lossAmount: number;
	reason: string;
}

// ============================================================================
// Stay vs Return Comparison Interfaces
// ============================================================================

export interface StayVsReturnComparison {
	stayOnSiteCost: {
		hotelCost: number;
		mealCost: number;
		opportunityCost: number;
		total: number;
	};
	returnEmptyCost: {
		fuelCost: number;
		driverCost: number;
		tollCost: number;
		total: number;
	};
	recommendation: "STAY" | "RETURN";
	savings: number;
}

// ============================================================================
// Route Scenarios Interfaces
// ============================================================================

export interface RouteScenarios {
	minTime: {
		distanceKm: number;
		durationMinutes: number;
		tollCost: number;
		fuelCost: number;
		totalCost: number;
	};
	minDistance: {
		distanceKm: number;
		durationMinutes: number;
		tollCost: number;
		fuelCost: number;
		totalCost: number;
	};
	minTco: {
		distanceKm: number;
		durationMinutes: number;
		tollCost: number;
		fuelCost: number;
		totalCost: number;
	};
	selectedScenario: "MIN_TIME" | "MIN_DISTANCE" | "MIN_TCO";
	selectionReason: string;
}

// ============================================================================
// Temporal Vector Interfaces
// ============================================================================

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

// ============================================================================
// Hierarchical Pricing Interfaces
// ============================================================================

export interface SkippedLevel {
	level: HierarchicalPricingLevel;
	levelName: HierarchicalPricingLevelName;
	reason: SkippedLevelReason;
	details?: string;
}

export interface HierarchicalPricingConfig {
	enabled: boolean;
	skipLevel1?: boolean;
	skipLevel2?: boolean;
	skipLevel3?: boolean;
	centralZoneCodes?: string[];
}

export interface IntraCentralFlatRateData {
	id: string;
	vehicleCategoryId: string;
	flatRate: number;
	description: string | null;
	isActive: boolean;
}

export interface HierarchicalPricingResult {
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

export interface ZoneDataWithCentralFlag extends ZoneData {
	isCentralZone?: boolean;
}

// ============================================================================
// TCO Interfaces
// ============================================================================

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

export interface VehicleCategoryWithTco {
	defaultPurchasePrice?: number | null;
	defaultExpectedLifespanKm?: number | null;
	defaultExpectedLifespanYears?: number | null;
	defaultAnnualMaintenanceBudget?: number | null;
	defaultAnnualInsuranceCost?: number | null;
	defaultDepreciationMethod?: "LINEAR" | "DECLINING_BALANCE" | null;
}

// ============================================================================
// Toll Config Interface
// ============================================================================

export interface TollConfig {
	origin: GeoPoint;
	destination: GeoPoint;
	apiKey?: string;
}

// ============================================================================
// Fuel Consumption Resolution Interface
// ============================================================================

export interface FuelConsumptionResolution {
	consumptionL100km: number;
	source: FuelConsumptionSource;
}

// ============================================================================
// Weighted Night Rate Interface
// ============================================================================

export interface WeightedNightRateResult {
	adjustedPrice: number;
	nightMinutes: number;
	totalMinutes: number;
	nightPercentage: number;
	baseAdjustment: number;
	effectiveAdjustment: number;
}

// ============================================================================
// Time Analysis Interface (Story 21.3)
// ============================================================================

export interface TimeAnalysisBaseTime {
	durationMinutes: number;
	source: "GOOGLE_API" | "ESTIMATE";
	fetchedAt?: string;
}

export interface TimeAnalysisVehicleAdjustment {
	percentage: number;
	additionalMinutes: number;
	reason: string;
	vehicleCategoryName: string;
}

export interface TimeAnalysisTrafficAdjustment {
	percentage: number;
	additionalMinutes: number;
	reason: string;
	appliedRule: string;
}

export interface TimeAnalysisMandatoryBreaks {
	breakCount: number;
	breakDurationMinutes: number;
	totalBreakMinutes: number;
	regulationReference: string;
	isHeavyVehicle: boolean;
}

export interface TimeAnalysis {
	baseGoogleTime: TimeAnalysisBaseTime;
	vehicleAdjustment: TimeAnalysisVehicleAdjustment | null;
	trafficAdjustment: TimeAnalysisTrafficAdjustment | null;
	mandatoryBreaks: TimeAnalysisMandatoryBreaks | null;
	totalDurationMinutes: number;
	differenceFromGoogle: number;
}

// ============================================================================
// Story 21.6: Positioning Costs Interfaces
// ============================================================================

export interface PositioningCostItem {
	required: boolean;
	distanceKm: number;
	durationMinutes: number;
	cost: number;
	reason: string;
}

export interface AvailabilityFeeItem {
	required: boolean;
	waitingHours: number;
	ratePerHour: number;
	cost: number;
	reason: string;
}

export interface PositioningCosts {
	approachFee: PositioningCostItem;
	emptyReturn: PositioningCostItem;
	availabilityFee: AvailabilityFeeItem | null;
	totalPositioningCost: number;
}

// ============================================================================
// Story 21.8: Zone Transparency Interfaces
// ============================================================================

export interface ZoneCandidateInfo {
	id: string;
	code: string;
	name: string;
	type: "POLYGON" | "RADIUS" | "POINT" | "CORRIDOR";
	multiplier: number;
	priority?: number;
	rejected?: boolean;
	rejectionReason?: string;
}

export interface ZoneDetectionInfo {
	selectedZone: {
		id: string;
		code: string;
		name: string;
		type: "POLYGON" | "RADIUS" | "POINT" | "CORRIDOR";
	} | null;
	candidateZones: ZoneCandidateInfo[];
	detectionCoordinates: { lat: number; lng: number };
	detectionMethod: "RADIUS" | "POLYGON" | "CORRIDOR" | "POINT" | "NONE";
}

export interface ZoneConflictResolutionInfo {
	strategy: ZoneConflictStrategy | null;
	pickupConflictResolved: boolean;
	dropoffConflictResolved: boolean;
	pickupCandidateCount: number;
	dropoffCandidateCount: number;
}

export interface ZoneMultiplierApplicationInfo {
	pickupMultiplier: number;
	dropoffMultiplier: number;
	aggregationStrategy: ZoneMultiplierAggregationStrategy;
	effectiveMultiplier: number;
	source: "pickup" | "dropoff" | "both";
	priceBefore: number;
	priceAfter: number;
}

export interface ZoneSurchargeInfo {
	zoneId: string;
	zoneCode: string;
	zoneName: string;
	parkingSurcharge: number;
	accessFee: number;
	description: string | null;
}

export interface ZoneSurchargesInfo {
	pickup: ZoneSurchargeInfo | null;
	dropoff: ZoneSurchargeInfo | null;
	total: number;
}

export interface ZoneTransparencyInfo {
	pickup: ZoneDetectionInfo;
	dropoff: ZoneDetectionInfo;
	conflictResolution: ZoneConflictResolutionInfo;
	multiplierApplication: ZoneMultiplierApplicationInfo;
	surcharges: ZoneSurchargesInfo;
}

// ============================================================================
// Trip Analysis Interface (Main)
// ============================================================================

export interface TripAnalysis {
	costBreakdown: CostBreakdown;
	vehicleSelection?: VehicleSelectionInfo;
	segments: {
		approach: SegmentAnalysis | null;
		service: SegmentAnalysis;
		return: SegmentAnalysis | null;
		/** Story 22.1: Round trip return leg segments */
		returnApproach?: SegmentAnalysis | null;
		returnService?: SegmentAnalysis | null;
		finalReturn?: SegmentAnalysis | null;
	};
	/** Story 22.1: Flag indicating this is a round trip */
	isRoundTrip?: boolean;
	/** Story 22.1: Round trip calculation mode */
	roundTripMode?: RoundTripMode;
	excursionLegs?: ExcursionLeg[];
	isMultiDay?: boolean;
	totalStops?: number;
	totalDistanceKm: number;
	totalDurationMinutes: number;
	totalInternalCost: number;
	calculatedAt: string;
	routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE" | "VEHICLE_SELECTION";
	fuelPriceSource?: FuelPriceSourceInfo;
	tollSource?: "GOOGLE_API" | "ESTIMATE";
	fuelConsumptionSource?: FuelConsumptionSource;
	fuelConsumptionL100km?: number;
	// Story 21.9: Encoded polyline for route display
	encodedPolyline?: string | null;
	compliancePlan?: CompliancePlan | null;
	zoneSegments?: ZoneSegmentInfo[] | null;
	routeSegmentation?: {
		weightedMultiplier: number;
		totalSurcharges: number;
		zonesTraversed: string[];
		segmentationMethod: "POLYLINE" | "FALLBACK";
	} | null;
	denseZoneDetection?: DenseZoneDetection | null;
	madSuggestion?: MadSuggestion | null;
	roundTripDetection?: RoundTripDetection | null;
	roundTripSuggestion?: RoundTripMadSuggestion | null;
	lossOfExploitation?: LossOfExploitationResult | null;
	stayVsReturnComparison?: StayVsReturnComparison | null;
	routeScenarios?: RouteScenarios | null;
	transversalDecomposition?: unknown;
	temporalVector?: TemporalVectorResult | null;
	timeAnalysis?: TimeAnalysis | null;
	positioningCosts?: PositioningCosts | null;
	zoneTransparency?: ZoneTransparencyInfo | null;
}

// ============================================================================
// Pricing Engine Context Interface
// ============================================================================

export interface PricingEngineContext {
	contact: ContactData;
	zones: ZoneData[];
	pricingSettings: OrganizationPricingSettings;
	advancedRates?: AdvancedRateData[];
	seasonalMultipliers?: SeasonalMultiplierData[];
	vehicleCategory?: VehicleCategoryInfo;
	// Story 21.6: Vehicle selection result for accurate positioning costs
	vehicleSelectionInput?: ShadowCalculationInput;
	// Story 24.8: Resolved difficulty score
	resolvedDifficultyScore?: ResolvedDifficultyScore;
}

// ============================================================================
// Story 21.9: Validation Types
// ============================================================================

export type ValidationCheckStatus = "PASS" | "WARNING" | "FAIL";
export type ValidationOverallStatus = "VALID" | "WARNING" | "INVALID";
export type ValidationEventType = "INITIAL_CALC" | "RECALCULATE" | "VALIDATION_PASS" | "VALIDATION_FAIL" | "PRICE_OVERRIDE";

export interface ValidationCheck {
	id: string;
	name: string;
	status: ValidationCheckStatus;
	message: string;
	details?: Record<string, unknown>;
}

export interface ValidationResult {
	isValid: boolean;
	overallStatus: ValidationOverallStatus;
	checks: ValidationCheck[];
	timestamp: string;
	warnings: string[];
	errors: string[];
}

export interface AuditLogEntry {
	id: string;
	timestamp: string;
	eventType: ValidationEventType;
	price: number;
	internalCost: number;
	marginPercent: number;
	validationStatus: ValidationOverallStatus;
	warnings: string[];
	errors: string[];
	triggeredBy: "SYSTEM" | "USER";
	userId?: string;
}

// ============================================================================
// STAY Pricing Types (Story 22.5 & 22.7)
// ============================================================================

export type StayServiceType = "TRANSFER" | "DISPO" | "EXCURSION";

export interface StayServiceInput {
	serviceType: StayServiceType;
	pickupAt: string;
	pickupAddress: string;
	pickupLatitude?: number;
	pickupLongitude?: number;
	dropoffAddress?: string;
	dropoffLatitude?: number;
	dropoffLongitude?: number;
	durationHours?: number;
	stops?: Array<{
		address: string;
		latitude: number;
		longitude: number;
		order: number;
	}>;
	distanceKm?: number;
	durationMinutes?: number;
	notes?: string;
}

export interface StayDayInput {
	date: string;
	hotelRequired?: boolean;
	mealCount?: number;
	driverCount?: number;
	notes?: string;
	services: StayServiceInput[];
}

export interface StayPricingInput {
	vehicleCategoryId: string;
	passengerCount: number;
	stayDays: StayDayInput[];
}

export interface StayServicePricingResult {
	serviceOrder: number;
	serviceType: StayServiceType;
	serviceCost: number;
	serviceInternalCost: number;
	distanceKm: number;
	durationMinutes: number;
	tollSource?: string;
	tripAnalysis: {
		costBreakdown: CostBreakdown;
	};
}

export interface StayDayPricingResult {
	dayNumber: number;
	date: string;
	hotelRequired: boolean;
	hotelCost: number;
	mealCount: number;
	mealCost: number;
	driverCount: number;
	driverOvernightCost: number;
	dayTotalCost: number;
	dayTotalInternalCost: number;
	services: StayServicePricingResult[];
}

export interface StayPricingResult {
	stayStartDate: string;
	stayEndDate: string;
	totalDays: number;
	totalServicesCost: number;
	totalStaffingCost: number;
	totalCost: number;
	totalInternalCost: number;
	marginPercent: number;
	vehicleCategoryMultiplier?: number;
	appliedRules: AppliedRule[];
	days: StayDayPricingResult[];
	tripAnalysis: {
		stayBreakdown: {
			totalDays: number;
			totalServices: number;
			totalHotelNights: number;
			totalMeals: number;
			totalDistanceKm: number;
			totalDurationMinutes: number;
		};
		costBreakdown: {
			services: number;
			hotels: number;
			meals: number;
			driverPremiums: number;
			total: number;
		};
		appliedRules: AppliedRule[];
		vehicleCategoryMultiplier?: number;
	};
}

// Enhanced Types (Story 22.7)
export interface EnhancedStayServicePricingResult extends StayServicePricingResult {
	zoneMultiplier?: number;
	seasonalMultiplier?: number;
	categoryMultiplier?: number;
	basePriceBeforeMultipliers?: number;
	appliedRules: AppliedRule[];
}

export interface EnhancedStayDayPricingResult extends StayDayPricingResult {
	seasonalMultiplier?: number;
	services: EnhancedStayServicePricingResult[];
	appliedRules: AppliedRule[];
}

export interface EnhancedStayPricingResult extends StayPricingResult {
	appliedRules: AppliedRule[];
	vehicleCategoryMultiplier?: number;
	days: EnhancedStayDayPricingResult[];
	tripAnalysis: {
		stayBreakdown: {
			totalDays: number;
			totalServices: number;
			totalHotelNights: number;
			totalMeals: number;
			totalDistanceKm: number;
			totalDurationMinutes: number;
		};
		costBreakdown: {
			services: number;
			hotels: number;
			meals: number;
			driverPremiums: number;
			total: number;
		};
		appliedRules: AppliedRule[];
		vehicleCategoryMultiplier?: number;
	};
}

export interface EnhancedStayPricingOptions {
	pickupZones?: Map<string, ZoneData | null>; // serviceId -> zone
	dropoffZones?: Map<string, ZoneData | null>; // serviceId -> zone
	seasonalMultipliers?: SeasonalMultiplierData[];
	advancedRates?: AdvancedRateData[];
	vehicleCategoryMultiplier?: number;
	zoneMultiplierAggregationStrategy?: ZoneMultiplierAggregationStrategy;
}
