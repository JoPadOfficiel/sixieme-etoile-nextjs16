/**
 * EUR-Only Currency Utilities
 *
 * This module provides utilities for formatting and parsing EUR amounts.
 * The VTC ERP is EUR-only by design (FR39) - no multi-currency support.
 *
 * @see docs/bmad/prd.md#FR39
 * @see docs/bmad/tech-spec.md - EUR Strategy
 */

import { Decimal } from "@prisma/client/runtime/library";

/**
 * Currency code constant - EUR only
 */
export const CURRENCY_CODE = "EUR" as const;

/**
 * Currency symbol for display
 */
export const CURRENCY_SYMBOL = "€" as const;

/**
 * Default locale for EUR formatting (French)
 */
export const EUR_LOCALE = "fr-FR" as const;

/**
 * Intl.NumberFormat instance for consistent EUR formatting
 * Uses French locale: 1 234,56 €
 */
const eurFormatter = new Intl.NumberFormat(EUR_LOCALE, {
  style: "currency",
  currency: CURRENCY_CODE,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Intl.NumberFormat for parsing (no currency symbol)
 */
const eurNumberFormatter = new Intl.NumberFormat(EUR_LOCALE, {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format a monetary amount in EUR with French locale
 *
 * @param amount - The amount to format (Decimal, number, or string)
 * @returns Formatted string like "1 234,56 €"
 *
 * @example
 * formatEUR(1234.56) // "1 234,56 €"
 * formatEUR(new Decimal("1234.56")) // "1 234,56 €"
 * formatEUR("1234.56") // "1 234,56 €"
 * formatEUR(null) // "0,00 €"
 */
export function formatEUR(
  amount: Decimal | number | string | null | undefined
): string {
  if (amount === null || amount === undefined) {
    return eurFormatter.format(0);
  }

  let numValue: number;

  if (amount instanceof Decimal) {
    numValue = amount.toNumber();
  } else if (typeof amount === "string") {
    numValue = parseFloat(amount);
    if (isNaN(numValue)) {
      return eurFormatter.format(0);
    }
  } else {
    numValue = amount;
  }

  return eurFormatter.format(numValue);
}

/**
 * Format a monetary amount as a number string (no currency symbol)
 * Uses French locale: comma as decimal separator, space as thousands separator
 *
 * @param amount - The amount to format
 * @returns Formatted string like "1 234,56"
 */
export function formatEURNumber(
  amount: Decimal | number | string | null | undefined
): string {
  if (amount === null || amount === undefined) {
    return eurNumberFormatter.format(0);
  }

  let numValue: number;

  if (amount instanceof Decimal) {
    numValue = amount.toNumber();
  } else if (typeof amount === "string") {
    numValue = parseFloat(amount);
    if (isNaN(numValue)) {
      return eurNumberFormatter.format(0);
    }
  } else {
    numValue = amount;
  }

  return eurNumberFormatter.format(numValue);
}

/**
 * Parse a EUR amount string to Decimal
 * Handles French locale input (comma as decimal separator)
 *
 * @param input - User input string like "1234,56" or "1 234,56"
 * @returns Decimal representation
 * @throws Error if input is not a valid number
 *
 * @example
 * parseEUR("1234,56") // Decimal("1234.56")
 * parseEUR("1 234,56") // Decimal("1234.56")
 * parseEUR("1234.56") // Decimal("1234.56") - also accepts period
 */
export function parseEUR(input: string): Decimal {
  if (!input || input.trim() === "") {
    return new Decimal(0);
  }

  // Remove spaces (thousands separator in French locale)
  let normalized = input.replace(/\s/g, "");

  // Remove currency symbol if present
  normalized = normalized.replace(/€/g, "").trim();

  // Replace comma with period for Decimal parsing
  // French uses comma as decimal separator
  normalized = normalized.replace(",", ".");

  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) {
    throw new Error(`Invalid EUR amount: "${input}"`);
  }

  return new Decimal(parsed);
}

/**
 * Validate that an amount is a valid EUR value
 *
 * @param amount - The amount to validate
 * @returns true if valid, false otherwise
 */
export function isValidEURAmount(
  amount: Decimal | number | string | null | undefined
): boolean {
  if (amount === null || amount === undefined) {
    return false;
  }

  try {
    if (amount instanceof Decimal) {
      return amount.isFinite();
    }

    if (typeof amount === "string") {
      const parsed = parseFloat(amount.replace(",", "."));
      return !isNaN(parsed) && isFinite(parsed);
    }

    return isFinite(amount);
  } catch {
    return false;
  }
}

/**
 * Round an amount to 2 decimal places (EUR cents)
 *
 * @param amount - The amount to round
 * @returns Decimal rounded to 2 decimal places
 */
export function roundEUR(amount: Decimal | number | string): Decimal {
  let decimal: Decimal;

  if (amount instanceof Decimal) {
    decimal = amount;
  } else if (typeof amount === "string") {
    decimal = new Decimal(amount.replace(",", "."));
  } else {
    decimal = new Decimal(amount);
  }

  return decimal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Type for monetary response fields - always EUR
 * Used in API response types for clarity
 */
export type EURAmount = {
  /** Amount in EUR (2 decimal places) */
  value: string;
  /** Currency code - always EUR */
  currency: typeof CURRENCY_CODE;
};

/**
 * Create an EURAmount object for API responses
 *
 * @param amount - The amount value
 * @returns EURAmount object with value and currency
 */
export function toEURAmount(
  amount: Decimal | number | string | null | undefined
): EURAmount {
  let value: string;

  if (amount === null || amount === undefined) {
    value = "0.00";
  } else if (amount instanceof Decimal) {
    value = amount.toFixed(2);
  } else if (typeof amount === "string") {
    const parsed = parseFloat(amount.replace(",", "."));
    value = isNaN(parsed) ? "0.00" : parsed.toFixed(2);
  } else {
    value = amount.toFixed(2);
  }

  return {
    value,
    currency: CURRENCY_CODE,
  };
}
