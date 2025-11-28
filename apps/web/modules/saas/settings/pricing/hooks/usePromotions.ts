/**
 * Promotions Hooks
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
	ListPromotionsResponse,
	PromotionStatsResponse,
	Promotion,
	CreatePromotionRequest,
	UpdatePromotionRequest,
	PromotionFilters,
	ValidatePromoCodeResponse,
} from "../types/promotion";

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

export const promotionKeys = {
	all: ["promotions"] as const,
	lists: () => [...promotionKeys.all, "list"] as const,
	list: (filters: PromotionFilters) =>
		[...promotionKeys.lists(), filters] as const,
	stats: () => [...promotionKeys.all, "stats"] as const,
	details: () => [...promotionKeys.all, "detail"] as const,
	detail: (id: string) => [...promotionKeys.details(), id] as const,
	validate: (code: string) => [...promotionKeys.all, "validate", code] as const,
};

// ============================================================================
// Hooks
// ============================================================================

/**
 * Fetch list of promotions with optional filters
 */
export function usePromotions(filters: PromotionFilters = {}) {
	const { type, status, search, page = 1, limit = 50 } = filters;

	return useQuery({
		queryKey: promotionKeys.list(filters),
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
			return fetchApi<ListPromotionsResponse>(
				`/api/vtc/pricing/promotions?${params.toString()}`
			);
		},
	});
}

/**
 * Fetch promotion statistics
 */
export function usePromotionStats() {
	return useQuery({
		queryKey: promotionKeys.stats(),
		queryFn: () =>
			fetchApi<PromotionStatsResponse>("/api/vtc/pricing/promotions/stats"),
	});
}

/**
 * Fetch a single promotion by ID
 */
export function usePromotion(id: string | null) {
	return useQuery({
		queryKey: promotionKeys.detail(id || ""),
		queryFn: () => {
			if (!id) throw new Error("ID required");
			return fetchApi<Promotion>(`/api/vtc/pricing/promotions/${id}`);
		},
		enabled: !!id,
	});
}

/**
 * Validate a promo code
 */
export function useValidatePromoCode(code: string | null) {
	return useQuery({
		queryKey: promotionKeys.validate(code || ""),
		queryFn: () => {
			if (!code) throw new Error("Code required");
			return fetchApi<ValidatePromoCodeResponse>(
				`/api/vtc/pricing/promotions/validate/${encodeURIComponent(code)}`
			);
		},
		enabled: !!code,
	});
}

/**
 * Create a new promotion
 */
export function useCreatePromotion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: CreatePromotionRequest) =>
			fetchApi<Promotion>("/api/vtc/pricing/promotions", {
				method: "POST",
				body: JSON.stringify(data),
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
			queryClient.invalidateQueries({ queryKey: promotionKeys.stats() });
		},
	});
}

/**
 * Update an existing promotion
 */
export function useUpdatePromotion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ id, data }: { id: string; data: UpdatePromotionRequest }) =>
			fetchApi<Promotion>(`/api/vtc/pricing/promotions/${id}`, {
				method: "PATCH",
				body: JSON.stringify(data),
			}),
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
			queryClient.invalidateQueries({ queryKey: promotionKeys.stats() });
			queryClient.invalidateQueries({
				queryKey: promotionKeys.detail(variables.id),
			});
		},
	});
}

/**
 * Delete a promotion
 */
export function useDeletePromotion() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (id: string) =>
			fetchApi<{ success: boolean }>(`/api/vtc/pricing/promotions/${id}`, {
				method: "DELETE",
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: promotionKeys.lists() });
			queryClient.invalidateQueries({ queryKey: promotionKeys.stats() });
		},
	});
}
