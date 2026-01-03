"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useToast } from "@ui/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import {
  CalendarIcon,
  LuggageIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { cn } from "@ui/lib";
import { AddressAutocomplete } from "@saas/shared/components/AddressAutocomplete";
import { ContactSelector } from "./ContactSelector";
import { VehicleCategorySelector } from "./VehicleCategorySelector";
import { TripTypeFormFields } from "./TripTypeFormFields";
import { getAutoSelectResult } from "../hooks/useScenarioHelpers";
import type { CreateQuoteFormData, TripType, Contact, VehicleCategory, AddressWithCoordinates } from "../types";

interface QuoteBasicInfoPanelProps {
  formData: CreateQuoteFormData;
  onFormChange: <K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => void;
  allCategories: VehicleCategory[];
  disabled?: boolean;
  className?: string;
}

const TRIP_TYPES: TripType[] = ["TRANSFER", "EXCURSION", "DISPO", "OFF_GRID", "STAY"];

/**
 * QuoteBasicInfoPanel Component
 * 
 * Left column of the Create Quote cockpit.
 * Contains contact selector, trip type, addresses, datetime, vehicle category, and capacity.
 * 
 * Story 19.6: Implements automatic vehicle category selection based on capacity.
 * When passenger or luggage count exceeds current category capacity,
 * automatically selects the cheapest suitable category.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see Story 19.6: Automatic Vehicle Category Selection
 * @see UX Spec 8.3.2 Create Quote - Left Column
 */
export function QuoteBasicInfoPanel({
  formData,
  onFormChange,
  allCategories,
  disabled = false,
  className,
}: QuoteBasicInfoPanelProps) {
  const t = useTranslations();
  const { toast } = useToast();
  
  // Story 19.6: Track previous values to detect changes
  const prevPassengerCountRef = useRef(formData.passengerCount);
  const prevLuggageCountRef = useRef(formData.luggageCount);

  const handleContactChange = (contact: Contact | null) => {
    onFormChange("contact", contact);
    onFormChange("contactId", contact?.id ?? "");
  };

  const handlePickupChange = (result: AddressWithCoordinates) => {
    onFormChange("pickupAddress", result.address);
    onFormChange("pickupLatitude", result.latitude);
    onFormChange("pickupLongitude", result.longitude);
  };

  const handleDropoffChange = (result: AddressWithCoordinates) => {
    onFormChange("dropoffAddress", result.address);
    onFormChange("dropoffLatitude", result.latitude);
    onFormChange("dropoffLongitude", result.longitude);
  };

  const handleVehicleCategoryChange = useCallback((categoryId: string, category: VehicleCategory | null) => {
    onFormChange("vehicleCategoryId", categoryId);
    onFormChange("vehicleCategory", category);
  }, [onFormChange]);
  
  // Story 19.6: Auto-select vehicle category when capacity changes
  useEffect(() => {
    const passengerChanged = prevPassengerCountRef.current !== formData.passengerCount;
    const luggageChanged = prevLuggageCountRef.current !== formData.luggageCount;
    
    // Update refs
    prevPassengerCountRef.current = formData.passengerCount;
    prevLuggageCountRef.current = formData.luggageCount;
    
    // Only auto-select if capacity actually changed and we have categories
    if (!passengerChanged && !luggageChanged) return;
    if (allCategories.length === 0) return;
    
    const result = getAutoSelectResult(
      formData.passengerCount,
      formData.luggageCount,
      formData.vehicleCategory,
      allCategories
    );
    
    if (result.shouldAutoSelect && result.selectedCategory) {
      // Auto-select the optimal category
      onFormChange("vehicleCategoryId", result.selectedCategory.id);
      onFormChange("vehicleCategory", result.selectedCategory);
      
      // Show toast notification
      if (result.previousCategoryName) {
        toast({
          title: t("quotes.helpers.capacity.autoSelected"),
          description: t("quotes.helpers.capacity.autoSelectedDescription", {
            from: result.previousCategoryName,
            to: result.selectedCategory.name,
          }),
        });
      } else {
        toast({
          title: t("quotes.helpers.capacity.autoSelected"),
          description: t("quotes.helpers.capacity.categorySelected", {
            category: result.selectedCategory.name,
          }),
        });
      }
    } else if (result.reason === "no_suitable_category" && formData.vehicleCategory) {
      // Show error toast when no category can accommodate (only if a category was already selected)
      toast({
        title: t("quotes.helpers.capacity.noSuitableCategory"),
        description: t("quotes.helpers.capacity.noSuitableCategoryDescription", {
          passengers: formData.passengerCount,
        }),
        variant: "error",
      });
    }
  }, [
    formData.passengerCount,
    formData.luggageCount,
    formData.vehicleCategory,
    allCategories,
    onFormChange,
    toast,
    t,
  ]);

  const handleDateTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Parse as local time (Europe/Paris business time)
      onFormChange("pickupAt", new Date(value));
    } else {
      onFormChange("pickupAt", null);
    }
  };

  // Format date for datetime-local input
  const formatDateTimeLocal = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Contact Selection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("quotes.create.sections.client")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ContactSelector
            value={formData.contact}
            onChange={handleContactChange}
            disabled={disabled}
            required
          />
        </CardContent>
      </Card>

      {/* Trip & Vehicle Details - Story 19.10: Merged cards */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("quotes.create.sections.tripAndVehicle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Trip Type */}
          <div className="space-y-2">
            <Label>{t("quotes.create.tripType")} *</Label>
            <Select
              value={formData.tripType}
              data-testid="trip-type-select"
              onValueChange={(value) => onFormChange("tripType", value as TripType)}
              disabled={disabled}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRIP_TYPES.map((type) => (
                  <SelectItem key={type} value={type} data-testid={`trip-type-option-${type.toLowerCase()}`}>
                    {t(`quotes.create.tripTypes.${type.toLowerCase()}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Pickup Address */}
          <AddressAutocomplete
            id="pickup"
            label={t("quotes.create.pickup")}
            value={formData.pickupAddress}
            onChange={handlePickupChange}
            placeholder={t("quotes.create.pickupPlaceholder")}
            disabled={disabled}
            required
          />

          {/* Dropoff Address - Conditional based on trip type */}
          {/* DISPO: Hidden, STAY: Hidden (managed in StayFormFields), OFF_GRID: Optional, Others: Required */}
          {formData.tripType !== "DISPO" && formData.tripType !== "STAY" && (
            <AddressAutocomplete
              id="dropoff"
              label={
                formData.tripType === "OFF_GRID"
                  ? t("quotes.create.tripTypeFields.dropoffOptional")
                  : t("quotes.create.dropoff")
              }
              value={formData.dropoffAddress}
              onChange={handleDropoffChange}
              placeholder={t("quotes.create.dropoffPlaceholder")}
              disabled={disabled}
              required={formData.tripType !== "OFF_GRID"}
            />
          )}

          {/* Trip Type Specific Fields */}
          <TripTypeFormFields
            tripType={formData.tripType}
            formData={formData}
            onFormChange={onFormChange}
            disabled={disabled}
          />

          {/* Pickup DateTime */}
          <div className="space-y-2">
            <Label htmlFor="pickupAt">
              {t("quotes.create.pickupDateTime")} *
            </Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="pickupAt"
                type="datetime-local"
                value={formatDateTimeLocal(formData.pickupAt)}
                onChange={handleDateTimeChange}
                disabled={disabled}
                className="pl-9"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {t("quotes.create.pickupDateTimeHint")}
            </p>
          </div>

          {/* Story 19.10: Visual separator between trip and vehicle sections */}
          <hr className="my-4 border-border" />

          {/* Vehicle Category - Story 19.10: Moved from separate card */}
          <VehicleCategorySelector
            value={formData.vehicleCategoryId}
            onChange={handleVehicleCategoryChange}
            disabled={disabled}
            required
          />

          {/* Passenger & Luggage Count */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="passengerCount">
                {t("quotes.create.passengers")} *
              </Label>
              <div className="relative">
                <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="passengerCount"
                  type="number"
                  min={1}
                  max={50}
                  value={formData.passengerCount}
                  onChange={(e) =>
                    onFormChange("passengerCount", parseInt(e.target.value) || 1)
                  }
                  disabled={disabled}
                  className="pl-9"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="luggageCount">
                {t("quotes.create.luggage")}
              </Label>
              <div className="relative">
                <LuggageIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  id="luggageCount"
                  type="number"
                  min={0}
                  max={50}
                  value={formData.luggageCount}
                  onChange={(e) =>
                    onFormChange("luggageCount", parseInt(e.target.value) || 0)
                  }
                  disabled={disabled}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default QuoteBasicInfoPanel;
