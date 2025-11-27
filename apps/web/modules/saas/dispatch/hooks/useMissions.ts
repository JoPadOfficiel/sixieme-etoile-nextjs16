"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { MissionsFilters, MissionsListResponse, MissionDetail } from "../types";

/**
 * useMissions Hook
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Fetches missions (accepted quotes with future pickup dates) for the Dispatch screen.
 */

interface UseMissionsOptions {
	filters?: MissionsFilters;
	page?: number;
	limit?: number;
	enabled?: boolean;
}

export function useMissions({
	filters = {},
	page = 1,
	limit = 20,
	enabled = true,
}: UseMissionsOptions = {}) {
	return useQuery({
		queryKey: ["missions", filters, page, limit],
		queryFn: async (): Promise<MissionsListResponse> => {
			const params = new URLSearchParams();
			params.set("page", String(page));
			params.set("limit", String(limit));

			if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
			if (filters.dateTo) params.set("dateTo", filters.dateTo);
			if (filters.vehicleCategoryId) params.set("vehicleCategoryId", filters.vehicleCategoryId);
			if (filters.clientType) params.set("clientType", filters.clientType);
			if (filters.search) params.set("search", filters.search);

			const response = await apiClient.vtc.missions.$get({
				query: Object.fromEntries(params),
			});

			if (!response.ok) {
				throw new Error("Failed to fetch missions");
			}

			return response.json() as Promise<MissionsListResponse>;
		},
		enabled,
		staleTime: 30000, // 30 seconds
		refetchInterval: 60000, // Refetch every minute for dispatch updates
	});
}

interface UseMissionDetailOptions {
	missionId: string | null;
	enabled?: boolean;
}

export function useMissionDetail({
	missionId,
	enabled = true,
}: UseMissionDetailOptions) {
	return useQuery({
		queryKey: ["mission", missionId],
		queryFn: async (): Promise<MissionDetail> => {
			if (!missionId) throw new Error("Mission ID required");

			const response = await apiClient.vtc.missions[":id"].$get({
				param: { id: missionId },
			});

			if (!response.ok) {
				throw new Error("Failed to fetch mission detail");
			}

			return response.json() as Promise<MissionDetail>;
		},
		enabled: enabled && !!missionId,
		staleTime: 30000,
	});
}
