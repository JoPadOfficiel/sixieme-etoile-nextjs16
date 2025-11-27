/**
 * Seasonal Multipliers Hooks
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	ListSeasonalMultipliersResponse,
	SeasonalMultiplierStatsResponse,
	SeasonalMultiplier,
	CreateSeasonalMultiplierRequest,
	UpdateSeasonalMultiplierRequest,
	SeasonalMultiplierFilters,
} from "../types/seasonal-multiplier";

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
		const error = await response.json().catch(() => ({ message: "Request failed" }));
		throw new Error(error.message || error.error || "Request failed");
	}

	return response.json();
}

// ============================================================================
// Query Keys
// ============================================================================

export const seasonalMultiplierKeys = {
	all: ["seasonalMultipliers"] as const,
	lists: () => [...seasonalMultiplierKeys.all, "list"] as const,
	list: (filters: SeasonalMultiplierFilters) =>
		[...seasonalMultiplierKeys.lists(), filters] as const,
	stats: () => [...seasonalMultiplierKeys.all, "stats"] as const,
	details: () => [...seasonalMultiplierKeys.all, "detail"] as const,
	detail: (id: string) => [...seasonalMultiplierKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch list of seasonal multipliers with optional filters
 */
export function useSeasonalMultipliers(filters: SeasonalMultiplierFilters = {}) {
	const { status, search, page = 1, limit = 50 } = filters;

	return useQuery({
		queryKey: seasonalMultiplierKeys.list(filters),
		queryFn: () => {
			const params = new URLSearchParams();
			params.set("page", page.toString());
			params.set("limit", limit.toString());
			if (status && status !== "all") {
				params.set("status", status);
			}
			if (search) {
				params.set("search", search);
			}
			return fetchApi<ListSeasonalMultipliersResponse>(
				`/api/vtc/pricing/seasonal-multipliers?${params.toString()}`
			);
		},
	});
}

/**
 * Fetch seasonal multiplier statistics
 */
export function useSeasonalMultiplierStats() {
	return useQuery({
		queryKey: seasonalMultiplierKeys.stats(),
		queryFn: () =>
			fetchApi<SeasonalMultiplierStatsResponse>(
				"/api/vtc/pricing/seasonal-multipliers/stats"
			),
	});
}

/**
 * Fetch a single seasonal multiplier by ID
 */
export function useSeasonalMultiplier(id: string | null) {
	return useQuery({
		queryKey: seasonalMultiplierKeys.detail(id || ""),
		queryFn: () => {
			if (!id) throw new Error("ID required");
			return fetchApi<SeasonalMultiplier>(
				`/api/vtc/pricing/seasonal-multipliers/${id}`
			);
		},
		enabled: !!id,
	});
}

/**
 * Create a new seasonal multiplier
 */
export function useCreateSeasonalMultiplier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateSeasonalMultiplierRequest) =>
			fetchApi<SeasonalMultiplier>("/api/vtc/pricing/seasonal-multipliers", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: seasonalMultiplierKeys.lists() });
			queryClient.invalidateQueries({ queryKey: seasonalMultiplierKeys.stats() });
		},
	});
}

/**
 * Update an existing seasonal multiplier
 */
export function useUpdateSeasonalMultiplier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateSeasonalMultiplierRequest }) =>
			fetchApi<SeasonalMultiplier>(`/api/vtc/pricing/seasonal-multipliers/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: seasonalMultiplierKeys.lists() });
			queryClient.invalidateQueries({ queryKey: seasonalMultiplierKeys.stats() });
			queryClient.invalidateQueries({
				queryKey: seasonalMultiplierKeys.detail(variables.id),
			});
		},
	});
}

/**
 * Delete a seasonal multiplier
 */
export function useDeleteSeasonalMultiplier() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			fetchApi<{ success: boolean }>(
				`/api/vtc/pricing/seasonal-multipliers/${id}`,
				{ method: "DELETE" }
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: seasonalMultiplierKeys.lists() });
			queryClient.invalidateQueries({ queryKey: seasonalMultiplierKeys.stats() });
		},
	});
}
