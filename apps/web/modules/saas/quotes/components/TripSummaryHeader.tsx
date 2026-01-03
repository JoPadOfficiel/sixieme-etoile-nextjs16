"use client";

import { Badge } from "@ui/components/badge";
import { Card, CardContent } from "@ui/components/card";
import {
  ClockIcon,
  EuroIcon,
  GaugeIcon,
  PercentIcon,
  RefreshCwIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import { StaffingPlanBadge } from "./StaffingPlanBadge";
import type { PricingResult } from "../types";
import { formatPrice, formatDistance, formatDuration } from "../types";

interface TripSummaryHeaderProps {
  pricingResult: PricingResult;
  className?: string;
}

/**
 * TripSummaryHeader Component
 * 
 * Displays the trip summary at the top of TripTransparency panel.
 * Shows key metrics: distance, duration, price, margin, and badges.
 * 
 * @see Story 21-7: Enhanced TripTransparency Interface
 */
export function TripSummaryHeader({
  pricingResult,
  className,
}: TripSummaryHeaderProps) {
  const t = useTranslations();

  const {
    tripAnalysis,
    marginPercent,
    internalCost,
    price,
    pricingMode,
    matchedGrid,
    appliedRules,
  } = pricingResult;

  // Extract round trip rule for badge
  const roundTripRule = appliedRules?.find(rule => rule.type === "ROUND_TRIP");

  return (
    <Card className={cn("mb-4", className)}>
      <CardContent className="pt-4">
        {/* Header with title and badges */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h3 className="text-lg font-semibold">
            {t("quotes.create.tripTransparency.title")}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={pricingMode === "FIXED_GRID" ? "default" : "secondary"}>
              {pricingMode === "FIXED_GRID"
                ? t("quotes.create.pricingMode.fixedGrid")
                : t("quotes.create.pricingMode.dynamic")}
            </Badge>
            {matchedGrid && (
              <Badge variant="outline" className="text-xs">
                {matchedGrid.name}
              </Badge>
            )}
            {roundTripRule && (
              <Badge variant="default" className="text-xs bg-purple-600 hover:bg-purple-700">
                <RefreshCwIcon className="size-3 mr-1" />
                {t("quotes.create.tripTransparency.roundTrip")}
              </Badge>
            )}
            <StaffingPlanBadge compliancePlan={tripAnalysis.compliancePlan} />
          </div>
        </div>

        {/* Summary metrics grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryMetric
            icon={GaugeIcon}
            label={t("quotes.create.tripTransparency.distance")}
            value={formatDistance(tripAnalysis.totalDistanceKm)}
          />
          <SummaryMetric
            icon={ClockIcon}
            label={t("quotes.create.tripTransparency.duration")}
            value={formatDuration(tripAnalysis.totalDurationMinutes)}
          />
          <SummaryMetric
            icon={EuroIcon}
            label={t("quotes.create.tripTransparency.suggestedPrice")}
            value={formatPrice(price)}
            highlight
          />
          <SummaryMetric
            icon={PercentIcon}
            label={t("quotes.create.tripTransparency.margin")}
            value={`${marginPercent.toFixed(1)}%`}
            extra={<ProfitabilityIndicator marginPercent={marginPercent} compact />}
          />
        </div>

        {/* Quick cost summary */}
        <div className="mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-4 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{t("quotes.create.tripTransparency.internalCost")}:</span>
            <span className="font-medium text-foreground">{formatPrice(internalCost)}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{t("quotes.create.tripTransparency.grossMargin")}:</span>
            <span className="font-medium text-foreground">{formatPrice(price - internalCost)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface SummaryMetricProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  highlight?: boolean;
  extra?: React.ReactNode;
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  highlight = false,
  extra,
}: SummaryMetricProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 p-3 rounded-lg",
        highlight
          ? "bg-primary/10 border border-primary/20"
          : "bg-muted/50"
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("font-semibold", highlight && "text-primary")}>
          {value}
        </span>
        {extra}
      </div>
    </div>
  );
}

export default TripSummaryHeader;
