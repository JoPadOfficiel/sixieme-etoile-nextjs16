"use client";

import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import {
  AlertTriangleIcon,
  ClockIcon,
  TimerIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { ComplianceWarning, ComplianceWarningType } from "../types";

interface ComplianceWarningAlertProps {
  warnings: ComplianceWarning[];
  className?: string;
  compact?: boolean;
}

/**
 * Get icon for warning type
 */
function getWarningIcon(type: ComplianceWarningType) {
  switch (type) {
    case "APPROACHING_LIMIT":
      return ClockIcon;
    case "BREAK_RECOMMENDED":
      return TimerIcon;
    default:
      return AlertTriangleIcon;
  }
}

/**
 * Get progress bar color based on percentage
 */
function getProgressColor(percent: number): string {
  if (percent >= 95) return "bg-destructive";
  if (percent >= 90) return "bg-amber-500";
  return "bg-amber-400";
}

/**
 * Format value with unit for display
 */
function formatValueWithUnit(value: number, limit: number): string {
  // Infer unit from context - values > 100 are likely minutes
  if (value > 100) {
    return `${value}min / ${limit}min`;
  }
  return `${value.toFixed(1)}h / ${limit}h`;
}

/**
 * ComplianceWarningAlert Component
 * 
 * Inline warning alert for non-blocking compliance issues.
 * Displays when approaching RSE limits or for other soft constraints.
 * 
 * @see Story 6.5: Implement Blocking and Non-Blocking Alerts
 * @see FR24: Profitability indicator (extends to compliance warnings)
 */
export function ComplianceWarningAlert({
  warnings,
  className,
  compact = false,
}: ComplianceWarningAlertProps) {
  const t = useTranslations();

  if (warnings.length === 0) {
    return null;
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2 text-amber-600", className)}>
        <AlertTriangleIcon className="size-4" />
        <span className="text-sm">
          {t("quotes.compliance.warnings.count", { count: warnings.length })}
        </span>
      </div>
    );
  }

  return (
    <Alert
      variant="default"
      className={cn(
        "border-amber-500/30 bg-amber-50 dark:bg-amber-950/20",
        className
      )}
    >
      <AlertTriangleIcon className="size-5 text-amber-600" />
      <AlertTitle className="text-amber-800 dark:text-amber-200">
        {t("quotes.compliance.warnings.title")}
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3 text-amber-700 dark:text-amber-300 text-sm">
          {t("quotes.compliance.warnings.description")}
        </p>

        <ul className="space-y-3">
          {warnings.map((warning, index) => {
            const Icon = getWarningIcon(warning.type);
            return (
              <li
                key={`${warning.type}-${index}`}
                className="rounded-md bg-amber-100/50 dark:bg-amber-900/20 p-3"
              >
                <div className="flex items-start gap-3">
                  <Icon className="size-4 mt-0.5 text-amber-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
                      {t(`quotes.compliance.warnings.${warning.type}`)}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                      {warning.message}
                    </p>
                    
                    {/* Progress indicator */}
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-amber-600 dark:text-amber-400 mb-1">
                        <span>
                          {formatValueWithUnit(warning.actual, warning.limit)}
                        </span>
                        <span className="font-medium">
                          {warning.percentOfLimit}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-amber-200 dark:bg-amber-900 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            getProgressColor(warning.percentOfLimit)
                          )}
                          style={{ width: `${Math.min(warning.percentOfLimit, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

export default ComplianceWarningAlert;
