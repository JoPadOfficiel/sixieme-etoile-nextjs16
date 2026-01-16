"use client";

/**
 * Zone Management Layout Component
 * Story 11.1: Unified Zone Management Interface with Interactive Map
 *
 * Two-panel layout: left sidebar with zone list, right panel with interactive map
 */

import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useQueryState, parseAsString } from "nuqs";
import { useCallback, useEffect, useState, useMemo } from "react";
import type { PricingZone, PricingZoneFormData, PricingZonesListResponse } from "../types";
import { ZoneDrawer } from "./ZoneDrawer";
import { ZoneQuickEditPanel } from "./ZoneQuickEditPanel";
import { ZoneSidebarList } from "./ZoneSidebarList";
import { ZonesInteractiveMap } from "./ZonesInteractiveMap";
import { type ZoneValidationResult, ZoneValidationResultsPanel } from "./ZoneValidationResultsPanel";

type StatusFilter = "all" | "active" | "inactive";

interface ZoneManagementLayoutProps {
	googleMapsApiKey: string | null;
}

export function ZoneManagementLayout({
	googleMapsApiKey,
}: ZoneManagementLayoutProps) {
	const t = useTranslations();
	const { toast } = useToast();

	// State
	const [zones, setZones] = useState<PricingZone[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	
	// Deep Linking: use ID from URL
	const [selectedZoneId, setSelectedZoneId] = useQueryState("id", parseAsString);
	
	const selectedZone = useMemo(() => 
		zones.find((z) => z.id === selectedZoneId) || null
	, [zones, selectedZoneId]);

	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

	// Drawer state
	const [isDrawerOpen, setIsDrawerOpen] = useState(false);
	const [editingZone, setEditingZone] = useState<PricingZone | null>(null);
	const [isSubmitting, setIsSubmitting] = useState(false);

	// Initial geometry from map drawing
	const [initialDrawingData, setInitialDrawingData] = useState<{
		zoneType: "POLYGON" | "RADIUS";
		geometry?: unknown;
		centerLatitude?: number;
		centerLongitude?: number;
		radiusKm?: number;
	} | null>(null);

	// Story 17.11: Validation state
	const [isValidating, setIsValidating] = useState(false);
	const [validationResult, setValidationResult] = useState<ZoneValidationResult | null>(null);

	// Fetch zones
	const fetchZones = useCallback(async () => {
		setIsLoading(true);
		try {
			const params = new URLSearchParams({
				limit: "100", // Get all zones for map display
				...(search && { search }),
			});

			const response = await fetch(`/api/vtc/pricing/zones?${params}`);
			if (!response.ok) throw new Error("Failed to fetch zones");

			const data: PricingZonesListResponse = await response.json();
			setZones(data.data);
		} catch {
			toast({
				title: t("common.error"),
				description: t("pricing.zones.fetchError"),
				variant: "error",
			});
		} finally {
			setIsLoading(false);
		}
	}, [search, t, toast]);

	useEffect(() => {
		fetchZones();
	}, [fetchZones]);

	// Handle zone selection from list or map
	const handleSelectZone = useCallback((zone: PricingZone) => {
		setSelectedZoneId(zone.id);
	}, [setSelectedZoneId]);

	// Handle double-click to edit
	const handleDoubleClickZone = useCallback((zone: PricingZone) => {
		setEditingZone(zone);
		setInitialDrawingData(null);
		setIsDrawerOpen(true);
	}, []);

	// Handle add zone button
	const handleAddZone = useCallback(() => {
		setEditingZone(null);
		setInitialDrawingData(null);
		setIsDrawerOpen(true);
	}, []);

	// Handle zone creation from map drawing
	const handleCreateFromDrawing = useCallback(
		(data: {
			zoneType: "POLYGON" | "RADIUS";
			geometry?: unknown;
			centerLatitude?: number;
			centerLongitude?: number;
			radiusKm?: number;
		}) => {
			setEditingZone(null);
			setInitialDrawingData(data);
			setIsDrawerOpen(true);
		},
		[]
	);

	// Handle edit from quick panel
	const handleEditZone = useCallback(() => {
		if (selectedZone) {
			setEditingZone(selectedZone);
			setInitialDrawingData(null);
			setIsDrawerOpen(true);
		}
	}, [selectedZone]);

	// Handle delete
	const handleDeleteZone = useCallback(async () => {
		if (!selectedZone) return;

		if (!confirm(t("pricing.zones.confirmDelete", { name: selectedZone.name }))) {
			return;
		}

		try {
			const response = await fetch(`/api/vtc/pricing/zones/${selectedZone.id}`, {
				method: "DELETE",
			});

			if (!response.ok) throw new Error("Failed to delete zone");

			toast({
				title: t("common.success"),
				description: t("pricing.zones.deleteSuccess"),
			});

			setSelectedZoneId(null);
			fetchZones();
		} catch {
			toast({
				title: t("common.error"),
				description: t("pricing.zones.deleteError"),
				variant: "error",
			});
		}
	}, [selectedZone, t, toast, fetchZones, setSelectedZoneId]);

	// Handle form submit
	const handleSubmit = useCallback(
		async (data: PricingZoneFormData) => {
			setIsSubmitting(true);
			try {
				const url = editingZone
					? `/api/vtc/pricing/zones/${editingZone.id}`
					: "/api/vtc/pricing/zones";

				const response = await fetch(url, {
					method: editingZone ? "PATCH" : "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(data),
				});

				if (!response.ok) throw new Error("Failed to save zone");

				toast({
					title: t("common.success"),
					description: editingZone
						? t("pricing.zones.updateSuccess")
						: t("pricing.zones.createSuccess"),
				});

				setIsDrawerOpen(false);
				setEditingZone(null);
				setInitialDrawingData(null);
				fetchZones();
			} catch {
				toast({
					title: t("common.error"),
					description: t("pricing.zones.saveError"),
					variant: "error",
				});
			} finally {
				setIsSubmitting(false);
			}
		},
		[editingZone, t, toast, fetchZones]
	);

	// Close quick edit panel
	const handleCloseQuickEdit = useCallback(() => {
		setSelectedZoneId(null);
	}, [setSelectedZoneId]);

	// Story 17.11: Handle zone topology validation
	const handleValidate = useCallback(async () => {
		setIsValidating(true);
		setValidationResult(null);
		try {
			const response = await fetch("/api/vtc/pricing/zones/validate", {
				method: "POST",
			});
			if (!response.ok) throw new Error("Failed to validate zones");

			const result: ZoneValidationResult = await response.json();
			setValidationResult(result);

			if (result.isValid && result.overlaps.length === 0 && result.missingFields.length === 0) {
				toast({
					title: t("common.success"),
					description: t("pricing.zones.validation.noIssues"),
				});
			}
		} catch {
			toast({
				title: t("common.error"),
				description: t("pricing.zones.validation.error"),
				variant: "error",
			});
		} finally {
			setIsValidating(false);
		}
	}, [t, toast]);

	// Handle zone selection from validation panel
	const handleSelectZoneById = useCallback((zoneId: string) => {
		const zone = zones.find((z) => z.id === zoneId);
		if (zone) {
			setSelectedZoneId(zone.id);
			setValidationResult(null);
		}
	}, [zones, setSelectedZoneId]);

	return (
		<div className="flex h-[calc(100vh-12rem)] gap-0 rounded-lg border overflow-hidden">
			{/* Left Sidebar - Zone List */}
			<div className="w-[340px] shrink-0 border-r bg-background">
				<ZoneSidebarList
					zones={zones}
					isLoading={isLoading}
					selectedZoneId={selectedZone?.id ?? null}
					onSelectZone={handleSelectZone}
					onAddZone={handleAddZone}
					onDoubleClickZone={handleDoubleClickZone}
					search={search}
					onSearchChange={setSearch}
					statusFilter={statusFilter}
					onStatusFilterChange={setStatusFilter}
				/>
			</div>

			{/* Right Panel - Interactive Map */}
			<div className="relative flex-1 bg-muted/30">
				<ZonesInteractiveMap
					zones={zones}
					selectedZoneId={selectedZone?.id ?? null}
					onSelectZone={handleSelectZone}
					onCreateFromDrawing={handleCreateFromDrawing}
					googleMapsApiKey={googleMapsApiKey}
					statusFilter={statusFilter}
					onValidate={handleValidate}
					isValidating={isValidating}
				/>

				{/* Quick Edit Panel */}
				{selectedZone && (
					<ZoneQuickEditPanel
						zone={selectedZone}
						onEdit={handleEditZone}
						onDelete={handleDeleteZone}
						onClose={handleCloseQuickEdit}
					/>
				)}

				{/* Story 17.11: Validation Results Panel */}
				{validationResult && (
					<ZoneValidationResultsPanel
						result={validationResult}
						onClose={() => setValidationResult(null)}
						onSelectZone={handleSelectZoneById}
					/>
				)}
			</div>

			{/* Zone Drawer */}
			<ZoneDrawer
				open={isDrawerOpen}
				onOpenChange={setIsDrawerOpen}
				zone={editingZone}
				zones={zones}
				onSubmit={handleSubmit}
				isSubmitting={isSubmitting}
				googleMapsApiKey={googleMapsApiKey}
				initialZoneType={initialDrawingData?.zoneType}
				initialCenterLatitude={initialDrawingData?.centerLatitude}
				initialCenterLongitude={initialDrawingData?.centerLongitude}
				initialRadiusKm={initialDrawingData?.radiusKm}
				initialGeometry={initialDrawingData?.geometry}
			/>
		</div>
	);
}
