"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { cn } from "@ui/lib";
import { Check, ChevronsUpDown, MapIcon, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PricingZone } from "../types";
import { ZoneMapPickerDialog } from "./ZoneMapPickerDialog";

interface MultiZoneSelectProps {
	zones: PricingZone[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	placeholder?: string;
	error?: string;
	disabled?: boolean;
	testId?: string;
	/** Google Maps API key for map picker */
	googleMapsApiKey?: string | null;
	/** Show map picker button (default: true) */
	showMapPicker?: boolean;
}

/**
 * MultiZoneSelect Component
 * 
 * A multi-select dropdown for selecting multiple pricing zones.
 * Displays selected zones as removable badges.
 * Uses Popover (Combobox pattern) for better compatibility with Sheet/Dialog components.
 * 
 * Story 23.2: Switch from DropdownMenu to Popover to fix click interaction bugs in Drawers
 */
export function MultiZoneSelect({
	zones,
	selectedIds,
	onChange,
	placeholder,
	error,
	disabled = false,
	testId = "multi-zone-select",
	googleMapsApiKey,
	showMapPicker = true,
}: MultiZoneSelectProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [mapDialogOpen, setMapDialogOpen] = useState(false);

	// Filter active zones and sort by name
	const activeZones = zones
		.filter((z) => z.isActive)
		.sort((a, b) => a.name.localeCompare(b.name));

	// Filter by search
	const filteredZones = activeZones.filter(
		(zone) =>
			zone.name.toLowerCase().includes(search.toLowerCase()) ||
			zone.code.toLowerCase().includes(search.toLowerCase()),
	);

	// Get selected zones for badges
	const selectedZones = zones.filter((z) => selectedIds.includes(z.id));

	const handleSelect = (zoneId: string, checked: boolean) => {
		if (checked) {
			onChange([...selectedIds, zoneId]);
		} else {
			onChange(selectedIds.filter((id) => id !== zoneId));
		}
	};

	const handleRemove = (zoneId: string) => {
		onChange(selectedIds.filter((id) => id !== zoneId));
	};

	return (
		<div className="space-y-2">
			<div className="flex gap-2">
				<Popover open={open} onOpenChange={setOpen}>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							role="combobox"
							aria-expanded={open}
							disabled={disabled}
							className={cn(
								"flex-1 justify-between font-normal",
								error && "border-destructive",
								selectedIds.length === 0 && "text-muted-foreground",
							)}
							data-testid={testId}
						>
							{selectedIds.length > 0
								? t("routes.form.zonesSelected", { count: selectedIds.length })
								: placeholder || t("routes.form.selectZones")}
							<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					</PopoverTrigger>
					<PopoverContent 
						className="w-[var(--radix-popover-trigger-width)] p-0" 
						align="start"
					>
						{/* Search input */}
						<div className="p-2 border-b">
							<div className="relative">
								<Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
								<Input
									placeholder={t("routes.form.searchZones")}
									value={search}
									onChange={(e) => setSearch(e.target.value)}
									className="pl-8 h-8"
									autoFocus
								/>
							</div>
						</div>
						
						{/* Zone list with scroll */}
						<div className="max-h-60 overflow-y-auto overscroll-contain p-1">
							{filteredZones.length === 0 ? (
								<p className="text-sm text-muted-foreground text-center py-4">
									{t("routes.form.noZonesFound")}
								</p>
							) : (
								filteredZones.map((zone) => {
									const isSelected = selectedIds.includes(zone.id);
									return (
										<button
											key={zone.id}
											type="button"
											onClick={() => handleSelect(zone.id, !isSelected)}
											className={cn(
												"w-full flex items-center gap-3 py-2 px-2 rounded-sm text-sm text-left transition-colors",
												"hover:bg-accent hover:text-accent-foreground",
												"focus:bg-accent focus:text-accent-foreground focus:outline-none",
												isSelected && "bg-accent/50"
											)}
										>
											{/* Circle checkbox */}
											<div
												className={cn(
													"h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
													isSelected
														? "border-primary bg-primary"
														: "border-muted-foreground/50",
												)}
											>
												{isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
											</div>
											<span className="flex-1 truncate">{zone.name}</span>
											<span className="text-muted-foreground text-xs shrink-0">
												({zone.code})
											</span>
										</button>
									);
								})
							)}
						</div>
					</PopoverContent>
				</Popover>

				{/* Map picker button */}
				{showMapPicker && googleMapsApiKey && (
					<Button
						type="button"
						variant="outline"
						size="icon"
						onClick={() => setMapDialogOpen(true)}
						disabled={disabled}
						title={t("pricing.zones.map.selectOnMap")}
					>
						<MapIcon className="h-4 w-4" />
					</Button>
				)}
			</div>

			{/* Zone map picker dialog */}
			<ZoneMapPickerDialog
				open={mapDialogOpen}
				onOpenChange={setMapDialogOpen}
				zones={zones}
				selectedIds={selectedIds}
				onConfirm={onChange}
				googleMapsApiKey={googleMapsApiKey ?? null}
			/>

			{/* Selected zones as badges */}
			{selectedZones.length > 0 && (
				<div className="flex flex-wrap gap-1" data-testid="selected-zones">
					{selectedZones.map((zone) => (
						<Badge
							key={zone.id}
							variant="secondary"
							className="gap-1 pr-1"
							data-testid="zone-badge"
						>
							{zone.name}
							<button
								type="button"
								onClick={() => handleRemove(zone.id)}
								className="ml-1 rounded-full hover:bg-muted-foreground/20"
								aria-label={t("common.remove")}
							>
								<X className="h-3 w-3" />
							</button>
						</Badge>
					))}
				</div>
			)}

			{error && <p className="text-destructive text-sm">{error}</p>}
		</div>
	);
}
