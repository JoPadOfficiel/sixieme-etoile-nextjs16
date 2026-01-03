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
import { ComplianceAlertBanner } from "./ComplianceAlertBanner";
import { AirportHelperPanel } from "./AirportHelperPanel";
import { CapacityWarningAlert } from "./CapacityWarningAlert";
import { usePricingCalculation } from "../hooks/usePricingCalculation";
import { useScenarioHelpers } from "../hooks/useScenarioHelpers";
import { useVehicleCategories } from "../hooks/useVehicleCategories";
import { useOptionalFees } from "../hooks/useOptionalFees";
import type { CreateQuoteFormData } from "../types";
import { initialCreateQuoteFormData, hasBlockingViolations } from "../types";
import type { AddedFee } from "./AddQuoteFeeDialog";

/**
 * CreateQuoteCockpit Component
 * 
 * Main 3-column layout for quote creation.
 * - Left: Basic info (contact, trip details, vehicle)
 * - Center: Trip Transparency (costs, segments, profitability)
 * - Right: Pricing & options (price, notes, submit)
 * 
 * Story 6.5: Includes blocking banner for compliance violations
 * Story 6.6: Includes airport helpers and capacity warnings
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see Story 6.5: Blocking and Non-Blocking Alerts
 * @see Story 6.6: Helpers for Common Scenarios
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
  
  // Added fees and promotions (manual additions via dialog)
  const [addedFees, setAddedFees] = useState<AddedFee[]>([]);
  
  // Pricing calculation hook
  const { pricingResult, isCalculating, error: pricingError, calculate } = usePricingCalculation({
    debounceMs: 500,
  });

  // Story 6.6: Vehicle categories and optional fees for helpers
  const { categories: allVehicleCategories } = useVehicleCategories();
  const { fees: optionalFees } = useOptionalFees();
  
  // Story 6.6: Scenario helpers (airport detection, capacity validation)
  const { airportDetection, capacityWarning, getApplicableFees } = useScenarioHelpers(
    formData,
    allVehicleCategories
  );

  // Story 6.6: Get applicable fees for current scenario
  const applicableFees = getApplicableFees(optionalFees, airportDetection);

  // Story 6.6: Auto-select applicable fees when airport is detected
  const previousAirportRef = useRef<boolean>(false);
  useEffect(() => {
    if (airportDetection.isAirportTransfer && !previousAirportRef.current) {
      // Auto-select all applicable fees
      const feeIds = applicableFees.map(f => f.id);
      setFormData(prev => ({
        ...prev,
        selectedOptionalFeeIds: feeIds,
      }));
    }
    previousAirportRef.current = airportDetection.isAirportTransfer;
  }, [airportDetection.isAirportTransfer, applicableFees]);

  // Update form field
  const handleFormChange = useCallback(<K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
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
  // Using a ref to track previous price to avoid cascading renders
  const previousPriceRef = useRef<number | null>(null);
  
  // Store calculate in a ref to avoid dependency issues
  const calculateRef = useRef(calculate);
  calculateRef.current = calculate;

  useEffect(() => {
    // Use ref to avoid infinite loops from calculate dependency changes
    calculateRef.current(formData);
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
    // Story 19.4: Add DISPO-specific fields to trigger recalculation
    formData.durationHours,
    formData.maxKilometers,
    formData.isRoundTrip,
    // Note: calculate is NOT a dependency - we use ref to avoid infinite loops
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
      // Calculate total of added fees (positive for fees, negative for promotions)
      const addedFeesTotal = addedFees.reduce((sum, fee) => {
        return sum + (fee.type === "promotion" ? -Math.abs(fee.amount) : fee.amount);
      }, 0);
      
      // Final price includes base price + added fees/promotions
      const computedFinalPrice = formData.finalPrice + addedFeesTotal;

      // Story 22.6: Handle STAY trip type with dedicated API
      if (formData.tripType === "STAY") {
        const stayDaysPayload = formData.stayDays.map(day => ({
          date: day.date?.toISOString().split('T')[0] ?? new Date().toISOString().split('T')[0],
          hotelRequired: day.hotelRequired,
          mealCount: day.mealCount,
          driverCount: day.driverCount,
          notes: day.notes || null,
          services: day.services.map(svc => ({
            serviceType: svc.serviceType,
            pickupAt: svc.pickupAt?.toISOString() ?? new Date().toISOString(),
            pickupAddress: svc.pickupAddress,
            pickupLatitude: svc.pickupLatitude,
            pickupLongitude: svc.pickupLongitude,
            dropoffAddress: svc.dropoffAddress || null,
            dropoffLatitude: svc.dropoffLatitude,
            dropoffLongitude: svc.dropoffLongitude,
            durationHours: svc.durationHours,
            stops: svc.stops.length > 0
              ? svc.stops
                  .filter((s): s is typeof s & { latitude: number; longitude: number } =>
                    s.latitude !== null && s.longitude !== null)
                  .map(s => ({ latitude: s.latitude, longitude: s.longitude, address: s.address, order: s.order }))
              : null,
            notes: svc.notes || null,
          })),
        }));

        const response = await apiClient.vtc["stay-quotes"].$post({
          json: {
            contactId: formData.contactId,
            vehicleCategoryId: formData.vehicleCategoryId,
            passengerCount: formData.passengerCount,
            luggageCount: formData.luggageCount,
            notes: formData.notes || null,
            stayDays: stayDaysPayload,
          },
        });

        if (!response.ok) {
          throw new Error("Failed to create stay quote");
        }

        return response.json();
      }
      
      // Standard quote creation for other trip types
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
          // Story 16.1: dropoffAddress is optional for DISPO and OFF_GRID
          dropoffAddress: formData.dropoffAddress || null,
          dropoffLatitude: formData.dropoffLatitude,
          dropoffLongitude: formData.dropoffLongitude,
          // Story 16.1: Trip type specific fields
          isRoundTrip: formData.isRoundTrip,
          stops: formData.stops.length > 0 
            ? formData.stops
                .filter((s): s is typeof s & { latitude: number; longitude: number } => 
                  s.latitude !== null && s.longitude !== null)
                .map(s => ({ latitude: s.latitude, longitude: s.longitude, address: s.address, order: s.order }))
            : null,
          returnDate: formData.returnDate?.toISOString() ?? null,
          durationHours: formData.durationHours,
          maxKilometers: formData.maxKilometers,
          passengerCount: formData.passengerCount,
          luggageCount: formData.luggageCount,
          suggestedPrice: pricingResult?.price ?? formData.finalPrice,
          finalPrice: computedFinalPrice,
          internalCost: pricingResult?.internalCost ?? null,
          marginPercent: pricingResult?.marginPercent ?? null,
          tripAnalysis: pricingResult?.tripAnalysis as unknown as Record<string, unknown> | null ?? null,
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

  // Story 6.5 + 19.1: Check for blocking violations (considering staffing plan)
  // If a staffing plan exists (DOUBLE_CREW, etc.), violations are resolved and trip is NOT blocked
  const hasViolations = hasBlockingViolations(
    pricingResult?.complianceResult ?? null,
    pricingResult?.tripAnalysis?.compliancePlan
  );

  const handleSubmit = () => {
    // Story 6.5: Prevent submission if there are blocking violations
    if (hasViolations) {
      toast({
        title: t("quotes.compliance.cannotCreate"),
        description: t("quotes.compliance.resolveViolations"),
        variant: "error",
      });
      return;
    }
    createQuoteMutation.mutate();
  };

  return (
    <div className="space-y-6">
      {/* Story 6.5: Blocking Alert Banner for Compliance Violations */}
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
            disabled={createQuoteMutation.isPending}
          />

          {/* Story 6.6: Airport Helper Panel */}
          <AirportHelperPanel
            airportDetection={airportDetection}
            flightNumber={formData.flightNumber}
            onFlightNumberChange={(value) => handleFormChange("flightNumber", value)}
            waitingTimeMinutes={formData.waitingTimeMinutes}
            onWaitingTimeChange={(value) => handleFormChange("waitingTimeMinutes", value)}
            applicableFees={applicableFees}
            selectedFeeIds={formData.selectedOptionalFeeIds}
            onFeeToggle={(feeId, checked) => {
              setFormData(prev => ({
                ...prev,
                selectedOptionalFeeIds: checked
                  ? [...prev.selectedOptionalFeeIds, feeId]
                  : prev.selectedOptionalFeeIds.filter(id => id !== feeId),
              }));
            }}
            disabled={createQuoteMutation.isPending}
          />

          {/* Story 6.6: Capacity Warning Alert */}
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
              disabled={createQuoteMutation.isPending}
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
            encodedPolyline={pricingResult?.tripAnalysis?.encodedPolyline}
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
            hasBlockingViolations={hasViolations}
            addedFees={addedFees}
            onAddFee={handleAddFee}
            onRemoveFee={handleRemoveFee}
          />
        </div>
      </div>
    </div>
  );
}

export default CreateQuoteCockpit;
