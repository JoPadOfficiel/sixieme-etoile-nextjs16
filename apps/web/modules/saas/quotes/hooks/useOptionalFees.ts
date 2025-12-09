"use client";

import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { OptionalFeeWithRules } from "./useScenarioHelpers";

// ============================================================================
// Story 6.6 & 9.3: Optional Fees Hook
// Provides optional fees catalogue from the API
// ============================================================================

interface OptionalFeeAPIResponse {
  id: string;
  name: string;
  description: string | null;
  amountType: "FIXED" | "PERCENTAGE";
  amount: number;
  isTaxable: boolean;
  vatRate: number | null;
  autoApplyRules: Record<string, unknown> | null;
  isActive: boolean;
}

interface OptionalFeesListResponse {
  data: OptionalFeeAPIResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Transform API response to OptionalFeeWithRules format
 */
function transformFee(fee: OptionalFeeAPIResponse): OptionalFeeWithRules {
  return {
    id: fee.id,
    name: fee.name,
    description: fee.description ?? null,
    amountType: fee.amountType,
    amount: fee.amount,
    isTaxable: fee.isTaxable,
    vatRate: fee.vatRate || 20,
    autoApplyRules: fee.autoApplyRules as OptionalFeeWithRules["autoApplyRules"],
  };
}

/**
 * useOptionalFees Hook
 * 
 * Provides the optional fees catalogue for the current organization.
 * Used by scenario helpers to auto-apply fees for airport transfers
 * and by the optional fees selector in quotes/invoices.
 * 
 * @see Story 6.6: Implement Helpers for Common Scenarios
 * @see Story 9.3: Optional Fees Catalogue
 * @see FR56: Optional fees with automated triggers
 */
export function useOptionalFees() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["optional-fees", "active"],
    queryFn: async () => {
      const response = await apiClient.vtc.pricing["optional-fees"].$get({
        query: { limit: "100", status: "active" },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch optional fees");
      }
      return response.json() as Promise<OptionalFeesListResponse>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const fees = (data?.data || []).map(transformFee);

  return {
    fees,
    isLoading,
    error: error ? String(error) : null,
  };
}

export default useOptionalFees;
