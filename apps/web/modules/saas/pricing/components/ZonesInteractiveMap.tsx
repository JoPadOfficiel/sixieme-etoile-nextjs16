"use client";

/**
 * Zones Interactive Map Component
 * Story 11.1: Unified Zone Management Interface with Interactive Map
 *
 * Full-featured map with all zones displayed and drawing tools for zone creation
 */

/// <reference types="@types/google.maps" />

import { Card } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { PricingZone } from "../types";
import { type DrawingMode, ZoneMapToolbar } from "./ZoneMapToolbar";

interface ZonesInteractiveMapProps {
	zones: PricingZone[];
	selectedZoneId: string | null;
	onSelectZone: (zone: PricingZone) => void;
	onCreateFromDrawing: (data: {
		zoneType: "POLYGON" | "RADIUS";
		geometry?: unknown;
		centerLatitude?: number;
		centerLongitude?: number;
		radiusKm?: number;
	}) => void;
	googleMapsApiKey: string | null;
	statusFilter: "all" | "active" | "inactive";
}

type Overlay =
	| { type: "circle"; ref: google.maps.Circle; zone: PricingZone }
	| { type: "polygon"; ref: google.maps.Polygon; zone: PricingZone }
	| { type: "marker"; ref: google.maps.Marker; zone: PricingZone };

// Default zone colors by type (fallback if zone has no color)
const DEFAULT_ZONE_COLORS = {
	RADIUS: { fill: "#10b981", stroke: "#059669" }, // emerald
	POLYGON: { fill: "#3b82f6", stroke: "#2563eb" }, // blue
	POINT: { fill: "#8b5cf6", stroke: "#7c3aed" }, // violet
};

// Helper to get zone colors - uses zone.color if defined, otherwise falls back to type-based color
function getZoneColors(zone: PricingZone): { fill: string; stroke: string } {
	if (zone.color) {
		// Darken the color slightly for stroke
		return { fill: zone.color, stroke: zone.color };
	}
	return DEFAULT_ZONE_COLORS[zone.zoneType] || DEFAULT_ZONE_COLORS.POINT;
}

// GeoJSON types
interface GeoJSONPolygon {
	type: "Polygon";
	coordinates: number[][][];
}

export function ZonesInteractiveMap({
	zones,
	selectedZoneId,
	onSelectZone,
	onCreateFromDrawing,
	googleMapsApiKey,
	statusFilter,
}: ZonesInteractiveMapProps) {
	const t = useTranslations();
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
	const overlaysRef = useRef<Map<string, Overlay>>(new Map());
	const drawnShapeRef = useRef<google.maps.Polygon | google.maps.Circle | null>(null);

	const [isReady, setIsReady] = useState(false);
	const [drawingMode, setDrawingMode] = useState<DrawingMode>("pan");
	const [hasDrawnShape, setHasDrawnShape] = useState(false);

	// Filter zones based on status
	const filteredZones = zones.filter((zone) => {
		if (statusFilter === "active") return zone.isActive;
		if (statusFilter === "inactive") return !zone.isActive;
		return true;
	});

	// Convert polygon to GeoJSON
	const polygonToGeoJSON = useCallback(
		(polygon: google.maps.Polygon): GeoJSONPolygon => {
			const path = polygon.getPath();
			const coordinates: number[][] = [];

			for (let i = 0; i < path.getLength(); i++) {
				const point = path.getAt(i);
				coordinates.push([point.lng(), point.lat()]);
			}

			// Close the polygon
			if (coordinates.length > 0) {
				coordinates.push(coordinates[0]);
			}

			return {
				type: "Polygon",
				coordinates: [coordinates],
			};
		},
		[]
	);

	// Load Google Maps script
	useEffect(() => {
		if (!googleMapsApiKey) return;

		if (window.google?.maps?.drawing) {
			setIsReady(true);
			return;
		}

		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,drawing`;
		script.async = true;
		script.defer = true;
		script.onload = () => setIsReady(true);
		document.head.appendChild(script);
	}, [googleMapsApiKey]);

	// Initialize map
	useEffect(() => {
		if (!isReady || !mapRef.current || mapInstanceRef.current) return;

		const map = new google.maps.Map(mapRef.current, {
			center: { lat: 48.8566, lng: 2.3522 }, // Paris
			zoom: 6,
			streetViewControl: false,
			fullscreenControl: true,
			mapTypeControl: true,
			mapTypeControlOptions: {
				position: google.maps.ControlPosition.TOP_RIGHT,
			},
		});

		mapInstanceRef.current = map;
		// Map is ready

		// Initialize Drawing Manager
		const drawingManager = new google.maps.drawing.DrawingManager({
			drawingMode: null,
			drawingControl: false, // We use custom toolbar
			polygonOptions: {
				fillColor: "#3b82f6",
				fillOpacity: 0.3,
				strokeColor: "#2563eb",
				strokeOpacity: 0.9,
				strokeWeight: 2,
				editable: true,
				draggable: true,
			},
			circleOptions: {
				fillColor: "#10b981",
				fillOpacity: 0.3,
				strokeColor: "#059669",
				strokeOpacity: 0.9,
				strokeWeight: 2,
				editable: true,
				draggable: true,
			},
		});

		drawingManager.setMap(map);
		drawingManagerRef.current = drawingManager;

		// Handle polygon complete
		google.maps.event.addListener(
			drawingManager,
			"polygoncomplete",
			(polygon: google.maps.Polygon) => {
				// Clear any previous drawn shape
				if (drawnShapeRef.current) {
					drawnShapeRef.current.setMap(null);
				}
				drawnShapeRef.current = polygon;
				setHasDrawnShape(true);

				// Stop drawing mode
				drawingManager.setDrawingMode(null);
				setDrawingMode("pan");

				// Get geometry and trigger creation
				const geoJSON = polygonToGeoJSON(polygon);
				const bounds = new google.maps.LatLngBounds();
				polygon.getPath().forEach((point) => bounds.extend(point));
				const center = bounds.getCenter();

				onCreateFromDrawing({
					zoneType: "POLYGON",
					geometry: geoJSON,
					centerLatitude: center.lat(),
					centerLongitude: center.lng(),
				});
			}
		);

		// Handle circle complete
		google.maps.event.addListener(
			drawingManager,
			"circlecomplete",
			(circle: google.maps.Circle) => {
				// Clear any previous drawn shape
				if (drawnShapeRef.current) {
					drawnShapeRef.current.setMap(null);
				}
				drawnShapeRef.current = circle;
				setHasDrawnShape(true);

				// Stop drawing mode
				drawingManager.setDrawingMode(null);
				setDrawingMode("pan");

				// Get center and radius
				const center = circle.getCenter();
				const radiusMeters = circle.getRadius();

				if (center) {
					onCreateFromDrawing({
						zoneType: "RADIUS",
						centerLatitude: center.lat(),
						centerLongitude: center.lng(),
						radiusKm: Math.round((radiusMeters / 1000) * 100) / 100,
					});
				}
			}
		);
	}, [isReady, onCreateFromDrawing, polygonToGeoJSON]);

	// Handle drawing mode change
	const handleModeChange = useCallback((mode: DrawingMode) => {
		setDrawingMode(mode);

		if (!drawingManagerRef.current) return;

		switch (mode) {
			case "polygon":
				drawingManagerRef.current.setDrawingMode(
					google.maps.drawing.OverlayType.POLYGON
				);
				break;
			case "circle":
				drawingManagerRef.current.setDrawingMode(
					google.maps.drawing.OverlayType.CIRCLE
				);
				break;
			default:
				drawingManagerRef.current.setDrawingMode(null);
		}
	}, []);

	// Clear drawn shape
	const handleClearDrawing = useCallback(() => {
		if (drawnShapeRef.current) {
			drawnShapeRef.current.setMap(null);
			drawnShapeRef.current = null;
			setHasDrawnShape(false);
		}
	}, []);

	// Clear all overlays
	const clearOverlays = useCallback(() => {
		overlaysRef.current.forEach((overlay) => {
			overlay.ref.setMap(null);
		});
		overlaysRef.current.clear();
	}, []);

	// Draw zones on map
	useEffect(() => {
		const map = mapInstanceRef.current;
		if (!map || !isReady) return;

		clearOverlays();

		if (!filteredZones.length) return;

		const bounds = new google.maps.LatLngBounds();

		filteredZones.forEach((zone) => {
			const colors = getZoneColors(zone);
			const isSelected = zone.id === selectedZoneId;

			if (
				zone.zoneType === "RADIUS" &&
				zone.centerLatitude !== null &&
				zone.centerLongitude !== null &&
				zone.radiusKm !== null
			) {
				const circle = new google.maps.Circle({
					map,
					center: {
						lat: zone.centerLatitude,
						lng: zone.centerLongitude,
					},
					radius: zone.radiusKm * 1000,
					fillColor: colors.fill,
					fillOpacity: isSelected ? 0.4 : 0.2,
					strokeColor: colors.stroke,
					strokeOpacity: 0.9,
					strokeWeight: isSelected ? 3 : 2,
					clickable: true,
				});

				circle.addListener("click", () => {
					onSelectZone(zone);
				});

				const circleBounds = circle.getBounds();
				if (circleBounds) bounds.union(circleBounds);

				overlaysRef.current.set(zone.id, { type: "circle", ref: circle, zone });
			} else if (zone.zoneType === "POLYGON" && zone.geometry) {
				try {
					const geo = zone.geometry as {
						type: string;
						coordinates: number[][][];
					};
					if (geo.type === "Polygon" && geo.coordinates?.[0]?.length) {
						const path = geo.coordinates[0].map(
							([lng, lat]) => new google.maps.LatLng(lat, lng)
						);
						const polygon = new google.maps.Polygon({
							map,
							paths: path,
							fillColor: colors.fill,
							fillOpacity: isSelected ? 0.4 : 0.2,
							strokeColor: colors.stroke,
							strokeOpacity: 0.9,
							strokeWeight: isSelected ? 3 : 2,
							clickable: true,
						});

						polygon.addListener("click", () => {
							onSelectZone(zone);
						});

						const polyBounds = new google.maps.LatLngBounds();
						path.forEach((p) => polyBounds.extend(p));
						bounds.union(polyBounds);

						overlaysRef.current.set(zone.id, { type: "polygon", ref: polygon, zone });
					}
				} catch {
					// ignore invalid geometry
				}
			} else if (zone.centerLatitude !== null && zone.centerLongitude !== null) {
				const position = {
					lat: zone.centerLatitude,
					lng: zone.centerLongitude,
				};
				const marker = new google.maps.Marker({
					map,
					position,
					title: zone.name,
				});
				marker.addListener("click", () => {
					onSelectZone(zone);
				});
				bounds.extend(position);
				overlaysRef.current.set(zone.id, { type: "marker", ref: marker, zone });
			}
		});

		if (!bounds.isEmpty()) {
			map.fitBounds(bounds);
		}
	}, [filteredZones, selectedZoneId, isReady, onSelectZone, clearOverlays]);

	// Update selected zone highlighting
	useEffect(() => {
		overlaysRef.current.forEach((overlay, id) => {
			const isSelected = id === selectedZoneId;

			if (overlay.type === "circle") {
				overlay.ref.setOptions({
					strokeWeight: isSelected ? 3 : 2,
					fillOpacity: isSelected ? 0.4 : 0.2,
				});
			} else if (overlay.type === "polygon") {
				overlay.ref.setOptions({
					strokeWeight: isSelected ? 3 : 2,
					fillOpacity: isSelected ? 0.4 : 0.2,
				});
			} else if (overlay.type === "marker") {
				overlay.ref.setAnimation(
					isSelected ? google.maps.Animation.BOUNCE : null
				);
			}
		});

		// Zoom to selected zone
		if (selectedZoneId) {
			const overlay = overlaysRef.current.get(selectedZoneId);
			if (overlay && mapInstanceRef.current) {
				if (overlay.type === "circle") {
					const bounds = overlay.ref.getBounds();
					if (bounds) {
						mapInstanceRef.current.fitBounds(bounds);
					}
				} else if (overlay.type === "polygon") {
					const bounds = new google.maps.LatLngBounds();
					overlay.ref.getPath().forEach((point) => bounds.extend(point));
					mapInstanceRef.current.fitBounds(bounds);
				} else if (overlay.type === "marker") {
					const pos = overlay.ref.getPosition();
					if (pos) {
						mapInstanceRef.current.setCenter(pos);
						mapInstanceRef.current.setZoom(14);
					}
				}
			}
		}
	}, [selectedZoneId]);

	if (!googleMapsApiKey) {
		return (
			<Card className="flex h-full items-center justify-center text-muted-foreground">
				<div className="flex flex-col items-center gap-2 text-center p-8">
					<MapPinIcon className="h-12 w-12" />
					<p className="text-sm font-medium">{t("pricing.zones.map.noApiKey")}</p>
					<p className="text-xs">
						{t("pricing.zones.map.configureInSettings")}
					</p>
				</div>
			</Card>
		);
	}

	if (!isReady) {
		return (
			<div className="h-full w-full">
				<Skeleton className="h-full w-full" />
			</div>
		);
	}

	return (
		<div className="relative h-full w-full">
			{/* Drawing Toolbar */}
			<ZoneMapToolbar
				activeMode={drawingMode}
				onModeChange={handleModeChange}
				onClear={handleClearDrawing}
				hasDrawnShape={hasDrawnShape}
			/>

			{/* Map */}
			<div ref={mapRef} className="h-full w-full" />
		</div>
	);
}
