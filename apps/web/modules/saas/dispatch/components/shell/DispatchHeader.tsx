"use client";

import { useQueryState, parseAsString } from "nuqs";
import { Button } from "@ui/components/button";
import { List, Kanban, Calendar } from "lucide-react";
import { useTranslations } from "next-intl";

export function DispatchHeader() {
  const [viewMode, setViewMode] = useQueryState("view", parseAsString.withDefault("gantt"));
  const t = useTranslations("dispatch");
  
  return (
    <header className="h-14 border-b flex items-center px-4 justify-between bg-background z-20 sticky top-0">
      <div className="flex items-center gap-4">
        <h1 className="font-semibold text-lg">{t("title")}</h1>
        
        <div className="h-6 w-px bg-border" />

        <div className="flex items-center gap-1 border rounded-md p-1 bg-muted/20">
          <Button 
            variant={viewMode === "gantt" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("gantt")}
            className="h-7 text-xs"
          >
            <Calendar className="mr-2 h-3.5 w-3.5" />
            Gantt
          </Button>
          <Button 
            variant={viewMode === "list" ? "secondary" : "ghost"} 
            size="sm"
            onClick={() => setViewMode("list")}
            className="h-7 text-xs"
          >
            <List className="mr-2 h-3.5 w-3.5" />
            List
          </Button>
          <Button 
             variant={viewMode === "map" ? "secondary" : "ghost"} 
             size="sm"
             onClick={() => setViewMode("map")}
             className="h-7 text-xs"
           >
             <Kanban className="mr-2 h-3.5 w-3.5" />
             Map
           </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
         {/* DateRangePicker Placeholder */}
         <div className="text-xs text-muted-foreground border px-2 py-1 rounded">
             {/* Use real component later */}
             Date Range Picker
         </div>
      </div>
    </header>
  );
}
