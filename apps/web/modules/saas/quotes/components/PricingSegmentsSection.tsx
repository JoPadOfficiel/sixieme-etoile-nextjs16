"use client";

import { useState } from "react";
import { Badge } from "@ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import {
  MapIcon,
  ArrowRightIcon,
  InfoIcon,
  LayersIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";

/**
 * Zone segment info from tripAnalysis.zoneSegments
 */
interface ZoneSegmentInfo {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  distanceKm: number;
  durationMinutes: number;
  priceMultiplier: number;
  surchargesApplied: number;
  entryPoint: { lat: number; lng: number };
  exitPoint: { lat: number; lng: number };
}

/**
 * Route segmentation summary from tripAnalysis.routeSegmentation
 */
interface RouteSegmentation {
  weightedMultiplier: number;
  totalSurcharges: number;
  zonesTraversed: string[];
  segmentationMethod: "POLYLINE" | "FALLBACK";
}

interface PricingSegmentsSectionProps {
  zoneSegments: ZoneSegmentInfo[] | null | undefined;
  routeSegmentation: RouteSegmentation | null | undefined;
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
 * Format distance in km
 */
function formatDistance(km: number): string {
  return `${km.toFixed(1)} km`;
}

/**
 * Format duration in minutes
 */
function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${Math.round(minutes)}min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h${mins.toString().padStart(2, "0")}` : `${hours}h`;
}

/**
 * Format multiplier
 */
function formatMultiplier(multiplier: number): string {
  return `×${multiplier.toFixed(2)}`;
}

/**
 * PricingSegmentsSection Component
 * 
 * Story 21.4: Displays pricing segments and traversed zones visualization.
 * Shows:
 * - Zones traversed in order
 * - Segment table with zone, distance, duration, multiplier, surcharges
 * - Weighted average multiplier
 * - Total zone surcharges
 * 
 * @see Story 21.4: Pricing Segments and Traversed Zones Visualization
 * @see FR95, FR96: Display pricing segments and zone-by-zone cost breakdown
 */
export function PricingSegmentsSection({
  zoneSegments,
  routeSegmentation,
  className,
}: PricingSegmentsSectionProps) {
  const t = useTranslations();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Don't render if no zone segments at all
  if (!zoneSegments || zoneSegments.length === 0) {
    return null;
  }

  // Story 22.1: Always show zone information for transparency, even with single zone
  // This helps users understand which zone applies to their trip

  const segmentationMethod = routeSegmentation?.segmentationMethod ?? "FALLBACK";
  const zonesTraversed = routeSegmentation?.zonesTraversed ?? zoneSegments.map(s => s.zoneCode);
  const weightedMultiplier = routeSegmentation?.weightedMultiplier ?? 1.0;
  const totalSurcharges = routeSegmentation?.totalSurcharges ?? 0;

  return (
    <div
      className={cn(
        "rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/50 p-4 mb-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <LayersIcon className="size-5 text-emerald-600 dark:text-emerald-400" />
          <span className="font-semibold text-emerald-800 dark:text-emerald-200">
            {t("quotes.pricingSegments.title")}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant={segmentationMethod === "POLYLINE" ? "default" : "secondary"}
                  className={cn(
                    "text-xs cursor-help",
                    segmentationMethod === "POLYLINE"
                      ? "bg-emerald-600 hover:bg-emerald-700"
                      : "bg-amber-500 hover:bg-amber-600 text-white"
                  )}
                >
                  {segmentationMethod === "POLYLINE"
                    ? t("quotes.pricingSegments.methodPolyline")
                    : t("quotes.pricingSegments.methodFallback")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs text-sm">
                  {segmentationMethod === "POLYLINE"
                    ? t("quotes.pricingSegments.methodPolylineTooltip")
                    : t("quotes.pricingSegments.methodFallbackTooltip")}
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex items-center gap-1 px-2 py-1 text-sm text-emerald-600 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-200 transition-colors"
          >
            {isCollapsed ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronUpIcon className="size-4" />
            )}
            <span className="text-xs">
              {isCollapsed ? "Afficher" : "Masquer"}
            </span>
          </button>
        </div>
      </div>

      {/* Zones Traversed */}
      {!isCollapsed && (
        <div className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <MapIcon className="size-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              {t("quotes.pricingSegments.zonesTraversed")}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1 text-sm">
            {zonesTraversed.map((zoneCode, index) => (
              <span key={`${zoneCode}-${index}`} className="flex items-center">
                <Badge
                  variant="outline"
                  className="text-xs border-emerald-300 text-emerald-700 dark:border-emerald-600 dark:text-emerald-300"
                >
                  {zoneCode}
                </Badge>
                {index < zonesTraversed.length - 1 && (
                  <ArrowRightIcon className="size-3 mx-1 text-emerald-400" />
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Segment Table */}
      {!isCollapsed && (
        <div className="rounded-md border border-emerald-200 dark:border-emerald-700 overflow-hidden mb-4">
          <Table>
          <TableHeader>
            <TableRow className="bg-emerald-100 dark:bg-emerald-900/50">
              <TableHead className="text-emerald-800 dark:text-emerald-200 w-10">
                #
              </TableHead>
              <TableHead className="text-emerald-800 dark:text-emerald-200">
                {t("quotes.pricingSegments.zone")}
              </TableHead>
              <TableHead className="text-emerald-800 dark:text-emerald-200 text-right">
                {t("quotes.pricingSegments.distance")}
              </TableHead>
              <TableHead className="text-emerald-800 dark:text-emerald-200 text-right">
                {t("quotes.pricingSegments.duration")}
              </TableHead>
              <TableHead className="text-emerald-800 dark:text-emerald-200 text-right">
                {t("quotes.pricingSegments.multiplier")}
              </TableHead>
              <TableHead className="text-emerald-800 dark:text-emerald-200 text-right">
                {t("quotes.pricingSegments.surcharges")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {zoneSegments.map((segment, index) => (
              <TableRow
                key={`${segment.zoneId}-${index}`}
                className="hover:bg-emerald-50 dark:hover:bg-emerald-900/30"
              >
                <TableCell className="font-medium text-emerald-700 dark:text-emerald-300">
                  {index + 1}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium text-sm text-emerald-800 dark:text-emerald-200">
                      {segment.zoneName}
                    </span>
                    <span className="text-xs text-emerald-600 dark:text-emerald-400">
                      {segment.zoneCode}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm text-emerald-700 dark:text-emerald-300">
                  {formatDistance(segment.distanceKm)}
                </TableCell>
                <TableCell className="text-right text-sm text-emerald-700 dark:text-emerald-300">
                  {formatDuration(segment.durationMinutes)}
                </TableCell>
                <TableCell className="text-right">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs font-mono",
                      segment.priceMultiplier > 1
                        ? "border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400"
                        : segment.priceMultiplier < 1
                          ? "border-green-400 text-green-600 dark:border-green-500 dark:text-green-400"
                          : "border-gray-400 text-gray-600 dark:border-gray-500 dark:text-gray-400"
                    )}
                  >
                    {formatMultiplier(segment.priceMultiplier)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-emerald-700 dark:text-emerald-300">
                  {segment.surchargesApplied > 0
                    ? formatPrice(segment.surchargesApplied)
                    : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      )}

      {/* Summary */}
      {!isCollapsed && (
        <div className="space-y-2">
          {/* Weighted Multiplier */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {t("quotes.pricingSegments.weightedMultiplier")}
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <InfoIcon className="size-3.5 text-emerald-500 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-sm">
                      {t("quotes.pricingSegments.weightedMultiplierTooltip")}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Badge
              variant="default"
              className="text-sm font-mono bg-emerald-600 hover:bg-emerald-700"
            >
              ×{weightedMultiplier.toFixed(2)}
            </Badge>
          </div>
          {/* Total Surcharges */}
          {totalSurcharges > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                {t("quotes.pricingSegments.totalSurcharges")}
              </span>
              <span className="font-semibold text-emerald-800 dark:text-emerald-200">
                {formatPrice(totalSurcharges)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Fallback Warning */}
      {!isCollapsed && segmentationMethod === "FALLBACK" && (
        <div className="mt-3 pt-3 border-t border-emerald-200 dark:border-emerald-700">
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-400">
            <InfoIcon className="size-3.5 mt-0.5 flex-shrink-0" />
            <span>{t("quotes.pricingSegments.fallbackWarning")}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PricingSegmentsSection;
