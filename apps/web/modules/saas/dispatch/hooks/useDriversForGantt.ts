"use client";

/**
 * useDriversForGantt Hook
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Fetches drivers and their assigned missions for the Gantt timeline display.
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { GanttDriver, DriverStatus } from "../components/gantt/types";
import type { DriversResponse } from "@saas/fleet/types";

interface UseDriversForGanttOptions {
	enabled?: boolean;
}

interface UseDriversForGanttReturn {
	drivers: GanttDriver[];
	isLoading: boolean;
	error: Error | null;
	refetch: () => void;
}

export function useDriversForGantt({
	enabled = true,
}: UseDriversForGanttOptions = {}): UseDriversForGanttReturn {
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["gantt-drivers"],
		queryFn: async (): Promise<GanttDriver[]> => {
			// Fetch active drivers
			const response = await apiClient.vtc.drivers.$get({
				query: {
					page: "1",
					limit: "100",
					isActive: "true",
				},
			});

			if (!response.ok) {
				throw new Error("Failed to fetch drivers");
			}

			const driversResponse = (await response.json()) as DriversResponse;

			// Transform drivers to Gantt format
			// For now, missions are empty - they will be populated in Story 27.4
			const ganttDrivers: GanttDriver[] = driversResponse.data.map((driver) => {
				// Determine status based on current missions (placeholder logic)
				const status: DriverStatus = driver.isActive ? "AVAILABLE" : "UNAVAILABLE";

				return {
					id: driver.id,
					name: `${driver.firstName} ${driver.lastName}`,
					avatar: undefined, // Avatar URL if available
					status,
					missions: [], // Will be populated in Story 27.4
				};
			});

			return ganttDrivers;
		},
		enabled,
		staleTime: 30000, // 30 seconds
		refetchInterval: 60000, // Refetch every minute
	});

	return {
		drivers: data ?? [],
		isLoading,
		error: error as Error | null,
		refetch,
	};
}
