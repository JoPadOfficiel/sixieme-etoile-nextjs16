"use client";

/**
 * GanttDriverSidebar Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders the fixed left sidebar with driver names and status indicators.
 */

import { memo } from "react";
import { cn } from "@ui/lib";
import type { GanttDriverSidebarProps, DriverStatus } from "./types";
import { ROW_HEIGHT, SIDEBAR_WIDTH, STATUS_LABELS } from "./constants";

const StatusIndicator = memo(function StatusIndicator({
	status,
}: {
	status: DriverStatus;
}) {
	const colorClasses: Record<DriverStatus, string> = {
		AVAILABLE: "bg-green-500",
		ON_MISSION: "bg-blue-500",
		UNAVAILABLE: "bg-gray-400",
	};

	return (
		<span
			className={cn("w-2 h-2 rounded-full flex-shrink-0", colorClasses[status])}
			title={STATUS_LABELS[status]}
		/>
	);
});

const DriverRow = memo(function DriverRow({
	driver,
	style,
	onClick,
}: {
	driver: { id: string; name: string; avatar?: string; status: DriverStatus };
	style: React.CSSProperties;
	onClick?: () => void;
}) {
	// Get initials from name
	const initials = driver.name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<div
			className={cn(
				"absolute left-0 right-0 flex items-center gap-3 px-3 border-b border-gray-200 dark:border-gray-700",
				"hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
			)}
			style={{ ...style, height: ROW_HEIGHT }}
			onClick={onClick}
		>
			{/* Avatar */}
			<div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden">
				{driver.avatar ? (
					<img
						src={driver.avatar}
						alt={driver.name}
						className="w-full h-full object-cover"
					/>
				) : (
					<span className="text-xs font-medium text-gray-600 dark:text-gray-400">
						{initials}
					</span>
				)}
			</div>

			{/* Name and status */}
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<StatusIndicator status={driver.status} />
					<span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
						{driver.name}
					</span>
				</div>
				<span className="text-xs text-gray-500 dark:text-gray-400">
					{STATUS_LABELS[driver.status]}
				</span>
			</div>
		</div>
	);
});

export const GanttDriverSidebar = memo(function GanttDriverSidebar({
	drivers,
	virtualItems,
	onDriverClick,
}: GanttDriverSidebarProps) {
	const totalHeight = drivers.length * ROW_HEIGHT;

	return (
		<div
			className="flex-shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden"
			style={{ width: SIDEBAR_WIDTH }}
		>
			<div className="relative" style={{ height: totalHeight }}>
				{virtualItems.map((virtualItem) => {
					const driver = drivers[virtualItem.index];
					if (!driver) return null;

					return (
						<DriverRow
							key={driver.id}
							driver={driver}
							style={{
								top: virtualItem.start,
							}}
							onClick={() => onDriverClick?.(driver.id)}
						/>
					);
				})}
			</div>
		</div>
	);
});
