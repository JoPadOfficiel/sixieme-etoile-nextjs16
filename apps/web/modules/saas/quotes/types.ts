/**
 * Quote types for the Quotes module
 * Story 6.1: Implement Quotes List with Status & Profitability
 * Story 6.5: Blocking and Non-Blocking Alerts
 * Story 6.7: Types are now also available from @saas/shared/types
 */

export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type TripType = "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID";
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
 * Check if there are any blocking violations
 */
export function hasBlockingViolations(result: ComplianceValidationResult | null): boolean {
  if (!result) return false;
  return result.violations.length > 0;
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
  };
  // Story 16.7: Excursion legs for multi-stop excursions
  excursionLegs?: ExcursionLeg[];
  isMultiDay?: boolean;
  totalStops?: number;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalInternalCost: number;
  calculatedAt: string;
  routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE" | "VEHICLE_SELECTION";
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
  
  // Return original value
  return tripAnalysis.costBreakdown[component].amount;
}

/**
 * Get the original cost for a component
 */
export function getOriginalCost(
  tripAnalysis: TripAnalysis,
  component: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking'
): number {
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
