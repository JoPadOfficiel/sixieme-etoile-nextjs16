"use client";

/**
 * Promotions Settings Page
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 */

import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@ui/components/alert-dialog";
import { Button } from "@ui/components/button";
import { useToast } from "@ui/hooks/use-toast";
import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import {
	PromotionFormDialog,
	PromotionList,
	PromotionSummaryCards,
} from "@saas/settings/pricing/components";
import {
	usePromotions,
	usePromotionStats,
	useCreatePromotion,
	useUpdatePromotion,
	useDeletePromotion,
} from "@saas/settings/pricing/hooks";
import type {
	Promotion,
	PromotionTypeFilter,
	PromotionStatusFilter,
	CreatePromotionRequest,
	UpdatePromotionRequest,
} from "@saas/settings/pricing/types/promotion";

export default function SettingsPricingPromotionsPage() {
	const t = useTranslations("settings.pricing.promotions");
	const tCommon = useTranslations("common");
	const { toast } = useToast();

	// State
	const [typeFilter, setTypeFilter] = useState<PromotionTypeFilter>("all");
	const [statusFilter, setStatusFilter] =
		useState<PromotionStatusFilter>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingPromotion, setDeletingPromotion] = useState<Promotion | null>(null);

	// Queries
	const { data: statsData, isLoading: statsLoading } = usePromotionStats();
	const { data: promotionsData, isLoading: promotionsLoading } = usePromotions({
		type: typeFilter,
		status: statusFilter,
	});

	// Mutations
	const createMutation = useCreatePromotion();
	const updateMutation = useUpdatePromotion();
	const deleteMutation = useDeletePromotion();

	// Handlers
	const handleAddPromotion = () => {
		setEditingPromotion(null);
		setDialogOpen(true);
	};

	const handleEditPromotion = (promotion: Promotion) => {
		setEditingPromotion(promotion);
		setDialogOpen(true);
	};

	const handleDeletePromotion = (promotion: Promotion) => {
		setDeletingPromotion(promotion);
		setDeleteDialogOpen(true);
	};

	const handleSubmit = async (
		data: CreatePromotionRequest | UpdatePromotionRequest
	) => {
		try {
			if (editingPromotion) {
				await updateMutation.mutateAsync({
					id: editingPromotion.id,
					data: data as UpdatePromotionRequest,
				});
				toast({
					title: tCommon("success"),
					description: t("toast.updateSuccess"),
				});
			} else {
				await createMutation.mutateAsync(data as CreatePromotionRequest);
				toast({
					title: tCommon("success"),
					description: t("toast.createSuccess"),
				});
			}
			setDialogOpen(false);
			setEditingPromotion(null);
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : t("toast.error");
			// Check for duplicate code error
			const isCodeExists = errorMessage.toLowerCase().includes("already exists");
			toast({
				title: tCommon("error"),
				description: isCodeExists ? t("toast.codeExists") : errorMessage,
				variant: "error",
			});
		}
	};

	const confirmDelete = async () => {
		if (!deletingPromotion) return;

		try {
			await deleteMutation.mutateAsync(deletingPromotion.id);
			toast({
				title: tCommon("success"),
				description: t("toast.deleteSuccess"),
			});
			setDeleteDialogOpen(false);
			setDeletingPromotion(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : t("toast.error"),
				variant: "error",
			});
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">
						{t("title")}
					</h1>
					<p className="text-sm text-muted-foreground">{t("description")}</p>
				</div>
				<Button onClick={handleAddPromotion} data-testid="add-promotion-button">
					<PlusIcon className="mr-2 size-4" />
					{t("addButton")}
				</Button>
			</div>

			{/* Summary Cards */}
			<PromotionSummaryCards stats={statsData} isLoading={statsLoading} />

			{/* Promotions List */}
			<PromotionList
				promotions={promotionsData?.data ?? []}
				isLoading={promotionsLoading}
				typeFilter={typeFilter}
				statusFilter={statusFilter}
				onTypeFilterChange={setTypeFilter}
				onStatusFilterChange={setStatusFilter}
				onEdit={handleEditPromotion}
				onDelete={handleDeletePromotion}
			/>

			{/* Create/Edit Dialog */}
			<PromotionFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				promotion={editingPromotion}
				onSubmit={handleSubmit}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent data-testid="delete-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("delete.message", { code: deletingPromotion?.code ?? "" })}
							{deletingPromotion && deletingPromotion.currentUses > 0 && (
								<span className="block mt-2 text-amber-600 dark:text-amber-400">
									{t("delete.usageWarning", { count: deletingPromotion.currentUses })}
								</span>
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deleteMutation.isPending}>
							{t("delete.cancel")}
						</AlertDialogCancel>
						<AlertDialogAction
							onClick={confirmDelete}
							disabled={deleteMutation.isPending}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							data-testid="confirm-delete"
						>
							{deleteMutation.isPending
								? tCommon("deleting")
								: t("delete.confirm")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
