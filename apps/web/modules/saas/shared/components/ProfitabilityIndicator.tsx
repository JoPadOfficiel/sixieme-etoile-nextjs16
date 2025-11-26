"use client";

import { Badge } from "@ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { TrendingDown, TrendingUp, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

export type ProfitabilityLevel = "green" | "orange" | "red";

export interface ProfitabilityIndicatorProps {
  /** Margin percentage (e.g., 25.5 for 25.5%) */
  marginPercent: number | string | null | undefined;
  /** Threshold for green (profitable) - default 20% */
  greenThreshold?: number;
  /** Threshold for orange (low margin) - default 0% */
  orangeThreshold?: number;
  /** Show compact version (icon only) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * ProfitabilityIndicator Component
 * 
 * Displays a visual indicator of quote/mission profitability based on margin percentage.
 * - Green: margin >= greenThreshold (profitable)
 * - Orange: margin >= orangeThreshold but < greenThreshold (low margin)
 * - Red: margin < orangeThreshold (loss)
 * 
 * Used in: QuotesTable, TripTransparencyPanel, Dispatch badges
 * 
 * @see UX Spec 6.1.6 Profitability Indicator & Dispatch Badges
 * @see FR24 Profitability indicator based on selling price vs internal cost
 */
export function ProfitabilityIndicator({
  marginPercent,
  greenThreshold = 20,
  orangeThreshold = 0,
  compact = false,
  className,
}: ProfitabilityIndicatorProps) {
  const t = useTranslations("quotes.profitability");

  // Parse margin if string
  const margin = marginPercent === null || marginPercent === undefined
    ? null
    : typeof marginPercent === "string"
      ? parseFloat(marginPercent)
      : marginPercent;

  // Determine profitability level
  const level = getProfitabilityLevel(margin, greenThreshold, orangeThreshold);

  // Get icon, color, and label based on level
  const config = getIndicatorConfig(level, t);

  const formattedMargin = margin !== null ? `${margin.toFixed(1)}%` : "—";

  const indicator = (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        config.badgeClass,
        className
      )}
    >
      <config.Icon className="size-3.5" />
      {!compact && <span>{config.label}</span>}
    </Badge>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {indicator}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.tooltipTitle}</p>
            <p className="text-sm text-muted-foreground">
              {t("margin")}: {formattedMargin}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("thresholds", { green: greenThreshold, orange: orangeThreshold })}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function getProfitabilityLevel(
  margin: number | null,
  greenThreshold: number,
  orangeThreshold: number
): ProfitabilityLevel {
  if (margin === null) {
    return "orange"; // Unknown margin treated as warning
  }
  if (margin >= greenThreshold) {
    return "green";
  }
  if (margin >= orangeThreshold) {
    return "orange";
  }
  return "red";
}

function getIndicatorConfig(
  level: ProfitabilityLevel,
  t: (key: string) => string
) {
  switch (level) {
    case "green":
      return {
        Icon: TrendingUp,
        label: t("profitable"),
        tooltipTitle: t("profitableTooltip"),
        badgeClass: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
      };
    case "orange":
      return {
        Icon: AlertTriangle,
        label: t("lowMargin"),
        tooltipTitle: t("lowMarginTooltip"),
        badgeClass: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
      };
    case "red":
      return {
        Icon: TrendingDown,
        label: t("loss"),
        tooltipTitle: t("lossTooltip"),
        badgeClass: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
      };
  }
}

export default ProfitabilityIndicator;
