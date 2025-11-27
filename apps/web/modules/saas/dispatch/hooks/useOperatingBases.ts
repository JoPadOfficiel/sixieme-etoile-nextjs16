"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";

/**
 * useOperatingBases Hook
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Fetches operating bases for map markers in the Dispatch screen.
 */

export interface OperatingBase {
	id: string;
	name: string;
	addressLine1: string;
	city: string;
	latitude: number;
	longitude: number;
	isActive: boolean;
}


export function useOperatingBases(enabled = true) {
	return useQuery({
		queryKey: ["operating-bases"],
		queryFn: async (): Promise<OperatingBase[]> => {
			const response = await apiClient.vtc.bases.$get({
				query: { limit: "100" }, // Get all bases for map
			});

			if (!response.ok) {
				throw new Error("Failed to fetch operating bases");
			}

			const result = (await response.json()) as unknown as {
				data: Array<{
					id: string;
					name: string;
					addressLine1: string;
					city: string;
					latitude: string;
					longitude: string;
					isActive: boolean;
				}>;
			};
			return result.data.map((base) => ({
				id: base.id,
				name: base.name,
				addressLine1: base.addressLine1,
				city: base.city,
				latitude: Number(base.latitude),
				longitude: Number(base.longitude),
				isActive: base.isActive,
			}));
		},
		enabled,
		staleTime: 300000, // 5 minutes - bases don't change often
	});
}
