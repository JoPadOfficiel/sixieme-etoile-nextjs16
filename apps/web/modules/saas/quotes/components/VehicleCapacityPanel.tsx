"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { useToast } from "@ui/hooks/use-toast";
import {
  LuggageIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { VehicleCategorySelector } from "./VehicleCategorySelector";
import { getAutoSelectResult } from "../hooks/useScenarioHelpers";
import type { CreateQuoteFormData, VehicleCategory } from "../types";

interface VehicleCapacityPanelProps {
  formData: CreateQuoteFormData;
  onFormChange: <K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => void;
  allCategories: VehicleCategory[];
  disabled?: boolean;
  className?: string;
}

/**
 * VehicleCapacityPanel Component
 * 
 * Contains vehicle category selector and passenger/luggage capacity.
 * This panel is displayed separately from basic trip info.
 * 
 * Story 19.6: Implements automatic vehicle category selection based on capacity.
 * When passenger or luggage count exceeds current category capacity,
 * automatically selects the cheapest suitable category.
 */
export function VehicleCapacityPanel({
  formData,
  onFormChange,
  allCategories,
  disabled = false,
  className,
}: VehicleCapacityPanelProps) {
  const t = useTranslations();
  const { toast } = useToast();
  
  // Story 19.6: Track previous values to detect changes
  const prevPassengerCountRef = useRef(formData.passengerCount);
  const prevLuggageCountRef = useRef(formData.luggageCount);
  // Track if user manually selected a category (to avoid overriding their choice immediately)
  const userManualSelectionRef = useRef(false);

  const handleVehicleCategoryChange = useCallback((categoryId: string, category: VehicleCategory | null) => {
    userManualSelectionRef.current = true;
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
    
    // Reset manual selection flag when capacity changes
    userManualSelectionRef.current = false;
    
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
    } else if (result.reason === "no_suitable_category") {
      // Show error toast when no category can accommodate
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

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("quotes.create.sections.vehicle")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle Category */}
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
  );
}

export default VehicleCapacityPanel;
