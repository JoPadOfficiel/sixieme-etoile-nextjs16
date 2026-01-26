"use client";

import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
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
	children,
}: DispatchSidebarProps) {
	const t = useTranslations("dispatch");
	return (
		<div
			className={cn(
				"z-10 flex h-full flex-col overflow-hidden border-r bg-card transition-all duration-300 ease-in-out",
				isCollapsed ? "w-[50px]" : "w-full lg:w-[25vw]",
				className,
			)}
		>
			<div className="flex h-14 flex-shrink-0 items-center justify-between border-b p-2">
				<div
					className={cn(
						"overflow-hidden transition-opacity duration-200",
						isCollapsed ? "w-0 opacity-0" : "px-2 opacity-100",
					)}
				>
					<span className="whitespace-nowrap font-semibold">
						{t("backlog")}
					</span>
				</div>
				<Button
					variant="ghost"
					size="icon"
					onClick={onToggle}
					className={cn("ml-auto flex-shrink-0", isCollapsed && "mx-auto")}
					aria-label="Toggle Sidebar"
				>
					{isCollapsed ? (
						<ChevronRight className="h-4 w-4" />
					) : (
						<ChevronLeft className="h-4 w-4" />
					)}
				</Button>
			</div>
			<div
				className={cn(
					"flex-1 overflow-hidden transition-opacity duration-200",
					isCollapsed ? "invisible opacity-0" : "visible opacity-100",
				)}
			>
				{children}
			</div>
		</div>
	);
}
