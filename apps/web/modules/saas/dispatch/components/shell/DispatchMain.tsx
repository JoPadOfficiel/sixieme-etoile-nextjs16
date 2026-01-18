"use client";

import { useQueryState, parseAsString } from "nuqs";
import { DispatchMapGoogle } from "../DispatchMapGoogle";
import type { MissionDetail } from "../../types";
import type { OperatingBase } from "../../hooks/useOperatingBases";

interface DispatchMainProps {
  mission: MissionDetail | null;
  bases: OperatingBase[];
  isLoadingBases: boolean;
  // Add other props as needed for Gantt/List
}

export function DispatchMain({ 
  mission, 
  bases, 
  isLoadingBases 
}: DispatchMainProps) {
  const [viewMode] = useQueryState("view", parseAsString.withDefault("gantt"));
  
  return (
    <div className="flex-1 h-full w-full relative overflow-hidden bg-background">
      {viewMode === "gantt" && (
        <div className="flex items-center justify-center h-full text-muted-foreground border-2 border-dashed m-4 rounded-lg bg-muted/10">
          Gantt Chart Placeholder (Story 27.3)
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
           />
        </div>
      )}
    </div>
  );
}
