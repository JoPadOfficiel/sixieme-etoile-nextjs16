"use client";

import { cn } from "@ui/lib";
import { Button } from "@ui/components/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

interface DispatchSidebarProps {
  className?: string;
  isCollapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

export function DispatchSidebar({ 
  className, 
  isCollapsed, 
  onToggle, 
  children 
}: DispatchSidebarProps) {
  const t = useTranslations("dispatch");
  return (
    <div 
      className={cn(
        "flex flex-col border-r bg-card transition-all duration-300 ease-in-out overflow-hidden h-full z-10",
        isCollapsed ? "w-[50px]" : "w-[300px] lg:w-[20%]",
        className
      )}
    >
      <div className="flex items-center justify-between p-2 border-b h-14 flex-shrink-0">
        <div className={cn("overflow-hidden transition-opacity duration-200", isCollapsed ? "opacity-0 w-0" : "opacity-100 px-2")}>
           <span className="font-semibold whitespace-nowrap">{t("backlog")}</span>
        </div>
         <Button variant="ghost" size="icon" onClick={onToggle} className={cn("ml-auto flex-shrink-0", isCollapsed && "mx-auto")} aria-label="Toggle Sidebar">
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <div className={cn("flex-1 overflow-hidden transition-opacity duration-200", isCollapsed ? "opacity-0 invisible" : "opacity-100 visible")}>
        {children}
      </div>
    </div>
  );
}
