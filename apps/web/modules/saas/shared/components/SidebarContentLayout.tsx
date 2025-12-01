"use client";

import { cn } from "@ui/lib";
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";

export function SidebarContentLayout({
	children,
	sidebar,
}: { children: React.ReactNode; sidebar: ReactNode }) {
	const [isSubMenuOpen, setIsSubMenuOpen] = useState(true);

	return (
		<div className="relative">
			<div className="flex flex-col items-start gap-4 lg:flex-row lg:gap-8">
				{/* Mobile: Collapsible sub-menu - starts open */}
				<div className="w-full lg:hidden">
					<button
						type="button"
						onClick={() => setIsSubMenuOpen(!isSubMenuOpen)}
						className="flex w-full items-center justify-between rounded-lg border bg-card px-4 py-3 text-sm font-medium shadow-sm transition-colors hover:bg-accent"
					>
						<span>Navigation</span>
						{isSubMenuOpen ? (
							<ChevronUpIcon className="h-4 w-4 text-muted-foreground" />
						) : (
							<ChevronDownIcon className="h-4 w-4 text-muted-foreground" />
						)}
					</button>
					<div
						className={cn(
							"mt-2 overflow-hidden rounded-lg border bg-card p-4 shadow-sm transition-all duration-200",
							isSubMenuOpen ? "max-h-[2000px] opacity-100" : "max-h-0 border-0 p-0 opacity-0"
						)}
					>
						{sidebar}
					</div>
				</div>

				{/* Desktop: Sticky sidebar */}
				<div className="hidden lg:block top-4 w-full lg:sticky lg:max-w-[180px]">
					{sidebar}
				</div>

				<div className="w-full flex-1">{children}</div>
			</div>
		</div>
	);
}
