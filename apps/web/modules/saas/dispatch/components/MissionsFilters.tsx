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

	// Story 22.4: Handle subcontracted filter change
	const handleSubcontractedChange = (value: string) => {
		onFiltersChange({
			...filters,
			subcontracted: value as "ALL" | "SUBCONTRACTED" | "INTERNAL",
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
		(filters.subcontracted && filters.subcontracted !== "ALL") ||
		filters.search;

	return (
		<div className={cn("space-y-1", className)} data-testid="missions-filters">
			{/* Search and Filters Row */}
			<div className="flex flex-wrap items-center gap-1">
				{/* Search */}
				<div className="relative flex-shrink-0">
					{filters.search ? (
						<div className="flex items-center gap-1">
							<Input
								placeholder={t("searchPlaceholder")}
								value={filters.search || ""}
								onChange={handleSearchChange}
								className="pl-7 w-32 h-7 text-xs"
								data-testid="filter-search"
							/>
							<Button
								variant="ghost"
								size="sm"
								onClick={() => handleSearchChange({ target: { value: "" } } as React.ChangeEvent<HTMLInputElement>)}
								className="h-7 w-6 p-0 text-muted-foreground"
							>
								<X className="size-3" />
							</Button>
						</div>
					) : (
						<Button
							variant="outline"
							size="sm"
							onClick={() => {
								// Focus the search input when it appears
								const searchInput = document.querySelector('[data-testid="filter-search"]') as HTMLInputElement;
								if (searchInput) {
									searchInput.focus();
								}
							}}
							className="h-7 w-7 p-0 text-muted-foreground"
							data-testid="filter-search-toggle"
						>
							<Search className="size-3" />
						</Button>
					)}
				</div>
				{/* Date From */}
				<Popover>
					<PopoverTrigger asChild>
						<Button
							variant="outline"
							size="sm"
							className={cn(
								"justify-start text-left font-normal h-7 px-1 text-xs",
								!filters.dateFrom && "text-muted-foreground"
							)}
							data-testid="filter-date-from"
						>
							<CalendarIcon className="mr-1 size-3" />
							{filters.dateFrom
								? format(new Date(filters.dateFrom), "dd/MM")
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
								"justify-start text-left font-normal h-7 px-1 text-xs",
								!filters.dateTo && "text-muted-foreground"
							)}
							data-testid="filter-date-to"
						>
							<CalendarIcon className="mr-1 size-3" />
							{filters.dateTo
								? format(new Date(filters.dateTo), "dd/MM")
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
					<SelectTrigger className="w-[100px] h-7 text-xs" data-testid="filter-vehicle-category">
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
					<SelectTrigger className="w-[90px] h-7 text-xs" data-testid="filter-client-type">
						<SelectValue placeholder={t("clientType")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">{t("all")}</SelectItem>
						<SelectItem value="PARTNER">{t("partner")}</SelectItem>
						<SelectItem value="PRIVATE">{t("private")}</SelectItem>
					</SelectContent>
				</Select>

				{/* Subcontracted Filter - Story 22.4 */}
				<Select
					value={filters.subcontracted || "ALL"}
					onValueChange={handleSubcontractedChange}
				>
					<SelectTrigger className="w-[100px] h-7 text-xs" data-testid="filter-subcontracted">
						<SelectValue placeholder={t("subcontracted")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="ALL">{t("subcontractedAll")}</SelectItem>
						<SelectItem value="SUBCONTRACTED">{t("subcontractedOnly")}</SelectItem>
						<SelectItem value="INTERNAL">{t("internalOnly")}</SelectItem>
					</SelectContent>
				</Select>

				{/* Clear Filters */}
				{hasActiveFilters && (
					<Button
						variant="ghost"
						size="sm"
						onClick={handleClearFilters}
						className="text-muted-foreground h-7 px-1 text-xs"
					>
						<X className="mr-1 size-3" />
						{t("clear")}
					</Button>
				)}
			</div>
		</div>
	);
}

export default MissionsFilters;
