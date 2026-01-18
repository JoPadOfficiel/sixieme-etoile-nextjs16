"use client";

import { cn } from "@ui/lib";

interface DispatchInspectorProps {
  className?: string;
  children: React.ReactNode;
}

export function DispatchInspector({ className, children }: DispatchInspectorProps) {
  // If no children, we might want to hide it completely or show empty state.
  // For layout purposes, we render it but it may be empty.
  // Actually, standard inspector is collapsible or overlay. 
  // For now fixed width if content exists.
  
  if (!children) return null;
  
  return (
    <div className={cn("w-[350px] flex-shrink-0 border-l bg-card flex flex-col h-full overflow-hidden", className)}>
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
