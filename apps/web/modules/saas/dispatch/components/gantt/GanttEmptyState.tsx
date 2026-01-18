"use client";

/**
 * GanttEmptyState Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Displays an empty state when no drivers are available.
 */

import { memo } from "react";
import { Users, Settings } from "lucide-react";
import { Button } from "@ui/components/button";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import Link from "next/link";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import type { GanttEmptyStateProps } from "./types";

export const GanttEmptyState = memo(function GanttEmptyState({
	className,
}: GanttEmptyStateProps) {
	const t = useTranslations("dispatch.gantt");
	const { activeOrganization: organization } = useActiveOrganization();

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center py-16 px-8 text-center",
				"bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-dashed border-gray-300 dark:border-gray-600",
				className
			)}
		>
			<div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
				<Users className="w-8 h-8 text-gray-400 dark:text-gray-500" />
			</div>

			<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
				{t("emptyState.title")}
			</h3>

			<p className="text-sm text-gray-600 dark:text-gray-400 mb-6 max-w-md">
				{t("emptyState.description")}
			</p>

			{organization?.slug && (
				<Button asChild variant="outline">
					<Link href={`/app/${organization.slug}/settings/fleet/drivers`}>
						<Settings className="w-4 h-4 mr-2" />
						{t("emptyState.configureDrivers")}
					</Link>
				</Button>
			)}
		</div>
	);
});
