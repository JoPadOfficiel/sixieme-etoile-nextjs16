"use client";

/**
 * useGanttTimeScale Hook
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Hook for calculating time scale configuration and time-to-pixel conversions.
 */

import { useMemo } from "react";
import { differenceInHours, differenceInMinutes } from "date-fns";
import type { TimeScaleConfig } from "../types";
import { DEFAULT_PIXELS_PER_HOUR } from "../constants";

interface UseGanttTimeScaleOptions {
	startTime: Date;
	endTime: Date;
	pixelsPerHour?: number;
}

interface UseGanttTimeScaleReturn {
	config: TimeScaleConfig;
	timeToPixels: (time: Date) => number;
	pixelsToTime: (pixels: number) => Date;
	getHourLabels: () => { hour: number; label: string; x: number }[];
}

export function useGanttTimeScale({
	startTime,
	endTime,
	pixelsPerHour = DEFAULT_PIXELS_PER_HOUR,
}: UseGanttTimeScaleOptions): UseGanttTimeScaleReturn {
	const config = useMemo<TimeScaleConfig>(() => {
		const totalHours = differenceInHours(endTime, startTime);
		const totalWidth = totalHours * pixelsPerHour;

		return {
			pixelsPerHour,
			totalHours,
			totalWidth,
			startTime,
			endTime,
		};
	}, [startTime, endTime, pixelsPerHour]);

	const timeToPixels = useMemo(() => {
		return (time: Date): number => {
			const minutesFromStart = differenceInMinutes(time, config.startTime);
			return (minutesFromStart / 60) * config.pixelsPerHour;
		};
	}, [config]);

	const pixelsToTime = useMemo(() => {
		return (pixels: number): Date => {
			const minutesFromStart = (pixels / config.pixelsPerHour) * 60;
			return new Date(config.startTime.getTime() + minutesFromStart * 60 * 1000);
		};
	}, [config]);

	const getHourLabels = useMemo(() => {
		return () => {
			const labels: { hour: number; label: string; x: number }[] = [];
			const startHour = config.startTime.getHours();

			for (let i = 0; i <= config.totalHours; i++) {
				const hour = (startHour + i) % 24;
				const label = `${hour.toString().padStart(2, "0")}:00`;
				const x = i * config.pixelsPerHour;
				labels.push({ hour, label, x });
			}

			return labels;
		};
	}, [config]);

	return {
		config,
		timeToPixels,
		pixelsToTime,
		getHourLabels,
	};
}
