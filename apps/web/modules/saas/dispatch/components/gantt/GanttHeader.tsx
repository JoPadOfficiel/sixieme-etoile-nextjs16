"use client";

/**
 * GanttHeader Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders the time axis header with hour labels and grid lines.
 */

import { memo, useMemo, useRef, useCallback, useEffect } from "react";
import { format, addHours, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import type { GanttHeaderProps } from "./types";
import { HEADER_HEIGHT, SIDEBAR_WIDTH, DATE_FORMAT } from "./constants";

export const GanttHeader = memo(function GanttHeader({
	config,
	className,
	onScroll,
}: GanttHeaderProps) {
	const t = useTranslations("dispatch.gantt");
	const headerRef = useRef<HTMLDivElement>(null);
	const isDraggingRef = useRef(false);
	const startXRef = useRef(0);
	const scrollLeftRef = useRef(0);

	// Handle mouse drag on header to scroll timeline
	const handleMouseDown = useCallback((e: React.MouseEvent) => {
		// Find the scrollable parent container - look for the main timeline container
		let scrollableParent = headerRef.current?.parentElement?.parentElement as HTMLDivElement;
		
		// If not found, try to find it by looking up the DOM tree
		if (!scrollableParent) {
			let current = headerRef.current;
			while (current && current !== document.body) {
				if (current.classList.contains('overflow-x-hidden')) {
					scrollableParent = current.parentElement as HTMLDivElement;
					break;
				}
				current = current.parentElement;
			}
		}
		
		if (!scrollableParent) return;
		
		isDraggingRef.current = true;
		startXRef.current = e.pageX;
		scrollLeftRef.current = scrollableParent.scrollLeft;
		
		// Change cursor to indicate dragging
		document.body.style.cursor = 'grabbing';
		document.body.style.userSelect = 'none';
		
		e.preventDefault();
	}, []);

	const handleMouseMove = useCallback((e: MouseEvent) => {
		if (!isDraggingRef.current) return;
		
		e.preventDefault();
		const walk = (startXRef.current - e.pageX) * 1.5; // Adjust scroll speed
		const newScrollLeft = scrollLeftRef.current + walk;
		
		// Use the onScroll callback to scroll both header and content
		onScroll?.(newScrollLeft);
	}, [onScroll]);

	const handleMouseUp = useCallback(() => {
		isDraggingRef.current = false;
		document.body.style.cursor = '';
		document.body.style.userSelect = '';
	}, []);

	// Add global mouse event listeners for drag
	useEffect(() => {
		if (isDraggingRef.current) {
			document.addEventListener('mousemove', handleMouseMove);
			document.addEventListener('mouseup', handleMouseUp);
			
			return () => {
				document.removeEventListener('mousemove', handleMouseMove);
				document.removeEventListener('mouseup', handleMouseUp);
			};
		}
	}, [handleMouseMove, handleMouseUp]);
	const hourLabels = useMemo(() => {
		const labels: { hour: number; label: string; x: number; showDate: boolean; dateLabel: string }[] = [];
		let prevDate: Date | null = null;

		// Determine which hours to show based on zoom level
		const getHourStep = (pixelsPerHour: number) => {
			if (pixelsPerHour >= 120) return 1; // Hour view: show all hours
			if (pixelsPerHour >= 60) return 2; // 2-hour view: show even hours
			if (pixelsPerHour >= 30) return 3; // 3-hour view: show 0, 3, 6, 9, 12, 15, 18, 21
			if (pixelsPerHour >= 20) return 4; // 4-hour view: show 0, 4, 8, 12, 16, 20
			return 6; // Week view: show 0, 6, 12, 18 (important hours)
		};

		const hourStep = getHourStep(config.pixelsPerHour);

		for (let i = 0; i <= config.totalHours; i++) {
			const time = addHours(config.startTime, i);
			const hour = time.getHours();
			
			// Only show hours that match the step pattern
			if (hour % hourStep !== 0 && i !== 0) continue;
			
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
					{t("driversLabel")}
				</span>
			</div>

			{/* Scrollable time labels */}
			<div
				ref={headerRef}
				className="flex-1 overflow-hidden relative cursor-grab active:cursor-grabbing"
				style={{ width: config.totalWidth }}
				onMouseDown={handleMouseDown}
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
