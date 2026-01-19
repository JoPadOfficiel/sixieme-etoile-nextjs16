"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";

export interface BlockTemplate {
	id: string;
	label: string;
	data: any;
}

export function useBlockTemplateActions() {
	const { toast } = useToast();
	const queryClient = useQueryClient();
	const t = useTranslations();

	const createTemplateMutation = useMutation({
		mutationFn: async (data: { label: string; data: any }) => {
			const res = await fetch("/api/vtc/quotes/block-templates", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});
			if (!res.ok) throw new Error("Failed to create template");
			return res.json();
		},
		onSuccess: () => {
			toast({ title: t("quotes.templates.createSuccess") || "Template saved" });
			queryClient.invalidateQueries({ queryKey: ["block-templates"] });
		},
		onError: () => {
			toast({
				title: t("quotes.templates.createError") || "Failed to save template",
				variant: "error",
			});
		},
	});

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
		},
		onError: () => {
			toast({
				title: t("quotes.templates.deleteError") || "Failed to delete template",
				variant: "error",
			});
		},
	});

	const { data: templates, isLoading } = useQuery<BlockTemplate[]>({
		queryKey: ["block-templates"],
		queryFn: async () => {
			const res = await fetch("/api/vtc/quotes/block-templates");
			if (!res.ok) throw new Error("Failed to fetch templates");
			const json = await res.json();
			return json.data;
		},
	});

	return {
		createTemplate: createTemplateMutation.mutateAsync,
		deleteTemplate: deleteTemplateMutation.mutateAsync,
		templates: templates || [],
		isLoading,
	};
}
