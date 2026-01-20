"use client";

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useMemo, useState, useCallback } from "react";
import { Card, CardContent } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapIcon, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { MissionDetail } from "../types";
import type { OperatingBase } from "../hooks/useOperatingBases";
import type { CandidateBase, CandidateSegments } from "../types/assignment";
import { useGoogleMaps } from "@saas/shared/providers/GoogleMapsProvider";
import type { DriverPosition } from "../mocks/driverPositions";
import { decodePolyline } from "@saas/shared/utils/polyline";
import {
	findNearestDrivers,
	getSuggestionForDriver,
	formatDistance,
	type SuggestedDriver,
} from "../utils/geo";

/**
 * DispatchMapGoogle Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 * Story 8.3: Multi-Base Optimisation & Visualisation
 * Story 27.7: Live Map Mission Context Layer
 *
 * Interactive Google Maps component showing:
 * - Mission pickup/dropoff markers
 * - Route polyline between pickup and dropoff (real route when available)
 * - Operating bases as markers
 * - Candidate bases with distinct styling
 * - Approach/Return route segments when candidate is selected
 *
 * @see AC1: Candidate Bases Display on Map
 * @see AC2: Route Preview on Hover
 * @see AC3: Full Route Display for Selected Candidate
 * @see AC5: Map-to-Drawer Interaction
 */

interface DispatchMapGoogleProps {
	mission: MissionDetail | null;
	bases: OperatingBase[];
	isLoading?: boolean;
	className?: string;
	// Story 8.3: Multi-base visualization props
	candidateBases?: CandidateBase[];
	selectedCandidateId?: string | null;
	hoveredCandidateId?: string | null;
	activeSegments?: CandidateSegments | null;
	showApproach?: boolean;
	showReturn?: boolean;
	isPreview?: boolean;
	isLoadingRoutes?: boolean;
	onCandidateSelect?: (vehicleId: string) => void;
	onCandidateHoverStart?: (vehicleId: string) => void;
	onCandidateHoverEnd?: () => void;
	drivers?: DriverPosition[];
	// Story 27.7: Encoded polyline for real route display
	encodedPolyline?: string | null;
}

// Marker colors
const COLORS = {
	pickup: "#22c55e", // green-500
	dropoff: "#ef4444", // red-500
	route: "#3b82f6", // blue-500
	approach: "#6b7280", // gray-500
	return: "#9ca3af", // gray-400
	base: "#6b7280", // gray-500
	candidateBase: "#f59e0b", // amber-500
	selectedBase: "#8b5cf6", // violet-500
	hoveredBase: "#ec4899", // pink-500
	driverActive: "#10B981", // emerald-500
	driverInactive: "#9CA3AF", // gray-400
	// Story 27.8: Suggested driver colors
	driverSuggested: "#F59E0B", // amber-500 - Gold for suggestions
	driverSuggestedGlow: "#FCD34D", // amber-300 - Lighter for glow effect
};

export function DispatchMapGoogle({
	mission,
	bases,
	isLoading = false,
	className,
	candidateBases = [],
	selectedCandidateId,
	hoveredCandidateId,
	// activeSegments - Reserved for future use with actual route geometry from Google Directions API
	showApproach = false,
	showReturn = false,
	isPreview = false,
	isLoadingRoutes = false,
	onCandidateSelect,
	onCandidateHoverStart,
	onCandidateHoverEnd,
	drivers = [],
	encodedPolyline,
}: DispatchMapGoogleProps) {
	const t = useTranslations("dispatch.map");
	const tCommon = useTranslations("common.map");
	
	// Story 10.1: Use GoogleMapsProvider instead of loading script directly
	const { isLoaded: isMapReady, isLoading: apiKeyLoading, error: mapError } = useGoogleMaps();
	
	const mapContainerRef = useRef<HTMLDivElement>(null);
	const mapInstanceRef = useRef<google.maps.Map | null>(null);
	const markersRef = useRef<Map<string, google.maps.Marker>>(new Map());
	const polylinesRef = useRef<Map<string, google.maps.Polyline>>(new Map());
	const [mapContainerReady, setMapContainerReady] = useState(false);

	// Callback ref to detect when map container is mounted/unmounted
	const mapRef = useCallback((node: HTMLDivElement | null) => {
		if (node) {
			mapContainerRef.current = node;
			setMapContainerReady(true);
		} else {
			// Container unmounted - cleanup map instance
			if (mapInstanceRef.current) {
				// Clear markers and polylines
				markersRef.current.forEach((marker) => marker.setMap(null));
				markersRef.current.clear();
				polylinesRef.current.forEach((polyline) => polyline.setMap(null));
				polylinesRef.current.clear();
				mapInstanceRef.current = null;
			}
			mapContainerRef.current = null;
			setMapContainerReady(false);
		}
	}, []);

	// Initialize map when both Google Maps is ready AND container is mounted
	useEffect(() => {
		if (!isMapReady || !mapContainerReady || !mapContainerRef.current) {
			return;
		}

		// If map already exists and container is the same, don't recreate
		if (mapInstanceRef.current) {
			return;
		}

		try {
			const map = new google.maps.Map(mapContainerRef.current, {
				center: { lat: 48.8566, lng: 2.3522 }, // Paris
				zoom: 10,
				streetViewControl: false,
				fullscreenControl: true,
				mapTypeControl: true,
				mapTypeControlOptions: {
					position: google.maps.ControlPosition.TOP_LEFT,
				},
			});

			mapInstanceRef.current = map;
		} catch (error) {
			console.error("[DispatchMapGoogle] Error creating map:", error);
		}
	}, [isMapReady, mapContainerReady]);

	// Get active candidate base
	const activeCandidateBase = useMemo(() => {
		const activeId = hoveredCandidateId ?? selectedCandidateId;
		if (!activeId) return null;
		return candidateBases.find((b) => b.vehicleId === activeId) ?? null;
	}, [candidateBases, hoveredCandidateId, selectedCandidateId]);

	// Story 27.8: Calculate nearest driver suggestions
	const suggestedDrivers: SuggestedDriver[] = useMemo(() => {
		// Only calculate if we have a mission with pickup coordinates
		if (!mission?.pickupLatitude || !mission?.pickupLongitude) {
			return [];
		}
		// Only calculate if we have drivers
		if (drivers.length === 0) {
			return [];
		}
		return findNearestDrivers(
			mission.pickupLatitude,
			mission.pickupLongitude,
			drivers,
			3 // Top 3 suggestions
		);
	}, [mission, drivers]);

	// Update markers and polylines when mission or candidates change
	useEffect(() => {
		const map = mapInstanceRef.current;
		if (!map || !isMapReady) return;

		// Clear existing markers and polylines
		markersRef.current.forEach((marker) => marker.setMap(null));
		markersRef.current.clear();
		polylinesRef.current.forEach((polyline) => polyline.setMap(null));
		polylinesRef.current.clear();

		polylinesRef.current.clear();
		
		const bounds = new google.maps.LatLngBounds();

		// Add Driver Markers (Story 27.6 + Story 27.8 Suggestions)
		drivers.forEach((driver) => {
			if (!driver.lat || !driver.lng) return;
			const pos = { lat: driver.lat, lng: driver.lng };
			const isActive = driver.status === "ACTIVE";
			
			// Story 27.8: Check if this driver is a suggested candidate
			const suggestion = getSuggestionForDriver(driver.id, suggestedDrivers);
			const isSuggested = suggestion !== null;
			
			// Determine color and style based on suggestion status
			let color: string;
			let scale: number;
			let strokeWeight: number;
			let zIndex: number;
			let title: string;
			
			if (isSuggested) {
				// Suggested driver - gold/amber with larger marker
				color = COLORS.driverSuggested;
				scale = 10; // Larger than normal
				strokeWeight = 3; // Thicker border for glow effect
				zIndex = 70 + (4 - suggestion.rank); // Higher z-index for top suggestions
				title = `${driver.name} (${formatDistance(suggestion.distanceKm)}) - Suggestion #${suggestion.rank}`;
			} else if (isActive) {
				// Active but not suggested
				color = COLORS.driverActive;
				scale = 7;
				strokeWeight = 2;
				zIndex = 60;
				title = `${driver.name} (${t("driverStatus.active")})`;
			} else {
				// Inactive driver
				color = COLORS.driverInactive;
				scale = 7;
				strokeWeight = 2;
				zIndex = 55;
				title = `${driver.name} (${t("driverStatus.inactive")})`;
			}
			
			// Create glow effect marker for suggested drivers (behind main marker)
			if (isSuggested) {
				const glowMarker = new google.maps.Marker({
					map,
					position: pos,
					icon: {
						path: google.maps.SymbolPath.CIRCLE,
						scale: 14, // Larger for glow effect
						fillColor: COLORS.driverSuggestedGlow,
						fillOpacity: 0.4,
						strokeColor: COLORS.driverSuggestedGlow,
						strokeWeight: 0,
					},
					zIndex: zIndex - 1, // Behind main marker
				});
				markersRef.current.set(`driver-glow-${driver.id}`, glowMarker);
			}
			
			const marker = new google.maps.Marker({
				map,
				position: pos,
				title,
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale,
					fillColor: color,
					fillOpacity: 1,
					strokeColor: isSuggested ? COLORS.driverSuggestedGlow : "#ffffff",
					strokeWeight,
				},
				zIndex,
			});
			
			markersRef.current.set(`driver-${driver.id}`, marker);
			bounds.extend(pos);
		});

		if (!mission) {
			// If no mission but we have drivers or bases, fit bounds to them
			if (!bounds.isEmpty()) {
				map.fitBounds(bounds, 50);
			} else {
				// Default to Paris if nothing to show
				map.setCenter({ lat: 48.8566, lng: 2.3522 });
				map.setZoom(12);
			}
			return;
		}

		// Add pickup marker
		if (mission.pickupLatitude && mission.pickupLongitude) {
			const pickupPos = { lat: mission.pickupLatitude, lng: mission.pickupLongitude };
			const pickupMarker = new google.maps.Marker({
				map,
				position: pickupPos,
				title: `${t("pickup")}: ${mission.pickupAddress}`,
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale: 10,
					fillColor: COLORS.pickup,
					fillOpacity: 1,
					strokeColor: "#ffffff",
					strokeWeight: 2,
				},
				zIndex: 100,
			});
			markersRef.current.set("pickup", pickupMarker);
			bounds.extend(pickupPos);
		}

		// Add dropoff marker
		if (mission.dropoffLatitude && mission.dropoffLongitude) {
			const dropoffPos = { lat: mission.dropoffLatitude, lng: mission.dropoffLongitude };
			const dropoffMarker = new google.maps.Marker({
				map,
				position: dropoffPos,
				title: `${t("dropoff")}: ${mission.dropoffAddress}`,
				icon: {
					path: google.maps.SymbolPath.CIRCLE,
					scale: 10,
					fillColor: COLORS.dropoff,
					fillOpacity: 1,
					strokeColor: "#ffffff",
					strokeWeight: 2,
				},
				zIndex: 100,
			});
			markersRef.current.set("dropoff", dropoffMarker);
			bounds.extend(dropoffPos);
		}

		// Story 27.7: Add route polyline (real route if available, fallback to straight line)
		if (
			mission.pickupLatitude &&
			mission.pickupLongitude &&
			mission.dropoffLatitude &&
			mission.dropoffLongitude
		) {
			let routePath: Array<{ lat: number; lng: number }>;

			// Try to use encoded polyline for real route display
			if (encodedPolyline) {
				try {
					const decodedPath = decodePolyline(encodedPolyline);
					if (decodedPath.length > 0) {
						routePath = decodedPath;
						// Extend bounds to include all polyline points for proper fitBounds
						decodedPath.forEach((point) => bounds.extend(point));
						console.log("[DispatchMapGoogle] Using encoded polyline with", decodedPath.length, "points");
					} else {
						// Fallback to straight line if decode returns empty
						routePath = [
							{ lat: mission.pickupLatitude, lng: mission.pickupLongitude },
							{ lat: mission.dropoffLatitude, lng: mission.dropoffLongitude },
						];
					}
				} catch (error) {
					// Fallback to straight line on decode error
					console.warn("[DispatchMapGoogle] Failed to decode polyline, using straight line:", error);
					routePath = [
						{ lat: mission.pickupLatitude, lng: mission.pickupLongitude },
						{ lat: mission.dropoffLatitude, lng: mission.dropoffLongitude },
					];
				}
			} else {
				// No encoded polyline (MANUAL mission) - use straight line
				routePath = [
					{ lat: mission.pickupLatitude, lng: mission.pickupLongitude },
					{ lat: mission.dropoffLatitude, lng: mission.dropoffLongitude },
				];
			}

			const routePolyline = new google.maps.Polyline({
				map,
				path: routePath,
				strokeColor: COLORS.route,
				strokeOpacity: 1,
				strokeWeight: 4,
				geodesic: true,
				zIndex: 50,
			});
			polylinesRef.current.set("route", routePolyline);
		}

		// Add base markers
		const candidateBaseIds = new Set(candidateBases.map((b) => b.baseId));
		
		bases.forEach((base) => {
			if (!base.isActive || !base.latitude || !base.longitude) return;
			if (candidateBaseIds.has(base.id)) return; // Skip candidate bases, we'll add them separately

			const basePos = { lat: base.latitude, lng: base.longitude };
			const baseMarker = new google.maps.Marker({
				map,
				position: basePos,
				title: base.name,
				icon: {
					path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
					scale: 5,
					fillColor: COLORS.base,
					fillOpacity: 0.7,
					strokeColor: "#ffffff",
					strokeWeight: 1,
				},
				zIndex: 10,
			});
			markersRef.current.set(`base-${base.id}`, baseMarker);
		});

		// Add candidate base markers
		candidateBases.forEach((candidate) => {
			const isSelected = candidate.candidateId === selectedCandidateId;
			const isHovered = candidate.candidateId === hoveredCandidateId;
			
			const color = isSelected
				? COLORS.selectedBase
				: isHovered
					? COLORS.hoveredBase
					: COLORS.candidateBase;

			const candidatePos = { lat: candidate.latitude, lng: candidate.longitude };
			const candidateMarker = new google.maps.Marker({
				map,
				position: candidatePos,
				title: candidate.baseName,
				icon: {
					path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
					scale: isSelected || isHovered ? 8 : 6,
					fillColor: color,
					fillOpacity: 1,
					strokeColor: "#ffffff",
					strokeWeight: 2,
				},
				zIndex: isSelected ? 90 : isHovered ? 80 : 70,
			});

			candidateMarker.addListener("click", () => {
				onCandidateSelect?.(candidate.candidateId);
			});
			candidateMarker.addListener("mouseover", () => {
				onCandidateHoverStart?.(candidate.candidateId);
			});
			candidateMarker.addListener("mouseout", () => {
				onCandidateHoverEnd?.();
			});

			markersRef.current.set(`candidate-${candidate.vehicleId}`, candidateMarker);
			bounds.extend(candidatePos);
		});

		// Add approach route (base to pickup) if active candidate
		if (
			showApproach &&
			activeCandidateBase &&
			mission.pickupLatitude &&
			mission.pickupLongitude
		) {
			const approachPath = [
				{ lat: activeCandidateBase.latitude, lng: activeCandidateBase.longitude },
				{ lat: mission.pickupLatitude, lng: mission.pickupLongitude },
			];
			const approachPolyline = new google.maps.Polyline({
				map,
				path: approachPath,
				strokeColor: COLORS.approach,
				strokeOpacity: isPreview ? 0.5 : 0.8,
				strokeWeight: isPreview ? 2 : 3,
				geodesic: true,
				icons: [
					{
						icon: {
							path: "M 0,-1 0,1",
							strokeOpacity: 1,
							scale: 3,
						},
						offset: "0",
						repeat: "15px",
					},
				],
				zIndex: 40,
			});
			polylinesRef.current.set("approach", approachPolyline);
		}

		// Add return route (dropoff to base) if selected (not preview)
		if (
			showReturn &&
			activeCandidateBase &&
			mission.dropoffLatitude &&
			mission.dropoffLongitude
		) {
			const returnPath = [
				{ lat: mission.dropoffLatitude, lng: mission.dropoffLongitude },
				{ lat: activeCandidateBase.latitude, lng: activeCandidateBase.longitude },
			];
			const returnPolyline = new google.maps.Polyline({
				map,
				path: returnPath,
				strokeColor: COLORS.return,
				strokeOpacity: 0.6,
				strokeWeight: 2,
				geodesic: true,
				icons: [
					{
						icon: {
							path: "M 0,-1 0,1",
							strokeOpacity: 1,
							scale: 2,
						},
						offset: "0",
						repeat: "10px",
					},
				],
				zIndex: 30,
			});
			polylinesRef.current.set("return", returnPolyline);
		}

		// Fit bounds
		if (!bounds.isEmpty()) {
			map.fitBounds(bounds, 50);
		}
	}, [
		mission,
		bases,
		candidateBases,
		selectedCandidateId,
		hoveredCandidateId,
		activeCandidateBase,
		showApproach,
		showReturn,
		isPreview,
		isMapReady,
		t,
		onCandidateSelect,
		onCandidateHoverStart,
		onCandidateHoverEnd,
		drivers,
		encodedPolyline,
		suggestedDrivers,
	]);

	// Loading state
	if (isLoading || apiKeyLoading) {
		return <DispatchMapSkeleton className={className} />;
	}

	// No API key or error loading Google Maps
	if (!isMapReady || mapError) {
		return (
			<Card className={cn("h-full", className)} data-testid="dispatch-map">
				<CardContent className="h-full flex items-center justify-center">
					<div className="text-center text-muted-foreground">
						<MapIcon className="size-12 mx-auto mb-4 opacity-50" />
						<p className="text-sm font-medium">{mapError || tCommon("noApiKey")}</p>
						<p className="text-xs mt-1">{tCommon("configureInSettings")}</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// No mission selected
	// No mission selected - still show map if we have drivers
	if (!mission && drivers.length === 0) {
		return (
			<Card className={cn("h-full", className)} data-testid="dispatch-map">
				<CardContent className="h-full flex items-center justify-center">
					<div className="text-center text-muted-foreground">
						<MapIcon className="size-12 mx-auto mb-4 opacity-50" />
						<p className="text-sm">{t("selectMission")}</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	// Check if mission has coordinates
	const hasCoordinates = mission && mission.pickupLatitude && mission.pickupLongitude;

	return (
		<Card className={cn("h-full overflow-hidden relative", className)} data-testid="dispatch-map">
			{/* Loading indicator for routes */}
			{isLoadingRoutes && (
				<div className="absolute top-2 right-2 z-50 flex items-center gap-1 bg-background/80 px-2 py-1 rounded text-xs">
					<Loader2 className="size-3 animate-spin" />
					<span>{t("loadingRoutes")}</span>
				</div>
			)}

			{/* No coordinates warning */}
			{!hasCoordinates && (
				<div className="absolute top-2 left-2 z-50 flex items-center gap-2 bg-amber-500/90 text-white px-3 py-2 rounded-lg text-xs shadow-sm">
					<MapIcon className="size-4" />
					<span>{t("noCoordinates")}</span>
				</div>
			)}

			{/* Map legend */}
			{hasCoordinates && (
				<div className="absolute bottom-2 left-2 z-50 bg-background/90 px-3 py-2 rounded-lg text-xs space-y-1 shadow-sm">
					<div className="flex items-center gap-2">
						<span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.pickup }} />
						<span>{t("pickup")}</span>
					</div>
					<div className="flex items-center gap-2">
						<span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.dropoff }} />
						<span>{t("dropoff")}</span>
					</div>
					{candidateBases.length > 0 && (
						<div className="flex items-center gap-2">
							<span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS.candidateBase }} />
							<span>{t("candidateBases")}</span>
						</div>
					)}
					{/* Story 27.8: Suggested drivers legend */}
					{suggestedDrivers.length > 0 && (
						<div className="flex items-center gap-2">
							<span 
								className="w-3 h-3 rounded-full ring-2 ring-amber-300/50" 
								style={{ backgroundColor: COLORS.driverSuggested }} 
							/>
							<span>{t("suggestedDrivers")}</span>
						</div>
					)}
				</div>
			)}

			{/* Map container - must have explicit dimensions for Google Maps */}
			{!isMapReady ? (
				<div className="h-full w-full flex items-center justify-center bg-muted/50">
					<div className="text-center">
						<Loader2 className="size-8 animate-spin mx-auto mb-2 text-muted-foreground" />
						<p className="text-sm text-muted-foreground">Loading Google Maps...</p>
						{mapError && <p className="text-xs text-destructive mt-1">{mapError}</p>}
					</div>
				</div>
			) : (
				<div 
					ref={mapRef} 
					className="w-full h-full" 
					style={{ height: "100%" }} 
				/>
			)}
		</Card>
	);
}

function DispatchMapSkeleton({ className }: { className?: string }) {
	return (
		<Card className={cn("h-full", className)}>
			<CardContent className="h-full p-0">
				<Skeleton className="h-full w-full" />
			</CardContent>
		</Card>
	);
}

export default DispatchMapGoogle;
