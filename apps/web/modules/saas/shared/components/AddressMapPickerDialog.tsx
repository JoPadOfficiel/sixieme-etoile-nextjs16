"use client";

import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { cn } from "@ui/lib";
import { Loader2Icon, MapPinIcon, AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useCallback, useRef, useEffect } from "react";
import { useGoogleMaps } from "../providers/GoogleMapsProvider";
import type { AddressResult } from "./AddressAutocomplete";

interface AddressMapPickerDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	initialPosition?: { lat: number; lng: number } | null;
	onConfirm: (result: AddressResult) => void;
}

// Default center: Paris (outside component to avoid dependency issues)
const DEFAULT_CENTER = { lat: 48.8566, lng: 2.3522 };

/**
 * AddressMapPickerDialog Component
 *
 * A dialog that displays a Google Map for visual address selection.
 * User can click on the map to place a marker and the address is
 * resolved via reverse geocoding.
 *
 * Story 14.4: Interactive Map for Address Selection
 *
 * @see Story 14.3: AddressAutocomplete integration
 */
export function AddressMapPickerDialog({
	open,
	onOpenChange,
	initialPosition,
	onConfirm,
}: AddressMapPickerDialogProps) {
	const t = useTranslations();
	const { isLoaded, isLoading, error: mapsError } = useGoogleMaps();

	const mapRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const markerRef = useRef<google.maps.Marker | null>(null);
	const geocoderRef = useRef<google.maps.Geocoder | null>(null);

	const [selectedPosition, setSelectedPosition] = useState<{
		lat: number;
		lng: number;
	} | null>(initialPosition || null);
	const [selectedAddress, setSelectedAddress] = useState<string>("");
	const [isGeocoding, setIsGeocoding] = useState(false);
	const [geocodeError, setGeocodeError] = useState<string | null>(null);
	const [mapContainerReady, setMapContainerReady] = useState(false);

	// Reverse geocode coordinates to address
	const reverseGeocode = useCallback(async (lat: number, lng: number) => {
		const geocoder = geocoderRef.current;
		if (!geocoder) {
			setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
			return;
		}

		setIsGeocoding(true);
		setGeocodeError(null);

		try {
			const response = await geocoder.geocode({
				location: { lat, lng },
			});

			if (response.results && response.results.length > 0) {
				setSelectedAddress(response.results[0].formatted_address);
			} else {
				setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
				setGeocodeError(t("common.map.noAddressFound"));
			}
		} catch (error) {
			console.error("[AddressMapPickerDialog] Reverse geocoding error:", error);
			setSelectedAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
			setGeocodeError(t("common.map.geocodingError"));
		} finally {
			setIsGeocoding(false);
		}
	}, [t]);

	// Place or move marker
	const placeMarker = useCallback((lat: number, lng: number) => {
		const map = mapInstanceRef.current;
		if (!map) return;

		const position = { lat, lng };

		if (markerRef.current) {
			// Move existing marker
			markerRef.current.setPosition(position);
		} else {
			// Create new marker
			markerRef.current = new google.maps.Marker({
				map,
				position,
				animation: google.maps.Animation.DROP,
				draggable: true,
			});

			// Add drag listener
			markerRef.current.addListener("dragend", () => {
				const pos = markerRef.current?.getPosition();
				if (pos) {
					const newLat = pos.lat();
					const newLng = pos.lng();
					setSelectedPosition({ lat: newLat, lng: newLng });
					reverseGeocode(newLat, newLng);
				}
			});
		}

		setSelectedPosition(position);
	}, [reverseGeocode]);

	// Handle map click
	const handleMapClick = useCallback(
		(lat: number, lng: number) => {
			placeMarker(lat, lng);
			reverseGeocode(lat, lng);
		},
		[placeMarker, reverseGeocode]
	);

	// Set map container ready when dialog opens
	useEffect(() => {
		if (open) {
			// Small delay to ensure DOM is ready
			const timer = setTimeout(() => {
				setMapContainerReady(true);
			}, 100);
			return () => clearTimeout(timer);
		} else {
			setMapContainerReady(false);
			// Clean up map instance when dialog closes
			if (mapInstanceRef.current) {
				mapInstanceRef.current = null;
			}
			if (markerRef.current) {
				markerRef.current.setMap(null);
				markerRef.current = null;
			}
		}
	}, [open]);

	// Initialize map when container is ready
	useEffect(() => {
		if (!mapContainerReady || !isLoaded || !mapRef.current) return;

		// Already initialized
		if (mapInstanceRef.current) {
			// Just update center if we have initial position
			if (initialPosition) {
				mapInstanceRef.current.setCenter(initialPosition);
				mapInstanceRef.current.setZoom(15);
			}
			return;
		}

		// Create map
		const map = new google.maps.Map(mapRef.current, {
			center: initialPosition || DEFAULT_CENTER,
			zoom: initialPosition ? 15 : 11,
			streetViewControl: false,
			fullscreenControl: false,
			mapTypeControl: false,
			clickableIcons: false,
		});

		mapInstanceRef.current = map;

		// Create geocoder
		geocoderRef.current = new google.maps.Geocoder();

		// Add click listener
		map.addListener("click", (event: google.maps.MapMouseEvent) => {
			if (event.latLng) {
				const lat = event.latLng.lat();
				const lng = event.latLng.lng();
				handleMapClick(lat, lng);
			}
		});

		// If we have initial position, place marker
		if (initialPosition) {
			placeMarker(initialPosition.lat, initialPosition.lng);
			reverseGeocode(initialPosition.lat, initialPosition.lng);
		}
	}, [mapContainerReady, isLoaded, initialPosition, handleMapClick, placeMarker, reverseGeocode]);

	// Reset state when dialog closes
	useEffect(() => {
		if (!open) {
			setSelectedPosition(initialPosition || null);
			setSelectedAddress("");
			setGeocodeError(null);
		}
	}, [open, initialPosition]);

	// Handle confirm
	const handleConfirm = useCallback(() => {
		if (selectedPosition) {
			onConfirm({
				address: selectedAddress || `${selectedPosition.lat.toFixed(6)}, ${selectedPosition.lng.toFixed(6)}`,
				latitude: selectedPosition.lat,
				longitude: selectedPosition.lng,
			});
			onOpenChange(false);
		}
	}, [selectedPosition, selectedAddress, onConfirm, onOpenChange]);

	// Handle cancel
	const handleCancel = useCallback(() => {
		onOpenChange(false);
	}, [onOpenChange]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-[700px] max-h-[90vh]">
				<DialogHeader>
					<DialogTitle>{t("common.map.selectLocation")}</DialogTitle>
					<DialogDescription>
						{t("common.map.clickToSelect")}
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Map container */}
					<div className="relative w-full h-[400px] rounded-lg overflow-hidden border">
						{isLoading && (
							<div className="absolute inset-0 flex items-center justify-center bg-muted">
								<Loader2Icon className="h-8 w-8 animate-spin text-muted-foreground" />
							</div>
						)}

						{mapsError && (
							<div className="absolute inset-0 flex flex-col items-center justify-center bg-muted gap-2">
								<AlertCircle className="h-8 w-8 text-destructive" />
								<p className="text-sm text-muted-foreground">{mapsError}</p>
							</div>
						)}

						{isLoaded && !mapsError && (
							<div ref={mapRef} className="w-full h-full" />
						)}
					</div>

					{/* Selected address display */}
					<div className="space-y-2">
						<div className="flex items-center gap-2 text-sm font-medium">
							<MapPinIcon className="h-4 w-4 text-primary" />
							{t("common.map.selectedAddress")}
						</div>

						<div
							className={cn(
								"p-3 rounded-md border bg-muted/50 min-h-[48px] flex items-center",
								!selectedPosition && "text-muted-foreground italic"
							)}
						>
							{isGeocoding ? (
								<div className="flex items-center gap-2">
									<Loader2Icon className="h-4 w-4 animate-spin" />
									<span>{t("common.map.loadingAddress")}</span>
								</div>
							) : selectedPosition ? (
								<span>{selectedAddress}</span>
							) : (
								<span>{t("common.map.noLocationSelected")}</span>
							)}
						</div>

						{geocodeError && (
							<p className="text-xs text-amber-600 dark:text-amber-400">
								{geocodeError}
							</p>
						)}
					</div>
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={handleCancel}>
						{t("common.cancel")}
					</Button>
					<Button
						onClick={handleConfirm}
						disabled={!selectedPosition || isGeocoding}
					>
						{t("common.map.confirmSelection")}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

export default AddressMapPickerDialog;
