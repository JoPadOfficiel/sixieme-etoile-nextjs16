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
  createdAt?: string;
  updatedAt?: string;
}

export interface ContactWithCounts extends Contact {
  _count: {
    quotes: number;
    invoices: number;
  };
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

export interface ZoneRouteAssignment {
  id: string;
  fromZone: { id: string; name: string; code: string };
  toZone: { id: string; name: string; code: string };
  vehicleCategory: { id: string; name: string; code: string };
  fixedPrice: string;
}

export interface PackageAssignment {
  id: string;
  name: string;
  description: string | null;
  price?: string;
  basePrice?: string;
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
  zoneRouteIds: string[];
  excursionPackageIds: string[];
  dispoPackageIds: string[];
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
