"use client";

import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import type { VehicleCategory } from "../types";

// ============================================================================
// Story 6.6: Vehicle Categories Hook
// Fetches all vehicle categories for capacity validation and upsell
// ============================================================================

/**
 * API response type (Prisma Decimal fields come as strings)
 */
interface VehicleCategoryApiResponse {
  id: string;
  name: string;
  code: string;
  regulatoryCategory: "LIGHT" | "HEAVY";
  maxPassengers: number;
  maxLuggageVolume: number | null;
  priceMultiplier: string; // Decimal from API
}

interface VehicleCategoriesApiResponse {
  data: VehicleCategoryApiResponse[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Transform API response to VehicleCategory type
 */
function transformCategory(apiCategory: VehicleCategoryApiResponse): VehicleCategory {
  return {
    id: apiCategory.id,
    name: apiCategory.name,
    code: apiCategory.code,
    regulatoryCategory: apiCategory.regulatoryCategory,
    maxPassengers: apiCategory.maxPassengers,
    maxLuggageVolume: apiCategory.maxLuggageVolume,
    priceMultiplier: parseFloat(apiCategory.priceMultiplier) || 1,
  };
}

/**
 * useVehicleCategories Hook
 * 
 * Fetches all vehicle categories for the current organization.
 * Used by scenario helpers to validate capacity and suggest upsells.
 * 
 * @see Story 6.6: Implement Helpers for Common Scenarios
 * @see FR45: Helpers for capacity upsell
 * @see FR60: Vehicle category multipliers
 */
export function useVehicleCategories() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["vehicle-categories-all"],
    queryFn: async () => {
      const response = await apiClient.vtc["vehicle-categories"].$get({
        query: { limit: "50" },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch vehicle categories");
      }
      
      const apiData = await response.json() as VehicleCategoriesApiResponse;
      
      // Transform API response to proper types
      return {
        data: apiData.data.map(transformCategory),
        meta: apiData.meta,
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return {
    categories: data?.data ?? [],
    isLoading,
    error,
  };
}

export default useVehicleCategories;
