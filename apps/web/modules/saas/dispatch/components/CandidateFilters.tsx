"use client";

import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { CandidateSortBy, ComplianceFilter, FleetTypeFilter } from "../types/assignment";

/**
 * CandidateFilters Component
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 * Story 18.9: Add Fleet Type filter for Shadow Fleet
 *
 * Filter and sort controls for the candidates list.
 *
 * @see AC9: Filter and Sort Candidates
 * @see Story 18.9 AC5: Shadow Fleet Filtering
 */

interface CandidateFiltersProps {
	sortBy: CandidateSortBy;
	onSortChange: (value: CandidateSortBy) => void;
	complianceFilter: ComplianceFilter;
	onComplianceFilterChange: (value: ComplianceFilter) => void;
	// Story 18.9: Fleet type filter
	fleetTypeFilter: FleetTypeFilter;
	onFleetTypeFilterChange: (value: FleetTypeFilter) => void;
	search: string;
	onSearchChange: (value: string) => void;
	className?: string;
}

export function CandidateFilters({
	sortBy,
	onSortChange,
	complianceFilter,
	onComplianceFilterChange,
	fleetTypeFilter,
	onFleetTypeFilterChange,
	search,
	onSearchChange,
	className,
}: CandidateFiltersProps) {
	const t = useTranslations("dispatch.assignment.filters");

	return (
		<div className={cn("space-y-3", className)}>
			{/* Search */}
			<div className="relative">
				<Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
				<Input
					placeholder={t("search")}
					value={search}
					onChange={(e) => onSearchChange(e.target.value)}
					className="pl-9"
					data-testid="candidate-search"
				/>
			</div>

			{/* Sort & Filter Row */}
			<div className="flex gap-2 flex-wrap">
				{/* Sort By */}
				<Select
					value={sortBy}
					onValueChange={(value) => onSortChange(value as CandidateSortBy)}
				>
					<SelectTrigger className="w-[130px]" data-testid="sort-by">
						<SelectValue placeholder={t("sortBy")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="score">{t("score")}</SelectItem>
						<SelectItem value="cost">{t("cost")}</SelectItem>
						<SelectItem value="distance">{t("distance")}</SelectItem>
					</SelectContent>
				</Select>

				{/* Compliance Filter */}
				<Select
					value={complianceFilter}
					onValueChange={(value) => onComplianceFilterChange(value as ComplianceFilter)}
				>
					<SelectTrigger className="w-[130px]" data-testid="compliance-filter">
						<SelectValue placeholder={t("compliance")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("all")}</SelectItem>
						<SelectItem value="ok">{t("okOnly")}</SelectItem>
						<SelectItem value="warnings">{t("includeWarnings")}</SelectItem>
					</SelectContent>
				</Select>

				{/* Story 18.9: Fleet Type Filter */}
				<Select
					value={fleetTypeFilter}
					onValueChange={(value) => onFleetTypeFilterChange(value as FleetTypeFilter)}
				>
					<SelectTrigger className="w-[130px]" data-testid="fleet-type-filter">
						<SelectValue placeholder={t("fleetType")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("allFleets")}</SelectItem>
						<SelectItem value="internal">{t("internalOnly")}</SelectItem>
						<SelectItem value="shadow">{t("shadowFleetOnly")}</SelectItem>
					</SelectContent>
				</Select>
			</div>
		</div>
	);
}

export default CandidateFilters;
