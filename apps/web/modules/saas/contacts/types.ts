/**
 * Contact types for the CRM module
 */

export interface Contact {
  id: string;
  displayName: string;
  type: "INDIVIDUAL" | "BUSINESS" | "AGENCY";
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  companyName: string | null;
  vatNumber: string | null;
  siret: string | null;
  billingAddress: string | null;
  isPartner: boolean;
  defaultClientType: "PARTNER" | "PRIVATE";
  notes: string | null;
  // Story 17.15: Client difficulty score for Patience Tax (1-5 scale)
  difficultyScore: number | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface EndCustomer {
  id: string;
  contactId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  difficultyScore: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EndCustomerWithCounts extends EndCustomer {
  _count: {
    quotes: number;
  };
}

export interface ContactWithCounts extends Contact {
  _count: {
    quotes: number;
    invoices: number;
  };
  /** Average margin from quotes (Story 2.5) */
  averageMarginPercent?: number | null;
  /** Profitability band based on average margin (Story 2.5) */
  profitabilityBand?: "green" | "orange" | "red" | "unknown";
}

/**
 * Commercial metrics types (Story 2.5)
 */
export type ProfitabilityBand = "green" | "orange" | "red" | "unknown";

export interface TypicalGrids {
  zoneRoutes: Array<{
    id: string;
    fromZone: string;
    toZone: string;
  }>;
  excursionPackages: Array<{
    id: string;
    name: string;
  }>;
  dispoPackages: Array<{
    id: string;
    name: string;
  }>;
}

export interface CommercialMetrics {
  // Quote metrics
  totalQuotes: number;
  totalQuotesValue: number;
  averageMarginPercent: number | null;
  profitabilityBand: ProfitabilityBand;
  
  // Invoice metrics
  totalInvoices: number;
  totalInvoicesValue: number;
  paidInvoicesValue: number;
  
  // Partner-specific
  commissionPercent: number | null;
  
  // Typical grids (partners only)
  typicalGrids: TypicalGrids | null;
}

export interface CommercialMetricsResponse {
  contactId: string;
  metrics: CommercialMetrics;
}

export interface ContactsResponse {
  data: ContactWithCounts[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Partner Contract types
 */
export type PaymentTerms = "IMMEDIATE" | "DAYS_15" | "DAYS_30" | "DAYS_45" | "DAYS_60";

// Story 12.3: Zone route with catalog and override prices
export interface ZoneRouteAssignment {
  id: string;
  fromZone: { id: string; name: string; code: string };
  toZone: { id: string; name: string; code: string };
  vehicleCategory: { id: string; name: string; code: string };
  fixedPrice: string; // Legacy field
  catalogPrice: number;
  overridePrice: number | null;
  effectivePrice: number;
}

// Story 12.3: Package with catalog and override prices
export interface PackageAssignment {
  id: string;
  name: string;
  description: string | null;
  price?: string; // Legacy for excursion
  basePrice?: string; // Legacy for dispo
  catalogPrice: number;
  overridePrice: number | null;
  effectivePrice: number;
}

// Story 12.3: Assignment with override price for form submission
export interface ZoneRouteOverride {
  zoneRouteId: string;
  overridePrice: number | null;
}

export interface ExcursionOverride {
  excursionPackageId: string;
  overridePrice: number | null;
}

export interface DispoOverride {
  dispoPackageId: string;
  overridePrice: number | null;
}

export interface PartnerContract {
  id: string;
  contactId: string;
  billingAddress: string | null;
  paymentTerms: PaymentTerms;
  commissionPercent: string;
  notes: string | null;
  zoneRoutes: ZoneRouteAssignment[];
  excursionPackages: PackageAssignment[];
  dispoPackages: PackageAssignment[];
  createdAt: string;
  updatedAt: string;
}

export interface PartnerContractResponse {
  data: PartnerContract | null;
  isPartner: boolean;
}

export interface PartnerContractFormData {
  billingAddress?: string | null;
  paymentTerms: PaymentTerms;
  commissionPercent: number;
  notes?: string | null;
  // Legacy: simple ID arrays (backward compatible)
  zoneRouteIds: string[];
  excursionPackageIds: string[];
  dispoPackageIds: string[];
  // Story 12.3: New format with override prices
  zoneRouteAssignments?: ZoneRouteOverride[];
  excursionAssignments?: ExcursionOverride[];
  dispoAssignments?: DispoOverride[];
}

/**
 * Timeline types (Story 2.4)
 */
export type TimelineItemType = "QUOTE" | "INVOICE";

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: string;
  status: string;
  amount: number;
  description: string;
  metadata: {
    pickupAt?: string;
    vehicleCategory?: string;
    pricingMode?: string;
    marginPercent?: number | null;
    sentAt?: string | null;
    acceptedAt?: string | null;
    number?: string;
    dueDate?: string;
    totalExclVat?: number;
    quoteId?: string | null;
  };
}

export interface TimelineSummary {
  totalQuotes: number;
  totalInvoices: number;
  quotesValue: number;
  invoicesValue: number;
  acceptedQuotes: number;
  paidInvoices: number;
}

export interface ContactTimelineResponse {
  timeline: TimelineItem[];
  summary: TimelineSummary;
  meta: {
    contactId: string;
    limit: number;
    totalItems: number;
  };
}
