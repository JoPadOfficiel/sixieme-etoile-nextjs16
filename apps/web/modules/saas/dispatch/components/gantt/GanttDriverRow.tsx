"use client";

/**
 * GanttDriverRow Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders a single driver row in the Gantt timeline with their missions.
 * Placeholder for missions - actual mission blocks will be added in Story 27.4.
 */

import { memo, useMemo } from "react";
import { differenceInMinutes } from "date-fns";
import { cn } from "@ui/lib";
import type { GanttDriverRowProps, GanttMission } from "./types";
import { ROW_HEIGHT } from "./constants";

const MissionBlock = memo(function MissionBlock({
	mission,
	left,
	width,
	isSelected,
	onClick,
}: {
	mission: GanttMission;
	left: number;
	width: number;
	isSelected: boolean;
	onClick?: () => void;
}) {
	const statusColors: Record<string, string> = {
		PENDING: "bg-amber-100 border-amber-400 dark:bg-amber-900/30 dark:border-amber-600",
		ASSIGNED: "bg-blue-100 border-blue-400 dark:bg-blue-900/30 dark:border-blue-600",
		IN_PROGRESS: "bg-green-100 border-green-400 dark:bg-green-900/30 dark:border-green-600",
		COMPLETED: "bg-gray-100 border-gray-400 dark:bg-gray-800/50 dark:border-gray-600",
		CANCELLED: "bg-red-100 border-red-400 dark:bg-red-900/30 dark:border-red-600",
	};

	const typeStyles: Record<string, string> = {
		CALCULATED: "border-solid",
		MANUAL: "border-dashed",
	};

	return (
		<div
			className={cn(
				"absolute top-2 bottom-2 rounded-md border-2 cursor-pointer transition-all",
				"hover:shadow-md hover:z-10",
				"flex items-center px-2 overflow-hidden",
				statusColors[mission.status] || statusColors.PENDING,
				typeStyles[mission.type] || typeStyles.CALCULATED,
				isSelected && "ring-2 ring-blue-500 ring-offset-1 z-20"
			)}
			style={{
				left,
				width: Math.max(width, 40), // Minimum width for visibility
			}}
			onClick={(e) => {
				e.stopPropagation();
				onClick?.();
			}}
			title={`${mission.title}\n${mission.pickupAddress || ""} → ${mission.dropoffAddress || ""}`}
		>
			<span className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate">
				{mission.title}
			</span>
		</div>
	);
});

export const GanttDriverRow = memo(function GanttDriverRow({
	driver,
	config,
	rowIndex,
	onClick,
	onMissionClick,
	selectedMissionId,
}: GanttDriverRowProps) {
	// Calculate mission positions
	const missionBlocks = useMemo(() => {
		if (!driver.missions || driver.missions.length === 0) {
			return [];
		}

		return driver.missions.map((mission) => {
			const startMinutes = differenceInMinutes(mission.startAt, config.startTime);
			const endMinutes = differenceInMinutes(mission.endAt, config.startTime);
			const left = (startMinutes / 60) * config.pixelsPerHour;
			const width = ((endMinutes - startMinutes) / 60) * config.pixelsPerHour;

			return {
				mission,
				left,
				width,
			};
		});
	}, [driver.missions, config]);

	return (
		<div
			className={cn(
				"absolute left-0 right-0 border-b border-gray-200 dark:border-gray-700",
				"hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors",
				rowIndex % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-800/30"
			)}
			style={{
				top: rowIndex * ROW_HEIGHT,
				height: ROW_HEIGHT,
				width: config.totalWidth,
			}}
			onClick={onClick}
		>
			{/* Render mission blocks */}
			{missionBlocks.map(({ mission, left, width }) => (
				<MissionBlock
					key={mission.id}
					mission={mission}
					left={left}
					width={width}
					isSelected={selectedMissionId === mission.id}
					onClick={() => onMissionClick?.(mission.id)}
				/>
			))}
		</div>
	);
});
