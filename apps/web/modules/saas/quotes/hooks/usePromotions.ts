"use client";

import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";

// ============================================================================
// Story 9.4: Promotions Hook
// Provides active promotions from the API
// ============================================================================

export interface Promotion {
  id: string;
  code: string;
  description: string | null;
  discountType: "FIXED" | "PERCENTAGE";
  value: number;
  validFrom: string;
  validTo: string;
  maxTotalUses: number | null;
  maxUsesPerContact: number | null;
  currentUses: number;
  isActive: boolean;
  status: "active" | "expired" | "upcoming" | "inactive";
  vehicleCategoryIds: string[];
}

interface PromotionsListResponse {
  data: Promotion[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * usePromotions Hook
 * 
 * Provides the active promotions for the current organization.
 * Used by the add fee/promotion dialog in quotes and invoices.
 * 
 * @see Story 9.4: Promotions & Promo Codes
 */
export function usePromotions() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["promotions", "active"],
    queryFn: async () => {
      // Route is /vtc/pricing/promotions
      const response = await apiClient.vtc.pricing.promotions.$get({
        query: { limit: "100", status: "active" },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch promotions");
      }
      return response.json() as Promise<PromotionsListResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const promotions = data?.data || [];

  return {
    promotions,
    isLoading,
    error: error ? String(error) : null,
  };
}

export default usePromotions;
