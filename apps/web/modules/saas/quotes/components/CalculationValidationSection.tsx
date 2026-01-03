"use client";

import { useState, useCallback } from "react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ui/components/collapsible";
import {
  AlertCircleIcon,
  AlertTriangleIcon,
  CheckCircle2Icon,
  ChevronDownIcon,
  ChevronRightIcon,
  ClockIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type {
  ValidationResult,
  ValidationCheck,
  ValidationCheckStatus,
  ValidationOverallStatus,
  AuditLogEntry,
} from "../types";
import { formatPrice } from "../types";

interface CalculationValidationSectionProps {
  validation: ValidationResult | null | undefined;
  onRecalculate?: () => Promise<void>;
  isRecalculating?: boolean;
  auditLog?: AuditLogEntry[];
  className?: string;
}

/**
 * CalculationValidationSection Component
 * Story 21.9: Real-time cost calculation validation
 * 
 * Displays validation status, individual checks, recalculate button,
 * and audit trail for pricing calculations.
 */
export function CalculationValidationSection({
  validation,
  onRecalculate,
  isRecalculating = false,
  auditLog = [],
  className,
}: CalculationValidationSectionProps) {
  const t = useTranslations();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAuditExpanded, setIsAuditExpanded] = useState(false);

  const handleRecalculate = useCallback(async () => {
    if (onRecalculate) {
      await onRecalculate();
    }
  }, [onRecalculate]);

  if (!validation) {
    return null;
  }

  const { overallStatus, checks, warnings, errors } = validation;

  return (
    <Card className={cn("mt-4", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <StatusIcon status={overallStatus} />
            {t("quotes.create.validation.title")}
          </CardTitle>
          {onRecalculate && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRecalculate}
              disabled={isRecalculating}
              className="h-7 px-2 text-xs"
            >
              <RefreshCwIcon
                className={cn("size-3 mr-1", isRecalculating && "animate-spin")}
              />
              {t("quotes.create.validation.recalculate")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        {/* Overall Status Message */}
        <div
          className={cn(
            "flex items-center gap-2 p-2 rounded-md text-sm mb-3",
            overallStatus === "VALID" && "bg-green-50 text-green-700",
            overallStatus === "WARNING" && "bg-amber-50 text-amber-700",
            overallStatus === "INVALID" && "bg-red-50 text-red-700"
          )}
        >
          <StatusIcon status={overallStatus} size="sm" />
          <span className="font-medium">
            {overallStatus === "VALID" && t("quotes.create.validation.valid")}
            {overallStatus === "WARNING" &&
              t("quotes.create.validation.warning", { count: warnings.length })}
            {overallStatus === "INVALID" &&
              t("quotes.create.validation.invalid", { count: errors.length })}
          </span>
        </div>

        {/* Validation Checks List */}
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
            {isExpanded ? (
              <ChevronDownIcon className="size-3" />
            ) : (
              <ChevronRightIcon className="size-3" />
            )}
            {t("quotes.create.validation.showChecks", { count: checks.length })}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2">
            <div className="space-y-1">
              {checks.map((check) => (
                <ValidationCheckRow key={check.id} check={check} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Review Warning for Invalid Status */}
        {overallStatus === "INVALID" && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-xs text-red-700 flex items-center gap-1">
              <AlertCircleIcon className="size-3" />
              {t("quotes.create.validation.reviewWarning")}
            </p>
          </div>
        )}

        {/* Audit Trail */}
        {auditLog.length > 0 && (
          <Collapsible
            open={isAuditExpanded}
            onOpenChange={setIsAuditExpanded}
            className="mt-3 pt-3 border-t"
          >
            <CollapsibleTrigger className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors w-full">
              {isAuditExpanded ? (
                <ChevronDownIcon className="size-3" />
              ) : (
                <ChevronRightIcon className="size-3" />
              )}
              {t("quotes.create.validation.auditTrail")} ({auditLog.length})
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2">
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {auditLog.slice(0, 10).map((entry) => (
                  <AuditLogRow key={entry.id} entry={entry} />
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface StatusIconProps {
  status: ValidationOverallStatus | ValidationCheckStatus;
  size?: "sm" | "md";
}

function StatusIcon({ status, size = "md" }: StatusIconProps) {
  const sizeClass = size === "sm" ? "size-4" : "size-5";

  switch (status) {
    case "VALID":
    case "PASS":
      return <CheckCircle2Icon className={cn(sizeClass, "text-green-600")} />;
    case "WARNING":
      return <AlertTriangleIcon className={cn(sizeClass, "text-amber-600")} />;
    case "INVALID":
    case "FAIL":
      return <AlertCircleIcon className={cn(sizeClass, "text-red-600")} />;
    default:
      return null;
  }
}

interface ValidationCheckRowProps {
  check: ValidationCheck;
}

function ValidationCheckRow({ check }: ValidationCheckRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs py-1 px-2 rounded",
        check.status === "PASS" && "text-green-700",
        check.status === "WARNING" && "text-amber-700 bg-amber-50/50",
        check.status === "FAIL" && "text-red-700 bg-red-50/50"
      )}
    >
      <StatusIcon status={check.status} size="sm" />
      <span className="flex-1">{check.message}</span>
    </div>
  );
}

interface AuditLogRowProps {
  entry: AuditLogEntry;
}

function AuditLogRow({ entry }: AuditLogRowProps) {
  const time = new Date(entry.timestamp).toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const eventLabel = {
    INITIAL_CALC: "Calcul initial",
    RECALCULATE: "Recalcul",
    VALIDATION_PASS: "Validation OK",
    VALIDATION_FAIL: "Validation échouée",
    PRICE_OVERRIDE: "Prix modifié",
  }[entry.eventType];

  return (
    <div className="flex items-center gap-2 text-xs py-1 px-2 bg-muted/30 rounded">
      <ClockIcon className="size-3 text-muted-foreground" />
      <span className="text-muted-foreground w-16">{time}</span>
      <span className="font-medium">{eventLabel}</span>
      <span className="text-muted-foreground">-</span>
      <span>{formatPrice(entry.price)}</span>
      <Badge
        variant={
          entry.validationStatus === "VALID"
            ? "default"
            : entry.validationStatus === "WARNING"
            ? "secondary"
            : "destructive"
        }
        className="text-[10px] px-1 py-0 h-4"
      >
        {entry.validationStatus === "VALID"
          ? "Valid"
          : entry.validationStatus === "WARNING"
          ? "Warning"
          : "Invalid"}
      </Badge>
    </div>
  );
}

export default CalculationValidationSection;
