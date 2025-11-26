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
import { Input } from "@ui/components/input";
import { useToast } from "@ui/hooks/use-toast";
import { PlusIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { ZoneDrawer, ZonesOverviewMap, ZonesTable } from "@saas/pricing/components";
import type {
	PricingZone,
	PricingZoneFormData,
	PricingZonesListResponse,
} from "@saas/pricing/types";
import { PageHeader } from "@saas/shared/components/PageHeader";

export default function ZonesPage() {
	const t = useTranslations();
	const { toast } = useToast();

	const [zones, setZones] = useState<PricingZone[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);
	const [selectedZoneId, setSelectedZoneId] = useState<string | null>(null);
	const [draftCenter, setDraftCenter] = useState<
		{ centerLatitude: number; centerLongitude: number } | null
	>(null);

	// Drawer state
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingZone, setEditingZone] = useState<PricingZone | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Delete dialog state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingZone, setDeletingZone] = useState<PricingZone | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	// Fetch Google Maps API key
	useEffect(() => {
		const fetchApiKey = async () => {
			try {
				const response = await fetch("/api/vtc/settings/integrations/google-maps-key");
				if (response.ok) {
					const data = await response.json();
					setGoogleMapsApiKey(data.key);
				}
			} catch {
				// Silently fail, map will show "no API key" message
			}
		};
		fetchApiKey();
	}, []);

	const fetchZones = useCallback(async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: "20",
				...(search && { search }),
			});

			const response = await fetch(`/api/vtc/pricing/zones?${params}`);
			if (!response.ok) throw new Error("Failed to fetch zones");

			const data: PricingZonesListResponse = await response.json();
			setZones(data.data);
			setTotalPages(data.meta.totalPages);
		} catch {
			toast({
				title: t("common.error"),
				description: t("pricing.zones.fetchError"),
				variant: "error",
			});
		} finally {
			setIsLoading(false);
		}
	}, [page, search, t, toast]);

	useEffect(() => {
		fetchZones();
	}, [fetchZones]);

	// Ensure a zone is selected when the list changes
	useEffect(() => {
		if (zones.length > 0 && !selectedZoneId) {
			setSelectedZoneId(zones[0]?.id ?? null);
		}
	}, [zones, selectedZoneId]);

	const handleCreateFromMap = (lat: number, lng: number) => {
		setEditingZone(null);
		setDraftCenter({ centerLatitude: lat, centerLongitude: lng });
		setDrawerOpen(true);
	};

	const handleAddZone = () => {
		setEditingZone(null);
		setDraftCenter(null);
		setDrawerOpen(true);
	};

	const handleEditZone = (zone: PricingZone) => {
		setEditingZone(zone);
		setDraftCenter(null);
		setDrawerOpen(true);
	};

	const handleDeleteZone = (zone: PricingZone) => {
		setDeletingZone(zone);
		setDeleteDialogOpen(true);
	};

	const handleSubmit = async (data: PricingZoneFormData) => {
		setIsSubmitting(true);
		try {
			const url = editingZone
				? `/api/vtc/pricing/zones/${editingZone.id}`
				: "/api/vtc/pricing/zones";
			const method = editingZone ? "PATCH" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(data),
			});

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to save zone");
			}

			toast({
				title: t("common.success"),
				description: editingZone
					? t("pricing.zones.updateSuccess")
					: t("pricing.zones.createSuccess"),
			});

			setDrawerOpen(false);
			fetchZones();
		} catch (error) {
			toast({
				title: t("common.error"),
				description:
					error instanceof Error ? error.message : t("pricing.zones.saveError"),
				variant: "error",
			});
		} finally {
			setIsSubmitting(false);
		}
	};

	const confirmDelete = async () => {
		if (!deletingZone) return;

		setIsDeleting(true);
		try {
			const response = await fetch(
				`/api/vtc/pricing/zones/${deletingZone.id}`,
				{
					method: "DELETE",
				},
			);

			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.message || "Failed to delete zone");
			}

			toast({
				title: t("common.success"),
				description: t("pricing.zones.deleteSuccess"),
			});

			setDeleteDialogOpen(false);
			fetchZones();
		} catch (error) {
			toast({
				title: t("common.error"),
				description:
					error instanceof Error
						? error.message
						: t("pricing.zones.deleteError"),
				variant: "error",
			});
		} finally {
			setIsDeleting(false);
		}
	};

	return (
		<>
			<PageHeader
				title={t("pricing.zones.title")}
				subtitle={t("pricing.zones.description")}
			/>

			<div className="container max-w-6xl py-6 space-y-6">
				<div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.4fr)]">
					{/* Map column */}
					<div className="space-y-4">
						<ZonesOverviewMap
							zones={zones}
							selectedZoneId={selectedZoneId}
							onSelectZone={(zone) => setSelectedZoneId(zone.id)}
							onCreateFromMap={handleCreateFromMap}
							googleMapsApiKey={googleMapsApiKey}
						/>
					</div>

					{/* Right column: search + list */}
					<div className="space-y-4">
						<div className="flex items-center justify-between gap-2">
							<div className="relative flex-1">
								<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder={t("pricing.zones.searchPlaceholder")}
									value={search}
									onChange={(e) => {
										setSearch(e.target.value);
										setPage(1);
									}}
									className="pl-9"
								/>
							</div>
							<Button size="sm" onClick={handleAddZone}>
								<PlusIcon className="h-4 w-4 mr-2" />
								{t("pricing.zones.addZone")}
							</Button>
						</div>

						<div className="rounded-lg border bg-card">
							<ZonesTable
								zones={zones}
								onEdit={handleEditZone}
								onDelete={handleDeleteZone}
								isLoading={isLoading}
								selectedZoneId={selectedZoneId}
								onSelectZone={(zone) => setSelectedZoneId(zone.id)}
							/>
						</div>

						{totalPages > 1 && (
							<div className="flex justify-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
								>
									{t("common.previous")}
								</Button>
								<span className="flex items-center px-4 text-sm text-muted-foreground">
									{t("common.pageOf", { page, total: totalPages })}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
									disabled={page === totalPages}
								>
									{t("common.next")}
								</Button>
							</div>
						)}
					</div>
				</div>

				{/* Zone Drawer */}
				<ZoneDrawer
					open={drawerOpen}
					onOpenChange={setDrawerOpen}
					zone={editingZone}
					zones={zones}
					onSubmit={handleSubmit}
					isSubmitting={isSubmitting}
					googleMapsApiKey={googleMapsApiKey}
					initialZoneType={draftCenter ? "RADIUS" : undefined}
					initialCenterLatitude={draftCenter?.centerLatitude ?? null}
					initialCenterLongitude={draftCenter?.centerLongitude ?? null}
					initialRadiusKm={draftCenter ? 5 : null}
					initialGeometry={null}
				/>

				{/* Delete Confirmation Dialog */}
				<AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
					<AlertDialogContent>
						<AlertDialogHeader>
							<AlertDialogTitle>
								{t("pricing.zones.deleteConfirmTitle")}
							</AlertDialogTitle>
							<AlertDialogDescription>
								{t("pricing.zones.deleteConfirmDescription", {
									name: deletingZone?.name ?? "",
								})}
							</AlertDialogDescription>
						</AlertDialogHeader>
						<AlertDialogFooter>
							<AlertDialogCancel disabled={isDeleting}>
								{t("common.confirmation.cancel")}
							</AlertDialogCancel>
							<AlertDialogAction
								onClick={confirmDelete}
								disabled={isDeleting}
								className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							>
								{isDeleting ? t("common.deleting") : t("common.delete")}
							</AlertDialogAction>
						</AlertDialogFooter>
					</AlertDialogContent>
				</AlertDialog>
			</div>
		</>
	);
}
