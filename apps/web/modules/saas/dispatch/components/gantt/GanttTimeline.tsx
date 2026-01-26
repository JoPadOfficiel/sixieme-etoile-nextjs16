"use client";

/**
 * GanttTimeline Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 * Story 27.12: Gantt Time & Zoom Controls
 * Story 29.6: Enhanced with multi-day view, presets, and date range picker
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
import dynamic from "next/dynamic";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { GanttDriverRow } from "./GanttDriverRow";

const ExportScheduleButton = dynamic(
	() =>
		import("../ExportScheduleButton").then((mod) => mod.ExportScheduleButton),
	{ ssr: false },
);
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
	ZOOM_PRESETS,
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
	dateRange,
	onDateRangeChange,
	onPresetChange,
	activePreset,
}: GanttTimelineProps) {
	const t = useTranslations("dispatch.gantt");
	const sidebarRef = useRef<HTMLDivElement>(null);
	const {
		headerRef,
		contentRef,
		handleScroll: handleHorizontalScroll,
		scrollTo,
	} = useGanttScroll();

	// Story 29.6: Get initial zoom from active preset
	const getPresetZoom = useCallback(() => {
		if (activePreset && ZOOM_PRESETS[activePreset]) {
			return ZOOM_PRESETS[activePreset].pixelsPerHour;
		}
		return initialPixelsPerHour;
	}, [activePreset, initialPixelsPerHour]);

	// Zoom state management (Story 27.12)
	const {
		pixelsPerHour,
		canZoomIn,
		canZoomOut,
		zoomIn,
		zoomOut,
		zoomLabel,
		zoomPercent,
		setZoomLevel,
	} = useGanttZoom({ initialZoom: getPresetZoom() });

	// Story 29.6: Sync zoom with preset changes
	// Story 29.6: Sync zoom with preset changes (Decoupled to allow manual zoom)
	const prevPresetRef = useRef(activePreset);
	useEffect(() => {
		// Only enforce zoom if the preset selection actually changed
		if (activePreset && activePreset !== prevPresetRef.current) {
			if (ZOOM_PRESETS[activePreset]) {
				setZoomLevel(ZOOM_PRESETS[activePreset].pixelsPerHour);
			}
		}
		prevPresetRef.current = activePreset;
	}, [activePreset, setZoomLevel]);

	// Smart Zoom: Auto-switch preset based on zoom level thresholds
	// This ensures "dezoom" switches to 3Days/Week views automatically
	// Use a ref to track the last requested preset to prevent loops
	const lastRequestedPresetRef = useRef<string | null>(activePreset);

	useEffect(() => {
		if (!onPresetChange) return;

		let targetPreset: "day" | "3days" | "week" | null = null;

		// Define thresholds for switching
		if (pixelsPerHour >= 80) targetPreset = "day";
		else if (pixelsPerHour >= 30) targetPreset = "3days";
		else targetPreset = "week";

		// Only change if different from current active AND different from what we last requested
		// This prevents rapid firing if the parent hasn't updated yet or if there's a slight mismatch
		if (
			targetPreset &&
			targetPreset !== activePreset &&
			targetPreset !== lastRequestedPresetRef.current
		) {
			lastRequestedPresetRef.current = targetPreset;
			onPresetChange(targetPreset);
		} else if (targetPreset === activePreset) {
			// Sync ref if we are stable
			lastRequestedPresetRef.current = activePreset;
		}
	}, [pixelsPerHour, activePreset, onPresetChange]);

	// State for selected date (updated when user navigates)
	const [selectedDate, setSelectedDate] = useState<Date>(startTime);

	// Story 29.6: Sync selectedDate with dateRange changes
	useEffect(() => {
		if (dateRange) {
			setSelectedDate(dateRange.start);
		} else {
			setSelectedDate(startTime);
		}
	}, [dateRange, startTime]);

	// Story 29.6: Handle drag on timeline content
	const isContentDraggingRef = useRef(false);
	const contentStartXRef = useRef(0);
	const contentScrollLeftRef = useRef(0);

	const handleContentMouseDown = useCallback(
		(e: React.MouseEvent) => {
			if (!contentRef.current) return;

			isContentDraggingRef.current = true;
			contentStartXRef.current = e.pageX - contentRef.current.offsetLeft;
			contentScrollLeftRef.current = contentRef.current.scrollLeft;

			// Change cursor to indicate dragging
			document.body.style.cursor = "grabbing";
			document.body.style.userSelect = "none";

			e.preventDefault();
		},
		[contentRef],
	);

	const handleContentMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isContentDraggingRef.current || !contentRef.current) return;

			e.preventDefault();
			const x = e.pageX - contentRef.current.offsetLeft;
			const walk = (x - contentStartXRef.current) * 1.5; // Adjust scroll speed
			const newScrollLeft = contentScrollLeftRef.current - walk;

			contentRef.current.scrollLeft = newScrollLeft;
			if (headerRef.current) {
				headerRef.current.scrollLeft = newScrollLeft;
			}
		},
		[contentRef, headerRef],
	);

	const handleContentMouseUp = useCallback(() => {
		isContentDraggingRef.current = false;
		document.body.style.cursor = "";
		document.body.style.userSelect = "";
	}, []);

	// Add global mouse event listeners for content drag
	useEffect(() => {
		if (isContentDraggingRef.current) {
			document.addEventListener("mousemove", handleContentMouseMove);
			document.addEventListener("mouseup", handleContentMouseUp);

			return () => {
				document.removeEventListener("mousemove", handleContentMouseMove);
				document.removeEventListener("mouseup", handleContentMouseUp);
			};
		}
	}, [handleContentMouseMove, handleContentMouseUp]);

	// Time scale configuration - Story 29.6: Use dateRange for multi-day views
	const { config } = useGanttTimeScale({
		startTime: dateRange ? dateRange.start : startTime,
		endTime: dateRange ? dateRange.end : endTime,
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

					{/* Zoom Controls (Story 27.12, 29.6) */}
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
						dateRange={dateRange}
						onDateRangeChange={onDateRangeChange}
						onPresetChange={onPresetChange}
						activePreset={activePreset}
					/>
				</div>

				{/* Header with time labels */}
				<div
					ref={headerRef}
					className="flex overflow-x-hidden"
					style={{ height: HEADER_HEIGHT }}
				>
					<GanttHeader config={config} onScroll={scrollTo} />
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
						className="relative flex-1 cursor-grab overflow-auto active:cursor-grabbing"
						onScroll={(e) => {
							handleHorizontalScroll(e);
							handleVerticalScroll(e);
						}}
						onMouseDown={handleContentMouseDown}
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
