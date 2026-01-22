"use client";

import { apiClient } from "@shared/lib/api-client";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";

/**
 * Hook for mission order document generation
 * Story 25.1: Generate Mission Sheet (Quote-based)
 * Story 29.8: Generate Mission Sheet (Mission-based, per-mission)
 */
export function useMissionOrder() {
	const t = useTranslations("dispatch.assignment");
	const { toast } = useToast();

	// Story 25.1: Legacy quote-based mission order generation
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

	// Story 29.8: New mission-based sheet generation (per-Mission, not per-Quote)
	const generateMissionSheetMutation = useMutation({
		mutationFn: async (missionId: string) => {
			const response = await apiClient.vtc.documents.generate["mission-sheet"][":missionId"].$post({
				param: { missionId },
			});

			if (!response.ok) {
				const errorData = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(errorData.message || "Failed to generate mission sheet");
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
		// Legacy: Quote-based
		generateMissionOrder: generateMutation.mutate,
		isGenerating: generateMutation.isPending,
		// Story 29.8: Mission-based
		generateMissionSheet: generateMissionSheetMutation.mutate,
		isGeneratingSheet: generateMissionSheetMutation.isPending,
	};
}
