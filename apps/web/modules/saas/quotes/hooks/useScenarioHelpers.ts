"use client";

import { useMemo, useCallback } from "react";
import type { VehicleCategory, CreateQuoteFormData } from "../types";

// ============================================================================
// Story 6.6: Scenario Helpers Hook
// Story 19.6: Automatic Vehicle Category Selection Based on Capacity
// Provides airport detection and capacity validation for quote creation
// ============================================================================

/**
 * Airport detection patterns for French airports
 * Matches common airport names and keywords
 */
const AIRPORT_PATTERNS = [
  /CDG/i,
  /Roissy/i,
  /Charles[\s-]?de[\s-]?Gaulle/i,
  /Orly/i,
  /Le[\s-]?Bourget/i,
  /aéroport/i,
  /airport/i,
  /Terminal\s*\d/i,
];

/**
 * Estimated volume per luggage item in liters
 * Standard suitcase ≈ 50L
 */
const LUGGAGE_VOLUME_LITERS = 50;

/**
 * Capacity warning types
 */
export type CapacityWarningType = "PASSENGER" | "LUGGAGE";

/**
 * Capacity warning structure
 */
export interface CapacityWarning {
  type: CapacityWarningType;
  current: number;
  required: number;
  suggestedCategory: VehicleCategory | null;
  priceDelta: number | null;
}

/**
 * Airport detection result
 */
export interface AirportDetection {
  isAirportTransfer: boolean;
  detectedAirport: "CDG" | "ORLY" | "LE_BOURGET" | "OTHER" | null;
  isPickupAirport: boolean;
  isDropoffAirport: boolean;
}

/**
 * Optional fee with auto-apply rules
 */
export interface OptionalFeeWithRules {
  id: string;
  name: string;
  description: string | null;
  amountType: "FIXED" | "PERCENTAGE";
  amount: number;
  isTaxable: boolean;
  vatRate: number;
  autoApplyRules: AutoApplyRules | null;
  vehicleCategoryIds?: string[];
}

/**
 * Auto-apply rules structure for optional fees
 */
export interface AutoApplyRules {
  triggers: Array<{
    type: "airport" | "night" | "weekend" | "distance";
    condition?: {
      minDistance?: number;
      airports?: string[];
    };
  }>;
}

/**
 * Story 19.6: Auto-selection result
 */
export interface AutoSelectResult {
  shouldAutoSelect: boolean;
  selectedCategory: VehicleCategory | null;
  reason: "capacity_exceeded" | "no_change" | "no_suitable_category";
  previousCategoryName?: string;
}

/**
 * Scenario helpers result
 */
export interface ScenarioHelpersResult {
  // Airport detection
  airportDetection: AirportDetection;
  isAirportAddress: (address: string) => boolean;
  detectAirportType: (address: string) => "CDG" | "ORLY" | "LE_BOURGET" | "OTHER" | null;
  
  // Capacity validation
  capacityWarning: CapacityWarning | null;
  checkCapacity: (
    passengerCount: number,
    luggageCount: number,
    category: VehicleCategory | null,
    allCategories: VehicleCategory[]
  ) => CapacityWarning | null;
  findSuitableCategory: (
    passengerCount: number,
    luggageCount: number,
    categories: VehicleCategory[],
    currentCategory: VehicleCategory | null
  ) => VehicleCategory | null;
  
  // Story 19.6: Automatic category selection
  findOptimalCategory: (
    passengerCount: number,
    luggageCount: number,
    categories: VehicleCategory[]
  ) => VehicleCategory | null;
  getAutoSelectResult: (
    passengerCount: number,
    luggageCount: number,
    currentCategory: VehicleCategory | null,
    allCategories: VehicleCategory[]
  ) => AutoSelectResult;
  
  // Fee helpers
  getApplicableFees: (
    fees: OptionalFeeWithRules[],
    airportDetection: AirportDetection
  ) => OptionalFeeWithRules[];
}

/**
 * Check if an address is an airport address
 */
export function isAirportAddress(address: string): boolean {
  if (!address) return false;
  return AIRPORT_PATTERNS.some(pattern => pattern.test(address));
}

/**
 * Detect which airport from address
 */
export function detectAirportType(address: string): "CDG" | "ORLY" | "LE_BOURGET" | "OTHER" | null {
  if (!address) return null;
  
  if (/CDG|ROISSY|CHARLES[\s-]?DE[\s-]?GAULLE/i.test(address)) {
    return "CDG";
  }
  if (/ORLY/i.test(address)) {
    return "ORLY";
  }
  if (/LE[\s-]?BOURGET/i.test(address)) {
    return "LE_BOURGET";
  }
  if (/AÉROPORT|AIRPORT|TERMINAL/i.test(address)) {
    return "OTHER";
  }
  
  return null;
}

/**
 * Check capacity against vehicle category
 */
export function checkCapacity(
  passengerCount: number,
  luggageCount: number,
  category: VehicleCategory | null,
  allCategories: VehicleCategory[]
): CapacityWarning | null {
  if (!category) return null;
  
  // Check passenger capacity
  if (passengerCount > category.maxPassengers) {
    const suggestedCategory = findSuitableCategory(
      passengerCount,
      luggageCount,
      allCategories,
      category
    );
    
    return {
      type: "PASSENGER",
      current: category.maxPassengers,
      required: passengerCount,
      suggestedCategory,
      priceDelta: suggestedCategory 
        ? calculatePriceDelta(category, suggestedCategory)
        : null,
    };
  }
  
  // Check luggage capacity (if defined)
  const maxLuggageVolume = category.maxLuggageVolume;
  if (maxLuggageVolume && luggageCount * LUGGAGE_VOLUME_LITERS > maxLuggageVolume) {
    const suggestedCategory = findSuitableCategory(
      passengerCount,
      luggageCount,
      allCategories,
      category
    );
    
    return {
      type: "LUGGAGE",
      current: Math.floor(maxLuggageVolume / LUGGAGE_VOLUME_LITERS),
      required: luggageCount,
      suggestedCategory,
      priceDelta: suggestedCategory 
        ? calculatePriceDelta(category, suggestedCategory)
        : null,
    };
  }
  
  return null;
}

/**
 * Find the smallest suitable category for given capacity requirements
 */
export function findSuitableCategory(
  passengerCount: number,
  luggageCount: number,
  categories: VehicleCategory[],
  currentCategory: VehicleCategory | null
): VehicleCategory | null {
  // Sort by maxPassengers ascending to find smallest suitable
  const sortedCategories = [...categories].sort(
    (a, b) => a.maxPassengers - b.maxPassengers
  );
  
  const requiredLuggageVolume = luggageCount * LUGGAGE_VOLUME_LITERS;
  
  for (const category of sortedCategories) {
    // Skip current category
    if (currentCategory && category.id === currentCategory.id) continue;
    
    // Check if category meets requirements
    const meetsPassengerReq = category.maxPassengers >= passengerCount;
    const meetsLuggageReq = !category.maxLuggageVolume || 
      category.maxLuggageVolume >= requiredLuggageVolume;
    
    if (meetsPassengerReq && meetsLuggageReq) {
      return category;
    }
  }
  
  return null;
}

/**
 * Story 19.6: Find the optimal (cheapest) category that meets capacity requirements
 * Sorts by priceMultiplier to find the least expensive option
 * 
 * @param passengerCount - Number of passengers required
 * @param luggageCount - Number of luggage items required
 * @param categories - All available vehicle categories
 * @returns The cheapest category that meets requirements, or null if none found
 */
export function findOptimalCategory(
  passengerCount: number,
  luggageCount: number,
  categories: VehicleCategory[]
): VehicleCategory | null {
  const requiredLuggageVolume = luggageCount * LUGGAGE_VOLUME_LITERS;
  
  // Filter categories that meet capacity requirements
  const suitableCategories = categories.filter(category => {
    const meetsPassengerReq = category.maxPassengers >= passengerCount;
    const meetsLuggageReq = !category.maxLuggageVolume || 
      category.maxLuggageVolume >= requiredLuggageVolume;
    return meetsPassengerReq && meetsLuggageReq;
  });
  
  if (suitableCategories.length === 0) return null;
  
  // Sort by priceMultiplier ascending (cheapest first)
  const sortedByPrice = [...suitableCategories].sort((a, b) => {
    const multiplierA = typeof a.priceMultiplier === 'string' 
      ? parseFloat(a.priceMultiplier) || 1 
      : a.priceMultiplier || 1;
    const multiplierB = typeof b.priceMultiplier === 'string' 
      ? parseFloat(b.priceMultiplier) || 1 
      : b.priceMultiplier || 1;
    return multiplierA - multiplierB;
  });
  
  return sortedByPrice[0];
}

/**
 * Story 19.6: Determine if auto-selection should occur and which category to select
 * Only triggers when current category is insufficient (no automatic downgrade)
 * 
 * @param passengerCount - Number of passengers required
 * @param luggageCount - Number of luggage items required  
 * @param currentCategory - Currently selected category (can be null)
 * @param allCategories - All available vehicle categories
 * @returns AutoSelectResult with selection decision and reason
 */
export function getAutoSelectResult(
  passengerCount: number,
  luggageCount: number,
  currentCategory: VehicleCategory | null,
  allCategories: VehicleCategory[]
): AutoSelectResult {
  // If no current category, find optimal
  if (!currentCategory) {
    const optimal = findOptimalCategory(passengerCount, luggageCount, allCategories);
    if (optimal) {
      return {
        shouldAutoSelect: true,
        selectedCategory: optimal,
        reason: "capacity_exceeded",
      };
    }
    return {
      shouldAutoSelect: false,
      selectedCategory: null,
      reason: "no_suitable_category",
    };
  }
  
  const requiredLuggageVolume = luggageCount * LUGGAGE_VOLUME_LITERS;
  
  // Check if current category meets requirements
  const meetsPassengerReq = currentCategory.maxPassengers >= passengerCount;
  const meetsLuggageReq = !currentCategory.maxLuggageVolume || 
    currentCategory.maxLuggageVolume >= requiredLuggageVolume;
  
  // If current category is sufficient, no change needed
  if (meetsPassengerReq && meetsLuggageReq) {
    return {
      shouldAutoSelect: false,
      selectedCategory: currentCategory,
      reason: "no_change",
    };
  }
  
  // Current category is insufficient, find optimal replacement
  const optimal = findOptimalCategory(passengerCount, luggageCount, allCategories);
  
  if (optimal) {
    return {
      shouldAutoSelect: true,
      selectedCategory: optimal,
      reason: "capacity_exceeded",
      previousCategoryName: currentCategory.name,
    };
  }
  
  // No suitable category found
  return {
    shouldAutoSelect: false,
    selectedCategory: null,
    reason: "no_suitable_category",
    previousCategoryName: currentCategory.name,
  };
}

/**
 * Calculate price delta between two categories
 * Returns percentage difference based on priceMultiplier
 */
function calculatePriceDelta(
  currentCategory: VehicleCategory,
  newCategory: VehicleCategory
): number {
  const currentMultiplier = Number(currentCategory.priceMultiplier) || 1;
  const newMultiplier = Number(newCategory.priceMultiplier) || 1;
  
  // Return percentage difference
  return ((newMultiplier - currentMultiplier) / currentMultiplier) * 100;
}

/**
 * Get fees that should auto-apply based on scenario
 */
export function getApplicableFees(
  fees: OptionalFeeWithRules[],
  airportDetection: AirportDetection
): OptionalFeeWithRules[] {
  if (!airportDetection.isAirportTransfer) return [];
  
  return fees.filter(fee => {
    if (!fee.autoApplyRules?.triggers) return false;
    
    return fee.autoApplyRules.triggers.some(trigger => {
      if (trigger.type === "airport") {
        // If specific airports are defined, check if detected airport matches
        if (trigger.condition?.airports && airportDetection.detectedAirport) {
          return trigger.condition.airports.includes(airportDetection.detectedAirport);
        }
        // Otherwise, apply to any airport
        return true;
      }
      return false;
    });
  });
}

/**
 * useScenarioHelpers Hook
 * 
 * Provides scenario detection and helpers for quote creation:
 * - Airport transfer detection
 * - Capacity validation with upsell suggestions
 * - Auto-applicable optional fees
 * 
 * @see Story 6.6: Implement Helpers for Common Scenarios
 * @see FR45: Helpers for airport transfers and capacity upsell
 */
export function useScenarioHelpers(
  formData: CreateQuoteFormData,
  allCategories: VehicleCategory[]
): ScenarioHelpersResult {
  // Detect airport from addresses
  const airportDetection = useMemo<AirportDetection>(() => {
    const isPickupAirport = isAirportAddress(formData.pickupAddress);
    const isDropoffAirport = isAirportAddress(formData.dropoffAddress);
    const isAirportTransfer = isPickupAirport || isDropoffAirport;
    
    let detectedAirport: "CDG" | "ORLY" | "LE_BOURGET" | "OTHER" | null = null;
    if (isPickupAirport) {
      detectedAirport = detectAirportType(formData.pickupAddress);
    } else if (isDropoffAirport) {
      detectedAirport = detectAirportType(formData.dropoffAddress);
    }
    
    return {
      isAirportTransfer,
      detectedAirport,
      isPickupAirport,
      isDropoffAirport,
    };
  }, [formData.pickupAddress, formData.dropoffAddress]);
  
  // Check capacity
  const capacityWarning = useMemo<CapacityWarning | null>(() => {
    return checkCapacity(
      formData.passengerCount,
      formData.luggageCount,
      formData.vehicleCategory,
      allCategories
    );
  }, [
    formData.passengerCount,
    formData.luggageCount,
    formData.vehicleCategory,
    allCategories,
  ]);
  
  // Memoized helper functions
  const memoizedCheckCapacity = useCallback(
    (
      passengerCount: number,
      luggageCount: number,
      category: VehicleCategory | null,
      categories: VehicleCategory[]
    ) => checkCapacity(passengerCount, luggageCount, category, categories),
    []
  );
  
  const memoizedFindSuitableCategory = useCallback(
    (
      passengerCount: number,
      luggageCount: number,
      categories: VehicleCategory[],
      currentCategory: VehicleCategory | null
    ) => findSuitableCategory(passengerCount, luggageCount, categories, currentCategory),
    []
  );
  
  // Story 19.6: Memoized optimal category finder
  const memoizedFindOptimalCategory = useCallback(
    (
      passengerCount: number,
      luggageCount: number,
      categories: VehicleCategory[]
    ) => findOptimalCategory(passengerCount, luggageCount, categories),
    []
  );
  
  // Story 19.6: Memoized auto-select result getter
  const memoizedGetAutoSelectResult = useCallback(
    (
      passengerCount: number,
      luggageCount: number,
      currentCategory: VehicleCategory | null,
      categories: VehicleCategory[]
    ) => getAutoSelectResult(passengerCount, luggageCount, currentCategory, categories),
    []
  );
  
  const memoizedGetApplicableFees = useCallback(
    (fees: OptionalFeeWithRules[], detection: AirportDetection) =>
      getApplicableFees(fees, detection),
    []
  );
  
  return {
    airportDetection,
    isAirportAddress,
    detectAirportType,
    capacityWarning,
    checkCapacity: memoizedCheckCapacity,
    findSuitableCategory: memoizedFindSuitableCategory,
    findOptimalCategory: memoizedFindOptimalCategory,
    getAutoSelectResult: memoizedGetAutoSelectResult,
    getApplicableFees: memoizedGetApplicableFees,
  };
}

export default useScenarioHelpers;
