/**
 * Profitability Calculation Utilities
 * 
 * Story 26.10 - Real-time Profitability Computation
 * Epic 26 - Flexible "Yolo Mode" Billing
 * 
 * Provides functions to calculate margin percentage and determine
 * profitability level for visual indicators (badges).
 * 
 * @see ProfitabilityIndicator component
 * @see FR24 Profitability indicator based on selling price vs internal cost
 */

export type ProfitabilityLevel = "green" | "orange" | "red";

/**
 * Default profitability thresholds
 * - Green: margin >= 20% (profitable)
 * - Orange: margin >= 0% but < 20% (low margin)
 * - Red: margin < 0% (loss)
 */
export const DEFAULT_GREEN_THRESHOLD = 20;
export const DEFAULT_ORANGE_THRESHOLD = 0;

/**
 * Calculate margin percentage from selling price and internal cost
 * 
 * Formula: ((sellingPrice - internalCost) / sellingPrice) * 100
 * 
 * @param sellingPrice - The selling price (displayData.total)
 * @param internalCost - The internal cost (sourceData.internalCost)
 * @returns Margin percentage, or null if sellingPrice is 0 (division by zero)
 * 
 * @example
 * calculateMarginPercent(100, 75) // returns 25
 * calculateMarginPercent(80, 100) // returns -25 (loss)
 * calculateMarginPercent(0, 50)   // returns null (division by zero)
 */
export function calculateMarginPercent(
  sellingPrice: number,
  internalCost: number
): number | null {
  // Handle division by zero
  if (sellingPrice === 0) {
    return null;
  }

  // Calculate margin: (Revenue - Cost) / Revenue * 100
  const margin = ((sellingPrice - internalCost) / sellingPrice) * 100;

  return margin;
}

/**
 * Determine profitability level based on margin percentage
 * 
 * @param marginPercent - The margin percentage (can be null)
 * @param greenThreshold - Threshold for green level (default: 20%)
 * @param orangeThreshold - Threshold for orange level (default: 0%)
 * @returns Profitability level: "green", "orange", or "red"
 * 
 * @example
 * getProfitabilityLevel(25, 20, 0)  // returns "green"
 * getProfitabilityLevel(15, 20, 0)  // returns "orange"
 * getProfitabilityLevel(-5, 20, 0)  // returns "red"
 * getProfitabilityLevel(null, 20, 0) // returns "orange" (unknown = warning)
 */
export function getProfitabilityLevel(
  marginPercent: number | null | undefined,
  greenThreshold: number = DEFAULT_GREEN_THRESHOLD,
  orangeThreshold: number = DEFAULT_ORANGE_THRESHOLD
): ProfitabilityLevel {
  // Unknown margin treated as warning
  if (marginPercent === null || marginPercent === undefined) {
    return "orange";
  }

  // Green: profitable (margin >= greenThreshold)
  if (marginPercent >= greenThreshold) {
    return "green";
  }

  // Orange: low margin (margin >= orangeThreshold but < greenThreshold)
  if (marginPercent >= orangeThreshold) {
    return "orange";
  }

  // Red: loss (margin < orangeThreshold)
  return "red";
}

/**
 * Calculate margin and get profitability level in one call
 * 
 * Convenience function that combines calculateMarginPercent and getProfitabilityLevel
 * 
 * @param sellingPrice - The selling price
 * @param internalCost - The internal cost
 * @param greenThreshold - Threshold for green level (default: 20%)
 * @param orangeThreshold - Threshold for orange level (default: 0%)
 * @returns Object with marginPercent and level
 * 
 * @example
 * computeProfitability(100, 75) // { marginPercent: 25, level: "green" }
 */
export function computeProfitability(
  sellingPrice: number,
  internalCost: number,
  greenThreshold: number = DEFAULT_GREEN_THRESHOLD,
  orangeThreshold: number = DEFAULT_ORANGE_THRESHOLD
): { marginPercent: number | null; level: ProfitabilityLevel } {
  const marginPercent = calculateMarginPercent(sellingPrice, internalCost);
  const level = getProfitabilityLevel(marginPercent, greenThreshold, orangeThreshold);

  return { marginPercent, level };
}

/**
 * Format margin percentage for display
 * 
 * @param marginPercent - The margin percentage
 * @param decimals - Number of decimal places (default: 1)
 * @returns Formatted string (e.g., "25.5%") or "—" if null
 */
export function formatMarginPercent(
  marginPercent: number | null | undefined,
  decimals: number = 1
): string {
  if (marginPercent === null || marginPercent === undefined) {
    return "—";
  }

  return `${marginPercent.toFixed(decimals)}%`;
}
