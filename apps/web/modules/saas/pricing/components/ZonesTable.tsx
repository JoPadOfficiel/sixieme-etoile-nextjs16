"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { cn } from "@ui/lib";
import {
	CircleIcon,
	HexagonIcon,
	MapPinIcon,
	PencilIcon,
	TrashIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PricingZone } from "../types";

interface ZonesTableProps {
	zones: PricingZone[];
	onEdit: (zone: PricingZone) => void;
	onDelete: (zone: PricingZone) => void;
	isLoading?: boolean;
	selectedZoneId?: string | null;
	onSelectZone?: (zone: PricingZone) => void;
}

const zoneTypeIcons = {
	POLYGON: HexagonIcon,
	RADIUS: CircleIcon,
	POINT: MapPinIcon,
};

export function ZonesTable({
	zones,
	onEdit,
	onDelete,
	isLoading,
	selectedZoneId,
	onSelectZone,
}: ZonesTableProps) {
	const t = useTranslations();

	if (isLoading) {
		return (
			<div className="flex items-center justify-center py-8">
				<div className="h-8 w-8 animate-spin rounded-full border-primary border-b-2" />
			</div>
		);
	}

	if (zones.length === 0) {
		return (
			<div className="py-8 text-center text-muted-foreground">
				{t("pricing.zones.noZones")}
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>{t("pricing.zones.name")}</TableHead>
					<TableHead>{t("pricing.zones.type")}</TableHead>
					<TableHead>{t("pricing.zones.center")}</TableHead>
					<TableHead>{t("pricing.zones.parentZone")}</TableHead>
					<TableHead>{t("pricing.zones.routesCount")}</TableHead>
					<TableHead>{t("pricing.zones.status")}</TableHead>
					<TableHead className="text-right">{t("common.actions")}</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{zones.map((zone) => {
					const TypeIcon = zoneTypeIcons[zone.zoneType];
					return (
						<TableRow
							key={zone.id}
							className={cn(
								"cursor-pointer",
								selectedZoneId === zone.id && "bg-muted/50",
							)}
							onClick={() => onSelectZone?.(zone)}
						>
							<TableCell>
								<div className="flex flex-col">
									<span className="font-medium">{zone.name}</span>
									<Badge variant="outline" className="mt-1 w-fit text-xs">
										{zone.code}
									</Badge>
								</div>
							</TableCell>
							<TableCell>
								<div className="flex items-center gap-2">
									<TypeIcon className="h-4 w-4 text-muted-foreground" />
									<span>{t(`pricing.zones.types.${zone.zoneType}`)}</span>
									{zone.zoneType === "RADIUS" && zone.radiusKm && (
										<span className="text-muted-foreground text-sm">
											({zone.radiusKm} km)
										</span>
									)}
								</div>
							</TableCell>
							<TableCell>
								{zone.centerLatitude && zone.centerLongitude ? (
									<span className="font-mono text-sm">
										{Number(zone.centerLatitude).toFixed(4)},{" "}
										{Number(zone.centerLongitude).toFixed(4)}
									</span>
								) : (
									<span className="text-muted-foreground">-</span>
								)}
							</TableCell>
							<TableCell>
								{zone.parentZone ? (
									<Badge variant="secondary">{zone.parentZone.name}</Badge>
								) : (
									<span className="text-muted-foreground">-</span>
								)}
							</TableCell>
							<TableCell>
								<Badge variant="outline">{zone.routesCount ?? 0}</Badge>
							</TableCell>
							<TableCell>
								<Badge variant={zone.isActive ? "default" : "secondary"}>
									{zone.isActive
										? t("common.status.active")
										: t("common.status.inactive")}
								</Badge>
							</TableCell>
							<TableCell className="text-right">
								<div className="flex justify-end gap-2">
									<Button
										variant="ghost"
										size="icon"
										onClick={(event) => {
											event.stopPropagation();
											onEdit(zone);
										}}
									>
										<PencilIcon className="h-4 w-4" />
									</Button>
									<Button
										variant="ghost"
										size="icon"
										onClick={(event) => {
											event.stopPropagation();
											onDelete(zone);
										}}
									>
										<TrashIcon className="h-4 w-4" />
									</Button>
								</div>
							</TableCell>
						</TableRow>
					);
				})}
			</TableBody>
		</Table>
	);
}
