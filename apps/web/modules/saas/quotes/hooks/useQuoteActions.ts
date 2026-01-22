"use client";

import { apiClient } from "@shared/lib/api-client";
import { useToast } from "@ui/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import type { QuoteStatus } from "../types";

interface UpdateQuoteParams {
  quoteId: string;
  status?: QuoteStatus;
  notes?: string | null;
  validUntil?: string | null;
}

/**
 * Invoice response from API
 * Note: Decimal fields are returned as strings from Prisma
 * @see Story 7.2: Convert Accepted Quote to Invoice
 */
export interface InvoiceResponse {
  id: string;
  number: string;
  status: "DRAFT" | "ISSUED" | "PAID" | "CANCELLED";
  contactId: string;
  quoteId: string | null;
  totalExclVat: string;
  totalVat: string;
  totalInclVat: string;
  commissionAmount: string | null;
  issueDate: string;
  dueDate: string;
  notes: string | null;
}

/**
 * Hook for quote status transition actions
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
 * @see Story 7.2: Convert Accepted Quote to Invoice
 */
export function useQuoteActions() {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, status, notes, validUntil }: UpdateQuoteParams) => {
      const response = await apiClient.vtc.quotes[":id"].$patch({
        param: { id: quoteId },
        json: {
          ...(status && { status }),
          ...(notes !== undefined && { notes }),
          ...(validUntil !== undefined && { validUntil }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to update quote");
      }

      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["quote", variables.quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  /**
   * Story 30.1: Mutation for duplicating a quote
   * Uses POST /quotes/:id/duplicate endpoint
   */
  const duplicateQuoteMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await apiClient.vtc.quotes[":id"].duplicate.$post({
        param: { id: quoteId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { message?: string }).message || "Failed to duplicate quote";
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
  });

  /**
   * Story 7.2: Mutation for converting quote to invoice
   * Uses POST /invoices/from-quote/:quoteId endpoint
   */
  const convertToInvoiceMutation = useMutation({
    mutationFn: async (quoteId: string): Promise<InvoiceResponse> => {
      const response = await apiClient.vtc.invoices["from-quote"][":quoteId"].$post({
        param: { quoteId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { message?: string }).message || "Failed to convert quote to invoice";
        throw new Error(errorMessage);
      }

      return response.json() as Promise<InvoiceResponse>;
    },
    onSuccess: (_, quoteId) => {
      // Invalidate both quotes and invoices caches
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const sendQuote = (quoteId: string) => {
    return updateQuoteMutation.mutateAsync(
      { quoteId, status: "SENT" },
      {
        onSuccess: () => {
          toast({
            title: t("quotes.detail.actions.sendSuccess"),
          });
        },
        onError: () => {
          toast({
            title: t("quotes.detail.actions.sendError"),
            variant: "error",
          });
        },
      }
    );
  };

  const acceptQuote = (quoteId: string) => {
    return updateQuoteMutation.mutateAsync(
      { quoteId, status: "ACCEPTED" },
      {
        onSuccess: () => {
          toast({
            title: t("quotes.detail.actions.acceptSuccess"),
          });
        },
        onError: () => {
          toast({
            title: t("quotes.detail.actions.acceptError"),
            variant: "error",
          });
        },
      }
    );
  };

  const rejectQuote = (quoteId: string) => {
    return updateQuoteMutation.mutateAsync(
      { quoteId, status: "REJECTED" },
      {
        onSuccess: () => {
          toast({
            title: t("quotes.detail.actions.rejectSuccess"),
          });
        },
        onError: () => {
          toast({
            title: t("quotes.detail.actions.rejectError"),
            variant: "error",
          });
        },
      }
    );
  };

  const updateNotes = (quoteId: string, notes: string | null) => {
    return updateQuoteMutation.mutateAsync(
      { quoteId, notes },
      {
        onSuccess: () => {
          toast({
            title: t("quotes.detail.actions.notesUpdated"),
          });
        },
        onError: () => {
          toast({
            title: t("quotes.detail.actions.notesError"),
            variant: "error",
          });
        },
      }
    );
  };

  /**
   * Story 7.2: Convert an accepted quote to an invoice
   * Returns the created invoice for navigation
   */
  const convertToInvoice = async (quoteId: string): Promise<InvoiceResponse> => {
    return convertToInvoiceMutation.mutateAsync(quoteId);
  };

  /**
   * Story 30.1: Cancel a quote
   * Sets status to CANCELLED and locks the UI
   */
  const cancelQuote = async (quoteId: string) => {
    try {
      await updateQuoteMutation.mutateAsync(
        { quoteId, status: "CANCELLED" },
        {
          onSuccess: () => {
            toast({
              title: t("quotes.detail.actions.cancelSuccess"),
            });
          },
          onError: () => {
            toast({
              title: t("quotes.detail.actions.cancelError"),
              variant: "error",
            });
          },
        }
      );
    } catch {
      toast({
        title: t("quotes.detail.actions.cancelError"),
        variant: "error",
      });
    }
  };

  /**
   * Story 30.1: Duplicate a quote
   * Creates a new DRAFT quote with all lines cloned
   * Returns the new quote for navigation
   */
  const duplicateQuote = async (quoteId: string) => {
    try {
      const result = await duplicateQuoteMutation.mutateAsync(quoteId, {
        onSuccess: () => {
          toast({
            title: t("quotes.detail.actions.duplicateSuccess"),
          });
        },
        onError: () => {
          toast({
            title: t("quotes.detail.actions.duplicateError"),
            variant: "error",
          });
        },
      });
      return result;
    } catch (error) {
      toast({
        title: t("quotes.detail.actions.duplicateError"),
        variant: "error",
      });
      throw error;
    }
  };

  return {
    sendQuote,
    acceptQuote,
    rejectQuote,
    updateNotes,
    convertToInvoice,
    cancelQuote,
    duplicateQuote,
    isLoading: updateQuoteMutation.isPending,
    isConverting: convertToInvoiceMutation.isPending,
    isDuplicating: duplicateQuoteMutation.isPending,
  };
}

export default useQuoteActions;
