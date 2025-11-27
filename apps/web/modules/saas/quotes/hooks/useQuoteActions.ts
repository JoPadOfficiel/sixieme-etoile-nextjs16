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
 * Hook for quote status transition actions
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
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

  return {
    sendQuote,
    acceptQuote,
    rejectQuote,
    updateNotes,
    isLoading: updateQuoteMutation.isPending,
  };
}

export default useQuoteActions;
