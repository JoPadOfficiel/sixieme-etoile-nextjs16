"use client";

import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { AlertTriangleIcon, ArrowRightIcon, UsersIcon, LuggageIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { CapacityWarning } from "../hooks/useScenarioHelpers";

// ============================================================================
// Story 6.6: Capacity Warning Alert Component
// Displays non-blocking warnings when capacity is exceeded with upsell suggestion
// ============================================================================

interface CapacityWarningAlertProps {
  warning: CapacityWarning;
  currentCategoryName: string;
  onApplySuggestion: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Format price delta for display
 */
function formatPriceDelta(delta: number | null): string {
  if (delta === null) return "";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(0)}%`;
}

/**
 * CapacityWarningAlert Component
 * 
 * Displays a non-blocking warning when passenger or luggage capacity
 * exceeds the selected vehicle category, with an upsell suggestion.
 * 
 * Features:
 * - Shows current vs required capacity
 * - Suggests appropriate vehicle category
 * - Displays estimated price delta
 * - One-click upsell application
 * 
 * @see Story 6.6: Implement Helpers for Common Scenarios
 * @see FR45: Helpers for capacity upsell
 * @see FR60: Vehicle category multipliers
 */
export function CapacityWarningAlert({
  warning,
  currentCategoryName,
  onApplySuggestion,
  disabled = false,
  className,
}: CapacityWarningAlertProps) {
  const t = useTranslations();

  const isPassengerWarning = warning.type === "PASSENGER";
  const Icon = isPassengerWarning ? UsersIcon : LuggageIcon;
  
  const warningTitle = isPassengerWarning
    ? t("quotes.helpers.capacity.passengerExceeded")
    : t("quotes.helpers.capacity.luggageExceeded");

  const currentLabel = isPassengerWarning
    ? t("quotes.helpers.capacity.passengersMax", { count: warning.current })
    : t("quotes.helpers.capacity.luggageMax", { count: warning.current });

  const requiredLabel = isPassengerWarning
    ? t("quotes.helpers.capacity.passengersRequired", { count: warning.required })
    : t("quotes.helpers.capacity.luggageRequired", { count: warning.required });

  return (
    <Alert 
      variant="default" 
      className={cn(
        "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30",
        className
      )}
    >
      <AlertTriangleIcon className="size-4 text-amber-600 dark:text-amber-400" />
      <AlertTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
        <Icon className="size-4" />
        {warningTitle}
      </AlertTitle>
      <AlertDescription className="mt-2 space-y-3">
        {/* Current vs Required */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("quotes.helpers.capacity.selected")}:
          </span>
          <Badge variant="secondary">
            {currentCategoryName}
          </Badge>
          <span className="text-muted-foreground">
            ({currentLabel})
          </span>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {t("quotes.helpers.capacity.required")}:
          </span>
          <span className="font-medium text-amber-700 dark:text-amber-300">
            {requiredLabel}
          </span>
        </div>

        {/* Suggestion */}
        {warning.suggestedCategory && (
          <div className="flex items-center justify-between pt-2 border-t border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {t("quotes.helpers.capacity.suggested")}:
              </span>
              <Badge variant="outline" className="font-medium">
                {warning.suggestedCategory.name}
              </Badge>
              {warning.suggestedCategory.maxPassengers && (
                <span className="text-xs text-muted-foreground">
                  ({warning.suggestedCategory.maxPassengers} {t("quotes.helpers.capacity.passengers")})
                </span>
              )}
              {warning.priceDelta !== null && (
                <Badge 
                  variant={warning.priceDelta > 0 ? "default" : "secondary"}
                  className={cn(
                    "text-xs",
                    warning.priceDelta > 0 
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : ""
                  )}
                >
                  {formatPriceDelta(warning.priceDelta)}
                </Badge>
              )}
            </div>
            
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onApplySuggestion}
              disabled={disabled}
              className="gap-1"
            >
              {t("quotes.helpers.capacity.applySuggestion")}
              <ArrowRightIcon className="size-3" />
            </Button>
          </div>
        )}

        {/* No suggestion available */}
        {!warning.suggestedCategory && (
          <div className="text-sm text-amber-700 dark:text-amber-300 pt-2 border-t border-amber-200 dark:border-amber-800">
            {t("quotes.helpers.capacity.noSuggestion")}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default CapacityWarningAlert;
