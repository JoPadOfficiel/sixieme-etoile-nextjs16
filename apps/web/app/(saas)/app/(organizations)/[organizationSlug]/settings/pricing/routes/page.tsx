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
import { useCallback, useEffect, useState, useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import {
	CoverageMatrix,
	CoverageStatsCard,
	RouteDrawer,
	RoutesTable,
	PartnerAssignmentDialog,
} from "@saas/pricing/components";
import type {
	CoverageStats,
	MatrixCell,
	MatrixData,
} from "@saas/pricing/components";
import type {
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
	const [isStatsLoading, setIsStatsLoading] = useState(true);
	const [isMatrixLoading, setIsMatrixLoading] = useState(false);
	const [viewMode, setViewMode] = useState<ViewMode>("list");

	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [total, setTotal] = useState(0);
	const limit = 20;

	const [search, setSearch] = useState("");
	const [zoneId, setZoneId] = useState("all");
	const [vehicleCategoryId, setVehicleCategoryId] = useState("all");
	const [statusFilter, setStatusFilter] = useState("all");

	// Prefill for creating route from matrix
	const [prefillFromZoneId, setPrefillFromZoneId] = useState<string | null>(null);
	const [prefillToZoneId, setPrefillToZoneId] = useState<string | null>(null);

	// Deep linking state
	const [selectedRouteId, setSelectedRouteId] = useQueryState("id", parseAsString);
	const [deepLinkedRoute, setDeepLinkedRoute] = useState<ZoneRoute | null>(null);
	const [isDeepLinkLoading, setIsDeepLinkLoading] = useState(false);

	const [drawerOpen, setDrawerOpen] = useState(false);
	
	// Create editingRoute derived from deep link or manual selection
	// Note: We don't use useMemo purely because we need to handle "new" state which is separate
	// But effectively: if selectedRouteId set, we try to use loaded deepLinkedRoute
	const editingRoute = useMemo(() => {
		if (selectedRouteId && deepLinkedRoute && deepLinkedRoute.id === selectedRouteId) {
			return deepLinkedRoute;
		}
		return null;
	}, [selectedRouteId, deepLinkedRoute]);

	// Fetch specific route if ID in URL
	useEffect(() => {
		const fetchDeepLinkRoute = async () => {
			if (!selectedRouteId) {
				setDeepLinkedRoute(null);
				return;
			}
			
			// If we already have it in the list, use it (optimization)
			const existing = routes.find(r => r.id === selectedRouteId);
			if (existing) {
				setDeepLinkedRoute(existing);
				setDrawerOpen(true);
				return;
			}

			setIsDeepLinkLoading(true);
			try {
				const response = await fetch(`/api/vtc/pricing/routes/${selectedRouteId}`);
				if (response.ok) {
					const data = await response.json();
					setDeepLinkedRoute(data);
					setDrawerOpen(true);
				} else {
					// Route not found or error
					toast({
						title: t("common.error"),
						description: t("routes.errors.notFound"),
						variant: "error"
					});
					setSelectedRouteId(null);
				}
			} catch (e) {
				console.error(e);
			} finally {
				setIsDeepLinkLoading(false);
			}
		};

		fetchDeepLinkRoute();
	}, [selectedRouteId, routes, toast, t, setSelectedRouteId]);

	// Handle drawer close to clear URL
	const handleDrawerOpenChange = (open: boolean) => {
		setDrawerOpen(open);
		if (!open && selectedRouteId) {
			setSelectedRouteId(null);
			setDeepLinkedRoute(null);
		}
	};

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [routeToDelete, setRouteToDelete] = useState<ZoneRoute | null>(null);

	// Story 14.6: Partner assignment dialog
	const [partnerDialogOpen, setPartnerDialogOpen] = useState(false);
	const [routeForPartners, setRouteForPartners] = useState<ZoneRoute | null>(null);

	const fetchRoutes = useCallback(async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});

			if (search) params.set("search", search);
			if (zoneId !== "all") params.set("zoneId", zoneId);
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

	const fetchCoverageStats = useCallback(async () => {
		setIsStatsLoading(true);
		try {
			const response = await fetch("/api/vtc/pricing/routes/coverage");
			if (!response.ok) throw new Error("Failed to fetch coverage stats");
			const data = await response.json();
			setCoverageStats(data);
		} catch (error) {
			console.error("Error fetching coverage stats:", error);
		} finally {
			setIsStatsLoading(false);
		}
	}, []);

	const fetchMatrixData = useCallback(async () => {
		setIsMatrixLoading(true);
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
			setIsMatrixLoading(false);
		}
	}, [vehicleCategoryId]);

	useEffect(() => {
		fetchZones();
		fetchVehicleCategories();
		fetchCoverageStats();
	}, [fetchZones, fetchVehicleCategories, fetchCoverageStats]);

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
	}, [search, zoneId, vehicleCategoryId, statusFilter]);

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
			setSelectedRouteId(null); // Clear deep link
			setDeepLinkedRoute(null);
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
		setSelectedRouteId(route.id);
		// Drawer open handled by effect
	};

	const handleDeleteClick = (route: ZoneRoute) => {
		setRouteToDelete(route);
		setDeleteDialogOpen(true);
	};

	// Story 14.6: Handle partner assignment
	const handleAssignPartners = (route: ZoneRoute) => {
		setRouteForPartners(route);
		setPartnerDialogOpen(true);
	};

	const handleAddNew = () => {
		setSelectedRouteId(null); // Ensure no deep link
		setDeepLinkedRoute(null);
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
			setSelectedRouteId(null);
			setDeepLinkedRoute(null);
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
			<CoverageStatsCard stats={coverageStats} isLoading={isStatsLoading} />

			{/* List or Matrix View */}
			{viewMode === "list" ? (
				<RoutesTable
					routes={routes}
					zones={zones}
					vehicleCategories={vehicleCategories}
					isLoading={isLoading}
					onEdit={handleEdit}
					onDelete={handleDeleteClick}
					// Story 14.6: Partner assignment
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
			) : (
				<CoverageMatrix
					data={matrixData}
					isLoading={isMatrixLoading}
					onCellClick={handleMatrixCellClick}
				/>
			)}

			<RouteDrawer
				key={editingRoute?.id ?? `new-${prefillFromZoneId}-${prefillToZoneId}`}
				open={drawerOpen}
				onOpenChange={handleDrawerOpenChange}
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
								fromZone: routeToDelete?.fromZone?.name ?? "",
								toZone: routeToDelete?.toZone?.name ?? "",
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
			{routeForPartners && (
				<PartnerAssignmentDialog
					open={partnerDialogOpen}
					onOpenChange={setPartnerDialogOpen}
					itemId={routeForPartners.id}
					itemType="route"
					catalogPrice={routeForPartners.fixedPrice}
					itemLabel={`${routeForPartners.fromZone?.name ?? "?"} → ${routeForPartners.toZone?.name ?? "?"}`}
					onSuccess={() => {
						fetchRoutes();
					}}
				/>
			)}
		</div>
	);
}
