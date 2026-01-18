"use client";

/**
 * GanttNowIndicator Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders a vertical red line indicating the current time on the Gantt timeline.
 */

import { memo } from "react";
import type { GanttNowIndicatorProps } from "./types";

interface ExtendedGanttNowIndicatorProps extends GanttNowIndicatorProps {
	nowPosition: number | null;
	isNowVisible: boolean;
}

export const GanttNowIndicator = memo(function GanttNowIndicator({
	height,
	nowPosition,
	isNowVisible,
}: ExtendedGanttNowIndicatorProps) {

	if (!isNowVisible || nowPosition === null) {
		return null;
	}

	return (
		<div
			className="absolute top-0 z-20 pointer-events-none"
			style={{
				left: nowPosition,
				height,
			}}
		>
			{/* The vertical line */}
			<div
				className="absolute inset-y-0 w-0.5 bg-red-500"
				style={{
					boxShadow: "0 0 8px 2px rgba(239, 68, 68, 0.4)",
				}}
			/>

			{/* Top indicator dot */}
			<div className="absolute -top-1 -left-1.5 w-3 h-3 rounded-full bg-red-500 border-2 border-white dark:border-gray-900 shadow-md" />

			{/* Time label */}
			<div className="absolute -top-6 -left-6 px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-medium rounded shadow-sm whitespace-nowrap">
				{new Date().toLocaleTimeString("fr-FR", {
					hour: "2-digit",
					minute: "2-digit",
				})}
			</div>
		</div>
	);
});
