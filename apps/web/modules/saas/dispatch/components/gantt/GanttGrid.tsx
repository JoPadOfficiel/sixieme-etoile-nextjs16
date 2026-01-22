"use client";

/**
 * GanttGrid Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 * Story 29.6: Enhanced with midnight separator lines for multi-day views
 *
 * Renders the background grid lines for the Gantt timeline.
 */

import { addHours } from "date-fns";
import { memo, useMemo } from "react";
import { cn } from "@ui/lib";
import type { GanttGridProps } from "./types";

export const GanttGrid = memo(function GanttGrid({
	config,
	rowCount,
	rowHeight,
}: GanttGridProps) {
	// Generate vertical grid lines (one per hour)
	// Story 29.6: Enhanced to properly detect midnight for multi-day views
	const verticalLines = useMemo(() => {
		const lines: { x: number; isMajor: boolean; isMidnight: boolean }[] = [];
		
		for (let i = 0; i <= config.totalHours; i++) {
			const time = addHours(config.startTime, i);
			const hour = time.getHours();
			const x = i * config.pixelsPerHour;
			const isMidnight = hour === 0 && i > 0; // Midnight (but not the first hour if it starts at midnight)
			const isMajor = hour === 0 || hour === 12; // Midnight and noon
			lines.push({ x, isMajor, isMidnight });
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
			className="absolute inset-0 pointer-events-none"
			width={config.totalWidth}
			height={totalHeight}
			style={{ overflow: "visible" }}
		>
			{/* Vertical lines */}
			{verticalLines.map(({ x, isMajor, isMidnight }, index) => (
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
								: "stroke-gray-200 dark:stroke-gray-700"
					)}
					strokeWidth={isMidnight ? 2 : isMajor ? 1 : 0.5}
					strokeDasharray={isMidnight ? "none" : isMajor ? "none" : "4 4"}
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
