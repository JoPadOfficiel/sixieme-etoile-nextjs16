"use client";

/**
 * useNowIndicator Hook
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Hook for tracking current time position on the Gantt timeline.
 * Updates every minute to keep the "now" line accurate.
 */

import { useState, useEffect, useCallback } from "react";
import { isWithinInterval, differenceInMinutes } from "date-fns";
import type { TimeScaleConfig } from "../types";

interface UseNowIndicatorOptions {
	config: TimeScaleConfig;
	updateIntervalMs?: number;
}

interface UseNowIndicatorReturn {
	nowPosition: number | null;
	isNowVisible: boolean;
	scrollToNow: () => number;
}

export function useNowIndicator({
	config,
	updateIntervalMs = 60000, // Update every minute
}: UseNowIndicatorOptions): UseNowIndicatorReturn {
	const [now, setNow] = useState(() => new Date());

	// Update current time periodically
	useEffect(() => {
		const interval = setInterval(() => {
			setNow(new Date());
		}, updateIntervalMs);

		return () => clearInterval(interval);
	}, [updateIntervalMs]);

	// Check if current time is within visible range
	const isNowVisible = isWithinInterval(now, {
		start: config.startTime,
		end: config.endTime,
	});

	// Calculate pixel position for "now" line
	const nowPosition = isNowVisible
		? (differenceInMinutes(now, config.startTime) / 60) * config.pixelsPerHour
		: null;

	// Function to get scroll position to center on "now"
	const scrollToNow = useCallback((): number => {
		const minutesFromStart = differenceInMinutes(new Date(), config.startTime);
		return (minutesFromStart / 60) * config.pixelsPerHour;
	}, [config]);

	return {
		nowPosition,
		isNowVisible,
		scrollToNow,
	};
}
