"use client";

import { Badge } from "@ui/components/badge";
import { Label } from "@ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { Skeleton } from "@ui/components/skeleton";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { CarIcon, TruckIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { VehicleCategory } from "../types";

interface VehicleCategorySelectorProps {
  value: string;
  onChange: (categoryId: string, category: VehicleCategory | null) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface VehicleCategoriesResponse {
  data: VehicleCategory[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * VehicleCategorySelector Component
 * 
 * Select dropdown for vehicle categories with regulatory category indicator.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 */
export function VehicleCategorySelector({
  value,
  onChange,
  disabled = false,
  required = false,
  className,
}: VehicleCategorySelectorProps) {
  const t = useTranslations();

  // Fetch vehicle categories
  const { data, isLoading } = useQuery({
    queryKey: ["vehicle-categories"],
    queryFn: async () => {
      const response = await apiClient.vtc["vehicle-categories"].$get({
        query: { limit: "50" },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch vehicle categories");
      }
      return response.json() as Promise<VehicleCategoriesResponse>;
    },
  });

  const categories = data?.data ?? [];

  const handleChange = (categoryId: string) => {
    const category = categories.find((c) => c.id === categoryId) ?? null;
    onChange(categoryId, category);
  };

  const selectedCategory = categories.find((c) => c.id === value);

  if (isLoading) {
    return (
      <div className={cn("space-y-2", className)}>
        <Label>
          {t("quotes.create.vehicleCategory")}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {t("quotes.create.vehicleCategory")}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Select value={value} onValueChange={handleChange} disabled={disabled}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t("quotes.create.selectVehicleCategory")}>
            {selectedCategory && (
              <div className="flex items-center gap-2">
                {selectedCategory.regulatoryCategory === "HEAVY" ? (
                  <TruckIcon className="size-4 text-muted-foreground" />
                ) : (
                  <CarIcon className="size-4 text-muted-foreground" />
                )}
                <span>{selectedCategory.name}</span>
                <Badge
                  variant={
                    selectedCategory.regulatoryCategory === "HEAVY"
                      ? "destructive"
                      : "secondary"
                  }
                  className="text-xs"
                >
                  {selectedCategory.regulatoryCategory}
                </Badge>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {categories.length === 0 ? (
            <div className="p-2 text-sm text-muted-foreground text-center">
              {t("quotes.create.noVehicleCategories")}
            </div>
          ) : (
            categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                <div className="flex items-center gap-2">
                  {category.regulatoryCategory === "HEAVY" ? (
                    <TruckIcon className="size-4 text-muted-foreground" />
                  ) : (
                    <CarIcon className="size-4 text-muted-foreground" />
                  )}
                  <span>{category.name}</span>
                  <Badge
                    variant={
                      category.regulatoryCategory === "HEAVY"
                        ? "destructive"
                        : "secondary"
                    }
                    className="text-xs ml-auto"
                  >
                    {category.regulatoryCategory}
                  </Badge>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default VehicleCategorySelector;
