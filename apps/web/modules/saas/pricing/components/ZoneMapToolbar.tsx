"use client";

/**
 * Zone Map Toolbar Component
 * Story 11.1: Unified Zone Management Interface with Interactive Map
 *
 * Provides drawing tools for creating zones on the map
 */

import { Button } from "@ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import { CircleIcon, HandIcon, PentagonIcon, Trash2Icon } from "lucide-react";
import { useTranslations } from "next-intl";

export type DrawingMode = "pan" | "polygon" | "circle" | null;

interface ZoneMapToolbarProps {
	activeMode: DrawingMode;
	onModeChange: (mode: DrawingMode) => void;
	onClear: () => void;
	hasDrawnShape: boolean;
	className?: string;
}

export function ZoneMapToolbar({
	activeMode,
	onModeChange,
	onClear,
	hasDrawnShape,
	className,
}: ZoneMapToolbarProps) {
	const t = useTranslations();

	const tools = [
		{
			mode: "pan" as const,
			icon: HandIcon,
			label: t("pricing.zones.map.panTool"),
			tooltip: t("pricing.zones.map.panToolTip"),
		},
		{
			mode: "circle" as const,
			icon: CircleIcon,
			label: t("pricing.zones.map.circleTool"),
			tooltip: t("pricing.zones.map.circleToolTip"),
		},
		{
			mode: "polygon" as const,
			icon: PentagonIcon,
			label: t("pricing.zones.map.polygonTool"),
			tooltip: t("pricing.zones.map.polygonToolTip"),
		},
	];

	return (
		<TooltipProvider>
			<div
				className={cn(
					"absolute top-3 left-3 z-10 flex items-center gap-1 rounded-lg bg-background/95 p-1 shadow-lg backdrop-blur-sm border",
					className
				)}
			>
				{tools.map((tool) => (
					<Tooltip key={tool.mode}>
						<TooltipTrigger asChild>
							<Button
								type="button"
								variant={activeMode === tool.mode ? "default" : "ghost"}
								size="sm"
								className="size-9 p-0"
								onClick={() => onModeChange(tool.mode)}
								aria-label={tool.label}
							>
								<tool.icon className="size-4" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="bottom">
							<p>{tool.tooltip}</p>
						</TooltipContent>
					</Tooltip>
				))}

				{hasDrawnShape && (
					<>
						<div className="mx-1 h-6 w-px bg-border" />
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									type="button"
									variant="ghost"
									size="sm"
									className="size-9 p-0 text-destructive hover:text-destructive"
									onClick={onClear}
									aria-label={t("pricing.zones.map.clearTool")}
								>
									<Trash2Icon className="size-4" />
								</Button>
							</TooltipTrigger>
							<TooltipContent side="bottom">
								<p>{t("pricing.zones.map.clearToolTip")}</p>
							</TooltipContent>
						</Tooltip>
					</>
				)}
			</div>
		</TooltipProvider>
	);
}
