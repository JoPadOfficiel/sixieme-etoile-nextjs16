"use client";

/// <reference types="@types/google.maps" />

import { Card } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapPinIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { PricingZone } from "../types";

interface ZonesOverviewMapProps {
	zones: PricingZone[];
	selectedZoneId?: string | null;
	onSelectZone?: (zone: PricingZone) => void;
	onCreateFromMap?: (lat: number, lng: number) => void;
	googleMapsApiKey?: string | null;
}

type Overlay =
	| { type: "circle"; ref: google.maps.Circle }
	| { type: "polygon"; ref: google.maps.Polygon }
	| { type: "marker"; ref: google.maps.Marker };

export function ZonesOverviewMap({
	zones,
	selectedZoneId,
	onSelectZone,
	onCreateFromMap,
	googleMapsApiKey,
}: ZonesOverviewMapProps) {
	const t = useTranslations();
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const overlaysRef = useRef<Record<string, Overlay>>({});
	const [isReady, setIsReady] = useState(false);
	const createFromMapCallbackRef = useRef<
		ZonesOverviewMapProps["onCreateFromMap"]
	>();
	const suppressNextMapClickRef = useRef(false);

	// Keep latest callback in a ref so map listeners stay up to date
	useEffect(() => {
		createFromMapCallbackRef.current = onCreateFromMap;
	}, [onCreateFromMap]);

	// Load Google Maps script
	useEffect(() => {
		if (!googleMapsApiKey) return;

		if (window.google?.maps) {
			// If Maps JS is already loaded (Fast Refresh, navigation, etc.),
			// defer the state update to avoid cascading renders warning.
			window.setTimeout(() => setIsReady(true), 0);
			return;
		}

		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}`;
		script.async = true;
		script.defer = true;
		script.onload = () => setIsReady(true);
		document.head.appendChild(script);
	}, [googleMapsApiKey]);

	// Initialize map
	useEffect(() => {
		if (!isReady || !mapRef.current || mapInstanceRef.current) return;

		const map = new google.maps.Map(mapRef.current, {
			center: { lat: 48.8566, lng: 2.3522 },
			zoom: 6,
			streetViewControl: false,
			fullscreenControl: true,
		});

		mapInstanceRef.current = map;

		// Clicking on the map (not on a specific zone) starts creating a new zone
		map.addListener("click", (event: google.maps.MapMouseEvent) => {
			if (suppressNextMapClickRef.current) {
				suppressNextMapClickRef.current = false;
				return;
			}
			const cb = createFromMapCallbackRef.current;
			if (!cb || !event.latLng) return;
			cb(event.latLng.lat(), event.latLng.lng());
		});
	}, [isReady]);

	// Helper to clear overlays
	const clearOverlays = () => {
		Object.values(overlaysRef.current).forEach((overlay) => {
			overlay.ref.setMap(null);
		});
		overlaysRef.current = {};
	};

	// Draw zones when map or zones change
	useEffect(() => {
		const map = mapInstanceRef.current;
		// In dev/HMR it is possible for the underlying Maps JS instance to be
		// replaced; in that case, avoid drawing until a valid Map is available.
		if (!map || !(map instanceof google.maps.Map)) {
			return;
		}

		clearOverlays();

		if (!zones.length) return;

		const bounds = new google.maps.LatLngBounds();

		zones.forEach((zone) => {
			let overlay: Overlay | null = null;

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
					fillColor: "#3b82f6",
					fillOpacity: 0.2,
					strokeColor: "#3b82f6",
					strokeOpacity: 0.9,
					strokeWeight: 2,
				});

				circle.addListener("click", () => {
					suppressNextMapClickRef.current = true;
					onSelectZone?.(zone);
				});

				const circleBounds = circle.getBounds();
				if (circleBounds) bounds.union(circleBounds);

				overlay = { type: "circle", ref: circle };
			} else if (zone.zoneType === "POLYGON" && zone.geometry) {
				try {
					const geo = zone.geometry as {
						type: string;
						coordinates: number[][][];
					};
					if (geo.type === "Polygon" && geo.coordinates?.[0]?.length) {
						const path = geo.coordinates[0].map(
							([lng, lat]) => new google.maps.LatLng(lat, lng),
						);
						const polygon = new google.maps.Polygon({
							map,
							paths: path,
							fillColor: "#22c55e",
							fillOpacity: 0.2,
							strokeColor: "#22c55e",
							strokeOpacity: 0.9,
							strokeWeight: 2,
						});

						polygon.addListener("click", () => {
							suppressNextMapClickRef.current = true;
							onSelectZone?.(zone);
						});

						const polyBounds = new google.maps.LatLngBounds();
						path.forEach((p) => polyBounds.extend(p));
						bounds.union(polyBounds);

						overlay = { type: "polygon", ref: polygon };
					}
				} catch {
					// ignore invalid geometry
				}
			} else if (
				zone.centerLatitude !== null &&
				zone.centerLongitude !== null
			) {
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
					suppressNextMapClickRef.current = true;
					onSelectZone?.(zone);
				});
				bounds.extend(position);
				overlay = { type: "marker", ref: marker };
			}

			if (overlay) {
				overlaysRef.current[zone.id] = overlay;
			}
		});

		if (!bounds.isEmpty()) {
			map.fitBounds(bounds);
		}
	}, [zones, onSelectZone]);

	// Highlight selected zone
	useEffect(() => {
		Object.entries(overlaysRef.current).forEach(([id, overlay]) => {
			const isSelected = id === selectedZoneId;
			if (overlay.type === "circle") {
				overlay.ref.setOptions({
					strokeWeight: isSelected ? 3 : 2,
					fillOpacity: isSelected ? 0.35 : 0.2,
				});
			} else if (overlay.type === "polygon") {
				overlay.ref.setOptions({
					strokeWeight: isSelected ? 3 : 2,
					fillOpacity: isSelected ? 0.35 : 0.2,
				});
			} else if (overlay.type === "marker") {
				overlay.ref.setAnimation(
					isSelected ? google.maps.Animation.BOUNCE : null,
				);
			}
		});
	}, [selectedZoneId]);

	if (!googleMapsApiKey) {
		return (
			<Card className="flex h-[420px] items-center justify-center text-muted-foreground">
				<div className="flex flex-col items-center gap-2 text-center">
					<MapPinIcon className="h-10 w-10" />
					<p className="text-sm">
						{t("pricing.zones.map.noApiKey")}
					</p>
					<p className="text-xs">
						{t("pricing.zones.map.configureInSettings")}
					</p>
				</div>
			</Card>
		);
	}

	if (!isReady) {
		return (
			<Card className="h-[420px]">
				<Skeleton className="h-full w-full" />
			</Card>
		);
	}

	return (
		<Card className="h-[420px] overflow-hidden">
			<div ref={mapRef} className="h-full w-full" />
		</Card>
	);
}
