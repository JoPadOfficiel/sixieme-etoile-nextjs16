"use client";

/**
 * GanttZoomControls Component
 *
 * Story 27.12: Gantt Time & Zoom Controls
 *
 * Toolbar component for controlling the Gantt timeline zoom level
 * and navigating to specific dates.
 */

import { Button } from "@ui/components/button";
import { Calendar as CalendarComponent } from "@ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import { type Locale, format } from "date-fns";
import { enUS, fr } from "date-fns/locale";
import { Calendar, Clock, ZoomIn, ZoomOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { memo, useMemo } from "react";

interface GanttZoomControlsProps {
	/** Current pixels per hour value */
	pixelsPerHour: number;
	/** Whether zoom in is possible */
	canZoomIn: boolean;
	/** Whether zoom out is possible */
	canZoomOut: boolean;
	/** Function to zoom in */
	onZoomIn: () => void;
	/** Function to zoom out */
	onZoomOut: () => void;
	/** Function to jump to current time */
	onJumpToNow: () => void;
	/** Function to navigate to a specific date */
	onNavigateToDate: (date: Date) => void;
	/** Current selected date */
	selectedDate: Date;
	/** Human-readable zoom label */
	zoomLabel?: string;
	/** Zoom percentage (0-100) */
	zoomPercent?: number;
	/** Additional CSS classes */
	className?: string;
}

/** Map of locale codes to date-fns locale objects */
const localeMap: Record<string, Locale> = {
	fr: fr,
	en: enUS,
};

export const GanttZoomControls = memo(function GanttZoomControls({
	pixelsPerHour,
	canZoomIn,
	canZoomOut,
	onZoomIn,
	onZoomOut,
	onJumpToNow,
	onNavigateToDate,
	selectedDate,
	zoomLabel,
	zoomPercent,
	className,
}: GanttZoomControlsProps) {
	const t = useTranslations("dispatch.gantt");
	const localeCode = useLocale();

	// Get the appropriate date-fns locale, defaulting to French
	const dateFnsLocale = useMemo(() => {
		return localeMap[localeCode] || fr;
	}, [localeCode]);

	return (
		<div className={cn("flex items-center gap-2", className)}>
			{/* Zoom Controls Group */}
			<div className="flex items-center gap-1 rounded-md bg-gray-100 p-1 dark:bg-gray-800">
				{/* Zoom Out Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={onZoomOut}
							disabled={!canZoomOut}
							className="h-7 w-7"
							aria-label={t("zoomOut")}
						>
							<ZoomOut className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<p>{t("zoomOut")}</p>
					</TooltipContent>
				</Tooltip>

				{/* Zoom Level Indicator */}
				<div className="min-w-[60px] px-2 text-center">
					<span className="font-medium text-gray-700 text-xs dark:text-gray-300">
						{zoomLabel ? t(`zoomLevel.${zoomLabel}`) : `${pixelsPerHour}px/h`}
					</span>
					{zoomPercent !== undefined && (
						<div className="mt-0.5 h-1 rounded-full bg-gray-200 dark:bg-gray-700">
							<div
								className="h-full rounded-full bg-blue-500 transition-all duration-200"
								style={{ width: `${zoomPercent}%` }}
							/>
						</div>
					)}
				</div>

				{/* Zoom In Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="ghost"
							size="icon"
							onClick={onZoomIn}
							disabled={!canZoomIn}
							className="h-7 w-7"
							aria-label={t("zoomIn")}
						>
							<ZoomIn className="h-4 w-4" />
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<p>{t("zoomIn")}</p>
					</TooltipContent>
				</Tooltip>
			</div>

			{/* Separator */}
			<div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />

			{/* Navigation Controls */}
			<div className="flex items-center gap-1">
				{/* Today Button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							onClick={onJumpToNow}
							className="h-8"
						>
							<Clock className="mr-1 h-4 w-4" />
							{t("jumpToNow")}
						</Button>
					</TooltipTrigger>
					<TooltipContent side="bottom">
						<p>{t("jumpToNowTooltip")}</p>
					</TooltipContent>
				</Tooltip>

				{/* Date Picker */}
				<Popover>
					<Tooltip>
						<TooltipTrigger asChild>
							<PopoverTrigger asChild>
								<Button variant="outline" size="sm" className="h-8">
									<Calendar className="mr-1 h-4 w-4" />
									{format(selectedDate, "dd MMM", { locale: dateFnsLocale })}
								</Button>
							</PopoverTrigger>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>{t("selectDate")}</p>
						</TooltipContent>
					</Tooltip>
					<PopoverContent className="w-auto p-0" align="start">
						<CalendarComponent
							mode="single"
							selected={selectedDate}
							onSelect={(date) => date && onNavigateToDate(date)}
							initialFocus
							locale={dateFnsLocale}
						/>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
});
