/**
 * Shared Pricing Types
 * 
 * Centralized type definitions for pricing, trip analysis, and profitability
 * used across quotes, dispatch, and other modules.
 * 
 * @see Story 6.7: Integrate TripTransparencyPanel & Profitability Indicator Across Screens
 * @see FR21-FR24: Shadow Calculation and Profitability Indicator
 */

// ============================================================================
// Core Enums and Types
// ============================================================================

export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type TripType = "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID";
export type ProfitabilityLevel = "green" | "orange" | "red";
export type RegulatoryCategory = "LIGHT" | "HEAVY";

// ============================================================================
// Cost Breakdown Types
// ============================================================================

/**
 * Fuel cost breakdown
 */
export interface FuelCostBreakdown {
  amount: number;
  distanceKm: number;
  consumptionL100km: number;
  pricePerLiter: number;
}

/**
 * Tolls cost breakdown
 */
export interface TollsCostBreakdown {
  amount: number;
  distanceKm: number;
  ratePerKm: number;
}

/**
 * Vehicle wear cost breakdown
 */
export interface WearCostBreakdown {
  amount: number;
  distanceKm: number;
  ratePerKm: number;
}

/**
 * Driver cost breakdown
 */
export interface DriverCostBreakdown {
  amount: number;
  durationMinutes: number;
  hourlyRate: number;
}

/**
 * Parking cost breakdown
 */
export interface ParkingCostBreakdown {
  amount: number;
  description: string;
}

/**
 * Complete cost breakdown per component
 */
export interface CostBreakdown {
  fuel: FuelCostBreakdown;
  tolls: TollsCostBreakdown;
  wear: WearCostBreakdown;
  driver: DriverCostBreakdown;
  parking: ParkingCostBreakdown;
  total: number;
}

// ============================================================================
// Segment Analysis Types
// ============================================================================

/**
 * Cost details for a single segment
 */
export interface SegmentCost {
  total: number;
  fuel: number;
  tolls: number;
  wear: number;
  driver: number;
}

/**
 * Segment analysis from shadow calculation
 */
export interface SegmentAnalysis {
  name: "approach" | "service" | "return";
  description: string;
  distanceKm: number;
  durationMinutes: number;
  cost: SegmentCost | CostBreakdown;
  isEstimated: boolean;
}

/**
 * Trip segments structure
 */
export interface TripSegments {
  approach: SegmentAnalysis | null;
  service: SegmentAnalysis;
  return: SegmentAnalysis | null;
}

// ============================================================================
// Vehicle Selection Types
// ============================================================================

/**
 * Selected vehicle information
 */
export interface SelectedVehicle {
  vehicleId: string;
  vehicleName: string;
  baseId: string;
  baseName: string;
}

/**
 * Vehicle selection details from multi-base optimization
 */
export interface VehicleSelection {
  selectedVehicle?: SelectedVehicle;
  candidatesConsidered: number;
  candidatesAfterCapacityFilter: number;
  candidatesAfterHaversineFilter: number;
  candidatesWithRouting: number;
  selectionCriterion: string;
  fallbackUsed: boolean;
  fallbackReason?: string;
}

// ============================================================================
// Trip Analysis Types
// ============================================================================

/**
 * Routing source for trip analysis
 */
export type RoutingSource = "GOOGLE_API" | "HAVERSINE_ESTIMATE" | "VEHICLE_SELECTION";

/**
 * Trip analysis from shadow calculation
 * Contains segment breakdown, cost components, and vehicle selection
 * 
 * @see FR21-FR23: Shadow calculation segments A/B/C
 */
export interface TripAnalysis {
  costBreakdown: CostBreakdown;
  vehicleSelection?: VehicleSelection;
  segments: TripSegments;
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalInternalCost: number;
  calculatedAt: string;
  routingSource: RoutingSource;
}

// ============================================================================
// Matched Grid Types
// ============================================================================

/**
 * Matched grid information for Method 1 pricing
 */
export interface MatchedGrid {
  type: string;
  id: string;
  name: string;
  fromZone?: string;
  toZone?: string;
}

// ============================================================================
// Applied Rules Types
// ============================================================================

/**
 * Applied pricing rule
 */
export interface AppliedRule {
  type: string;
  description: string;
  [key: string]: unknown;
}

// ============================================================================
// Compliance Types
// ============================================================================

export type ComplianceViolationType =
  | "DRIVING_TIME_EXCEEDED"
  | "AMPLITUDE_EXCEEDED"
  | "BREAK_REQUIRED"
  | "SPEED_LIMIT_EXCEEDED";

export type ComplianceWarningType = "APPROACHING_LIMIT" | "BREAK_RECOMMENDED";

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

// ============================================================================
// Pricing Result Types
// ============================================================================

/**
 * Complete pricing calculation result
 * Used by TripTransparencyPanel and pricing displays
 * 
 * @see Story 6.5: Extended with compliance validation results
 * @see FR24: Profitability indicator based on selling price vs internal cost
 */
export interface PricingResult {
  pricingMode: PricingMode;
  price: number;
  currency: string;
  internalCost: number;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityLevel;
  matchedGrid: MatchedGrid | null;
  appliedRules: AppliedRule[];
  isContractPrice: boolean;
  fallbackReason: string | null;
  tripAnalysis: TripAnalysis;
  complianceResult: ComplianceValidationResult | null;
}

// ============================================================================
// Profitability Thresholds
// ============================================================================

/**
 * Profitability indicator thresholds
 * Default values from OrganizationPricingSettings
 */
export interface ProfitabilityThresholds {
  /** Threshold for green (profitable) - default 20% */
  greenMarginThreshold: number;
  /** Threshold for orange (low margin) - default 0% */
  orangeMarginThreshold: number;
}

/**
 * Default profitability thresholds
 */
export const DEFAULT_PROFITABILITY_THRESHOLDS: ProfitabilityThresholds = {
  greenMarginThreshold: 20,
  orangeMarginThreshold: 0,
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Calculate profitability level based on margin and thresholds
 * 
 * @param marginPercent - Margin percentage
 * @param thresholds - Profitability thresholds (defaults to 20%/0%)
 * @returns Profitability level: green, orange, or red
 */
export function getProfitabilityLevel(
  marginPercent: number | null | undefined,
  thresholds: ProfitabilityThresholds = DEFAULT_PROFITABILITY_THRESHOLDS
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

// ============================================================================
// Formatting Functions
// ============================================================================

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

/**
 * Format trip summary (pickup → dropoff)
 */
export function formatTripSummary(pickupAddress: string, dropoffAddress: string): string {
  const pickup = pickupAddress.split(",")[0] || pickupAddress;
  const dropoff = dropoffAddress.split(",")[0] || dropoffAddress;
  return `${pickup} → ${dropoff}`;
}
