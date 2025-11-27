"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { MapIcon, AlertCircle, MapPin, Navigation } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { MissionDetail } from "../types";
import type { OperatingBase } from "../hooks/useOperatingBases";

/**
 * DispatchMap Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Shows a visual representation of the mission route.
 * For MVP, displays a placeholder with route info.
 * Full Google Maps integration requires API key configuration.
 *
 * @see AC4: Mission Selection and Map Update
 */

interface DispatchMapProps {
	mission: MissionDetail | null;
	bases: OperatingBase[];
	isLoading?: boolean;
	className?: string;
}

export function DispatchMap({
	mission,
	bases,
	isLoading = false,
	className,
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

	// For MVP: Show a visual route summary instead of full Google Maps
	// This avoids the complexity of Google Maps API key management
	return (
		<Card className={cn("h-full overflow-hidden", className)} data-testid="dispatch-map">
			<CardContent className="h-full p-4">
				<div className="h-full flex flex-col">
					{/* Route visualization */}
					<div className="flex-1 bg-muted/30 rounded-lg p-4 flex flex-col justify-center">
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

					{/* Bases summary */}
					{bases.length > 0 && (
						<div className="mt-4 pt-4 border-t">
							<div className="text-xs font-medium text-muted-foreground mb-2">
								{t("nearbyBases")} ({bases.filter(b => b.isActive).length})
							</div>
							<div className="flex flex-wrap gap-2">
								{bases.filter(b => b.isActive).slice(0, 5).map((base) => (
									<div
										key={base.id}
										className="text-xs bg-blue-500/10 text-blue-700 dark:text-blue-400 px-2 py-1 rounded"
									>
										{base.name}
									</div>
								))}
								{bases.filter(b => b.isActive).length > 5 && (
									<div className="text-xs text-muted-foreground px-2 py-1">
										+{bases.filter(b => b.isActive).length - 5} more
									</div>
								)}
							</div>
						</div>
					)}

					{/* Google Maps hint */}
					{!googleMapsAvailable && (
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
