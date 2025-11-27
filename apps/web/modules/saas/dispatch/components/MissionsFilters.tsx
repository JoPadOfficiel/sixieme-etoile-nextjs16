"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Calendar } from "@ui/components/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@ui/components/popover";
import { CalendarIcon, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { cn } from "@ui/lib";
import type { MissionsFilters as Filters } from "../types";

/**
 * MissionsFilters Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Filters toolbar for the missions list in the Dispatch screen.
 * Supports date range, vehicle category, client type, and search.
 *
 * @see AC3: Missions List Filters
 */

interface VehicleCategory {
	id: string;
	name: string;
	code: string;
}

interface MissionsFiltersProps {
	filters: Filters;
	onFiltersChange: (filters: Filters) => void;
	vehicleCategories?: VehicleCategory[];
	className?: string;
}

export function MissionsFilters({
	filters,
	onFiltersChange,
	vehicleCategories = [],
	className,
}: MissionsFiltersProps) {
	const t = useTranslations("dispatch.filters");

	const handleDateFromChange = (date: Date | undefined) => {
		onFiltersChange({
			...filters,
			dateFrom: date ? date.toISOString() : undefined,
		});
	};

	const handleDateToChange = (date: Date | undefined) => {
		onFiltersChange({
			...filters,
			dateTo: date ? date.toISOString() : undefined,
		});
	};

	const handleVehicleCategoryChange = (value: string) => {
		onFiltersChange({
			...filters,
			vehicleCategoryId: value === "all" ? undefined : value,
		});
	};

	const handleClientTypeChange = (value: string) => {
		onFiltersChange({
			...filters,
			clientType: value as "PARTNER" | "PRIVATE" | "ALL",
		});
	};

	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		onFiltersChange({
			...filters,
			search: e.target.value || undefined,
		});
	};

	const handleClearFilters = () => {
		onFiltersChange({});
	};

	const hasActiveFilters =
		filters.dateFrom ||
		filters.dateTo ||
		filters.vehicleCategoryId ||
		(filters.clientType && filters.clientType !== "ALL") ||
		filters.search;

	return (
		<div className={cn("space-y-3", className)} data-testid="missions-filters">
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
				<Input
					placeholder={t("searchPlaceholder")}
					value={filters.search || ""}
					onChange={handleSearchChange}
					className="pl-9"
					data-testid="filter-search"
				/>
			</div>

			{/* Filter Row */}
			<div className="flex flex-wrap gap-2">
				{/* Date From */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								"justify-start text-left font-normal",
								!filters.dateFrom && "text-muted-foreground"
							)}
							data-testid="filter-date-from"
						>
							<CalendarIcon className="mr-2 size-4" />
							{filters.dateFrom
								? format(new Date(filters.dateFrom), "PP")
								: t("dateFrom")}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={filters.dateFrom ? new Date(filters.dateFrom) : undefined}
							onSelect={handleDateFromChange}
							initialFocus
						/>
					</PopoverContent>
				</Popover>

				{/* Date To */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								"justify-start text-left font-normal",
								!filters.dateTo && "text-muted-foreground"
							)}
							data-testid="filter-date-to"
						>
							<CalendarIcon className="mr-2 size-4" />
							{filters.dateTo
								? format(new Date(filters.dateTo), "PP")
								: t("dateTo")}
						</Button>
					</PopoverTrigger>
					<PopoverContent className="w-auto p-0" align="start">
						<Calendar
							mode="single"
							selected={filters.dateTo ? new Date(filters.dateTo) : undefined}
							onSelect={handleDateToChange}
							initialFocus
						/>
					</PopoverContent>
				</Popover>

				{/* Vehicle Category */}
				<Select
					value={filters.vehicleCategoryId || "all"}
					onValueChange={handleVehicleCategoryChange}
				>
					<SelectTrigger className="w-[160px] h-9" data-testid="filter-vehicle-category">
						<SelectValue placeholder={t("vehicleCategory")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all")}</SelectItem>
						{vehicleCategories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Client Type */}
				<Select
					value={filters.clientType || "ALL"}
					onValueChange={handleClientTypeChange}
				>
					<SelectTrigger className="w-[140px] h-9" data-testid="filter-client-type">
						<SelectValue placeholder={t("clientType")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">{t("all")}</SelectItem>
						<SelectItem value="PARTNER">{t("partner")}</SelectItem>
						<SelectItem value="PRIVATE">{t("private")}</SelectItem>
					</SelectContent>
				</Select>

				{/* Clear Filters */}
				{hasActiveFilters && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClearFilters}
						className="text-muted-foreground"
					>
						<X className="mr-1 size-4" />
						{t("clear")}
					</Button>
				)}
			</div>
		</div>
	);
}

export default MissionsFilters;
