"use client";

import { useToast } from "@ui/hooks/use-toast";
import { Button } from "@ui/components/button";
import { Skeleton } from "@ui/components/skeleton";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { QuoteBasicInfoPanel } from "./QuoteBasicInfoPanel";
import { TripTransparencyPanel } from "./TripTransparencyPanel";
import { QuotePricingPanel } from "./QuotePricingPanel";
import { ComplianceAlertBanner } from "./ComplianceAlertBanner";
import { AirportHelperPanel } from "./AirportHelperPanel";
import { CapacityWarningAlert } from "./CapacityWarningAlert";
import { usePricingCalculation } from "../hooks/usePricingCalculation";
import { useScenarioHelpers } from "../hooks/useScenarioHelpers";
import { useVehicleCategories } from "../hooks/useVehicleCategories";
import { useOptionalFees } from "../hooks/useOptionalFees";
import { useQuoteDetail } from "../hooks/useQuoteDetail";
import type { CreateQuoteFormData } from "../types";
import { hasBlockingViolations } from "../types";
import type { AddedFee } from "./AddQuoteFeeDialog";

interface EditQuoteCockpitProps {
  quoteId: string;
}

/**
 * EditQuoteCockpit Component
 * 
 * Edit page for existing quotes in DRAFT status.
 * Uses the same layout as CreateQuoteCockpit but with pre-filled data.
 * 
 * @see Story 10.1: Quote Edit Functionality
 */
export function EditQuoteCockpit({ quoteId }: EditQuoteCockpitProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganization } = useActiveOrganization();

  // Fetch existing quote data
  const { data: quote, isLoading: quoteLoading, error: quoteError } = useQuoteDetail(quoteId);

  // Form state - will be initialized from quote data
  const [formData, setFormData] = useState<CreateQuoteFormData | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Added fees and promotions (manual additions via dialog)
  const [addedFees, setAddedFees] = useState<AddedFee[]>([]);
  
  // Initialize form data from quote
  useEffect(() => {
    if (quote && !isInitialized) {
      setFormData({
        contactId: quote.contactId,
        contact: quote.contact,
        pickupAddress: quote.pickupAddress,
        pickupLatitude: quote.pickupLatitude ? parseFloat(quote.pickupLatitude) : null,
        pickupLongitude: quote.pickupLongitude ? parseFloat(quote.pickupLongitude) : null,
        dropoffAddress: quote.dropoffAddress ?? "",
        dropoffLatitude: quote.dropoffLatitude ? parseFloat(quote.dropoffLatitude) : null,
        dropoffLongitude: quote.dropoffLongitude ? parseFloat(quote.dropoffLongitude) : null,
        pickupAt: quote.pickupAt ? new Date(quote.pickupAt) : null,
        tripType: quote.tripType,
        vehicleCategoryId: quote.vehicleCategoryId,
        vehicleCategory: quote.vehicleCategory || null,
        passengerCount: quote.passengerCount,
        luggageCount: quote.luggageCount,
        finalPrice: parseFloat(quote.finalPrice),
        notes: quote.notes || "",
        validUntil: quote.validUntil ? new Date(quote.validUntil) : null,
        flightNumber: "",
        waitingTimeMinutes: 0,
        // Restore selected optional fees from appliedRules
        selectedOptionalFeeIds: (quote.appliedRules as { selectedOptionalFeeIds?: string[] } | null)?.selectedOptionalFeeIds ?? [],
        // Story 16.1: Trip type specific fields
        isRoundTrip: quote.isRoundTrip ?? false,
        stops: (quote.stops as { id: string; address: string; latitude: number | null; longitude: number | null; order: number }[] | null) ?? [],
        returnDate: quote.returnDate ? new Date(quote.returnDate) : null,
        durationHours: quote.durationHours ? parseFloat(quote.durationHours) : null,
        maxKilometers: quote.maxKilometers ? parseFloat(quote.maxKilometers) : null,
      });
      
      // Restore added fees from appliedRules
      const savedAddedFees = (quote.appliedRules as { addedFees?: AddedFee[] } | null)?.addedFees ?? [];
      setAddedFees(savedAddedFees);
      
      setIsInitialized(true);
    }
  }, [quote, isInitialized]);

  // Pricing calculation hook
  const { pricingResult, isCalculating, calculate } = usePricingCalculation({
    debounceMs: 500,
  });

  // Vehicle categories and optional fees
  const { categories: allVehicleCategories } = useVehicleCategories();
  const { fees: optionalFees } = useOptionalFees();
  
  // Scenario helpers
  const { airportDetection, capacityWarning, getApplicableFees } = useScenarioHelpers(
    formData || {} as CreateQuoteFormData,
    allVehicleCategories
  );

  const applicableFees = getApplicableFees(optionalFees, airportDetection);

  // Update form field
  const handleFormChange = useCallback(<K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => {
    setFormData((prev) => prev ? { ...prev, [field]: value } : prev);
  }, []);

  // Handle adding a fee or promotion via dialog
  const handleAddFee = useCallback((fee: AddedFee) => {
    setAddedFees((prev) => [...prev, fee]);
  }, []);

  // Handle removing a fee or promotion
  const handleRemoveFee = useCallback((feeId: string) => {
    setAddedFees((prev) => prev.filter((f) => f.id !== feeId));
  }, []);

  // Trigger pricing calculation when relevant fields change
  useEffect(() => {
    if (formData) {
      calculate(formData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    formData?.pickupAddress,
    formData?.pickupLatitude,
    formData?.pickupLongitude,
    formData?.dropoffAddress,
    formData?.dropoffLatitude,
    formData?.dropoffLongitude,
    formData?.pickupAt,
    formData?.vehicleCategoryId,
    formData?.contactId,
    formData?.passengerCount,
    formData?.luggageCount,
    formData?.tripType,
    // Story 19.4: Add DISPO-specific fields to trigger recalculation
    formData?.durationHours,
    formData?.maxKilometers,
    formData?.isRoundTrip,
    // Note: calculate excluded to avoid infinite loops - it has internal debouncing
  ]);

  // Story 6.5 + 19.1: Check for blocking violations (considering staffing plan)
  // If a staffing plan exists (DOUBLE_CREW, etc.), violations are resolved and trip is NOT blocked
  const hasViolations = pricingResult?.complianceResult
    ? hasBlockingViolations(
        pricingResult.complianceResult,
        pricingResult?.tripAnalysis?.compliancePlan
      )
    : false;

  // Update quote mutation
  const updateQuoteMutation = useMutation({
    mutationFn: async () => {
      if (!formData) throw new Error("Form data not initialized");

      // Calculate total of added fees (positive for fees, negative for promotions)
      const addedFeesTotal = addedFees.reduce((sum, fee) => {
        return sum + (fee.type === "promotion" ? -Math.abs(fee.amount) : fee.amount);
      }, 0);
      
      // Final price includes base price + added fees/promotions
      const computedFinalPrice = formData.finalPrice + addedFeesTotal;

      const response = await apiClient.vtc.quotes[":id"].$patch({
        param: { id: quoteId },
        json: {
          contactId: formData.contactId,
          pickupAddress: formData.pickupAddress,
          pickupLatitude: formData.pickupLatitude,
          pickupLongitude: formData.pickupLongitude,
          dropoffAddress: formData.dropoffAddress,
          dropoffLatitude: formData.dropoffLatitude,
          dropoffLongitude: formData.dropoffLongitude,
          pickupAt: formData.pickupAt?.toISOString() ?? undefined,
          tripType: formData.tripType,
          vehicleCategoryId: formData.vehicleCategoryId,
          passengerCount: formData.passengerCount,
          luggageCount: formData.luggageCount,
          finalPrice: computedFinalPrice,
          notes: formData.notes || undefined,
          // Include pricing data if available
          suggestedPrice: pricingResult?.price ?? formData.finalPrice,
          internalCost: pricingResult?.internalCost ?? null,
          marginPercent: pricingResult?.marginPercent ?? null,
          tripAnalysis: pricingResult?.tripAnalysis as unknown as Record<string, unknown> | null ?? null,
          // Include optional fees in appliedRules
          appliedRules: {
            rules: pricingResult?.appliedRules ?? [],
            selectedOptionalFeeIds: formData.selectedOptionalFeeIds,
            // Snapshot the selected fees details for invoice generation
            selectedOptionalFees: optionalFees
              .filter(fee => formData.selectedOptionalFeeIds.includes(fee.id))
              .map(fee => ({
                id: fee.id,
                name: fee.name,
                description: fee.description,
                amount: fee.amount,
                amountType: fee.amountType,
                isTaxable: fee.isTaxable,
                vatRate: fee.vatRate,
              })),
            // Manually added fees and promotions via dialog
            addedFees: addedFees.map(fee => ({
              id: fee.id,
              type: fee.type,
              name: fee.name,
              description: fee.description,
              amount: fee.amount,
              vatRate: fee.vatRate,
              discountType: fee.discountType,
              promoCode: fee.promoCode,
            })),
          },
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as { message?: string }).message || "Failed to update quote");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
      toast({
        title: t("quotes.edit.success"),
      });
      router.push(`/app/${activeOrganization?.slug}/quotes/${quoteId}`);
    },
    onError: (error) => {
      toast({
        title: t("quotes.edit.error"),
        description: error.message,
        variant: "error",
      });
    },
  });

  // Handle form submit
  const handleSubmit = () => {
    if (!formData) return;
    
    if (!formData.contactId) {
      toast({
        title: t("quotes.create.validation.contactRequired"),
        variant: "error",
      });
      return;
    }
    if (!formData.pickupAddress || !formData.dropoffAddress) {
      toast({
        title: t("quotes.create.validation.addressRequired"),
        variant: "error",
      });
      return;
    }
    if (!formData.vehicleCategoryId) {
      toast({
        title: t("quotes.create.validation.vehicleRequired"),
        variant: "error",
      });
      return;
    }
    if (hasViolations) {
      toast({
        title: t("quotes.create.validation.complianceBlocking"),
        variant: "error",
      });
      return;
    }
    updateQuoteMutation.mutate();
  };

  // Loading state
  if (quoteLoading) {
    return <EditQuoteSkeleton />;
  }

  // Error state
  if (quoteError || !quote) {
    return (
      <div className="py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {t("quotes.detail.notFound")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("quotes.detail.notFoundDescription")}
          </p>
        </div>
      </div>
    );
  }

  // Check if quote is editable (only DRAFT)
  if (quote.status !== "DRAFT") {
    return (
      <div className="py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {t("quotes.edit.notEditable")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("quotes.edit.notEditableDescription")}
          </p>
          <Link
            href={`/app/${activeOrganization?.slug}/quotes/${quoteId}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
          >
            <ArrowLeftIcon className="size-4" />
            {t("quotes.detail.backToQuotes")}
          </Link>
        </div>
      </div>
    );
  }

  // Form not initialized yet
  if (!formData) {
    return <EditQuoteSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            href={`/app/${activeOrganization?.slug}/quotes/${quoteId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            {t("quotes.edit.backToDetail")}
          </Link>
          <h1 className="text-2xl font-bold">
            {t("quotes.edit.title")} #{quoteId.substring(0, 8)}
          </h1>
          <p className="text-sm text-muted-foreground">
            {quote.contact.displayName}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={updateQuoteMutation.isPending || hasViolations}
        >
          {updateQuoteMutation.isPending ? (
            <Loader2Icon className="size-4 mr-2 animate-spin" />
          ) : (
            <SaveIcon className="size-4 mr-2" />
          )}
          {t("quotes.edit.save")}
        </Button>
      </div>

      {/* Blocking Alert Banner */}
      {pricingResult?.complianceResult && hasViolations && (
        <ComplianceAlertBanner
          violations={pricingResult.complianceResult.violations}
          className="mb-2"
        />
      )}

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Basic Info */}
        <div className="lg:col-span-1 space-y-4">
          <QuoteBasicInfoPanel
            formData={formData}
            onFormChange={handleFormChange}
            allCategories={allVehicleCategories}
            disabled={updateQuoteMutation.isPending}
          />

          <AirportHelperPanel
            airportDetection={airportDetection}
            flightNumber={formData.flightNumber}
            onFlightNumberChange={(value) => handleFormChange("flightNumber", value)}
            waitingTimeMinutes={formData.waitingTimeMinutes}
            onWaitingTimeChange={(value) => handleFormChange("waitingTimeMinutes", value)}
            applicableFees={applicableFees}
            selectedFeeIds={formData.selectedOptionalFeeIds}
            onFeeToggle={(feeId, checked) => {
              setFormData(prev => prev ? {
                ...prev,
                selectedOptionalFeeIds: checked
                  ? [...prev.selectedOptionalFeeIds, feeId]
                  : prev.selectedOptionalFeeIds.filter(id => id !== feeId),
              } : prev);
            }}
            disabled={updateQuoteMutation.isPending}
          />

          {capacityWarning && formData.vehicleCategory && (
            <CapacityWarningAlert
              warning={capacityWarning}
              currentCategoryName={formData.vehicleCategory.name}
              onApplySuggestion={() => {
                if (capacityWarning.suggestedCategory) {
                  handleFormChange("vehicleCategoryId", capacityWarning.suggestedCategory.id);
                  handleFormChange("vehicleCategory", capacityWarning.suggestedCategory);
                }
              }}
              disabled={updateQuoteMutation.isPending}
            />
          )}
        </div>

        {/* Center Column - Trip Transparency */}
        <div className="lg:col-span-1">
          <TripTransparencyPanel
            pricingResult={pricingResult}
            isLoading={isCalculating}
            routeCoordinates={{
              pickup: formData.pickupLatitude && formData.pickupLongitude
                ? { lat: formData.pickupLatitude, lng: formData.pickupLongitude, address: formData.pickupAddress }
                : undefined,
              dropoff: formData.dropoffLatitude && formData.dropoffLongitude
                ? { lat: formData.dropoffLatitude, lng: formData.dropoffLongitude, address: formData.dropoffAddress }
                : undefined,
            }}
          />
        </div>

        {/* Right Column - Pricing & Options */}
        <div className="lg:col-span-1">
          <QuotePricingPanel
            formData={formData}
            pricingResult={pricingResult}
            isCalculating={isCalculating}
            isSubmitting={updateQuoteMutation.isPending}
            onFormChange={handleFormChange}
            onSubmit={handleSubmit}
            submitLabel={t("quotes.edit.save")}
            addedFees={addedFees}
            onAddFee={handleAddFee}
            onRemoveFee={handleRemoveFee}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for edit quote
 */
function EditQuoteSkeleton() {
  return (
    <div className="py-4 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div>
          <Skeleton className="h-96 w-full" />
        </div>
        <div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

export default EditQuoteCockpit;
