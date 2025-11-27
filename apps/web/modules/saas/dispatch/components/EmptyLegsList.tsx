"use client";

import { useTranslations } from "next-intl";
import { Plane, Plus, Clock, MapPin, Car, AlertCircle } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import { useEmptyLegs } from "../hooks/useEmptyLegs";
import type {
	EmptyLegListItem,
	EmptyLegStatus,
} from "../types/empty-leg";
import {
	formatPricingStrategy,
	getStatusBadgeVariant,
	getTimeRemaining,
	formatCorridor,
} from "../types/empty-leg";

/**
 * EmptyLegsList Component
 *
 * Story 8.5: Model & Surface Empty-Leg Opportunities
 *
 * Displays a list of available empty-leg opportunities in the Dispatch screen.
 */

interface EmptyLegsListProps {
	onSelectEmptyLeg?: (emptyLeg: EmptyLegListItem) => void;
	onAddEmptyLeg?: () => void;
}

export function EmptyLegsList({
	onSelectEmptyLeg,
	onAddEmptyLeg,
}: EmptyLegsListProps) {
	const t = useTranslations("dispatch.emptyLegs");
	const { data, isLoading, error } = useEmptyLegs({ limit: 10 });

	if (isLoading) {
		return <EmptyLegsListSkeleton />;
	}

	if (error) {
		return (
			<Card>
				<CardContent className="py-6">
					<div className="flex flex-col items-center justify-center text-center text-muted-foreground">
						<AlertCircle className="h-8 w-8 mb-2" />
						<p className="text-sm">Failed to load empty legs</p>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!data?.data.length) {
		return <EmptyLegsEmptyState onAdd={onAddEmptyLeg} />;
	}

	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<CardTitle className="text-sm flex items-center gap-2">
						<Plane className="h-4 w-4" />
						{t("title")}
					</CardTitle>
					{onAddEmptyLeg && (
						<Button size="sm" variant="outline" onClick={onAddEmptyLeg}>
							<Plus className="h-4 w-4 mr-1" />
							{t("add")}
						</Button>
					)}
				</div>
				<CardDescription>
					{t("description", { count: data.data.length })}
				</CardDescription>
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{data.data.map((emptyLeg) => (
						<EmptyLegRow
							key={emptyLeg.id}
							emptyLeg={emptyLeg}
							onClick={() => onSelectEmptyLeg?.(emptyLeg)}
						/>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

// ============================================================================
// EmptyLegRow Component
// ============================================================================

interface EmptyLegRowProps {
	emptyLeg: EmptyLegListItem;
	onClick?: () => void;
}

function EmptyLegRow({ emptyLeg, onClick }: EmptyLegRowProps) {
	const timeRemaining = getTimeRemaining(emptyLeg.windowEnd);

	return (
		<div
			className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
			onClick={onClick}
			role="button"
			tabIndex={0}
			onKeyDown={(e) => {
				if (e.key === "Enter" || e.key === " ") {
					onClick?.();
				}
			}}
		>
			<div className="flex-1 min-w-0">
				{/* Corridor */}
				<div className="flex items-center gap-2 text-sm font-medium truncate">
					<MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
					<span className="truncate">{formatCorridor(emptyLeg.corridor)}</span>
				</div>

				{/* Vehicle & Time */}
				<div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
					<span className="flex items-center gap-1">
						<Car className="h-3 w-3" />
						{emptyLeg.vehicle.name}
					</span>
					<span className="flex items-center gap-1">
						<Clock className="h-3 w-3" />
						{timeRemaining.formatted}
					</span>
					{emptyLeg.estimatedDistanceKm && (
						<span>{emptyLeg.estimatedDistanceKm} km</span>
					)}
				</div>
			</div>

			{/* Status & Pricing */}
			<div className="flex items-center gap-2 ml-2">
				{emptyLeg.pricingStrategy && (
					<Badge variant="outline" className="text-xs">
						{formatPricingStrategy(emptyLeg.pricingStrategy)}
					</Badge>
				)}
				<EmptyLegStatusBadge status={emptyLeg.status} />
			</div>
		</div>
	);
}

// ============================================================================
// EmptyLegStatusBadge Component
// ============================================================================

interface EmptyLegStatusBadgeProps {
	status: EmptyLegStatus;
}

function EmptyLegStatusBadge({ status }: EmptyLegStatusBadgeProps) {
	const t = useTranslations("dispatch.emptyLegs.status");
	const variant = getStatusBadgeVariant(status);

	const labels: Record<EmptyLegStatus, string> = {
		AVAILABLE: t("available"),
		EXPIRING_SOON: t("expiringSoon"),
		EXPIRED: t("expired"),
	};

	return (
		<Badge variant={variant} className="text-xs">
			{labels[status]}
		</Badge>
	);
}

// ============================================================================
// EmptyLegsEmptyState Component
// ============================================================================

interface EmptyLegsEmptyStateProps {
	onAdd?: () => void;
}

function EmptyLegsEmptyState({ onAdd }: EmptyLegsEmptyStateProps) {
	const t = useTranslations("dispatch.emptyLegs");

	return (
		<Card>
			<CardContent className="py-8">
				<div className="flex flex-col items-center justify-center text-center">
					<div className="rounded-full bg-muted p-3 mb-4">
						<Plane className="h-6 w-6 text-muted-foreground" />
					</div>
					<h3 className="font-medium mb-1">{t("empty.title")}</h3>
					<p className="text-sm text-muted-foreground mb-4 max-w-[250px]">
						{t("empty.description")}
					</p>
					{onAdd && (
						<Button size="sm" onClick={onAdd}>
							<Plus className="h-4 w-4 mr-1" />
							{t("add")}
						</Button>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

// ============================================================================
// EmptyLegsListSkeleton Component
// ============================================================================

function EmptyLegsListSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<div className="flex items-center justify-between">
					<Skeleton className="h-5 w-24" />
					<Skeleton className="h-8 w-24" />
				</div>
				<Skeleton className="h-4 w-40 mt-1" />
			</CardHeader>
			<CardContent>
				<div className="space-y-2">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="flex items-center justify-between p-3 rounded-lg border"
						>
							<div className="flex-1">
								<Skeleton className="h-4 w-48 mb-2" />
								<Skeleton className="h-3 w-32" />
							</div>
							<Skeleton className="h-5 w-16" />
						</div>
					))}
				</div>
			</CardContent>
		</Card>
	);
}

export { EmptyLegRow, EmptyLegStatusBadge, EmptyLegsEmptyState, EmptyLegsListSkeleton };
