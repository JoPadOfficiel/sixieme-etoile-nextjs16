"use client";

/**
 * GanttHeader Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders the time axis header with hour labels and grid lines.
 */

import { memo, useMemo } from "react";
import { format, addHours, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@ui/lib";
import type { GanttHeaderProps } from "./types";
import { HEADER_HEIGHT, SIDEBAR_WIDTH, DATE_FORMAT } from "./constants";

export const GanttHeader = memo(function GanttHeader({
	config,
	className,
}: GanttHeaderProps) {
	const hourLabels = useMemo(() => {
		const labels: { hour: number; label: string; x: number; showDate: boolean; dateLabel: string }[] = [];
		let prevDate: Date | null = null;

		for (let i = 0; i <= config.totalHours; i++) {
			const time = addHours(config.startTime, i);
			const hour = time.getHours();
			const label = `${hour.toString().padStart(2, "0")}:00`;
			const x = i * config.pixelsPerHour;
			
			// Show date label at midnight or at the start
			const showDate = i === 0 || (prevDate !== null && !isSameDay(time, prevDate));
			const dateLabel = format(time, DATE_FORMAT, { locale: fr });
			
			labels.push({ hour, label, x, showDate, dateLabel });
			prevDate = time;
		}

		return labels;
	}, [config]);

	return (
		<div
			className={cn(
				"relative flex border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800",
				className
			)}
			style={{ height: HEADER_HEIGHT }}
		>
			{/* Fixed sidebar spacer */}
			<div
				className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center px-4"
				style={{ width: SIDEBAR_WIDTH }}
			>
				<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
					Chauffeurs
				</span>
			</div>

			{/* Scrollable time labels */}
			<div
				className="flex-1 overflow-hidden relative"
				style={{ width: config.totalWidth }}
			>
				<div
					className="relative h-full"
					style={{ width: config.totalWidth }}
				>
					{hourLabels.map(({ hour, label, x, showDate, dateLabel }, index) => (
						<div
							key={index}
							className="absolute top-0 h-full flex flex-col justify-center"
							style={{ left: x }}
						>
							{/* Hour label */}
							<span
								className={cn(
									"text-xs font-medium px-1",
									hour === 0
										? "text-gray-900 dark:text-gray-100"
										: "text-gray-600 dark:text-gray-400"
								)}
							>
								{label}
							</span>
							
							{/* Date label - only shown at midnight or start */}
							{showDate && (
								<span className="text-[10px] text-gray-500 dark:text-gray-500 px-1 whitespace-nowrap">
									{dateLabel}
								</span>
							)}

							{/* Vertical grid line indicator */}
							<div
								className={cn(
									"absolute bottom-0 w-px h-2",
									hour === 0
										? "bg-gray-400 dark:bg-gray-500"
										: "bg-gray-300 dark:bg-gray-600"
								)}
							/>
						</div>
					))}
				</div>
			</div>
		</div>
	);
});
