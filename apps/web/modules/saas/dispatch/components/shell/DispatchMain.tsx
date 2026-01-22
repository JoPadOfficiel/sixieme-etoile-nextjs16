"use client";

/**
 * DispatchMain Component
 *
 * Story 29.6: Enhanced with multi-day date range support (state lifted to DispatchPage)
 */

import { parseAsString, useQueryState } from "nuqs";
import type { OperatingBase } from "../../hooks/useOperatingBases";
import { DRIVER_POSITIONS_MOCK } from "../../mocks/driverPositions";
import type { MissionDetail } from "../../types";
import { DispatchMapGoogle } from "../DispatchMapGoogle";
import { GanttTimeline } from "../gantt";
import type { DateRange, GanttDriver, ZoomPreset } from "../gantt/types";

interface DispatchMainProps {
	mission: MissionDetail | null;
	bases: OperatingBase[];
	isLoadingBases: boolean;
	drivers: GanttDriver[];
	onMissionSelect: (id: string | null) => void;
	/** Story 29.6: Date range for multi-day view (lifted from parent) */
	dateRange: DateRange;
	/** Story 29.6: Callback when date range changes */
	onDateRangeChange: (range: DateRange) => void;
	/** Story 29.6: Callback when preset is selected */
	onPresetChange: (preset: ZoomPreset) => void;
	/** Story 29.6: Current active preset */
	activePreset: ZoomPreset | null;
}

export function DispatchMain({
	mission,
	bases,
	isLoadingBases,
	drivers,
	onMissionSelect,
	dateRange,
	onDateRangeChange,
	onPresetChange,
	activePreset,
}: DispatchMainProps) {
	const [viewMode] = useQueryState("view", parseAsString.withDefault("gantt"));

	return (
		<div className="relative h-full w-full flex-1 overflow-hidden bg-background">
			{viewMode === "gantt" && (
				<div className="h-full w-full overflow-hidden p-4">
					<GanttTimeline
						drivers={drivers}
						startTime={dateRange.start}
						endTime={dateRange.end}
						dateRange={dateRange}
						onDateRangeChange={onDateRangeChange}
						onPresetChange={onPresetChange}
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
