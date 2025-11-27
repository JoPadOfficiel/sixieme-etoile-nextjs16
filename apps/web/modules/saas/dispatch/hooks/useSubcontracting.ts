/**
 * Subcontracting Hooks
 * Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	ListSubcontractorsResponse,
	SubcontractingSuggestionsResult,
	SubcontractMissionRequest,
	SubcontractMissionResponse,
} from "../types/subcontractor";

// ============================================================================
// API Helper
// ============================================================================

async function fetchApi<T>(url: string, options?: RequestInit): Promise<T> {
	const response = await fetch(url, {
		...options,
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
		credentials: "include",
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({ error: "Request failed" }));
		throw new Error(error.error || "Request failed");
	}

	return response.json();
}

// ============================================================================
// Query Keys
// ============================================================================

export const subcontractingKeys = {
	all: ["subcontracting"] as const,
	subcontractors: () => [...subcontractingKeys.all, "subcontractors"] as const,
	subcontractorsList: (includeInactive?: boolean) =>
		[...subcontractingKeys.subcontractors(), { includeInactive }] as const,
	subcontractor: (id: string) => [...subcontractingKeys.subcontractors(), id] as const,
	suggestions: (missionId: string) =>
		[...subcontractingKeys.all, "suggestions", missionId] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch list of subcontractors
 */
export function useSubcontractors(options?: { includeInactive?: boolean }) {
	return useQuery({
		queryKey: subcontractingKeys.subcontractorsList(options?.includeInactive),
		queryFn: () => {
			const params = new URLSearchParams();
			if (options?.includeInactive) {
				params.set("includeInactive", "true");
			}
			const queryString = params.toString();
			return fetchApi<ListSubcontractorsResponse>(
				`/api/vtc/subcontractors${queryString ? `?${queryString}` : ""}`
			);
		},
	});
}

/**
 * Fetch subcontracting suggestions for a mission
 */
export function useSubcontractingSuggestions(options: {
	missionId: string | null;
	threshold?: number;
	maxSuggestions?: number;
	enabled?: boolean;
}) {
	const { missionId, threshold, maxSuggestions, enabled = true } = options;

	return useQuery({
		queryKey: subcontractingKeys.suggestions(missionId || ""),
		queryFn: () => {
			if (!missionId) throw new Error("Mission ID required");

			const params = new URLSearchParams();
			if (threshold !== undefined) {
				params.set("threshold", threshold.toString());
			}
			if (maxSuggestions !== undefined) {
				params.set("maxSuggestions", maxSuggestions.toString());
			}
			const queryString = params.toString();

			return fetchApi<SubcontractingSuggestionsResult>(
				`/api/vtc/missions/${missionId}/subcontracting-suggestions${queryString ? `?${queryString}` : ""}`
			);
		},
		enabled: enabled && !!missionId,
	});
}

/**
 * Subcontract a mission
 */
export function useSubcontractMission() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			missionId,
			data,
		}: {
			missionId: string;
			data: SubcontractMissionRequest;
		}) => {
			return fetchApi<SubcontractMissionResponse>(
				`/api/vtc/missions/${missionId}/subcontract`,
				{
					method: "POST",
					body: JSON.stringify(data),
				}
			);
		},
		onSuccess: (_, variables) => {
			// Invalidate mission queries
			queryClient.invalidateQueries({ queryKey: ["missions"] });
			queryClient.invalidateQueries({
				queryKey: subcontractingKeys.suggestions(variables.missionId),
			});
		},
	});
}

/**
 * Create a subcontractor
 */
export function useCreateSubcontractor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: {
			contactId: string;
			operatingZoneIds?: string[];
			vehicleCategoryIds?: string[];
			ratePerKm?: number;
			ratePerHour?: number;
			minimumFare?: number;
			notes?: string;
		}) => {
			return fetchApi<{ subcontractor: unknown }>("/api/vtc/subcontractors", {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: subcontractingKeys.subcontractors() });
		},
	});
}

/**
 * Update a subcontractor
 */
export function useUpdateSubcontractor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			subcontractorId,
			data,
		}: {
			subcontractorId: string;
			data: {
				operatingZoneIds?: string[];
				vehicleCategoryIds?: string[];
				ratePerKm?: number | null;
				ratePerHour?: number | null;
				minimumFare?: number | null;
				notes?: string | null;
				isActive?: boolean;
			};
		}) => {
			return fetchApi<{ subcontractor: unknown }>(
				`/api/vtc/subcontractors/${subcontractorId}`,
				{
					method: "PATCH",
					body: JSON.stringify(data),
				}
			);
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: subcontractingKeys.subcontractors() });
			queryClient.invalidateQueries({
				queryKey: subcontractingKeys.subcontractor(variables.subcontractorId),
			});
		},
	});
}

/**
 * Delete a subcontractor
 */
export function useDeleteSubcontractor() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (subcontractorId: string) => {
			return fetchApi<{ success: boolean }>(
				`/api/vtc/subcontractors/${subcontractorId}`,
				{
					method: "DELETE",
				}
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: subcontractingKeys.subcontractors() });
		},
	});
}
