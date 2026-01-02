"use client";

import { Badge } from "@ui/components/badge";
import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import {
  UsersIcon,
  CarIcon,
  CalendarIcon,
  CheckCircleIcon,
  InfoIcon,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { CompliancePlan, StaffingPlanType } from "../types";

interface StaffingPlanBadgeProps {
  compliancePlan: CompliancePlan | null | undefined;
  className?: string;
  showDetails?: boolean;
}

/**
 * Icon mapping for staffing plan types
 */
const PLAN_ICONS: Record<StaffingPlanType, LucideIcon> = {
  NONE: CheckCircleIcon,
  DOUBLE_CREW: UsersIcon,
  RELAY_DRIVER: CarIcon,
  MULTI_DAY: CalendarIcon,
};

/**
 * Get badge variant for staffing plan type
 */
function getPlanVariant(planType: StaffingPlanType): "default" | "secondary" | "outline" {
  switch (planType) {
    case "DOUBLE_CREW":
      return "default";
    case "RELAY_DRIVER":
      return "secondary";
    case "MULTI_DAY":
      return "outline";
    default:
      return "outline";
  }
}

/**
 * Format price in EUR
 */
function formatPrice(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * StaffingPlanBadge Component
 * 
 * Story 19.1: Displays the automatically selected staffing plan for RSE compliance.
 * Shows a badge when DOUBLE_CREW, RELAY_DRIVER, or MULTI_DAY is required.
 * 
 * @see Story 19.1: Fix RSE Compliance & Pricing Critical Bugs
 */
export function StaffingPlanBadge({
  compliancePlan,
  className,
  showDetails = false,
}: StaffingPlanBadgeProps) {
  const t = useTranslations();

  // Don't show anything if no plan or plan is NONE
  if (!compliancePlan || compliancePlan.planType === "NONE" || !compliancePlan.isRequired) {
    return null;
  }

  const Icon = PLAN_ICONS[compliancePlan.planType] || CheckCircleIcon;
  const variant = getPlanVariant(compliancePlan.planType);

  // Get translated plan name
  const planNames: Record<StaffingPlanType, string> = {
    NONE: "",
    DOUBLE_CREW: t("quotes.staffing.doubleCrew"),
    RELAY_DRIVER: t("quotes.staffing.relayDriver"),
    MULTI_DAY: t("quotes.staffing.multiDay"),
  };

  const planName = planNames[compliancePlan.planType] || compliancePlan.planType;

  // Simple badge view
  if (!showDetails) {
    return (
      <Badge
        variant={variant}
        className={cn("gap-1.5", className)}
      >
        <Icon className="size-3.5" />
        <span>{planName}</span>
        {compliancePlan.additionalCost > 0 && (
          <span className="font-semibold">
            +{formatPrice(compliancePlan.additionalCost)}
          </span>
        )}
      </Badge>
    );
  }

  // Detailed view with cost breakdown
  return (
    <Alert
      className={cn(
        "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
        className
      )}
    >
      <Icon className="size-5 text-blue-600 dark:text-blue-400" />
      <AlertTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
        {planName}
        {compliancePlan.additionalCost > 0 && (
          <Badge variant="secondary" className="ml-2">
            +{formatPrice(compliancePlan.additionalCost)}
          </Badge>
        )}
      </AlertTitle>
      <AlertDescription className="text-blue-700 dark:text-blue-300">
        <p className="mb-2">{compliancePlan.selectedReason}</p>
        
        {/* Schedule info */}
        <div className="flex flex-wrap gap-4 text-sm">
          <span className="flex items-center gap-1">
            <UsersIcon className="size-3.5" />
            {compliancePlan.adjustedSchedule.driversRequired} {t("quotes.staffing.drivers")}
          </span>
          {compliancePlan.adjustedSchedule.daysRequired > 1 && (
            <span className="flex items-center gap-1">
              <CalendarIcon className="size-3.5" />
              {compliancePlan.adjustedSchedule.daysRequired} {t("quotes.staffing.days")}
            </span>
          )}
          {compliancePlan.adjustedSchedule.hotelNightsRequired > 0 && (
            <span className="flex items-center gap-1">
              <InfoIcon className="size-3.5" />
              {compliancePlan.adjustedSchedule.hotelNightsRequired} {t("quotes.staffing.nights")}
            </span>
          )}
        </div>

        {/* Cost breakdown if there are costs */}
        {compliancePlan.additionalCost > 0 && (
          <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 text-xs">
            <span className="font-medium">{t("quotes.staffing.costBreakdown")}:</span>
            <div className="flex flex-wrap gap-3 mt-1">
              {compliancePlan.costBreakdown.extraDriverCost > 0 && (
                <span>{t("quotes.staffing.driverCost")}: {formatPrice(compliancePlan.costBreakdown.extraDriverCost)}</span>
              )}
              {compliancePlan.costBreakdown.hotelCost > 0 && (
                <span>{t("quotes.staffing.hotelCost")}: {formatPrice(compliancePlan.costBreakdown.hotelCost)}</span>
              )}
              {compliancePlan.costBreakdown.mealAllowance > 0 && (
                <span>{t("quotes.staffing.mealCost")}: {formatPrice(compliancePlan.costBreakdown.mealAllowance)}</span>
              )}
            </div>
          </div>
        )}

        {/* Original violations that triggered this plan */}
        {compliancePlan.originalViolations.length > 0 && (
          <div className="mt-2 pt-2 border-t border-blue-200 dark:border-blue-800 text-xs opacity-75">
            <span className="font-medium">{t("quotes.staffing.resolvedViolations")}:</span>
            <ul className="list-disc list-inside mt-1">
              {compliancePlan.originalViolations.map((v, i) => (
                <li key={i}>{v.message}</li>
              ))}
            </ul>
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}

export default StaffingPlanBadge;
