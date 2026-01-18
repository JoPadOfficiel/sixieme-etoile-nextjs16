/**
 * Gantt Timeline Types
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Type definitions for the Gantt timeline visualization component.
 */

export type DriverStatus = "AVAILABLE" | "ON_MISSION" | "UNAVAILABLE";

export type MissionType = "CALCULATED" | "MANUAL";

export type MissionStatus = "PENDING" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export interface GanttMission {
	id: string;
	startAt: Date;
	endAt: Date;
	title: string;
	type: MissionType;
	status: MissionStatus;
	pickupAddress?: string;
	dropoffAddress?: string;
	clientName?: string;
}

export interface GanttDriver {
	id: string;
	name: string;
	avatar?: string;
	status: DriverStatus;
	missions?: GanttMission[];
}

export interface GanttTimelineProps {
	drivers: GanttDriver[];
	startTime: Date;
	endTime: Date;
	pixelsPerHour?: number;
	onDriverClick?: (driverId: string) => void;
	onMissionClick?: (missionId: string) => void;
	selectedMissionId?: string | null;
	className?: string;
}

export interface TimeScaleConfig {
	pixelsPerHour: number;
	totalHours: number;
	totalWidth: number;
	startTime: Date;
	endTime: Date;
}

export interface GanttHeaderProps {
	config: TimeScaleConfig;
	className?: string;
}

export interface GanttDriverRowProps {
	driver: GanttDriver;
	config: TimeScaleConfig;
	rowIndex: number;
	onClick?: () => void;
	onMissionClick?: (missionId: string) => void;
	selectedMissionId?: string | null;
}

export interface GanttDriverSidebarProps {
	drivers: GanttDriver[];
	virtualItems: { index: number; start: number; size: number }[];
	onDriverClick?: (driverId: string) => void;
}

export interface GanttNowIndicatorProps {
	config: TimeScaleConfig;
	height: number;
}

export interface GanttGridProps {
	config: TimeScaleConfig;
	rowCount: number;
	rowHeight: number;
}

export interface GanttEmptyStateProps {
	className?: string;
}
