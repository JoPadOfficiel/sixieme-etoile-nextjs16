"use client";

import { Badge } from "@ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@ui/components/collapsible";
import { Skeleton } from "@ui/components/skeleton";
import { cn } from "@ui/lib";
import {
	Building2,
	ChevronDown,
	ChevronUp,
	Info,
	Users,
	UtensilsCrossed,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * StaffingCostsSection Component
 *
 * Story 21.5: RSE Staffing Integration in Dispatch
 *
 * Displays detailed RSE staffing information for a mission including:
 * - Driver count requirements with RSE justification
 * - Hotel costs with per-night breakdown
 * - Meal costs with per-driver breakdown
 * - Total staffing costs
 */

interface StaffingPlan {
	planType: "SINGLE_DRIVER" | "DOUBLE_CREW" | "RELAY" | "MULTI_DAY";
	reason?: string;
	driverCount: number;
	totalDrivingHours?: number;
	totalAmplitudeHours?: number;
}

interface StaffingCostsBreakdown {
	hotelNights?: number;
	hotelRatePerNight?: number;
	mealCount?: number;
	mealRatePerMeal?: number;
	secondDriverHours?: number;
	secondDriverHourlyRate?: number;
	driversRequiringHotel?: number;
	driversRequiringMeals?: number;
}

interface StaffingCosts {
	secondDriverCost?: number;
	hotelCost?: number;
	mealCost?: number;
	totalStaffingCost?: number;
	breakdown?: StaffingCostsBreakdown;
}

interface TripAnalysis {
	compliancePlan?: StaffingPlan;
	staffingCosts?: StaffingCosts;
}

interface StaffingCostsSectionProps {
	tripAnalysis: TripAnalysis | unknown | null;
	isLoading?: boolean;
	className?: string;
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

/**
 * Format hours with 1 decimal
 */
function formatHours(hours: number): string {
	return `${hours.toFixed(1)}h`;
}

/**
 * Loading skeleton
 */
function StaffingCostsSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<Skeleton className="h-5 w-40" />
			</CardHeader>
			<CardContent className="space-y-3">
				<Skeleton className="h-16 w-full" />
				<Skeleton className="h-12 w-full" />
			</CardContent>
		</Card>
	);
}

/**
 * Driver count section
 */
function DriverCountSection({
	plan,
	isExpanded,
	onToggle,
}: {
	plan: StaffingPlan;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const t = useTranslations("dispatch.staffing");

	const isRSE = plan.planType !== "SINGLE_DRIVER";
	const bgClass = isRSE
		? "bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800"
		: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800";
	const textClass = isRSE
		? "text-amber-700 dark:text-amber-300"
		: "text-green-700 dark:text-green-300";
	const iconClass = isRSE ? "text-amber-600" : "text-green-600";

	return (
		<Collapsible open={isExpanded} onOpenChange={onToggle}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className={cn(
						"flex w-full items-center justify-between rounded-lg border p-3 transition-colors hover:opacity-90",
						bgClass,
					)}
				>
					<div className="flex items-center gap-3">
						<Users className={cn("h-5 w-5", iconClass)} />
						<div className="text-left">
							<p className={cn("font-medium text-sm", textClass)}>
								{t("driverCount", { count: plan.driverCount })}
							</p>
							{isRSE && plan.reason && plan.reason !== "undefined" && (
								<p className="mt-0.5 text-muted-foreground text-xs">
									{plan.reason}
								</p>
							)}
						</div>
					</div>
					<div className="flex items-center gap-2">
						{isRSE && (
							<Badge variant="secondary" className="text-xs">
								RSE
							</Badge>
						)}
						{isExpanded ? (
							<ChevronUp className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("planType")}</span>
						<span className="font-medium">
							{t(`planTypes.${plan.planType}`)}
						</span>
					</div>
					{plan.totalDrivingHours !== undefined &&
						plan.totalDrivingHours !== null &&
						!Number.isNaN(plan.totalDrivingHours) && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									{t("totalDriving")}
								</span>
								<span className="font-medium">
									{formatHours(plan.totalDrivingHours)}
								</span>
							</div>
						)}
					{plan.totalAmplitudeHours !== undefined &&
						plan.totalAmplitudeHours !== null &&
						!Number.isNaN(plan.totalAmplitudeHours) && (
							<div className="flex justify-between">
								<span className="text-muted-foreground">
									{t("totalAmplitude")}
								</span>
								<span className="font-medium">
									{formatHours(plan.totalAmplitudeHours)}
								</span>
							</div>
						)}
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

/**
 * Hotel costs section
 */
function HotelCostsSection({
	hotelCost,
	breakdown,
	isExpanded,
	onToggle,
}: {
	hotelCost: number;
	breakdown?: StaffingCostsBreakdown;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const t = useTranslations("dispatch.staffing");

	const nights =
		breakdown?.hotelNights && !Number.isNaN(breakdown.hotelNights)
			? breakdown.hotelNights
			: 0;
	const rate =
		breakdown?.hotelRatePerNight && !Number.isNaN(breakdown.hotelRatePerNight)
			? breakdown.hotelRatePerNight
			: 0;
	const drivers =
		breakdown?.driversRequiringHotel &&
		!Number.isNaN(breakdown.driversRequiringHotel)
			? breakdown.driversRequiringHotel
			: 1;

	return (
		<Collapsible open={isExpanded} onOpenChange={onToggle}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:opacity-90 dark:border-amber-800 dark:bg-amber-950"
				>
					<div className="flex items-center gap-3">
						<Building2 className="h-5 w-5 text-amber-600" />
						<div className="text-left">
							<p className="font-medium text-amber-700 text-sm dark:text-amber-300">
								{t("hotelCosts")}
							</p>
							<p className="mt-0.5 text-muted-foreground text-xs">
								{t("hotelSummary", { nights, drivers })}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-semibold text-amber-700 dark:text-amber-300">
							{formatCurrency(hotelCost)}
						</span>
						{isExpanded ? (
							<ChevronUp className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("nightCount")}</span>
						<span className="font-medium">{nights}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("driversCount")}</span>
						<span className="font-medium">{drivers}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("ratePerNight")}</span>
						<span className="font-medium">{formatCurrency(rate)}</span>
					</div>
					<div className="mt-2 flex justify-between border-t pt-2 font-medium">
						<span>{t("calculation")}</span>
						<span className="text-muted-foreground text-xs">
							{nights} × {drivers} × {formatCurrency(rate)} ={" "}
							{formatCurrency(hotelCost)}
						</span>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

/**
 * Meal costs section
 */
function MealCostsSection({
	mealCost,
	breakdown,
	isExpanded,
	onToggle,
}: {
	mealCost: number;
	breakdown?: StaffingCostsBreakdown;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const t = useTranslations("dispatch.staffing");

	const mealCount =
		breakdown?.mealCount && !Number.isNaN(breakdown.mealCount)
			? breakdown.mealCount
			: 0;
	const rate =
		breakdown?.mealRatePerMeal && !Number.isNaN(breakdown.mealRatePerMeal)
			? breakdown.mealRatePerMeal
			: 0;

	return (
		<Collapsible open={isExpanded} onOpenChange={onToggle}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:opacity-90 dark:border-amber-800 dark:bg-amber-950"
				>
					<div className="flex items-center gap-3">
						<UtensilsCrossed className="h-5 w-5 text-amber-600" />
						<div className="text-left">
							<p className="font-medium text-amber-700 text-sm dark:text-amber-300">
								{t("mealCosts")}
							</p>
							<p className="mt-0.5 text-muted-foreground text-xs">
								{t("mealSummary", { count: mealCount })}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-semibold text-amber-700 dark:text-amber-300">
							{formatCurrency(mealCost)}
						</span>
						{isExpanded ? (
							<ChevronUp className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("mealCount")}</span>
						<span className="font-medium">{mealCount}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("ratePerMeal")}</span>
						<span className="font-medium">{formatCurrency(rate)}</span>
					</div>
					<div className="mt-2 flex justify-between border-t pt-2 font-medium">
						<span>{t("calculation")}</span>
						<span className="text-muted-foreground text-xs">
							{mealCount} × {formatCurrency(rate)} = {formatCurrency(mealCost)}
						</span>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

/**
 * Second driver costs section
 */
function SecondDriverCostsSection({
	secondDriverCost,
	breakdown,
	isExpanded,
	onToggle,
}: {
	secondDriverCost: number;
	breakdown?: StaffingCostsBreakdown;
	isExpanded: boolean;
	onToggle: () => void;
}) {
	const t = useTranslations("dispatch.staffing");

	const hours =
		breakdown?.secondDriverHours && !Number.isNaN(breakdown.secondDriverHours)
			? breakdown.secondDriverHours
			: 0;
	const rate =
		breakdown?.secondDriverHourlyRate &&
		!Number.isNaN(breakdown.secondDriverHourlyRate)
			? breakdown.secondDriverHourlyRate
			: 0;

	return (
		<Collapsible open={isExpanded} onOpenChange={onToggle}>
			<CollapsibleTrigger asChild>
				<button
					type="button"
					className="flex w-full items-center justify-between rounded-lg border border-amber-200 bg-amber-50 p-3 transition-colors hover:opacity-90 dark:border-amber-800 dark:bg-amber-950"
				>
					<div className="flex items-center gap-3">
						<Users className="h-5 w-5 text-amber-600" />
						<div className="text-left">
							<p className="font-medium text-amber-700 text-sm dark:text-amber-300">
								{t("secondDriverCost")}
							</p>
							<p className="mt-0.5 text-muted-foreground text-xs">
								{t("secondDriverSummary", { hours: hours.toFixed(1) })}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<span className="font-semibold text-amber-700 dark:text-amber-300">
							{formatCurrency(secondDriverCost)}
						</span>
						{isExpanded ? (
							<ChevronUp className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronDown className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
				</button>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("workingHours")}</span>
						<span className="font-medium">{formatHours(hours)}</span>
					</div>
					<div className="flex justify-between">
						<span className="text-muted-foreground">{t("hourlyRate")}</span>
						<span className="font-medium">{formatCurrency(rate)}/h</span>
					</div>
					<div className="mt-2 flex justify-between border-t pt-2 font-medium">
						<span>{t("calculation")}</span>
						<span className="text-muted-foreground text-xs">
							{hours.toFixed(1)}h × {formatCurrency(rate)} ={" "}
							{formatCurrency(secondDriverCost)}
						</span>
					</div>
				</div>
			</CollapsibleContent>
		</Collapsible>
	);
}

export function StaffingCostsSection({
	tripAnalysis,
	isLoading,
	className,
}: StaffingCostsSectionProps) {
	const t = useTranslations("dispatch.staffing");
	const [expandedSections, setExpandedSections] = useState<Set<string>>(
		new Set(),
	);

	const toggleSection = (section: string) => {
		setExpandedSections((prev) => {
			const next = new Set(prev);
			if (next.has(section)) {
				next.delete(section);
			} else {
				next.add(section);
			}
			return next;
		});
	};

	if (isLoading) {
		return <StaffingCostsSkeleton />;
	}

	// Type guard and extract data
	const analysis = tripAnalysis as TripAnalysis | null;
	const compliancePlan = analysis?.compliancePlan;
	const staffingCosts = analysis?.staffingCosts;

	// If no compliance plan or single driver with no extra costs, show minimal or nothing
	if (!compliancePlan) {
		return null;
	}

	// Ensure driverCount has a valid value (fallback to 1 if NaN/undefined)
	const sanitizedPlan = {
		...compliancePlan,
		driverCount:
			compliancePlan.driverCount && !Number.isNaN(compliancePlan.driverCount)
				? compliancePlan.driverCount
				: compliancePlan.planType === "DOUBLE_CREW"
					? 2
					: 1,
	};

	const isStandardStaffing =
		sanitizedPlan.planType === "SINGLE_DRIVER" &&
		(!staffingCosts ||
			staffingCosts.totalStaffingCost === 0 ||
			staffingCosts.totalStaffingCost === undefined);

	// Don't show section for standard staffing without costs
	if (isStandardStaffing) {
		return null;
	}

	const hasSecondDriverCost = (staffingCosts?.secondDriverCost ?? 0) > 0;
	const hasHotelCost = (staffingCosts?.hotelCost ?? 0) > 0;
	const hasMealCost = (staffingCosts?.mealCost ?? 0) > 0;
	const totalCost = staffingCosts?.totalStaffingCost ?? 0;

	return (
		<Card className={className} data-testid="staffing-costs-section">
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="flex items-center gap-2 text-lg">
						<Users className="h-5 w-5 text-amber-600" />
						{t("title")}
					</CardTitle>
					{totalCost > 0 && (
						<Badge variant="secondary" className="font-semibold text-base">
							{formatCurrency(totalCost)}
						</Badge>
					)}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{/* Driver count section */}
				<DriverCountSection
					plan={sanitizedPlan}
					isExpanded={expandedSections.has("drivers")}
					onToggle={() => toggleSection("drivers")}
				/>

				{/* Second driver cost */}
				{hasSecondDriverCost && (
					<SecondDriverCostsSection
						secondDriverCost={staffingCosts?.secondDriverCost ?? 0}
						breakdown={staffingCosts?.breakdown}
						isExpanded={expandedSections.has("secondDriver")}
						onToggle={() => toggleSection("secondDriver")}
					/>
				)}

				{/* Hotel costs */}
				{hasHotelCost && (
					<HotelCostsSection
						hotelCost={staffingCosts?.hotelCost ?? 0}
						breakdown={staffingCosts?.breakdown}
						isExpanded={expandedSections.has("hotel")}
						onToggle={() => toggleSection("hotel")}
					/>
				)}

				{/* Meal costs */}
				{hasMealCost && (
					<MealCostsSection
						mealCost={staffingCosts?.mealCost ?? 0}
						breakdown={staffingCosts?.breakdown}
						isExpanded={expandedSections.has("meals")}
						onToggle={() => toggleSection("meals")}
					/>
				)}

				{/* Info about RSE */}
				{sanitizedPlan.planType !== "SINGLE_DRIVER" && (
					<div className="flex items-start gap-2 rounded bg-muted/50 p-2 text-muted-foreground text-xs">
						<Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
						<span>{t("rseInfo")}</span>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

export default StaffingCostsSection;
