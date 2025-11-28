"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { MissionComplianceDetails } from "../types";

/**
 * useMissionCompliance Hook
 *
 * Story 5.6: Surface Compliance Statuses & Logs in UI
 *
 * Fetches detailed compliance information for a mission including
 * validation results and audit logs.
 */

interface UseMissionComplianceOptions {
	missionId: string | null;
	enabled?: boolean;
}

export function useMissionCompliance({
	missionId,
	enabled = true,
}: UseMissionComplianceOptions) {
	return useQuery({
		queryKey: ["mission-compliance", missionId],
		queryFn: async (): Promise<MissionComplianceDetails> => {
			if (!missionId) {
				throw new Error("Mission ID is required");
			}

			const response = await apiClient.vtc.missions[":id"].compliance.$get({
				param: { id: missionId },
			});

			if (!response.ok) {
				throw new Error("Failed to fetch mission compliance details");
			}

			return response.json() as Promise<MissionComplianceDetails>;
		},
		enabled: enabled && !!missionId,
		staleTime: 60000, // 1 minute - compliance data doesn't change frequently
		refetchOnWindowFocus: false,
	});
}
