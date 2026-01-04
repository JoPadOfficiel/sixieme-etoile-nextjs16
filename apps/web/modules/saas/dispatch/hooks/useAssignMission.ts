"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { AssignMissionRequest, AssignMissionResponse } from "../types/assignment";

/**
 * useAssignMission Hook
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 *
 * Mutation hook to assign a vehicle/driver to a mission.
 */

interface UseAssignMissionOptions {
	onSuccess?: (data: AssignMissionResponse) => void;
	onError?: (error: Error) => void;
}

export function useAssignMission(options?: UseAssignMissionOptions) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			missionId,
			...data
		}: AssignMissionRequest & { missionId: string }): Promise<AssignMissionResponse> => {
			const response = await apiClient.vtc.missions[":id"].assign.$post({
				param: { id: missionId },
				json: data,
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Assignment failed" }));
				throw new Error((error as { message?: string }).message || "Assignment failed");
			}

			return response.json() as Promise<AssignMissionResponse>;
		},
		onSuccess: (data) => {
			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: ["missions"] });
			queryClient.invalidateQueries({ queryKey: ["mission"] });
			queryClient.invalidateQueries({ queryKey: ["mission", data.mission.id] });
			queryClient.invalidateQueries({ queryKey: ["assignment-candidates"] });
			queryClient.invalidateQueries({ queryKey: ["quote"] });
			queryClient.invalidateQueries({ queryKey: ["quote", data.mission.id] });

			options?.onSuccess?.(data);
		},
		onError: (error: Error) => {
			options?.onError?.(error);
		},
	});
}
