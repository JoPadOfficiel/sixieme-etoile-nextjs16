/**
 * Hook for fetching a single invoice with full details
 * Story 7.1: Implement Invoice & InvoiceLine Models and Invoices UI
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { Invoice, InvoiceStatus } from "../types";

interface UseInvoiceDetailOptions {
  invoiceId: string;
  enabled?: boolean;
}

export function useInvoiceDetail({ invoiceId, enabled = true }: UseInvoiceDetailOptions) {
  return useQuery({
    queryKey: ["invoice", invoiceId],
    queryFn: async () => {
      const response = await apiClient.vtc.invoices[":id"].$get({
        param: { id: invoiceId },
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Invoice not found");
        }
        throw new Error("Failed to fetch invoice");
      }

      return (await response.json()) as Invoice;
    },
    enabled: enabled && !!invoiceId,
  });
}

interface UpdateInvoiceData {
  status?: InvoiceStatus;
  dueDate?: string;
  notes?: string | null;
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ invoiceId, data }: { invoiceId: string; data: UpdateInvoiceData }) => {
      const response = await apiClient.vtc.invoices[":id"].$patch({
        param: { id: invoiceId },
        json: data,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update invoice" }));
        throw new Error((error as { message?: string }).message || "Failed to update invoice");
      }

      return (await response.json()) as Invoice;
    },
    onSuccess: (data) => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ["invoice", data.id] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (invoiceId: string) => {
      const response = await apiClient.vtc.invoices[":id"].$delete({
        param: { id: invoiceId },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete invoice" }));
        throw new Error((error as { message?: string }).message || "Failed to delete invoice");
      }

      return { success: true };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export default useInvoiceDetail;
