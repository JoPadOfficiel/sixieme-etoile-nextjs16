"use client";

/**
 * GanttTimeline Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Main Gantt timeline visualization component for the Dispatch Cockpit.
 * Displays drivers on the Y-axis and time on the X-axis with virtualization support.
 */

import { memo, useRef, useCallback, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Clock } from "lucide-react";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import type { GanttTimelineProps } from "./types";
import { useGanttTimeScale, useNowIndicator, useGanttScroll } from "./hooks";
import { GanttHeader } from "./GanttHeader";
import { GanttDriverSidebar } from "./GanttDriverSidebar";
import { GanttDriverRow } from "./GanttDriverRow";
import { GanttGrid } from "./GanttGrid";
import { GanttNowIndicator } from "./GanttNowIndicator";
import { GanttEmptyState } from "./GanttEmptyState";
import {
	ROW_HEIGHT,
	HEADER_HEIGHT,
	SIDEBAR_WIDTH,
	DEFAULT_PIXELS_PER_HOUR,
	OVERSCAN_COUNT,
} from "./constants";

export const GanttTimeline = memo(function GanttTimeline({
	drivers,
	startTime,
	endTime,
	pixelsPerHour = DEFAULT_PIXELS_PER_HOUR,
	onDriverClick,
	onMissionClick,
	selectedMissionId,
	className,
}: GanttTimelineProps) {
	const t = useTranslations("dispatch.gantt");
	const parentRef = useRef<HTMLDivElement>(null);
	const contentRef = useRef<HTMLDivElement>(null);
	const sidebarRef = useRef<HTMLDivElement>(null);
	const { headerRef, contentRef: scrollContentRef, handleScroll: handleHorizontalScroll, scrollTo } = useGanttScroll();

	// Time scale configuration
	const { config } = useGanttTimeScale({
		startTime,
		endTime,
		pixelsPerHour,
	});

	// Now indicator
	const { nowPosition, isNowVisible, scrollToNow } = useNowIndicator({ config });

	// Virtualization for driver rows
	const rowVirtualizer = useVirtualizer({
		count: drivers.length,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: OVERSCAN_COUNT,
	});

	// Scroll to current time on mount
	useEffect(() => {
		if (isNowVisible) {
			// Scroll to center on current time
			const nowX = scrollToNow();
			const containerWidth = scrollContentRef.current?.clientWidth || 0;
			const scrollPosition = Math.max(0, nowX - containerWidth / 2);
			scrollTo(scrollPosition);
		}
	}, [isNowVisible, scrollToNow, scrollTo, scrollContentRef]);

	// Synchronize vertical scroll between sidebar and content (M2 fix)
	const handleVerticalScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
		const scrollTop = e.currentTarget.scrollTop;
		if (sidebarRef.current && e.currentTarget !== sidebarRef.current) {
			sidebarRef.current.scrollTop = scrollTop;
		}
		if (contentRef.current && e.currentTarget !== contentRef.current) {
			contentRef.current.scrollTop = scrollTop;
		}
	}, []);

	// Handle jump to now button
	const handleJumpToNow = useCallback(() => {
		const nowX = scrollToNow();
		const containerWidth = scrollContentRef.current?.clientWidth || 0;
		const scrollPosition = Math.max(0, nowX - containerWidth / 2);
		scrollTo(scrollPosition);
	}, [scrollToNow, scrollTo, scrollContentRef]);

	// Empty state
	if (drivers.length === 0) {
		return <GanttEmptyState className={className} />;
	}

	const totalHeight = drivers.length * ROW_HEIGHT;
	const virtualItems = rowVirtualizer.getVirtualItems();

	return (
		<div
			className={cn(
				"flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden",
				className
			)}
		>
			{/* Toolbar */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-gray-700 dark:text-gray-300">
						{t("driversCount", { count: drivers.length })}
					</span>
				</div>

				<div className="flex items-center gap-2">
					{/* Jump to Now button - shown when now line is not visible */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleJumpToNow}
						className="h-8"
					>
						<Clock className="w-4 h-4 mr-1" />
						{t("jumpToNow")}
					</Button>
				</div>
			</div>

			{/* Header with time labels */}
			<div
				ref={headerRef}
				className="overflow-x-hidden flex"
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
					className="flex-1 overflow-auto relative"
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
	);
});
