"use client";

import { Badge } from "@ui/components/badge";
import { PercentIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import type { PricingResult } from "../types";
import { formatPrice } from "../types";

interface PriceBreakdownContentProps {
  pricingResult: PricingResult;
  commissionData?: PricingResult["commissionData"];
}

/**
 * PriceBreakdownContent Component
 * 
 * Displays the price breakdown within the collapsible section.
 * Shows: suggested price, internal cost, gross margin, commission (if applicable), net margin.
 * 
 * @see Story 21-7: Enhanced TripTransparency Interface
 */
export function PriceBreakdownContent({
  pricingResult,
  commissionData,
}: PriceBreakdownContentProps) {
  const t = useTranslations();

  const { price, internalCost, marginPercent, tripAnalysis } = pricingResult;
  const grossMargin = price - internalCost;

  return (
    <div className="space-y-3">
      {/* Suggested Price */}
      <div className="flex items-center justify-between py-2 border-b border-indigo-200 dark:border-indigo-700">
        <span className="text-indigo-700 dark:text-indigo-300">
          {t("quotes.create.tripTransparency.suggestedPrice")}
        </span>
        <span className="text-xl font-bold text-indigo-800 dark:text-indigo-200">
          {formatPrice(price)}
        </span>
      </div>

      {/* Internal Cost */}
      <div className="flex items-center justify-between py-2 border-b border-indigo-200 dark:border-indigo-700">
        <span className="text-indigo-700 dark:text-indigo-300">
          {t("quotes.create.tripTransparency.internalCost")}
        </span>
        <span className="font-medium text-indigo-800 dark:text-indigo-200">
          {formatPrice(internalCost)}
        </span>
      </div>

      {/* Gross Margin */}
      <div className="flex items-center justify-between py-2">
        <span className="text-indigo-700 dark:text-indigo-300">
          {t("quotes.create.tripTransparency.grossMargin")}
        </span>
        <div className="flex items-center gap-2">
          <span className="font-medium text-indigo-800 dark:text-indigo-200">
            {formatPrice(grossMargin)} ({marginPercent.toFixed(1)}%)
          </span>
          {!commissionData && <ProfitabilityIndicator marginPercent={marginPercent} />}
        </div>
      </div>

      {/* Commission Section for Partners */}
      {commissionData && commissionData.commissionPercent > 0 && (
        <>
          <div className="flex items-center justify-between py-2 border-t border-indigo-200 dark:border-indigo-700">
            <span className="text-indigo-700 dark:text-indigo-300 flex items-center gap-1">
              <PercentIcon className="size-3" />
              {t("quotes.create.tripTransparency.commission")} ({commissionData.commissionPercent}%)
            </span>
            <span className="font-medium text-orange-600 dark:text-orange-400">
              -{formatPrice(commissionData.commissionAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between py-2 bg-indigo-100 dark:bg-indigo-900/50 rounded px-3 -mx-1">
            <span className="font-medium text-indigo-800 dark:text-indigo-200">
              {t("quotes.create.tripTransparency.netMargin")}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-indigo-800 dark:text-indigo-200">
                {formatPrice(commissionData.effectiveMargin)} ({commissionData.effectiveMarginPercent.toFixed(1)}%)
              </span>
              <ProfitabilityIndicator marginPercent={commissionData.effectiveMarginPercent} />
            </div>
          </div>
        </>
      )}

      {/* Vehicle Selection Info */}
      {tripAnalysis.vehicleSelection?.selectedVehicle && (
        <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
          <div className="flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300">
            <Badge variant="outline" className="text-xs border-indigo-300 dark:border-indigo-600">
              {tripAnalysis.vehicleSelection.selectedVehicle.vehicleName}
            </Badge>
            <span className="text-indigo-600 dark:text-indigo-400">
              {t("quotes.create.tripTransparency.from")}{" "}
              {tripAnalysis.vehicleSelection.selectedVehicle.baseName}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

export default PriceBreakdownContent;
