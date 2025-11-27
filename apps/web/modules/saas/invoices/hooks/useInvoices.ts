/**
 * Hook for fetching invoices list
 * Story 7.1: Implement Invoice & InvoiceLine Models and Invoices UI
 */

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { InvoicesResponse, InvoicesFilters } from "../types";

interface UseInvoicesOptions {
  page?: number;
  limit?: number;
  filters?: InvoicesFilters;
  enabled?: boolean;
}

export function useInvoices({
  page = 1,
  limit = 20,
  filters = {},
  enabled = true,
}: UseInvoicesOptions = {}) {
  return useQuery({
    queryKey: ["invoices", { page, limit, ...filters }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filters.search) {
        params.set("search", filters.search);
      }
      if (filters.status) {
        params.set("status", filters.status);
      }
      if (filters.contactId) {
        params.set("contactId", filters.contactId);
      }
      if (filters.dateFrom) {
        params.set("dateFrom", filters.dateFrom);
      }
      if (filters.dateTo) {
        params.set("dateTo", filters.dateTo);
      }

      const response = await apiClient.vtc.invoices.$get({
        query: Object.fromEntries(params),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const data = await response.json();
      return data as unknown as InvoicesResponse;
    },
    enabled,
  });
}

export default useInvoices;
