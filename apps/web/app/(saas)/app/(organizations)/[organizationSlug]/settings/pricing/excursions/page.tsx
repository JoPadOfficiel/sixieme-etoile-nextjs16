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
import { ExcursionDrawer, ExcursionsTable, PartnerAssignmentDialog } from "@saas/pricing/components";
import type {
	ExcursionPackage,
	ExcursionPackageFormData,
	ExcursionPackagesListResponse,
	PricingZone,
	VehicleCategory,
} from "@saas/pricing/types";

export default function SettingsPricingExcursionsPage() {
	const t = useTranslations();
	const { toast } = useToast();

	const [excursions, setExcursions] = useState<ExcursionPackage[]>([]);
	const [zones, setZones] = useState<PricingZone[]>([]);
	const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);

	const [search, setSearch] = useState("");
	const [zoneId, setZoneId] = useState("all");
	const [vehicleCategoryId, setVehicleCategoryId] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingExcursion, setEditingExcursion] =
		useState<ExcursionPackage | null>(null);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [excursionToDelete, setExcursionToDelete] =
		useState<ExcursionPackage | null>(null);

	// Story 14.6: Partner assignment dialog
	const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
	const [excursionForPartners, setExcursionForPartners] = useState<ExcursionPackage | null>(null);

	const fetchExcursions = useCallback(async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: "20",
			});

			if (search) params.set("search", search);
			if (zoneId !== "all") params.set("zoneId", zoneId);
			if (vehicleCategoryId !== "all")
				params.set("vehicleCategoryId", vehicleCategoryId);
			if (statusFilter !== "all") {
				params.set("isActive", statusFilter === "active" ? "true" : "false");
			}

			const response = await fetch(`/api/vtc/pricing/excursions?${params}`);
			if (!response.ok) throw new Error("Failed to fetch excursions");

			const data: ExcursionPackagesListResponse = await response.json();
			setExcursions(data.data);
			setTotalPages(data.meta.totalPages);
			setTotal(data.meta.total);
		} catch (error) {
			console.error("Error fetching excursions:", error);
			toast({
				title: t("common.error"),
				description: t("excursions.errors.fetchFailed"),
				variant: "error",
			});
		} finally {
			setIsLoading(false);
		}
	}, [
		page,
		search,
		zoneId,
		vehicleCategoryId,
		statusFilter,
		toast,
		t,
	]);

	const fetchZones = useCallback(async () => {
		try {
			const response = await fetch("/api/vtc/pricing/zones?limit=100");
			if (!response.ok) throw new Error("Failed to fetch zones");
			const data = await response.json();
			setZones(data.data);
		} catch (error) {
			console.error("Error fetching zones:", error);
		}
	}, []);

	const fetchVehicleCategories = useCallback(async () => {
		try {
			const response = await fetch("/api/vtc/vehicle-categories?limit=100");
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
		fetchZones();
		fetchVehicleCategories();
	}, [fetchZones, fetchVehicleCategories]);

	useEffect(() => {
		fetchExcursions();
	}, [fetchExcursions]);

	useEffect(() => {
		setPage(1);
	}, [search, zoneId, vehicleCategoryId, statusFilter]);

	const handleSubmit = async (data: ExcursionPackageFormData) => {
		setIsSubmitting(true);
		try {
			const url = editingExcursion
				? `/api/vtc/pricing/excursions/${editingExcursion.id}`
				: "/api/vtc/pricing/excursions";
			const method = editingExcursion ? "PATCH" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to save excursion");
			}

			toast({
				title: t("common.success"),
				description: editingExcursion
					? t("excursions.updateSuccess")
					: t("excursions.createSuccess"),
			});

			setDrawerOpen(false);
			setEditingExcursion(null);
			fetchExcursions();
		} catch (error) {
			toast({
				title: t("common.error"),
				description:
					error instanceof Error
						? error.message
						: t("excursions.errors.saveFailed"),
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!excursionToDelete) return;

		try {
			const response = await fetch(
				`/api/vtc/pricing/excursions/${excursionToDelete.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to delete excursion");
			}

			toast({
				title: t("common.success"),
				description: t("excursions.deleteSuccess"),
			});

			setDeleteDialogOpen(false);
			setExcursionToDelete(null);
			fetchExcursions();
		} catch (error) {
			toast({
				title: t("common.error"),
				description:
					error instanceof Error
						? error.message
						: t("excursions.errors.deleteFailed"),
				variant: "error",
			});
		}
	};

	const handleEdit = (excursion: ExcursionPackage) => {
		setEditingExcursion(excursion);
		setDrawerOpen(true);
	};

	const handleDeleteClick = (excursion: ExcursionPackage) => {
		setExcursionToDelete(excursion);
		setDeleteDialogOpen(true);
	};

	const handleAddNew = () => {
		setEditingExcursion(null);
		setDrawerOpen(true);
	};

	// Story 14.6: Partner assignment handler
	const handleAssignPartners = (excursion: ExcursionPackage) => {
		setExcursionForPartners(excursion);
		setPartnerDialogOpen(true);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">{t("excursions.title")}</h2>
				<Button onClick={handleAddNew}>
					<PlusIcon className="mr-2 size-4" />
					{t("excursions.addExcursion")}
				</Button>
			</div>

			<ExcursionsTable
				excursions={excursions}
				zones={zones}
				vehicleCategories={vehicleCategories}
				isLoading={isLoading}
				onEdit={handleEdit}
				onDelete={handleDeleteClick}
				onAssignPartners={handleAssignPartners}
				search={search}
				onSearchChange={setSearch}
				zoneId={zoneId}
				onZoneIdChange={setZoneId}
				vehicleCategoryId={vehicleCategoryId}
				onVehicleCategoryIdChange={setVehicleCategoryId}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				page={page}
				totalPages={totalPages}
				total={total}
				onPageChange={setPage}
			/>

			<ExcursionDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				excursion={editingExcursion}
				onSubmit={handleSubmit}
				isLoading={isSubmitting}
				zones={zones}
				vehicleCategories={vehicleCategories}
			/>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("excursions.deleteConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("excursions.deleteConfirmDescription", {
								name: excursionToDelete?.name ?? "",
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

			{/* Story 14.6: Partner Assignment Dialog */}
			{excursionForPartners && (
				<PartnerAssignmentDialog
					open={partnerDialogOpen}
					onOpenChange={setPartnerDialogOpen}
					itemId={excursionForPartners.id}
					itemType="excursion"
					catalogPrice={excursionForPartners.price}
					itemLabel={excursionForPartners.name}
					onSuccess={() => {
						fetchExcursions();
					}}
				/>
			)}
		</div>
	);
}
