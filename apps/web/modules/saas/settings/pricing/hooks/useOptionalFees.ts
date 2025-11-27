/**
 * Optional Fees Hooks
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	ListOptionalFeesResponse,
	OptionalFeeStatsResponse,
	OptionalFee,
	CreateOptionalFeeRequest,
	UpdateOptionalFeeRequest,
	OptionalFeeFilters,
} from "../types/optional-fee";

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

export const optionalFeeKeys = {
	all: ["optionalFees"] as const,
	lists: () => [...optionalFeeKeys.all, "list"] as const,
	list: (filters: OptionalFeeFilters) =>
		[...optionalFeeKeys.lists(), filters] as const,
	stats: () => [...optionalFeeKeys.all, "stats"] as const,
	details: () => [...optionalFeeKeys.all, "detail"] as const,
	detail: (id: string) => [...optionalFeeKeys.details(), id] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch list of optional fees with optional filters
 */
export function useOptionalFees(filters: OptionalFeeFilters = {}) {
	const { type, status, search, page = 1, limit = 50 } = filters;

	return useQuery({
		queryKey: optionalFeeKeys.list(filters),
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
			return fetchApi<ListOptionalFeesResponse>(
				`/api/vtc/pricing/optional-fees?${params.toString()}`
			);
		},
	});
}

/**
 * Fetch optional fee statistics
 */
export function useOptionalFeeStats() {
	return useQuery({
		queryKey: optionalFeeKeys.stats(),
		queryFn: () =>
			fetchApi<OptionalFeeStatsResponse>(
				"/api/vtc/pricing/optional-fees/stats"
			),
	});
}

/**
 * Fetch a single optional fee by ID
 */
export function useOptionalFee(id: string | null) {
	return useQuery({
		queryKey: optionalFeeKeys.detail(id || ""),
		queryFn: () => {
			if (!id) throw new Error("ID required");
			return fetchApi<OptionalFee>(
				`/api/vtc/pricing/optional-fees/${id}`
			);
		},
		enabled: !!id,
	});
}

/**
 * Create a new optional fee
 */
export function useCreateOptionalFee() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreateOptionalFeeRequest) =>
			fetchApi<OptionalFee>("/api/vtc/pricing/optional-fees", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: optionalFeeKeys.lists() });
			queryClient.invalidateQueries({ queryKey: optionalFeeKeys.stats() });
		},
	});
}

/**
 * Update an existing optional fee
 */
export function useUpdateOptionalFee() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdateOptionalFeeRequest }) =>
			fetchApi<OptionalFee>(`/api/vtc/pricing/optional-fees/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: optionalFeeKeys.lists() });
			queryClient.invalidateQueries({ queryKey: optionalFeeKeys.stats() });
			queryClient.invalidateQueries({
				queryKey: optionalFeeKeys.detail(variables.id),
			});
		},
	});
}

/**
 * Delete an optional fee
 */
export function useDeleteOptionalFee() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			fetchApi<{ success: boolean }>(
				`/api/vtc/pricing/optional-fees/${id}`,
				{ method: "DELETE" }
			),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: optionalFeeKeys.lists() });
			queryClient.invalidateQueries({ queryKey: optionalFeeKeys.stats() });
		},
	});
}
