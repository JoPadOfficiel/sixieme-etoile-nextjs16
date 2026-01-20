"use client";

import { endOfDay, startOfDay } from "date-fns";
import { parseAsString, useQueryState } from "nuqs";
import type { OperatingBase } from "../../hooks/useOperatingBases";
import { DRIVER_POSITIONS_MOCK } from "../../mocks/driverPositions";
import type { MissionDetail } from "../../types";
import { DispatchMapGoogle } from "../DispatchMapGoogle";
import { GanttTimeline } from "../gantt";
import type { GanttDriver } from "../gantt/types";

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

	const today = new Date();
	const startTime = startOfDay(today);
	const endTime = endOfDay(today);

	return (
		<div className="relative h-full w-full flex-1 overflow-hidden bg-background">
			{viewMode === "gantt" && (
				<div className="h-full w-full overflow-hidden p-4">
					<GanttTimeline
						drivers={drivers}
						startTime={startTime}
						endTime={endTime}
						// TODO: Wire up to real actions
						onDriverClick={() => onMissionSelect(null)} // Deselect mission if driver clicked for now
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
