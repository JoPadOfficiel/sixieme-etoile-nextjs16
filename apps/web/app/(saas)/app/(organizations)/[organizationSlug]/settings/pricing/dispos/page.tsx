"use client";

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
import { useCallback, useEffect, useState } from "react";
import { DispoDrawer, DisposTable } from "@saas/pricing/components";
import type {
	DispoPackage,
	DispoPackageFormData,
	DispoPackagesListResponse,
	VehicleCategory,
} from "@saas/pricing/types";

export default function SettingsPricingDisposPage() {
	const t = useTranslations();
	const { toast } = useToast();

	const [dispos, setDispos] = useState<DispoPackage[]>([]);
	const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [search, setSearch] = useState("");
	const [vehicleCategoryId, setVehicleCategoryId] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingDispo, setEditingDispo] = useState<DispoPackage | null>(null);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [dispoToDelete, setDispoToDelete] = useState<DispoPackage | null>(null);

	const fetchDispos = useCallback(async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: "20",
			});

			if (search) params.set("search", search);
			if (vehicleCategoryId !== "all")
				params.set("vehicleCategoryId", vehicleCategoryId);
			if (statusFilter !== "all") {
				params.set("isActive", statusFilter === "active" ? "true" : "false");
			}

			const response = await fetch(`/api/vtc/pricing/dispos?${params}`);
			if (!response.ok) throw new Error("Failed to fetch dispos");

			const data: DispoPackagesListResponse = await response.json();
			setDispos(data.data);
			setTotalPages(data.meta.totalPages);
			setTotal(data.meta.total);
		} catch (error) {
			console.error("Error fetching dispos:", error);
			toast({
				title: t("common.error"),
				description: t("dispos.errors.fetchFailed"),
				variant: "error",
			});
		} finally {
			setIsLoading(false);
		}
	}, [page, search, vehicleCategoryId, statusFilter, toast, t]);

	const fetchVehicleCategories = useCallback(async () => {
		try {
			const response = await fetch("/api/vtc/vehicles/categories?limit=100");
			if (!response.ok) {
				setVehicleCategories([]);
				return;
			}
			const data = await response.json();
			setVehicleCategories(data.data || []);
		} catch {
			setVehicleCategories([]);
		}
	}, []);

	useEffect(() => {
		fetchVehicleCategories();
	}, [fetchVehicleCategories]);

	useEffect(() => {
		fetchDispos();
	}, [fetchDispos]);

	useEffect(() => {
		setPage(1);
	}, [search, vehicleCategoryId, statusFilter]);

	const handleSubmit = async (data: DispoPackageFormData) => {
		setIsSubmitting(true);
		try {
			const url = editingDispo
				? `/api/vtc/pricing/dispos/${editingDispo.id}`
				: "/api/vtc/pricing/dispos";
			const method = editingDispo ? "PATCH" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to save dispo");
			}

			toast({
				title: t("common.success"),
				description: editingDispo
					? t("dispos.updateSuccess")
					: t("dispos.createSuccess"),
			});

			setDrawerOpen(false);
			setEditingDispo(null);
			fetchDispos();
		} catch (error) {
			toast({
				title: t("common.error"),
				description:
					error instanceof Error
						? error.message
						: t("dispos.errors.saveFailed"),
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!dispoToDelete) return;

		try {
			const response = await fetch(
				`/api/vtc/pricing/dispos/${dispoToDelete.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to delete dispo");
			}

			toast({
				title: t("common.success"),
				description: t("dispos.deleteSuccess"),
			});

			setDeleteDialogOpen(false);
			setDispoToDelete(null);
			fetchDispos();
		} catch (error) {
			toast({
				title: t("common.error"),
				description:
					error instanceof Error
						? error.message
						: t("dispos.errors.deleteFailed"),
				variant: "error",
			});
		}
	};

	const handleEdit = (dispo: DispoPackage) => {
		setEditingDispo(dispo);
		setDrawerOpen(true);
	};

	const handleDeleteClick = (dispo: DispoPackage) => {
		setDispoToDelete(dispo);
		setDeleteDialogOpen(true);
	};

	const handleAddNew = () => {
		setEditingDispo(null);
		setDrawerOpen(true);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">{t("dispos.title")}</h2>
				<Button onClick={handleAddNew}>
					<PlusIcon className="mr-2 size-4" />
					{t("dispos.addDispo")}
				</Button>
			</div>

			<DisposTable
				dispos={dispos}
				vehicleCategories={vehicleCategories}
				isLoading={isLoading}
				onEdit={handleEdit}
				onDelete={handleDeleteClick}
				search={search}
				onSearchChange={setSearch}
				vehicleCategoryId={vehicleCategoryId}
				onVehicleCategoryIdChange={setVehicleCategoryId}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				page={page}
				totalPages={totalPages}
				total={total}
				onPageChange={setPage}
			/>

			<DispoDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				dispo={editingDispo}
				onSubmit={handleSubmit}
				isLoading={isSubmitting}
				vehicleCategories={vehicleCategories}
			/>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("dispos.deleteConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("dispos.deleteConfirmDescription", {
								name: dispoToDelete?.name ?? "",
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
						<AlertDialogAction
							onClick={handleDelete}
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
						>
							{t("common.delete")}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	);
}
