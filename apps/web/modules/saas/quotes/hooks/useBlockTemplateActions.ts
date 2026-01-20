"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";
import type { FullQuoteTemplateData } from "../utils/cartTemplateUtils";

// =============================================================================
// Types
// =============================================================================

export interface BlockTemplate {
	id: string;
	label: string;
	isFullQuote: boolean;
	data: unknown;
}

export interface CreateTemplateParams {
	label: string;
	data: unknown;
	isFullQuote?: boolean;
}

// =============================================================================
// Hook
// =============================================================================

/**
 * Story 26.13 + 26.21: Block Template Actions Hook
 *
 * Provides CRUD operations for block templates with support for:
 * - Single-block templates (Story 26.13)
 * - Full quote templates (Story 26.21)
 */
export function useBlockTemplateActions() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const t = useTranslations();

	// -------------------------------------------------------------------------
	// Create Template (supports both single-block and full quote)
	// -------------------------------------------------------------------------
	const createTemplateMutation = useMutation({
		mutationFn: async (params: CreateTemplateParams) => {
			const res = await fetch("/api/vtc/quotes/block-templates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					label: params.label,
					data: params.data,
					isFullQuote: params.isFullQuote ?? false,
				}),
			});
			if (!res.ok) throw new Error("Failed to create template");
			return res.json();
		},
		onSuccess: (_, variables) => {
			const messageKey = variables.isFullQuote
				? "quotes.templates.saveQuoteSuccess"
				: "quotes.templates.createSuccess";
			toast({ title: t(messageKey) || "Template saved" });
			// Invalidate both query keys to refresh all lists
			queryClient.invalidateQueries({ queryKey: ["block-templates"] });
			queryClient.invalidateQueries({ queryKey: ["block-templates", "full"] });
			queryClient.invalidateQueries({
				queryKey: ["block-templates", "single"],
			});
		},
		onError: () => {
			toast({
				title: t("quotes.templates.createError") || "Failed to save template",
				variant: "error",
			});
		},
	});

	// -------------------------------------------------------------------------
	// Delete Template
	// -------------------------------------------------------------------------
	const deleteTemplateMutation = useMutation({
		mutationFn: async (id: string) => {
			const res = await fetch(`/api/vtc/quotes/block-templates/${id}`, {
				method: "DELETE",
			});
			if (!res.ok) throw new Error("Failed to delete template");
			return res.json();
		},
		onSuccess: () => {
			toast({
				title: t("quotes.templates.deleteSuccess") || "Template deleted",
			});
			queryClient.invalidateQueries({ queryKey: ["block-templates"] });
			queryClient.invalidateQueries({ queryKey: ["block-templates", "full"] });
			queryClient.invalidateQueries({
				queryKey: ["block-templates", "single"],
			});
		},
		onError: () => {
			toast({
				title: t("quotes.templates.deleteError") || "Failed to delete template",
				variant: "error",
			});
		},
	});

	// -------------------------------------------------------------------------
	// Query: All templates (backward compatible)
	// -------------------------------------------------------------------------
	const { data: templates, isLoading } = useQuery<BlockTemplate[]>({
		queryKey: ["block-templates"],
		queryFn: async () => {
			const res = await fetch("/api/vtc/quotes/block-templates");
			if (!res.ok) throw new Error("Failed to fetch templates");
			const json = await res.json();
			return json.data;
		},
	});

	// -------------------------------------------------------------------------
	// Query: Single-block templates only (for Slash Menu)
	// -------------------------------------------------------------------------
	const { data: singleBlockTemplates, isLoading: isLoadingSingleBlock } =
		useQuery<BlockTemplate[]>({
			queryKey: ["block-templates", "single"],
			queryFn: async () => {
				const res = await fetch(
					"/api/vtc/quotes/block-templates?isFullQuote=false",
				);
				if (!res.ok) throw new Error("Failed to fetch templates");
				const json = await res.json();
				return json.data;
			},
		});

	// -------------------------------------------------------------------------
	// Query: Full quote templates only (Story 26.21)
	// -------------------------------------------------------------------------
	const { data: fullQuoteTemplates, isLoading: isLoadingFullQuote } = useQuery<
		BlockTemplate[]
	>({
		queryKey: ["block-templates", "full"],
		queryFn: async () => {
			const res = await fetch(
				"/api/vtc/quotes/block-templates?isFullQuote=true",
			);
			if (!res.ok) throw new Error("Failed to fetch templates");
			const json = await res.json();
			return json.data;
		},
	});

	// -------------------------------------------------------------------------
	// Helper: Create single-block template (Story 26.13)
	// -------------------------------------------------------------------------
	const createTemplate = async (params: { label: string; data: unknown }) => {
		return createTemplateMutation.mutateAsync({
			...params,
			isFullQuote: false,
		});
	};

	// -------------------------------------------------------------------------
	// Helper: Create full quote template (Story 26.21)
	// -------------------------------------------------------------------------
	const createFullQuoteTemplate = async (params: {
		label: string;
		data: FullQuoteTemplateData;
	}) => {
		return createTemplateMutation.mutateAsync({
			label: params.label,
			data: params.data,
			isFullQuote: true,
		});
	};

	return {
		// Mutations
		createTemplate,
		createFullQuoteTemplate,
		deleteTemplate: deleteTemplateMutation.mutateAsync,
		isCreating: createTemplateMutation.isPending,
		isDeleting: deleteTemplateMutation.isPending,

		// All templates (backward compatible)
		templates: templates || [],
		isLoading,

		// Single-block templates (Story 26.13)
		singleBlockTemplates: singleBlockTemplates || [],
		isLoadingSingleBlock,

		// Full quote templates (Story 26.21)
		fullQuoteTemplates: fullQuoteTemplates || [],
		isLoadingFullQuote,
	};
}
