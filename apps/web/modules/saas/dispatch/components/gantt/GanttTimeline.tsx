"use client";

/**
 * GanttTimeline Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 * Story 27.12: Gantt Time & Zoom Controls
 *
 * Main Gantt timeline visualization component for the Dispatch Cockpit.
 * Displays drivers on the Y-axis and time on the X-axis with virtualization support.
 * Includes zoom controls for temporal navigation.
 */

import { useVirtualizer } from "@tanstack/react-virtual";
import { TooltipProvider } from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import { differenceInMinutes, startOfDay } from "date-fns";
import { useTranslations } from "next-intl";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { ExportScheduleButton } from "../ExportScheduleButton";
import { GanttDriverRow } from "./GanttDriverRow";
import { GanttDriverSidebar } from "./GanttDriverSidebar";
import { GanttEmptyState } from "./GanttEmptyState";
import { GanttGrid } from "./GanttGrid";
import { GanttHeader } from "./GanttHeader";
import { GanttNowIndicator } from "./GanttNowIndicator";
import { GanttZoomControls } from "./GanttZoomControls";
import {
	DEFAULT_PIXELS_PER_HOUR,
	HEADER_HEIGHT,
	OVERSCAN_COUNT,
	ROW_HEIGHT,
	SIDEBAR_WIDTH,
} from "./constants";
import {
	useGanttScroll,
	useGanttTimeScale,
	useGanttZoom,
	useNowIndicator,
} from "./hooks";
import type { GanttTimelineProps } from "./types";

export const GanttTimeline = memo(function GanttTimeline({
	drivers,
	startTime,
	endTime,
	pixelsPerHour: initialPixelsPerHour = DEFAULT_PIXELS_PER_HOUR,
	onDriverClick,
	onMissionClick,
	selectedMissionId,
	className,
}: GanttTimelineProps) {
	const t = useTranslations("dispatch.gantt");
	const sidebarRef = useRef<HTMLDivElement>(null);
	const {
		headerRef,
		contentRef,
		handleScroll: handleHorizontalScroll,
		scrollTo,
	} = useGanttScroll();

	// Zoom state management (Story 27.12)
	const {
		pixelsPerHour,
		canZoomIn,
		canZoomOut,
		zoomIn,
		zoomOut,
		zoomLabel,
		zoomPercent,
	} = useGanttZoom({ initialZoom: initialPixelsPerHour });

	// State for selected date (updated when user navigates)
	const [selectedDate, setSelectedDate] = useState<Date>(startTime);

	// Time scale configuration - now uses dynamic pixelsPerHour from zoom state
	const { config } = useGanttTimeScale({
		startTime,
		endTime,
		pixelsPerHour,
	});

	// Now indicator
	const { nowPosition, isNowVisible, scrollToNow } = useNowIndicator({
		config,
	});

	// Virtualization for driver rows
	const rowVirtualizer = useVirtualizer({
		count: drivers.length,
		getScrollElement: () => contentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: OVERSCAN_COUNT,
	});

	// Calculate current center time for scroll preservation during zoom
	// Uses prevPixelsPerHourRef to get the correct position before zoom change
	const getCurrentCenterTime = useCallback(() => {
		if (!contentRef.current) return new Date();
		const scrollLeft = contentRef.current.scrollLeft;
		const containerWidth = contentRef.current.clientWidth;
		const centerX = scrollLeft + containerWidth / 2;
		// Use the previous pixelsPerHour value to calculate correct time position
		const prevPPH = prevPixelsPerHourRef.current;
		const minutesFromStart = (centerX / prevPPH) * 60;
		return new Date(startTime.getTime() + minutesFromStart * 60 * 1000);
	}, [contentRef, startTime]);

	// Scroll to a specific time (used after zoom changes)
	const scrollToTime = useCallback(
		(time: Date) => {
			if (!contentRef.current) return;
			const containerWidth = contentRef.current.clientWidth;
			const minutesFromStart = differenceInMinutes(time, startTime);
			const targetX = (minutesFromStart / 60) * pixelsPerHour;
			const scrollPosition = Math.max(0, targetX - containerWidth / 2);
			scrollTo(scrollPosition);
		},
		[contentRef, pixelsPerHour, startTime, scrollTo],
	);

	// Preserve scroll position when zoom changes
	const prevPixelsPerHourRef = useRef(pixelsPerHour);
	useEffect(() => {
		if (prevPixelsPerHourRef.current !== pixelsPerHour) {
			// Zoom changed, preserve center position
			const centerTime = getCurrentCenterTime();
			// Use requestAnimationFrame to ensure the new dimensions are calculated
			requestAnimationFrame(() => {
				scrollToTime(centerTime);
			});
			prevPixelsPerHourRef.current = pixelsPerHour;
		}
	}, [pixelsPerHour, getCurrentCenterTime, scrollToTime]);

	// Scroll to current time on mount
	useEffect(() => {
		if (isNowVisible) {
			// Scroll to center on current time
			const nowX = scrollToNow();
			const containerWidth = contentRef.current?.clientWidth || 0;
			const scrollPosition = Math.max(0, nowX - containerWidth / 2);
			scrollTo(scrollPosition);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isNowVisible]); // Only run on mount or when visibility changes

	// Synchronize vertical scroll between sidebar and content
	const handleVerticalScroll = useCallback(
		(e: React.UIEvent<HTMLDivElement>) => {
			const scrollTop = e.currentTarget.scrollTop;
			if (sidebarRef.current && e.currentTarget !== sidebarRef.current) {
				sidebarRef.current.scrollTop = scrollTop;
			}
			if (contentRef.current && e.currentTarget !== contentRef.current) {
				contentRef.current.scrollTop = scrollTop;
			}
		},
		[contentRef],
	);

	// Handle jump to now button
	const handleJumpToNow = useCallback(() => {
		const nowX = scrollToNow();
		const containerWidth = contentRef.current?.clientWidth || 0;
		const scrollPosition = Math.max(0, nowX - containerWidth / 2);
		scrollTo(scrollPosition);
		setSelectedDate(new Date());
	}, [scrollToNow, scrollTo, contentRef]);

	// Update selected date when navigating
	const handleNavigateToDateWithState = useCallback(
		(date: Date) => {
			setSelectedDate(date);
			const dayStart = startOfDay(date);
			// If the selected date is within our range, scroll to it
			if (dayStart >= startTime && dayStart <= endTime) {
				scrollToTime(dayStart);
			}
		},
		[startTime, endTime, scrollToTime],
	);

	// Empty state
	if (drivers.length === 0) {
		return <GanttEmptyState className={className} />;
	}

	const totalHeight = drivers.length * ROW_HEIGHT;
	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<TooltipProvider>
			<div
				className={cn(
					"flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900",
					className,
				)}
			>
				{/* Toolbar with zoom controls */}
				<div className="flex items-center justify-between border-gray-200 border-b bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
					<div className="flex items-center gap-2">
						<span className="font-medium text-gray-700 text-sm dark:text-gray-300">
							{t("driversCount", { count: drivers.length })}
						</span>
						{/* Story 27.14: Export Schedule Button */}
						<div className="ml-4 h-4 w-[1px] bg-gray-300 dark:bg-gray-600" />
						<ExportScheduleButton
							drivers={drivers}
							selectedDate={selectedDate}
							className="ml-2"
						/>
					</div>

					{/* Zoom Controls (Story 27.12) */}
					<GanttZoomControls
						pixelsPerHour={pixelsPerHour}
						canZoomIn={canZoomIn}
						canZoomOut={canZoomOut}
						onZoomIn={zoomIn}
						onZoomOut={zoomOut}
						onJumpToNow={handleJumpToNow}
						onNavigateToDate={handleNavigateToDateWithState}
						selectedDate={selectedDate}
						zoomLabel={zoomLabel}
						zoomPercent={zoomPercent}
					/>
				</div>

				{/* Header with time labels */}
				<div
					ref={headerRef}
					className="flex overflow-x-hidden"
					style={{ height: HEADER_HEIGHT }}
				>
					<GanttHeader config={config} />
				</div>

				{/* Main content area */}
				<div className="flex flex-1 overflow-hidden">
					{/* Fixed driver sidebar */}
					<div
						ref={sidebarRef}
						className="overflow-y-auto overflow-x-hidden"
						style={{
							width: SIDEBAR_WIDTH,
						}}
						onScroll={handleVerticalScroll}
					>
						<GanttDriverSidebar
							drivers={drivers}
							virtualItems={virtualItems}
							onDriverClick={onDriverClick}
						/>
					</div>

					{/* Scrollable timeline content */}
					<div
						ref={contentRef}
						className="relative flex-1 overflow-auto"
						onScroll={(e) => {
							handleHorizontalScroll(e);
							handleVerticalScroll(e);
						}}
					>
						<div
							className="relative"
							style={{
								width: config.totalWidth,
								height: totalHeight,
							}}
						>
							{/* Background grid */}
							<GanttGrid
								config={config}
								rowCount={drivers.length}
								rowHeight={ROW_HEIGHT}
							/>

							{/* Driver rows */}
							{virtualItems.map((virtualItem) => {
								const driver = drivers[virtualItem.index];
								if (!driver) return null;

								return (
									<GanttDriverRow
										key={driver.id}
										driver={driver}
										config={config}
										rowIndex={virtualItem.index}
										onClick={() => onDriverClick?.(driver.id)}
										onMissionClick={onMissionClick}
										selectedMissionId={selectedMissionId}
									/>
								);
							})}

							{/* Now indicator line */}
							<GanttNowIndicator
								config={config}
								height={totalHeight}
								nowPosition={nowPosition}
								isNowVisible={isNowVisible}
							/>
						</div>
					</div>
				</div>
			</div>
		</TooltipProvider>
	);
});
