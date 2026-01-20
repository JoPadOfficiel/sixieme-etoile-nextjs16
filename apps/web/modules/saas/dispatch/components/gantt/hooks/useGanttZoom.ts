"use client";

/**
 * useGanttZoom Hook
 *
 * Story 27.12: Gantt Time & Zoom Controls
 *
 * Hook for managing zoom level (pixelsPerHour) state with bounds checking.
 * Provides functions to zoom in, zoom out, and set specific zoom levels.
 */

import { useCallback, useMemo, useState } from "react";
import {
	DEFAULT_PIXELS_PER_HOUR,
	MAX_PIXELS_PER_HOUR,
	MIN_PIXELS_PER_HOUR,
} from "../constants";

/** Zoom step increment/decrement in pixels per hour */
export const ZOOM_STEP = 25;

/** Predefined zoom presets for quick selection */
export const ZOOM_PRESETS = {
	HOUR: 150, // Detailed hourly view
	DAY: 50, // Standard day view (default)
	WEEK: 20, // Compressed week view
} as const;

export type ZoomPreset = keyof typeof ZOOM_PRESETS;

interface UseGanttZoomOptions {
	/** Initial zoom level (pixels per hour). Defaults to DEFAULT_PIXELS_PER_HOUR (50) */
	initialZoom?: number;
	/** Custom zoom step. Defaults to ZOOM_STEP (25) */
	step?: number;
}

interface UseGanttZoomReturn {
	/** Current pixels per hour value */
	pixelsPerHour: number;
	/** Whether zoom in is possible (not at max) */
	canZoomIn: boolean;
	/** Whether zoom out is possible (not at min) */
	canZoomOut: boolean;
	/** Increase zoom level by one step */
	zoomIn: () => void;
	/** Decrease zoom level by one step */
	zoomOut: () => void;
	/** Set zoom to a specific value (clamped to bounds) */
	setZoomLevel: (level: number) => void;
	/** Set zoom to a predefined preset */
	setZoomPreset: (preset: ZoomPreset) => void;
	/** Get the current zoom level as a percentage (0-100) */
	zoomPercent: number;
	/** Get a human-readable label for the current zoom level */
	zoomLabel: string;
}

/**
 * Clamp a value between min and max bounds
 */
function clamp(value: number, min: number, max: number): number {
	return Math.max(min, Math.min(max, value));
}

/**
 * Get a human-readable label for the zoom level
 */
function getZoomLabel(pixelsPerHour: number): string {
	if (pixelsPerHour >= 120) return "hour"; // Detailed hourly view
	if (pixelsPerHour >= 40) return "day"; // Standard day view
	return "week"; // Compressed week view
}

export function useGanttZoom(
	options: UseGanttZoomOptions = {},
): UseGanttZoomReturn {
	const { initialZoom = DEFAULT_PIXELS_PER_HOUR, step = ZOOM_STEP } = options;

	const [pixelsPerHour, setPixelsPerHour] = useState<number>(() =>
		clamp(initialZoom, MIN_PIXELS_PER_HOUR, MAX_PIXELS_PER_HOUR),
	);

	const canZoomIn = pixelsPerHour < MAX_PIXELS_PER_HOUR;
	const canZoomOut = pixelsPerHour > MIN_PIXELS_PER_HOUR;

	const zoomIn = useCallback(() => {
		setPixelsPerHour((current) =>
			clamp(current + step, MIN_PIXELS_PER_HOUR, MAX_PIXELS_PER_HOUR),
		);
	}, [step]);

	const zoomOut = useCallback(() => {
		setPixelsPerHour((current) =>
			clamp(current - step, MIN_PIXELS_PER_HOUR, MAX_PIXELS_PER_HOUR),
		);
	}, [step]);

	const setZoomLevel = useCallback((level: number) => {
		setPixelsPerHour(clamp(level, MIN_PIXELS_PER_HOUR, MAX_PIXELS_PER_HOUR));
	}, []);

	const setZoomPreset = useCallback((preset: ZoomPreset) => {
		setPixelsPerHour(ZOOM_PRESETS[preset]);
	}, []);

	const zoomPercent = useMemo(() => {
		const range = MAX_PIXELS_PER_HOUR - MIN_PIXELS_PER_HOUR;
		return Math.round(((pixelsPerHour - MIN_PIXELS_PER_HOUR) / range) * 100);
	}, [pixelsPerHour]);

	const zoomLabel = useMemo(() => getZoomLabel(pixelsPerHour), [pixelsPerHour]);

	return {
		pixelsPerHour,
		canZoomIn,
		canZoomOut,
		zoomIn,
		zoomOut,
		setZoomLevel,
		setZoomPreset,
		zoomPercent,
		zoomLabel,
	};
}
