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
import { Tabs, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useToast } from "@ui/hooks/use-toast";
import { GridIcon, ListIcon, PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
	CoverageMatrix,
	CoverageStatsCard,
	RouteDrawer,
	RoutesTable,
} from "@saas/pricing/components";
import type {
	CoverageStats,
	MatrixCell,
	MatrixData,
} from "@saas/pricing/components";
import type {
	PartnerContact,
	PricingZone,
	VehicleCategory,
	ZoneRoute,
	ZoneRouteFormData,
	ZoneRoutesListResponse,
} from "@saas/pricing/types";

type ViewMode = "list" | "matrix";

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

	// Coverage data
	const [coverageStats, setCoverageStats] = useState<CoverageStats | null>(null);
	const [matrixData, setMatrixData] = useState<MatrixData | null>(null);
	const [isCoverageLoading, setIsCoverageLoading] = useState(true);
	const [viewMode, setViewMode] = useState<ViewMode>("list");

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const limit = 20;

	const [search, setSearch] = useState("");
	const [fromZoneId, setFromZoneId] = useState("all");
	const [toZoneId, setToZoneId] = useState("all");
	const [vehicleCategoryId, setVehicleCategoryId] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");
	// Story 13.2: Partner filter
	const [partnerId, setPartnerId] = useState("all");
	const [partners, setPartners] = useState<PartnerContact[]>([]);

	// Prefill for creating route from matrix
	const [prefillFromZoneId, setPrefillFromZoneId] = useState<string | null>(null);
	const [prefillToZoneId, setPrefillToZoneId] = useState<string | null>(null);

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
			// Story 13.2: Partner filter
			if (partnerId !== "all") params.set("partnerId", partnerId);

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
		partnerId,
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

	// Story 13.2: Fetch partner contacts for filter dropdown
	const fetchPartners = useCallback(async () => {
		try {
			const response = await fetch("/api/vtc/contacts?isPartner=true&limit=100");
			if (!response.ok) {
				console.warn("Partners API not available");
				setPartners([]);
				return;
			}

			const data = await response.json();
			// Map to PartnerContact format
			const partnerContacts: PartnerContact[] = (data.data || []).map(
				(contact: { id: string; displayName: string; companyName?: string | null }) => ({
					id: contact.id,
					displayName: contact.displayName,
					companyName: contact.companyName,
				})
			);
			setPartners(partnerContacts);
		} catch (error) {
			console.warn("Partners API not available:", error);
			setPartners([]);
		}
	}, []);

	const fetchCoverageStats = useCallback(async () => {
		try {
			const response = await fetch("/api/vtc/pricing/routes/coverage");
			if (!response.ok) throw new Error("Failed to fetch coverage stats");
			const data = await response.json();
			setCoverageStats(data);
		} catch (error) {
			console.error("Error fetching coverage stats:", error);
		}
	}, []);

	const fetchMatrixData = useCallback(async () => {
		setIsCoverageLoading(true);
		try {
			const params = new URLSearchParams();
			if (vehicleCategoryId !== "all") {
				params.set("vehicleCategoryId", vehicleCategoryId);
			}
			const response = await fetch(`/api/vtc/pricing/routes/matrix?${params}`);
			if (!response.ok) throw new Error("Failed to fetch matrix data");
			const data = await response.json();
			setMatrixData(data);
		} catch (error) {
			console.error("Error fetching matrix data:", error);
		} finally {
			setIsCoverageLoading(false);
		}
	}, [vehicleCategoryId]);

	useEffect(() => {
		fetchZones();
		fetchVehicleCategories();
		fetchCoverageStats();
		fetchPartners(); // Story 13.2
	}, [fetchZones, fetchVehicleCategories, fetchCoverageStats, fetchPartners]);

	useEffect(() => {
		fetchRoutes();
	}, [fetchRoutes]);

	useEffect(() => {
		if (viewMode === "matrix") {
			fetchMatrixData();
		}
	}, [viewMode, fetchMatrixData]);

	useEffect(() => {
		setPage(1);
	}, [search, fromZoneId, toZoneId, vehicleCategoryId, statusFilter, partnerId]);

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
			setPrefillFromZoneId(null);
			setPrefillToZoneId(null);
			refreshAllData();
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
		setPrefillFromZoneId(null);
		setPrefillToZoneId(null);
		setDrawerOpen(true);
	};

	const handleMatrixCellClick = (
		fromZoneId: string,
		toZoneId: string,
		cell: MatrixCell | null,
	) => {
		if (cell?.hasRoute && cell.routeId) {
			// Find and edit existing route
			const route = routes.find((r) => r.id === cell.routeId);
			if (route) {
				handleEdit(route);
			}
		} else {
			// Create new route with prefilled zones
			setEditingRoute(null);
			setPrefillFromZoneId(fromZoneId);
			setPrefillToZoneId(toZoneId);
			setDrawerOpen(true);
		}
	};

	const refreshAllData = () => {
		fetchRoutes();
		fetchCoverageStats();
		if (viewMode === "matrix") {
			fetchMatrixData();
		}
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<h2 className="font-semibold text-lg">{t("routes.title")}</h2>
				<div className="flex items-center gap-2">
					{/* View toggle */}
					<Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
						<TabsList className="h-9">
							<TabsTrigger value="list" className="gap-1 px-3">
								<ListIcon className="size-4" />
								{t("routes.viewList")}
							</TabsTrigger>
							<TabsTrigger value="matrix" className="gap-1 px-3">
								<GridIcon className="size-4" />
								{t("routes.viewMatrix")}
							</TabsTrigger>
						</TabsList>
					</Tabs>
					<Button onClick={handleAddNew}>
						<PlusIcon className="mr-2 size-4" />
						{t("routes.addRoute")}
					</Button>
				</div>
			</div>

			{/* Coverage Stats */}
			<CoverageStatsCard stats={coverageStats} isLoading={isCoverageLoading} />

			{/* List or Matrix View */}
			{viewMode === "list" ? (
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
					// Story 13.2: Partner filter
					partnerId={partnerId}
					onPartnerIdChange={setPartnerId}
					partners={partners}
					page={page}
					totalPages={totalPages}
					total={total}
					onPageChange={setPage}
				/>
			) : (
				<CoverageMatrix
					data={matrixData}
					isLoading={isCoverageLoading}
					onCellClick={handleMatrixCellClick}
				/>
			)}

			<RouteDrawer
				key={editingRoute?.id ?? `new-${prefillFromZoneId}-${prefillToZoneId}`}
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				route={editingRoute}
				onSubmit={handleSubmit}
				isLoading={isSubmitting}
				zones={zones}
				vehicleCategories={vehicleCategories}
				prefillFromZoneId={prefillFromZoneId}
				prefillToZoneId={prefillToZoneId}
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
