"use client";

import { Badge } from "@ui/components/badge";
import {
  CarIcon,
  RotateCcwIcon,
  HomeIcon,
  InfoIcon,
  ClockIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { SegmentAnalysis, TripAnalysis, PositioningCosts, PositioningCostItem as PositioningCostItemType, AvailabilityFeeItem as AvailabilityFeeItemType } from "../types";

interface PositioningCostsSectionProps {
  segments: TripAnalysis["segments"] | null | undefined;
  vehicleSelection: TripAnalysis["vehicleSelection"] | null | undefined;
  positioningCosts?: PositioningCosts | null;
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
 * Story 21.6: Enhanced with automatic positioning costs calculation.
 * Shows explicit calculations for:
 * - Approach fee (base → pickup deadhead)
 * - Empty return (dropoff → base deadhead)
 * - Availability fee (for dispo trips with extra hours)
 * 
 * @see Story 21.2: Detailed Approach Fee and Empty Return Display
 * @see Story 21.6: Automatic Empty Return and Availability Calculation
 * @see FR91, FR92, FR99, FR100: Display detailed positioning cost breakdown
 */
export function PositioningCostsSection({
  segments,
  vehicleSelection,
  positioningCosts,
  className,
}: PositioningCostsSectionProps) {
  const t = useTranslations();

  // Don't render if no segments and no positioning costs
  if (!segments && !positioningCosts) {
    return null;
  }

  const { approach, return: returnSegment } = segments ?? { approach: null, return: null };

  // Use positioningCosts if available, otherwise fall back to segment costs
  const approachCost = positioningCosts?.approachFee?.cost ?? approach?.cost?.total ?? 0;
  const returnCost = positioningCosts?.emptyReturn?.cost ?? returnSegment?.cost?.total ?? 0;
  const totalPositioningCost = positioningCosts?.totalPositioningCost ?? (approachCost + returnCost);

  // Don't render if no positioning costs
  if (totalPositioningCost <= 0 && !positioningCosts) {
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
        {(approach && approach.cost.total > 0) || (positioningCosts?.approachFee?.required) ? (
          <PositioningCostItem
            icon={CarIcon}
            label={t("quotes.positioning.approachFee")}
            segment={approach}
            positioningItem={positioningCosts?.approachFee}
            locationLabel={t("quotes.positioning.from")}
            locationName={baseName}
            t={t}
          />
        ) : null}

        {/* Empty Return */}
        {(returnSegment && returnSegment.cost.total > 0) || (positioningCosts?.emptyReturn?.required) ? (
          <PositioningCostItem
            icon={RotateCcwIcon}
            label={t("quotes.positioning.emptyReturn")}
            segment={returnSegment}
            positioningItem={positioningCosts?.emptyReturn}
            locationLabel={t("quotes.positioning.to")}
            locationName={baseName}
            t={t}
          />
        ) : null}

        {/* Availability Fee (Story 21.6) */}
        {positioningCosts?.availabilityFee?.required && (
          <AvailabilityFeeItem
            availabilityFee={positioningCosts.availabilityFee}
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
 * Story 21.6: Enhanced to support both segment data and positioningCosts data
 */
interface PositioningCostItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  segment: SegmentAnalysis | null;
  positioningItem?: PositioningCostItemType;
  locationLabel: string;
  locationName: string;
  t: ReturnType<typeof useTranslations>;
}

function PositioningCostItem({
  icon: Icon,
  label,
  segment,
  positioningItem,
  locationLabel,
  locationName,
  t,
}: PositioningCostItemProps) {
  // Use positioningItem if available, otherwise fall back to segment
  const distanceKm = positioningItem?.distanceKm ?? segment?.distanceKm ?? 0;
  const durationMinutes = positioningItem?.durationMinutes ?? segment?.durationMinutes ?? 0;
  const totalCost = positioningItem?.cost ?? segment?.cost?.total ?? 0;
  const reason = positioningItem?.reason;
  const cost = segment?.cost;

  // Extract rates from cost breakdown (if segment available)
  const fuelCost = cost?.fuel?.amount ?? 0;
  const tollsCost = cost?.tolls?.amount ?? 0;
  const wearCost = cost?.wear?.amount ?? 0;
  const driverCost = cost?.driver?.amount ?? 0;
  
  // Calculate effective rates for display
  const distanceBasedCost = fuelCost + tollsCost + wearCost;
  const effectiveRatePerKm = distanceKm > 0 ? distanceBasedCost / distanceKm : 0;
  const effectiveHourlyRate = cost?.driver?.hourlyRate ?? 25;

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
          {formatPrice(totalCost)}
        </span>
      </div>

      {/* Calculation details */}
      <div className="ml-6 space-y-1 text-xs text-amber-700 dark:text-amber-300">
        {/* Reason from positioningCosts (Story 21.6) */}
        {reason && (
          <div className="text-amber-600 dark:text-amber-400 italic mb-1">
            {reason}
          </div>
        )}

        {/* Distance-based costs */}
        {distanceKm > 0 && (
          <div className="flex items-center justify-between">
            <span>
              {formatDistance(distanceKm)} × {formatPrice(effectiveRatePerKm)}/km
            </span>
            <span>{formatPrice(distanceBasedCost)}</span>
          </div>
        )}
        
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
          <span>{formatPrice(totalCost)}</span>
        </div>
      </div>

      {/* Estimated badge if applicable */}
      {segment?.isEstimated && (
        <div className="ml-6">
          <Badge variant="secondary" className="text-[10px]">
            {t("quotes.positioning.estimated")}
          </Badge>
        </div>
      )}
    </div>
  );
}

/**
 * Availability Fee Item Component (Story 21.6)
 * Displays extra waiting time costs for dispo trips
 */
interface AvailabilityFeeItemComponentProps {
  availabilityFee: AvailabilityFeeItemType;
  t: ReturnType<typeof useTranslations>;
}

function AvailabilityFeeItem({
  availabilityFee,
  t,
}: AvailabilityFeeItemComponentProps) {
  const { waitingHours, ratePerHour, cost, reason } = availabilityFee;

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <ClockIcon className="size-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm text-amber-800 dark:text-amber-200">
              {t("quotes.positioning.availabilityFee")}
            </div>
            <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 italic">
              {reason}
            </div>
          </div>
        </div>
        <span className="font-semibold text-sm text-amber-800 dark:text-amber-200 flex-shrink-0">
          {formatPrice(cost)}
        </span>
      </div>

      {/* Calculation details */}
      <div className="ml-6 space-y-1 text-xs text-amber-700 dark:text-amber-300">
        <div className="flex items-center justify-between">
          <span>
            {waitingHours.toFixed(1)}h × {formatPrice(ratePerHour)}/h
          </span>
          <span>{formatPrice(cost)}</span>
        </div>
      </div>
    </div>
  );
}

export default PositioningCostsSection;
