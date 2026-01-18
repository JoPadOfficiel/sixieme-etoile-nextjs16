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
import {
  getProfitabilityLevel as getProfitabilityLevelUtil,
  calculateMarginPercent,
  formatMarginPercent,
  type ProfitabilityLevel,
  DEFAULT_GREEN_THRESHOLD,
  DEFAULT_ORANGE_THRESHOLD,
} from "../utils/profitability";

export type { ProfitabilityLevel };

export interface ProfitabilityIndicatorProps {
  /** Margin percentage (e.g., 25.5 for 25.5%) - use this OR sellingPrice/internalCost */
  marginPercent?: number | string | null | undefined;
  /** Selling price for real-time calculation (alternative to marginPercent) */
  sellingPrice?: number;
  /** Internal cost for real-time calculation (alternative to marginPercent) */
  internalCost?: number;
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
  sellingPrice,
  internalCost,
  greenThreshold = DEFAULT_GREEN_THRESHOLD,
  orangeThreshold = DEFAULT_ORANGE_THRESHOLD,
  compact = false,
  className,
}: ProfitabilityIndicatorProps) {
  const t = useTranslations("quotes.profitability");

  // Calculate margin: either from props or compute from selling price and cost
  let margin: number | null;
  
  if (sellingPrice !== undefined && internalCost !== undefined) {
    // Real-time calculation from selling price and internal cost
    margin = calculateMarginPercent(sellingPrice, internalCost);
  } else if (marginPercent === null || marginPercent === undefined) {
    margin = null;
  } else if (typeof marginPercent === "string") {
    margin = parseFloat(marginPercent);
  } else {
    margin = marginPercent;
  }

  // Determine profitability level using utility function
  const level = getProfitabilityLevelUtil(margin, greenThreshold, orangeThreshold);

  // Get icon, color, and label based on level
  const config = getIndicatorConfig(level, t);

  const formattedMargin = formatMarginPercent(margin);

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
