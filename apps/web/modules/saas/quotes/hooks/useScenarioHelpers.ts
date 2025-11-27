"use client";

import { useMemo, useCallback } from "react";
import type { VehicleCategory, CreateQuoteFormData } from "../types";

// ============================================================================
// Story 6.6: Scenario Helpers Hook
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
    getApplicableFees: memoizedGetApplicableFees,
  };
}

export default useScenarioHelpers;
