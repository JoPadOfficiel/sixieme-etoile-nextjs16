/**
 * Payment Types (Story 25.6: Multi-Invoice Payment Tracking - Lettrage)
 */

import type { InvoiceStatus } from "@repo/database";

/**
 * Payment allocation result for a single invoice
 */
export interface PaymentAllocation {
  invoiceId: string;
  invoiceNumber: string;
  issueDate: Date;
  previousStatus: InvoiceStatus;
  newStatus: InvoiceStatus;
  previousPaidAmount: number;
  amountApplied: number;
  newPaidAmount: number;
  totalInclVat: number;
  remainingAmount: number;
}

/**
 * Result of bulk payment operation
 */
export interface BulkPaymentResult {
  success: boolean;
  allocations: PaymentAllocation[];
  totalApplied: number;
  overage: number;
  paymentDate: Date;
  paymentReference?: string;
  paymentMethod?: string;
}

/**
 * Unpaid invoice for selection in bulk payment
 */
export interface UnpaidInvoice {
  id: string;
  number: string;
  issueDate: Date;
  dueDate: Date;
  totalInclVat: number;
  paidAmount: number;
  remainingAmount: number;
  status: InvoiceStatus;
  isOverdue: boolean;
}

/**
 * Contact balance information
 */
export interface ContactBalance {
  contactId: string;
  contactName: string;
  totalOutstanding: number;
  invoiceCount: number;
  oldestInvoiceDate: string | null;
  breakdown: {
    issued: number;
    partial: number;
  };
  unpaidInvoices: UnpaidInvoice[];
}

/**
 * Payment method options
 */
export type PaymentMethod = "VIREMENT" | "CHEQUE" | "CB" | "ESPECES";

/**
 * Payment method labels for display
 */
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  VIREMENT: "Virement bancaire",
  CHEQUE: "Chèque",
  CB: "Carte bancaire",
  ESPECES: "Espèces",
};

/**
 * Bulk payment request data
 */
export interface BulkPaymentRequest {
  invoiceIds: string[];
  paymentAmount: number;
  paymentDate?: string;
  paymentReference?: string;
  paymentMethod?: PaymentMethod;
}
