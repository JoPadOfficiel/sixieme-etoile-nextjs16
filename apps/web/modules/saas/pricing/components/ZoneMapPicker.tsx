"use client";

/// <reference types="@types/google.maps" />

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Loader2, MapPinIcon, SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";

interface ZoneMapPickerProps {
	centerLatitude: number | null;
	centerLongitude: number | null;
	radiusKm: number | null;
	onLocationChange: (lat: number, lng: number) => void;
	onRadiusChange?: (radiusKm: number) => void;
	showRadius?: boolean;
	googleMapsApiKey?: string | null;
}

export function ZoneMapPicker({
	centerLatitude,
	centerLongitude,
	radiusKm,
	onLocationChange,
	onRadiusChange,
	showRadius = false,
	googleMapsApiKey,
}: ZoneMapPickerProps) {
	const t = useTranslations();
	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const markerRef = useRef<google.maps.Marker | null>(null);
	const circleRef = useRef<google.maps.Circle | null>(null);
	const searchInputRef = useRef<HTMLInputElement>(null);

	const [isLoading, setIsLoading] = useState(!googleMapsApiKey ? false : true);
	const [error, setError] = useState<string | null>(
		!googleMapsApiKey ? "noApiKey" : null,
	);
	const [searchQuery, setSearchQuery] = useState("");

	// Default to Paris if no coordinates
	const defaultLat = centerLatitude ?? 48.8566;
	const defaultLng = centerLongitude ?? 2.3522;

	const updateMarkerAndCircle = useCallback(
		(lat: number, lng: number, radius?: number) => {
			if (!mapInstanceRef.current) return;

			const position = { lat, lng };

			// Update or create marker
			if (markerRef.current) {
				markerRef.current.setPosition(position);
			} else {
				markerRef.current = new google.maps.Marker({
					position,
					map: mapInstanceRef.current,
					draggable: true,
					title: t("pricing.zones.form.dragMarker"),
				});

				// Handle marker drag
				markerRef.current.addListener("dragend", () => {
					const pos = markerRef.current?.getPosition();
					if (pos) {
						onLocationChange(pos.lat(), pos.lng());
						if (circleRef.current) {
							circleRef.current.setCenter(pos);
						}
					}
				});
			}

			// Update or create circle for radius zones
			if (showRadius && radius) {
				const radiusMeters = radius * 1000;
				if (circleRef.current) {
					circleRef.current.setCenter(position);
					circleRef.current.setRadius(radiusMeters);
				} else {
					circleRef.current = new google.maps.Circle({
						map: mapInstanceRef.current,
						center: position,
						radius: radiusMeters,
						fillColor: "#3b82f6",
						fillOpacity: 0.2,
						strokeColor: "#3b82f6",
						strokeOpacity: 0.8,
						strokeWeight: 2,
						editable: true,
					});

					// Handle radius change via circle edit
					circleRef.current.addListener("radius_changed", () => {
						const newRadius = circleRef.current?.getRadius();
						if (newRadius && onRadiusChange) {
							onRadiusChange(Math.round((newRadius / 1000) * 100) / 100);
						}
					});
				}
			}

			mapInstanceRef.current.setCenter(position);
		},
		[onLocationChange, onRadiusChange, showRadius, t],
	);

	const initializeMap = useCallback(() => {
		if (!mapRef.current || !window.google) return;

		const map = new google.maps.Map(mapRef.current, {
			center: { lat: defaultLat, lng: defaultLng },
			zoom: 12,
			mapTypeControl: true,
			streetViewControl: false,
			fullscreenControl: true,
		});

		mapInstanceRef.current = map;

		// Click on map to set location
		map.addListener("click", (e: google.maps.MapMouseEvent) => {
			if (e.latLng) {
				const lat = e.latLng.lat();
				const lng = e.latLng.lng();
				onLocationChange(lat, lng);
				updateMarkerAndCircle(lat, lng, radiusKm ?? undefined);
			}
		});

		// Initialize marker if we have coordinates
		if (centerLatitude && centerLongitude) {
			updateMarkerAndCircle(
				centerLatitude,
				centerLongitude,
				radiusKm ?? undefined,
			);
		}

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
					const lat = place.geometry.location.lat();
					const lng = place.geometry.location.lng();
					onLocationChange(lat, lng);
					updateMarkerAndCircle(lat, lng, radiusKm ?? undefined);
					map.setZoom(14);
				}
			});
		}

		setIsLoading(false);
	}, [
		defaultLat,
		defaultLng,
		centerLatitude,
		centerLongitude,
		radiusKm,
		onLocationChange,
		updateMarkerAndCircle,
	]);

	// Load Google Maps script
	useEffect(() => {
		if (!googleMapsApiKey) {
			return;
		}

		if (window.google?.maps) {
			initializeMap();
			return;
		}

		const script = document.createElement("script");
		script.src = `https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}&libraries=places`;
		script.async = true;
		script.defer = true;

		script.onload = () => {
			initializeMap();
		};

		script.onerror = () => {
			setError(t("pricing.zones.map.loadError"));
			setIsLoading(false);
		};

		document.head.appendChild(script);

		return () => {
			// Cleanup
			if (markerRef.current) {
				markerRef.current.setMap(null);
			}
			if (circleRef.current) {
				circleRef.current.setMap(null);
			}
		};
	}, [googleMapsApiKey, initializeMap, t]);

	// Update circle when radius changes externally
	useEffect(() => {
		if (circleRef.current && radiusKm) {
			circleRef.current.setRadius(radiusKm * 1000);
		}
	}, [radiusKm]);

	// Update marker when coordinates change externally
	useEffect(() => {
		if (
			mapInstanceRef.current &&
			centerLatitude !== null &&
			centerLongitude !== null
		) {
			updateMarkerAndCircle(
				centerLatitude,
				centerLongitude,
				radiusKm ?? undefined,
			);
		}
	}, [centerLatitude, centerLongitude, radiusKm, updateMarkerAndCircle]);

	const handleSearch = () => {
		if (!searchQuery.trim() || !mapInstanceRef.current) return;

		const geocoder = new google.maps.Geocoder();
		geocoder.geocode({ address: searchQuery }, (results, status) => {
			if (status === "OK" && results?.[0]?.geometry?.location) {
				const location = results[0].geometry.location;
				const lat = location.lat();
				const lng = location.lng();
				onLocationChange(lat, lng);
				updateMarkerAndCircle(lat, lng, radiusKm ?? undefined);
				mapInstanceRef.current?.setZoom(14);
			}
		});
	};

	if (error) {
		return (
			<div className="rounded-lg border border-dashed p-8 text-center">
				<MapPinIcon className="mx-auto h-12 w-12 text-muted-foreground" />
				<p className="mt-2 text-muted-foreground text-sm">{error}</p>
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

			{/* Map container */}
			<div className="relative h-[300px] w-full overflow-hidden rounded-lg border">
				{isLoading && (
					<div className="absolute inset-0 z-10 flex items-center justify-center bg-muted/50">
						<Loader2 className="h-8 w-8 animate-spin text-primary" />
					</div>
				)}
				<div ref={mapRef} className="h-full w-full" />
			</div>

			{/* Coordinates display */}
			{centerLatitude !== null && centerLongitude !== null && (
				<div className="flex gap-4 text-muted-foreground text-sm">
					<span>
						<Label className="text-xs">Lat:</Label>{" "}
						{Number(centerLatitude).toFixed(6)}
					</span>
					<span>
						<Label className="text-xs">Lng:</Label>{" "}
						{Number(centerLongitude).toFixed(6)}
					</span>
				</div>
			)}

			<p className="text-muted-foreground text-xs">
				{t("pricing.zones.map.instructions")}
			</p>
		</div>
	);
}
