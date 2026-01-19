"use client";

/**
 * GanttDriverRow Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders a single driver row in the Gantt timeline with their missions.
 * Placeholder for missions - actual mission blocks will be added in Story 27.4.
 */

import { useDroppable } from "@dnd-kit/core";
import { memo, useMemo } from "react";
import { differenceInMinutes } from "date-fns";
import { cn } from "@ui/lib";
import type { GanttDriverRowProps } from "./types";
import { ROW_HEIGHT } from "./constants";

import { MissionGanttCard } from "./MissionGanttCard";

export const GanttDriverRow = memo(function GanttDriverRow({
	driver,
	config,
	rowIndex,
	onClick,
	onMissionClick,
	selectedMissionId,
}: GanttDriverRowProps) {
	const { setNodeRef, isOver } = useDroppable({
		id: `driver-${driver.id}`,
		data: {
			type: "DRIVER",
			driverId: driver.id,
		},
	});

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
			ref={setNodeRef}
			className={cn(
				"absolute left-0 right-0 border-b border-gray-200 dark:border-gray-700",
				"hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors",
				rowIndex % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50/30 dark:bg-gray-800/30",
				isOver && "ring-2 ring-primary ring-inset z-10 bg-primary/10"
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
				<MissionGanttCard
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
