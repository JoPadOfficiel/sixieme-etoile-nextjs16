"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
  LuggageIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { VehicleCategorySelector } from "./VehicleCategorySelector";
import type { CreateQuoteFormData, VehicleCategory } from "../types";

interface VehicleCapacityPanelProps {
  formData: CreateQuoteFormData;
  onFormChange: <K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * VehicleCapacityPanel Component
 * 
 * Contains vehicle category selector and passenger/luggage capacity.
 * This panel is displayed separately from basic trip info.
 */
export function VehicleCapacityPanel({
  formData,
  onFormChange,
  disabled = false,
  className,
}: VehicleCapacityPanelProps) {
  const t = useTranslations();

  const handleVehicleCategoryChange = (categoryId: string, category: VehicleCategory | null) => {
    onFormChange("vehicleCategoryId", categoryId);
    onFormChange("vehicleCategory", category);
  };

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
