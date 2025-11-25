"use client";

/**
 * EUR Input Component
 *
 * Input component for EUR monetary values with French locale formatting.
 * Handles input validation, formatting on blur, and parsing.
 *
 * @see docs/bmad/prd.md#FR39
 */

import * as React from "react";
import { cn } from "@ui/lib";
import { Input } from "@ui/components/input";

/**
 * Currency symbol for display
 */
const CURRENCY_SYMBOL = "€";

/**
 * French locale for number formatting
 */
const EUR_LOCALE = "fr-FR";

/**
 * Format number for display (French locale)
 */
function formatForDisplay(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return "";
  }

  return new Intl.NumberFormat(EUR_LOCALE, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/**
 * Parse French locale formatted string to number
 * Handles: "1 234,56" -> 1234.56
 */
function parseFromDisplay(input: string): number | null {
  if (!input || input.trim() === "") {
    return null;
  }

  // Remove spaces (thousands separator) and currency symbol
  let normalized = input.replace(/\s/g, "").replace(/€/g, "").trim();

  // Replace comma with period for parsing
  normalized = normalized.replace(",", ".");

  const parsed = parseFloat(normalized);
  return isNaN(parsed) ? null : parsed;
}

export interface EURInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  /** Current value in number format */
  value: number | null | undefined;
  /** Called when value changes (number or null) */
  onChange: (value: number | null) => void;
  /** Minimum allowed value */
  min?: number;
  /** Maximum allowed value */
  max?: number;
  /** Allow negative values */
  allowNegative?: boolean;
  /** Show currency symbol */
  showSymbol?: boolean;
  /** Additional class for the wrapper */
  wrapperClassName?: string;
  /** Error state */
  error?: boolean;
}

/**
 * EURInput - Input component for EUR monetary values
 *
 * Features:
 * - French locale formatting on blur (1 234,56)
 * - Numeric validation
 * - Optional min/max constraints
 * - Currency symbol display
 *
 * @example
 * const [price, setPrice] = useState<number | null>(null);
 * <EURInput value={price} onChange={setPrice} min={0} />
 */
export function EURInput({
  value,
  onChange,
  min,
  max,
  allowNegative = false,
  showSymbol = true,
  wrapperClassName,
  className,
  error,
  disabled,
  ...props
}: EURInputProps) {
  // Internal state for the input string
  const [displayValue, setDisplayValue] = React.useState<string>(() =>
    formatForDisplay(value ?? undefined)
  );
  const [isFocused, setIsFocused] = React.useState(false);

  // Update display when external value changes (and not focused)
  React.useEffect(() => {
    if (!isFocused) {
      setDisplayValue(formatForDisplay(value ?? undefined));
    }
  }, [value, isFocused]);

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    // On focus, show raw number for easier editing
    if (value !== null && value !== undefined) {
      setDisplayValue(value.toString().replace(".", ","));
    }
    props.onFocus?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);

    // Parse and validate
    const parsed = parseFromDisplay(displayValue);

    if (parsed === null) {
      onChange(null);
      setDisplayValue("");
      props.onBlur?.(e);
      return;
    }

    // Apply constraints
    let finalValue = parsed;

    if (!allowNegative && finalValue < 0) {
      finalValue = 0;
    }

    if (min !== undefined && finalValue < min) {
      finalValue = min;
    }

    if (max !== undefined && finalValue > max) {
      finalValue = max;
    }

    // Round to 2 decimal places
    finalValue = Math.round(finalValue * 100) / 100;

    onChange(finalValue);
    setDisplayValue(formatForDisplay(finalValue));
    props.onBlur?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value;

    // Allow empty input
    if (input === "") {
      setDisplayValue("");
      return;
    }

    // Allow valid number characters (digits, comma, period, minus for negative, spaces)
    const validPattern = allowNegative
      ? /^-?[\d\s]*[,.]?[\d]*$/
      : /^[\d\s]*[,.]?[\d]*$/;

    if (validPattern.test(input)) {
      setDisplayValue(input);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Allow: backspace, delete, tab, escape, enter
    if (
      ["Backspace", "Delete", "Tab", "Escape", "Enter"].includes(e.key) ||
      // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
      (e.ctrlKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) ||
      // Allow: Cmd+A, Cmd+C, Cmd+V, Cmd+X (Mac)
      (e.metaKey && ["a", "c", "v", "x"].includes(e.key.toLowerCase())) ||
      // Allow: home, end, arrows
      ["Home", "End", "ArrowLeft", "ArrowRight"].includes(e.key)
    ) {
      return;
    }

    // Block non-numeric keys (except comma/period for decimals, minus for negative)
    const allowedKeys = allowNegative
      ? /^[\d,.\-]$/
      : /^[\d,.]$/;

    if (!allowedKeys.test(e.key)) {
      e.preventDefault();
    }

    props.onKeyDown?.(e);
  };

  return (
    <div className={cn("relative", wrapperClassName)}>
      <Input
        {...props}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={cn(
          "tabular-nums",
          showSymbol && "pr-8",
          error && "border-red-500 focus-visible:ring-red-500",
          className
        )}
        aria-invalid={error}
      />
      {showSymbol && (
        <span
          className={cn(
            "absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none",
            disabled && "opacity-50"
          )}
        >
          {CURRENCY_SYMBOL}
        </span>
      )}
    </div>
  );
}

export default EURInput;
