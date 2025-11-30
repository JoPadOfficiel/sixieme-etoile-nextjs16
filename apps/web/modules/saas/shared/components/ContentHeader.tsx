"use client";

import { useSidebar } from "@saas/shared/contexts/SidebarContext";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import { ChevronRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";

export interface BreadcrumbItem {
	label: string;
	href: string;
	isCurrentPage?: boolean;
}

interface ContentHeaderProps {
	/** Custom breadcrumb items - if not provided, will auto-generate from pathname */
	breadcrumbs?: BreadcrumbItem[];
	/** Additional content to render on the right side of the header */
	rightContent?: React.ReactNode;
	/** Custom class name */
	className?: string;
}

// Sidebar toggle icon SVG (matching the reference design)
function SidebarToggleIcon({ className }: { className?: string }) {
	return (
		<svg
			width="16"
			height="16"
			viewBox="0 0 16 16"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			className={cn("size-4", className)}
		>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M5.57527 0.78924L10.4219 0.78924C11.1489 0.78924 11.7271 0.78923 12.1935 0.82734C12.6712 0.86637 13.0785 0.94801 13.4514 1.13802C14.0535 1.44481 14.5431 1.93435 14.8499 2.53646C15.0399 2.90935 15.1215 3.31669 15.1606 3.79435C15.1986 4.26079 15.1986 4.83895 15.1986 5.56591V10.4341C15.1986 11.1611 15.1986 11.7392 15.1606 12.2057C15.1215 12.6833 15.0399 13.0907 14.8499 13.4635C14.5431 14.0657 14.0535 14.5552 13.4514 14.862C13.0785 15.052 12.6712 15.1336 12.1935 15.1727C11.7271 15.2108 11.1489 15.2108 10.4219 15.2108H5.57529C4.84833 15.2108 4.27017 15.2108 3.80373 15.1727C3.32607 15.1336 2.91873 15.052 2.54584 14.862C1.94373 14.5552 1.45419 14.0657 1.1474 13.4635C0.957392 13.0907 0.875752 12.6833 0.836725 12.2057C0.798715 11.7392 0.798718 11.1611 0.798723 10.4341L0.798723 5.5659C0.798718 4.83894 0.798715 4.26079 0.836725 3.79435C0.875752 3.31669 0.957392 2.90935 1.1474 2.53646C1.45419 1.93435 1.94373 1.44481 2.54584 1.13802C2.91873 0.94801 3.32607 0.86637 3.80373 0.82734C4.27017 0.78923 4.84833 0.78924 5.57527 0.78924ZM3.89058 2.19046C3.47889 2.22409 3.22759 2.28778 3.03009 2.38842C2.62868 2.59295 2.30233 2.91931 2.0978 3.32072C1.99716 3.51822 1.93347 3.76951 1.89984 4.18121C1.86569 4.59912 1.86528 5.13369 1.86528 5.88924L1.86528 10.1104C1.86528 10.8659 1.86569 11.4005 1.89984 11.8184C1.93347 12.2301 1.99716 12.4814 2.0978 12.6789C2.30233 13.0803 2.62868 13.4067 3.03009 13.6112C3.22759 13.7118 3.47889 13.7755 3.89058 13.8092C4.3085 13.8433 4.84307 13.8437 5.59862 13.8437L10.3986 13.8437C11.1542 13.8437 11.6887 13.8433 12.1066 13.8092C12.5183 13.7755 12.7696 13.7118 12.9671 13.6112C13.3685 13.4067 13.6949 13.0803 13.8994 12.6789C14.0001 12.4814 14.0638 12.2301 14.0974 11.8184C14.1316 11.4005 14.132 10.8659 14.132 10.1104L14.132 5.88924C14.132 5.13369 14.1316 4.59912 14.0974 4.18121C14.0638 3.76951 14.0001 3.51822 13.8994 3.32072C13.6949 2.91931 13.3685 2.59295 12.9671 2.38842C12.7696 2.28778 12.5183 2.22409 12.1066 2.19046C11.6887 2.15632 11.1542 2.15591 10.3986 2.15591L5.59862 2.15591C4.84307 2.15591 4.3085 2.15632 3.89058 2.19046Z"
				fill="currentColor"
				className="opacity-60"
			/>
			<path
				fillRule="evenodd"
				clipRule="evenodd"
				d="M6.29583 14.7329L6.29583 1.21743H7.56139L7.56139 14.7329H6.29583Z"
				fill="currentColor"
				className="opacity-80 transition-transform duration-200 ease-out group-hover/sidebar-trigger:translate-x-[2px]"
			/>
			<path
				d="M9.5 8L11.5 6L11.5 7L13 7L13 9L11.5 9L11.5 10L9.5 8Z"
				fill="currentColor"
				className="opacity-0 transition-opacity duration-200 group-hover/sidebar-trigger:opacity-90"
			/>
		</svg>
	);
}

// Route label mapping for auto-generated breadcrumbs
const routeLabels: Record<string, string> = {
	app: "Home",
	contacts: "Contacts",
	dispatch: "Dispatch",
	quotes: "Quotes",
	invoices: "Invoices",
	documents: "Documents",
	reports: "Reports",
	vehicles: "Vehicles",
	fleet: "Fleet",
	bases: "Operating Bases",
	drivers: "Drivers",
	settings: "Settings",
	admin: "Admin",
	"ai-demo": "AI Demo",
	"new-organization": "New Organization",
	profile: "Profile",
	security: "Security",
	notifications: "Notifications",
	members: "Members",
	billing: "Billing",
	account: "Account",
	organization: "Organization",
	general: "General",
};

export function ContentHeader({
	breadcrumbs: customBreadcrumbs,
	rightContent,
	className,
}: ContentHeaderProps) {
	const t = useTranslations();
	const pathname = usePathname();
	const { toggleSidebar, isCollapsed } = useSidebar();

	// Auto-generate breadcrumbs from pathname if not provided
	const breadcrumbs = useMemo(() => {
		if (customBreadcrumbs) return customBreadcrumbs;

		const segments = pathname.split("/").filter(Boolean);
		const items: BreadcrumbItem[] = [];

		// Find the base path (either /app or /app/[org-slug])
		let basePath = "/app";
		let startIndex = 1; // Skip "app"

		// Check if second segment is an organization slug (not a known route)
		if (segments[1] && !routeLabels[segments[1]]) {
			basePath = `/app/${segments[1]}`;
			startIndex = 2; // Skip "app" and org slug
		}

		// Always add Home as first item
		items.push({
			label: t("breadcrumb.home"),
			href: basePath,
			isCurrentPage: pathname === basePath,
		});

		// Build breadcrumb items from remaining segments
		let currentPath = basePath;
		for (let i = startIndex; i < segments.length; i++) {
			const segment = segments[i];
			currentPath = `${currentPath}/${segment}`;

			const label = routeLabels[segment] || segment;
			const isLast = i === segments.length - 1;

			items.push({
				label,
				href: currentPath,
				isCurrentPage: isLast,
			});
		}

		return items;
	}, [customBreadcrumbs, pathname, t]);

	const toggleLabel = isCollapsed
		? t("sidebar.expand")
		: t("sidebar.collapse");

	return (
		<div
			className={cn(
				"sticky top-0 z-20 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
				className
			)}
		>
			<div className="relative flex h-14 flex-row items-center gap-1 px-4 sm:px-6">
				{/* Sidebar toggle button */}
				<Tooltip>
					<TooltipTrigger asChild>
						<button
							type="button"
							onClick={toggleSidebar}
							className="group/sidebar-trigger inline-flex size-8 items-center justify-center rounded-md px-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:-ml-2"
						>
							<SidebarToggleIcon className="text-muted-foreground" />
						</button>
					</TooltipTrigger>
					<TooltipContent side="right" sideOffset={8}>
						<p>{toggleLabel}</p>
						<p className="text-xs text-muted-foreground">
							{typeof navigator !== "undefined" &&
							navigator.platform?.toLowerCase().includes("mac")
								? "⌘+B"
								: "Ctrl+B"}
						</p>
					</TooltipContent>
				</Tooltip>

				{/* Separator */}
				<div
					role="none"
					className="mr-2 h-4 w-px shrink-0 bg-border"
				/>

				{/* Breadcrumb navigation */}
				<div className="flex w-full flex-row items-center justify-between">
					<div className="flex flex-row items-center gap-2">
						<nav aria-label="breadcrumb">
							<ol className="flex items-center gap-1.5 break-words text-sm text-muted-foreground sm:gap-2.5 flex-wrap">
								{breadcrumbs.map((item, index) => {
									const isLast = index === breadcrumbs.length - 1;

									return (
										<li
											key={item.href}
											className={cn(
												"items-center gap-1.5",
												// Hide intermediate items on mobile, show only first and last
												index > 0 && !isLast
													? "hidden sm:inline-flex"
													: "inline-flex"
											)}
										>
											{/* Separator (not for first item) */}
											{index > 0 && (
												<ChevronRightIcon
													className="size-3.5 shrink-0 text-muted-foreground/40 mr-1.5 sm:mr-0"
													aria-hidden="true"
												/>
											)}

											{/* Breadcrumb item */}
											{item.isCurrentPage ? (
												<span
													role="link"
													aria-disabled="true"
													aria-current="page"
													className="text-sm font-medium text-foreground"
												>
													{item.label}
												</span>
											) : (
												<Link
													href={item.href}
													className="text-sm font-normal text-muted-foreground/70 transition-colors duration-200 hover:text-foreground"
												>
													{item.label}
												</Link>
											)}
										</li>
									);
								})}
							</ol>
						</nav>
					</div>

					{/* Right content slot */}
					{rightContent && (
						<div className="flex flex-row items-center gap-2">
							{rightContent}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
