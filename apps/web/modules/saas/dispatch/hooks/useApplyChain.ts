"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ApplyChainRequest, ApplyChainResponse, RemoveChainResponse } from "../types";

/**
 * useApplyChain Hook
 *
 * Story 8.4: Detect & Suggest Trip Chaining Opportunities
 *
 * Mutation hook for applying or removing chains between missions.
 */

interface UseApplyChainOptions {
	onSuccess?: (data: ApplyChainResponse) => void;
	onError?: (error: Error) => void;
}

export function useApplyChain({ onSuccess, onError }: UseApplyChainOptions = {}) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			missionId,
			targetMissionId,
			chainOrder,
		}: ApplyChainRequest & { missionId: string }): Promise<ApplyChainResponse> => {
			const response = await fetch(`/api/vtc/missions/${missionId}/apply-chain`, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ targetMissionId, chainOrder }),
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Failed to apply chain" }));
				throw new Error((error as { message?: string }).message || "Failed to apply chain");
			}

			return response.json() as Promise<ApplyChainResponse>;
		},
		onSuccess: (data) => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: ["missions"] });
			queryClient.invalidateQueries({ queryKey: ["chaining-suggestions"] });
			
			// Invalidate specific mission queries
			for (const mission of data.updatedMissions) {
				queryClient.invalidateQueries({ queryKey: ["mission", mission.id] });
			}

			onSuccess?.(data);
		},
		onError: (error: Error) => {
			onError?.(error);
		},
	});
}

interface UseRemoveChainOptions {
	onSuccess?: (data: RemoveChainResponse) => void;
	onError?: (error: Error) => void;
}

export function useRemoveChain({ onSuccess, onError }: UseRemoveChainOptions = {}) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (missionId: string): Promise<RemoveChainResponse> => {
			const response = await fetch(`/api/vtc/missions/${missionId}/chain`, {
				method: "DELETE",
				credentials: "include",
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Failed to remove chain" }));
				throw new Error((error as { message?: string }).message || "Failed to remove chain");
			}

			return response.json() as Promise<RemoveChainResponse>;
		},
		onSuccess: (data) => {
			// Invalidate relevant queries
			queryClient.invalidateQueries({ queryKey: ["missions"] });
			queryClient.invalidateQueries({ queryKey: ["chaining-suggestions"] });
			
			// Invalidate specific mission queries
			for (const missionId of data.affectedMissions) {
				queryClient.invalidateQueries({ queryKey: ["mission", missionId] });
			}

			onSuccess?.(data);
		},
		onError: (error: Error) => {
			onError?.(error);
		},
	});
}
