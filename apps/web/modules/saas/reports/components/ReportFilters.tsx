"use client";

import { useTranslations } from "next-intl";
import { Button } from "@ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Calendar } from "lucide-react";
import { cn } from "@ui/lib";
import type { ReportFilters as Filters, GroupBy, ProfitabilityLevel } from "../types";

/**
 * ReportFilters Component
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 *
 * Filter controls for the profitability report.
 */

interface ReportFiltersProps {
	filters: Filters;
	onFiltersChange: (filters: Filters) => void;
	className?: string;
}

export function ReportFilters({
	filters,
	onFiltersChange,
	className,
}: ReportFiltersProps) {
	const t = useTranslations("reports.filters");

	const handleGroupByChange = (value: string) => {
		onFiltersChange({ ...filters, groupBy: value as GroupBy });
	};

	const handleProfitabilityChange = (value: string) => {
		onFiltersChange({
			...filters,
			profitabilityLevel: value as "all" | ProfitabilityLevel,
		});
	};

	const handleClearFilters = () => {
		onFiltersChange({
			groupBy: "none",
			profitabilityLevel: "all",
			dateFrom: undefined,
			dateTo: undefined,
			contactId: undefined,
			vehicleCategoryId: undefined,
		});
	};

	return (
		<div className={cn("flex flex-wrap items-center gap-3", className)}>
			{/* Group By */}
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">{t("groupBy")}:</span>
				<Select value={filters.groupBy} onValueChange={handleGroupByChange}>
					<SelectTrigger className="w-[160px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="none">{t("groupByOptions.none")}</SelectItem>
						<SelectItem value="client">{t("groupByOptions.client")}</SelectItem>
						<SelectItem value="vehicleCategory">{t("groupByOptions.vehicleCategory")}</SelectItem>
						<SelectItem value="period">{t("groupByOptions.period")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Profitability Level */}
			<div className="flex items-center gap-2">
				<span className="text-sm text-muted-foreground">{t("profitability")}:</span>
				<Select value={filters.profitabilityLevel} onValueChange={handleProfitabilityChange}>
					<SelectTrigger className="w-[140px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("profitabilityOptions.all")}</SelectItem>
						<SelectItem value="green">
							<span className="flex items-center gap-2">
								<span className="h-2 w-2 rounded-full bg-green-500" />
								{t("profitabilityOptions.green")}
							</span>
						</SelectItem>
						<SelectItem value="orange">
							<span className="flex items-center gap-2">
								<span className="h-2 w-2 rounded-full bg-orange-500" />
								{t("profitabilityOptions.orange")}
							</span>
						</SelectItem>
						<SelectItem value="red">
							<span className="flex items-center gap-2">
								<span className="h-2 w-2 rounded-full bg-red-500" />
								{t("profitabilityOptions.red")}
							</span>
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Date Range (simplified - can be enhanced with date picker) */}
			<Button variant="outline" size="sm" className="gap-2">
				<Calendar className="h-4 w-4" />
				{t("dateRange")}
			</Button>

			{/* Clear Filters */}
			<Button variant="ghost" size="sm" onClick={handleClearFilters}>
				{t("clear")}
			</Button>
		</div>
	);
}
