"use client";

import { useMemo } from "react";
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
}

export function DispatchMain({ 
  mission, 
  bases, 
  isLoadingBases 
}: DispatchMainProps) {
  const [viewMode] = useQueryState("view", parseAsString.withDefault("gantt"));
  
  // MOCK DATA for Story 27.3 Integration
  // TODO: Replace with real data from backend when available (Story 27.X)
  const drivers = useMemo<GanttDriver[]>(() => {
    const today = new Date();
    return [
      { 
        id: "d1", 
        name: "Pierre Lefebvre", 
        status: "ON_MISSION", 
        missions: [
          {
            id: "m1",
            title: "Transfert CDG -> Paris",
            startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
            endAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 0),
            type: "CALCULATED",
            status: "IN_PROGRESS",
            clientName: "Hotel Ritz",
          },
          {
            id: "m2",
            title: "Mise à disposition",
            startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
            endAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 18, 0),
            type: "MANUAL",
            status: "ASSIGNED",
            clientName: "Tech Corp",
          }
        ]
      },
      { 
        id: "d2", 
        name: "Sophie Dubois", 
        status: "AVAILABLE",
        missions: []
      },
      { 
        id: "d3", 
        name: "Ahmed Benali", 
        status: "UNAVAILABLE", 
        missions: [] 
      },
      { 
        id: "d4", 
        name: "Marie Martin", 
        status: "ON_MISSION", 
        missions: [
           {
            id: "m3",
            title: "Transfert Orly -> Versailles",
            startAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10, 15),
            endAt: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 11, 45),
            type: "CALCULATED",
            status: "COMPLETED",
            clientName: "Private Client",
          }
        ]
      },
      { id: "d5", name: "Jean Dupont", status: "AVAILABLE", missions: [] },
      { id: "d6", name: "Lucie Bernard", status: "AVAILABLE", missions: [] },
      { id: "d7", name: "Thomas Petit", status: "AVAILABLE", missions: [] },
    ];
  }, []);

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
              onDriverClick={(id) => console.log("Driver clicked:", id)}
              onMissionClick={(id) => console.log("Mission clicked:", id)}
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
