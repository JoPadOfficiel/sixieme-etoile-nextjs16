"use client";

import { apiClient } from "@shared/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import type { 
  CreateQuoteFormData, 
  PricingResult, 
  TripAnalysis, 
  ProfitabilityLevel,
  ComplianceValidationResult,
  RegulatoryCategory,
} from "../types";
import { getProfitabilityLevel } from "../types";

/**
 * Story 16.7: Excursion stop for multi-stop pricing
 */
interface ExcursionStopInput {
  address: string;
  latitude: number;
  longitude: number;
  order: number;
  notes?: string;
}

/**
 * Input for pricing calculation API
 */
interface PricingCalculationInput {
  contactId: string;
  pickup: { lat: number; lng: number };
  // Story 16.8: Dropoff is optional for DISPO trips
  dropoff?: { lat: number; lng: number };
  vehicleCategoryId: string;
  // Story 16.9: Added off_grid for manual pricing trips
  tripType: "transfer" | "excursion" | "dispo" | "off_grid";
  pickupAt?: string;
  passengerCount: number;
  luggageCount?: number;
  enableVehicleSelection?: boolean;
  // Story 16.6: Round trip flag for transfer pricing
  isRoundTrip?: boolean;
  // Story 16.7: Excursion stops for multi-stop pricing
  stops?: ExcursionStopInput[];
  // Story 16.7: Return date for multi-day excursions
  returnDate?: string;
  // Story 16.8: DISPO-specific fields
  durationHours?: number;
  maxKilometers?: number;
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

// Story 19.1: Removed ComplianceValidationInput and ComplianceApiResponse
// Now using compliancePlan from tripAnalysis instead of separate API call

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
 * Story 6.5: Also runs compliance validation for HEAVY vehicles.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see Story 6.5: Blocking and Non-Blocking Alerts
 * @see POST /api/vtc/pricing/calculate
 * @see POST /api/vtc/compliance/validate
 */
export function usePricingCalculation(
  options: UsePricingCalculationOptions = {}
): UsePricingCalculationReturn {
  const { debounceMs = 500, enabled = true } = options;

  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Store vehicle category for compliance check
  const vehicleCategoryRef = useRef<{ id: string; regulatoryCategory: RegulatoryCategory } | null>(null);
  const pickupAtRef = useRef<string | null>(null);

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
    onSuccess: async (data) => {
      // Story 19.1: Use compliancePlan from tripAnalysis instead of separate API call
      // The pricing API now returns compliancePlan with automatic staffing selection
      // This ensures violations are resolved by staffing plans (DOUBLE_CREW, etc.)
      let complianceResult: ComplianceValidationResult | null = null;
      
      // Story 19.1: Build complianceResult from tripAnalysis.compliancePlan
      // If a staffing plan was selected, the violations are resolved
      if (
        vehicleCategoryRef.current?.regulatoryCategory === "HEAVY" &&
        data.tripAnalysis
      ) {
        const compliancePlan = data.tripAnalysis.compliancePlan;
        
        // Build compliance result from the compliancePlan
        // If a staffing plan is required and selected, violations are considered resolved
        complianceResult = {
          isCompliant: !compliancePlan?.isRequired || compliancePlan?.planType !== "NONE",
          regulatoryCategory: "HEAVY",
          violations: compliancePlan?.originalViolations?.map(v => ({
            type: v.type as ComplianceValidationResult["violations"][0]["type"],
            message: v.message,
            actual: v.actual,
            limit: v.limit,
            unit: "hours" as const,
            severity: "BLOCKING" as const,
          })) ?? [],
          warnings: [],
          adjustedDurations: {
            totalDrivingMinutes: data.tripAnalysis.totalDurationMinutes ?? 0,
            totalAmplitudeMinutes: data.tripAnalysis.totalDurationMinutes ?? 0,
            injectedBreakMinutes: 0,
            cappedSpeedApplied: false,
            originalDrivingMinutes: data.tripAnalysis.totalDurationMinutes ?? 0,
            originalAmplitudeMinutes: data.tripAnalysis.totalDurationMinutes ?? 0,
          },
          rulesApplied: [],
        };
      }

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
        complianceResult,
      };
      setPricingResult(result);
      setError(null);
    },
    onError: (err) => {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    },
  });

  // Story 19.1: Removed validateCompliance function - now using compliancePlan from tripAnalysis
  // The pricing API returns compliancePlan with automatic staffing selection

  // Check if form data has required fields for pricing
  // Story 19.4: DISPO trips don't require dropoff - only pickup and durationHours
  const canCalculate = useCallback((formData: CreateQuoteFormData): boolean => {
    const hasBasicFields = Boolean(
      formData.contactId &&
      formData.pickupAddress &&
      formData.pickupLatitude !== null &&
      formData.pickupLongitude !== null &&
      formData.vehicleCategoryId
    );

    // Story 19.4: For DISPO, we need durationHours instead of dropoff
    if (formData.tripType === "DISPO") {
      return hasBasicFields && formData.durationHours !== null && formData.durationHours > 0;
    }

    // For other trip types, dropoff is required
    return hasBasicFields && Boolean(
      formData.dropoffAddress &&
      formData.dropoffLatitude !== null &&
      formData.dropoffLongitude !== null
    );
  }, []);

  // Map trip type to API format
  // Story 16.9: Added off_grid for manual pricing trips
  const mapTripType = (tripType: string): "transfer" | "excursion" | "dispo" | "off_grid" => {
    switch (tripType) {
      case "EXCURSION":
        return "excursion";
      case "DISPO":
        return "dispo";
      // Story 16.9: OFF_GRID is handled separately (no API call)
      case "OFF_GRID":
        return "off_grid";
      case "TRANSFER":
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

      // Story 16.9: Skip pricing calculation for OFF_GRID
      // OFF_GRID trips require manual pricing only
      if (formData.tripType === "OFF_GRID") {
        setPricingResult(null);
        setError(null);
        return;
      }

      // Check if we can calculate
      if (!canCalculate(formData)) {
        return;
      }

      // Debounce the API call
      debounceTimer.current = setTimeout(() => {
        // Story 6.5: Store vehicle category for compliance check
        if (formData.vehicleCategory) {
          vehicleCategoryRef.current = {
            id: formData.vehicleCategoryId,
            regulatoryCategory: formData.vehicleCategory.regulatoryCategory,
          };
        }
        pickupAtRef.current = formData.pickupAt?.toISOString() ?? null;

        const input: PricingCalculationInput = {
          contactId: formData.contactId,
          pickup: {
            lat: formData.pickupLatitude!,
            lng: formData.pickupLongitude!,
          },
          // Story 16.8: Dropoff is optional for DISPO
          dropoff: formData.dropoffLatitude && formData.dropoffLongitude ? {
            lat: formData.dropoffLatitude,
            lng: formData.dropoffLongitude,
          } : undefined,
          vehicleCategoryId: formData.vehicleCategoryId,
          tripType: mapTripType(formData.tripType),
          pickupAt: formData.pickupAt?.toISOString(),
          passengerCount: formData.passengerCount,
          luggageCount: formData.luggageCount,
          enableVehicleSelection: true,
          // Story 16.6: Pass round trip flag for transfer pricing
          isRoundTrip: formData.isRoundTrip,
          // Story 16.7: Pass excursion stops for multi-stop pricing
          stops: formData.stops?.map((stop, index) => ({
            address: stop.address,
            latitude: stop.latitude ?? 0,
            longitude: stop.longitude ?? 0,
            order: stop.order ?? index,
          })),
          // Story 16.7: Pass return date for multi-day excursions
          returnDate: formData.returnDate?.toISOString(),
          // Story 16.8: DISPO-specific fields
          durationHours: formData.durationHours !== null ? formData.durationHours : undefined,
          maxKilometers: formData.maxKilometers !== null ? formData.maxKilometers : undefined,
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
