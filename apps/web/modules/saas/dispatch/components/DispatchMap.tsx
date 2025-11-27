"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapIcon, AlertCircle, MapPin, Navigation, Building2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { MissionDetail } from "../types";
import type { OperatingBase } from "../hooks/useOperatingBases";
import type { CandidateBase, CandidateSegments } from "../types/assignment";
import { CandidateBaseMarker, MarkerLegend } from "./CandidateBaseMarker";
import { RouteSegments } from "./RouteSegments";

/**
 * DispatchMap Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 * Story 8.3: Multi-Base Optimisation & Visualisation
 *
 * Shows a visual representation of the mission route.
 * Enhanced with candidate bases and route segment visualization.
 *
 * @see AC1: Candidate Bases Display on Map
 * @see AC2: Route Preview on Hover
 * @see AC3: Full Route Display for Selected Candidate
 * @see AC5: Map-to-Drawer Interaction
 */

interface DispatchMapProps {
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
}

export function DispatchMap({
	mission,
	bases,
	isLoading = false,
	className,
	// Story 8.3: Multi-base visualization props
	candidateBases = [],
	selectedCandidateId,
	hoveredCandidateId,
	activeSegments,
	showApproach = false,
	showReturn = false,
	isPreview = false,
	isLoadingRoutes = false,
	onCandidateSelect,
	onCandidateHoverStart,
	onCandidateHoverEnd,
}: DispatchMapProps) {
	const t = useTranslations("dispatch.map");
	const [googleMapsAvailable, setGoogleMapsAvailable] = useState(false);

	// Check if Google Maps is available
	useEffect(() => {
		const checkGoogleMaps = () => {
			if (typeof window !== "undefined" && window.google?.maps) {
				setGoogleMapsAvailable(true);
			}
		};
		
		// Check immediately
		checkGoogleMaps();
		
		// Also check after a short delay in case script is loading
		const timeout = setTimeout(checkGoogleMaps, 1000);
		return () => clearTimeout(timeout);
	}, []);

	// Story 8.3: Get active candidate base for route display
	const activeCandidateBase = useMemo(() => {
		const activeId = hoveredCandidateId ?? selectedCandidateId;
		if (!activeId) return null;
		return candidateBases.find((b) => b.vehicleId === activeId) ?? null;
	}, [candidateBases, hoveredCandidateId, selectedCandidateId]);

	// Story 8.3: Separate candidate bases from other bases
	const candidateBaseIds = useMemo(
		() => new Set(candidateBases.map((b) => b.baseId)),
		[candidateBases],
	);

	const otherBases = useMemo(
		() => bases.filter((b) => b.isActive && !candidateBaseIds.has(b.id)),
		[bases, candidateBaseIds],
	);

	if (isLoading) {
		return <DispatchMapSkeleton className={className} />;
	}

	if (!mission) {
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

	// Story 8.3: Check if we have candidate bases to show
	const hasCandidates = candidateBases.length > 0;

	return (
		<Card className={cn("h-full overflow-hidden", className)} data-testid="dispatch-map">
			<CardContent className="h-full p-4">
				<div className="h-full flex flex-col">
					{/* Loading indicator for routes */}
					{isLoadingRoutes && (
						<div className="absolute top-2 right-2 z-50 flex items-center gap-1 bg-background/80 px-2 py-1 rounded text-xs">
							<Loader2 className="size-3 animate-spin" />
							<span>{t("loadingRoutes")}</span>
						</div>
					)}

					{/* Route visualization */}
					<div className="flex-1 bg-muted/30 rounded-lg p-4 flex flex-col justify-center relative">
						{/* Story 8.3: Show route segments when candidate is active */}
						{activeCandidateBase && activeSegments && (
							<div className="mb-4">
								<RouteSegments
									base={{
										lat: activeCandidateBase.latitude,
										lng: activeCandidateBase.longitude,
									}}
									baseName={activeCandidateBase.baseName}
									segments={activeSegments}
									showApproach={showApproach}
									showReturn={showReturn}
									isPreview={isPreview}
								/>
							</div>
						)}

						{/* Pickup */}
						<div className="flex items-start gap-3 mb-4">
							<div className="p-2 bg-green-500/10 rounded-full">
								<MapPin className="size-5 text-green-600" />
							</div>
							<div className="flex-1">
								<div className="text-xs font-medium text-green-600 uppercase">
									{t("pickup")}
								</div>
								<div className="text-sm font-medium">{mission.pickupAddress}</div>
								{mission.pickupLatitude && mission.pickupLongitude && (
									<div className="text-xs text-muted-foreground">
										{mission.pickupLatitude.toFixed(4)}, {mission.pickupLongitude.toFixed(4)}
									</div>
								)}
							</div>
						</div>

						{/* Route line */}
						<div className="flex items-center gap-3 ml-4 mb-4">
							<div className="w-0.5 h-8 bg-blue-500/50 ml-2" />
							<Navigation className="size-4 text-blue-500 rotate-90" />
							<span className="text-xs text-muted-foreground">
								{t("route")}
							</span>
						</div>

						{/* Dropoff */}
						<div className="flex items-start gap-3">
							<div className="p-2 bg-red-500/10 rounded-full">
								<MapPin className="size-5 text-red-600" />
							</div>
							<div className="flex-1">
								<div className="text-xs font-medium text-red-600 uppercase">
									{t("dropoff")}
								</div>
								<div className="text-sm font-medium">{mission.dropoffAddress}</div>
								{mission.dropoffLatitude && mission.dropoffLongitude && (
									<div className="text-xs text-muted-foreground">
										{mission.dropoffLatitude.toFixed(4)}, {mission.dropoffLongitude.toFixed(4)}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Story 8.3: Candidate bases section */}
					{hasCandidates && (
						<div className="mt-4 pt-4 border-t">
							<div className="text-xs font-medium text-muted-foreground mb-2">
								{t("candidateBases")} ({candidateBases.length})
							</div>
							<div className="flex flex-wrap gap-2">
								{candidateBases.map((candidate) => {
									const isSelected = candidate.vehicleId === selectedCandidateId;
									const isHovered = candidate.vehicleId === hoveredCandidateId;
									const state = isSelected
										? "selected"
										: isHovered
											? "hovered"
											: "candidate";

									return (
										<CandidateBaseMarker
											key={candidate.vehicleId}
											baseName={candidate.baseName}
											baseDistanceKm={candidate.segments.approach.distanceKm}
											estimatedCost={candidate.estimatedCost}
											state={state}
											onClick={() => onCandidateSelect?.(candidate.vehicleId)}
											onMouseEnter={() => onCandidateHoverStart?.(candidate.vehicleId)}
											onMouseLeave={() => onCandidateHoverEnd?.()}
										/>
									);
								})}
							</div>
						</div>
					)}

					{/* Other bases summary (non-candidates) */}
					{otherBases.length > 0 && (
						<div className="mt-4 pt-4 border-t">
							<div className="text-xs font-medium text-muted-foreground mb-2">
								{t("otherBases")} ({otherBases.length})
							</div>
							<div className="flex flex-wrap gap-2">
								{otherBases.slice(0, 5).map((base) => (
									<div
										key={base.id}
										className="flex items-center gap-1 text-xs bg-gray-500/10 text-gray-600 dark:text-gray-400 px-2 py-1 rounded"
									>
										<Building2 className="size-3" />
										{base.name}
									</div>
								))}
								{otherBases.length > 5 && (
									<div className="text-xs text-muted-foreground px-2 py-1">
										+{otherBases.length - 5} {t("more")}
									</div>
								)}
							</div>
						</div>
					)}

					{/* No candidates message */}
					{!hasCandidates && bases.length > 0 && (
						<div className="mt-4 pt-4 border-t">
							<div className="flex items-center gap-2 text-xs text-amber-600">
								<AlertCircle className="size-3" />
								<span>{t("noCandidates")}</span>
							</div>
						</div>
					)}

					{/* Legend */}
					{hasCandidates && (
						<div className="mt-4 pt-4 border-t">
							<MarkerLegend />
						</div>
					)}

					{/* Google Maps hint */}
					{!googleMapsAvailable && !hasCandidates && (
						<div className="mt-4 pt-4 border-t">
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<AlertCircle className="size-3" />
								<span>
									Configure Google Maps API in Settings → Integrations for interactive map
								</span>
							</div>
						</div>
					)}
				</div>
			</CardContent>
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

export default DispatchMap;
