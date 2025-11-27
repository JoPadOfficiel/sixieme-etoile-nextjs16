/**
 * Advanced Rate Modifiers Hooks
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 *
 * React Query hooks for advanced rate modifier operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	AdvancedRate,
	AdvancedRateFilters,
	AdvancedRateStats,
	CreateAdvancedRateRequest,
	ListAdvancedRatesResponse,
	UpdateAdvancedRateRequest,
} from "../types/advanced-rate";

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
		const error = await response
			.json()
			.catch(() => ({ message: "Request failed" }));
		throw new Error(error.message || error.error || "Request failed");
	}

	return response.json();
}

// ============================================================================
// Query Keys
// ============================================================================

export const advancedRatesKeys = {
	all: ["advancedRates"] as const,
	lists: () => [...advancedRatesKeys.all, "list"] as const,
	list: (filters: AdvancedRateFilters) =>
		[...advancedRatesKeys.lists(), filters] as const,
	stats: () => [...advancedRatesKeys.all, "stats"] as const,
	details: () => [...advancedRatesKeys.all, "detail"] as const,
	detail: (id: string) => [...advancedRatesKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch list of advanced rate modifiers with optional filters
 */
export function useAdvancedRates(filters: AdvancedRateFilters = {}) {
	const { type, status, search, page = 1, limit = 50 } = filters;

	return useQuery({
		queryKey: advancedRatesKeys.list(filters),
		queryFn: () => {
			const params = new URLSearchParams();
			params.set("page", page.toString());
			params.set("limit", limit.toString());
			if (type && type !== "all") {
				params.set("type", type);
			}
			if (status && status !== "all") {
				params.set("status", status);
			}
			if (search) {
				params.set("search", search);
			}
			return fetchApi<ListAdvancedRatesResponse>(
				`/api/vtc/pricing/advanced-rates?${params.toString()}`
			);
		},
	});
}

/**
 * Fetch advanced rate statistics
 */
export function useAdvancedRateStats() {
	return useQuery({
		queryKey: advancedRatesKeys.stats(),
		queryFn: () =>
			fetchApi<AdvancedRateStats>("/api/vtc/pricing/advanced-rates/stats"),
	});
}

/**
 * Fetch a single advanced rate modifier by ID
 */
export function useAdvancedRate(id: string | null) {
	return useQuery({
		queryKey: advancedRatesKeys.detail(id || ""),
		queryFn: () => {
			if (!id) throw new Error("ID required");
			return fetchApi<AdvancedRate>(`/api/vtc/pricing/advanced-rates/${id}`);
		},
		enabled: !!id,
	});
}

/**
 * Create a new advanced rate modifier
 */
export function useCreateAdvancedRate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateAdvancedRateRequest) =>
			fetchApi<AdvancedRate>("/api/vtc/pricing/advanced-rates", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: advancedRatesKeys.lists() });
			queryClient.invalidateQueries({ queryKey: advancedRatesKeys.stats() });
		},
	});
}

/**
 * Update an existing advanced rate modifier
 */
export function useUpdateAdvancedRate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			id,
			data,
		}: {
			id: string;
			data: UpdateAdvancedRateRequest;
		}) =>
			fetchApi<AdvancedRate>(`/api/vtc/pricing/advanced-rates/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: advancedRatesKeys.lists() });
			queryClient.invalidateQueries({ queryKey: advancedRatesKeys.stats() });
			queryClient.invalidateQueries({
				queryKey: advancedRatesKeys.detail(variables.id),
			});
		},
	});
}

/**
 * Delete an advanced rate modifier
 */
export function useDeleteAdvancedRate() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			fetchApi<{ success: boolean }>(`/api/vtc/pricing/advanced-rates/${id}`, {
				method: "DELETE",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: advancedRatesKeys.lists() });
			queryClient.invalidateQueries({ queryKey: advancedRatesKeys.stats() });
		},
	});
}
