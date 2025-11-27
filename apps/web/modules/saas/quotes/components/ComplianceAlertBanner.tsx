"use client";

import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import {
  AlertOctagonIcon,
  ClockIcon,
  GaugeIcon,
  TimerIcon,
  XCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@ui/lib";
import type { ComplianceViolation, ComplianceViolationType } from "../types";

interface ComplianceAlertBannerProps {
  violations: ComplianceViolation[];
  className?: string;
  onRequestAlternatives?: () => void;
}

/**
 * Get icon for violation type
 */
function getViolationIcon(type: ComplianceViolationType) {
  switch (type) {
    case "DRIVING_TIME_EXCEEDED":
      return ClockIcon;
    case "AMPLITUDE_EXCEEDED":
      return TimerIcon;
    case "BREAK_REQUIRED":
      return TimerIcon;
    case "SPEED_LIMIT_EXCEEDED":
      return GaugeIcon;
    default:
      return AlertOctagonIcon;
  }
}

/**
 * Format value with unit for display
 */
function formatValueWithUnit(value: number, unit: "hours" | "minutes" | "km/h"): string {
  switch (unit) {
    case "hours":
      return `${value.toFixed(1)}h`;
    case "minutes":
      return `${value}min`;
    case "km/h":
      return `${value} km/h`;
    default:
      return `${value}`;
  }
}

/**
 * ComplianceAlertBanner Component
 * 
 * Page-level blocking banner for compliance violations.
 * Displays when a quote fails hard constraints (RSE regulations).
 * 
 * @see Story 6.5: Implement Blocking and Non-Blocking Alerts
 * @see FR46: Blocking alerts for impossible trips
 * @see FR47: Heavy-vehicle compliance validator
 */
export function ComplianceAlertBanner({
  violations,
  className,
  onRequestAlternatives,
}: ComplianceAlertBannerProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(true);

  if (violations.length === 0) {
    return null;
  }

  return (
    <Alert
      variant="error"
      className={cn(
        "border-destructive/50 bg-destructive/10",
        className
      )}
    >
      <XCircleIcon className="size-5" />
      <AlertTitle className="flex items-center justify-between">
        <span>{t("quotes.compliance.banner.title")}</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-destructive hover:text-destructive"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronUpIcon className="size-4" />
          ) : (
            <ChevronDownIcon className="size-4" />
          )}
        </Button>
      </AlertTitle>
      <AlertDescription>
        <p className="mb-3 text-destructive/90">
          {t("quotes.compliance.banner.description")}
        </p>

        {isExpanded && (
          <div className="space-y-3">
            {/* Violations List */}
            <ul className="space-y-2">
              {violations.map((violation, index) => {
                const Icon = getViolationIcon(violation.type);
                return (
                  <li
                    key={`${violation.type}-${index}`}
                    className="flex items-start gap-3 rounded-md bg-destructive/5 p-3"
                  >
                    <Icon className="size-5 mt-0.5 text-destructive shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-destructive">
                        {t(`quotes.compliance.violations.${violation.type}`)}
                      </p>
                      <p className="text-sm text-destructive/80 mt-0.5">
                        {violation.message}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-destructive/70">
                        <span>
                          {t("quotes.compliance.actual")}:{" "}
                          <strong>{formatValueWithUnit(violation.actual, violation.unit)}</strong>
                        </span>
                        <span>
                          {t("quotes.compliance.limit")}:{" "}
                          <strong>{formatValueWithUnit(violation.limit, violation.unit)}</strong>
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* Suggested Actions */}
            <div className="pt-2 border-t border-destructive/20">
              <p className="text-sm font-medium text-destructive mb-2">
                {t("quotes.compliance.banner.suggestedActions")}
              </p>
              <ul className="text-sm text-destructive/80 space-y-1 list-disc list-inside">
                <li>{t("quotes.compliance.banner.action.reduceDuration")}</li>
                <li>{t("quotes.compliance.banner.action.changeVehicle")}</li>
                <li>{t("quotes.compliance.banner.action.splitTrip")}</li>
              </ul>
              
              {onRequestAlternatives && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 border-destructive/30 text-destructive hover:bg-destructive/10"
                  onClick={onRequestAlternatives}
                >
                  {t("quotes.compliance.banner.viewAlternatives")}
                </Button>
              )}
            </div>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default ComplianceAlertBanner;
