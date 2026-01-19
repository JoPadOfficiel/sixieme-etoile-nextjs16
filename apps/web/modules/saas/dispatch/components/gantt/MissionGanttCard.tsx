"use client";

import { memo } from "react";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@ui/components/tooltip";
import type { GanttMission } from "./types";

interface MissionGanttCardProps {
	mission: GanttMission;
	left: number;
	width: number;
	isSelected: boolean;
	onClick?: () => void;
}

export const MissionGanttCard = memo(function MissionGanttCard({
	mission,
	left,
	width,
	isSelected,
	onClick,
}: MissionGanttCardProps) {
	const t = useTranslations("dispatch.gantt.card");
	const statusColors: Record<string, string> = {
		PENDING: "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600",
		ASSIGNED: "bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600",
		IN_PROGRESS: "bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600",
		COMPLETED: "bg-gray-100 border-gray-400 dark:bg-gray-800/50 dark:border-gray-600",
		CANCELLED: "bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600",
	};

	const typeStyles: Record<string, string> = {
		CALCULATED: "border-solid bg-opacity-100",
		MANUAL: "border-dashed bg-opacity-60 bg-stripes-gray",
	};

	// Determine styles
	const statusStyle = statusColors[mission.status] || statusColors.PENDING;
	const typeStyle = typeStyles[mission.type] || typeStyles.CALCULATED;
	
	// Format tooltip dates
	const timeRange = `${format(mission.startAt, "HH:mm")} - ${format(mission.endAt, "HH:mm")}`;

	return (
		<Tooltip delayDuration={200}>
			<TooltipTrigger asChild>
				<div
					className={cn(
						"absolute top-1 bottom-1 rounded-md border-2 cursor-pointer transition-all",
						"hover:shadow-md hover:z-10 group",
						"flex flex-col justify-center px-1.5 overflow-hidden",
						statusStyle,
						typeStyle,
						statusStyle,
						typeStyle,
						isSelected && "ring-2 ring-blue-500 ring-offset-1 z-20",
						mission.isConflict && "border-red-600 border-2 animate-pulse shadow-red-200 shadow-lg z-30"
					)}
					style={{
						left,
						width: Math.max(width, 40), // Minimum width
					}}
					onClick={(e) => {
						e.stopPropagation();
						onClick?.();
					}}
				>
					{/* Card Content */}
					<div className={cn(
						"flex flex-col w-full",
						width < 60 && "hidden"
					)}>
						<span className="text-xs font-semibold text-gray-900 dark:text-gray-100 truncate leading-tight">
							{mission.clientName || t("unknownClient")}
						</span>
						<span className="text-[10px] font-medium text-gray-600 dark:text-gray-400 truncate leading-tight opacity-90">
							{mission.type} • {mission.title}
						</span>
					</div>
				</div>
			</TooltipTrigger>
			
			<TooltipContent side="top" className="z-50 p-3 max-w-xs shadow-xl">
				<div className="flex flex-col gap-1">
					<div className="flex items-center justify-between gap-4 border-b border-gray-200 dark:border-gray-700 pb-2 mb-1">
						<span className="font-bold text-sm">{mission.clientName}</span>
						<span className={cn(
							"text-[10px] px-1.5 py-0.5 rounded-full uppercase font-bold",
							mission.status === 'ASSIGNED' ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-700"
						)}>
							{mission.status}
						</span>
					</div>
					<div className="space-y-1 text-xs">
						<p className="flex gap-2">
							<span className="text-gray-500 w-12 shrink-0">{t("mission")}:</span>
							<span className="font-medium">{mission.title}</span>
						</p>
						<p className="flex gap-2">
							<span className="text-gray-500 w-12 shrink-0">{t("time")}:</span>
							<span className="font-mono">{timeRange}</span>
						</p>
						{mission.pickupAddress && (
							<p className="flex gap-2">
								<span className="text-gray-500 w-12 shrink-0">{t("pickup")}:</span>
								<span className="truncate">{mission.pickupAddress}</span>
							</p>
						)}
						{mission.dropoffAddress && (
							<p className="flex gap-2">
								<span className="text-gray-500 w-12 shrink-0">{t("dropoff")}:</span>
								<span className="truncate">{mission.dropoffAddress}</span>
							</p>
						)}
						<p className="mt-1 pt-1 border-t border-gray-100 dark:border-gray-800 text-[10px] text-gray-400 uppercase tracking-wider">
							{t("source", { type: mission.type })}
						</p>
					</div>
				</div>
			</TooltipContent>
		</Tooltip>
	);
});
