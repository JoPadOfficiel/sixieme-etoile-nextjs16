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
import { RouteDrawer, RoutesTable } from "@saas/pricing/components";
import type {
	PricingZone,
	VehicleCategory,
	ZoneRoute,
	ZoneRouteFormData,
	ZoneRoutesListResponse,
} from "@saas/pricing/types";

export default function SettingsPricingRoutesPage() {
	const t = useTranslations();
	const { toast } = useToast();

	const [routes, setRoutes] = useState<ZoneRoute[]>([]);
	const [zones, setZones] = useState<PricingZone[]>([]);
	const [vehicleCategories, setVehicleCategories] = useState<VehicleCategory[]>(
		[],
	);
	const [isLoading, setIsLoading] = useState(true);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const limit = 20;

	const [search, setSearch] = useState("");
	const [fromZoneId, setFromZoneId] = useState("all");
	const [toZoneId, setToZoneId] = useState("all");
	const [vehicleCategoryId, setVehicleCategoryId] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingRoute, setEditingRoute] = useState<ZoneRoute | null>(null);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [routeToDelete, setRouteToDelete] = useState<ZoneRoute | null>(null);

	const fetchRoutes = useCallback(async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			if (search) params.set("search", search);
			if (fromZoneId !== "all") params.set("fromZoneId", fromZoneId);
			if (toZoneId !== "all") params.set("toZoneId", toZoneId);
			if (vehicleCategoryId !== "all")
				params.set("vehicleCategoryId", vehicleCategoryId);
			if (statusFilter !== "all") {
				params.set("isActive", statusFilter === "active" ? "true" : "false");
			}

			const response = await fetch(`/api/vtc/pricing/routes?${params}`);
			if (!response.ok) throw new Error("Failed to fetch routes");

			const data: ZoneRoutesListResponse = await response.json();
			setRoutes(data.data);
			setTotalPages(data.meta.totalPages);
			setTotal(data.meta.total);
		} catch (error) {
			console.error("Error fetching routes:", error);
			toast({
				title: t("common.error"),
				description: t("routes.errors.fetchFailed"),
				variant: "error",
			});
		} finally {
			setIsLoading(false);
		}
	}, [
		page,
		search,
		fromZoneId,
		toZoneId,
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
			const response = await fetch("/api/vtc/vehicles/categories?limit=100");
			if (!response.ok) {
				console.warn("Vehicle categories API not available yet");
				setVehicleCategories([]);
				return;
			}

			const data = await response.json();
			setVehicleCategories(data.data || []);
		} catch (error) {
			console.warn("Vehicle categories API not available:", error);
			setVehicleCategories([]);
		}
	}, []);

	useEffect(() => {
		fetchZones();
		fetchVehicleCategories();
	}, [fetchZones, fetchVehicleCategories]);

	useEffect(() => {
		fetchRoutes();
	}, [fetchRoutes]);

	useEffect(() => {
		setPage(1);
	}, [search, fromZoneId, toZoneId, vehicleCategoryId, statusFilter]);

	const handleSubmit = async (data: ZoneRouteFormData) => {
		setIsSubmitting(true);
		try {
			const url = editingRoute
				? `/api/vtc/pricing/routes/${editingRoute.id}`
				: "/api/vtc/pricing/routes";
			const method = editingRoute ? "PATCH" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to save route");
			}

			toast({
				title: t("common.success"),
				description: editingRoute
					? t("routes.updateSuccess")
					: t("routes.createSuccess"),
			});

			setDrawerOpen(false);
			setEditingRoute(null);
			fetchRoutes();
		} catch (error) {
			console.error("Error saving route:", error);
			toast({
				title: t("common.error"),
				description:
					error instanceof Error
						? error.message
						: t("routes.errors.saveFailed"),
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleDelete = async () => {
		if (!routeToDelete) return;

		try {
			const response = await fetch(
				`/api/vtc/pricing/routes/${routeToDelete.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to delete route");
			}

			toast({
				title: t("common.success"),
				description: t("routes.deleteSuccess"),
			});

			setDeleteDialogOpen(false);
			setRouteToDelete(null);
			fetchRoutes();
		} catch (error) {
			console.error("Error deleting route:", error);
			toast({
				title: t("common.error"),
				description:
					error instanceof Error
						? error.message
						: t("routes.errors.deleteFailed"),
				variant: "error",
			});
		}
	};

	const handleEdit = (route: ZoneRoute) => {
		setEditingRoute(route);
		setDrawerOpen(true);
	};

	const handleDeleteClick = (route: ZoneRoute) => {
		setRouteToDelete(route);
		setDeleteDialogOpen(true);
	};

	const handleAddNew = () => {
		setEditingRoute(null);
		setDrawerOpen(true);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">{t("routes.title")}</h2>
				<Button onClick={handleAddNew}>
					<PlusIcon className="mr-2 size-4" />
					{t("routes.addRoute")}
				</Button>
			</div>

			<RoutesTable
				routes={routes}
				zones={zones}
				vehicleCategories={vehicleCategories}
				isLoading={isLoading}
				onEdit={handleEdit}
				onDelete={handleDeleteClick}
				search={search}
				onSearchChange={setSearch}
				fromZoneId={fromZoneId}
				onFromZoneIdChange={setFromZoneId}
				toZoneId={toZoneId}
				onToZoneIdChange={setToZoneId}
				vehicleCategoryId={vehicleCategoryId}
				onVehicleCategoryIdChange={setVehicleCategoryId}
				statusFilter={statusFilter}
				onStatusFilterChange={setStatusFilter}
				page={page}
				totalPages={totalPages}
				total={total}
				onPageChange={setPage}
			/>

			<RouteDrawer
				key={editingRoute?.id ?? "new"}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				route={editingRoute}
				onSubmit={handleSubmit}
				isLoading={isSubmitting}
				zones={zones}
				vehicleCategories={vehicleCategories}
			/>

			<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>
							{t("routes.deleteConfirmTitle")}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t("routes.deleteConfirmDescription", {
								fromZone: routeToDelete?.fromZone.name ?? "",
								toZone: routeToDelete?.toZone.name ?? "",
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
