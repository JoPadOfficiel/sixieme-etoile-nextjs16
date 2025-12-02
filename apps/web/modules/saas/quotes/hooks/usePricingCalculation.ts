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
  dropoff: { lat: number; lng: number };
  vehicleCategoryId: string;
  tripType: "transfer" | "excursion" | "dispo";
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
 * Story 6.5: Compliance validation input
 */
interface ComplianceValidationInput {
  vehicleCategoryId: string;
  regulatoryCategory: RegulatoryCategory;
  tripAnalysis: {
    segments: {
      approach?: { durationMinutes: number; distanceKm?: number } | null;
      service: { durationMinutes: number; distanceKm?: number };
      return?: { durationMinutes: number; distanceKm?: number } | null;
    };
    totalDurationMinutes?: number;
  };
  pickupAt: string;
  estimatedDropoffAt?: string;
}

/**
 * Story 6.5: Compliance API response
 */
interface ComplianceApiResponse {
  isCompliant: boolean;
  regulatoryCategory: RegulatoryCategory;
  violations: Array<{
    type: string;
    message: string;
    actual: number;
    limit: number;
    unit: "hours" | "minutes" | "km/h";
    severity: "BLOCKING";
  }>;
  warnings: Array<{
    type: string;
    message: string;
    actual: number;
    limit: number;
    percentOfLimit: number;
  }>;
  adjustedDurations: {
    totalDrivingMinutes: number;
    totalAmplitudeMinutes: number;
    injectedBreakMinutes: number;
    cappedSpeedApplied: boolean;
    originalDrivingMinutes: number;
    originalAmplitudeMinutes: number;
  };
  rulesApplied: Array<{
    ruleId: string;
    ruleName: string;
    threshold: number;
    unit: string;
    result: "PASS" | "FAIL" | "WARNING";
    actualValue?: number;
  }>;
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
      // Story 6.5: Run compliance validation for HEAVY vehicles
      let complianceResult: ComplianceValidationResult | null = null;
      
      if (
        vehicleCategoryRef.current?.regulatoryCategory === "HEAVY" &&
        data.tripAnalysis &&
        pickupAtRef.current
      ) {
        try {
          complianceResult = await validateCompliance({
            vehicleCategoryId: vehicleCategoryRef.current.id,
            regulatoryCategory: "HEAVY",
            tripAnalysis: {
              segments: {
                approach: data.tripAnalysis.segments.approach ? {
                  durationMinutes: data.tripAnalysis.segments.approach.durationMinutes,
                  distanceKm: data.tripAnalysis.segments.approach.distanceKm,
                } : null,
                service: {
                  durationMinutes: data.tripAnalysis.segments.service.durationMinutes,
                  distanceKm: data.tripAnalysis.segments.service.distanceKm,
                },
                return: data.tripAnalysis.segments.return ? {
                  durationMinutes: data.tripAnalysis.segments.return.durationMinutes,
                  distanceKm: data.tripAnalysis.segments.return.distanceKm,
                } : null,
              },
              totalDurationMinutes: data.tripAnalysis.totalDurationMinutes,
            },
            pickupAt: pickupAtRef.current,
          });
        } catch (complianceError) {
          console.error("Compliance validation failed:", complianceError);
          // Don't block pricing if compliance check fails
        }
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

  /**
   * Story 6.5: Call compliance validation API
   */
  async function validateCompliance(
    input: ComplianceValidationInput
  ): Promise<ComplianceValidationResult | null> {
    try {
      const response = await apiClient.vtc.compliance.validate.$post({
        json: input,
      });

      if (!response.ok) {
        console.error("Compliance API error:", response.status);
        return null;
      }

      const data = await response.json() as ComplianceApiResponse;
      
      return {
        isCompliant: data.isCompliant,
        regulatoryCategory: data.regulatoryCategory,
        violations: data.violations.map(v => ({
          type: v.type as ComplianceValidationResult["violations"][0]["type"],
          message: v.message,
          actual: v.actual,
          limit: v.limit,
          unit: v.unit,
          severity: v.severity,
        })),
        warnings: data.warnings.map(w => ({
          type: w.type as ComplianceValidationResult["warnings"][0]["type"],
          message: w.message,
          actual: w.actual,
          limit: w.limit,
          percentOfLimit: w.percentOfLimit,
        })),
        adjustedDurations: data.adjustedDurations,
        rulesApplied: data.rulesApplied,
      };
    } catch (err) {
      console.error("Compliance validation error:", err);
      return null;
    }
  }

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
          // Story 16.6: Pass round trip flag for transfer pricing
          isRoundTrip: formData.isRoundTrip,
          // Story 16.7: Pass excursion stops for multi-stop pricing
          stops: formData.stops?.map((stop, index) => ({
            address: stop.address,
            latitude: stop.latitude ?? 0,
            longitude: stop.longitude ?? 0,
            order: stop.order ?? index,
            notes: stop.notes,
          })),
          // Story 16.7: Pass return date for multi-day excursions
          returnDate: formData.returnDate?.toISOString(),
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
