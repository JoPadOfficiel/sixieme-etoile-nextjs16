/**
 * Invoice types for the Invoices module
 * Story 7.1: Implement Invoice & InvoiceLine Models and Invoices UI
 */

export type InvoiceStatus = "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
export type InvoiceLineType = "SERVICE" | "OPTIONAL_FEE" | "PROMOTION_ADJUSTMENT" | "OTHER";

/**
 * Valid status transitions for invoices
 */
export const VALID_INVOICE_TRANSITIONS: Record<InvoiceStatus, InvoiceStatus[]> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["PAID", "CANCELLED"],
  PAID: [], // Terminal state
  CANCELLED: [], // Terminal state
};

/**
 * Check if a transition from one status to another is valid
 */
export function canTransitionInvoice(from: InvoiceStatus, to: InvoiceStatus): boolean {
  return VALID_INVOICE_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get list of valid next statuses from current status
 */
export function getValidInvoiceTransitions(from: InvoiceStatus): InvoiceStatus[] {
  return VALID_INVOICE_TRANSITIONS[from] ?? [];
}

/**
 * Check if an invoice can be deleted (only DRAFT)
 */
export function canDeleteInvoice(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

/**
 * Check if an invoice can be edited (only DRAFT for limited fields)
 */
export function canEditInvoice(status: InvoiceStatus): boolean {
  return status === "DRAFT";
}

export interface Contact {
  id: string;
  displayName: string;
  type: "INDIVIDUAL" | "BUSINESS" | "AGENCY";
  isPartner: boolean;
  companyName: string | null;
  email: string | null;
  phone: string | null;
  vatNumber: string | null;
  billingAddress: string | null;
  partnerContract?: {
    id: string;
    commissionPercent: string;
    paymentTerms: string;
    billingAddress: string | null;
  } | null;
}

export interface SourceQuote {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  pickupAt: string;
}

export interface InvoiceLine {
  id: string;
  invoiceId: string;
  lineType: InvoiceLineType;
  description: string;
  quantity: string;
  unitPriceExclVat: string;
  vatRate: string;
  totalExclVat: string;
  totalVat: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * Invoice for list view (without lines)
 */
export interface InvoiceListItem {
  id: string;
  organizationId: string;
  quoteId: string | null;
  contactId: string;
  contact: Contact;
  quote: SourceQuote | null;
  number: string;
  status: InvoiceStatus;
  issueDate: string;
  dueDate: string;
  totalExclVat: string;
  totalVat: string;
  totalInclVat: string;
  currency: string;
  commissionAmount: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    lines: number;
  };
}

/**
 * Invoice with full details including lines
 */
export interface Invoice extends InvoiceListItem {
  lines: InvoiceLine[];
  documents?: Array<{
    id: string;
    storagePath: string | null;
    url: string | null;
  }>;
}

export interface InvoicesResponse {
  data: InvoiceListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface InvoicesFilters {
  search?: string;
  status?: InvoiceStatus;
  contactId?: string;
  dateFrom?: string;
  dateTo?: string;
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
 * Format VAT rate as percentage
 */
export function formatVatRate(rate: string | number | null | undefined): string {
  if (rate === null || rate === undefined) {
    return "—";
  }
  const numRate = typeof rate === "string" ? parseFloat(rate) : rate;
  return `${numRate.toFixed(0)}%`;
}

/**
 * Format date in French format
 */
export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) {
    return "—";
  }
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

/**
 * Format date with time in French format
 */
export function formatDateTime(dateString: string | null | undefined): string {
  if (!dateString) {
    return "—";
  }
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Paris",
  }).format(date);
}

/**
 * Format trip summary (pickup → dropoff)
 */
export function formatTripSummary(pickupAddress: string, dropoffAddress: string): string {
  const pickup = pickupAddress.split(",")[0] || pickupAddress;
  const dropoff = dropoffAddress.split(",")[0] || dropoffAddress;
  return `${pickup} → ${dropoff}`;
}

/**
 * Get line type label for display
 */
export function getLineTypeLabel(lineType: InvoiceLineType): string {
  const labels: Record<InvoiceLineType, string> = {
    SERVICE: "Service",
    OPTIONAL_FEE: "Frais optionnel",
    PROMOTION_ADJUSTMENT: "Promotion",
    OTHER: "Autre",
  };
  return labels[lineType] || lineType;
}

/**
 * Category breakdown for invoice lines
 * Story 7.3: VAT Breakdown for Transport & Ancillary Services
 */
export interface CategoryBreakdown {
  transport: number;
  ancillary: number;
  adjustments: number;
}

/**
 * Calculate totals from invoice lines
 */
export function calculateLineTotals(lines: InvoiceLine[]): {
  totalExclVat: number;
  totalVat: number;
  totalInclVat: number;
  vatBreakdown: Record<string, { rate: number; base: number; vat: number }>;
  categoryBreakdown: CategoryBreakdown;
} {
  let totalExclVat = 0;
  let totalVat = 0;
  const vatBreakdown: Record<string, { rate: number; base: number; vat: number }> = {};
  const categoryBreakdown: CategoryBreakdown = {
    transport: 0,
    ancillary: 0,
    adjustments: 0,
  };

  for (const line of lines) {
    const lineExclVat = parseFloat(line.totalExclVat);
    const lineVat = parseFloat(line.totalVat);
    const vatRate = parseFloat(line.vatRate);

    totalExclVat += lineExclVat;
    totalVat += lineVat;

    // VAT breakdown by rate
    const rateKey = vatRate.toFixed(0);
    if (!vatBreakdown[rateKey]) {
      vatBreakdown[rateKey] = { rate: vatRate, base: 0, vat: 0 };
    }
    vatBreakdown[rateKey].base += lineExclVat;
    vatBreakdown[rateKey].vat += lineVat;

    // Category breakdown by line type
    switch (line.lineType) {
      case "SERVICE":
        categoryBreakdown.transport += lineExclVat;
        break;
      case "OPTIONAL_FEE":
      case "OTHER":
        categoryBreakdown.ancillary += lineExclVat;
        break;
      case "PROMOTION_ADJUSTMENT":
        categoryBreakdown.adjustments += lineExclVat;
        break;
    }
  }

  return {
    totalExclVat,
    totalVat,
    totalInclVat: totalExclVat + totalVat,
    vatBreakdown,
    categoryBreakdown,
  };
}

/**
 * Check if invoice is overdue
 */
export function isOverdue(invoice: InvoiceListItem | Invoice): boolean {
  if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
    return false;
  }
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
}

/**
 * Get days until due or days overdue
 */
export function getDaysUntilDue(invoice: InvoiceListItem | Invoice): number {
  const dueDate = new Date(invoice.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);
  const diffTime = dueDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}
