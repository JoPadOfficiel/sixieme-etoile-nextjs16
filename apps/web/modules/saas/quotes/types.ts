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
