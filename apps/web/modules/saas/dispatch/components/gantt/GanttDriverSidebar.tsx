"use client";

/**
 * GanttDriverSidebar Component
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Renders the fixed left sidebar with driver names and status indicators.
 */

import { memo } from "react";
import Image from "next/image";
import { useDroppable } from "@dnd-kit/core";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import type { GanttDriverSidebarProps, DriverStatus } from "./types";
import { ROW_HEIGHT, SIDEBAR_WIDTH } from "./constants";

const StatusIndicator = memo(function StatusIndicator({
	status,
	statusLabel,
}: {
	status: DriverStatus;
	statusLabel: string;
}) {
	const colorClasses: Record<DriverStatus, string> = {
		AVAILABLE: "bg-green-500",
		ON_MISSION: "bg-blue-500",
		UNAVAILABLE: "bg-gray-400",
	};

	return (
		<span
			className={cn("w-2 h-2 rounded-full flex-shrink-0", colorClasses[status])}
			title={statusLabel}
		/>
	);
});

const DriverRow = memo(function DriverRow({
	driver,
	style,
	onClick,
	statusLabel,
}: {
	driver: { id: string; name: string; avatar?: string; status: DriverStatus };
	style: React.CSSProperties;
	onClick?: () => void;
	statusLabel: string;
}) {
	// Story 27.9: Allow dropping on sidebar rows
	const { setNodeRef, isOver } = useDroppable({
		id: `driver-sidebar-${driver.id}`,
		data: {
			type: "DRIVER",
			driverId: driver.id,
		},
	});

	// Get initials from name
	const initials = driver.name
		.split(" ")
		.map((n) => n[0])
		.join("")
		.toUpperCase()
		.slice(0, 2);

	return (
		<div
			ref={setNodeRef}
			className={cn(
				"absolute left-0 right-0 flex items-center gap-3 px-3 border-b border-gray-200 dark:border-gray-700",
				"hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors",
				isOver && "ring-2 ring-primary ring-inset z-10 bg-primary/10"
			)}
			style={{ ...style, height: ROW_HEIGHT }}
			onClick={onClick}
		>
			{/* Avatar */}
			<div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0 overflow-hidden relative">
				{driver.avatar ? (
					<Image
						src={driver.avatar}
						alt={driver.name}
						fill
						className="object-cover"
						sizes="32px"
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
					<StatusIndicator status={driver.status} statusLabel={statusLabel} />
					<span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
						{driver.name}
					</span>
				</div>
				<span className="text-xs text-gray-500 dark:text-gray-400">
					{statusLabel}
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
	const t = useTranslations("dispatch.gantt.status");
	const totalHeight = drivers.length * ROW_HEIGHT;

	const getStatusLabel = (status: DriverStatus): string => {
		const statusMap: Record<DriverStatus, string> = {
			AVAILABLE: t("available"),
			ON_MISSION: t("onMission"),
			UNAVAILABLE: t("unavailable"),
		};
		return statusMap[status];
	};

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
							statusLabel={getStatusLabel(driver.status)}
						/>
					);
				})}
			</div>
		</div>
	);
});
