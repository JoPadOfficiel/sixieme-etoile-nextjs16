"use client";

/**
 * Seasonal Multipliers Settings Page
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
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
	SeasonalMultiplierFormDialog,
	SeasonalMultiplierList,
	SeasonalMultiplierSummaryCards,
} from "@saas/settings/pricing/components";
import {
	useSeasonalMultipliers,
	useSeasonalMultiplierStats,
	useCreateSeasonalMultiplier,
	useUpdateSeasonalMultiplier,
	useDeleteSeasonalMultiplier,
} from "@saas/settings/pricing/hooks";
import type {
	SeasonalMultiplier,
	SeasonalMultiplierStatusFilter,
	CreateSeasonalMultiplierRequest,
	UpdateSeasonalMultiplierRequest,
} from "@saas/settings/pricing/types/seasonal-multiplier";

export default function SettingsPricingSeasonalMultipliersPage() {
	const t = useTranslations("settings.pricing.seasonalMultipliers");
	const tCommon = useTranslations("common");
	const { toast } = useToast();

	// State
	const [statusFilter, setStatusFilter] =
		useState<SeasonalMultiplierStatusFilter>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingMultiplier, setEditingMultiplier] =
		useState<SeasonalMultiplier | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingMultiplier, setDeletingMultiplier] =
		useState<SeasonalMultiplier | null>(null);

	// Queries
	const { data: statsData, isLoading: statsLoading } =
		useSeasonalMultiplierStats();
	const { data: multipliersData, isLoading: multipliersLoading } =
		useSeasonalMultipliers({
			status: statusFilter,
		});

	// Mutations
	const createMutation = useCreateSeasonalMultiplier();
	const updateMutation = useUpdateSeasonalMultiplier();
	const deleteMutation = useDeleteSeasonalMultiplier();

	// Handlers
	const handleAddMultiplier = () => {
		setEditingMultiplier(null);
		setDialogOpen(true);
	};

	const handleEditMultiplier = (multiplier: SeasonalMultiplier) => {
		setEditingMultiplier(multiplier);
		setDialogOpen(true);
	};

	const handleDeleteMultiplier = (multiplier: SeasonalMultiplier) => {
		setDeletingMultiplier(multiplier);
		setDeleteDialogOpen(true);
	};

	const handleSubmit = async (
		data: CreateSeasonalMultiplierRequest | UpdateSeasonalMultiplierRequest
	) => {
		try {
			if (editingMultiplier) {
				await updateMutation.mutateAsync({
					id: editingMultiplier.id,
					data: data as UpdateSeasonalMultiplierRequest,
				});
				toast({
					title: tCommon("success"),
					description: t("toast.updateSuccess"),
				});
			} else {
				await createMutation.mutateAsync(data as CreateSeasonalMultiplierRequest);
				toast({
					title: tCommon("success"),
					description: t("toast.createSuccess"),
				});
			}
			setDialogOpen(false);
			setEditingMultiplier(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description:
					error instanceof Error ? error.message : t("toast.error"),
				variant: "error",
			});
		}
	};

	const confirmDelete = async () => {
		if (!deletingMultiplier) return;

		try {
			await deleteMutation.mutateAsync(deletingMultiplier.id);
			toast({
				title: tCommon("success"),
				description: t("toast.deleteSuccess"),
			});
			setDeleteDialogOpen(false);
			setDeletingMultiplier(null);
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
				<Button onClick={handleAddMultiplier} data-testid="add-multiplier-button">
					<PlusIcon className="mr-2 size-4" />
					{t("addButton")}
				</Button>
			</div>

			{/* Summary Cards */}
			<SeasonalMultiplierSummaryCards
				stats={statsData}
				isLoading={statsLoading}
			/>

			{/* Multipliers List */}
			<SeasonalMultiplierList
				multipliers={multipliersData?.data ?? []}
				isLoading={multipliersLoading}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				onEdit={handleEditMultiplier}
				onDelete={handleDeleteMultiplier}
			/>

			{/* Create/Edit Dialog */}
			<SeasonalMultiplierFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				multiplier={editingMultiplier}
				onSubmit={handleSubmit}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent data-testid="delete-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("delete.message", { name: deletingMultiplier?.name ?? "" })}
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
