"use client";

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
	SquareIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ZoneType } from "../types";

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

type DrawingMode = "polygon" | "circle" | "rectangle" | null;

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
	const drawingManagerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
	const currentShapeRef = useRef<
		google.maps.Polygon | google.maps.Circle | google.maps.Rectangle | null
	>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const [isLoading, setIsLoading] = useState(!!googleMapsApiKey);
	const [error, setError] = useState<string | null>(
		!googleMapsApiKey ? "noApiKey" : null,
	);
	const [searchQuery, setSearchQuery] = useState("");
	const [activeDrawingMode, setActiveDrawingMode] = useState<DrawingMode>(null);
	const [hasShape, setHasShape] = useState(false);

	// Default to Paris
	const defaultLat = centerLatitude ?? 48.8566;
	const defaultLng = centerLongitude ?? 2.3522;

	// Convert polygon coordinates to GeoJSON
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
		[],
	);

	// Convert rectangle to GeoJSON polygon
	const rectangleToGeoJSON = useCallback(
		(rectangle: google.maps.Rectangle): GeoJSONPolygon => {
			const bounds = rectangle.getBounds();
			if (!bounds) {
				return { type: "Polygon", coordinates: [[]] };
			}

			const ne = bounds.getNorthEast();
			const sw = bounds.getSouthWest();

			return {
				type: "Polygon",
				coordinates: [
					[
						[sw.lng(), sw.lat()],
						[ne.lng(), sw.lat()],
						[ne.lng(), ne.lat()],
						[sw.lng(), ne.lat()],
						[sw.lng(), sw.lat()],
					],
				],
			};
		},
		[],
	);

	// Clear current shape
	const clearCurrentShape = useCallback(() => {
		if (currentShapeRef.current) {
			currentShapeRef.current.setMap(null);
			currentShapeRef.current = null;
			setHasShape(false);
		}
	}, []);

	// Set drawing mode
	const setDrawingMode = useCallback(
		(mode: DrawingMode) => {
			if (!drawingManagerRef.current) return;

			clearCurrentShape();
			setActiveDrawingMode(mode);

			let googleMode: google.maps.drawing.OverlayType | null = null;

			switch (mode) {
				case "polygon":
					googleMode = google.maps.drawing.OverlayType.POLYGON;
					onZoneTypeChange("POLYGON");
					break;
				case "circle":
					googleMode = google.maps.drawing.OverlayType.CIRCLE;
					onZoneTypeChange("RADIUS");
					break;
				case "rectangle":
					googleMode = google.maps.drawing.OverlayType.RECTANGLE;
					onZoneTypeChange("POLYGON");
					break;
				default:
					googleMode = null;
			}

			drawingManagerRef.current.setDrawingMode(googleMode);
		},
		[clearCurrentShape, onZoneTypeChange],
	);

	// Handle shape completion
	const handleShapeComplete = useCallback(
		(
			shape: google.maps.Polygon | google.maps.Circle | google.maps.Rectangle,
			type: "polygon" | "circle" | "rectangle",
		) => {
			// Clear previous shape
			clearCurrentShape();
			currentShapeRef.current = shape;
			setHasShape(true);

			// Make shape editable
			if ("setEditable" in shape) {
				shape.setEditable(true);
			}

			// Stop drawing mode
			if (drawingManagerRef.current) {
				drawingManagerRef.current.setDrawingMode(null);
			}
			setActiveDrawingMode(null);

			// Handle based on type
			if (type === "circle") {
				const circle = shape as google.maps.Circle;
				const center = circle.getCenter();
				const radius = circle.getRadius();

				if (center) {
					onCenterChange(center.lat(), center.lng());
					onRadiusChange(Math.round((radius / 1000) * 100) / 100);
				}

				// Listen for edits
				circle.addListener("center_changed", () => {
					const newCenter = circle.getCenter();
					if (newCenter) {
						onCenterChange(newCenter.lat(), newCenter.lng());
					}
				});

				circle.addListener("radius_changed", () => {
					const newRadius = circle.getRadius();
					onRadiusChange(Math.round((newRadius / 1000) * 100) / 100);
				});
			} else if (type === "polygon") {
				const polygon = shape as google.maps.Polygon;
				const geoJSON = polygonToGeoJSON(polygon);
				onGeometryChange(geoJSON);

				// Calculate center
				const bounds = new google.maps.LatLngBounds();
				polygon.getPath().forEach((point) => bounds.extend(point));
				const center = bounds.getCenter();
				onCenterChange(center.lat(), center.lng());

				// Listen for edits
				const path = polygon.getPath();
				google.maps.event.addListener(path, "set_at", () => {
					onGeometryChange(polygonToGeoJSON(polygon));
				});
				google.maps.event.addListener(path, "insert_at", () => {
					onGeometryChange(polygonToGeoJSON(polygon));
				});
				google.maps.event.addListener(path, "remove_at", () => {
					onGeometryChange(polygonToGeoJSON(polygon));
				});
			} else if (type === "rectangle") {
				const rectangle = shape as google.maps.Rectangle;
				const geoJSON = rectangleToGeoJSON(rectangle);
				onGeometryChange(geoJSON);

				// Calculate center
				const bounds = rectangle.getBounds();
				if (bounds) {
					const center = bounds.getCenter();
					onCenterChange(center.lat(), center.lng());
				}

				// Listen for edits
				rectangle.addListener("bounds_changed", () => {
					onGeometryChange(rectangleToGeoJSON(rectangle));
					const newBounds = rectangle.getBounds();
					if (newBounds) {
						const newCenter = newBounds.getCenter();
						onCenterChange(newCenter.lat(), newCenter.lng());
					}
				});
			}
		},
		[
			clearCurrentShape,
			onCenterChange,
			onRadiusChange,
			onGeometryChange,
			polygonToGeoJSON,
			rectangleToGeoJSON,
		],
	);

	// Initialize map
	const initializeMap = useCallback(() => {
		if (!mapRef.current || !window.google) return;

		const map = new google.maps.Map(mapRef.current, {
			center: { lat: defaultLat, lng: defaultLng },
			zoom: 11,
			mapTypeControl: true,
			streetViewControl: false,
			fullscreenControl: true,
		});

		mapInstanceRef.current = map;

		// Initialize Drawing Manager
		const drawingManager = new google.maps.drawing.DrawingManager({
			drawingMode: null,
			drawingControl: false, // We use custom controls
			polygonOptions: {
				fillColor: "#3b82f6",
				fillOpacity: 0.3,
				strokeColor: "#3b82f6",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				editable: true,
				draggable: true,
			},
			circleOptions: {
				fillColor: "#10b981",
				fillOpacity: 0.3,
				strokeColor: "#10b981",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				editable: true,
				draggable: true,
			},
			rectangleOptions: {
				fillColor: "#f59e0b",
				fillOpacity: 0.3,
				strokeColor: "#f59e0b",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				editable: true,
				draggable: true,
			},
		});

		drawingManager.setMap(map);
		drawingManagerRef.current = drawingManager;

		// Handle shape completion
		google.maps.event.addListener(
			drawingManager,
			"polygoncomplete",
			(polygon: google.maps.Polygon) => {
				handleShapeComplete(polygon, "polygon");
			},
		);

		google.maps.event.addListener(
			drawingManager,
			"circlecomplete",
			(circle: google.maps.Circle) => {
				handleShapeComplete(circle, "circle");
			},
		);

		google.maps.event.addListener(
			drawingManager,
			"rectanglecomplete",
			(rectangle: google.maps.Rectangle) => {
				handleShapeComplete(rectangle, "rectangle");
			},
		);

		// Initialize Places Autocomplete
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
		if (geometry && geometry.coordinates[0].length > 0) {
			const coords = geometry.coordinates[0].map(
				(coord) => new google.maps.LatLng(coord[1], coord[0]),
			);

			const polygon = new google.maps.Polygon({
				paths: coords,
				fillColor: "#3b82f6",
				fillOpacity: 0.3,
				strokeColor: "#3b82f6",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				editable: true,
				draggable: true,
				map,
			});

			currentShapeRef.current = polygon;
			setHasShape(true);

			// Fit bounds to polygon
			const bounds = new google.maps.LatLngBounds();
			coords.forEach((coord) => bounds.extend(coord));
			map.fitBounds(bounds);

			// Add edit listeners
			const path = polygon.getPath();
			google.maps.event.addListener(path, "set_at", () => {
				onGeometryChange(polygonToGeoJSON(polygon));
			});
			google.maps.event.addListener(path, "insert_at", () => {
				onGeometryChange(polygonToGeoJSON(polygon));
			});
		} else if (zoneType === "RADIUS" && centerLatitude && centerLongitude && radiusKm) {
			const circle = new google.maps.Circle({
				center: { lat: centerLatitude, lng: centerLongitude },
				radius: radiusKm * 1000,
				fillColor: "#10b981",
				fillOpacity: 0.3,
				strokeColor: "#10b981",
				strokeOpacity: 0.8,
				strokeWeight: 2,
				editable: true,
				draggable: true,
				map,
			});

			currentShapeRef.current = circle;
			setHasShape(true);
			map.setCenter({ lat: centerLatitude, lng: centerLongitude });

			// Add edit listeners
			circle.addListener("center_changed", () => {
				const newCenter = circle.getCenter();
				if (newCenter) {
					onCenterChange(newCenter.lat(), newCenter.lng());
				}
			});

			circle.addListener("radius_changed", () => {
				const newRadius = circle.getRadius();
				onRadiusChange(Math.round((newRadius / 1000) * 100) / 100);
			});
		}

		setIsLoading(false);
	}, [
		defaultLat,
		defaultLng,
		geometry,
		zoneType,
		centerLatitude,
		centerLongitude,
		radiusKm,
		handleShapeComplete,
		onCenterChange,
		onRadiusChange,
		onGeometryChange,
		polygonToGeoJSON,
	]);

	// Load Google Maps script with drawing library
	useEffect(() => {
		if (!googleMapsApiKey) {
			return;
		}

		if (window.google?.maps?.drawing) {
			initializeMap();
			return;
		}

		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places,drawing`;
		script.async = true;
		script.defer = true;

		script.onload = () => {
			initializeMap();
		};

		script.onerror = () => {
			setError("loadError");
			setIsLoading(false);
		};

		document.head.appendChild(script);

		return () => {
			clearCurrentShape();
		};
	}, [googleMapsApiKey, initializeMap, clearCurrentShape]);

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

	if (error) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center">
				<MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground" />
				<p className="mt-2 text-sm text-muted-foreground">
					{t(`pricing.zones.map.${error}`)}
				</p>
				<p className="mt-1 text-xs text-muted-foreground">
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
					<SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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

			{/* Drawing tools */}
			<div className="flex items-center gap-2">
				<Label className="text-sm font-medium">
					{t("pricing.zones.map.drawingTools")}:
				</Label>
				<div className="flex gap-1">
					<Button
						type="button"
						variant={activeDrawingMode === "polygon" ? "default" : "outline"}
						size="sm"
						onClick={() => setDrawingMode("polygon")}
						title={t("pricing.zones.map.drawPolygon")}
					>
						<PentagonIcon className="h-4 w-4 mr-1" />
						{t("pricing.zones.map.polygon")}
					</Button>
					<Button
						type="button"
						variant={activeDrawingMode === "circle" ? "default" : "outline"}
						size="sm"
						onClick={() => setDrawingMode("circle")}
						title={t("pricing.zones.map.drawCircle")}
					>
						<CircleIcon className="h-4 w-4 mr-1" />
						{t("pricing.zones.map.circle")}
					</Button>
					<Button
						type="button"
						variant={activeDrawingMode === "rectangle" ? "default" : "outline"}
						size="sm"
						onClick={() => setDrawingMode("rectangle")}
						title={t("pricing.zones.map.drawRectangle")}
					>
						<SquareIcon className="h-4 w-4 mr-1" />
						{t("pricing.zones.map.rectangle")}
					</Button>
					{hasShape && (
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={handleClearZone}
							className="text-destructive hover:text-destructive"
						>
							<Trash2Icon className="h-4 w-4 mr-1" />
							{t("pricing.zones.map.clear")}
						</Button>
					)}
				</div>
			</div>

			{/* Map container */}
			<div className="relative h-[400px] w-full overflow-hidden rounded-lg border">
				{isLoading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				<div ref={mapRef} className="h-full w-full" />
			</div>

			{/* Zone info */}
			<div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
				{centerLatitude !== null && centerLongitude !== null && (
					<>
						<span>
							<Label className="text-xs">{t("pricing.zones.form.centerLatitude")}:</Label>{" "}
							{Number(centerLatitude).toFixed(6)}
						</span>
						<span>
							<Label className="text-xs">{t("pricing.zones.form.centerLongitude")}:</Label>{" "}
							{Number(centerLongitude).toFixed(6)}
						</span>
					</>
				)}
				{zoneType === "RADIUS" && radiusKm !== null && radiusKm > 0 && (
					<span>
						<Label className="text-xs">{t("pricing.zones.form.radiusKm")}:</Label>{" "}
						{radiusKm} km
					</span>
				)}
				{zoneType === "POLYGON" && geometry && (
					<span>
						<Label className="text-xs">{t("pricing.zones.map.vertices")}:</Label>{" "}
						{geometry.coordinates[0].length - 1}
					</span>
				)}
			</div>

			<p className="text-xs text-muted-foreground">
				{t("pricing.zones.map.drawingInstructions")}
			</p>
		</div>
	);
}
