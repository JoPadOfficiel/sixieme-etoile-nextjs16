"use client";

import { Badge } from "@ui/components/badge";
import {
  ClockIcon,
  MapIcon,
  BusIcon,
  TrafficConeIcon,
  CoffeeIcon,
  InfoIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { TimeAnalysis } from "../types";

interface TimeAnalysisSectionProps {
  timeAnalysis: TimeAnalysis | null | undefined;
  className?: string;
}

/**
 * Format duration in minutes to human readable (e.g., "10h00", "+4h30")
 */
function formatDurationHM(minutes: number, showSign = false): string {
  const absMinutes = Math.abs(minutes);
  const hours = Math.floor(absMinutes / 60);
  const mins = Math.round(absMinutes % 60);
  const sign = showSign && minutes > 0 ? "+" : showSign && minutes < 0 ? "-" : "";
  return `${sign}${hours}h${mins.toString().padStart(2, "0")}`;
}

/**
 * Format percentage with sign
 */
function formatPercentage(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

/**
 * TimeAnalysisSection Component
 * 
 * Story 21.3: Displays ultra-detailed travel time calculation breakdown in TripTransparency.
 * Shows explicit calculations for:
 * - Base Google Maps time (reference)
 * - Vehicle type adjustment (heavy vehicles travel slower)
 * - Traffic adjustment (rush hour, night, weekend)
 * - Mandatory driving breaks (RSE regulation for heavy vehicles)
 * 
 * @see Story 21.3: Ultra-Detailed Travel Time Calculation Breakdown
 * @see FR93, FR94: Display ultra-detailed travel time calculation breakdown
 */
export function TimeAnalysisSection({
  timeAnalysis,
  className,
}: TimeAnalysisSectionProps) {
  const t = useTranslations();

  // Don't render if no time analysis data
  if (!timeAnalysis) {
    return null;
  }

  const {
    baseGoogleTime,
    vehicleAdjustment,
    trafficAdjustment,
    mandatoryBreaks,
    totalDurationMinutes,
    differenceFromGoogle,
  } = timeAnalysis;

  // Check if there are any adjustments to show
  const hasAdjustments = vehicleAdjustment || trafficAdjustment || mandatoryBreaks;

  return (
    <div
      className={cn(
        "rounded-lg border border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950/50 p-4 mb-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ClockIcon className="size-5 text-purple-600 dark:text-purple-400" />
          <span className="font-semibold text-purple-800 dark:text-purple-200">
            {t("quotes.timeAnalysis.title")}
          </span>
        </div>
        {differenceFromGoogle !== 0 && (
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              differenceFromGoogle > 0 
                ? "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400"
                : "border-green-500 text-green-600 dark:border-green-400 dark:text-green-400"
            )}
          >
            {formatDurationHM(differenceFromGoogle, true)} vs Google
          </Badge>
        )}
      </div>

      {/* Time Components */}
      <div className="space-y-3">
        {/* Base Google Maps Time */}
        <TimeComponentRow
          icon={MapIcon}
          label={t("quotes.timeAnalysis.baseGoogleTime")}
          description={t("quotes.timeAnalysis.baseGoogleTimeDesc")}
          value={formatDurationHM(baseGoogleTime.durationMinutes)}
          source={baseGoogleTime.source === "GOOGLE_API" ? "google" : "estimate"}
          t={t}
        />

        {/* Vehicle Type Adjustment */}
        {vehicleAdjustment && vehicleAdjustment.percentage !== 0 && (
          <TimeComponentRow
            icon={BusIcon}
            label={t("quotes.timeAnalysis.vehicleAdjustment")}
            description={`${formatPercentage(vehicleAdjustment.percentage)} (${vehicleAdjustment.reason})`}
            value={formatDurationHM(vehicleAdjustment.additionalMinutes, true)}
            source="vehicle"
            t={t}
          />
        )}

        {/* Traffic Adjustment */}
        {trafficAdjustment && trafficAdjustment.percentage !== 0 && (
          <TimeComponentRow
            icon={TrafficConeIcon}
            label={t("quotes.timeAnalysis.trafficAdjustment")}
            description={`${formatPercentage(trafficAdjustment.percentage)} (${trafficAdjustment.reason})`}
            value={formatDurationHM(trafficAdjustment.additionalMinutes, true)}
            source="org"
            t={t}
          />
        )}

        {/* Mandatory Breaks (RSE) */}
        {mandatoryBreaks && mandatoryBreaks.totalBreakMinutes > 0 && (
          <TimeComponentRow
            icon={CoffeeIcon}
            label={t("quotes.timeAnalysis.mandatoryBreaks")}
            description={`${mandatoryBreaks.breakCount} ${t("quotes.timeAnalysis.breaks")} × ${mandatoryBreaks.breakDurationMinutes}min (${mandatoryBreaks.regulationReference})`}
            value={formatDurationHM(mandatoryBreaks.totalBreakMinutes, true)}
            source="rse"
            t={t}
          />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-purple-200 dark:border-purple-800 my-3" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-purple-800 dark:text-purple-200">
          {t("quotes.timeAnalysis.totalTime")}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-lg text-purple-800 dark:text-purple-200">
            {formatDurationHM(totalDurationMinutes)}
          </span>
        </div>
      </div>

      {/* Explanation for difference */}
      {hasAdjustments && differenceFromGoogle > 0 && (
        <div className="mt-3 pt-3 border-t border-purple-200 dark:border-purple-800">
          <div className="flex items-start gap-2 text-xs text-purple-700 dark:text-purple-300">
            <InfoIcon className="size-3.5 mt-0.5 flex-shrink-0" />
            <span>
              {t("quotes.timeAnalysis.differenceExplanation")}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Individual time component row
 */
interface TimeComponentRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  description: string;
  value: string;
  source: "google" | "estimate" | "vehicle" | "org" | "rse";
  t: ReturnType<typeof useTranslations>;
}

function TimeComponentRow({
  icon: Icon,
  label,
  description,
  value,
  source,
  t,
}: TimeComponentRowProps) {
  const sourceLabels: Record<typeof source, string> = {
    google: t("quotes.timeAnalysis.sourceGoogle"),
    estimate: t("quotes.timeAnalysis.sourceEstimate"),
    vehicle: t("quotes.timeAnalysis.sourceVehicle"),
    org: t("quotes.timeAnalysis.sourceOrg"),
    rse: t("quotes.timeAnalysis.sourceRSE"),
  };

  const sourceColors: Record<typeof source, string> = {
    google: "border-green-500 text-green-600 dark:border-green-400 dark:text-green-400",
    estimate: "border-gray-400 text-gray-500 dark:border-gray-500 dark:text-gray-400",
    vehicle: "border-blue-500 text-blue-600 dark:border-blue-400 dark:text-blue-400",
    org: "border-amber-500 text-amber-600 dark:border-amber-400 dark:text-amber-400",
    rse: "border-red-500 text-red-600 dark:border-red-400 dark:text-red-400",
  };

  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Icon className="size-4 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-purple-800 dark:text-purple-200">
            {label}
          </div>
          <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
            {description}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-semibold text-sm text-purple-800 dark:text-purple-200">
          {value}
        </span>
        <Badge
          variant="outline"
          className={cn("text-[10px] px-1.5 py-0 h-4", sourceColors[source])}
        >
          {sourceLabels[source]}
        </Badge>
      </div>
    </div>
  );
}

export default TimeAnalysisSection;
