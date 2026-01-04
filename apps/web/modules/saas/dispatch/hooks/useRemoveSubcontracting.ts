"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";

/**
 * useRemoveSubcontracting Hook
 *
 * Hook to remove subcontracting from a mission, allowing normal assignment again.
 */

interface UseRemoveSubcontractingOptions {
	onSuccess?: () => void;
	onError?: (error: Error) => void;
}

export function useRemoveSubcontracting(options?: UseRemoveSubcontractingOptions) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (missionId: string) => {
			const response = await apiClient.vtc.missions[":id"].subcontract.$delete({
				param: { id: missionId },
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Failed to remove subcontracting" }));
				throw new Error((error as { message?: string }).message || "Failed to remove subcontracting");
			}

			return response.json();
		},
		onSuccess: () => {
			// Invalidate related queries
			queryClient.invalidateQueries({ queryKey: ["missions"] });
			queryClient.invalidateQueries({ queryKey: ["mission"] });

			options?.onSuccess?.();
		},
		onError: (error: Error) => {
			options?.onError?.(error);
		},
	});
}
