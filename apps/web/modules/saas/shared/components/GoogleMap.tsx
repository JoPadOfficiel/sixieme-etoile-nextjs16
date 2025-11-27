"use client";

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { Card } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapPinIcon, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

/**
 * Marker configuration
 */
export interface MapMarker {
	id: string;
	position: { lat: number; lng: number };
	title?: string;
	icon?: google.maps.Icon | google.maps.Symbol | string;
	label?: string | google.maps.MarkerLabel;
	onClick?: () => void;
}

/**
 * Polyline configuration for route segments
 */
export interface MapPolyline {
	id: string;
	path: Array<{ lat: number; lng: number }>;
	strokeColor?: string;
	strokeOpacity?: number;
	strokeWeight?: number;
	geodesic?: boolean;
	icons?: google.maps.IconSequence[];
}

interface GoogleMapProps {
	apiKey: string | null | undefined;
	center?: { lat: number; lng: number };
	zoom?: number;
	markers?: MapMarker[];
	polylines?: MapPolyline[];
	className?: string;
	height?: string;
	fitBoundsToMarkers?: boolean;
	fitBoundsPadding?: number;
	onMapClick?: (lat: number, lng: number) => void;
	onMapReady?: (map: google.maps.Map) => void;
}

/**
 * GoogleMap Component
 *
 * Reusable Google Maps component that handles:
 * - Script loading
 * - Map initialization
 * - Markers management
 * - Polylines for routes
 * - Auto-fit bounds
 *
 * @see Story 8.1: Dispatch Screen Layout
 * @see Story 8.3: Multi-Base Optimisation & Visualisation
 */
export function GoogleMap({
	apiKey,
	center = { lat: 48.8566, lng: 2.3522 }, // Paris default
	zoom = 10,
	markers = [],
	polylines = [],
	className,
	height = "100%",
	fitBoundsToMarkers = true,
	fitBoundsPadding = 50,
	onMapClick,
	onMapReady,
}: GoogleMapProps) {
	const t = useTranslations("common.map");
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
	const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
	const [isReady, setIsReady] = useState(false);
	const [loadError, setLoadError] = useState<string | null>(null);

	// Load Google Maps script
	useEffect(() => {
		if (!apiKey) return;

		// Check if already loaded
		if (window.google?.maps) {
			// Defer state update to avoid cascading renders
			window.setTimeout(() => setIsReady(true), 0);
			return;
		}

		// Check if script is already being loaded
		const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
		if (existingScript) {
			existingScript.addEventListener("load", () => setIsReady(true));
			return;
		}

		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry`;
		script.async = true;
		script.defer = true;
		script.onload = () => setIsReady(true);
		script.onerror = () => setLoadError("Failed to load Google Maps");
		document.head.appendChild(script);

		return () => {
			// Don't remove script on cleanup as it may be used by other components
		};
	}, [apiKey]);

	// Initialize map
	useEffect(() => {
		if (!isReady || !mapRef.current || mapInstanceRef.current) return;

		try {
			const map = new google.maps.Map(mapRef.current, {
				center,
				zoom,
				streetViewControl: false,
				fullscreenControl: true,
				mapTypeControl: true,
				mapTypeControlOptions: {
					position: google.maps.ControlPosition.TOP_LEFT,
				},
			});

			mapInstanceRef.current = map;

			if (onMapClick) {
				map.addListener("click", (event: google.maps.MapMouseEvent) => {
					if (event.latLng) {
						onMapClick(event.latLng.lat(), event.latLng.lng());
					}
				});
			}

			if (onMapReady) {
				onMapReady(map);
			}
		} catch {
			// Defer state update to avoid cascading renders
			window.setTimeout(() => setLoadError("Failed to initialize Google Maps"), 0);
		}
	}, [isReady, center, zoom, onMapClick, onMapReady]);

	// Update markers
	useEffect(() => {
		const map = mapInstanceRef.current;
		if (!map || !isReady) return;

		// Remove old markers that are no longer in the list
		const currentMarkerIds = new Set(markers.map((m) => m.id));
		markersRef.current.forEach((marker, id) => {
			if (!currentMarkerIds.has(id)) {
				marker.setMap(null);
				markersRef.current.delete(id);
			}
		});

		// Add or update markers
		const bounds = new google.maps.LatLngBounds();
		let hasValidMarkers = false;

		markers.forEach((markerConfig) => {
			let marker = markersRef.current.get(markerConfig.id);

			if (marker) {
				// Update existing marker
				marker.setPosition(markerConfig.position);
				marker.setTitle(markerConfig.title);
				if (markerConfig.icon) marker.setIcon(markerConfig.icon);
				if (markerConfig.label) marker.setLabel(markerConfig.label);
			} else {
				// Create new marker
				marker = new google.maps.Marker({
					map,
					position: markerConfig.position,
					title: markerConfig.title,
					icon: markerConfig.icon,
					label: markerConfig.label,
				});

				if (markerConfig.onClick) {
					marker.addListener("click", markerConfig.onClick);
				}

				markersRef.current.set(markerConfig.id, marker);
			}

			bounds.extend(markerConfig.position);
			hasValidMarkers = true;
		});

		// Fit bounds to markers
		if (fitBoundsToMarkers && hasValidMarkers && markers.length > 0) {
			if (markers.length === 1) {
				map.setCenter(markers[0].position);
				map.setZoom(14);
			} else {
				map.fitBounds(bounds, fitBoundsPadding);
			}
		}
	}, [markers, isReady, fitBoundsToMarkers, fitBoundsPadding]);

	// Update polylines
	useEffect(() => {
		const map = mapInstanceRef.current;
		if (!map || !isReady) return;

		// Remove old polylines that are no longer in the list
		const currentPolylineIds = new Set(polylines.map((p) => p.id));
		polylinesRef.current.forEach((polyline, id) => {
			if (!currentPolylineIds.has(id)) {
				polyline.setMap(null);
				polylinesRef.current.delete(id);
			}
		});

		// Add or update polylines
		polylines.forEach((polylineConfig) => {
			let polyline = polylinesRef.current.get(polylineConfig.id);

			if (polyline) {
				// Update existing polyline
				polyline.setPath(polylineConfig.path);
				polyline.setOptions({
					strokeColor: polylineConfig.strokeColor,
					strokeOpacity: polylineConfig.strokeOpacity,
					strokeWeight: polylineConfig.strokeWeight,
					geodesic: polylineConfig.geodesic,
					icons: polylineConfig.icons,
				});
			} else {
				// Create new polyline
				polyline = new google.maps.Polyline({
					map,
					path: polylineConfig.path,
					strokeColor: polylineConfig.strokeColor || "#4285F4",
					strokeOpacity: polylineConfig.strokeOpacity ?? 1,
					strokeWeight: polylineConfig.strokeWeight || 4,
					geodesic: polylineConfig.geodesic ?? true,
					icons: polylineConfig.icons,
				});

				polylinesRef.current.set(polylineConfig.id, polyline);
			}
		});
	}, [polylines, isReady]);

	// No API key configured
	if (!apiKey) {
		return (
			<Card className={cn("flex items-center justify-center text-muted-foreground", className)} style={{ height }}>
				<div className="flex flex-col items-center gap-2 text-center p-4">
					<MapPinIcon className="h-10 w-10 opacity-50" />
					<p className="text-sm font-medium">{t("noApiKey")}</p>
					<p className="text-xs">{t("configureInSettings")}</p>
				</div>
			</Card>
		);
	}

	// Loading error
	if (loadError) {
		return (
			<Card className={cn("flex items-center justify-center text-muted-foreground", className)} style={{ height }}>
				<div className="flex flex-col items-center gap-2 text-center p-4">
					<AlertCircle className="h-10 w-10 text-destructive opacity-50" />
					<p className="text-sm font-medium">{loadError}</p>
				</div>
			</Card>
		);
	}

	// Loading state
	if (!isReady) {
		return (
			<Card className={cn("overflow-hidden", className)} style={{ height }}>
				<Skeleton className="h-full w-full" />
			</Card>
		);
	}

	return (
		<Card className={cn("overflow-hidden", className)} style={{ height }}>
			<div ref={mapRef} className="h-full w-full" />
		</Card>
	);
}

export default GoogleMap;
