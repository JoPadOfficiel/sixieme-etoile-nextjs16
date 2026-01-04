"use client";

import { Badge } from "@ui/components/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { Building2, UtensilsCrossed, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

/**
 * StaffingIndicators Component
 *
 * Story 22.9: Enhance Dispatch with Staffing Information Display
 *
 * Displays compact visual indicators for staffing requirements in mission list:
 * - Hotel icon if overnight stay required
 * - Meal icon if meal allowance included
 * - Double driver icon if second driver required
 *
 * @see AC1: Staffing Indicators in Mission List
 * @see AC2: Mission Row Staffing Summary
 */

export interface StaffingSummary {
	driverCount: number;
	hotelNights: number;
	mealCount: number;
	totalStaffingCost: number;
	planType: "SINGLE_DRIVER" | "DOUBLE_CREW" | "RELAY" | "MULTI_DAY";
	isRSERequired: boolean;
}

interface StaffingIndicatorsProps {
	staffingSummary?: StaffingSummary | null;
	className?: string;
	showCost?: boolean;
}

/**
 * Format currency in EUR
 */
function formatCurrency(amount: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(amount);
}

export function StaffingIndicators({
	staffingSummary,
	className,
	showCost = false,
}: StaffingIndicatorsProps) {
	const t = useTranslations("dispatch.staffing");

	if (!staffingSummary) {
		return null;
	}

	const {
		driverCount,
		hotelNights,
		mealCount,
		totalStaffingCost,
		planType,
		isRSERequired,
	} = staffingSummary;

	const hasHotel = hotelNights > 0;
	const hasMeals = mealCount > 0;
	const hasSecondDriver = driverCount > 1;

	if (!hasHotel && !hasMeals && !hasSecondDriver && !isRSERequired) {
		return null;
	}

	return (
		<div className={cn("flex items-center gap-1", className)}>
			{/* Second Driver Indicator */}
			{hasSecondDriver && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge
								variant="outline"
								className="p-1 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
								data-testid="staffing-driver-badge"
							>
								<Users className="size-3.5" />
								<span className="ml-0.5 text-xs">{driverCount}</span>
							</Badge>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="font-medium">
								{t("driverCount", { count: driverCount })}
							</p>
							<p className="text-xs text-muted-foreground">
								{t(`planTypes.${planType}`)}
							</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}

			{/* Hotel Indicator */}
			{hasHotel && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge
								variant="outline"
								className="p-1 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
								data-testid="staffing-hotel-badge"
							>
								<Building2 className="size-3.5" />
								{hotelNights > 1 && (
									<span className="ml-0.5 text-xs">{hotelNights}</span>
								)}
							</Badge>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="font-medium">{t("hotelNights", { count: hotelNights })}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}

			{/* Meals Indicator */}
			{hasMeals && (
				<TooltipProvider>
					<Tooltip>
						<TooltipTrigger asChild>
							<Badge
								variant="outline"
								className="p-1 border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
								data-testid="staffing-meals-badge"
							>
								<UtensilsCrossed className="size-3.5" />
								{mealCount > 1 && (
									<span className="ml-0.5 text-xs">{mealCount}</span>
								)}
							</Badge>
						</TooltipTrigger>
						<TooltipContent side="top">
							<p className="font-medium">{t("mealCount", { count: mealCount })}</p>
						</TooltipContent>
					</Tooltip>
				</TooltipProvider>
			)}

			{/* RSE Badge (when no other indicators but RSE required) */}
			{isRSERequired && !hasSecondDriver && !hasHotel && !hasMeals && (
				<Badge
					variant="outline"
					className="px-1.5 py-0.5 text-xs border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400"
					data-testid="staffing-rse-badge"
				>
					RSE
				</Badge>
			)}

			{/* Total Cost Badge */}
			{showCost && totalStaffingCost > 0 && (
				<Badge
					variant="secondary"
					className="px-1.5 py-0.5 text-xs"
					data-testid="staffing-cost-badge"
				>
					{formatCurrency(totalStaffingCost)}
				</Badge>
			)}
		</div>
	);
}

export default StaffingIndicators;
