"use client";

import { useQueryState, parseAsString } from "nuqs";
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
  drivers: GanttDriver[];
  onMissionSelect: (id: string | null) => void;
}

export function DispatchMain({ 
  mission, 
  bases, 
  isLoadingBases,
  drivers,
  onMissionSelect
}: DispatchMainProps) {
  const [viewMode] = useQueryState("view", parseAsString.withDefault("gantt"));
  
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
