"use client";

/**
 * Advanced Rate Modifiers Settings Page
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
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
import { useEffect, useState } from "react";

import {
	AdvancedRateFormDialog,
	AdvancedRateList,
	AdvancedRateSummaryCards,
} from "@saas/settings/pricing/components";
import {
	useAdvancedRates,
	useAdvancedRateStats,
	useCreateAdvancedRate,
	useUpdateAdvancedRate,
	useDeleteAdvancedRate,
} from "@saas/settings/pricing/hooks";
import type {
	AdvancedRate,
	AdvancedRateTypeFilter,
	AdvancedRateStatusFilter,
	CreateAdvancedRateRequest,
	UpdateAdvancedRateRequest,
} from "@saas/settings/pricing/types/advanced-rate";

interface PricingZone {
	id: string;
	name: string;
}

export default function SettingsPricingAdvancedRatesPage() {
	const t = useTranslations("settings.pricing.advancedRates");
	const tCommon = useTranslations("common");
	const { toast } = useToast();

	// State
	const [typeFilter, setTypeFilter] = useState<AdvancedRateTypeFilter>("all");
	const [statusFilter, setStatusFilter] =
		useState<AdvancedRateStatusFilter>("all");
	const [dialogOpen, setDialogOpen] = useState(false);
	const [editingRate, setEditingRate] = useState<AdvancedRate | null>(null);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingRate, setDeletingRate] = useState<AdvancedRate | null>(null);
	const [zones, setZones] = useState<PricingZone[]>([]);

	// Fetch zones for the form
	useEffect(() => {
		const fetchZones = async () => {
			try {
				const response = await fetch("/api/vtc/pricing/zones?limit=100");
				if (!response.ok) throw new Error("Failed to fetch zones");
				const data = await response.json();
				setZones(data.data || []);
			} catch (error) {
				console.error("Error fetching zones:", error);
			}
		};
		fetchZones();
	}, []);

	// Queries
	const { data: statsData, isLoading: statsLoading } = useAdvancedRateStats();
	const { data: ratesData, isLoading: ratesLoading } = useAdvancedRates({
		type: typeFilter,
		status: statusFilter,
	});

	// Mutations
	const createMutation = useCreateAdvancedRate();
	const updateMutation = useUpdateAdvancedRate();
	const deleteMutation = useDeleteAdvancedRate();

	// Handlers
	const handleAddRate = () => {
		setEditingRate(null);
		setDialogOpen(true);
	};

	const handleEditRate = (rate: AdvancedRate) => {
		setEditingRate(rate);
		setDialogOpen(true);
	};

	const handleDeleteRate = (rate: AdvancedRate) => {
		setDeletingRate(rate);
		setDeleteDialogOpen(true);
	};

	const handleSubmit = async (
		data: CreateAdvancedRateRequest | UpdateAdvancedRateRequest
	) => {
		try {
			if (editingRate) {
				await updateMutation.mutateAsync({
					id: editingRate.id,
					data: data as UpdateAdvancedRateRequest,
				});
				toast({
					title: tCommon("success"),
					description: t("toast.updateSuccess"),
				});
			} else {
				await createMutation.mutateAsync(data as CreateAdvancedRateRequest);
				toast({
					title: tCommon("success"),
					description: t("toast.createSuccess"),
				});
			}
			setDialogOpen(false);
			setEditingRate(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description: error instanceof Error ? error.message : t("toast.error"),
				variant: "error",
			});
		}
	};

	const confirmDelete = async () => {
		if (!deletingRate) return;

		try {
			await deleteMutation.mutateAsync(deletingRate.id);
			toast({
				title: tCommon("success"),
				description: t("toast.deleteSuccess"),
			});
			setDeleteDialogOpen(false);
			setDeletingRate(null);
		} catch (error) {
			toast({
				title: tCommon("error"),
				description: error instanceof Error ? error.message : t("toast.error"),
				variant: "error",
			});
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
					<p className="text-sm text-muted-foreground">{t("description")}</p>
				</div>
				<Button onClick={handleAddRate} data-testid="add-rate-button">
					<PlusIcon className="mr-2 size-4" />
					{t("addButton")}
				</Button>
			</div>

			{/* Summary Cards */}
			<AdvancedRateSummaryCards stats={statsData} isLoading={statsLoading} />

			{/* Rates List */}
			<AdvancedRateList
				rates={ratesData?.data ?? []}
				isLoading={ratesLoading}
				typeFilter={typeFilter}
				statusFilter={statusFilter}
				onTypeFilterChange={setTypeFilter}
				onStatusFilterChange={setStatusFilter}
				onEdit={handleEditRate}
				onDelete={handleDeleteRate}
			/>

			{/* Create/Edit Dialog */}
			<AdvancedRateFormDialog
				open={dialogOpen}
				onOpenChange={setDialogOpen}
				rate={editingRate}
				zones={zones}
				onSubmit={handleSubmit}
				isSubmitting={createMutation.isPending || updateMutation.isPending}
			/>

			{/* Delete Confirmation Dialog */}
			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent data-testid="delete-dialog">
					<AlertDialogHeader>
						<AlertDialogTitle>{t("delete.title")}</AlertDialogTitle>
						<AlertDialogDescription>
							{t("delete.message", { name: deletingRate?.name ?? "" })}
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
