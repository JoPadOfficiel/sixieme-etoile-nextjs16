"use client";

import { useState } from "react";
import { Badge } from "@ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ui/components/collapsible";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import {
  MapPinIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  LayersIcon,
  TargetIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  InfoIcon,
  MapIcon,
  CalculatorIcon,
  ParkingCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

/**
 * Zone candidate info from pricing engine
 */
interface ZoneCandidateInfo {
  id: string;
  code: string;
  name: string;
  type: "POLYGON" | "RADIUS" | "POINT" | "CORRIDOR";
  multiplier: number;
  priority?: number;
  rejected?: boolean;
  rejectionReason?: string;
}

/**
 * Zone detection info for pickup or dropoff
 */
interface ZoneDetectionInfo {
  selectedZone: {
    id: string;
    code: string;
    name: string;
    type: "POLYGON" | "RADIUS" | "POINT" | "CORRIDOR";
  } | null;
  candidateZones: ZoneCandidateInfo[];
  detectionCoordinates: { lat: number; lng: number };
  detectionMethod: "RADIUS" | "POLYGON" | "CORRIDOR" | "POINT" | "NONE";
}

/**
 * Zone conflict resolution info
 */
interface ZoneConflictResolutionInfo {
  strategy: "PRIORITY" | "MOST_EXPENSIVE" | "CLOSEST" | "COMBINED" | null;
  pickupConflictResolved: boolean;
  dropoffConflictResolved: boolean;
  pickupCandidateCount: number;
  dropoffCandidateCount: number;
}

/**
 * Zone multiplier application info
 */
interface ZoneMultiplierApplicationInfo {
  pickupMultiplier: number;
  dropoffMultiplier: number;
  aggregationStrategy: "MAX" | "PICKUP_ONLY" | "DROPOFF_ONLY" | "AVERAGE";
  effectiveMultiplier: number;
  source: "pickup" | "dropoff" | "both";
  priceBefore: number;
  priceAfter: number;
}

/**
 * Zone surcharge info
 */
interface ZoneSurchargeInfo {
  zoneId: string;
  zoneCode: string;
  zoneName: string;
  parkingSurcharge: number;
  accessFee: number;
  description: string | null;
}

/**
 * Zone surcharges summary
 */
interface ZoneSurchargesInfo {
  pickup: ZoneSurchargeInfo | null;
  dropoff: ZoneSurchargeInfo | null;
  total: number;
}

/**
 * Complete zone transparency info
 */
interface ZoneTransparencyInfo {
  pickup: ZoneDetectionInfo;
  dropoff: ZoneDetectionInfo;
  conflictResolution: ZoneConflictResolutionInfo;
  multiplierApplication: ZoneMultiplierApplicationInfo;
  surcharges: ZoneSurchargesInfo;
}

interface ZoneTransparencySectionProps {
  zoneTransparency: ZoneTransparencyInfo | null | undefined;
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
 * Format multiplier
 */
function formatMultiplier(multiplier: number): string {
  return `×${multiplier.toFixed(2)}`;
}

/**
 * Format coordinates
 */
function formatCoordinates(lat: number, lng: number): string {
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

/**
 * Get zone type badge color
 */
function getZoneTypeBadgeClass(type: string): string {
  switch (type) {
    case "POINT":
      return "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-700";
    case "RADIUS":
      return "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-700";
    case "POLYGON":
      return "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/50 dark:text-green-300 dark:border-green-700";
    case "CORRIDOR":
      return "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-700";
    default:
      return "bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-900/50 dark:text-gray-300 dark:border-gray-700";
  }
}

/**
 * Get strategy description
 */
function getStrategyDescription(strategy: string | null): string {
  switch (strategy) {
    case "PRIORITY":
      return "Zone with highest priority selected";
    case "MOST_EXPENSIVE":
      return "Zone with highest multiplier selected";
    case "CLOSEST":
      return "Zone closest to point selected";
    case "COMBINED":
      return "Priority first, then highest multiplier";
    default:
      return "Default specificity (POINT > RADIUS > POLYGON)";
  }
}

/**
 * Get aggregation strategy description
 */
function getAggregationDescription(strategy: string): string {
  switch (strategy) {
    case "MAX":
      return "Maximum of pickup and dropoff multipliers";
    case "PICKUP_ONLY":
      return "Only pickup zone multiplier used";
    case "DROPOFF_ONLY":
      return "Only dropoff zone multiplier used";
    case "AVERAGE":
      return "Average of pickup and dropoff multipliers";
    default:
      return "Maximum multiplier (default)";
  }
}

/**
 * ZoneTransparencySection Component
 * 
 * Story 21.8: Displays comprehensive zone-based cost transparency information.
 * Shows:
 * - Zone detection logic (which algorithm selected pickup/dropoff zones)
 * - Zone priority rules (how conflicts were resolved)
 * - Zone multiplier application (exact multiplier applied and why)
 * - Zone surcharges (any fixed fees per zone)
 * 
 * @see Story 21.8: Zone-Based Cost Transparency Enhancement
 * @see FR109: Zone transparency in pricing calculations
 */
export function ZoneTransparencySection({
  zoneTransparency,
  className,
}: ZoneTransparencySectionProps) {
  const t = useTranslations();
  const [isOpen, setIsOpen] = useState(false);

  if (!zoneTransparency) {
    return null;
  }

  const { pickup, dropoff, conflictResolution, multiplierApplication, surcharges } = zoneTransparency;

  const hasConflicts = conflictResolution.pickupConflictResolved || conflictResolution.dropoffConflictResolved;
  const hasSurcharges = surcharges.total > 0;
  const hasMultiplierEffect = multiplierApplication.effectiveMultiplier !== 1.0;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card
        className={cn(
          "border-indigo-200 bg-indigo-50/50 dark:border-indigo-800 dark:bg-indigo-950/30",
          className
        )}
      >
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-indigo-100/50 dark:hover:bg-indigo-900/30 transition-colors py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayersIcon className="size-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-base font-semibold text-indigo-800 dark:text-indigo-200">
                  {t("quotes.zoneTransparency.title")}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {hasConflicts && (
                  <Badge variant="outline" className="text-xs border-amber-400 text-amber-600 dark:border-amber-500 dark:text-amber-400">
                    <AlertTriangleIcon className="size-3 mr-1" />
                    {t("quotes.zoneTransparency.conflictsResolved")}
                  </Badge>
                )}
                {hasMultiplierEffect && (
                  <Badge variant="outline" className="text-xs font-mono border-indigo-400 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400">
                    {formatMultiplier(multiplierApplication.effectiveMultiplier)}
                  </Badge>
                )}
                {hasSurcharges && (
                  <Badge variant="outline" className="text-xs border-orange-400 text-orange-600 dark:border-orange-500 dark:text-orange-400">
                    +{formatPrice(surcharges.total)}
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronDownIcon className="size-4 text-indigo-500" />
                ) : (
                  <ChevronRightIcon className="size-4 text-indigo-500" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Zone Detection Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-200">
                <TargetIcon className="size-4" />
                {t("quotes.zoneTransparency.zoneDetection")}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Pickup Zone */}
                <ZoneDetectionCard
                  label={t("quotes.zoneTransparency.pickup")}
                  detection={pickup}
                  hasConflict={conflictResolution.pickupConflictResolved}
                  candidateCount={conflictResolution.pickupCandidateCount}
                />

                {/* Dropoff Zone */}
                <ZoneDetectionCard
                  label={t("quotes.zoneTransparency.dropoff")}
                  detection={dropoff}
                  hasConflict={conflictResolution.dropoffConflictResolved}
                  candidateCount={conflictResolution.dropoffCandidateCount}
                />
              </div>
            </div>

            {/* Conflict Resolution Section */}
            {hasConflicts && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-200">
                  <AlertTriangleIcon className="size-4 text-amber-500" />
                  {t("quotes.zoneTransparency.conflictResolution")}
                </div>

                <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-3">
                  <div className="flex items-start gap-2">
                    <InfoIcon className="size-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm">
                      <p className="font-medium text-amber-800 dark:text-amber-200">
                        {t("quotes.zoneTransparency.strategyUsed", { strategy: conflictResolution.strategy ?? "DEFAULT" })}
                      </p>
                      <p className="text-amber-700 dark:text-amber-300 mt-1">
                        {getStrategyDescription(conflictResolution.strategy)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Candidate Zones Tables */}
                {pickup.candidateZones.length > 1 && (
                  <CandidateZonesTable
                    label={t("quotes.zoneTransparency.pickupCandidates", { count: pickup.candidateZones.length })}
                    candidates={pickup.candidateZones}
                    selectedId={pickup.selectedZone?.id}
                  />
                )}

                {dropoff.candidateZones.length > 1 && (
                  <CandidateZonesTable
                    label={t("quotes.zoneTransparency.dropoffCandidates", { count: dropoff.candidateZones.length })}
                    candidates={dropoff.candidateZones}
                    selectedId={dropoff.selectedZone?.id}
                  />
                )}
              </div>
            )}

            {/* Multiplier Application Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-200">
                <CalculatorIcon className="size-4" />
                {t("quotes.zoneTransparency.multiplierApplication")}
              </div>

              <div className="rounded-md border border-indigo-200 dark:border-indigo-700 overflow-hidden">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-indigo-700 dark:text-indigo-300">
                        {t("quotes.zoneTransparency.pickupMultiplier")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn(
                          "font-mono text-xs",
                          multiplierApplication.pickupMultiplier !== 1.0
                            ? "border-orange-400 text-orange-600"
                            : "border-gray-400 text-gray-600"
                        )}>
                          {formatMultiplier(multiplierApplication.pickupMultiplier)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-indigo-700 dark:text-indigo-300">
                        {t("quotes.zoneTransparency.dropoffMultiplier")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="outline" className={cn(
                          "font-mono text-xs",
                          multiplierApplication.dropoffMultiplier !== 1.0
                            ? "border-orange-400 text-orange-600"
                            : "border-gray-400 text-gray-600"
                        )}>
                          {formatMultiplier(multiplierApplication.dropoffMultiplier)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-indigo-700 dark:text-indigo-300">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger className="flex items-center gap-1 cursor-help">
                              {t("quotes.zoneTransparency.aggregationStrategy")}
                              <InfoIcon className="size-3 text-indigo-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="max-w-xs text-sm">
                                {getAggregationDescription(multiplierApplication.aggregationStrategy)}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary" className="text-xs">
                          {multiplierApplication.aggregationStrategy}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    <TableRow className="bg-indigo-100/50 dark:bg-indigo-900/30">
                      <TableCell className="font-semibold text-indigo-800 dark:text-indigo-200">
                        {t("quotes.zoneTransparency.effectiveMultiplier", { source: t(`quotes.zoneTransparency.source.${multiplierApplication.source}`) })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="font-mono text-sm bg-indigo-600 hover:bg-indigo-700">
                          {formatMultiplier(multiplierApplication.effectiveMultiplier)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                    {hasMultiplierEffect && (
                      <>
                        <TableRow>
                          <TableCell className="text-sm text-indigo-600 dark:text-indigo-400">
                            {t("quotes.zoneTransparency.priceBefore")}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatPrice(multiplierApplication.priceBefore)}
                          </TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="text-sm text-indigo-600 dark:text-indigo-400">
                            {t("quotes.zoneTransparency.priceAfter")}
                          </TableCell>
                          <TableCell className="text-right text-sm font-medium">
                            {formatPrice(multiplierApplication.priceAfter)}
                          </TableCell>
                        </TableRow>
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Zone Surcharges Section */}
            {hasSurcharges && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-indigo-800 dark:text-indigo-200">
                  <ParkingCircleIcon className="size-4" />
                  {t("quotes.zoneTransparency.zoneSurcharges")}
                </div>

                <div className="rounded-md border border-orange-200 dark:border-orange-700 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-orange-100/50 dark:bg-orange-900/30">
                        <TableHead className="text-orange-800 dark:text-orange-200">
                          {t("quotes.zoneTransparency.zone")}
                        </TableHead>
                        <TableHead className="text-right text-orange-800 dark:text-orange-200">
                          {t("quotes.zoneTransparency.parking")}
                        </TableHead>
                        <TableHead className="text-right text-orange-800 dark:text-orange-200">
                          {t("quotes.zoneTransparency.accessFee")}
                        </TableHead>
                        <TableHead className="text-right text-orange-800 dark:text-orange-200">
                          {t("quotes.zoneTransparency.total")}
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {surcharges.pickup && (
                        <SurchargeRow
                          label={t("quotes.zoneTransparency.pickup")}
                          surcharge={surcharges.pickup}
                        />
                      )}
                      {surcharges.dropoff && (
                        <SurchargeRow
                          label={t("quotes.zoneTransparency.dropoff")}
                          surcharge={surcharges.dropoff}
                        />
                      )}
                      <TableRow className="bg-orange-100/50 dark:bg-orange-900/30 font-semibold">
                        <TableCell className="text-orange-800 dark:text-orange-200">
                          {t("quotes.zoneTransparency.totalSurcharges")}
                        </TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right text-orange-800 dark:text-orange-200">
                          {formatPrice(surcharges.total)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

/**
 * Zone Detection Card Sub-component
 */
interface ZoneDetectionCardProps {
  label: string;
  detection: ZoneDetectionInfo;
  hasConflict: boolean;
  candidateCount: number;
}

function ZoneDetectionCard({ label, detection, hasConflict, candidateCount }: ZoneDetectionCardProps) {
  const t = useTranslations();

  return (
    <div className="rounded-md border border-indigo-200 dark:border-indigo-700 p-3 bg-white dark:bg-indigo-950/50">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <MapPinIcon className="size-4 text-indigo-500" />
          <span className="font-medium text-sm text-indigo-800 dark:text-indigo-200">
            {label}
          </span>
        </div>
        {hasConflict && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Badge variant="outline" className="text-xs border-amber-400 text-amber-600">
                  {candidateCount} {t("quotes.zoneTransparency.candidates")}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">{t("quotes.zoneTransparency.conflictTooltip")}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {detection.selectedZone ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-900 dark:text-indigo-100">
              {detection.selectedZone.name}
            </span>
            <Badge variant="outline" className={cn("text-xs", getZoneTypeBadgeClass(detection.selectedZone.type))}>
              {detection.selectedZone.type}
            </Badge>
          </div>
          <div className="text-xs text-indigo-600 dark:text-indigo-400">
            <span className="font-mono">{detection.selectedZone.code}</span>
          </div>
          <div className="text-xs text-indigo-500 dark:text-indigo-500 flex items-center gap-1">
            <MapIcon className="size-3" />
            {formatCoordinates(detection.detectionCoordinates.lat, detection.detectionCoordinates.lng)}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <XCircleIcon className="size-4" />
          {t("quotes.zoneTransparency.noZoneDetected")}
        </div>
      )}
    </div>
  );
}

/**
 * Candidate Zones Table Sub-component
 */
interface CandidateZonesTableProps {
  label: string;
  candidates: ZoneCandidateInfo[];
  selectedId: string | undefined;
}

function CandidateZonesTable({ label, candidates, selectedId }: CandidateZonesTableProps) {
  const t = useTranslations();

  return (
    <div className="space-y-2">
      <span className="text-xs font-medium text-amber-700 dark:text-amber-300">
        {label}
      </span>
      <div className="rounded-md border border-amber-200 dark:border-amber-700 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-amber-100/50 dark:bg-amber-900/30">
              <TableHead className="text-amber-800 dark:text-amber-200 w-8" />
              <TableHead className="text-amber-800 dark:text-amber-200">
                {t("quotes.zoneTransparency.zone")}
              </TableHead>
              <TableHead className="text-amber-800 dark:text-amber-200">
                {t("quotes.zoneTransparency.type")}
              </TableHead>
              <TableHead className="text-right text-amber-800 dark:text-amber-200">
                {t("quotes.zoneTransparency.multiplier")}
              </TableHead>
              <TableHead className="text-right text-amber-800 dark:text-amber-200">
                {t("quotes.zoneTransparency.priority")}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {candidates.map((candidate) => (
              <TableRow
                key={candidate.id}
                className={cn(
                  candidate.id === selectedId
                    ? "bg-green-50 dark:bg-green-900/20"
                    : candidate.rejected
                      ? "bg-red-50/50 dark:bg-red-900/10 opacity-60"
                      : ""
                )}
              >
                <TableCell>
                  {candidate.id === selectedId ? (
                    <CheckCircleIcon className="size-4 text-green-600" />
                  ) : candidate.rejected ? (
                    <XCircleIcon className="size-4 text-red-400" />
                  ) : null}
                </TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className={cn(
                      "font-medium text-sm",
                      candidate.id === selectedId
                        ? "text-green-800 dark:text-green-200"
                        : "text-amber-800 dark:text-amber-200"
                    )}>
                      {candidate.name}
                    </span>
                    <span className="text-xs text-amber-600 dark:text-amber-400 font-mono">
                      {candidate.code}
                    </span>
                    {candidate.rejectionReason && (
                      <span className="text-xs text-red-500 mt-0.5">
                        {candidate.rejectionReason}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={cn("text-xs", getZoneTypeBadgeClass(candidate.type))}>
                    {candidate.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className="font-mono text-xs">
                    {formatMultiplier(candidate.multiplier)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-sm text-amber-700 dark:text-amber-300">
                  {candidate.priority ?? "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

/**
 * Surcharge Row Sub-component
 */
interface SurchargeRowProps {
  label: string;
  surcharge: ZoneSurchargeInfo;
}

function SurchargeRow({ label, surcharge }: SurchargeRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex flex-col">
          <span className="font-medium text-sm text-orange-800 dark:text-orange-200">
            {label}: {surcharge.zoneName}
          </span>
          <span className="text-xs text-orange-600 dark:text-orange-400 font-mono">
            {surcharge.zoneCode}
          </span>
          {surcharge.description && (
            <span className="text-xs text-orange-500 dark:text-orange-500 mt-0.5">
              {surcharge.description}
            </span>
          )}
        </div>
      </TableCell>
      <TableCell className="text-right text-sm text-orange-700 dark:text-orange-300">
        {surcharge.parkingSurcharge > 0 ? formatPrice(surcharge.parkingSurcharge) : "-"}
      </TableCell>
      <TableCell className="text-right text-sm text-orange-700 dark:text-orange-300">
        {surcharge.accessFee > 0 ? formatPrice(surcharge.accessFee) : "-"}
      </TableCell>
      <TableCell className="text-right text-sm font-medium text-orange-800 dark:text-orange-200">
        {formatPrice(surcharge.parkingSurcharge + surcharge.accessFee)}
      </TableCell>
    </TableRow>
  );
}

export default ZoneTransparencySection;
