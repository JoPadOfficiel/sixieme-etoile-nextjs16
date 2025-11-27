"use client";

import { useQuery } from "@tanstack/react-query";
import type { ChainingSuggestionsResponse } from "../types";

/**
 * useChainingSuggestions Hook
 *
 * Story 8.4: Detect & Suggest Trip Chaining Opportunities
 *
 * Fetches chaining suggestions for a mission from the API.
 */

interface UseChainingSuggestionsOptions {
	missionId: string | null;
	enabled?: boolean;
}

export function useChainingSuggestions({
	missionId,
	enabled = true,
}: UseChainingSuggestionsOptions) {
	return useQuery({
		queryKey: ["chaining-suggestions", missionId],
		queryFn: async (): Promise<ChainingSuggestionsResponse> => {
			if (!missionId) throw new Error("Mission ID required");

			const response = await fetch(`/api/vtc/missions/${missionId}/chaining-suggestions`, {
				method: "GET",
				credentials: "include",
			});

			if (!response.ok) {
				throw new Error("Failed to fetch chaining suggestions");
			}

			return response.json() as Promise<ChainingSuggestionsResponse>;
		},
		enabled: enabled && !!missionId,
		staleTime: 60000, // 1 minute - suggestions don't change frequently
		refetchOnWindowFocus: false,
	});
}
