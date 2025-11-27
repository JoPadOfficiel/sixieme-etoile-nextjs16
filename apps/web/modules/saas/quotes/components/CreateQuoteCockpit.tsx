"use client";

import { useToast } from "@ui/hooks/use-toast";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { QuoteBasicInfoPanel } from "./QuoteBasicInfoPanel";
import { TripTransparencyPanel } from "./TripTransparencyPanel";
import { QuotePricingPanel } from "./QuotePricingPanel";
import type { CreateQuoteFormData, PricingResult } from "../types";
import { initialCreateQuoteFormData } from "../types";

/**
 * CreateQuoteCockpit Component
 * 
 * Main 3-column layout for quote creation.
 * - Left: Basic info (contact, trip details, vehicle)
 * - Center: Trip Transparency (costs, segments, profitability)
 * - Right: Pricing & options (price, notes, submit)
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see UX Spec 8.3.2 Create Quote
 */
export function CreateQuoteCockpit() {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganization } = useActiveOrganization();

  // Form state
  const [formData, setFormData] = useState<CreateQuoteFormData>(initialCreateQuoteFormData);
  
  // Pricing calculation state
  const [pricingResult, setPricingResult] = useState<PricingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const calculationTimer = useRef<NodeJS.Timeout | null>(null);

  // Update form field
  const handleFormChange = useCallback(<K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Check if we have enough data to calculate pricing
  const canCalculatePricing = useCallback(() => {
    return (
      formData.pickupAddress &&
      formData.dropoffAddress &&
      formData.pickupAt &&
      formData.vehicleCategoryId &&
      formData.contactId
    );
  }, [formData]);

  // Calculate pricing (debounced)
  const calculatePricing = useCallback(async () => {
    if (!canCalculatePricing()) {
      return;
    }

    setIsCalculating(true);

    try {
      // For now, we'll simulate pricing calculation
      // In a real implementation, this would call the pricing API
      // POST /api/vtc/pricing/calculate
      
      // Simulate API delay
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate mock pricing result based on form data
      // This would be replaced with actual API call
      const mockDistance = 25 + Math.random() * 50; // 25-75 km
      const mockDuration = mockDistance * 1.5; // ~1.5 min per km
      const mockInternalCost = mockDistance * 2.5; // ~2.5 EUR/km
      const mockSuggestedPrice = mockInternalCost * 1.3; // 30% margin

      const mockResult: PricingResult = {
        pricingMode: formData.contact?.isPartner ? "FIXED_GRID" : "DYNAMIC",
        price: Math.round(mockSuggestedPrice * 100) / 100,
        currency: "EUR",
        internalCost: Math.round(mockInternalCost * 100) / 100,
        margin: Math.round((mockSuggestedPrice - mockInternalCost) * 100) / 100,
        marginPercent: Math.round(((mockSuggestedPrice - mockInternalCost) / mockSuggestedPrice) * 100 * 10) / 10,
        profitabilityIndicator: "green",
        matchedGrid: formData.contact?.isPartner ? {
          type: "ZoneRoute",
          id: "mock-grid",
          name: "Paris → CDG",
        } : null,
        appliedRules: [
          {
            type: "DYNAMIC_BASE_CALCULATION",
            description: "Base price calculated using max(distance, duration) formula",
          },
        ],
        isContractPrice: formData.contact?.isPartner ?? false,
        fallbackReason: null,
        tripAnalysis: {
          costBreakdown: {
            fuel: {
              amount: mockDistance * 0.15,
              distanceKm: mockDistance,
              consumptionL100km: 8,
              pricePerLiter: 1.85,
            },
            tolls: {
              amount: mockDistance * 0.12,
              distanceKm: mockDistance,
              ratePerKm: 0.12,
            },
            wear: {
              amount: mockDistance * 0.08,
              distanceKm: mockDistance,
              ratePerKm: 0.08,
            },
            driver: {
              amount: (mockDuration / 60) * 25,
              durationMinutes: mockDuration,
              hourlyRate: 25,
            },
            parking: {
              amount: 0,
              description: "",
            },
            total: mockInternalCost,
          },
          segments: {
            approach: {
              name: "approach",
              description: "Base → Pickup",
              distanceKm: 5,
              durationMinutes: 10,
              cost: {
                fuel: { amount: 0.75, distanceKm: 5, consumptionL100km: 8, pricePerLiter: 1.85 },
                tolls: { amount: 0.6, distanceKm: 5, ratePerKm: 0.12 },
                wear: { amount: 0.4, distanceKm: 5, ratePerKm: 0.08 },
                driver: { amount: 4.17, durationMinutes: 10, hourlyRate: 25 },
                parking: { amount: 0, description: "" },
                total: 5.92,
              },
              isEstimated: true,
            },
            service: {
              name: "service",
              description: "Pickup → Dropoff",
              distanceKm: mockDistance,
              durationMinutes: mockDuration,
              cost: {
                fuel: { amount: mockDistance * 0.15, distanceKm: mockDistance, consumptionL100km: 8, pricePerLiter: 1.85 },
                tolls: { amount: mockDistance * 0.12, distanceKm: mockDistance, ratePerKm: 0.12 },
                wear: { amount: mockDistance * 0.08, distanceKm: mockDistance, ratePerKm: 0.08 },
                driver: { amount: (mockDuration / 60) * 25, durationMinutes: mockDuration, hourlyRate: 25 },
                parking: { amount: 0, description: "" },
                total: mockInternalCost * 0.7,
              },
              isEstimated: false,
            },
            return: {
              name: "return",
              description: "Dropoff → Base",
              distanceKm: 8,
              durationMinutes: 15,
              cost: {
                fuel: { amount: 1.2, distanceKm: 8, consumptionL100km: 8, pricePerLiter: 1.85 },
                tolls: { amount: 0.96, distanceKm: 8, ratePerKm: 0.12 },
                wear: { amount: 0.64, distanceKm: 8, ratePerKm: 0.08 },
                driver: { amount: 6.25, durationMinutes: 15, hourlyRate: 25 },
                parking: { amount: 0, description: "" },
                total: 9.05,
              },
              isEstimated: true,
            },
          },
          totalDistanceKm: mockDistance + 13,
          totalDurationMinutes: mockDuration + 25,
          totalInternalCost: mockInternalCost,
          calculatedAt: new Date().toISOString(),
          routingSource: "HAVERSINE_ESTIMATE",
        },
      };

      setPricingResult(mockResult);

      // Auto-set final price if not already set
      if (formData.finalPrice === 0) {
        handleFormChange("finalPrice", mockResult.price);
      }
    } catch (error) {
      console.error("Pricing calculation failed:", error);
      toast({
        title: t("quotes.create.pricingError"),
        variant: "error",
      });
    } finally {
      setIsCalculating(false);
    }
  }, [canCalculatePricing, formData, handleFormChange, t, toast]);

  // Trigger pricing calculation when relevant fields change (debounced)
  useEffect(() => {
    if (calculationTimer.current) {
      clearTimeout(calculationTimer.current);
    }

    if (canCalculatePricing()) {
      calculationTimer.current = setTimeout(() => {
        calculatePricing();
      }, 500); // 500ms debounce
    }

    return () => {
      if (calculationTimer.current) {
        clearTimeout(calculationTimer.current);
      }
    };
  }, [
    formData.pickupAddress,
    formData.dropoffAddress,
    formData.pickupAt,
    formData.vehicleCategoryId,
    formData.contactId,
    formData.passengerCount,
    formData.luggageCount,
    canCalculatePricing,
    calculatePricing,
  ]);

  // Create quote mutation
  const createQuoteMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.vtc.quotes.$post({
        json: {
          contactId: formData.contactId,
          vehicleCategoryId: formData.vehicleCategoryId,
          pricingMode: pricingResult?.pricingMode ?? "DYNAMIC",
          tripType: formData.tripType,
          pickupAt: formData.pickupAt!.toISOString(),
          pickupAddress: formData.pickupAddress,
          pickupLatitude: formData.pickupLatitude,
          pickupLongitude: formData.pickupLongitude,
          dropoffAddress: formData.dropoffAddress,
          dropoffLatitude: formData.dropoffLatitude,
          dropoffLongitude: formData.dropoffLongitude,
          passengerCount: formData.passengerCount,
          luggageCount: formData.luggageCount,
          suggestedPrice: pricingResult?.price ?? formData.finalPrice,
          finalPrice: formData.finalPrice,
          internalCost: pricingResult?.internalCost ?? null,
          marginPercent: pricingResult?.marginPercent ?? null,
          tripAnalysis: pricingResult?.tripAnalysis as unknown as Record<string, unknown> | null ?? null,
          appliedRules: pricingResult?.appliedRules ? { rules: pricingResult.appliedRules } : null,
          validUntil: formData.validUntil?.toISOString() ?? null,
          notes: formData.notes || null,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to create quote");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      toast({
        title: t("quotes.create.success"),
      });
      router.push(`/app/${activeOrganization?.slug}/quotes`);
    },
    onError: () => {
      toast({
        title: t("quotes.create.error"),
        variant: "error",
      });
    },
  });

  const handleSubmit = () => {
    createQuoteMutation.mutate();
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Basic Info */}
      <div className="lg:col-span-1">
        <QuoteBasicInfoPanel
          formData={formData}
          onFormChange={handleFormChange}
          disabled={createQuoteMutation.isPending}
        />
      </div>

      {/* Center Column - Trip Transparency */}
      <div className="lg:col-span-1">
        <TripTransparencyPanel
          pricingResult={pricingResult}
          isLoading={isCalculating}
        />
      </div>

      {/* Right Column - Pricing & Options */}
      <div className="lg:col-span-1">
        <QuotePricingPanel
          formData={formData}
          pricingResult={pricingResult}
          isCalculating={isCalculating}
          isSubmitting={createQuoteMutation.isPending}
          onFormChange={handleFormChange}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  );
}

export default CreateQuoteCockpit;
