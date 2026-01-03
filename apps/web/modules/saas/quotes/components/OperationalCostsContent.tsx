"use client";

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
  ClockIcon,
  FuelIcon,
  MapIcon,
  PencilIcon,
  RouteIcon,
  TruckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { EditableCostRow } from "./EditableCostRow";
import type { TripAnalysis } from "../types";
import {
  formatPrice,
  formatDuration,
  isCostOverridden,
  getEffectiveCost,
  getOriginalCost,
  hasManualCostOverrides,
} from "../types";

interface OperationalCostsContentProps {
  tripAnalysis: TripAnalysis;
  canEditCosts?: boolean;
  onCostSave?: (componentName: string, value: number) => Promise<void>;
  isCostUpdating?: boolean;
}

/**
 * OperationalCostsContent Component
 * 
 * Displays operational cost breakdown within the collapsible section.
 * Shows: fuel, tolls, wear, driver costs, parking.
 * Supports manual editing for authorized users.
 * 
 * @see Story 21-7: Enhanced TripTransparency Interface
 * @see Story 6.8: Manual Editing of Cost Components
 */
export function OperationalCostsContent({
  tripAnalysis,
  canEditCosts = false,
  onCostSave,
  isCostUpdating = false,
}: OperationalCostsContentProps) {
  const t = useTranslations();

  const handleCostSave = async (componentName: string, value: number) => {
    if (onCostSave) {
      await onCostSave(componentName, value);
    }
  };

  return (
    <div className="space-y-3">
      {/* Manual Edit Badge */}
      {hasManualCostOverrides(tripAnalysis) && (
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-2 rounded-md">
          <PencilIcon className="size-4" />
          <span className="text-sm font-medium">
            {t("quotes.create.tripTransparency.costs.manuallyEdited")}
          </span>
        </div>
      )}

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-gray-700 dark:text-gray-300">
              {t("quotes.create.tripTransparency.costType")}
            </TableHead>
            <TableHead className="text-right text-gray-700 dark:text-gray-300">
              {t("quotes.create.tripTransparency.amount")}
            </TableHead>
            <TableHead className="text-right text-gray-700 dark:text-gray-300">
              {t("quotes.create.tripTransparency.details")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Fuel Cost */}
          {tripAnalysis.costBreakdown?.fuel && (
            <EditableCostRow
              icon={FuelIcon}
              label={t("quotes.create.tripTransparency.costs.fuel")}
              amount={getEffectiveCost(tripAnalysis, 'fuel')}
              originalAmount={getOriginalCost(tripAnalysis, 'fuel')}
              details={
                <span className="flex items-center gap-2">
                  <span>
                    {tripAnalysis.costBreakdown.fuel.distanceKm.toFixed(1)} km × {tripAnalysis.costBreakdown.fuel.consumptionL100km} L/100km × {formatPrice(tripAnalysis.costBreakdown.fuel.pricePerLiter)}/L
                  </span>
                  {tripAnalysis.fuelPriceSource?.source === "REALTIME" ? (
                    <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-green-600 hover:bg-green-700">
                      API
                    </Badge>
                  ) : tripAnalysis.fuelPriceSource?.source === "CACHE" ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Cache
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      Défaut
                    </Badge>
                  )}
                </span>
              }
              componentName="fuel"
              isEditable={canEditCosts}
              isEdited={isCostOverridden(tripAnalysis, 'fuel')}
              isLoading={isCostUpdating}
              onSave={handleCostSave}
            />
          )}

          {/* Tolls Cost */}
          {tripAnalysis.costBreakdown?.tolls && (
            <EditableCostRow
              icon={RouteIcon}
              label={t("quotes.create.tripTransparency.costs.tolls")}
              amount={getEffectiveCost(tripAnalysis, 'tolls')}
              originalAmount={getOriginalCost(tripAnalysis, 'tolls')}
              details={
                tripAnalysis.tollSource === "GOOGLE_API" ? (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4 bg-green-600 hover:bg-green-700">
                    API
                  </Badge>
                ) : (
                  <span className="flex items-center gap-2">
                    <span>
                      {tripAnalysis.costBreakdown.tolls.distanceKm.toFixed(1)} km × {formatPrice(tripAnalysis.costBreakdown.tolls.ratePerKm)}/km
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                      Estimé
                    </Badge>
                  </span>
                )
              }
              componentName="tolls"
              isEditable={canEditCosts}
              isEdited={isCostOverridden(tripAnalysis, 'tolls')}
              isLoading={isCostUpdating}
              onSave={handleCostSave}
            />
          )}

          {/* Wear Cost */}
          {tripAnalysis.costBreakdown?.wear && (
            <EditableCostRow
              icon={TruckIcon}
              label={t("quotes.create.tripTransparency.costs.wear")}
              amount={getEffectiveCost(tripAnalysis, 'wear')}
              originalAmount={getOriginalCost(tripAnalysis, 'wear')}
              details={`${tripAnalysis.costBreakdown.wear.distanceKm.toFixed(1)} km × ${formatPrice(tripAnalysis.costBreakdown.wear.ratePerKm)}/km`}
              componentName="wear"
              isEditable={canEditCosts}
              isEdited={isCostOverridden(tripAnalysis, 'wear')}
              isLoading={isCostUpdating}
              onSave={handleCostSave}
            />
          )}

          {/* Driver Cost */}
          {tripAnalysis.costBreakdown?.driver && (
            <EditableCostRow
              icon={ClockIcon}
              label={t("quotes.create.tripTransparency.costs.driver")}
              amount={getEffectiveCost(tripAnalysis, 'driver')}
              originalAmount={getOriginalCost(tripAnalysis, 'driver')}
              details={`${formatDuration(tripAnalysis.costBreakdown.driver.durationMinutes)} × ${formatPrice(tripAnalysis.costBreakdown.driver.hourlyRate)}/h`}
              componentName="driver"
              isEditable={canEditCosts}
              isEdited={isCostOverridden(tripAnalysis, 'driver')}
              isLoading={isCostUpdating}
              onSave={handleCostSave}
            />
          )}

          {/* Parking Cost */}
          {tripAnalysis.costBreakdown?.parking && tripAnalysis.costBreakdown.parking.amount > 0 && (
            <EditableCostRow
              icon={MapIcon}
              label={t("quotes.create.tripTransparency.costs.parking")}
              amount={getEffectiveCost(tripAnalysis, 'parking')}
              originalAmount={getOriginalCost(tripAnalysis, 'parking')}
              details={tripAnalysis.costBreakdown.parking.description}
              componentName="parking"
              isEditable={canEditCosts}
              isEdited={isCostOverridden(tripAnalysis, 'parking')}
              isLoading={isCostUpdating}
              onSave={handleCostSave}
            />
          )}

          {/* Total Row */}
          <TableRow className="font-medium bg-gray-100 dark:bg-gray-800/50">
            <TableCell className="text-gray-800 dark:text-gray-200">
              {t("quotes.create.tripTransparency.totalCost")}
            </TableCell>
            <TableCell className="text-right text-gray-800 dark:text-gray-200">
              {formatPrice(
                tripAnalysis.effectiveCosts?.total ?? tripAnalysis.costBreakdown?.total ?? 0
              )}
            </TableCell>
            <TableCell />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}

export default OperationalCostsContent;
