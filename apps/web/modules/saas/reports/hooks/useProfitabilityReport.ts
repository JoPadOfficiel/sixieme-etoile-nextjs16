"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { ProfitabilityReportResponse, ReportFilters } from "../types";

/**
 * useProfitabilityReport Hook
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 *
 * Fetches profitability report data with filters.
 */

interface UseProfitabilityReportOptions {
	filters: ReportFilters;
	enabled?: boolean;
}

export function useProfitabilityReport({
	filters,
	enabled = true,
}: UseProfitabilityReportOptions) {
	return useQuery({
		queryKey: ["profitability-report", filters],
		queryFn: async (): Promise<ProfitabilityReportResponse> => {
			const params: Record<string, string> = {
				groupBy: filters.groupBy,
				profitabilityLevel: filters.profitabilityLevel,
			};

			if (filters.dateFrom) params.dateFrom = filters.dateFrom;
			if (filters.dateTo) params.dateTo = filters.dateTo;
			if (filters.contactId) params.contactId = filters.contactId;
			if (filters.vehicleCategoryId) params.vehicleCategoryId = filters.vehicleCategoryId;

			const response = await apiClient.vtc.reports.profitability.$get({
				query: params,
			});

			if (!response.ok) {
				throw new Error("Failed to fetch profitability report");
			}

			return response.json() as Promise<ProfitabilityReportResponse>;
		},
		enabled,
		staleTime: 60000, // 1 minute
	});
}
