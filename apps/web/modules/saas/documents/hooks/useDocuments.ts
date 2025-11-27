/**
 * Documents Hooks
 * Story 7.5: Document Generation & Storage
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import type { DocumentFilters } from "../types";

/**
 * Hook to fetch documents list
 */
export function useDocuments(filters: DocumentFilters = {}) {
	const { activeOrganization } = useActiveOrganization();

	return useQuery({
		queryKey: ["documents", activeOrganization?.id, filters],
		queryFn: async () => {
			const params = new URLSearchParams();
			if (filters.page) params.set("page", String(filters.page));
			if (filters.limit) params.set("limit", String(filters.limit));
			if (filters.type) params.set("type", filters.type);
			if (filters.quoteId) params.set("quoteId", filters.quoteId);
			if (filters.invoiceId) params.set("invoiceId", filters.invoiceId);
			if (filters.search) params.set("search", filters.search);
			if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
			if (filters.dateTo) params.set("dateTo", filters.dateTo);

			const response = await apiClient.vtc.documents.$get({
				query: Object.fromEntries(params),
			});

			if (!response.ok) {
				throw new Error("Failed to fetch documents");
			}

			return response.json();
		},
		enabled: !!activeOrganization?.id,
	});
}

/**
 * Hook to fetch a single document
 */
export function useDocument(documentId: string) {
	const { activeOrganization } = useActiveOrganization();

	return useQuery({
		queryKey: ["document", activeOrganization?.id, documentId],
		queryFn: async () => {
			const response = await apiClient.vtc.documents[":id"].$get({
				param: { id: documentId },
			});

			if (!response.ok) {
				throw new Error("Failed to fetch document");
			}

			return response.json();
		},
		enabled: !!activeOrganization?.id && !!documentId,
	});
}

/**
 * Hook to generate quote PDF
 */
export function useGenerateQuotePdf() {
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();

	return useMutation({
		mutationFn: async (quoteId: string) => {
			const response = await apiClient.vtc.documents.generate.quote[":quoteId"].$post({
				param: { quoteId },
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Failed to generate PDF" }));
				throw new Error((error as { message?: string }).message || "Failed to generate PDF");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["documents", activeOrganization?.id] });
		},
	});
}

/**
 * Hook to generate invoice PDF
 */
export function useGenerateInvoicePdf() {
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();

	return useMutation({
		mutationFn: async (invoiceId: string) => {
			const response = await apiClient.vtc.documents.generate.invoice[":invoiceId"].$post({
				param: { invoiceId },
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Failed to generate PDF" }));
				throw new Error((error as { message?: string }).message || "Failed to generate PDF");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["documents", activeOrganization?.id] });
		},
	});
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
	const queryClient = useQueryClient();
	const { activeOrganization } = useActiveOrganization();

	return useMutation({
		mutationFn: async (documentId: string) => {
			const response = await apiClient.vtc.documents[":id"].$delete({
				param: { id: documentId },
			});

			if (!response.ok) {
				const error = await response.json().catch(() => ({ message: "Failed to delete document" }));
				throw new Error((error as { message?: string }).message || "Failed to delete document");
			}

			return response.json();
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["documents", activeOrganization?.id] });
		},
	});
}

/**
 * Get download URL for a document
 */
export function getDocumentDownloadUrl(documentId: string): string {
	return `/api/vtc/documents/${documentId}/download`;
}
