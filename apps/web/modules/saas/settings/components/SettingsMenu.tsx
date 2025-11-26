"use client";

import { cn } from "@ui/lib";
import { ChevronDownIcon, ChevronRightIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";

interface SubMenuItem {
	title: string;
	href: string;
	icon?: ReactNode;
}

interface MenuItem {
	title: string;
	href?: string;
	icon?: ReactNode;
	subItems?: SubMenuItem[];
}

interface MenuSection {
	title: string;
	avatar: ReactNode;
	items: MenuItem[];
}

export function SettingsMenu({
	menuItems,
}: {
	menuItems: MenuSection[];
}) {
	const pathname = usePathname();
	const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>(
		{},
	);

	const isActiveMenuItem = (href: string) => pathname.includes(href);

	const isAnySubItemActive = (subItems?: SubMenuItem[]) => {
		if (!subItems) return false;
		return subItems.some((sub) => isActiveMenuItem(sub.href));
	};

	const toggleExpanded = (key: string) => {
		setExpandedItems((prev) => ({
			...prev,
			[key]: !prev[key],
		}));
	};

	// Auto-expand if any sub-item is active
	const isExpanded = (key: string, subItems?: SubMenuItem[]) => {
		if (expandedItems[key] !== undefined) {
			return expandedItems[key];
		}
		return isAnySubItemActive(subItems);
	};

	return (
		<div className="space-y-8">
			{menuItems.map((section, i) => (
				<div key={i}>
					<div className="flex items-center justify-start gap-2">
						{section.avatar}
						<h2 className="font-semibold text-foreground/60 text-xs">
							{section.title}
						</h2>
					</div>

					<ul className="mt-2 flex list-none flex-row gap-6 lg:mt-4 lg:flex-col lg:gap-2">
						{section.items.map((item, k) => {
							const itemKey = `${i}-${k}`;
							const hasSubItems = item.subItems && item.subItems.length > 0;
							const expanded = isExpanded(itemKey, item.subItems);

							if (hasSubItems) {
								return (
									<li key={k}>
										<button
											type="button"
											onClick={() => toggleExpanded(itemKey)}
											className={cn(
												"lg:-ml-0.5 flex w-full items-center justify-between gap-2 border-b-2 py-1.5 text-sm lg:border-b-0 lg:border-l-2 lg:pr-2 lg:pl-2",
												isAnySubItemActive(item.subItems)
													? "border-primary font-bold"
													: "border-transparent",
											)}
										>
											<span className="flex items-center gap-2">
												<span className="shrink-0">{item.icon}</span>
												<span>{item.title}</span>
											</span>
											{expanded ? (
												<ChevronDownIcon className="size-4 opacity-50" />
											) : (
												<ChevronRightIcon className="size-4 opacity-50" />
											)}
										</button>
										{expanded && (
											<ul className="mt-1 ml-4 flex list-none flex-col gap-1 lg:ml-6">
												{item.subItems?.map((subItem, j) => (
													<li key={j}>
														<Link
															href={subItem.href}
															className={cn(
																"lg:-ml-0.5 flex items-center gap-2 border-b-2 py-1 text-sm lg:border-b-0 lg:border-l-2 lg:pl-2",
																isActiveMenuItem(subItem.href)
																	? "border-primary font-bold"
																	: "border-transparent",
															)}
															data-active={isActiveMenuItem(subItem.href)}
														>
															<span className="shrink-0">{subItem.icon}</span>
															<span>{subItem.title}</span>
														</Link>
													</li>
												))}
											</ul>
										)}
									</li>
								);
							}

							return (
								<li key={k}>
									<Link
										href={item.href ?? "#"}
										className={cn(
											"lg:-ml-0.5 flex items-center gap-2 border-b-2 py-1.5 text-sm lg:border-b-0 lg:border-l-2 lg:pl-2",
											item.href && isActiveMenuItem(item.href)
												? "border-primary font-bold"
												: "border-transparent",
										)}
										data-active={
											item.href ? isActiveMenuItem(item.href) : false
										}
									>
										<span className="shrink-0">{item.icon}</span>
										<span>{item.title}</span>
									</Link>
								</li>
							);
						})}
					</ul>
				</div>
			))}
		</div>
	);
}
