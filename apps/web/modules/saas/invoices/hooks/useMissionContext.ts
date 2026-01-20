/**
 * Hook for fetching mission context for placeholder replacement
 * Story 28.10: Execution Feedback Loop (Placeholders)
 *
 * Retrieves mission data linked to an invoice through the Order relation:
 * Invoice → Order → Mission(s)
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { MissionContext } from "../utils/placeholders";

export interface MissionContextResponse {
  hasMission: boolean;
  context: MissionContext | null;
  missionCount: number;
}

interface UseMissionContextOptions {
  invoiceId: string;
  enabled?: boolean;
}

/**
 * Fetch mission context for an invoice
 *
 * The context is derived from missions linked to the invoice's order.
 * If multiple missions exist, the first one is used (or aggregated).
 */
export function useMissionContext({
  invoiceId,
  enabled = true,
}: UseMissionContextOptions) {
  return useQuery({
    queryKey: ["invoice-mission-context", invoiceId],
    queryFn: async (): Promise<MissionContextResponse> => {
      const response = await apiClient.vtc.invoices[":id"]["mission-context"].$get({
        param: { id: invoiceId },
      });

      if (!response.ok) {
        // If endpoint doesn't exist or fails, return empty context
        return {
          hasMission: false,
          context: null,
          missionCount: 0,
        };
      }

      return (await response.json()) as MissionContextResponse;
    },
    enabled: enabled && !!invoiceId,
    staleTime: 30000, // 30 seconds
  });
}

export default useMissionContext;
