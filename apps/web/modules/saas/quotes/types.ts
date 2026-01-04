/**
 * Quote types for the Quotes module
 * Story 6.1: Implement Quotes List with Status & Profitability
 * Story 6.5: Blocking and Non-Blocking Alerts
 * Story 6.7: Types are now also available from @saas/shared/types
 */

export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type TripType = "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID" | "STAY";
export type StayServiceType = "TRANSFER" | "DISPO" | "EXCURSION";
export type ProfitabilityLevel = "green" | "orange" | "red";
export type RegulatoryCategory = "LIGHT" | "HEAVY";

// ============================================================================
// Story 6.5: Compliance Types for Blocking/Non-Blocking Alerts
// ============================================================================

export type ComplianceViolationType =
  | "DRIVING_TIME_EXCEEDED"
  | "AMPLITUDE_EXCEEDED"
  | "BREAK_REQUIRED"
  | "SPEED_LIMIT_EXCEEDED";

export type ComplianceWarningType = "APPROACHING_LIMIT" | "BREAK_RECOMMENDED";

export type ComplianceSeverity = "BLOCKING" | "WARNING";

/**
 * Compliance violation - blocks quote creation/sending
 */
export interface ComplianceViolation {
  type: ComplianceViolationType;
  message: string;
  actual: number;
  limit: number;
  unit: "hours" | "minutes" | "km/h";
  severity: "BLOCKING";
}

/**
 * Compliance warning - informs but doesn't block
 */
export interface ComplianceWarning {
  type: ComplianceWarningType;
  message: string;
  actual: number;
  limit: number;
  percentOfLimit: number;
}

/**
 * Applied compliance rule for transparency
 */
export interface AppliedComplianceRule {
  ruleId: string;
  ruleName: string;
  threshold: number;
  unit: string;
  result: "PASS" | "FAIL" | "WARNING";
  actualValue?: number;
}

/**
 * Adjusted durations after break injection and speed capping
 */
export interface AdjustedDurations {
  totalDrivingMinutes: number;
  totalAmplitudeMinutes: number;
  injectedBreakMinutes: number;
  cappedSpeedApplied: boolean;
  originalDrivingMinutes: number;
  originalAmplitudeMinutes: number;
}

/**
 * Full compliance validation result
 */
export interface ComplianceValidationResult {
  isCompliant: boolean;
  regulatoryCategory: RegulatoryCategory;
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  adjustedDurations: AdjustedDurations;
  rulesApplied: AppliedComplianceRule[];
}

/**
 * Story 19.1: Check if there are any blocking violations that cannot be resolved by staffing
 * 
 * A trip is ONLY blocked if:
 * 1. There are violations AND
 * 2. No staffing plan was selected to resolve them (compliancePlan is null or planType is NONE with violations)
 * 
 * If a staffing plan exists (DOUBLE_CREW, RELAY_DRIVER, MULTI_DAY), the trip is NOT blocked
 * because the system has automatically selected a solution.
 */
export function hasBlockingViolations(
  result: ComplianceValidationResult | null,
  compliancePlan?: CompliancePlan | null
): boolean {
  if (!result) return false;
  
  // No violations = no blocking
  if (result.violations.length === 0) return false;
  
  // Story 19.1: If a staffing plan was selected (not NONE), the violations are resolved
  // The trip should NOT be blocked because we have an automatic solution
  if (compliancePlan && compliancePlan.planType !== "NONE" && compliancePlan.isRequired) {
    return false; // Staffing plan resolves the violations
  }
  
  // Violations exist and no staffing plan to resolve them = blocked
  return true;
}

/**
 * Check if there are any warnings (non-blocking)
 */
export function hasComplianceWarnings(result: ComplianceValidationResult | null): boolean {
  if (!result) return false;
  return result.warnings.length > 0;
}

/**
 * Get compliance status level for UI display
 */
export function getComplianceStatusLevel(
  result: ComplianceValidationResult | null
): "ok" | "warning" | "error" {
  if (!result) return "ok";
  if (result.violations.length > 0) return "error";
  if (result.warnings.length > 0) return "warning";
  return "ok";
}

export interface VehicleCategory {
  id: string;
  name: string;
  code: string;
  regulatoryCategory: "LIGHT" | "HEAVY";
  // Story 6.6: Capacity fields for upsell helpers
  maxPassengers: number;
  maxLuggageVolume: number | null; // in liters
  priceMultiplier: number | string;
}

export interface Contact {
  id: string;
  displayName: string;
  type: "INDIVIDUAL" | "BUSINESS" | "AGENCY";
  isPartner: boolean;
  companyName: string | null;
  email: string | null;
  phone: string | null;
}

/**
 * Story 16.1: Stop structure for excursion trips
 * Story 16.2: Added id for React key and nullable coordinates
 */
export interface QuoteStop {
  id: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  order: number;
}

export interface Quote {
  id: string;
  organizationId: string;
  contactId: string;
  contact: Contact;
  status: QuoteStatus;
  pricingMode: PricingMode;
  tripType: TripType;
  pickupAt: string;
  pickupAddress: string;
  pickupLatitude: string | null;
  pickupLongitude: string | null;
  // Story 16.1: Made optional for DISPO and OFF_GRID
  dropoffAddress: string | null;
  dropoffLatitude: string | null;
  dropoffLongitude: string | null;
  // Story 16.1: Trip type specific fields
  isRoundTrip: boolean;           // For TRANSFER
  stops: QuoteStop[] | null;      // For EXCURSION
  returnDate: string | null;      // For EXCURSION
  durationHours: string | null;   // For DISPO (Decimal as string)
  maxKilometers: string | null;   // For DISPO (Decimal as string)
  passengerCount: number;
  luggageCount: number;
  vehicleCategoryId: string;
  vehicleCategory: VehicleCategory;
  suggestedPrice: string;
  finalPrice: string;
  internalCost: string | null;
  marginPercent: string | null;
  tripAnalysis: TripAnalysis | null;
  appliedRules: Record<string, unknown> | null;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Story 6.3/6.4: Status transition timestamps
  sentAt: string | null;
  viewedAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
  expiredAt: string | null;
  // Story 7.2: Reference to invoice if one was created from this quote
  invoice?: {
    id: string;
    number: string;
    status: string;
  } | null;
  // Story 22.4: Subcontracting fields
  isSubcontracted?: boolean;
  subcontractor?: {
    id: string;
    companyName: string;
    contactName: string | null;
    phone: string | null;
    agreedPrice: number;
    subcontractedAt: string;
  } | null;
}

// ============================================================================
// Story 6.4: Quote Lifecycle & Status Transitions
// ============================================================================

/**
 * Valid status transitions map
 * Each key is a current status, and the value is an array of valid next statuses
 */
export const VALID_TRANSITIONS: Record<QuoteStatus, QuoteStatus[]> = {
  DRAFT: ["SENT", "EXPIRED"],
  SENT: ["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"],
  VIEWED: ["ACCEPTED", "REJECTED", "EXPIRED"],
  ACCEPTED: [], // Terminal state
  REJECTED: [], // Terminal state
  EXPIRED: [],  // Terminal state
};

/**
 * Check if a transition from one status to another is valid
 */
export function canTransition(from: QuoteStatus, to: QuoteStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get list of valid next statuses from current status
 */
export function getValidTransitions(from: QuoteStatus): QuoteStatus[] {
  return VALID_TRANSITIONS[from] ?? [];
}

/**
 * Check if a quote's commercial values should be frozen (non-editable)
 * Commercial values are frozen after the quote leaves DRAFT status
 */
export function isCommerciallyFrozen(status: QuoteStatus): boolean {
  return status !== "DRAFT";
}

/**
 * Check if a quote can be edited (notes, etc.)
 * Only DRAFT quotes are fully editable
 */
export function isEditable(status: QuoteStatus): boolean {
  return status === "DRAFT";
}

/**
 * Story 22.3: Check if notes can be edited on a quote
 * Notes are editable for all statuses except EXPIRED
 * This allows operators to add driver instructions after sending
 */
export function isNotesEditable(status: QuoteStatus): boolean {
  return status !== "EXPIRED";
}

/**
 * Check if a quote can be converted to an invoice
 * Only ACCEPTED quotes can be converted
 */
export function canConvertToInvoice(status: QuoteStatus): boolean {
  return status === "ACCEPTED";
}

/**
 * Status audit log entry
 */
export interface QuoteStatusAuditLog {
  id: string;
  organizationId: string;
  quoteId: string;
  previousStatus: QuoteStatus;
  newStatus: QuoteStatus;
  userId: string | null;
  timestamp: string;
  reason: string | null;
}

export interface QuotesResponse {
  data: Quote[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface QuotesFilters {
  search?: string;
  status?: QuoteStatus;
  clientType?: "PARTNER" | "PRIVATE";
  vehicleCategoryId?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Profitability indicator thresholds
 * Default values from OrganizationPricingSettings
 */
export interface ProfitabilityThresholds {
  greenMarginThreshold: number; // Default 20%
  orangeMarginThreshold: number; // Default 0%
}

/**
 * Calculate profitability level based on margin and thresholds
 */
export function getProfitabilityLevel(
  marginPercent: number | null | undefined,
  thresholds: ProfitabilityThresholds = { greenMarginThreshold: 20, orangeMarginThreshold: 0 }
): ProfitabilityLevel {
  if (marginPercent === null || marginPercent === undefined) {
    return "orange"; // Unknown margin treated as warning
  }
  
  if (marginPercent >= thresholds.greenMarginThreshold) {
    return "green";
  }
  if (marginPercent >= thresholds.orangeMarginThreshold) {
    return "orange";
  }
  return "red";
}

/**
 * Format price in EUR
 */
export function formatPrice(price: string | number | null | undefined): string {
  if (price === null || price === undefined) {
    return "—";
  }
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(numPrice);
}

/**
 * Format margin percentage
 */
export function formatMargin(margin: string | number | null | undefined): string {
  if (margin === null || margin === undefined) {
    return "—";
  }
  const numMargin = typeof margin === "string" ? parseFloat(margin) : margin;
  return `${numMargin.toFixed(1)}%`;
}

/**
 * Format trip summary (pickup → dropoff)
 * Story 16.1: Handle optional dropoff for DISPO and OFF_GRID
 */
export function formatTripSummary(pickupAddress: string, dropoffAddress: string | null): string {
  const pickup = pickupAddress.split(",")[0] || pickupAddress;
  if (!dropoffAddress) {
    return pickup; // For DISPO and OFF_GRID without destination
  }
  const dropoff = dropoffAddress.split(",")[0] || dropoffAddress;
  return `${pickup} → ${dropoff}`;
}

// ============================================================================
// Story 6.2: Create Quote Cockpit Types
// ============================================================================

/**
 * Form data for creating a new quote
 * Story 6.6: Extended with airport helper and optional fees fields
 * Story 16.1: Extended with trip type specific fields
 */
export interface CreateQuoteFormData {
  contactId: string;
  contact: Contact | null;
  tripType: TripType;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  // Story 16.1: Made optional for DISPO and OFF_GRID
  dropoffAddress: string;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  pickupAt: Date | null;
  vehicleCategoryId: string;
  vehicleCategory: VehicleCategory | null;
  passengerCount: number;
  luggageCount: number;
  finalPrice: number;
  notes: string;
  validUntil: Date | null;
  // Story 6.6: Airport helper fields
  flightNumber: string;
  waitingTimeMinutes: number;
  selectedOptionalFeeIds: string[];
  // Story 16.1: Trip type specific fields
  isRoundTrip: boolean;           // For TRANSFER
  stops: QuoteStop[];             // For EXCURSION
  returnDate: Date | null;        // For EXCURSION
  durationHours: number | null;   // For DISPO
  maxKilometers: number | null;   // For DISPO (calculated: durationHours × 50)
  // Story 22.6: STAY trip type fields
  stayDays: CreateStayDayInput[]; // For STAY
}

/**
 * Initial form data for create quote
 * Story 16.1: Extended with trip type specific field defaults
 */
export const initialCreateQuoteFormData: CreateQuoteFormData = {
  contactId: "",
  contact: null,
  tripType: "TRANSFER",
  pickupAddress: "",
  pickupLatitude: null,
  pickupLongitude: null,
  dropoffAddress: "",
  dropoffLatitude: null,
  dropoffLongitude: null,
  pickupAt: null,
  vehicleCategoryId: "",
  vehicleCategory: null,
  passengerCount: 1,
  luggageCount: 0,
  finalPrice: 0,
  notes: "",
  validUntil: null,
  // Story 6.6: Airport helper defaults
  flightNumber: "",
  waitingTimeMinutes: 45, // Default 45 minutes for airport transfers
  selectedOptionalFeeIds: [],
  // Story 16.1: Trip type specific field defaults
  isRoundTrip: false,           // For TRANSFER
  stops: [],                    // For EXCURSION
  returnDate: null,             // For EXCURSION
  durationHours: null,          // For DISPO
  maxKilometers: null,          // For DISPO (calculated: durationHours × 50)
  // Story 22.6: STAY trip type defaults
  stayDays: [],                 // For STAY
};

/**
 * Segment analysis from shadow calculation
 */
export interface SegmentAnalysis {
  name: "approach" | "service" | "return";
  description: string;
  distanceKm: number;
  durationMinutes: number;
  cost: CostBreakdown;
  isEstimated: boolean;
}

/**
 * Cost breakdown per component
 */
export interface CostBreakdown {
  fuel: { amount: number; distanceKm: number; consumptionL100km: number; pricePerLiter: number };
  tolls: { amount: number; distanceKm: number; ratePerKm: number };
  wear: { amount: number; distanceKm: number; ratePerKm: number };
  driver: { amount: number; durationMinutes: number; hourlyRate: number };
  parking: { amount: number; description: string };
  total: number;
}

// ============================================================================
// Story 6.8: Cost Override Types for Manual Editing
// ============================================================================

/**
 * Individual cost override entry with audit trail
 */
export interface CostOverride {
  componentName: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking';
  originalValue: number;
  editedValue: number;
  editedBy: string; // User ID
  editedAt: string; // ISO timestamp
  reason?: string;
}

/**
 * Collection of cost overrides with metadata
 */
export interface CostOverrides {
  overrides: CostOverride[];
  hasManualEdits: boolean;
  lastEditedAt: string | null;
  lastEditedBy: string | null;
}

/**
 * Effective costs after applying overrides
 */
export interface EffectiveCosts {
  fuel: number;
  tolls: number;
  wear: number;
  driver: number;
  parking: number;
  total: number;
}

/**
 * Story 16.7: Excursion leg for multi-stop excursions
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

/**
 * Story 19.1: Staffing plan type for RSE compliance
 */
export type StaffingPlanType = "NONE" | "DOUBLE_CREW" | "RELAY_DRIVER" | "MULTI_DAY";

/**
 * Story 19.1: Compliance plan from automatic staffing selection
 * Stored in tripAnalysis.compliancePlan
 */
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

/**
 * Story 20.5: Fuel price source information for transparency
 */
export type FuelPriceSource = "REALTIME" | "CACHE" | "DEFAULT";

export interface FuelPriceSourceInfo {
  pricePerLitre: number;
  currency: "EUR";
  source: FuelPriceSource;
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
// Story 21.3: Time Analysis Types
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
// Story 21.6: Positioning Costs Types
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
// Story 21.8: Zone Transparency Types
// ============================================================================

/**
 * Zone candidate info from pricing engine
 */
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

/**
 * Zone detection info for pickup or dropoff
 */
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

/**
 * Zone conflict resolution strategy
 */
export type ZoneConflictStrategy = "PRIORITY" | "MOST_EXPENSIVE" | "CLOSEST" | "COMBINED";

/**
 * Zone multiplier aggregation strategy
 */
export type ZoneMultiplierAggregationStrategy = "MAX" | "PICKUP_ONLY" | "DROPOFF_ONLY" | "AVERAGE";

/**
 * Zone conflict resolution info
 */
export interface ZoneConflictResolutionInfo {
  strategy: ZoneConflictStrategy | null;
  pickupConflictResolved: boolean;
  dropoffConflictResolved: boolean;
  pickupCandidateCount: number;
  dropoffCandidateCount: number;
}

/**
 * Zone multiplier application info
 */
export interface ZoneMultiplierApplicationInfo {
  pickupMultiplier: number;
  dropoffMultiplier: number;
  aggregationStrategy: ZoneMultiplierAggregationStrategy;
  effectiveMultiplier: number;
  source: "pickup" | "dropoff" | "both";
  priceBefore: number;
  priceAfter: number;
}

/**
 * Zone surcharge info
 */
export interface ZoneSurchargeInfo {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  parkingSurcharge: number;
  accessFee: number;
  description: string | null;
}

/**
 * Zone surcharges summary
 */
export interface ZoneSurchargesInfo {
  pickup: ZoneSurchargeInfo | null;
  dropoff: ZoneSurchargeInfo | null;
  total: number;
}

/**
 * Complete zone transparency info
 */
export interface ZoneTransparencyInfo {
  pickup: ZoneDetectionInfo;
  dropoff: ZoneDetectionInfo;
  conflictResolution: ZoneConflictResolutionInfo;
  multiplierApplication: ZoneMultiplierApplicationInfo;
  surcharges: ZoneSurchargesInfo;
}

// ============================================================================
// Story 21.4: Zone Segment Types for Pricing Transparency
// ============================================================================

/**
 * Zone segment info from route segmentation
 * Represents a segment of the route within a single pricing zone
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

/**
 * Route segmentation summary
 * Contains aggregated data about zones traversed
 */
export interface RouteSegmentation {
  weightedMultiplier: number;
  totalSurcharges: number;
  zonesTraversed: string[];
  segmentationMethod: "POLYLINE" | "FALLBACK";
}

/**
 * Trip analysis from shadow calculation
 */
export interface TripAnalysis {
  costBreakdown: CostBreakdown;
  // Story 6.8: Cost overrides for manual editing
  costOverrides?: CostOverrides;
  effectiveCosts?: EffectiveCosts;
  vehicleSelection?: {
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
    selectionCriterion: string;
    fallbackUsed: boolean;
    fallbackReason?: string;
  };
  segments: {
    approach: SegmentAnalysis | null;
    service: SegmentAnalysis;
    return: SegmentAnalysis | null;
    // Story 22.1: Round trip return leg segments
    returnApproach?: SegmentAnalysis | null;
    returnService?: SegmentAnalysis | null;
    finalReturn?: SegmentAnalysis | null;
  };
  // Story 22.1: Round trip flags
  isRoundTrip?: boolean;
  roundTripMode?: "WAIT_ON_SITE" | "RETURN_BETWEEN_LEGS";
  // Story 16.7: Excursion legs for multi-stop excursions
  excursionLegs?: ExcursionLeg[];
  isMultiDay?: boolean;
  totalStops?: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalInternalCost: number;
  calculatedAt: string;
  routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE" | "VEHICLE_SELECTION";
  // Story 20.3: Toll source indicator
  tollSource?: "GOOGLE_API" | "ESTIMATE";
  // Story 20.5: Fuel price source information for transparency
  fuelPriceSource?: FuelPriceSourceInfo;
  // Story 21.9: Encoded polyline for route display
  encodedPolyline?: string | null;
  // Story 19.1: Compliance-driven staffing plan
  compliancePlan?: CompliancePlan | null;
  // Story 21.3: Time analysis breakdown
  timeAnalysis?: TimeAnalysis | null;
  // Story 21.4: Zone segments and route segmentation for pricing transparency
  zoneSegments?: ZoneSegmentInfo[] | null;
  routeSegmentation?: RouteSegmentation | null;
  // Story 21.6: Positioning costs
  positioningCosts?: PositioningCosts | null;
  // Story 21.8: Zone transparency info
  zoneTransparency?: ZoneTransparencyInfo | null;
}

/**
 * Pricing calculation result
 * Story 6.5: Extended with compliance validation results
 */
/**
 * Story 7.4: Commission data for partner quotes
 */
export interface CommissionData {
  commissionPercent: number;
  commissionAmount: number;
  effectiveMargin: number;
  effectiveMarginPercent: number;
  netAmountAfterCommission: number;
}

export interface PricingResult {
  pricingMode: PricingMode;
  price: number;
  currency: string;
  internalCost: number;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityLevel;
  matchedGrid: {
    type: string;
    id: string;
    name: string;
    fromZone?: string;
    toZone?: string;
  } | null;
  appliedRules: Array<{
    type: string;
    description: string;
    [key: string]: unknown;
  }>;
  isContractPrice: boolean;
  fallbackReason: string | null;
  tripAnalysis: TripAnalysis;
  // Story 6.5: Compliance validation results
  complianceResult: ComplianceValidationResult | null;
  // Story 7.4: Commission data for partner quotes
  commissionData?: CommissionData;
  // Story 21.9: Validation result
  validation?: ValidationResult;
}

/**
 * Address with coordinates
 */
export interface AddressWithCoordinates {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

/**
 * Format duration in minutes to human readable
 */
export function formatDuration(minutes: number | null | undefined): string {
  if (minutes === null || minutes === undefined) {
    return "—";
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  if (hours > 0) {
    return `${hours}h ${mins}min`;
  }
  return `${mins} min`;
}

/**
 * Format distance in km
 */
export function formatDistance(km: number | null | undefined): string {
  if (km === null || km === undefined) {
    return "—";
  }
  return `${km.toFixed(1)} km`;
}

// ============================================================================
// Story 6.8: Cost Override Helpers
// ============================================================================

/**
 * Check if a trip analysis has manual cost overrides
 */
export function hasManualCostOverrides(tripAnalysis: TripAnalysis | null): boolean {
  if (!tripAnalysis?.costOverrides) return false;
  return tripAnalysis.costOverrides.hasManualEdits;
}

/**
 * Get effective cost for a component (overridden or original)
 */
export function getEffectiveCost(
  tripAnalysis: TripAnalysis,
  component: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking'
): number {
  // Check for override first
  const override = tripAnalysis.costOverrides?.overrides.find(
    o => o.componentName === component
  );
  if (override) {
    return override.editedValue;
  }
  
  // Return original value (with null safety)
  if (!tripAnalysis.costBreakdown || !tripAnalysis.costBreakdown[component]) {
    return 0;
  }
  return tripAnalysis.costBreakdown[component].amount;
}

/**
 * Get the original cost for a component
 */
export function getOriginalCost(
  tripAnalysis: TripAnalysis,
  component: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking'
): number {
  // Null safety check
  if (!tripAnalysis.costBreakdown || !tripAnalysis.costBreakdown[component]) {
    return 0;
  }
  return tripAnalysis.costBreakdown[component].amount;
}

/**
 * Check if a specific cost component has been overridden
 */
export function isCostOverridden(
  tripAnalysis: TripAnalysis | null,
  component: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking'
): boolean {
  if (!tripAnalysis?.costOverrides) return false;
  return tripAnalysis.costOverrides.overrides.some(
    o => o.componentName === component
  );
}

/**
 * Recalculate margin and profitability after cost override
 */
export function recalculateMargin(
  price: number,
  effectiveCosts: EffectiveCosts
): { margin: number; marginPercent: number; profitabilityIndicator: ProfitabilityLevel } {
  const margin = price - effectiveCosts.total;
  const marginPercent = price > 0 ? (margin / price) * 100 : 0;
  const profitabilityIndicator = getProfitabilityLevel(marginPercent);
  
  return { margin, marginPercent, profitabilityIndicator };
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

/**
 * Get validation status icon
 */
export function getValidationStatusIcon(status: ValidationCheckStatus): string {
  switch (status) {
    case "PASS":
      return "✅";
    case "WARNING":
      return "⚠️";
    case "FAIL":
      return "❌";
    default:
      return "❓";
  }
}

/**
 * Get overall validation status icon
 */
export function getOverallStatusIcon(status: ValidationOverallStatus): string {
  switch (status) {
    case "VALID":
      return "✅";
    case "WARNING":
      return "⚠️";
    case "INVALID":
      return "❌";
    default:
      return "❓";
  }
}

// ============================================================================
// Story 22.6: STAY Trip Type Types
// ============================================================================

/**
 * StayService - Individual service within a stay day
 */
export interface StayService {
  id: string;
  stayDayId: string;
  serviceOrder: number;
  serviceType: StayServiceType;
  pickupAt: string;
  pickupAddress: string;
  pickupLatitude: string | null;
  pickupLongitude: string | null;
  dropoffAddress: string | null;
  dropoffLatitude: string | null;
  dropoffLongitude: string | null;
  durationHours: string | null;
  stops: QuoteStop[] | null;
  distanceKm: string | null;
  durationMinutes: number | null;
  serviceCost: string;
  serviceInternalCost: string;
  tripAnalysis: Record<string, unknown> | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * StayDay - Individual day within a STAY quote
 */
export interface StayDay {
  id: string;
  quoteId: string;
  dayNumber: number;
  date: string;
  hotelRequired: boolean;
  hotelCost: string;
  mealCount: number;
  mealCost: string;
  driverCount: number;
  driverOvernightCost: string;
  dayTotalCost: string;
  dayTotalInternalCost: string;
  notes: string | null;
  services: StayService[];
  createdAt: string;
  updatedAt: string;
}

/**
 * StayQuote - Quote with STAY trip type
 */
export interface StayQuote extends Quote {
  tripType: "STAY";
  stayStartDate: string | null;
  stayEndDate: string | null;
  stayDays: StayDay[];
}

/**
 * Form input for creating a stay service
 */
export interface CreateStayServiceInput {
  id: string; // Temporary ID for React key
  serviceType: StayServiceType;
  pickupAt: Date | null;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
  dropoffAddress: string;
  dropoffLatitude: number | null;
  dropoffLongitude: number | null;
  durationHours: number | null;
  stops: QuoteStop[];
  notes: string;
}

/**
 * Form input for creating a stay day
 */
export interface CreateStayDayInput {
  id: string; // Temporary ID for React key
  date: Date | null;
  hotelRequired: boolean;
  mealCount: number;
  driverCount: number;
  notes: string;
  services: CreateStayServiceInput[];
}

/**
 * Initial stay service input
 */
export function createInitialStayService(): CreateStayServiceInput {
  return {
    id: crypto.randomUUID(),
    serviceType: "TRANSFER",
    pickupAt: null,
    pickupAddress: "",
    pickupLatitude: null,
    pickupLongitude: null,
    dropoffAddress: "",
    dropoffLatitude: null,
    dropoffLongitude: null,
    durationHours: null,
    stops: [],
    notes: "",
  };
}

/**
 * Initial stay day input
 */
export function createInitialStayDay(): CreateStayDayInput {
  return {
    id: crypto.randomUUID(),
    date: null,
    hotelRequired: false,
    mealCount: 0,
    driverCount: 1,
    notes: "",
    services: [createInitialStayService()],
  };
}
