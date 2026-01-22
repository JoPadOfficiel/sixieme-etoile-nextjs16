"use client";

/**
 * DispatchMain Component
 *
 * Story 29.6: Enhanced with multi-day date range support
 */

import { addDays, endOfDay, startOfDay } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import type { OperatingBase } from "../../hooks/useOperatingBases";
import { DRIVER_POSITIONS_MOCK } from "../../mocks/driverPositions";
import type { MissionDetail } from "../../types";
import { DispatchMapGoogle } from "../DispatchMapGoogle";
import { GanttTimeline } from "../gantt";
import { ZOOM_PRESETS } from "../gantt/constants";
import type { DateRange, GanttDriver, ZoomPreset } from "../gantt/types";

interface DispatchMainProps {
	mission: MissionDetail | null;
	bases: OperatingBase[];
	isLoadingBases: boolean;
	drivers: GanttDriver[];
	onMissionSelect: (id: string | null) => void;
}

export function DispatchMain({
	mission,
	bases,
	isLoadingBases,
	drivers,
	onMissionSelect,
}: DispatchMainProps) {
	const [viewMode] = useQueryState("view", parseAsString.withDefault("gantt"));

	// Story 29.6: Date range state for multi-day view
	const today = useMemo(() => new Date(), []);
	const [dateRange, setDateRange] = useState<DateRange>(() => ({
		start: startOfDay(today),
		end: endOfDay(addDays(today, 2)), // Default: 3 days view
	}));

	// Story 29.6: Active preset state
	const [activePreset, setActivePreset] = useState<ZoomPreset | null>("3days");

	// Story 29.6: Handle preset change
	const handlePresetChange = useCallback((preset: ZoomPreset) => {
		const presetConfig = ZOOM_PRESETS[preset];
		const newStart = startOfDay(today);
		const newEnd = endOfDay(addDays(today, presetConfig.rangeDays - 1));
		setDateRange({ start: newStart, end: newEnd });
		setActivePreset(preset);
	}, [today]);

	// Story 29.6: Handle date range change from picker
	const handleDateRangeChange = useCallback((range: DateRange) => {
		setDateRange({
			start: startOfDay(range.start),
			end: endOfDay(range.end),
		});
		setActivePreset(null); // Clear preset when manually selecting range
	}, []);

	return (
		<div className="relative h-full w-full flex-1 overflow-hidden bg-background">
			{viewMode === "gantt" && (
				<div className="h-full w-full overflow-hidden p-4">
					<GanttTimeline
						drivers={drivers}
						startTime={dateRange.start}
						endTime={dateRange.end}
						dateRange={dateRange}
						onDateRangeChange={handleDateRangeChange}
						onPresetChange={handlePresetChange}
						activePreset={activePreset}
						onDriverClick={() => onMissionSelect(null)}
						onMissionClick={(id) => onMissionSelect(id)}
						selectedMissionId={mission?.id}
						className="h-full shadow-sm"
					/>
				</div>
			)}

			{viewMode === "list" && (
				<div className="m-4 flex h-full items-center justify-center rounded-lg border-2 border-dashed bg-muted/10 text-muted-foreground">
					Advanced List View Placeholder
				</div>
			)}

			{viewMode === "map" && (
				<div className="h-full w-full">
					<DispatchMapGoogle
						mission={mission}
						bases={bases}
						isLoading={isLoadingBases}
						drivers={DRIVER_POSITIONS_MOCK}
						// Story 27.7: Pass encoded polyline for real route display
						encodedPolyline={mission?.tripAnalysis?.encodedPolyline}
					/>
				</div>
			)}
		</div>
	);
}
