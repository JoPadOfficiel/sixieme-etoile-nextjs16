"use client";

import { apiClient } from "@shared/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CreateQuoteFormData, PricingResult, TripAnalysis, ProfitabilityLevel } from "../types";
import { getProfitabilityLevel } from "../types";

/**
 * Input for pricing calculation API
 */
interface PricingCalculationInput {
  contactId: string;
  pickup: { lat: number; lng: number };
  dropoff: { lat: number; lng: number };
  vehicleCategoryId: string;
  tripType: "transfer" | "excursion" | "dispo";
  pickupAt?: string;
  passengerCount: number;
  luggageCount?: number;
  enableVehicleSelection?: boolean;
}

/**
 * API response from pricing calculation
 */
interface PricingApiResponse {
  pricingMode: "FIXED_GRID" | "DYNAMIC";
  price: number;
  currency: string;
  internalCost: number;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityLevel;
  profitabilityData?: {
    indicator: ProfitabilityLevel;
    marginPercent: number;
    thresholds: {
      greenThreshold: number;
      orangeThreshold: number;
    };
    label: string;
    description: string;
  };
  matchedGrid: {
    type: string;
    id: string;
    name: string;
    fromZone?: string;
    toZone?: string;
  } | null;
  appliedRules: Array<{
    type: string;
    description: string;
    [key: string]: unknown;
  }>;
  isContractPrice: boolean;
  fallbackReason: string | null;
  gridSearchDetails?: Record<string, unknown> | null;
  tripAnalysis: TripAnalysis;
}

/**
 * Hook options
 */
interface UsePricingCalculationOptions {
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Hook return type
 */
interface UsePricingCalculationReturn {
  pricingResult: PricingResult | null;
  isCalculating: boolean;
  error: Error | null;
  calculate: (formData: CreateQuoteFormData) => void;
  reset: () => void;
}

/**
 * usePricingCalculation Hook
 * 
 * Handles debounced pricing calculation API calls.
 * Transforms API response to PricingResult format for UI consumption.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see POST /api/vtc/pricing/calculate
 */
export function usePricingCalculation(
  options: UsePricingCalculationOptions = {}
): UsePricingCalculationReturn {
  const { debounceMs = 500, enabled = true } = options;

  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Pricing calculation mutation
  const mutation = useMutation({
    mutationFn: async (input: PricingCalculationInput): Promise<PricingApiResponse> => {
      const response = await apiClient.vtc.pricing.calculate.$post({
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { message?: string }).message || "Pricing calculation failed");
      }

      return response.json() as Promise<PricingApiResponse>;
    },
    onSuccess: (data) => {
      // Transform API response to PricingResult
      const result: PricingResult = {
        pricingMode: data.pricingMode,
        price: data.price,
        currency: data.currency,
        internalCost: data.internalCost,
        margin: data.margin,
        marginPercent: data.marginPercent,
        profitabilityIndicator: data.profitabilityIndicator || getProfitabilityLevel(data.marginPercent),
        matchedGrid: data.matchedGrid,
        appliedRules: data.appliedRules,
        isContractPrice: data.isContractPrice,
        fallbackReason: data.fallbackReason,
        tripAnalysis: data.tripAnalysis,
      };
      setPricingResult(result);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    },
  });

  // Check if form data has required fields for pricing
  const canCalculate = useCallback((formData: CreateQuoteFormData): boolean => {
    return Boolean(
      formData.contactId &&
      formData.pickupAddress &&
      formData.pickupLatitude !== null &&
      formData.pickupLongitude !== null &&
      formData.dropoffAddress &&
      formData.dropoffLatitude !== null &&
      formData.dropoffLongitude !== null &&
      formData.vehicleCategoryId
    );
  }, []);

  // Map trip type to API format
  const mapTripType = (tripType: string): "transfer" | "excursion" | "dispo" => {
    switch (tripType) {
      case "EXCURSION":
        return "excursion";
      case "DISPO":
        return "dispo";
      case "TRANSFER":
      case "OFF_GRID":
      default:
        return "transfer";
    }
  };

  // Calculate pricing with debounce
  const calculate = useCallback(
    (formData: CreateQuoteFormData) => {
      if (!enabled) return;

      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Check if we can calculate
      if (!canCalculate(formData)) {
        return;
      }

      // Debounce the API call
      debounceTimer.current = setTimeout(() => {
        const input: PricingCalculationInput = {
          contactId: formData.contactId,
          pickup: {
            lat: formData.pickupLatitude!,
            lng: formData.pickupLongitude!,
          },
          dropoff: {
            lat: formData.dropoffLatitude!,
            lng: formData.dropoffLongitude!,
          },
          vehicleCategoryId: formData.vehicleCategoryId,
          tripType: mapTripType(formData.tripType),
          pickupAt: formData.pickupAt?.toISOString(),
          passengerCount: formData.passengerCount,
          luggageCount: formData.luggageCount,
          enableVehicleSelection: true,
        };

        mutation.mutate(input);
      }, debounceMs);
    },
    [enabled, canCalculate, debounceMs, mutation]
  );

  // Reset state
  const reset = useCallback(() => {
    setPricingResult(null);
    setError(null);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    pricingResult,
    isCalculating: mutation.isPending,
    error,
    calculate,
    reset,
  };
}

export default usePricingCalculation;
