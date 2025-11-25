"use client";

/**
 * EUR Display Component
 *
 * Displays monetary values in EUR with French locale formatting.
 * The VTC ERP is EUR-only by design (FR39).
 *
 * @see docs/bmad/prd.md#FR39
 */

import { cn } from "@ui/lib";

/**
 * Currency code - EUR only
 */
const CURRENCY_CODE = "EUR";

/**
 * French locale for EUR formatting
 */
const EUR_LOCALE = "fr-FR";

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
 * Format options for compact display (no decimals for large amounts)
 */
const eurCompactFormatter = new Intl.NumberFormat(EUR_LOCALE, {
  style: "currency",
  currency: CURRENCY_CODE,
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export interface EURDisplayProps {
  /** Amount to display (number, string, or null/undefined) */
  amount: number | string | null | undefined;
  /** Additional CSS classes */
  className?: string;
  /** Use compact format (no decimals for large amounts) */
  compact?: boolean;
  /** Show sign for positive amounts (+) */
  showPositiveSign?: boolean;
  /** Color coding based on value (green for positive, red for negative) */
  colorCoded?: boolean;
  /** Fallback text when amount is null/undefined */
  fallback?: string;
}

/**
 * Format a monetary amount in EUR with French locale
 */
function formatAmount(
  amount: number | string | null | undefined,
  compact: boolean
): string {
  if (amount === null || amount === undefined) {
    return compact ? eurCompactFormatter.format(0) : eurFormatter.format(0);
  }

  let numValue: number;

  if (typeof amount === "string") {
    // Handle string amounts (may come from API as string for Decimal precision)
    numValue = parseFloat(amount);
    if (isNaN(numValue)) {
      return compact ? eurCompactFormatter.format(0) : eurFormatter.format(0);
    }
  } else {
    numValue = amount;
  }

  return compact
    ? eurCompactFormatter.format(numValue)
    : eurFormatter.format(numValue);
}

/**
 * EURDisplay - Display monetary values in EUR
 *
 * Uses French locale formatting: 1 234,56 €
 *
 * @example
 * <EURDisplay amount={1234.56} /> // "1 234,56 €"
 * <EURDisplay amount="150.00" /> // "150,00 €"
 * <EURDisplay amount={null} fallback="N/A" /> // "N/A"
 * <EURDisplay amount={-50} colorCoded /> // Red text: "-50,00 €"
 */
export function EURDisplay({
  amount,
  className,
  compact = false,
  showPositiveSign = false,
  colorCoded = false,
  fallback,
}: EURDisplayProps) {
  // Handle null/undefined with fallback
  if ((amount === null || amount === undefined) && fallback) {
    return <span className={cn("text-muted-foreground", className)}>{fallback}</span>;
  }

  const numValue =
    typeof amount === "string" ? parseFloat(amount) : amount ?? 0;
  const formatted = formatAmount(amount, compact);

  // Add positive sign if requested
  const displayValue =
    showPositiveSign && numValue > 0 ? `+${formatted}` : formatted;

  // Determine color classes
  let colorClass = "";
  if (colorCoded) {
    if (numValue > 0) {
      colorClass = "text-green-600 dark:text-green-400";
    } else if (numValue < 0) {
      colorClass = "text-red-600 dark:text-red-400";
    }
  }

  return (
    <span
      className={cn("tabular-nums", colorClass, className)}
      title={`${numValue.toFixed(2)} EUR`}
    >
      {displayValue}
    </span>
  );
}

/**
 * EURDisplayInline - Inline variant with smaller styling
 */
export function EURDisplayInline({
  amount,
  className,
  ...props
}: EURDisplayProps) {
  return (
    <EURDisplay
      amount={amount}
      className={cn("text-sm", className)}
      {...props}
    />
  );
}

/**
 * EURDisplayLarge - Large display variant for prominent amounts
 */
export function EURDisplayLarge({
  amount,
  className,
  ...props
}: EURDisplayProps) {
  return (
    <EURDisplay
      amount={amount}
      className={cn("text-2xl font-semibold", className)}
      {...props}
    />
  );
}

export default EURDisplay;
