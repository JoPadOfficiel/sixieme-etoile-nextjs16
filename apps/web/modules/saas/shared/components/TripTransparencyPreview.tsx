"use client";

import { Card, CardContent } from "@ui/components/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/components/popover";
import {
  ClockIcon,
  EuroIcon,
  GaugeIcon,
  InfoIcon,
  PercentIcon,
  RouteIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { ProfitabilityIndicator } from "./ProfitabilityIndicator";
import type { TripAnalysis } from "../types/pricing";
import { formatDistance, formatDuration, formatPrice } from "../types/pricing";

export interface TripTransparencyPreviewProps {
  /** Trip analysis data from shadow calculation */
  tripAnalysis: TripAnalysis | null;
  /** Margin percentage for profitability indicator */
  marginPercent: number | string | null;
  /** Internal cost in EUR */
  internalCost: number | string | null;
  /** Display mode: hover (HoverCard trigger) or inline (always visible) */
  mode?: "hover" | "inline";
  /** Custom trigger element for hover mode */
  trigger?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
}

/**
 * TripTransparencyPreview Component
 * 
 * Compact preview of trip transparency data for use in lists and tables.
 * Shows key metrics: distance, duration, internal cost, margin, and profitability.
 * 
 * Can be used in two modes:
 * - **hover**: Wraps content in a HoverCard, showing preview on hover
 * - **inline**: Renders the preview directly without hover interaction
 * 
 * @example
 * // Hover mode with custom trigger
 * <TripTransparencyPreview
 *   tripAnalysis={quote.tripAnalysis}
 *   marginPercent={quote.marginPercent}
 *   internalCost={quote.internalCost}
 *   mode="hover"
 *   trigger={<InfoIcon className="size-4 cursor-pointer" />}
 * />
 * 
 * @example
 * // Inline mode
 * <TripTransparencyPreview
 *   tripAnalysis={quote.tripAnalysis}
 *   marginPercent={quote.marginPercent}
 *   internalCost={quote.internalCost}
 *   mode="inline"
 * />
 * 
 * @see Story 6.7: Integrate TripTransparencyPanel & Profitability Indicator Across Screens
 * @see FR21-FR24: Shadow Calculation and Profitability Indicator
 */
export function TripTransparencyPreview({
  tripAnalysis,
  marginPercent,
  internalCost,
  mode = "hover",
  trigger,
  className,
}: TripTransparencyPreviewProps) {
  // Parse numeric values
  const parsedMargin = marginPercent === null || marginPercent === undefined
    ? null
    : typeof marginPercent === "string"
      ? parseFloat(marginPercent)
      : marginPercent;

  const parsedCost = internalCost === null || internalCost === undefined
    ? null
    : typeof internalCost === "string"
      ? parseFloat(internalCost)
      : internalCost;

  const previewContent = (
    <PreviewContent
      tripAnalysis={tripAnalysis}
      marginPercent={parsedMargin}
      internalCost={parsedCost}
      className={className}
    />
  );

  if (mode === "inline") {
    return previewContent;
  }

  // Hover mode with Popover
  const defaultTrigger = (
    <InfoIcon className="size-4 text-muted-foreground cursor-pointer hover:text-foreground transition-colors" />
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <span className="inline-flex items-center">
          {trigger || defaultTrigger}
        </span>
      </PopoverTrigger>
      <PopoverContent side="right" align="start" className="w-80 p-0">
        {previewContent}
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// Preview Content Component
// ============================================================================

interface PreviewContentProps {
  tripAnalysis: TripAnalysis | null;
  marginPercent: number | null;
  internalCost: number | null;
  className?: string;
}

function PreviewContent({
  tripAnalysis,
  marginPercent,
  internalCost,
  className,
}: PreviewContentProps) {
  const t = useTranslations();

  // Empty state
  if (!tripAnalysis) {
    return (
      <Card className={cn("border-0 shadow-none", className)}>
        <CardContent className="p-4">
          <div className="text-center text-muted-foreground">
            <RouteIcon className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">
              {t("quotes.create.tripTransparency.empty.title")}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("border-0 shadow-none", className)}>
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-semibold">
            {t("quotes.create.tripTransparency.preview.title")}
          </h4>
          {marginPercent !== null && (
            <ProfitabilityIndicator marginPercent={marginPercent} compact />
          )}
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2">
          <MetricItem
            icon={GaugeIcon}
            label={t("quotes.create.tripTransparency.distance")}
            value={formatDistance(tripAnalysis.totalDistanceKm)}
          />
          <MetricItem
            icon={ClockIcon}
            label={t("quotes.create.tripTransparency.duration")}
            value={formatDuration(tripAnalysis.totalDurationMinutes)}
          />
          <MetricItem
            icon={EuroIcon}
            label={t("quotes.create.tripTransparency.internalCost")}
            value={formatPrice(internalCost)}
          />
          <MetricItem
            icon={PercentIcon}
            label={t("quotes.create.tripTransparency.margin")}
            value={marginPercent !== null ? `${marginPercent.toFixed(1)}%` : "—"}
          />
        </div>

        {/* Segments Summary */}
        <div className="border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground mb-2">
            {t("quotes.create.tripTransparency.preview.segments")}
          </p>
          <div className="space-y-1 text-xs">
            {tripAnalysis.segments.approach && (
              <SegmentLine
                label={t("quotes.create.tripTransparency.segments.approach")}
                distance={tripAnalysis.segments.approach.distanceKm}
                duration={tripAnalysis.segments.approach.durationMinutes}
              />
            )}
            <SegmentLine
              label={t("quotes.create.tripTransparency.segments.service")}
              distance={tripAnalysis.segments.service.distanceKm}
              duration={tripAnalysis.segments.service.durationMinutes}
              isMain
            />
            {tripAnalysis.segments.return && (
              <SegmentLine
                label={t("quotes.create.tripTransparency.segments.return")}
                distance={tripAnalysis.segments.return.distanceKm}
                duration={tripAnalysis.segments.return.durationMinutes}
              />
            )}
          </div>
        </div>

        {/* Vehicle Info */}
        {tripAnalysis.vehicleSelection?.selectedVehicle && (
          <div className="text-xs text-muted-foreground flex items-center gap-1">
            <RouteIcon className="size-3" />
            <span>
              {tripAnalysis.vehicleSelection.selectedVehicle.vehicleName}
              {" • "}
              {tripAnalysis.vehicleSelection.selectedVehicle.baseName}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

interface MetricItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}

function MetricItem({ icon: Icon, label, value }: MetricItemProps) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-3.5 text-muted-foreground flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-sm font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

interface SegmentLineProps {
  label: string;
  distance: number;
  duration: number;
  isMain?: boolean;
}

function SegmentLine({ label, distance, duration, isMain = false }: SegmentLineProps) {
  return (
    <div className={cn(
      "flex items-center justify-between",
      isMain && "font-medium text-foreground"
    )}>
      <span className="text-muted-foreground">{label}</span>
      <span>
        {formatDistance(distance)} ({formatDuration(duration)})
      </span>
    </div>
  );
}

export default TripTransparencyPreview;
