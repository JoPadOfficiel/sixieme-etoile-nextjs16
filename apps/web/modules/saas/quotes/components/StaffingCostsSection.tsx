"use client";

import { Badge } from "@ui/components/badge";
import {
  UsersIcon,
  BedDoubleIcon,
  UtensilsIcon,
  CalendarIcon,
  InfoIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { CompliancePlan, StaffingPlanType } from "../types";

interface StaffingCostsSectionProps {
  compliancePlan: CompliancePlan | null | undefined;
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
 * Format hours with 2 decimal places
 */
function formatHours(hours: number): string {
  return hours.toFixed(2);
}

/**
 * Default cost parameters (matching compliance-validator.ts)
 */
const DEFAULT_COSTS = {
  driverHourlyCost: 25,
  hotelCostPerNight: 100,
  mealAllowancePerDay: 30,
};

/**
 * StaffingCostsSection Component
 * 
 * Story 21.1: Displays ultra-detailed staffing cost breakdown in TripTransparency.
 * Shows explicit calculations for:
 * - Second driver cost (hours × hourly rate)
 * - Hotel cost (nights × drivers × rate per night)
 * - Meal allowance (days × drivers × rate per day)
 * 
 * @see Story 21.1: Ultra-Detailed Staffing Costs Display in TripTransparency
 * @see FR89, FR90: Display ultra-detailed staffing cost breakdown
 */
export function StaffingCostsSection({
  compliancePlan,
  className,
}: StaffingCostsSectionProps) {
  const t = useTranslations();

  // Don't render if no plan, plan is NONE, or not required
  if (!compliancePlan || compliancePlan.planType === "NONE" || !compliancePlan.isRequired) {
    return null;
  }

  // Don't render if no additional costs
  if (compliancePlan.additionalCost <= 0) {
    return null;
  }

  const { costBreakdown, adjustedSchedule, planType } = compliancePlan;

  // Calculate derived values for display
  const driversRequired = adjustedSchedule.driversRequired;
  const daysRequired = adjustedSchedule.daysRequired;
  const hotelNightsRequired = adjustedSchedule.hotelNightsRequired;

  // Reverse-engineer hours from cost (cost = hours × hourlyRate)
  // This gives us the hours worked by the second driver
  const extraDriverHours = costBreakdown.extraDriverCost > 0
    ? costBreakdown.extraDriverCost / DEFAULT_COSTS.driverHourlyCost
    : 0;

  // Get plan type label
  const planTypeLabels: Record<StaffingPlanType, string> = {
    NONE: "",
    DOUBLE_CREW: t("quotes.staffing.doubleCrew"),
    RELAY_DRIVER: t("quotes.staffing.relayDriver"),
    MULTI_DAY: t("quotes.staffing.multiDay"),
  };

  return (
    <div
      className={cn(
        "rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/50 p-4 mb-4",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <UsersIcon className="size-5 text-blue-600 dark:text-blue-400" />
          <span className="font-semibold text-blue-800 dark:text-blue-200">
            {t("quotes.staffing.detailedCosts.title")}
          </span>
          <Badge variant="secondary" className="text-xs">
            {planTypeLabels[planType]}
          </Badge>
        </div>
        <Badge variant="outline" className="text-xs text-blue-600 dark:text-blue-400">
          RSE
        </Badge>
      </div>

      {/* Cost Items */}
      <div className="space-y-3">
        {/* Second Driver Cost */}
        {costBreakdown.extraDriverCost > 0 && (
          <StaffingCostRow
            icon={UsersIcon}
            label={t("quotes.staffing.detailedCosts.secondDriver")}
            calculation={`${formatHours(extraDriverHours)}h × ${formatPrice(DEFAULT_COSTS.driverHourlyCost)}/h`}
            amount={costBreakdown.extraDriverCost}
            source="org"
            t={t}
          />
        )}

        {/* Hotel Cost */}
        {costBreakdown.hotelCost > 0 && (
          <StaffingCostRow
            icon={BedDoubleIcon}
            label={t("quotes.staffing.detailedCosts.hotel")}
            calculation={`${hotelNightsRequired} ${t("quotes.staffing.detailedCosts.nights")} × ${driversRequired} ${t("quotes.staffing.detailedCosts.driversShort")} × ${formatPrice(DEFAULT_COSTS.hotelCostPerNight)}/${t("quotes.staffing.detailedCosts.night")}`}
            amount={costBreakdown.hotelCost}
            source="org"
            t={t}
          />
        )}

        {/* Meal Allowance */}
        {costBreakdown.mealAllowance > 0 && (
          <StaffingCostRow
            icon={UtensilsIcon}
            label={t("quotes.staffing.detailedCosts.meals")}
            calculation={`${daysRequired} ${t("quotes.staffing.detailedCosts.daysShort")} × ${driversRequired} ${t("quotes.staffing.detailedCosts.driversShort")} × ${formatPrice(DEFAULT_COSTS.mealAllowancePerDay)}/${t("quotes.staffing.detailedCosts.day")}`}
            amount={costBreakdown.mealAllowance}
            source="default"
            t={t}
          />
        )}

        {/* Other Costs (if any) */}
        {costBreakdown.otherCosts > 0 && (
          <StaffingCostRow
            icon={InfoIcon}
            label={t("quotes.staffing.detailedCosts.other")}
            calculation=""
            amount={costBreakdown.otherCosts}
            source="default"
            t={t}
          />
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-blue-200 dark:border-blue-800 my-3" />

      {/* Total */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-blue-800 dark:text-blue-200">
          {t("quotes.staffing.detailedCosts.total")}
        </span>
        <span className="font-bold text-lg text-blue-800 dark:text-blue-200">
          {formatPrice(compliancePlan.additionalCost)}
        </span>
      </div>

      {/* Schedule Summary */}
      <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-800">
        <div className="flex flex-wrap gap-4 text-xs text-blue-700 dark:text-blue-300">
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {driversRequired} {t("quotes.staffing.drivers")}
          </span>
          {daysRequired > 1 && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" />
              {daysRequired} {t("quotes.staffing.days")}
            </span>
          )}
          {hotelNightsRequired > 0 && (
            <span className="flex items-center gap-1">
              <BedDoubleIcon className="size-3.5" />
              {hotelNightsRequired} {t("quotes.staffing.nights")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Individual cost row component
 */
interface StaffingCostRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  calculation: string;
  amount: number;
  source: "org" | "default";
  t: ReturnType<typeof useTranslations>;
}

function StaffingCostRow({
  icon: Icon,
  label,
  calculation,
  amount,
  source,
  t,
}: StaffingCostRowProps) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="flex items-start gap-2 flex-1 min-w-0">
        <Icon className="size-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="font-medium text-sm text-blue-800 dark:text-blue-200">
            {label}
          </div>
          {calculation && (
            <div className="text-xs text-blue-600 dark:text-blue-400 mt-0.5">
              {calculation}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <span className="font-semibold text-sm text-blue-800 dark:text-blue-200">
          {formatPrice(amount)}
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] px-1.5 py-0 h-4",
            source === "org"
              ? "border-green-500 text-green-600 dark:border-green-400 dark:text-green-400"
              : "border-gray-400 text-gray-500 dark:border-gray-500 dark:text-gray-400"
          )}
        >
          {source === "org" ? t("quotes.staffing.detailedCosts.sourceOrg") : t("quotes.staffing.detailedCosts.sourceDefault")}
        </Badge>
      </div>
    </div>
  );
}

export default StaffingCostsSection;
