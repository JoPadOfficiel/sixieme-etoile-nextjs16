/**
 * Quote types for the Quotes module
 * Story 6.1: Implement Quotes List with Status & Profitability
 */

export type QuoteStatus = "DRAFT" | "SENT" | "VIEWED" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type PricingMode = "FIXED_GRID" | "DYNAMIC";
export type TripType = "TRANSFER" | "EXCURSION" | "DISPO" | "OFF_GRID";
export type ProfitabilityLevel = "green" | "orange" | "red";

export interface VehicleCategory {
  id: string;
  name: string;
  code: string;
  regulatoryCategory: "LIGHT" | "HEAVY";
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
  dropoffAddress: string;
  dropoffLatitude: string | null;
  dropoffLongitude: string | null;
  passengerCount: number;
  luggageCount: number;
  vehicleCategoryId: string;
  vehicleCategory: VehicleCategory;
  suggestedPrice: string;
  finalPrice: string;
  internalCost: string | null;
  marginPercent: string | null;
  tripAnalysis: Record<string, unknown> | null;
  appliedRules: Record<string, unknown> | null;
  validUntil: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
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
 */
export function formatTripSummary(pickupAddress: string, dropoffAddress: string): string {
  const pickup = pickupAddress.split(",")[0] || pickupAddress;
  const dropoff = dropoffAddress.split(",")[0] || dropoffAddress;
  return `${pickup} → ${dropoff}`;
}

// ============================================================================
// Story 6.2: Create Quote Cockpit Types
// ============================================================================

/**
 * Form data for creating a new quote
 */
export interface CreateQuoteFormData {
  contactId: string;
  contact: Contact | null;
  tripType: TripType;
  pickupAddress: string;
  pickupLatitude: number | null;
  pickupLongitude: number | null;
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
}

/**
 * Initial form data for create quote
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

/**
 * Trip analysis from shadow calculation
 */
export interface TripAnalysis {
  costBreakdown: CostBreakdown;
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
  totalDistanceKm: number;
  totalDurationMinutes: number;
  totalInternalCost: number;
  calculatedAt: string;
  routingSource: "GOOGLE_API" | "HAVERSINE_ESTIMATE" | "VEHICLE_SELECTION";
}

/**
 * Pricing calculation result
 */
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
