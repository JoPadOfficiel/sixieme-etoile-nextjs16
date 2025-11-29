"use client";

/**
 * Zone Quick Edit Panel Component
 * Story 11.1: Unified Zone Management Interface with Interactive Map
 *
 * Shows zone details and quick edit options when a zone is selected
 */

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
	CircleIcon,
	EditIcon,
	MapPinIcon,
	PentagonIcon,
	Trash2Icon,
	XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PricingZone } from "../types";

interface ZoneQuickEditPanelProps {
	zone: PricingZone;
	onEdit: () => void;
	onDelete: () => void;
	onClose: () => void;
}

function getZoneTypeIcon(zoneType: string) {
	switch (zoneType) {
		case "RADIUS":
			return <CircleIcon className="size-5" />;
		case "POLYGON":
			return <PentagonIcon className="size-5" />;
		default:
			return <MapPinIcon className="size-5" />;
	}
}

export function ZoneQuickEditPanel({
	zone,
	onEdit,
	onDelete,
	onClose,
}: ZoneQuickEditPanelProps) {
	const t = useTranslations();

	return (
		<Card className="absolute bottom-4 left-4 z-10 w-80 shadow-xl">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div className="flex items-center gap-2">
						<div className="rounded-lg bg-primary/10 p-2 text-primary">
							{getZoneTypeIcon(zone.zoneType)}
						</div>
						<div>
							<CardTitle className="text-base">{zone.name}</CardTitle>
							<code className="text-xs text-muted-foreground">{zone.code}</code>
						</div>
					</div>
					<Button
						variant="ghost"
						size="icon"
						className="size-8"
						onClick={onClose}
					>
						<XIcon className="size-4" />
					</Button>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Status */}
				<div className="flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						{t("pricing.zones.status")}
					</span>
					<Badge variant={zone.isActive ? "default" : "secondary"}>
						{zone.isActive
							? t("pricing.zones.active")
							: t("pricing.zones.inactive")}
					</Badge>
				</div>

				{/* Type */}
				<div className="flex items-center justify-between">
					<span className="text-sm text-muted-foreground">
						{t("pricing.zones.form.type")}
					</span>
					<span className="text-sm font-medium">
						{t(`pricing.zones.types.${zone.zoneType}`)}
					</span>
				</div>

				{/* Parent Zone */}
				{zone.parentZone && (
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							{t("pricing.zones.form.parentZone")}
						</span>
						<span className="text-sm font-medium">{zone.parentZone.name}</span>
					</div>
				)}

				{/* Radius (for RADIUS type) */}
				{zone.zoneType === "RADIUS" && zone.radiusKm && (
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							{t("pricing.zones.form.radiusKm")}
						</span>
						<span className="text-sm font-medium">{zone.radiusKm} km</span>
					</div>
				)}

				{/* Center coordinates */}
				{zone.centerLatitude && zone.centerLongitude && (
					<div className="flex items-center justify-between">
						<span className="text-sm text-muted-foreground">
							{t("pricing.zones.center")}
						</span>
						<span className="text-xs font-mono">
							{zone.centerLatitude.toFixed(4)}, {zone.centerLongitude.toFixed(4)}
						</span>
					</div>
				)}

				{/* Stats */}
				{(zone.routesCount !== undefined || zone.childZonesCount !== undefined) && (
					<div className="flex items-center gap-4 text-sm">
						{zone.routesCount !== undefined && zone.routesCount > 0 && (
							<span className="text-muted-foreground">
								{zone.routesCount} {t("pricing.zones.routes")}
							</span>
						)}
						{zone.childZonesCount !== undefined && zone.childZonesCount > 0 && (
							<span className="text-muted-foreground">
								{zone.childZonesCount} {t("pricing.zones.subzones")}
							</span>
						)}
					</div>
				)}

				<div className="h-px bg-border" />

				{/* Actions */}
				<div className="flex gap-2">
					<Button variant="outline" className="flex-1" onClick={onEdit}>
						<EditIcon className="size-4 mr-2" />
						{t("common.edit")}
					</Button>
					<Button
						variant="outline"
						className="text-destructive hover:text-destructive"
						onClick={onDelete}
					>
						<Trash2Icon className="size-4" />
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
