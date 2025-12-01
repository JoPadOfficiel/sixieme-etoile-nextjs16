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
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
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

	const handleSelect = (zoneId: string) => {
		if (selectedIds.includes(zoneId)) {
			onChange(selectedIds.filter((id) => id !== zoneId));
		} else {
			onChange([...selectedIds, zoneId]);
		}
	};

	const handleRemove = (zoneId: string) => {
		onChange(selectedIds.filter((id) => id !== zoneId));
	};

	return (
		<div className="space-y-2">
			<Popover open={open} onOpenChange={setOpen} modal={false}>
				<PopoverTrigger asChild>
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
				</PopoverTrigger>
				<PopoverContent 
					className="w-[var(--radix-popover-trigger-width)] p-0" 
					align="start"
					sideOffset={4}
					onOpenAutoFocus={(e) => e.preventDefault()}
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
							/>
						</div>
					</div>
					
					{/* Zone list */}
					<div className="max-h-60 overflow-y-auto p-1">
						{filteredZones.length === 0 ? (
							<p className="text-sm text-muted-foreground text-center py-4">
								{t("routes.form.noZonesFound")}
							</p>
						) : (
							filteredZones.map((zone) => {
								const isSelected = selectedIds.includes(zone.id);
								return (
									<div
										key={zone.id}
										role="option"
										aria-selected={isSelected}
										tabIndex={0}
										onClick={() => handleSelect(zone.id)}
										onKeyDown={(e) => {
											if (e.key === "Enter" || e.key === " ") {
												e.preventDefault();
												handleSelect(zone.id);
											}
										}}
										className={cn(
											"w-full flex items-center gap-2 px-2 py-2 rounded-sm text-sm cursor-pointer",
											"hover:bg-accent hover:text-accent-foreground",
											"focus:bg-accent focus:text-accent-foreground focus:outline-none",
											isSelected && "bg-accent/50",
										)}
									>
										<div
											className={cn(
												"h-4 w-4 rounded-sm border flex items-center justify-center",
												isSelected
													? "bg-primary border-primary text-primary-foreground"
													: "border-input",
											)}
										>
											{isSelected && <Check className="h-3 w-3" />}
										</div>
										<span className="flex-1 text-left">{zone.name}</span>
										<span className="text-muted-foreground text-xs">
											({zone.code})
										</span>
									</div>
								);
							})
						)}
					</div>
				</PopoverContent>
			</Popover>

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
