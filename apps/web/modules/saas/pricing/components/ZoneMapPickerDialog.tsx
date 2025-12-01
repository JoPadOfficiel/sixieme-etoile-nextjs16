"use client";

/**
 * Zone Map Picker Dialog
 * Story 14.4: Interactive Map for Zone Selection
 *
 * Dialog that displays zones on a map for visual multi-selection.
 * Users can click on zone polygons to select/deselect them.
 */

/// <reference types="@types/google.maps" />

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Card } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapPinIcon, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useCallback, useRef, useEffect } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import type { PricingZone } from "../types";

interface ZoneMapPickerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	zones: PricingZone[];
	selectedIds: string[];
	onConfirm: (selectedIds: string[]) => void;
	googleMapsApiKey: string | null;
}

// Zone colors
const ZONE_COLORS = {
	default: { fill: "#6b7280", stroke: "#4b5563" }, // gray
	selected: { fill: "#3b82f6", stroke: "#2563eb" }, // blue
	hover: { fill: "#60a5fa", stroke: "#3b82f6" }, // light blue
};

type ZoneOverlay = {
	zone: PricingZone;
	overlay: google.maps.Polygon | google.maps.Circle;
	isSelected: boolean;
};

export function ZoneMapPickerDialog({
	open,
	onOpenChange,
	zones,
	selectedIds,
	onConfirm,
	googleMapsApiKey,
}: ZoneMapPickerDialogProps) {
	const t = useTranslations();
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const overlaysRef = useRef<Map<string, ZoneOverlay>>(new Map());
	const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

	const [localSelectedIds, setLocalSelectedIds] = useState<string[]>(selectedIds);
	const [mapReady, setMapReady] = useState(false);

	const isGoogleLoaded = useGoogleMaps(googleMapsApiKey);

	// Reset local selection when dialog opens
	useEffect(() => {
		if (open) {
			// Small delay to ensure DOM is ready
			const timer = setTimeout(() => setMapReady(true), 100);
			return () => {
				clearTimeout(timer);
				setMapReady(false);
			};
		}
	}, [open]);

	// Track previous open state to detect when dialog opens
	const prevOpenRef = useRef(open);
	useEffect(() => {
		// When dialog transitions from closed to open, sync selection
		if (open && !prevOpenRef.current) {
			// This setState is intentional - we need to sync local state with props when dialog opens
			/* eslint-disable-next-line react-compiler/react-compiler */
			setLocalSelectedIds(selectedIds);
		}
		prevOpenRef.current = open;
	}, [open, selectedIds]);

	// Toggle zone selection
	const toggleZoneSelection = useCallback((zoneId: string) => {
		setLocalSelectedIds((prev) => {
			if (prev.includes(zoneId)) {
				return prev.filter((id) => id !== zoneId);
			}
			return [...prev, zoneId];
		});
	}, []);

	// Update overlay styling based on selection
	const updateOverlayStyle = useCallback((zoneId: string, isSelected: boolean, isHovered = false) => {
		const overlayData = overlaysRef.current.get(zoneId);
		if (!overlayData) return;

		const colors = isSelected
			? ZONE_COLORS.selected
			: isHovered
				? ZONE_COLORS.hover
				: ZONE_COLORS.default;

		overlayData.overlay.setOptions({
			fillColor: colors.fill,
			fillOpacity: isSelected ? 0.5 : isHovered ? 0.4 : 0.25,
			strokeColor: colors.stroke,
			strokeWeight: isSelected ? 3 : 2,
		});

		overlayData.isSelected = isSelected;
	}, []);

	// Update all overlays when selection changes
	useEffect(() => {
		overlaysRef.current.forEach((overlayData, zoneId) => {
			const isSelected = localSelectedIds.includes(zoneId);
			updateOverlayStyle(zoneId, isSelected);
		});
	}, [localSelectedIds, updateOverlayStyle]);

	// Initialize map and draw zones
	useEffect(() => {
		if (!open || !mapReady || !isGoogleLoaded || !mapRef.current) return;

		// Clean up previous map instance
		if (mapInstanceRef.current) {
			overlaysRef.current.forEach((data) => data.overlay.setMap(null));
			overlaysRef.current.clear();
		}

		// Create map
		const map = new google.maps.Map(mapRef.current, {
			center: { lat: 48.8566, lng: 2.3522 }, // Paris
			zoom: 10,
			streetViewControl: false,
			fullscreenControl: false,
			mapTypeControl: false,
			clickableIcons: false,
		});

		mapInstanceRef.current = map;

		// Create info window for hover
		infoWindowRef.current = new google.maps.InfoWindow();

		const bounds = new google.maps.LatLngBounds();
		let hasValidZones = false;

		// Draw each zone
		zones.forEach((zone) => {
			const isSelected = localSelectedIds.includes(zone.id);
			const colors = isSelected ? ZONE_COLORS.selected : ZONE_COLORS.default;

			let overlay: google.maps.Polygon | google.maps.Circle | null = null;

			// Helper to validate coordinates
			const isValidCoord = (lat: number | null, lng: number | null): boolean => {
				return lat !== null && lng !== null &&
					!Number.isNaN(lat) && !Number.isNaN(lng) &&
					Number.isFinite(lat) && Number.isFinite(lng);
			};

			if (
				zone.zoneType === "RADIUS" &&
				isValidCoord(zone.centerLatitude, zone.centerLongitude) &&
				zone.radiusKm !== null &&
				!Number.isNaN(zone.radiusKm)
			) {
				const circle = new google.maps.Circle({
					map,
					center: {
						lat: zone.centerLatitude as number,
						lng: zone.centerLongitude as number,
					},
					radius: zone.radiusKm * 1000,
					fillColor: colors.fill,
					fillOpacity: isSelected ? 0.5 : 0.25,
					strokeColor: colors.stroke,
					strokeOpacity: 0.9,
					strokeWeight: isSelected ? 3 : 2,
					clickable: true,
				});

				const circleBounds = circle.getBounds();
				if (circleBounds) {
					bounds.union(circleBounds);
					hasValidZones = true;
				}

				overlay = circle;
			} else if (zone.zoneType === "POLYGON" && zone.geometry) {
				try {
					const geo = zone.geometry as {
						type: string;
						coordinates: number[][][];
					};
					if (geo.type === "Polygon" && geo.coordinates?.[0]?.length) {
						const validCoords = geo.coordinates[0].filter(
							([lng, lat]) => Number.isFinite(lat) && Number.isFinite(lng)
						);
						if (validCoords.length >= 3) {
							const path = validCoords.map(
								([lng, lat]) => new google.maps.LatLng(lat, lng)
							);

							const polygon = new google.maps.Polygon({
								map,
								paths: path,
								fillColor: colors.fill,
								fillOpacity: isSelected ? 0.5 : 0.25,
								strokeColor: colors.stroke,
								strokeOpacity: 0.9,
								strokeWeight: isSelected ? 3 : 2,
								clickable: true,
							});

							path.forEach((p) => bounds.extend(p));
							hasValidZones = true;

							overlay = polygon;
						}
					}
				} catch {
					// Ignore invalid geometry
				}
			}

			if (overlay) {
				// Store overlay reference
				overlaysRef.current.set(zone.id, {
					zone,
					overlay,
					isSelected,
				});

				// Click handler - toggle selection
				overlay.addListener("click", () => {
					toggleZoneSelection(zone.id);
				});

				// Hover handlers
				overlay.addListener("mouseover", (e: google.maps.MapMouseEvent) => {
					const currentlySelected = localSelectedIds.includes(zone.id);
					if (!currentlySelected) {
						updateOverlayStyle(zone.id, false, true);
					}

					// Show info window
					if (infoWindowRef.current && e.latLng) {
						infoWindowRef.current.setContent(`
							<div style="padding: 4px 8px;">
								<strong>${zone.name}</strong>
								<br/>
								<span style="color: #666; font-size: 12px;">${zone.code}</span>
							</div>
						`);
						infoWindowRef.current.setPosition(e.latLng);
						infoWindowRef.current.open(map);
					}
				});

				overlay.addListener("mouseout", () => {
					const currentlySelected = localSelectedIds.includes(zone.id);
					updateOverlayStyle(zone.id, currentlySelected, false);

					// Close info window
					if (infoWindowRef.current) {
						infoWindowRef.current.close();
					}
				});
			}
		});

		// Fit bounds if we have valid zones
		if (hasValidZones && !bounds.isEmpty()) {
			map.fitBounds(bounds, 50);
		}

		// Cleanup
		const currentOverlays = overlaysRef.current;
		const currentInfoWindow = infoWindowRef.current;
		return () => {
			currentOverlays.forEach((data) => data.overlay.setMap(null));
			currentOverlays.clear();
			if (currentInfoWindow) {
				currentInfoWindow.close();
			}
		};
	}, [open, mapReady, isGoogleLoaded, zones, toggleZoneSelection, updateOverlayStyle, localSelectedIds]);

	// Handle confirm
	const handleConfirm = useCallback(() => {
		onConfirm(localSelectedIds);
		onOpenChange(false);
	}, [localSelectedIds, onConfirm, onOpenChange]);

	// Handle cancel
	const handleCancel = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	// Get selected zones for display
	const selectedZones = zones.filter((z) => localSelectedIds.includes(z.id));

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[900px] max-h-[90vh]">
				<DialogHeader>
					<DialogTitle>{t("pricing.zones.map.selectZones")}</DialogTitle>
					<DialogDescription>
						{t("pricing.zones.map.clickToSelect")}
					</DialogDescription>
				</DialogHeader>

				<div className="flex gap-4 h-[500px]">
					{/* Map */}
					<div className="flex-1 relative rounded-lg overflow-hidden border">
						{!googleMapsApiKey ? (
							<Card className="flex h-full items-center justify-center text-muted-foreground">
								<div className="flex flex-col items-center gap-2 text-center p-8">
									<MapPinIcon className="h-12 w-12" />
									<p className="text-sm font-medium">{t("common.map.noApiKey")}</p>
								</div>
							</Card>
						) : !isGoogleLoaded || !mapReady ? (
							<Skeleton className="h-full w-full" />
						) : (
							<div ref={mapRef} className="h-full w-full" />
						)}
					</div>

					{/* Selected zones sidebar */}
					<div className="w-[200px] flex flex-col">
						<div className="text-sm font-medium mb-2">
							{t("pricing.zones.map.selectedZones")} ({selectedZones.length})
						</div>
						<div className="flex-1 border rounded-md p-2 overflow-y-auto">
							{selectedZones.length === 0 ? (
								<p className="text-sm text-muted-foreground italic p-2">
									{t("pricing.zones.map.noZonesSelected")}
								</p>
							) : (
								<div className="space-y-1">
									{selectedZones.map((zone) => (
										<div
											key={zone.id}
											className="flex items-center justify-between p-2 rounded-md bg-muted/50 hover:bg-muted"
										>
											<div className="flex-1 min-w-0">
												<div className="text-sm font-medium truncate">{zone.name}</div>
												<div className="text-xs text-muted-foreground">{zone.code}</div>
											</div>
											<Button
												variant="ghost"
												size="icon"
												className="h-6 w-6 shrink-0"
												onClick={() => toggleZoneSelection(zone.id)}
											>
												<X className="h-3 w-3" />
											</Button>
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						{t("common.cancel")}
					</Button>
					<Button onClick={handleConfirm}>
						{t("pricing.zones.map.confirmSelection")} ({selectedZones.length})
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default ZoneMapPickerDialog;
