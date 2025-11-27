"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getBaseUrl } from "@repo/utils";
import type {
	ListEmptyLegsParams,
	ListEmptyLegsResponse,
	EmptyLegDetail,
	CreateEmptyLegRequest,
	UpdateEmptyLegRequest,
	CreateEmptyLegFromMissionRequest,
	CreateEmptyLegFromMissionResponse,
	MatchEmptyLegsParams,
	MatchEmptyLegsResponse,
	EmptyLegListItem,
} from "../types/empty-leg";

/**
 * Empty-Leg Hooks
 *
 * Story 8.5: Model & Surface Empty-Leg Opportunities
 */

// Base URL for API calls
const API_BASE = `${getBaseUrl()}/api/vtc`;

// Helper for fetch with credentials
async function fetchApi<T>(
	url: string,
	options?: RequestInit,
): Promise<T> {
	const response = await fetch(`${API_BASE}${url}`, {
		...options,
		credentials: "include",
		headers: {
			"Content-Type": "application/json",
			...options?.headers,
		},
	});

	if (!response.ok) {
		const error = await response.json().catch(() => ({}));
		throw new Error(error.message || `API error: ${response.status}`);
	}

	return response.json();
}

// Query keys
export const emptyLegKeys = {
	all: ["empty-legs"] as const,
	lists: () => [...emptyLegKeys.all, "list"] as const,
	list: (params: ListEmptyLegsParams) =>
		[...emptyLegKeys.lists(), params] as const,
	details: () => [...emptyLegKeys.all, "detail"] as const,
	detail: (id: string) => [...emptyLegKeys.details(), id] as const,
	matches: () => [...emptyLegKeys.all, "match"] as const,
	match: (params: MatchEmptyLegsParams) =>
		[...emptyLegKeys.matches(), params] as const,
};

// ============================================================================
// List Empty Legs
// ============================================================================

export function useEmptyLegs(params: ListEmptyLegsParams = {}) {
	return useQuery({
		queryKey: emptyLegKeys.list(params),
		queryFn: async (): Promise<ListEmptyLegsResponse> => {
			const searchParams = new URLSearchParams();

			if (params.page) searchParams.set("page", String(params.page));
			if (params.limit) searchParams.set("limit", String(params.limit));
			if (params.vehicleId) searchParams.set("vehicleId", params.vehicleId);
			if (params.fromDate) searchParams.set("fromDate", params.fromDate);
			if (params.toDate) searchParams.set("toDate", params.toDate);
			if (params.includeExpired !== undefined)
				searchParams.set("includeExpired", String(params.includeExpired));

			const queryString = searchParams.toString();
			const url = `/empty-legs${queryString ? `?${queryString}` : ""}`;

			return fetchApi<ListEmptyLegsResponse>(url);
		},
		staleTime: 30 * 1000, // 30 seconds
	});
}

// ============================================================================
// Get Empty Leg Detail
// ============================================================================

export function useEmptyLegDetail(id: string | null) {
	return useQuery({
		queryKey: emptyLegKeys.detail(id ?? ""),
		queryFn: async (): Promise<EmptyLegDetail> => {
			if (!id) throw new Error("Empty leg ID is required");
			return fetchApi<EmptyLegDetail>(`/empty-legs/${id}`);
		},
		enabled: !!id,
	});
}

// ============================================================================
// Create Empty Leg
// ============================================================================

export function useCreateEmptyLeg() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (
			data: CreateEmptyLegRequest,
		): Promise<EmptyLegListItem> => {
			return fetchApi<EmptyLegListItem>("/empty-legs", {
				method: "POST",
				body: JSON.stringify(data),
			});
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: emptyLegKeys.lists() });
		},
	});
}

// ============================================================================
// Update Empty Leg
// ============================================================================

export function useUpdateEmptyLeg() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: UpdateEmptyLegRequest;
		}): Promise<EmptyLegListItem> => {
			return fetchApi<EmptyLegListItem>(`/empty-legs/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: emptyLegKeys.lists() });
			queryClient.invalidateQueries({
				queryKey: emptyLegKeys.detail(variables.id),
			});
		},
	});
}

// ============================================================================
// Delete Empty Leg
// ============================================================================

export function useDeleteEmptyLeg() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await fetchApi(`/empty-legs/${id}`, { method: "DELETE" });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: emptyLegKeys.lists() });
		},
	});
}

// ============================================================================
// Create Empty Leg from Mission
// ============================================================================

export function useCreateEmptyLegFromMission() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			missionId,
			data,
		}: {
			missionId: string;
			data?: CreateEmptyLegFromMissionRequest;
		}): Promise<CreateEmptyLegFromMissionResponse> => {
			return fetchApi<CreateEmptyLegFromMissionResponse>(
				`/missions/${missionId}/create-empty-leg`,
				{
					method: "POST",
					body: JSON.stringify(data ?? {}),
				},
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: emptyLegKeys.lists() });
		},
	});
}

// ============================================================================
// Match Empty Legs
// ============================================================================

export function useEmptyLegMatch(params: MatchEmptyLegsParams | null) {
	return useQuery({
		queryKey: emptyLegKeys.match(params ?? ({} as MatchEmptyLegsParams)),
		queryFn: async (): Promise<MatchEmptyLegsResponse> => {
			if (!params) throw new Error("Match params are required");

			const searchParams = new URLSearchParams({
				pickupLatitude: String(params.pickupLatitude),
				pickupLongitude: String(params.pickupLongitude),
				dropoffLatitude: String(params.dropoffLatitude),
				dropoffLongitude: String(params.dropoffLongitude),
				pickupAt: params.pickupAt,
			});

			if (params.maxDistanceKm) {
				searchParams.set("maxDistanceKm", String(params.maxDistanceKm));
			}

			return fetchApi<MatchEmptyLegsResponse>(
				`/empty-legs/match?${searchParams.toString()}`,
			);
		},
		enabled: !!params,
		staleTime: 60 * 1000, // 1 minute
	});
}
