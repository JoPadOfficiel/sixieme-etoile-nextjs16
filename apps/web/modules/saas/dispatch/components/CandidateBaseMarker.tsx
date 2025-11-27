"use client";

import { cn } from "@ui/lib";
import { Building2, Car, Euro } from "lucide-react";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { useTranslations } from "next-intl";
import { MARKER_COLORS } from "../utils/route-colors";

/**
 * CandidateBaseMarker Component
 *
 * Story 8.3: Multi-Base Optimisation & Visualisation
 *
 * Visual marker for candidate bases on the dispatch map.
 * Shows different states: candidate, selected, hovered, other.
 *
 * @see AC1: Candidate Bases Display on Map
 * @see AC5: Map-to-Drawer Interaction
 */

type MarkerState = "candidate" | "selected" | "hovered" | "other";

interface CandidateBaseMarkerProps {
	baseName: string;
	baseDistanceKm: number;
	estimatedCost?: number;
	vehicleName?: string;
	state?: MarkerState;
	onClick?: () => void;
	onMouseEnter?: () => void;
	onMouseLeave?: () => void;
	className?: string;
}

/**
 * Get marker colors based on state
 */
function getMarkerColors(state: MarkerState) {
	switch (state) {
		case "selected":
			return MARKER_COLORS.selectedBase;
		case "hovered":
			return MARKER_COLORS.hoveredBase;
		case "candidate":
			return MARKER_COLORS.candidateBase;
		case "other":
		default:
			return MARKER_COLORS.otherBase;
	}
}

/**
 * Get marker size based on state
 */
function getMarkerSize(state: MarkerState): string {
	switch (state) {
		case "selected":
			return "size-10";
		case "hovered":
			return "size-9";
		case "candidate":
			return "size-8";
		case "other":
		default:
			return "size-6";
	}
}

/**
 * Get z-index based on state (selected on top)
 */
function getMarkerZIndex(state: MarkerState): number {
	switch (state) {
		case "selected":
			return 30;
		case "hovered":
			return 20;
		case "candidate":
			return 10;
		case "other":
		default:
			return 1;
	}
}

export function CandidateBaseMarker({
	baseName,
	baseDistanceKm,
	estimatedCost,
	vehicleName,
	state = "candidate",
	onClick,
	onMouseEnter,
	onMouseLeave,
	className,
}: CandidateBaseMarkerProps) {
	const t = useTranslations("dispatch.map");
	const colors = getMarkerColors(state);
	const sizeClass = getMarkerSize(state);
	const zIndex = getMarkerZIndex(state);
	const isInteractive = state !== "other";

	return (
		<TooltipProvider>
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>
					<button
						type="button"
						className={cn(
							"relative flex items-center justify-center rounded-full shadow-md transition-all duration-150",
							sizeClass,
							isInteractive && "cursor-pointer hover:scale-110",
							!isInteractive && "cursor-default opacity-60",
							className,
						)}
						style={{
							backgroundColor: colors.background,
							color: colors.icon,
							zIndex,
						}}
						onClick={isInteractive ? onClick : undefined}
						onMouseEnter={isInteractive ? onMouseEnter : undefined}
						onMouseLeave={isInteractive ? onMouseLeave : undefined}
						data-testid="candidate-base-marker"
						data-state={state}
					>
						{state === "other" ? (
							<Building2 className="size-3" />
						) : (
							<Car className="size-4" />
						)}

						{/* Selection ring */}
						{state === "selected" && (
							<span className="absolute inset-0 rounded-full ring-2 ring-blue-300 ring-offset-2 animate-pulse" />
						)}
					</button>
				</TooltipTrigger>

				<TooltipContent
					side="top"
					className="max-w-xs"
					data-testid="candidate-base-tooltip"
				>
					<div className="space-y-1">
						<div className="font-medium">{baseName}</div>
						{vehicleName && (
							<div className="flex items-center gap-1 text-xs text-muted-foreground">
								<Car className="size-3" />
								<span>{vehicleName}</span>
							</div>
						)}
						<div className="flex items-center gap-2 text-xs">
							<span className="text-muted-foreground">
								{baseDistanceKm.toFixed(1)} km
							</span>
							{estimatedCost !== undefined && (
								<span className="flex items-center gap-0.5 font-medium">
									<Euro className="size-3" />
									{estimatedCost.toFixed(2)}
								</span>
							)}
						</div>
						{isInteractive && (
							<div className="text-xs text-muted-foreground italic">
								{t("clickToSelect")}
							</div>
						)}
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

/**
 * Simple marker for pickup/dropoff points
 */
interface PointMarkerProps {
	type: "pickup" | "dropoff";
	label?: string;
	className?: string;
}

export function PointMarker({ type, label, className }: PointMarkerProps) {
	const colors = type === "pickup" ? MARKER_COLORS.pickup : MARKER_COLORS.dropoff;

	return (
		<TooltipProvider>
			<Tooltip delayDuration={200}>
				<TooltipTrigger asChild>
					<div
						className={cn(
							"flex items-center justify-center size-8 rounded-full shadow-md",
							className,
						)}
						style={{
							backgroundColor: colors.background,
							color: colors.icon,
							zIndex: 40, // Above bases
						}}
						data-testid={`${type}-marker`}
					>
						<div className="size-3 rounded-full bg-white" />
					</div>
				</TooltipTrigger>
				{label && (
					<TooltipContent side="top">
						<span className="text-xs">{label}</span>
					</TooltipContent>
				)}
			</Tooltip>
		</TooltipProvider>
	);
}

/**
 * Marker legend for the map
 */
export function MarkerLegend() {
	const t = useTranslations("dispatch.map");

	return (
		<div className="flex flex-wrap gap-3 text-xs" data-testid="marker-legend">
			<LegendItem color={MARKER_COLORS.pickup.background} label={t("pickup")} />
			<LegendItem color={MARKER_COLORS.dropoff.background} label={t("dropoff")} />
			<LegendItem color={MARKER_COLORS.candidateBase.background} label={t("candidateBase")} />
			<LegendItem color={MARKER_COLORS.otherBase.background} label={t("otherBase")} />
		</div>
	);
}

function LegendItem({ color, label }: { color: string; label: string }) {
	return (
		<div className="flex items-center gap-1.5">
			<div
				className="size-3 rounded-full"
				style={{ backgroundColor: color }}
			/>
			<span className="text-muted-foreground">{label}</span>
		</div>
	);
}

export default CandidateBaseMarker;
