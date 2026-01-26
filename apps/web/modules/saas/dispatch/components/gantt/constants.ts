/**
 * Gantt Timeline Constants
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Configuration constants for the Gantt timeline visualization.
 */

// Row dimensions
export const ROW_HEIGHT = 60;
export const SIDEBAR_WIDTH = 200;
export const HEADER_HEIGHT = 50;

// Time scale defaults
export const DEFAULT_PIXELS_PER_HOUR = 50;
export const MIN_PIXELS_PER_HOUR = 15;
export const MAX_PIXELS_PER_HOUR = 200;

// Virtualization
export const OVERSCAN_COUNT = 5;

// Time formatting
export const HOUR_FORMAT = "HH:mm";
export const DATE_FORMAT = "EEE dd MMM";
export const DATETIME_FORMAT = "HH:mm - EEE dd MMM";

// Colors
export const COLORS = {
	nowLine: "rgb(239, 68, 68)", // red-500
	nowLineGlow: "rgba(239, 68, 68, 0.3)",
	gridLine: "rgb(229, 231, 235)", // gray-200
	gridLineDark: "rgb(55, 65, 81)", // gray-700
	sidebarBg: "rgb(255, 255, 255)",
	sidebarBgDark: "rgb(17, 24, 39)", // gray-900
	headerBg: "rgb(249, 250, 251)", // gray-50
	headerBgDark: "rgb(31, 41, 55)", // gray-800
	statusAvailable: "rgb(34, 197, 94)", // green-500
	statusOnMission: "rgb(59, 130, 246)", // blue-500
	statusUnavailable: "rgb(156, 163, 175)", // gray-400
} as const;

// Driver status labels
export const STATUS_LABELS: Record<string, string> = {
	AVAILABLE: "Disponible",
	ON_MISSION: "En mission",
	UNAVAILABLE: "Indisponible",
} as const;

/**
 * Story 29.6: Zoom presets for multi-day views
 */
export const ZOOM_PRESETS = {
	day: { pixelsPerHour: 120, rangeDays: 1, label: "day" },
	"3days": { pixelsPerHour: 45, rangeDays: 3, label: "3days" },
	week: { pixelsPerHour: 18, rangeDays: 7, label: "week" },
} as const;
