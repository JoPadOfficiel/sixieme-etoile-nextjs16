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
import { usePricingCalculation } from "../hooks/usePricingCalculation";
import type { CreateQuoteFormData } from "../types";
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
  
  // Pricing calculation hook
  const { pricingResult, isCalculating, error: pricingError, calculate } = usePricingCalculation({
    debounceMs: 500,
  });

  // Update form field
  const handleFormChange = useCallback(<K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }, []);

  // Trigger pricing calculation when relevant fields change
  // Using a ref to track previous price to avoid cascading renders
  const previousPriceRef = useRef<number | null>(null);

  useEffect(() => {
    calculate(formData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData.pickupAddress,
    formData.pickupLatitude,
    formData.pickupLongitude,
    formData.dropoffAddress,
    formData.dropoffLatitude,
    formData.dropoffLongitude,
    formData.pickupAt,
    formData.vehicleCategoryId,
    formData.contactId,
    formData.passengerCount,
    formData.luggageCount,
    formData.tripType,
    calculate,
  ]);

  // Auto-set final price when pricing result changes (only if not already set)
  // Using ref to track and avoid cascading renders
  useEffect(() => {
    if (pricingResult && previousPriceRef.current !== pricingResult.price) {
      previousPriceRef.current = pricingResult.price;
      // Only auto-set if final price is still 0 (not manually edited)
      if (formData.finalPrice === 0) {
        setFormData((prev) => ({ ...prev, finalPrice: pricingResult.price }));
      }
    }
  }, [pricingResult, formData.finalPrice]);

  // Show error toast when pricing fails
  useEffect(() => {
    if (pricingError) {
      toast({
        title: t("quotes.create.pricingError"),
        description: pricingError.message,
        variant: "error",
      });
    }
  }, [pricingError, t, toast]);

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
