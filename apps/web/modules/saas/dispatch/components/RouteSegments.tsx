"use client";

import { useMemo } from "react";
import { cn } from "@ui/lib";
import { ArrowRight, MapPin, Building2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
	ROUTE_COLORS,
	getSegmentBgClass,
	getSegmentIconClass,
	type RouteSegmentType,
} from "../utils/route-colors";
import type { CandidateSegments } from "../types/assignment";

/**
 * RouteSegments Component
 *
 * Story 8.3: Multi-Base Optimisation & Visualisation
 *
 * Displays route segments (approach, service, return) with visual styling.
 * Used in the dispatch map and candidate details.
 *
 * @see AC3: Full Route Display for Selected Candidate
 */

interface GeoPoint {
	lat: number;
	lng: number;
}

interface RouteSegmentsProps {
	/** Pickup coordinates (for future Google Maps integration) */
	pickup?: GeoPoint;
	/** Dropoff coordinates (for future Google Maps integration) */
	dropoff?: GeoPoint;
	base?: GeoPoint;
	baseName?: string;
	segments?: CandidateSegments;
	showApproach?: boolean;
	showReturn?: boolean;
	isPreview?: boolean;
	className?: string;
}

/**
 * Visual representation of route segments
 * Shows approach (base→pickup), service (pickup→dropoff), return (dropoff→base)
 */
export function RouteSegments({
	pickup: _pickup, // Reserved for future Google Maps polyline rendering
	dropoff: _dropoff, // Reserved for future Google Maps polyline rendering
	base,
	baseName,
	segments,
	showApproach = false,
	showReturn = false,
	isPreview = false,
	className,
}: RouteSegmentsProps) {
	const t = useTranslations("dispatch.map");

	// Note: visibleSegments will be used when we integrate actual Google Maps polylines
	// For now, we render based on showApproach/showReturn flags directly
	void _pickup;
	void _dropoff;

	return (
		<div className={cn("space-y-2", className)} data-testid="route-segments">
			{/* Approach segment: Base → Pickup */}
			{showApproach && base && (
				<RouteSegmentRow
					type={isPreview ? "preview" : "approach"}
					fromLabel={baseName || t("base")}
					fromIcon={<Building2 className="size-3.5" />}
					toLabel={t("pickup")}
					toIcon={<MapPin className="size-3.5 text-green-600" />}
					distanceKm={segments?.approach.distanceKm ?? undefined}
					durationMinutes={segments?.approach.durationMinutes ?? undefined}
					data-testid="approach-route"
				/>
			)}

			{/* Service segment: Pickup → Dropoff */}
			<RouteSegmentRow
				type="service"
				fromLabel={t("pickup")}
				fromIcon={<MapPin className="size-3.5 text-green-600" />}
				toLabel={t("dropoff")}
				toIcon={<MapPin className="size-3.5 text-red-600" />}
				distanceKm={segments?.service.distanceKm ?? undefined}
				durationMinutes={segments?.service.durationMinutes ?? undefined}
				data-testid="service-route"
			/>

			{/* Return segment: Dropoff → Base */}
			{showReturn && base && (
				<RouteSegmentRow
					type={isPreview ? "preview" : "return"}
					fromLabel={t("dropoff")}
					fromIcon={<MapPin className="size-3.5 text-red-600" />}
					toLabel={baseName || t("base")}
					toIcon={<Building2 className="size-3.5" />}
					distanceKm={segments?.return.distanceKm ?? undefined}
					durationMinutes={segments?.return.durationMinutes ?? undefined}
					data-testid="return-route"
				/>
			)}
		</div>
	);
}

/**
 * Individual route segment row
 */
interface RouteSegmentRowProps {
	type: RouteSegmentType;
	fromLabel: string;
	fromIcon: React.ReactNode;
	toLabel: string;
	toIcon: React.ReactNode;
	distanceKm?: number;
	durationMinutes?: number;
	"data-testid"?: string;
}

function RouteSegmentRow({
	type,
	fromLabel,
	fromIcon,
	toLabel,
	toIcon,
	distanceKm,
	durationMinutes,
	"data-testid": testId,
}: RouteSegmentRowProps) {
	const bgClass = getSegmentBgClass(type);
	const iconClass = getSegmentIconClass(type);
	const colorConfig = ROUTE_COLORS[type];

	return (
		<div
			className={cn(
				"flex items-center gap-2 p-2 rounded-md text-sm",
				bgClass,
			)}
			data-testid={testId}
		>
			{/* From */}
			<div className="flex items-center gap-1.5 min-w-0">
				<span className={iconClass}>{fromIcon}</span>
				<span className="truncate text-xs font-medium">{fromLabel}</span>
			</div>

			{/* Arrow with line style indicator */}
			<div className="flex items-center gap-1 flex-shrink-0">
				<div
					className="w-8 h-0.5"
					style={{
						backgroundColor: colorConfig.stroke,
						opacity: colorConfig.strokeOpacity,
						backgroundImage: colorConfig.dashPattern
							? `repeating-linear-gradient(90deg, ${colorConfig.stroke} 0, ${colorConfig.stroke} ${colorConfig.dashPattern[0]}px, transparent ${colorConfig.dashPattern[0]}px, transparent ${colorConfig.dashPattern[0] + colorConfig.dashPattern[1]}px)`
							: undefined,
					}}
				/>
				<ArrowRight className={cn("size-3", iconClass)} />
			</div>

			{/* To */}
			<div className="flex items-center gap-1.5 min-w-0">
				<span className={iconClass}>{toIcon}</span>
				<span className="truncate text-xs font-medium">{toLabel}</span>
			</div>

			{/* Distance and duration */}
			{(distanceKm !== undefined || durationMinutes !== undefined) && (
				<div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
					{distanceKm !== undefined && (
						<span>{distanceKm.toFixed(1)} km</span>
					)}
					{durationMinutes !== undefined && (
						<span>{Math.round(durationMinutes)} min</span>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * Compact route summary for candidate cards
 */
interface RouteSegmentsSummaryProps {
	segments: CandidateSegments;
	showApproach?: boolean;
	showReturn?: boolean;
	className?: string;
}

export function RouteSegmentsSummary({
	segments,
	showApproach = true,
	showReturn = true,
	className,
}: RouteSegmentsSummaryProps) {
	const t = useTranslations("dispatch.assignment.costComparison.segments");

	const totalDistance = useMemo(() => {
		const approachDistance = segments?.approach.distanceKm ?? 0;
		const serviceDistance = segments?.service.distanceKm ?? 0;
		const returnDistance = segments?.return.distanceKm ?? 0;
		return approachDistance + serviceDistance + returnDistance;
	}, [segments]);

	const totalDuration = useMemo(() => {
		const approachDuration = segments?.approach.durationMinutes ?? 0;
		const serviceDuration = segments?.service.durationMinutes ?? 0;
		const returnDuration = segments?.return.durationMinutes ?? 0;
		return approachDuration + serviceDuration + returnDuration;
	}, [segments]);

	return (
		<div className={cn("text-xs space-y-1", className)}>
			{showApproach && (
				<div className="flex justify-between text-muted-foreground">
					<span>{t("approach")}</span>
					<span>
						{(segments?.approach.distanceKm ?? 0).toFixed(1)} km ·{" "}
						{Math.round(segments?.approach.durationMinutes ?? 0)} min
					</span>
				</div>
			)}
			<div className="flex justify-between">
				<span className="text-blue-600 font-medium">{t("service")}</span>
				<span className="text-blue-600">
					{(segments.service.distanceKm ?? 0).toFixed(1)} km ·{" "}
					{Math.round(segments.service.durationMinutes ?? 0)} min
				</span>
			</div>
			{showReturn && (
				<div className="flex justify-between text-muted-foreground">
					<span>{t("return")}</span>
					<span>
						{(segments?.return.distanceKm ?? 0).toFixed(1)} km ·{" "}
						{Math.round(segments?.return.durationMinutes ?? 0)} min
					</span>
				</div>
			)}
			<div className="flex justify-between font-medium pt-1 border-t">
				<span>Total</span>
				<span>
					{totalDistance.toFixed(1)} km · {Math.round(totalDuration)} min
				</span>
			</div>
		</div>
	);
}

export default RouteSegments;
