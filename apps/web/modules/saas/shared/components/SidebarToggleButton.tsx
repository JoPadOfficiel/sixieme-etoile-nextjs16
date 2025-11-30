"use client";

import { useSidebar } from "@saas/shared/contexts/SidebarContext";
import { Button } from "@ui/components/button";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface SidebarToggleButtonProps {
	className?: string;
}

export function SidebarToggleButton({ className }: SidebarToggleButtonProps) {
	const t = useTranslations();
	const { isCollapsed, toggleSidebar } = useSidebar();

	const label = isCollapsed
		? t("sidebar.expand")
		: t("sidebar.collapse");

	const Icon = isCollapsed ? PanelLeftOpenIcon : PanelLeftCloseIcon;

	return (
		<Tooltip>
			<TooltipTrigger asChild>
				<Button
					variant="ghost"
					size="icon"
					onClick={toggleSidebar}
					className={cn(
						"h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground",
						className
					)}
					aria-label={label}
				>
					<Icon className="h-4 w-4" />
				</Button>
			</TooltipTrigger>
			<TooltipContent side="right" sideOffset={8}>
				<p>{label}</p>
				<p className="text-xs text-muted-foreground">
					{typeof navigator !== "undefined" &&
					navigator.platform?.toLowerCase().includes("mac")
						? "⌘+B"
						: "Ctrl+B"}
				</p>
			</TooltipContent>
		</Tooltip>
	);
}
