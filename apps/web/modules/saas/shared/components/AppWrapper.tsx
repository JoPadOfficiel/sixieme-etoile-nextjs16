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

// Mobile sidebar width - must match NavBar
const MOBILE_SIDEBAR_WIDTH = 280;

function AppWrapperContent({ children }: PropsWithChildren) {
	const { isCollapsed, isMobile, isMobileMenuOpen } = useSidebar();
	const { useSidebarLayout } = config.ui.saas;

	const sidebarWidth = isCollapsed
		? SIDEBAR_WIDTH_COLLAPSED
		: SIDEBAR_WIDTH_EXPANDED;

	// Calculate margin based on device and sidebar state
	const getMarginLeft = () => {
		if (!useSidebarLayout) return undefined;
		if (isMobile) {
			// On mobile, content shifts when sidebar is open
			return isMobileMenuOpen ? `${MOBILE_SIDEBAR_WIDTH}px` : "0px";
		}
		// On desktop, always show margin for sidebar
		return `${sidebarWidth}px`;
	};

	return (
		<div
			className={cn(
				"bg-background",
				[useSidebarLayout ? "" : ""],
			)}
		>
			<NavBar />
			<div
				className={cn(
					"overflow-x-hidden px-0 transition-all duration-200 ease-in-out",
					{
						"min-h-screen": useSidebarLayout,
						// Add top padding on mobile to account for fixed header
						"pt-14 md:pt-0": useSidebarLayout,
					}
				)}
				style={{
					marginLeft: getMarginLeft(),
				}}
			>
				{/* Content header with breadcrumb - hidden on mobile */}
				{useSidebarLayout && <ContentHeader className="hidden md:block" />}
				
				<main
					className={cn("max-w-full overflow-x-auto px-1 py-1 lg:px-2", [
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
