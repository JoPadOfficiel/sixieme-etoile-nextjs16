"use client";

import type { LucideIcon } from "lucide-react";
import { ChevronDownIcon } from "lucide-react";
import { Badge } from "@ui/components/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@ui/components/collapsible";
import { cn } from "@ui/lib";

type ColorScheme = "blue" | "amber" | "purple" | "emerald" | "gray" | "indigo";

interface CollapsibleSectionProps {
  title: string;
  icon: LucideIcon;
  badge?: string | React.ReactNode;
  badgeVariant?: "default" | "secondary" | "outline";
  colorScheme: ColorScheme;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const colorSchemeClasses: Record<ColorScheme, {
  border: string;
  bg: string;
  iconColor: string;
  titleColor: string;
  triggerHover: string;
}> = {
  blue: {
    border: "border-blue-200 dark:border-blue-800",
    bg: "bg-blue-50 dark:bg-blue-950/50",
    iconColor: "text-blue-600 dark:text-blue-400",
    titleColor: "text-blue-800 dark:text-blue-200",
    triggerHover: "hover:bg-blue-100 dark:hover:bg-blue-900/50",
  },
  amber: {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-950/50",
    iconColor: "text-amber-600 dark:text-amber-400",
    titleColor: "text-amber-800 dark:text-amber-200",
    triggerHover: "hover:bg-amber-100 dark:hover:bg-amber-900/50",
  },
  purple: {
    border: "border-purple-200 dark:border-purple-800",
    bg: "bg-purple-50 dark:bg-purple-950/50",
    iconColor: "text-purple-600 dark:text-purple-400",
    titleColor: "text-purple-800 dark:text-purple-200",
    triggerHover: "hover:bg-purple-100 dark:hover:bg-purple-900/50",
  },
  emerald: {
    border: "border-emerald-200 dark:border-emerald-800",
    bg: "bg-emerald-50 dark:bg-emerald-950/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    titleColor: "text-emerald-800 dark:text-emerald-200",
    triggerHover: "hover:bg-emerald-100 dark:hover:bg-emerald-900/50",
  },
  gray: {
    border: "border-gray-200 dark:border-gray-800",
    bg: "bg-gray-50 dark:bg-gray-950/50",
    iconColor: "text-gray-600 dark:text-gray-400",
    titleColor: "text-gray-800 dark:text-gray-200",
    triggerHover: "hover:bg-gray-100 dark:hover:bg-gray-900/50",
  },
  indigo: {
    border: "border-indigo-200 dark:border-indigo-800",
    bg: "bg-indigo-50 dark:bg-indigo-950/50",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    titleColor: "text-indigo-800 dark:text-indigo-200",
    triggerHover: "hover:bg-indigo-100 dark:hover:bg-indigo-900/50",
  },
};

/**
 * CollapsibleSection Component
 * 
 * Reusable accordion wrapper for TripTransparency sections.
 * Provides consistent styling and animation across all sections.
 * 
 * @see Story 21-7: Enhanced TripTransparency Interface
 */
export function CollapsibleSection({
  title,
  icon: Icon,
  badge,
  badgeVariant = "secondary",
  colorScheme,
  children,
  isOpen,
  onToggle,
  className,
}: CollapsibleSectionProps) {
  const colors = colorSchemeClasses[colorScheme];

  return (
    <Collapsible
      open={isOpen}
      onOpenChange={onToggle}
      className={cn(
        "rounded-lg border",
        colors.border,
        colors.bg,
        className
      )}
    >
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between p-4 rounded-lg transition-colors",
          colors.triggerHover
        )}
      >
        <div className="flex items-center gap-3">
          <Icon className={cn("size-5", colors.iconColor)} />
          <span className={cn("font-semibold", colors.titleColor)}>
            {title}
          </span>
          {badge && !isOpen && (
            typeof badge === "string" ? (
              <Badge variant={badgeVariant} className="text-xs">
                {badge}
              </Badge>
            ) : badge
          )}
        </div>
        <ChevronDownIcon
          className={cn(
            "size-5 transition-transform duration-200",
            colors.iconColor,
            isOpen && "rotate-180"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="data-[state=open]:animate-collapsible-down data-[state=closed]:animate-collapsible-up">
        <div className="px-4 pb-4">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export default CollapsibleSection;
