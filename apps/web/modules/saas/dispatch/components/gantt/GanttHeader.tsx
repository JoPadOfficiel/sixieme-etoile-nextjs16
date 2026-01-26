"use client";

/**
 * GanttHeader Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders the time axis header with hour labels and grid lines.
 */

import { cn } from "@ui/lib";
import { addHours, format, isSameDay } from "date-fns";
import { fr } from "date-fns/locale";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { DATE_FORMAT, HEADER_HEIGHT, SIDEBAR_WIDTH } from "./constants";
import type { GanttHeaderProps } from "./types";

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
		let scrollableParent = headerRef.current?.parentElement
			?.parentElement as HTMLElement | null;

		// If not found, try to find it by looking up the DOM tree
		if (!scrollableParent) {
			let current: HTMLElement | null = headerRef.current;
			while (current && current !== document.body) {
				if (current.classList.contains("overflow-x-hidden")) {
					scrollableParent = current.parentElement;
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
		document.body.style.cursor = "grabbing";
		document.body.style.userSelect = "none";

		e.preventDefault();
	}, []);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDraggingRef.current) return;

			e.preventDefault();
			const walk = (startXRef.current - e.pageX) * 1.5; // Adjust scroll speed
			const newScrollLeft = scrollLeftRef.current + walk;

			// Use the onScroll callback to scroll both header and content
			onScroll?.(newScrollLeft);
		},
		[onScroll],
	);

	const handleMouseUp = useCallback(() => {
		isDraggingRef.current = false;
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	}, []);

	// Add global mouse event listeners for drag
	useEffect(() => {
		if (isDraggingRef.current) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);

			return () => {
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [handleMouseMove, handleMouseUp]);
	const hourLabels = useMemo(() => {
		const labels: {
			hour: number;
			label: string;
			x: number;
			showDate: boolean;
			dateLabel: string;
			isMajor: boolean;
		}[] = [];
		let prevDate: Date | null = null;

		// Determine time step in minutes based on zoom level
		const getMinuteStep = (pixelsPerHour: number) => {
			if (pixelsPerHour >= 160) return 15; // 15 min view
			if (pixelsPerHour >= 80) return 30; // 30 min view
			if (pixelsPerHour >= 40) return 60; // 1 hour view
			if (pixelsPerHour >= 20) return 120; // 2 hours
			return 240; // 4 hours
		};

		const minuteStep = getMinuteStep(config.pixelsPerHour);
		const totalMinutes = config.totalHours * 60;

		for (let i = 0; i <= totalMinutes; i += minuteStep) {
			const time = addHours(config.startTime, i / 60);
			const hour = time.getHours();
			const minutes = time.getMinutes();

			// Filter out if not matching step (double check)
			if (i % minuteStep !== 0) continue;

			// Format label: HH:00 or HH:mm
			let label = "";
			if (minutes === 0) {
				label = `${hour.toString().padStart(2, "0")}:00`;
			} else {
				label = `${hour.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
			}

			const x = (i / 60) * config.pixelsPerHour;

			// Show date label at midnight or at the start
			const showDate =
				i === 0 || (prevDate !== null && !isSameDay(time, prevDate));
			const dateLabel = format(time, DATE_FORMAT, { locale: fr });
			const isMajor = minutes === 0;

			labels.push({ hour, label, x, showDate, dateLabel, isMajor });
			prevDate = time;
		}

		return labels;
	}, [config]);

	return (
		<div
			className={cn(
				"relative flex border-gray-200 border-b bg-gray-50 dark:border-gray-700 dark:bg-gray-800",
				className,
			)}
			style={{ height: HEADER_HEIGHT }}
		>
			{/* Fixed sidebar spacer */}
			<div
				className="flex flex-shrink-0 items-center border-gray-200 border-r bg-white px-4 dark:border-gray-700 dark:bg-gray-900"
				style={{ width: SIDEBAR_WIDTH }}
			>
				<span className="font-medium text-gray-700 text-sm dark:text-gray-300">
					{t("driversLabel")}
				</span>
			</div>

			{/* Scrollable time labels */}
			<div
				ref={headerRef}
				className="relative flex-1 cursor-grab overflow-hidden active:cursor-grabbing"
				style={{ width: config.totalWidth }}
				onMouseDown={handleMouseDown}
			>
				<div className="relative h-full" style={{ width: config.totalWidth }}>
					{hourLabels.map(
						({ hour, label, x, showDate, dateLabel, isMajor }, index) => (
							<div
								key={index}
								className="absolute top-0 flex h-full flex-col justify-center"
								style={{ left: x }}
							>
								{/* Hour/Time label */}
								<span
									className={cn(
										"px-1 font-medium",
										isMajor
											? "text-gray-900 text-xs dark:text-gray-100"
											: "text-[10px] text-gray-500 dark:text-gray-400",
									)}
								>
									{label}
								</span>

								{/* Date label - only shown at midnight or start */}
								{showDate && (
									<span className="whitespace-nowrap px-1 text-[10px] text-gray-500 dark:text-gray-500">
										{dateLabel}
									</span>
								)}

								{/* Vertical grid line indicator */}
								<div
									className={cn(
										"absolute bottom-0 h-2 w-px",
										hour === 0
											? "bg-gray-400 dark:bg-gray-500" // Midnight
											: isMajor
												? "bg-gray-300 dark:bg-gray-600" // Hours
												: "bg-gray-200 dark:bg-gray-700", // Sub-hours
									)}
								/>
							</div>
						),
					)}
				</div>
			</div>
		</div>
	);
});
