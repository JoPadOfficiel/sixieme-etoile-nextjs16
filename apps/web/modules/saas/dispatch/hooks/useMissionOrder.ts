"use client";

import { apiClient } from "@shared/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";

/**
 * Hook for mission order document generation
 * Story 25.1: Generate Mission Sheet
 */
export function useMissionOrder() {
	const t = useTranslations("dispatch.assignment");
	const { toast } = useToast();

	const generateMutation = useMutation({
		mutationFn: async (quoteId: string) => {
			const response = await apiClient.vtc.documents.generate["mission-order"][":quoteId"].$post({
				param: { quoteId },
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(errorData.message || "Failed to generate mission order");
			}

			return response.json();
		},
		onSuccess: (data) => {
			toast({
				title: t("missionSheetGenerated"),
				description: t("missionSheetDownloadStarted"),
			});
			
			// Trigger download
			if (data.url) {
				window.open(data.url, "_blank");
			}
		},
		onError: (error: Error) => {
			toast({
				title: t("error"),
				description: error.message,
				variant: "error",
			});
		},
	});

	return {
		generateMissionOrder: generateMutation.mutate,
		isGenerating: generateMutation.isPending,
	};
}
