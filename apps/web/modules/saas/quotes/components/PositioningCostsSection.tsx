"use client";

import { Badge } from "@ui/components/badge";
import {
  CarIcon,
  RotateCcwIcon,
  HomeIcon,
  InfoIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { SegmentAnalysis, TripAnalysis } from "../types";

interface PositioningCostsSectionProps {
  segments: TripAnalysis["segments"] | null | undefined;
  vehicleSelection: TripAnalysis["vehicleSelection"] | null | undefined;
  className?: string;
}

/**
 * Format price in EUR
 */
function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format distance with 1 decimal
 */
function formatDistance(km: number): string {
  return `${km.toFixed(1)}km`;
}

/**
 * Format duration in minutes to hours with 2 decimals
 */
function formatDurationHours(minutes: number): string {
  const hours = minutes / 60;
  return `${hours.toFixed(2)}h`;
}

/**
 * PositioningCostsSection Component
 * 
 * Story 21.2: Displays ultra-detailed positioning cost breakdown in TripTransparency.
 * Shows explicit calculations for:
 * - Approach fee (base → pickup deadhead)
 * - Empty return (dropoff → base deadhead)
 * 
 * @see Story 21.2: Detailed Approach Fee and Empty Return Display
 * @see FR91, FR92: Display detailed positioning cost breakdown
 */
export function PositioningCostsSection({
  segments,
  vehicleSelection,
  className,
}: PositioningCostsSectionProps) {
  const t = useTranslations();

  // Don't render if no segments
  if (!segments) {
    return null;
  }

  const { approach, return: returnSegment } = segments;

  // Don't render if no approach and no return segments
  if (!approach && !returnSegment) {
    return null;
  }

  // Don't render if both segments have 0 cost
  const approachCost = approach?.cost?.total ?? 0;
  const returnCost = returnSegment?.cost?.total ?? 0;
  const totalPositioningCost = approachCost + returnCost;

  if (totalPositioningCost <= 0) {
    return null;
  }

  const baseName = vehicleSelection?.selectedVehicle?.baseName ?? t("quotes.positioning.unknownBase");

  return (
    <div
      className={cn(
        "rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/50 p-4 mb-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <CarIcon className="size-5 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-amber-800 dark:text-amber-200">
            {t("quotes.positioning.title")}
          </span>
        </div>
        <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400">
          {t("quotes.positioning.deadhead")}
        </Badge>
      </div>

      {/* Cost Items */}
      <div className="space-y-4">
        {/* Approach Fee */}
        {approach && approach.cost.total > 0 && (
          <PositioningCostItem
            icon={CarIcon}
            label={t("quotes.positioning.approachFee")}
            segment={approach}
            locationLabel={t("quotes.positioning.from")}
            locationName={baseName}
            t={t}
          />
        )}

        {/* Empty Return */}
        {returnSegment && returnSegment.cost.total > 0 && (
          <PositioningCostItem
            icon={RotateCcwIcon}
            label={t("quotes.positioning.emptyReturn")}
            segment={returnSegment}
            locationLabel={t("quotes.positioning.to")}
            locationName={baseName}
            t={t}
          />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-amber-200 dark:border-amber-800 my-3" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-amber-800 dark:text-amber-200">
          {t("quotes.positioning.total")}
        </span>
        <span className="font-bold text-lg text-amber-800 dark:text-amber-200">
          {formatPrice(totalPositioningCost)}
        </span>
      </div>

      {/* Info tooltip */}
      <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-800">
        <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300">
          <InfoIcon className="size-3.5 mt-0.5 flex-shrink-0" />
          <span>{t("quotes.positioning.info")}</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Individual positioning cost item component
 */
interface PositioningCostItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  segment: SegmentAnalysis;
  locationLabel: string;
  locationName: string;
  t: ReturnType<typeof useTranslations>;
}

function PositioningCostItem({
  icon: Icon,
  label,
  segment,
  locationLabel,
  locationName,
  t,
}: PositioningCostItemProps) {
  const { distanceKm, durationMinutes, cost } = segment;

  // Extract rates from cost breakdown
  const fuelCost = cost.fuel?.amount ?? 0;
  const tollsCost = cost.tolls?.amount ?? 0;
  const wearCost = cost.wear?.amount ?? 0;
  const driverCost = cost.driver?.amount ?? 0;
  
  // Calculate effective rates for display
  const distanceBasedCost = fuelCost + tollsCost + wearCost;
  const effectiveRatePerKm = distanceKm > 0 ? distanceBasedCost / distanceKm : 0;
  const effectiveHourlyRate = cost.driver?.hourlyRate ?? 25;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Icon className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-amber-800 dark:text-amber-200">
              {label}
            </div>
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              <HomeIcon className="size-3" />
              <span>{locationLabel}: {locationName}</span>
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4 border-amber-400 text-amber-600 dark:border-amber-500 dark:text-amber-400"
              >
                {t("quotes.positioning.sourceBase")}
              </Badge>
            </div>
          </div>
        </div>
        <span className="font-semibold text-sm text-amber-800 dark:text-amber-200 flex-shrink-0">
          {formatPrice(cost.total)}
        </span>
      </div>

      {/* Calculation details */}
      <div className="ml-6 space-y-1 text-xs text-amber-700 dark:text-amber-300">
        {/* Distance-based costs */}
        <div className="flex items-center justify-between">
          <span>
            {formatDistance(distanceKm)} × {formatPrice(effectiveRatePerKm)}/km
          </span>
          <span>{formatPrice(distanceBasedCost)}</span>
        </div>
        
        {/* Time-based costs (driver) */}
        {driverCost > 0 && (
          <div className="flex items-center justify-between">
            <span>
              {formatDurationHours(durationMinutes)} × {formatPrice(effectiveHourlyRate)}/h
            </span>
            <span>{formatPrice(driverCost)}</span>
          </div>
        )}

        {/* Segment total */}
        <div className="flex items-center justify-between font-medium pt-1 border-t border-amber-200 dark:border-amber-700">
          <span>{t("quotes.positioning.segmentTotal")}</span>
          <span>{formatPrice(cost.total)}</span>
        </div>
      </div>

      {/* Estimated badge if applicable */}
      {segment.isEstimated && (
        <div className="ml-6">
          <Badge variant="secondary" className="text-[10px]">
            {t("quotes.positioning.estimated")}
          </Badge>
        </div>
      )}
    </div>
  );
}

export default PositioningCostsSection;
