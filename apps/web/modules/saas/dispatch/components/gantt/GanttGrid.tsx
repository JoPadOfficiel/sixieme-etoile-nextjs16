"use client";

/**
 * GanttGrid Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 * Story 29.6: Enhanced with midnight separator lines for multi-day views
 *
 * Renders the background grid lines for the Gantt timeline.
 */

import { cn } from "@ui/lib";
import { addHours } from "date-fns";
import { memo, useMemo } from "react";
import type { GanttGridProps } from "./types";

export const GanttGrid = memo(function GanttGrid({
	config,
	rowCount,
	rowHeight,
}: GanttGridProps) {
	// Generate vertical grid lines (one per hour)
	// Story 29.6: Enhanced to properly detect midnight for multi-day views
	// Generate vertical grid lines (one per step)
	// Story 29.6: Enhanced to properly detect midnight for multi-day views AND sub-hour intervals
	const verticalLines = useMemo(() => {
		const lines: {
			x: number;
			isMajor: boolean;
			isMidnight: boolean;
			isSubHour: boolean;
		}[] = [];

		// Determine grid step in minutes same as header
		const getMinuteStep = (pixelsPerHour: number) => {
			if (pixelsPerHour >= 160) return 15;
			if (pixelsPerHour >= 80) return 30;
			return 60; // Default to hourly grid lines for lower zooms
		};

		const minuteStep = getMinuteStep(config.pixelsPerHour);
		const totalMinutes = config.totalHours * 60;

		for (let i = 0; i <= totalMinutes; i += minuteStep) {
			const time = addHours(config.startTime, i / 60);
			const hour = time.getHours();
			const minutes = time.getMinutes();

			const x = (i / 60) * config.pixelsPerHour;

			const isMidnight = hour === 0 && minutes === 0 && i > 0;
			const isMajor = minutes === 0 && (hour === 0 || hour === 12);
			const isSubHour = minutes !== 0;

			lines.push({ x, isMajor, isMidnight, isSubHour });
		}

		return lines;
	}, [config]);

	// Generate horizontal grid lines (one per row)
	const horizontalLines = useMemo(() => {
		return Array.from({ length: rowCount + 1 }, (_, i) => i * rowHeight);
	}, [rowCount, rowHeight]);

	const totalHeight = rowCount * rowHeight;

	return (
		<svg
			aria-hidden="true"
			className="pointer-events-none absolute inset-0"
			width={config.totalWidth}
			height={totalHeight}
			style={{ overflow: "visible" }}
		>
			{/* Vertical lines */}
			{verticalLines.map(({ x, isMajor, isMidnight, isSubHour }, index) => (
				<line
					key={`v-${index}`}
					x1={x}
					y1={0}
					x2={x}
					y2={totalHeight}
					className={cn(
						isMidnight
							? "stroke-blue-400 dark:stroke-blue-500"
							: isMajor
								? "stroke-gray-300 dark:stroke-gray-600"
								: isSubHour
									? "stroke-gray-100 dark:stroke-gray-800"
									: "stroke-gray-200 dark:stroke-gray-700",
					)}
					strokeWidth={isMidnight ? 2 : isMajor ? 1 : 0.5}
					strokeDasharray={
						isMidnight ? "none" : isMajor ? "none" : isSubHour ? "2 2" : "4 4"
					}
				/>
			))}

			{/* Horizontal lines */}
			{horizontalLines.map((y, index) => (
				<line
					key={`h-${index}`}
					x1={0}
					y1={y}
					x2={config.totalWidth}
					y2={y}
					className="stroke-gray-200 dark:stroke-gray-700"
					strokeWidth={0.5}
				/>
			))}
		</svg>
	);
});
