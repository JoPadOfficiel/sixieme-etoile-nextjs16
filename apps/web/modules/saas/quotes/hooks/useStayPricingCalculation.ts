"use client";

import { apiClient } from "@shared/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { 
  CreateQuoteFormData, 
  PricingResult, 
  ProfitabilityLevel,
} from "../types";
import { getProfitabilityLevel } from "../types";

/**
 * Story 22.12: Input for STAY pricing calculation API
 */
interface StayPricingCalculationInput {
  vehicleCategoryId: string;
  passengerCount: number;
  stayDays: Array<{
    date: string;
    hotelRequired?: boolean;
    mealCount?: number;
    driverCount?: number;
    notes?: string | null;
    services: Array<{
      serviceType: "TRANSFER" | "DISPO" | "EXCURSION";
      pickupAt: string;
      pickupAddress: string;
      pickupLatitude?: number | null;
      pickupLongitude?: number | null;
      dropoffAddress?: string | null;
      dropoffLatitude?: number | null;
      dropoffLongitude?: number | null;
      durationHours?: number | null;
      stops?: Array<{
        address: string;
        latitude: number;
        longitude: number;
        order: number;
      }> | null;
      notes?: string | null;
    }>;
  }>;
}

/**
 * Story 22.12: API response from STAY pricing calculation
 */
interface StayPricingApiResponse {
  pricingMode: "DYNAMIC";
  price: number;
  currency: string;
  internalCost: number;
  margin: number;
  marginPercent: number;
  profitabilityIndicator: ProfitabilityLevel;
  stayStartDate: string;
  stayEndDate: string;
  totalDays: number;
  totalServices: number;
  tripAnalysis: Record<string, unknown>;
  days: Array<{
    date: string;
    dayCost: number;
    dayInternalCost: number;
    hotelCost: number;
    mealCost: number;
    services: Array<{
      serviceType: string;
      serviceCost: number;
      serviceInternalCost: number;
      distanceKm?: number;
      durationMinutes?: number;
    }>;
  }>;
  appliedRules: Array<{
    type: string;
    description: string;
  }>;
}

/**
 * Hook options
 */
interface UseStayPricingCalculationOptions {
  debounceMs?: number;
  enabled?: boolean;
}

/**
 * Hook return type
 */
interface UseStayPricingCalculationReturn {
  pricingResult: PricingResult | null;
  isCalculating: boolean;
  error: Error | null;
  calculate: (formData: CreateQuoteFormData) => void;
  reset: () => void;
}

/**
 * useStayPricingCalculation Hook
 * 
 * Story 22.12: Handles debounced STAY pricing calculation API calls.
 * Transforms API response to PricingResult format for UI consumption.
 * 
 * @see POST /api/vtc/stay-quotes/calculate
 */
export function useStayPricingCalculation(
  options: UseStayPricingCalculationOptions = {}
): UseStayPricingCalculationReturn {
  const { debounceMs = 500, enabled = true } = options;

  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // STAY pricing calculation mutation
  const mutation = useMutation({
    mutationFn: async (input: StayPricingCalculationInput): Promise<StayPricingApiResponse> => {
      const response = await apiClient.vtc["stay-quotes"].calculate.$post({
        json: input,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as { message?: string }).message || "STAY pricing calculation failed");
      }

      return response.json() as Promise<StayPricingApiResponse>;
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
        matchedGrid: null,
        appliedRules: data.appliedRules,
        isContractPrice: false,
        fallbackReason: null,
        tripAnalysis: data.tripAnalysis as unknown as PricingResult["tripAnalysis"],
        complianceResult: null,
      };
      setPricingResult(result);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    },
  });

  // Check if form data has required fields for STAY pricing
  const canCalculate = useCallback((formData: CreateQuoteFormData): boolean => {
    // Must be STAY trip type
    if (formData.tripType !== "STAY") {
      return false;
    }

    // Must have vehicle category
    if (!formData.vehicleCategoryId) {
      return false;
    }

    // Must have at least one day with at least one service
    if (!formData.stayDays || formData.stayDays.length === 0) {
      return false;
    }

    // Check if at least one day has a valid service
    const hasValidService = formData.stayDays.some(day => {
      if (!day.services || day.services.length === 0) {
        return false;
      }
      
      // Check if at least one service has required fields
      return day.services.some(svc => {
        // Must have pickup address
        if (!svc.pickupAddress) {
          return false;
        }
        
        // For TRANSFER, must have dropoff
        if (svc.serviceType === "TRANSFER" && !svc.dropoffAddress) {
          return false;
        }
        
        // For DISPO, must have duration
        if (svc.serviceType === "DISPO" && (!svc.durationHours || svc.durationHours <= 0)) {
          return false;
        }
        
        return true;
      });
    });

    return hasValidService;
  }, []);

  // Calculate pricing with debounce
  const calculate = useCallback(
    (formData: CreateQuoteFormData) => {
      if (!enabled) return;

      // Clear existing timer
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }

      // Only calculate for STAY trip type
      if (formData.tripType !== "STAY") {
        return;
      }

      // Check if we can calculate
      if (!canCalculate(formData)) {
        return;
      }

      // Debounce the API call
      debounceTimer.current = setTimeout(() => {
        const input: StayPricingCalculationInput = {
          vehicleCategoryId: formData.vehicleCategoryId,
          passengerCount: formData.passengerCount,
          stayDays: formData.stayDays.map(day => ({
            date: day.date?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
            hotelRequired: day.hotelRequired,
            mealCount: day.mealCount,
            driverCount: day.driverCount,
            notes: day.notes || null,
            services: day.services
              .filter(svc => svc.pickupAddress) // Only include services with pickup
              .map(svc => ({
                serviceType: svc.serviceType,
                pickupAt: svc.pickupAt?.toISOString() ?? new Date().toISOString(),
                pickupAddress: svc.pickupAddress,
                pickupLatitude: svc.pickupLatitude,
                pickupLongitude: svc.pickupLongitude,
                dropoffAddress: svc.dropoffAddress || null,
                dropoffLatitude: svc.dropoffLatitude,
                dropoffLongitude: svc.dropoffLongitude,
                durationHours: svc.durationHours,
                stops: svc.stops?.length > 0
                  ? svc.stops
                      .filter((s): s is typeof s & { latitude: number; longitude: number } =>
                        s.latitude !== null && s.longitude !== null)
                      .map(s => ({ 
                        latitude: s.latitude, 
                        longitude: s.longitude, 
                        address: s.address, 
                        order: s.order 
                      }))
                  : null,
                notes: svc.notes || null,
              })),
          })).filter(day => day.services.length > 0), // Only include days with services
        };

        // Only call API if we have valid days
        if (input.stayDays.length > 0) {
          mutation.mutate(input);
        }
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

export default useStayPricingCalculation;
