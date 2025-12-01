"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { Input } from "@ui/components/input";
import { cn } from "@ui/lib";
import { ChevronsUpDown, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { PricingZone } from "../types";

interface MultiZoneSelectProps {
	zones: PricingZone[];
	selectedIds: string[];
	onChange: (ids: string[]) => void;
	placeholder?: string;
	error?: string;
	disabled?: boolean;
	testId?: string;
}

/**
 * MultiZoneSelect Component
 * 
 * A multi-select dropdown for selecting multiple pricing zones.
 * Displays selected zones as removable badges.
 * Uses DropdownMenu for better compatibility with Sheet/Dialog components.
 * 
 * Story 14.3: Created for flexible route pricing
 */
export function MultiZoneSelect({
	zones,
	selectedIds,
	onChange,
	placeholder,
	error,
	disabled = false,
	testId = "multi-zone-select",
}: MultiZoneSelectProps) {
	const t = useTranslations();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");

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
			<DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
				<DropdownMenuTrigger asChild>
					<Button
						variant="outline"
						role="combobox"
						aria-expanded={open}
						disabled={disabled}
						className={cn(
							"w-full justify-between font-normal",
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
				</DropdownMenuTrigger>
				<DropdownMenuContent 
					className="w-[var(--radix-dropdown-menu-trigger-width)] p-0" 
					align="start"
					sideOffset={4}
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
								onClick={(e) => e.stopPropagation()}
								onKeyDown={(e) => e.stopPropagation()}
							/>
						</div>
					</div>
					
					{/* Zone list */}
					<div className="max-h-60 overflow-y-auto">
						{filteredZones.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								{t("routes.form.noZonesFound")}
							</p>
						) : (
							filteredZones.map((zone) => {
								const isSelected = selectedIds.includes(zone.id);
								return (
									<DropdownMenuCheckboxItem
										key={zone.id}
										checked={isSelected}
										onCheckedChange={(checked) => handleSelect(zone.id, checked)}
										onSelect={(e) => e.preventDefault()}
										className="cursor-pointer"
									>
										<span className="flex-1">{zone.name}</span>
										<span className="text-muted-foreground text-xs ml-2">
											({zone.code})
										</span>
									</DropdownMenuCheckboxItem>
								);
							})
						)}
					</div>
				</DropdownMenuContent>
			</DropdownMenu>

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
