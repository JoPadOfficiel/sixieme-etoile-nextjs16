"use client";

/**
 * Zones Interactive Map Component
 * Story 11.1: Unified Zone Management Interface with Interactive Map
 *
 * Full-featured map with all zones displayed and drawing tools for zone creation.
 * Updated to use Terra Draw instead of deprecated Google Maps Drawing Library.
 */

/// <reference types="@types/google.maps" />

import { Card } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import type { PricingZone } from "../types";
import { type DrawingMode, ZoneMapToolbar } from "./ZoneMapToolbar";

// Terra Draw imports
import { TerraDraw, TerraDrawPolygonMode, TerraDrawCircleMode, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter";

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
	onValidate?: () => void;
	isValidating?: boolean;
}

type Overlay =
	| { type: "circle"; ref: google.maps.Circle; zone: PricingZone; label?: google.maps.Marker }
	| { type: "polygon"; ref: google.maps.Polygon; zone: PricingZone; label?: google.maps.Marker }
	| { type: "marker"; ref: google.maps.Marker; zone: PricingZone; label?: google.maps.Marker };

// Default zone colors by type (fallback if zone has no color)
const DEFAULT_ZONE_COLORS = {
	RADIUS: { fill: "#10b981", stroke: "#059669" }, // emerald
	POLYGON: { fill: "#3b82f6", stroke: "#2563eb" }, // blue
	POINT: { fill: "#8b5cf6", stroke: "#7c3aed" }, // violet
};

// Helper to get zone colors - uses zone.color if defined, otherwise falls back to type-based color
function getZoneColors(zone: PricingZone): { fill: string; stroke: string } {
	if (zone.color) {
		return { fill: zone.color, stroke: zone.color };
	}
	return DEFAULT_ZONE_COLORS[zone.zoneType] || DEFAULT_ZONE_COLORS.POINT;
}

// Story 11.3: Create a label marker for zones with non-default multiplier
function createMultiplierLabel(
	map: google.maps.Map,
	position: google.maps.LatLng | google.maps.LatLngLiteral,
	multiplier: number,
	zoneName: string
): google.maps.Marker | undefined {
	if (multiplier === 1.0) return undefined;

	return new google.maps.Marker({
		map,
		position,
		icon: {
			path: google.maps.SymbolPath.CIRCLE,
			scale: 0,
		},
		label: {
			text: `${multiplier.toFixed(1)}×`,
			color: multiplier > 1.0 ? "#dc2626" : "#16a34a",
			fontSize: "12px",
			fontWeight: "bold",
			className: "zone-multiplier-label",
		},
		title: `${zoneName}: ${multiplier.toFixed(1)}× multiplier`,
		clickable: false,
		zIndex: 1000,
	});
}

// GeoJSON types
interface GeoJSONPolygon {
	type: "Polygon";
	coordinates: number[][][];
}

// Haversine distance calculation
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371;
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLng = (lng2 - lng1) * Math.PI / 180;
	const a = 
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLng / 2) * Math.sin(dLng / 2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	return R * c;
}

// Calculate center and radius from a circle-like polygon
function calculateCircleFromPolygon(coordinates: number[][]): { center: { lat: number; lng: number }; radiusKm: number } | null {
	if (coordinates.length < 3) return null;
	
	let sumLat = 0;
	let sumLng = 0;
	const count = coordinates.length - 1;
	
	for (let i = 0; i < count; i++) {
		sumLng += coordinates[i][0];
		sumLat += coordinates[i][1];
	}
	
	const centerLat = sumLat / count;
	const centerLng = sumLng / count;
	
	let totalDistance = 0;
	for (let i = 0; i < count; i++) {
		const pointLat = coordinates[i][1];
		const pointLng = coordinates[i][0];
		const distance = haversineDistance(centerLat, centerLng, pointLat, pointLng);
		totalDistance += distance;
	}
	
	return {
		center: { lat: centerLat, lng: centerLng },
		radiusKm: totalDistance / count,
	};
}

export function ZonesInteractiveMap({
	zones,
	selectedZoneId,
	onSelectZone,
	onCreateFromDrawing,
	googleMapsApiKey,
	statusFilter,
	onValidate,
	isValidating,
}: ZonesInteractiveMapProps) {
	const t = useTranslations();
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const terraDrawRef = useRef<TerraDraw | null>(null);
	const overlaysRef = useRef<Map<string, Overlay>>(new Map());
	const drawnFeatureIdRef = useRef<string | null>(null);

	const isReady = useGoogleMaps(googleMapsApiKey);
	const [drawingMode, setDrawingMode] = useState<DrawingMode>("pan");
	const [hasDrawnShape, setHasDrawnShape] = useState(false);
	const [terraDrawReady, setTerraDrawReady] = useState(false);

	// Filter zones based on status
	const filteredZones = zones.filter((zone) => {
		if (statusFilter === "active") return zone.isActive;
		if (statusFilter === "inactive") return !zone.isActive;
		return true;
	});

	// Clear all overlays
	const clearOverlays = useCallback(() => {
		overlaysRef.current.forEach((overlay) => {
			overlay.ref.setMap(null);
			if (overlay.label) {
				overlay.label.setMap(null);
			}
		});
		overlaysRef.current.clear();
	}, []);

	// Initialize map and Terra Draw
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

		// Wait for map projection to be ready before initializing Terra Draw
		map.addListener("projection_changed", () => {
			if (terraDrawRef.current) return;

			try {
				const draw = new TerraDraw({
					adapter: new TerraDrawGoogleMapsAdapter({
						lib: google.maps,
						map,
						coordinatePrecision: 9,
					}),
					modes: [
						new TerraDrawPolygonMode({
							styles: {
								fillColor: "#3b82f6",
								fillOpacity: 0.3,
								outlineColor: "#2563eb",
								outlineWidth: 2,
							},
						}),
						new TerraDrawCircleMode({
							styles: {
								fillColor: "#10b981",
								fillOpacity: 0.3,
								outlineColor: "#059669",
								outlineWidth: 2,
							},
						}),
						new TerraDrawSelectMode({
							flags: {
								polygon: {
									feature: {
										draggable: true,
										coordinates: {
											midpoints: true,
											draggable: true,
											deletable: true,
										},
									},
								},
								circle: {
									feature: {
										draggable: true,
										coordinates: {
											midpoints: false,
											draggable: true,
											deletable: false,
										},
									},
								},
							},
						}),
					],
				});

				draw.start();

				draw.on("ready", () => {
					console.log("[ZonesInteractiveMap] Terra Draw ready");
					setTerraDrawReady(true);
				});

				// Listen for finish events
				draw.on("finish", (id: string | number, context: { action: string; mode: string }) => {
					if (context.action === "draw") {
						const featureId = String(id);
						console.log("[ZonesInteractiveMap] Drawing finished:", featureId, context.mode);
						
						// Remove previous drawn shape
						if (drawnFeatureIdRef.current && drawnFeatureIdRef.current !== featureId) {
							try {
								draw.removeFeatures([drawnFeatureIdRef.current]);
							} catch {
								// Ignore
							}
						}
						
						drawnFeatureIdRef.current = featureId;
						setHasDrawnShape(true);
						setDrawingMode("pan");
						
						// Get the feature data
						const snapshot = draw.getSnapshot();
						const feature = snapshot.find(f => String(f.id) === featureId);
						
						if (feature && feature.geometry.type === "Polygon") {
							const coords = feature.geometry.coordinates[0] as number[][];
							
							if (context.mode === "circle") {
								const circleData = calculateCircleFromPolygon(coords);
								if (circleData) {
									onCreateFromDrawing({
										zoneType: "RADIUS",
										centerLatitude: circleData.center.lat,
										centerLongitude: circleData.center.lng,
										radiusKm: Math.round(circleData.radiusKm * 100) / 100,
									});
								}
							} else {
								const geoJSON: GeoJSONPolygon = {
									type: "Polygon",
									coordinates: [coords],
								};
								const bounds = new google.maps.LatLngBounds();
								coords.forEach(coord => bounds.extend({ lat: coord[1], lng: coord[0] }));
								const center = bounds.getCenter();
								
								onCreateFromDrawing({
									zoneType: "POLYGON",
									geometry: geoJSON,
									centerLatitude: center.lat(),
									centerLongitude: center.lng(),
								});
							}
						}
					}
				});

				terraDrawRef.current = draw;
			} catch (error) {
				console.error("[ZonesInteractiveMap] Error initializing Terra Draw:", error);
			}
		});
	}, [isReady, onCreateFromDrawing]);

	// Handle drawing mode change
	const handleModeChange = useCallback((mode: DrawingMode) => {
		setDrawingMode(mode);

		if (!terraDrawRef.current || !terraDrawReady) return;

		switch (mode) {
			case "polygon":
				terraDrawRef.current.setMode("polygon");
				break;
			case "circle":
				terraDrawRef.current.setMode("circle");
				break;
			default:
				terraDrawRef.current.setMode("static");
		}
	}, [terraDrawReady]);

	// Clear drawn shape
	const handleClearDrawing = useCallback(() => {
		if (terraDrawRef.current && drawnFeatureIdRef.current) {
			try {
				terraDrawRef.current.removeFeatures([drawnFeatureIdRef.current]);
			} catch {
				// Ignore
			}
		}
		drawnFeatureIdRef.current = null;
		setHasDrawnShape(false);
	}, []);

	// Draw zones on map (using native Google Maps overlays for display)
	useEffect(() => {
		const map = mapInstanceRef.current;
		if (!map || !isReady) return;

		clearOverlays();

		if (!filteredZones.length) return;

		const bounds = new google.maps.LatLngBounds();

		filteredZones.forEach((zone) => {
			const colors = getZoneColors(zone);
			const isSelected = zone.id === selectedZoneId;

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

				const label = createMultiplierLabel(
					map,
					{ lat: zone.centerLatitude as number, lng: zone.centerLongitude as number },
					zone.priceMultiplier ?? 1.0,
					zone.name
				);

				overlaysRef.current.set(zone.id, { type: "circle", ref: circle, zone, label });
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
						if (validCoords.length < 3) return;
						const path = validCoords.map(
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

						const center = polyBounds.getCenter();
						const label = createMultiplierLabel(
							map,
							center,
							zone.priceMultiplier ?? 1.0,
							zone.name
						);

						overlaysRef.current.set(zone.id, { type: "polygon", ref: polygon, zone, label });
					}
				} catch {
					// ignore invalid geometry
				}
			} else if (isValidCoord(zone.centerLatitude, zone.centerLongitude)) {
				const position = {
					lat: zone.centerLatitude as number,
					lng: zone.centerLongitude as number,
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

	// Cleanup on unmount
	useEffect(() => {
		return () => {
			if (terraDrawRef.current) {
				try {
					terraDrawRef.current.stop();
				} catch {
					// Ignore
				}
			}
		};
	}, []);

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
				onValidate={onValidate}
				isValidating={isValidating}
				disabled={!terraDrawReady}
			/>

			{/* Map */}
			<div ref={mapRef} id="zones-interactive-map" className="h-full w-full" />
		</div>
	);
}
