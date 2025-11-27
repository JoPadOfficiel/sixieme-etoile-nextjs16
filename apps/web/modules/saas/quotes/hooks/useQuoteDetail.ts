"use client";

import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { Quote } from "../types";

/**
 * Hook to fetch quote detail by ID
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
 */
export function useQuoteDetail(quoteId: string) {
  return useQuery({
    queryKey: ["quote", quoteId],
    queryFn: async (): Promise<Quote> => {
      const response = await apiClient.vtc.quotes[":id"].$get({
        param: { id: quoteId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch quote");
      }

      const data = await response.json() as Record<string, unknown>;
      
      // Transform API response to Quote type with optional fields
      // Status transition timestamps may not exist in API response yet
      return {
        ...data,
        sentAt: (data.sentAt as string | null) ?? null,
        viewedAt: (data.viewedAt as string | null) ?? null,
        acceptedAt: (data.acceptedAt as string | null) ?? null,
        rejectedAt: (data.rejectedAt as string | null) ?? null,
      } as Quote;
    },
    enabled: Boolean(quoteId),
  });
}

export default useQuoteDetail;
