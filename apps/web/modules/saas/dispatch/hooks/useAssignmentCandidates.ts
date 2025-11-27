"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { AssignmentCandidatesResponse } from "../types/assignment";

/**
 * useAssignmentCandidates Hook
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 *
 * Fetches candidate vehicles/drivers with flexibility scores for a mission.
 */

interface UseAssignmentCandidatesOptions {
	missionId: string | null;
	enabled?: boolean;
}

export function useAssignmentCandidates({
	missionId,
	enabled = true,
}: UseAssignmentCandidatesOptions) {
	return useQuery({
		queryKey: ["assignment-candidates", missionId],
		queryFn: async (): Promise<AssignmentCandidatesResponse> => {
			if (!missionId) throw new Error("Mission ID required");

			const response = await apiClient.vtc.missions[":id"].candidates.$get({
				param: { id: missionId },
			});

			if (!response.ok) {
				throw new Error("Failed to fetch assignment candidates");
			}

			return response.json() as Promise<AssignmentCandidatesResponse>;
		},
		enabled: enabled && !!missionId,
		staleTime: 60000, // 1 minute
	});
}
