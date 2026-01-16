"use client";

/**
 * ZoneDrawingMap Component
 * 
 * Updated to use Terra Draw instead of deprecated Google Maps Drawing Library.
 * Terra Draw is the Google-recommended replacement for the Drawing Library.
 * 
 * @see https://github.com/jameslmilner/terra-draw
 */

/// <reference types="@types/google.maps" />

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
	CircleIcon,
	Loader2,
	MapPinIcon,
	PentagonIcon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGoogleMaps } from "../hooks/useGoogleMaps";
import type { ZoneType } from "../types";

// Terra Draw imports
import { TerraDraw, TerraDrawPolygonMode, TerraDrawCircleMode, TerraDrawSelectMode } from "terra-draw";
import { TerraDrawGoogleMapsAdapter } from "terra-draw-google-maps-adapter";

// GeoJSON types
interface GeoJSONPolygon {
	type: "Polygon";
	coordinates: number[][][];
}

interface ZoneDrawingMapProps {
	zoneType: ZoneType;
	geometry: GeoJSONPolygon | null;
	centerLatitude: number | null;
	centerLongitude: number | null;
	radiusKm: number | null;
	onZoneTypeChange: (type: ZoneType) => void;
	onGeometryChange: (geometry: GeoJSONPolygon | null) => void;
	onCenterChange: (lat: number, lng: number) => void;
	onRadiusChange: (radiusKm: number) => void;
	googleMapsApiKey?: string | null;
}

type DrawingMode = "polygon" | "circle" | null;

export function ZoneDrawingMap({
	zoneType,
	geometry,
	centerLatitude,
	centerLongitude,
	radiusKm,
	onZoneTypeChange,
	onGeometryChange,
	onCenterChange,
	onRadiusChange,
	googleMapsApiKey,
}: ZoneDrawingMapProps) {
	const t = useTranslations();
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const terraDrawRef = useRef<TerraDraw | null>(null);
	const currentFeatureIdRef = useRef<string | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const isReady = useGoogleMaps(googleMapsApiKey ?? null);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeDrawingMode, setActiveDrawingMode] = useState<DrawingMode>(null);
	const [hasShape, setHasShape] = useState(false);
	const [terraDrawReady, setTerraDrawReady] = useState(false);

	// Default to Paris
	const defaultLat = centerLatitude ?? 48.8566;
	const defaultLng = centerLongitude ?? 2.3522;

	// Calculate center and radius from a circle-like polygon (approximated circle)
	const calculateCircleFromPolygon = useCallback((coordinates: number[][]) => {
		if (coordinates.length < 3) return null;
		
		// Calculate centroid
		let sumLat = 0;
		let sumLng = 0;
		const count = coordinates.length - 1; // Exclude closing point
		
		for (let i = 0; i < count; i++) {
			sumLng += coordinates[i][0];
			sumLat += coordinates[i][1];
		}
		
		const centerLat = sumLat / count;
		const centerLng = sumLng / count;
		
		// Calculate average radius
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
	}, []);

	// Haversine distance calculation
	const haversineDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
		const R = 6371; // Earth's radius in km
		const dLat = (lat2 - lat1) * Math.PI / 180;
		const dLng = (lng2 - lng1) * Math.PI / 180;
		const a = 
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
			Math.sin(dLng / 2) * Math.sin(dLng / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	};

	// Clear current shape
	const clearCurrentShape = useCallback(() => {
		if (terraDrawRef.current && currentFeatureIdRef.current) {
			try {
				terraDrawRef.current.removeFeatures([currentFeatureIdRef.current]);
			} catch (e) {
				console.warn("Failed to remove feature:", e);
			}
		}
		currentFeatureIdRef.current = null;
		setHasShape(false);
	}, []);

	// Set drawing mode
	const setDrawingMode = useCallback(
		(mode: DrawingMode) => {
			if (!terraDrawRef.current || !terraDrawReady) return;

			clearCurrentShape();
			setActiveDrawingMode(mode);

			switch (mode) {
				case "circle":
					terraDrawRef.current.setMode("circle");
					onZoneTypeChange("RADIUS");
					break;
				case "polygon":
					terraDrawRef.current.setMode("polygon");
					onZoneTypeChange("POLYGON");
					break;
				default:
					terraDrawRef.current.setMode("static");
			}
		},
		[clearCurrentShape, onZoneTypeChange, terraDrawReady],
	);

	// Initialize map and Terra Draw
	useEffect(() => {
		if (mapInstanceRef.current || !mapRef.current || !window.google || !isReady) {
			return;
		}

		const map = new google.maps.Map(mapRef.current, {
			center: { lat: defaultLat, lng: defaultLng },
			zoom: 11,
			mapTypeControl: true,
			streetViewControl: false,
			fullscreenControl: true,
		});

		mapInstanceRef.current = map;

		// Wait for map projection to be ready before initializing Terra Draw
		map.addListener("projection_changed", () => {
			if (terraDrawRef.current) return; // Already initialized

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
								outlineColor: "#3b82f6",
								outlineWidth: 2,
							},
						}),
						new TerraDrawCircleMode({
							styles: {
								fillColor: "#10b981",
								fillOpacity: 0.3,
								outlineColor: "#10b981",
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

				// Listen for ready event (required for Google Maps adapter)
				draw.on("ready", () => {
					console.log("[ZoneDrawingMap] Terra Draw ready");
					setTerraDrawReady(true);
				});

				// Listen for finish events (shape completed)
				draw.on("finish", (id: string | number, context: { action: string; mode: string }) => {
					if (context.action === "draw") {
						const featureId = String(id);
						console.log("[ZoneDrawingMap] Drawing finished:", featureId, context.mode);
						
						// Remove previous shape if exists
						if (currentFeatureIdRef.current && currentFeatureIdRef.current !== featureId) {
							try {
								draw.removeFeatures([currentFeatureIdRef.current]);
							} catch {
								// Ignore
							}
						}
						
						currentFeatureIdRef.current = featureId;
						setHasShape(true);
						setActiveDrawingMode(null);
						
						// Get the feature data
						const snapshot = draw.getSnapshot();
						const feature = snapshot.find(f => String(f.id) === featureId);
						
						if (feature && feature.geometry.type === "Polygon") {
							const coords = feature.geometry.coordinates[0] as number[][];
							
							if (context.mode === "circle") {
								// Extract center and radius from circle polygon
								const circleData = calculateCircleFromPolygon(coords);
								if (circleData) {
									onCenterChange(circleData.center.lat, circleData.center.lng);
									onRadiusChange(Math.round(circleData.radiusKm * 100) / 100);
								}
							} else {
								// Polygon mode
								const geoJSON: GeoJSONPolygon = {
									type: "Polygon",
									coordinates: [coords],
								};
								onGeometryChange(geoJSON);
								
								// Calculate center
								const bounds = new google.maps.LatLngBounds();
								coords.forEach(coord => bounds.extend({ lat: coord[1], lng: coord[0] }));
								const center = bounds.getCenter();
								onCenterChange(center.lat(), center.lng());
							}
						}
						
						// Switch to select mode for editing
						draw.setMode("select");
					}
				});

				// Listen for change events (editing)
				draw.on("change", (ids: (string | number)[], type: string) => {
					const stringIds = ids.map(id => String(id));
					if (type === "update" && currentFeatureIdRef.current && stringIds.includes(currentFeatureIdRef.current)) {
						const snapshot = draw.getSnapshot();
						const feature = snapshot.find(f => String(f.id) === currentFeatureIdRef.current);
						
						if (feature && feature.geometry.type === "Polygon") {
							const coords = feature.geometry.coordinates[0] as number[][];
							
							if (zoneType === "RADIUS") {
								const circleData = calculateCircleFromPolygon(coords);
								if (circleData) {
									onCenterChange(circleData.center.lat, circleData.center.lng);
									onRadiusChange(Math.round(circleData.radiusKm * 100) / 100);
								}
							} else {
								const geoJSON: GeoJSONPolygon = {
									type: "Polygon",
									coordinates: [coords],
								};
								onGeometryChange(geoJSON);
							}
						}
					}
				});

				terraDrawRef.current = draw;
			} catch (error) {
				console.error("[ZoneDrawingMap] Error initializing Terra Draw:", error);
			}
		});

		// Initialize Places Autocomplete for search
		if (searchInputRef.current) {
			const autocomplete = new google.maps.places.Autocomplete(
				searchInputRef.current,
				{
					types: ["geocode", "establishment"],
				},
			);

			autocomplete.bindTo("bounds", map);

			autocomplete.addListener("place_changed", () => {
				const place = autocomplete.getPlace();
				if (place.geometry?.location) {
					map.setCenter(place.geometry.location);
					map.setZoom(14);
				}
			});
		}

		// Load existing geometry if present
		// Note: Loading existing shapes into Terra Draw requires addFeatures after ready
		
	}, [isReady, defaultLat, defaultLng, calculateCircleFromPolygon, onCenterChange, onRadiusChange, onGeometryChange, zoneType]);

	// Load existing geometry when Terra Draw is ready
	useEffect(() => {
		if (!terraDrawReady || !terraDrawRef.current) return;

		const draw = terraDrawRef.current;

		// Clear any existing features first
		try {
			const existing = draw.getSnapshot();
			if (existing.length > 0) {
				draw.removeFeatures(existing.map(f => f.id as string));
			}
		} catch {
			// Ignore
		}

		// Load polygon geometry
		if (geometry && geometry.coordinates[0].length > 0) {
			try {
				const featureId = draw.addFeatures([{
					type: "Feature",
					properties: { mode: "polygon" },
					geometry: {
						type: "Polygon",
						coordinates: geometry.coordinates,
					},
				}]);
				
				if (featureId && featureId.length > 0 && featureId[0].valid) {
					currentFeatureIdRef.current = String(featureId[0].id);
					setHasShape(true);
					
					// Fit bounds to polygon
					const bounds = new google.maps.LatLngBounds();
					geometry.coordinates[0].forEach((coord) => {
						bounds.extend({ lat: coord[1], lng: coord[0] });
					});
					mapInstanceRef.current?.fitBounds(bounds);
				}
			} catch {
				console.warn("[ZoneDrawingMap] Failed to load polygon");
			}
		}
		// Load circle (as polygon approximation)
		else if (zoneType === "RADIUS" && centerLatitude && centerLongitude && radiusKm && radiusKm > 0) {
			try {
				// Create circle polygon approximation (64 points)
				const numPoints = 64;
				const coordinates: number[][] = [];
				
				for (let i = 0; i <= numPoints; i++) {
					const angle = (i / numPoints) * 2 * Math.PI;
					const dx = radiusKm * Math.cos(angle);
					const dy = radiusKm * Math.sin(angle);
					const lat = centerLatitude + (dy / 111.32);
					const lng = centerLongitude + (dx / (111.32 * Math.cos(centerLatitude * Math.PI / 180)));
					coordinates.push([lng, lat]);
				}
				
				const featureId = draw.addFeatures([{
					type: "Feature",
					properties: { mode: "circle" },
					geometry: {
						type: "Polygon",
						coordinates: [coordinates],
					},
				}]);
				
				if (featureId && featureId.length > 0) {
					currentFeatureIdRef.current = String(featureId[0].id);
					setHasShape(true);
					mapInstanceRef.current?.setCenter({ lat: centerLatitude, lng: centerLongitude });
					mapInstanceRef.current?.setZoom(12);
				}
			} catch (e) {
				console.warn("[ZoneDrawingMap] Failed to load circle:", e);
			}
		}
	// Run only once when Terra Draw becomes ready, not on every geometry change
	// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [terraDrawReady]);

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

	const handleSearch = () => {
		if (!searchQuery.trim() || !mapInstanceRef.current) return;

		const geocoder = new google.maps.Geocoder();
		geocoder.geocode({ address: searchQuery }, (results, status) => {
			if (status === "OK" && results?.[0]?.geometry?.location) {
				const location = results[0].geometry.location;
				mapInstanceRef.current?.setCenter(location);
				mapInstanceRef.current?.setZoom(14);
			}
		});
	};

	const handleClearZone = () => {
		clearCurrentShape();
		onGeometryChange(null);
		onCenterChange(defaultLat, defaultLng);
		onRadiusChange(0);
	};

	if (!googleMapsApiKey) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center">
				<MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground" />
				<p className="mt-2 text-muted-foreground text-sm">
					{t("pricing.zones.map.noApiKey")}
				</p>
				<p className="mt-1 text-muted-foreground text-xs">
					{t("pricing.zones.map.configureInSettings")}
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			{/* Search bar */}
			<div className="flex gap-2">
				<div className="relative flex-1">
					<SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						placeholder={t("pricing.zones.map.searchPlaceholder")}
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						onKeyDown={(e) => e.key === "Enter" && handleSearch()}
						className="pl-9"
					/>
				</div>
				<Button type="button" variant="outline" onClick={handleSearch}>
					{t("pricing.zones.map.search")}
				</Button>
			</div>

			{/* Compact Drawing tools - Circle first, then Polygon */}
			<div className="flex items-center gap-1">
				<Button
					type="button"
					variant={activeDrawingMode === "circle" ? "default" : "outline"}
					size="icon"
					className="h-8 w-8"
					onClick={() => setDrawingMode("circle")}
					title={t("pricing.zones.map.drawCircle")}
					disabled={!terraDrawReady}
				>
					<CircleIcon className="h-4 w-4" />
				</Button>
				<Button
					type="button"
					variant={activeDrawingMode === "polygon" ? "default" : "outline"}
					size="icon"
					className="h-8 w-8"
					onClick={() => setDrawingMode("polygon")}
					title={t("pricing.zones.map.drawPolygon")}
					disabled={!terraDrawReady}
				>
					<PentagonIcon className="h-4 w-4" />
				</Button>
				{hasShape && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						className="h-8 w-8 text-destructive hover:text-destructive"
						onClick={handleClearZone}
						title={t("pricing.zones.map.clear")}
					>
						<Trash2Icon className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Map container */}
			<div className="relative h-[250px] w-full overflow-hidden rounded-lg border">
				{(!isReady || !terraDrawReady) && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				<div ref={mapRef} id="zone-drawing-map" className="h-full w-full" />
			</div>

			{/* Zone info */}
			<div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
				{centerLatitude !== null && centerLongitude !== null && (
					<>
						<span>
							<Label className="text-xs">
								{t("pricing.zones.form.centerLatitude")}:
							</Label>{" "}
							{Number(centerLatitude).toFixed(6)}
						</span>
						<span>
							<Label className="text-xs">
								{t("pricing.zones.form.centerLongitude")}:
							</Label>{" "}
							{Number(centerLongitude).toFixed(6)}
						</span>
					</>
				)}
				{zoneType === "RADIUS" && radiusKm !== null && radiusKm > 0 && (
					<span>
						<Label className="text-xs">
							{t("pricing.zones.form.radiusKm")}:
						</Label>{" "}
						{radiusKm} km
					</span>
				)}
				{zoneType === "POLYGON" && geometry && (
					<span>
						<Label className="text-xs">
							{t("pricing.zones.map.vertices")}:
						</Label>{" "}
						{geometry.coordinates[0].length - 1}
					</span>
				)}
			</div>

		</div>
	);
}
