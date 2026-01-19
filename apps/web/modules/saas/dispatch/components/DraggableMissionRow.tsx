"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@ui/lib";
import { memo } from "react";
import { MissionRow } from "./MissionRow";
import type { MissionListItem } from "../types";

interface DraggableMissionRowProps {
  mission: MissionListItem;
  isSelected: boolean;
  onSelect: (missionId: string) => void;
}

export const DraggableMissionRow = memo(function DraggableMissionRow({ mission, isSelected, onSelect }: DraggableMissionRowProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `mission-${mission.id}`,
    data: {
      type: "MISSION",
      mission,
    },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn("touch-none", isDragging && "opacity-50")}
    >
      <MissionRow
        mission={mission}
        isSelected={isSelected}
        onSelect={onSelect}
      />
    </div>
  );
});
