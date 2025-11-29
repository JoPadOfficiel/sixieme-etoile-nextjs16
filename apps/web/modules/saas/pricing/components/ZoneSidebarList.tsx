"use client";

/**
 * Zone Sidebar List Component
 * Story 11.1: Unified Zone Management Interface with Interactive Map
 *
 * Displays a filterable list of zones in the left sidebar panel
 */

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Skeleton } from "@ui/components/skeleton";
import { cn } from "@ui/lib";
import {
	CircleIcon,
	MapPinIcon,
	PentagonIcon,
	PlusIcon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PricingZone, ZoneType } from "../types";

const ZONE_TYPE_DEFAULT_COLORS: Record<ZoneType, string> = {
	RADIUS: "#10b981",
	POLYGON: "#3b82f6",
	POINT: "#8b5cf6",
};

const FALLBACK_TEXT_COLOR = "#0f172a";

function hexToRgb(hex: string) {
	const cleanHex = hex.replace("#", "");
	if (cleanHex.length !== 6) return null;
	const r = parseInt(cleanHex.slice(0, 2), 16);
	const g = parseInt(cleanHex.slice(2, 4), 16);
	const b = parseInt(cleanHex.slice(4, 6), 16);
	if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return null;
	return { r, g, b };
}

function getContrastTextColor(hex: string) {
	const rgb = hexToRgb(hex);
	if (!rgb) return FALLBACK_TEXT_COLOR;
	const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
	return luminance > 0.7 ? FALLBACK_TEXT_COLOR : "#ffffff";
}

function getZoneDisplayColor(zone: PricingZone) {
	return zone.color ?? ZONE_TYPE_DEFAULT_COLORS[zone.zoneType] ?? "#10b981";
}

function getZoneTypeIcon(zoneType: ZoneType) {
	switch (zoneType) {
		case "RADIUS":
			return <CircleIcon className="size-4" />;
		case "POLYGON":
			return <PentagonIcon className="size-4" />;
		case "POINT":
		default:
			return <MapPinIcon className="size-4" />;
	}
}

type StatusFilter = "all" | "active" | "inactive";

interface ZoneSidebarListProps {
	zones: PricingZone[];
	isLoading: boolean;
	selectedZoneId: string | null;
	onSelectZone: (zone: PricingZone) => void;
	onAddZone: () => void;
	onDoubleClickZone: (zone: PricingZone) => void;
	search: string;
	onSearchChange: (value: string) => void;
	statusFilter: StatusFilter;
	onStatusFilterChange: (value: StatusFilter) => void;
}

export function ZoneSidebarList({
	zones,
	isLoading,
	selectedZoneId,
	onSelectZone,
	onAddZone,
	onDoubleClickZone,
	search,
	onSearchChange,
	statusFilter,
	onStatusFilterChange,
}: ZoneSidebarListProps) {
	const t = useTranslations();

	// Filter zones based on status
	const filteredZones = zones.filter((zone) => {
		if (statusFilter === "active") return zone.isActive;
		if (statusFilter === "inactive") return !zone.isActive;
		return true;
	});

	return (
		<div className="flex h-full flex-col">
			{/* Header */}
			<div className="border-b p-4">
				<div className="flex items-center justify-between mb-4">
					<h2 className="text-lg font-semibold">
						{t("pricing.zones.title")}
					</h2>
					<Button size="sm" onClick={onAddZone}>
						<PlusIcon className="size-4 mr-1" />
						{t("pricing.zones.addZone")}
					</Button>
				</div>

				{/* Search */}
				<div className="relative mb-3">
					<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={t("pricing.zones.searchPlaceholder")}
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-9"
					/>
				</div>

				{/* Status Filter */}
				<Select
					value={statusFilter}
					onValueChange={(value) => onStatusFilterChange(value as StatusFilter)}
				>
					<SelectTrigger className="w-full">
						<SelectValue placeholder={t("pricing.zones.filterByStatus")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("pricing.zones.statusAll")}</SelectItem>
						<SelectItem value="active">
							{t("pricing.zones.statusActive")}
						</SelectItem>
						<SelectItem value="inactive">
							{t("pricing.zones.statusInactive")}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Zone List */}
			<div className="flex-1 overflow-y-auto">
				<div className="p-2">
					{isLoading ? (
						// Loading skeletons
						Array.from({ length: 5 }).map((_, i) => (
							<div key={i} className="p-3 mb-2">
								<Skeleton className="h-5 w-3/4 mb-2" />
								<Skeleton className="h-4 w-1/2" />
							</div>
						))
					) : filteredZones.length === 0 ? (
						<div className="p-4 text-center text-muted-foreground">
							<MapPinIcon className="mx-auto size-8 mb-2 opacity-50" />
							<p className="text-sm">
								{search
									? t("pricing.zones.noSearchResults")
									: t("pricing.zones.noZones")}
							</p>
						</div>
					) : (
						filteredZones.map((zone) => (
							<button
								key={zone.id}
								type="button"
								onClick={() => onSelectZone(zone)}
								onDoubleClick={() => onDoubleClickZone(zone)}
								className={cn(
									"w-full text-left p-3 rounded-lg mb-1 transition-colors",
									"hover:bg-accent",
									selectedZoneId === zone.id
										? "bg-accent border-l-4 border-primary"
										: "border-l-4 border-transparent"
								)}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="flex-1 min-w-0">
										<div className="flex items-center gap-2 mb-1">
											{(() => {
												const zoneColor = getZoneDisplayColor(zone);
												const textColor = getContrastTextColor(zoneColor);
												return (
													<span
														className="inline-flex size-7 items-center justify-center rounded-full border shadow-sm"
														style={{
															backgroundColor: zoneColor,
															borderColor: zoneColor,
															color: textColor,
														}}
													>
														{getZoneTypeIcon(zone.zoneType)}
													</span>
												);
											})()}
											<span className="font-medium truncate">{zone.name}</span>
										</div>
										<div className="flex items-center gap-2 text-xs text-muted-foreground">
											<code className="bg-muted px-1 rounded">{zone.code}</code>
											{zone.parentZone && (
												<span className="truncate">
													← {zone.parentZone.name}
												</span>
											)}
										</div>
									</div>
									<Badge
										variant={zone.isActive ? "default" : "secondary"}
										className="shrink-0 text-xs"
									>
										{zone.isActive
											? t("pricing.zones.active")
											: t("pricing.zones.inactive")}
									</Badge>
								</div>
								{/* Zone stats */}
								<div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
									{zone.routesCount !== undefined && zone.routesCount > 0 && (
										<span>
											{zone.routesCount} {t("pricing.zones.routes")}
										</span>
									)}
									{zone.childZonesCount !== undefined &&
										zone.childZonesCount > 0 && (
											<span>
												{zone.childZonesCount} {t("pricing.zones.subzones")}
											</span>
										)}
								</div>
							</button>
						))
					)}
				</div>
			</div>

			{/* Footer with count */}
			<div className="border-t p-3 text-xs text-muted-foreground">
				{t("pricing.zones.zoneCount", { count: filteredZones.length })}
			</div>
		</div>
	);
}
