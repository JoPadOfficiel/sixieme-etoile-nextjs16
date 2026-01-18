"use client";

/**
 * GanttGrid Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders the background grid lines for the Gantt timeline.
 */

import { memo, useMemo } from "react";
import { cn } from "@ui/lib";
import type { GanttGridProps } from "./types";

export const GanttGrid = memo(function GanttGrid({
	config,
	rowCount,
	rowHeight,
}: GanttGridProps) {
	// Generate vertical grid lines (one per hour)
	const verticalLines = useMemo(() => {
		const lines: { x: number; isMajor: boolean }[] = [];
		
		for (let i = 0; i <= config.totalHours; i++) {
			const hour = (config.startTime.getHours() + i) % 24;
			const x = i * config.pixelsPerHour;
			const isMajor = hour === 0 || hour === 12; // Midnight and noon
			lines.push({ x, isMajor });
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
			{verticalLines.map(({ x, isMajor }, index) => (
				<line
					key={`v-${index}`}
					x1={x}
					y1={0}
					x2={x}
					y2={totalHeight}
					className={cn(
						isMajor
							? "stroke-gray-300 dark:stroke-gray-600"
							: "stroke-gray-200 dark:stroke-gray-700"
					)}
					strokeWidth={isMajor ? 1 : 0.5}
					strokeDasharray={isMajor ? "none" : "4 4"}
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
