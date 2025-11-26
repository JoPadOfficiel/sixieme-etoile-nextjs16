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
import { ZoneDrawer, ZonesTable } from "@saas/pricing/components";
import type {
	PricingZone,
	PricingZoneFormData,
	PricingZonesListResponse,
} from "@saas/pricing/types";

export default function SettingsPricingZonesPage() {
	const t = useTranslations();
	const { toast } = useToast();

	const [zones, setZones] = useState<PricingZone[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const [totalPages, setTotalPages] = useState(1);
	const [googleMapsApiKey, setGoogleMapsApiKey] = useState<string | null>(null);

	const [drawerOpen, setDrawerOpen] = useState(false);
	const [editingZone, setEditingZone] = useState<PricingZone | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const [deletingZone, setDeletingZone] = useState<PricingZone | null>(null);
	const [isDeleting, setIsDeleting] = useState(false);

	useEffect(() => {
		const fetchApiKey = async () => {
			try {
				const response = await fetch(
"/api/vtc/settings/integrations/google-maps-key"
);
				if (response.ok) {
					const data = await response.json();
					setGoogleMapsApiKey(data.key);
				}
			} catch {
				// Silently fail
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

	const handleAddZone = () => {
		setEditingZone(null);
		setDrawerOpen(true);
	};

	const handleEditZone = (zone: PricingZone) => {
		setEditingZone(zone);
		setDrawerOpen(true);
	};

	const handleDeleteZone = (zone: PricingZone) => {
		setDeletingZone(zone);
		setDeleteDialogOpen(true);
	};

	const handleSubmitZone = async (data: PricingZoneFormData) => {
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
			setEditingZone(null);
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
{ method: "DELETE" }
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
			setDeletingZone(null);
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
<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div className="relative w-64">
					<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={t("pricing.zones.search")}
						value={search}
						onChange={(e) => setSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button onClick={handleAddZone}>
					<PlusIcon className="mr-2 size-4" />
					{t("pricing.zones.addZone")}
				</Button>
			</div>

			<ZonesTable
				zones={zones}
				isLoading={isLoading}
				onEdit={handleEditZone}
				onDelete={handleDeleteZone}
				page={page}
				totalPages={totalPages}
				onPageChange={setPage}
			/>

			<ZoneDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				zone={editingZone}
				zones={zones}
				onSubmit={handleSubmitZone}
				googleMapsApiKey={googleMapsApiKey}
			/>

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
							{t("common.cancel")}
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
	);
}
