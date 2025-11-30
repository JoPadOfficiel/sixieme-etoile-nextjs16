"use client";

import { config } from "@repo/config";
import {
	SidebarProvider,
	useSidebar,
	SIDEBAR_WIDTH_EXPANDED,
	SIDEBAR_WIDTH_COLLAPSED,
} from "@saas/shared/contexts/SidebarContext";
import { ContentHeader } from "@saas/shared/components/ContentHeader";
import { NavBar } from "@saas/shared/components/NavBar";
import { TooltipProvider } from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import type { PropsWithChildren } from "react";

function AppWrapperContent({ children }: PropsWithChildren) {
	const { isCollapsed } = useSidebar();
	const { useSidebarLayout } = config.ui.saas;

	const sidebarWidth = isCollapsed
		? SIDEBAR_WIDTH_COLLAPSED
		: SIDEBAR_WIDTH_EXPANDED;

	return (
		<div
			className={cn(
				"bg-background",
				[useSidebarLayout ? "" : ""],
			)}
		>
			<NavBar />
			<div
				className={cn("overflow-x-hidden px-0 transition-all duration-200 ease-in-out", [
					useSidebarLayout ? "min-h-screen" : "",
				])}
				style={{
					marginLeft: useSidebarLayout ? `${sidebarWidth}px` : undefined,
				}}
			>
				{/* Content header with breadcrumb */}
				{useSidebarLayout && <ContentHeader />}
				
				<main
					className={cn("max-w-full overflow-x-auto px-4 py-6 lg:px-6", [
						useSidebarLayout ? "" : "",
					])}
				>
					{children}
				</main>
			</div>
		</div>
	);
}

export function AppWrapper({ children }: PropsWithChildren) {
	return (
		<TooltipProvider>
			<SidebarProvider>
				<AppWrapperContent>{children}</AppWrapperContent>
			</SidebarProvider>
		</TooltipProvider>
	);
}
