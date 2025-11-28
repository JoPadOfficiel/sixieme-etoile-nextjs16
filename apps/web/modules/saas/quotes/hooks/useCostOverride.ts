/**
 * Story 6.8: useCostOverride Hook
 * 
 * Hook for managing cost component overrides on quotes.
 * Handles API calls, optimistic updates, and state management.
 */

"use client";

import { useState, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { 
  CostOverrides, 
  EffectiveCosts, 
  ProfitabilityLevel,
  TripAnalysis,
} from "../types";

// API Response types
interface UpdateCostResponse {
  success: boolean;
  quoteId: string;
  updatedCosts: EffectiveCosts;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityLevel;
  costOverrides: CostOverrides;
}

interface ResetCostsResponse {
  success: boolean;
  quoteId: string;
  updatedCosts: EffectiveCosts;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityLevel;
  costOverrides: CostOverrides;
}

// Input types
interface UpdateCostInput {
  componentName: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking';
  value: number;
  reason?: string;
}

interface ResetCostsInput {
  componentNames?: Array<'fuel' | 'tolls' | 'wear' | 'driver' | 'parking'>;
}

export interface UseCostOverrideOptions {
  quoteId: string;
  onSuccess?: (response: UpdateCostResponse) => void;
  onError?: (error: Error) => void;
}

export interface UseCostOverrideReturn {
  // State
  isUpdating: boolean;
  isResetting: boolean;
  error: Error | null;
  
  // Actions
  updateCost: (input: UpdateCostInput) => Promise<UpdateCostResponse | null>;
  resetCosts: (input?: ResetCostsInput) => Promise<ResetCostsResponse | null>;
  resetAllCosts: () => Promise<ResetCostsResponse | null>;
  
  // Helpers
  clearError: () => void;
}

/**
 * Hook for managing cost overrides on a quote
 */
export function useCostOverride(options: UseCostOverrideOptions): UseCostOverrideReturn {
  const { quoteId, onSuccess, onError } = options;
  const queryClient = useQueryClient();
  const [error, setError] = useState<Error | null>(null);

  // Update cost mutation
  const updateMutation = useMutation({
    mutationFn: async (input: UpdateCostInput): Promise<UpdateCostResponse> => {
      const response = await apiClient.vtc.quotes[":quoteId"].costs.$patch({
        param: { quoteId },
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message || "Failed to update cost"
        );
      }

      return response.json() as Promise<UpdateCostResponse>;
    },
    onSuccess: (data) => {
      setError(null);
      // Invalidate quote queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      onSuccess?.(data);
    },
    onError: (err) => {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      onError?.(error);
    },
  });

  // Reset costs mutation
  const resetMutation = useMutation({
    mutationFn: async (input?: ResetCostsInput): Promise<ResetCostsResponse> => {
      const response = await apiClient.vtc.quotes[":quoteId"].costs.$delete({
        param: { quoteId },
        json: input || {},
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message || "Failed to reset costs"
        );
      }

      return response.json() as Promise<ResetCostsResponse>;
    },
    onSuccess: () => {
      setError(null);
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
    },
    onError: (err) => {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setError(error);
      onError?.(error);
    },
  });

  // Update a single cost component
  const updateCost = useCallback(
    async (input: UpdateCostInput): Promise<UpdateCostResponse | null> => {
      try {
        return await updateMutation.mutateAsync(input);
      } catch {
        return null;
      }
    },
    [updateMutation]
  );

  // Reset specific cost components
  const resetCosts = useCallback(
    async (input?: ResetCostsInput): Promise<ResetCostsResponse | null> => {
      try {
        return await resetMutation.mutateAsync(input);
      } catch {
        return null;
      }
    },
    [resetMutation]
  );

  // Reset all cost overrides
  const resetAllCosts = useCallback(
    async (): Promise<ResetCostsResponse | null> => {
      return resetCosts({});
    },
    [resetCosts]
  );

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isUpdating: updateMutation.isPending,
    isResetting: resetMutation.isPending,
    error,
    updateCost,
    resetCosts,
    resetAllCosts,
    clearError,
  };
}

/**
 * Helper to check if user can edit costs based on role and quote status
 */
export function canEditCosts(
  isOrganizationAdmin: boolean,
  userRole: string | null,
  quoteStatus: string
): boolean {
  // Only admins and owners can edit
  const hasPermission = isOrganizationAdmin || userRole === 'owner';
  
  // Only DRAFT quotes can be edited
  const isEditable = quoteStatus === 'DRAFT';
  
  return hasPermission && isEditable;
}

/**
 * Get effective costs from trip analysis, applying overrides
 */
export function getEffectiveCostsFromAnalysis(
  tripAnalysis: TripAnalysis | null
): EffectiveCosts | null {
  if (!tripAnalysis) return null;
  
  // If we have pre-calculated effective costs, use them
  if (tripAnalysis.effectiveCosts) {
    return tripAnalysis.effectiveCosts;
  }
  
  // Otherwise, calculate from breakdown
  const breakdown = tripAnalysis.costBreakdown;
  return {
    fuel: breakdown.fuel.amount,
    tolls: breakdown.tolls.amount,
    wear: breakdown.wear.amount,
    driver: breakdown.driver.amount,
    parking: breakdown.parking.amount,
    total: breakdown.total,
  };
}
