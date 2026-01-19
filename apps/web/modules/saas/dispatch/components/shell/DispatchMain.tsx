"use client";

import { useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import { startOfDay, endOfDay } from "date-fns";
import { DispatchMapGoogle } from "../DispatchMapGoogle";
import { GanttTimeline } from "../gantt";
import { DRIVER_POSITIONS_MOCK } from "../../mocks/driverPositions";
import type { MissionDetail } from "../../types";
import type { OperatingBase } from "../../hooks/useOperatingBases";
import type { GanttDriver } from "../gantt/types";

interface DispatchMainProps {
  mission: MissionDetail | null;
  bases: OperatingBase[];
  isLoadingBases: boolean;
  onMissionSelect: (id: string | null) => void;
}

export function DispatchMain({ 
  mission, 
  bases, 
  isLoadingBases,
  onMissionSelect
}: DispatchMainProps) {
  const [viewMode] = useQueryState("view", parseAsString.withDefault("gantt"));
  
  // MOCK DATA for Story 27.3 Integration
  // TODO: Replace with real data from backend when available (Story 27.X)
	// Story 27.9: Fetch drivers for Gantt chart rows
	const { data: driversData } = useQuery({
		queryKey: ["fleet-drivers"],
		queryFn: async () => {
			const res = await apiClient.vtc.drivers.$get({ query: { isActive: "true", limit: "100" } });
			if (!res.ok) throw new Error("Failed to fetch drivers");
			return res.json();
		},
	});

	const drivers = useMemo<GanttDriver[]>(() => {
		if (!driversData?.data) return [];
		return driversData.data.map((d: { id: string; firstName: string; lastName: string; isActive: boolean }) => ({
			id: d.id,
			name: `${d.firstName} ${d.lastName}`,
			status: d.isActive ? "AVAILABLE" : "UNAVAILABLE", 
			// TODO: Status should come from RSE/Calendar in future
			missions: [], // TODO: Fetch driver missions
		}));
	}, [driversData]);

  const today = new Date();
  const startTime = startOfDay(today);
  const endTime = endOfDay(today);

  return (
      <div className="flex-1 h-full w-full relative overflow-hidden bg-background">
        {viewMode === "gantt" && (
          <div className="h-full w-full p-4 overflow-hidden">
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
          <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed m-4 rounded-lg bg-muted/10">
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
             />
          </div>
        )}
      </div>
  );
}
