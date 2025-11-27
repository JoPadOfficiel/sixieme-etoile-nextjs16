"use client";

/**
 * Optional Fees Settings Page
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
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
	OptionalFeeFormDialog,
	OptionalFeeList,
	OptionalFeeSummaryCards,
} from "@saas/settings/pricing/components";
import {
	useOptionalFees,
	useOptionalFeeStats,
	useCreateOptionalFee,
	useUpdateOptionalFee,
	useDeleteOptionalFee,
} from "@saas/settings/pricing/hooks";
import type {
	OptionalFee,
	OptionalFeeTypeFilter,
	OptionalFeeStatusFilter,
	CreateOptionalFeeRequest,
	UpdateOptionalFeeRequest,
} from "@saas/settings/pricing/types/optional-fee";

export default function SettingsPricingOptionalFeesPage() {
	const t = useTranslations("settings.pricing.optionalFees");
	const tCommon = useTranslations("common");
	const { toast } = useToast();

	// State
	const [typeFilter, setTypeFilter] = useState<OptionalFeeTypeFilter>("all");
	const [statusFilter, setStatusFilter] =
		useState<OptionalFeeStatusFilter>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingFee, setEditingFee] = useState<OptionalFee | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingFee, setDeletingFee] = useState<OptionalFee | null>(null);

	// Queries
	const { data: statsData, isLoading: statsLoading } = useOptionalFeeStats();
	const { data: feesData, isLoading: feesLoading } = useOptionalFees({
		type: typeFilter,
		status: statusFilter,
	});

	// Mutations
	const createMutation = useCreateOptionalFee();
	const updateMutation = useUpdateOptionalFee();
	const deleteMutation = useDeleteOptionalFee();

	// Handlers
	const handleAddFee = () => {
		setEditingFee(null);
		setDialogOpen(true);
	};

	const handleEditFee = (fee: OptionalFee) => {
		setEditingFee(fee);
		setDialogOpen(true);
	};

	const handleDeleteFee = (fee: OptionalFee) => {
		setDeletingFee(fee);
		setDeleteDialogOpen(true);
	};

	const handleSubmit = async (
		data: CreateOptionalFeeRequest | UpdateOptionalFeeRequest
	) => {
		try {
			if (editingFee) {
				await updateMutation.mutateAsync({
					id: editingFee.id,
					data: data as UpdateOptionalFeeRequest,
				});
				toast({
					title: tCommon("success"),
					description: t("toast.updateSuccess"),
				});
			} else {
				await createMutation.mutateAsync(data as CreateOptionalFeeRequest);
				toast({
					title: tCommon("success"),
					description: t("toast.createSuccess"),
				});
			}
			setDialogOpen(false);
			setEditingFee(null);
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
		if (!deletingFee) return;

		try {
			await deleteMutation.mutateAsync(deletingFee.id);
			toast({
				title: tCommon("success"),
				description: t("toast.deleteSuccess"),
			});
			setDeleteDialogOpen(false);
			setDeletingFee(null);
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
				<Button onClick={handleAddFee} data-testid="add-fee-button">
					<PlusIcon className="mr-2 size-4" />
					{t("addButton")}
				</Button>
			</div>

			{/* Summary Cards */}
			<OptionalFeeSummaryCards stats={statsData} isLoading={statsLoading} />

			{/* Fees List */}
			<OptionalFeeList
				fees={feesData?.data ?? []}
				isLoading={feesLoading}
				typeFilter={typeFilter}
				statusFilter={statusFilter}
				onTypeFilterChange={setTypeFilter}
				onStatusFilterChange={setStatusFilter}
				onEdit={handleEditFee}
				onDelete={handleDeleteFee}
			/>

			{/* Create/Edit Dialog */}
			<OptionalFeeFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				fee={editingFee}
				onSubmit={handleSubmit}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent data-testid="delete-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("delete.message", { name: deletingFee?.name ?? "" })}
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
