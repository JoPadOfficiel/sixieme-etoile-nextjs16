"use client";
import { config } from "@repo/config";
import { useSession } from "@saas/auth/hooks/use-session";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { UserMenu } from "@saas/shared/components/UserMenu";
import {
	SIDEBAR_WIDTH_COLLAPSED,
	SIDEBAR_WIDTH_EXPANDED,
	useSidebar,
} from "@saas/shared/contexts/SidebarContext";
import { Logo } from "@shared/components/Logo";
import {
	Tooltip,
	TooltipContent,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { cn } from "@ui/lib";
import {
	BarChart3Icon,
	CarIcon,
	ChevronRightIcon,
	ClipboardListIcon,
	FileTextIcon,
	FolderIcon,
	HomeIcon,
	MapPinIcon,
	ReceiptIcon,
	SettingsIcon,
	UserCog2Icon,
	UserCogIcon,
	UserIcon,
	UsersIcon,
	Wand2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { OrganizationLogo } from "../../organizations/components/OrganizationLogo";
import { OrganzationSelect } from "../../organizations/components/OrganizationSelect";

// Sidebar toggle icon SVG (same as ContentHeader)
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

export function NavBar() {
	const t = useTranslations();
	const pathname = usePathname();
	const { user } = useSession();
	const { activeOrganization } = useActiveOrganization();
	const {
		isCollapsed,
		isMobile,
		isMobileMenuOpen,
		closeMobileMenu,
		toggleMobileMenu,
	} = useSidebar();

	const { useSidebarLayout } = config.ui.saas;

	const basePath = activeOrganization
		? `/app/${activeOrganization.slug}`
		: "/app";

	const menuItems = [
		{
			label: t("app.menu.start"),
			href: basePath,
			icon: HomeIcon,
			isActive: pathname === basePath,
		},
		...(activeOrganization
			? [
					{
						label: t("contacts.title"),
						href: `${basePath}/contacts`,
						icon: UsersIcon,
						isActive: pathname.startsWith(`${basePath}/contacts`),
					},
					{
						label: t("dispatch.title"),
						href: `${basePath}/dispatch`,
						icon: FolderIcon,
						isActive: pathname.startsWith(`${basePath}/dispatch`),
					},
					{
						label: t("quotes.title"),
						href: `${basePath}/quotes`,
						icon: FileTextIcon,
						isActive: pathname.startsWith(`${basePath}/quotes`),
					},
					{
						label: t("orders.title"),
						href: `${basePath}/orders`,
						icon: ClipboardListIcon,
						isActive: pathname.startsWith(`${basePath}/orders`),
					},
					{
						label: t("invoices.title"),
						href: `${basePath}/invoices`,
						icon: ReceiptIcon,
						isActive: pathname.startsWith(`${basePath}/invoices`),
					},
					{
						label: t("documents.title"),
						href: `${basePath}/documents`,
						icon: FolderIcon,
						isActive: pathname.startsWith(`${basePath}/documents`),
					},
					{
						label: t("reports.title"),
						href: `${basePath}/reports`,
						icon: BarChart3Icon,
						isActive: pathname.startsWith(`${basePath}/reports`),
					},
					{
						label: t("fleet.vehicles.title"),
						href: `${basePath}/vehicles`,
						icon: CarIcon,
						isActive: pathname.startsWith(`${basePath}/vehicles`),
					},
					{
						label: t("fleet.bases.title"),
						href: `${basePath}/fleet/bases`,
						icon: MapPinIcon,
						isActive: pathname.startsWith(`${basePath}/fleet/bases`),
					},
					{
						label: t("fleet.drivers.title"),
						href: `${basePath}/drivers`,
						icon: UserIcon,
						isActive: pathname.startsWith(`${basePath}/drivers`),
					},
					{
						label: t("app.menu.organizationSettings"),
						href: `${basePath}/settings`,
						icon: SettingsIcon,
						isActive: pathname.startsWith(`${basePath}/settings`),
					},
				]
			: [
					{
						label: t("app.menu.aiDemo"),
						href: "/app/ai-demo",
						icon: Wand2Icon,
						isActive: pathname.startsWith("/app/ai-demo"),
					},
					{
						label: t("app.menu.accountSettings"),
						href: "/app/settings",
						icon: UserCog2Icon,
						isActive: pathname.startsWith("/app/settings"),
					},
				]),
		...(user?.role === "admin"
			? [
					{
						label: t("app.menu.admin"),
						href: "/app/admin",
						icon: UserCogIcon,
						isActive: pathname.startsWith("/app/admin"),
					},
				]
			: []),
	];

	const sidebarWidth = isCollapsed
		? SIDEBAR_WIDTH_COLLAPSED
		: SIDEBAR_WIDTH_EXPANDED;

	// Mobile sidebar width
	const mobileSidebarWidth = 280;

	// Mobile sidebar - slides in from left, pushes content
	const MobileSidebar = () => (
		<div
			className={cn(
				"fixed top-0 bottom-0 left-0 z-50 flex flex-col border-r bg-background transition-transform duration-200 ease-in-out md:hidden",
				isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
			)}
			style={{ width: `${mobileSidebarWidth}px` }}
		>
			{/* Header with toggle and organization */}
			<div className="flex h-14 items-center gap-2 border-b px-4">
				{/* Sidebar toggle button */}
				<button
					type="button"
					onClick={toggleMobileMenu}
					className="group/sidebar-trigger inline-flex size-8 items-center justify-center rounded-md px-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
					aria-label={t("sidebar.collapse")}
				>
					<SidebarToggleIcon className="text-muted-foreground" />
				</button>

				{/* Organization selector */}
				{config.organizations.enable &&
					!config.organizations.hideOrganization &&
					activeOrganization && <OrganzationSelect className="flex-1" />}
			</div>

			{/* Navigation items */}
			<nav className="flex-1 overflow-y-auto p-4">
				<ul className="flex flex-col gap-1">
					{menuItems.map((menuItem) => (
						<li key={menuItem.href}>
							<Link
								href={menuItem.href}
								onClick={closeMobileMenu}
								className={cn(
									"flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors",
									menuItem.isActive
										? "bg-primary/10 font-medium text-primary"
										: "text-muted-foreground hover:bg-accent hover:text-foreground",
								)}
							>
								<menuItem.icon className="h-5 w-5 shrink-0" />
								<span>{menuItem.label}</span>
							</Link>
						</li>
					))}
				</ul>
			</nav>

			{/* User info at bottom */}
			<div className="border-t p-4">
				<UserMenu showUserName />
			</div>
		</div>
	);

	// Mobile header bar - moves with sidebar
	const MobileHeaderBar = () => (
		<div
			className={cn(
				"fixed top-0 right-0 z-40 flex h-14 items-center gap-2 border-b bg-background px-4 transition-all duration-200 ease-in-out md:hidden",
			)}
			style={{
				left: isMobileMenuOpen ? `${mobileSidebarWidth}px` : "0px",
			}}
		>
			{/* Sidebar toggle button - only when sidebar is closed */}
			{!isMobileMenuOpen && (
				<button
					type="button"
					onClick={toggleMobileMenu}
					className="group/sidebar-trigger inline-flex size-8 items-center justify-center rounded-md px-1.5 font-medium text-muted-foreground text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
					aria-label={t("sidebar.expand")}
				>
					<SidebarToggleIcon className="text-muted-foreground" />
				</button>
			)}

			{/* Organization selector - only when sidebar is closed */}
			{!isMobileMenuOpen &&
				config.organizations.enable &&
				!config.organizations.hideOrganization &&
				activeOrganization && (
					<OrganzationSelect className="max-w-[200px] flex-1" />
				)}

			{/* User menu - RIGHT side */}
			<div className="ml-auto">
				<UserMenu showUserName={false} />
			</div>
		</div>
	);

	// Mobile backdrop overlay
	const MobileBackdrop = () => (
		<div
			className={cn(
				"fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 md:hidden",
				isMobileMenuOpen ? "opacity-100" : "pointer-events-none opacity-0",
			)}
			onClick={closeMobileMenu}
			aria-hidden="true"
		/>
	);

	// Desktop sidebar (hidden on mobile)
	const DesktopSidebar = () => (
		<nav
			className={cn(
				"hidden bg-background transition-all duration-200 ease-in-out md:block",
				{
					"md:fixed md:top-0 md:left-0 md:z-30 md:h-full md:border-r":
						useSidebarLayout,
				},
			)}
			style={{
				width: useSidebarLayout ? `${sidebarWidth}px` : undefined,
			}}
		>
			<div
				className={cn("py-4", {
					"flex h-full flex-col px-4 pt-4 pb-0": useSidebarLayout,
					"px-2": useSidebarLayout && isCollapsed,
				})}
			>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div
						className={cn("flex items-center gap-2", {
							"flex w-full flex-col items-stretch align-stretch":
								useSidebarLayout,
							"items-center": useSidebarLayout && isCollapsed,
						})}
					>
						{/* Logo - compact version when collapsed */}
						<Link href="/app" className="block">
							{useSidebarLayout && isCollapsed ? (
								<Logo withLabel={false} />
							) : (
								<Logo />
							)}
						</Link>

						{config.organizations.enable &&
							!config.organizations.hideOrganization && (
								<>
									<span
										className={cn("hidden opacity-30", {
											hidden: useSidebarLayout,
										})}
									>
										<ChevronRightIcon className="size-4" />
									</span>

									{/* Organization selector - avatar only when collapsed */}
									{useSidebarLayout && isCollapsed ? (
										<div className="mt-2">
											<Tooltip>
												<TooltipTrigger asChild>
													<button
														type="button"
														className="flex items-center justify-center rounded-md p-1 hover:bg-accent"
													>
														{activeOrganization ? (
															<OrganizationLogo
																name={activeOrganization.name}
																logoUrl={activeOrganization.logo}
																className="size-8"
															/>
														) : (
															<div className="flex size-8 items-center justify-center rounded-md bg-primary/20 font-medium text-xs">
																{user?.name?.charAt(0) || "?"}
															</div>
														)}
													</button>
												</TooltipTrigger>
												<TooltipContent side="right">
													{activeOrganization?.name ||
														t(
															"organizations.organizationSelect.personalAccount",
														)}
												</TooltipContent>
											</Tooltip>
										</div>
									) : (
										<OrganzationSelect
											className={cn({
												"-mx-2 mt-2": useSidebarLayout,
											})}
										/>
									)}
								</>
							)}
					</div>
				</div>

				<ul
					className={cn(
						"my-4 flex list-none flex-col items-stretch gap-1 text-sm",
						{
							"items-center": useSidebarLayout && isCollapsed,
						},
					)}
				>
					{menuItems.map((menuItem) => {
						const menuLink = (
							<Link
								href={menuItem.href}
								className={cn(
									"flex items-center gap-2 whitespace-nowrap transition-all duration-200",
									[menuItem.isActive ? "font-bold" : ""],
									{
										"-mx-4 border-l-2 px-4 py-2":
											useSidebarLayout && !isCollapsed,
										"justify-center border-l-0 px-0 py-2":
											useSidebarLayout && isCollapsed,
										"border-primary": menuItem.isActive,
										"border-transparent": !menuItem.isActive,
									},
								)}
							>
								<menuItem.icon
									className={cn("size-4 shrink-0", {
										"text-primary": menuItem.isActive,
										"opacity-50": !menuItem.isActive,
										"size-5": useSidebarLayout && isCollapsed,
									})}
								/>
								<span
									className={cn({
										hidden: useSidebarLayout && isCollapsed,
									})}
								>
									{menuItem.label}
								</span>
							</Link>
						);

						return (
							<li key={menuItem.href}>
								{useSidebarLayout && isCollapsed ? (
									<Tooltip>
										<TooltipTrigger asChild>{menuLink}</TooltipTrigger>
										<TooltipContent side="right" sideOffset={8}>
											{menuItem.label}
										</TooltipContent>
									</Tooltip>
								) : (
									menuLink
								)}
							</li>
						);
					})}
				</ul>

				{/* Footer with user menu */}
				<div
					className={cn("-mx-4 mt-auto mb-0 p-4", {
						block: useSidebarLayout,
						"px-2": useSidebarLayout && isCollapsed,
					})}
				>
					{/* User menu */}
					{isCollapsed ? (
						<div className="flex justify-center">
							<UserMenu showUserName={false} />
						</div>
					) : (
						<UserMenu showUserName />
					)}
				</div>
			</div>
		</nav>
	);

	return (
		<>
			{/* Mobile: backdrop, sidebar, and header bar */}
			{useSidebarLayout && (
				<>
					<MobileBackdrop />
					<MobileSidebar />
					<MobileHeaderBar />
				</>
			)}

			{/* Desktop sidebar */}
			<DesktopSidebar />
		</>
	);
}
