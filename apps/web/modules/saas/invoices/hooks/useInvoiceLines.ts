/**
 * Hook for managing invoice lines (add/delete)
 * Story 7.1: Invoice line management for DRAFT invoices
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import type { Invoice } from "../types";

interface AddLineData {
  description: string;
  quantity?: number;
  unitPriceExclVat: number;
  vatRate?: number;
  lineType?: "SERVICE" | "OPTIONAL_FEE" | "PROMOTION_ADJUSTMENT" | "OTHER";
}

export function useAddInvoiceLine(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AddLineData) => {
      const response = await apiClient.vtc.invoices[":id"].lines.$post({
        param: { id: invoiceId },
        json: {
          description: data.description,
          quantity: data.quantity ?? 1,
          unitPriceExclVat: data.unitPriceExclVat,
          vatRate: data.vatRate ?? 20,
          lineType: data.lineType ?? "OPTIONAL_FEE",
        },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to add line" }));
        throw new Error((error as { message?: string }).message || "Failed to add line");
      }

      return (await response.json()) as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

export function useDeleteInvoiceLine(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lineId: string) => {
      const response = await apiClient.vtc.invoices[":id"].lines[":lineId"].$delete({
        param: { id: invoiceId, lineId },
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to delete line" }));
        throw new Error((error as { message?: string }).message || "Failed to delete line");
      }

      return (await response.json()) as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}

/**
 * Story 28.9: Full editability - update any field of an invoice line
 */
interface UpdateLineData {
  lineId: string;
  description?: string;
  quantity?: number;
  unitPriceExclVat?: number;
  vatRate?: number;
}

export function useUpdateInvoiceLine(invoiceId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lineId, ...data }: UpdateLineData) => {
      const response = await apiClient.vtc.invoices[":id"].lines[":lineId"].$patch({
        param: { id: invoiceId, lineId },
        json: data,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: "Failed to update line" }));
        throw new Error((error as { message?: string }).message || "Failed to update line");
      }

      return (await response.json()) as Invoice;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });
}
