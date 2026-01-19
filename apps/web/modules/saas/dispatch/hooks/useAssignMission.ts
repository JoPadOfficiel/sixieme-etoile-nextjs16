"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { MissionsListResponse } from "../types";
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
		onMutate: async (newAssignment) => {
			// Cancel any outgoing refetches (so they don't overwrite our optimistic update)
			await queryClient.cancelQueries({ queryKey: ["missions"] });

			// Snapshot the previous value
			const previousMissions = queryClient.getQueryData(["missions"]);

			// Optimistically update to the new value
			queryClient.setQueryData<MissionsListResponse>(["missions"], (old) => {
				if (!old) return old;

				// Safe approach: If it's a paginated list, we filter it out from items
				if (old.data && Array.isArray(old.data)) {
					return {
						...old,
						data: old.data.filter((m) => m.id !== newAssignment.missionId),
					};
				}
				return old;
			});

			// Return a context object with the snapshotted value
			return { previousMissions };
		},
		onError: (err, newAssignment, context) => {
			// If the mutation fails, use the context returned from onMutate to roll back
			if (context?.previousMissions) {
				queryClient.setQueryData(["missions"], context.previousMissions);
			}
			options?.onError?.(err);
		},
		onSettled: (data) => {
			// Always refetch after error or success:
			queryClient.invalidateQueries({ queryKey: ["missions"] });
			queryClient.invalidateQueries({ queryKey: ["mission"] });
			if (data) {
				queryClient.invalidateQueries({ queryKey: ["mission", data.mission.id] });
				queryClient.invalidateQueries({ queryKey: ["quote", data.mission.id] });
			}
			queryClient.invalidateQueries({ queryKey: ["assignment-candidates"] });
			queryClient.invalidateQueries({ queryKey: ["quote"] });
		},
		onSuccess: (data) => {
			options?.onSuccess?.(data);
		},
	});
}
