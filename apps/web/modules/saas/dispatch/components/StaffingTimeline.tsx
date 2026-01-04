"use client";

import { Badge } from "@ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@ui/components/collapsible";
import {
	Building2,
	Calendar,
	ChevronDown,
	ChevronUp,
	UtensilsCrossed,
	Users,
	MapPin,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@ui/lib";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import type { StayDayListItem } from "../types";

/**
 * StaffingTimeline Component
 *
 * Story 22.9: Enhance Dispatch with Staffing Information Display
 *
 * Displays a timeline view for multi-day STAY missions showing:
 * - Each day with its services
 * - Daily staffing requirements (drivers, hotel, meals)
 * - Daily costs breakdown
 *
 * @see AC3: Timeline View for Multi-Day Missions
 * @see AC7: STAY Trip Staffing Display
 */

interface StaffingTimelineProps {
	stayDays?: StayDayListItem[];
	className?: string;
	defaultExpanded?: boolean;
}

export function StaffingTimeline({
	stayDays,
	className,
	defaultExpanded = false,
}: StaffingTimelineProps) {
	const t = useTranslations("dispatch.staffing.timeline");
	const [isExpanded, setIsExpanded] = useState(defaultExpanded);

	if (!stayDays || stayDays.length === 0) {
		return null;
	}

	// Calculate totals
	const totalDays = stayDays.length;
	const totalServices = stayDays.reduce((sum, day) => sum + day.serviceCount, 0);
	const totalHotelNights = stayDays.filter((day) => day.hotelRequired).length;
	const totalMeals = stayDays.reduce((sum, day) => sum + day.mealCount, 0);

	return (
		<Card className={cn("", className)} data-testid="staffing-timeline">
			<Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
				<CollapsibleTrigger asChild>
					<CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors pb-3">
						<div className="flex items-center justify-between">
							<CardTitle className="flex items-center gap-2 text-base">
								<Calendar className="size-5 text-purple-600" />
								{t("title")}
							</CardTitle>
							<div className="flex items-center gap-2">
								{/* Summary badges */}
								<Badge variant="secondary" className="text-xs">
									{totalDays} {t("days")}
								</Badge>
								<Badge variant="secondary" className="text-xs">
									{totalServices} {t("services")}
								</Badge>
								{isExpanded ? (
									<ChevronUp className="size-4 text-muted-foreground" />
								) : (
									<ChevronDown className="size-4 text-muted-foreground" />
								)}
							</div>
						</div>
						{/* Compact summary when collapsed */}
						{!isExpanded && (
							<div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
								{totalHotelNights > 0 && (
									<span className="flex items-center gap-1">
										<Building2 className="size-3.5" />
										{totalHotelNights} {t("nights")}
									</span>
								)}
								{totalMeals > 0 && (
									<span className="flex items-center gap-1">
										<UtensilsCrossed className="size-3.5" />
										{totalMeals} {t("meals")}
									</span>
								)}
							</div>
						)}
					</CardHeader>
				</CollapsibleTrigger>

				<CollapsibleContent>
					<CardContent className="pt-0">
						<div className="space-y-3">
							{stayDays.map((day, index) => (
								<DayCard
									key={day.dayNumber}
									day={day}
									isLast={index === stayDays.length - 1}
									t={t}
								/>
							))}
						</div>

						{/* Totals summary */}
						<div className="mt-4 pt-3 border-t">
							<div className="flex items-center justify-between text-sm">
								<span className="font-medium">{t("totalSummary")}</span>
								<div className="flex items-center gap-3 text-muted-foreground">
									<span className="flex items-center gap-1">
										<MapPin className="size-3.5" />
										{totalServices} {t("services")}
									</span>
									{totalHotelNights > 0 && (
										<span className="flex items-center gap-1">
											<Building2 className="size-3.5" />
											{totalHotelNights} {t("nights")}
										</span>
									)}
									{totalMeals > 0 && (
										<span className="flex items-center gap-1">
											<UtensilsCrossed className="size-3.5" />
											{totalMeals} {t("meals")}
										</span>
									)}
								</div>
							</div>
						</div>
					</CardContent>
				</CollapsibleContent>
			</Collapsible>
		</Card>
	);
}

interface DayCardProps {
	day: StayDayListItem;
	isLast: boolean;
	t: ReturnType<typeof useTranslations>;
}

function DayCard({ day, isLast, t }: DayCardProps) {
	const dayDate = new Date(day.date);

	return (
		<div
			className={cn(
				"relative pl-6 pb-3",
				!isLast && "border-l-2 border-purple-200 dark:border-purple-800"
			)}
		>
			{/* Timeline dot */}
			<div className="absolute left-0 top-0 -translate-x-1/2 w-3 h-3 rounded-full bg-purple-500 border-2 border-background" />

			<div className="bg-muted/30 rounded-lg p-3">
				{/* Day header */}
				<div className="flex items-center justify-between mb-2">
					<div className="flex items-center gap-2">
						<span className="font-semibold text-sm">
							{t("dayNumber", { number: day.dayNumber })}
						</span>
						<span className="text-xs text-muted-foreground">
							{format(dayDate, "EEEE d MMMM", { locale: fr })}
						</span>
					</div>
					<Badge variant="outline" className="text-xs">
						{day.serviceCount} {day.serviceCount > 1 ? t("services") : t("service")}
					</Badge>
				</div>

				{/* Day details */}
				<div className="flex items-center gap-4 text-xs text-muted-foreground">
					{/* Drivers */}
					<span className="flex items-center gap-1">
						<Users className="size-3.5" />
						{day.driverCount} {day.driverCount > 1 ? t("drivers") : t("driver")}
					</span>

					{/* Hotel */}
					{day.hotelRequired && (
						<span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
							<Building2 className="size-3.5" />
							{t("hotelRequired")}
						</span>
					)}

					{/* Meals */}
					{day.mealCount > 0 && (
						<span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
							<UtensilsCrossed className="size-3.5" />
							{day.mealCount} {day.mealCount > 1 ? t("meals") : t("meal")}
						</span>
					)}
				</div>
			</div>
		</div>
	);
}

export default StaffingTimeline;
