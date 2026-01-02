"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { format, subDays, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@ui/components/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Popover, PopoverContent, PopoverTrigger } from "@ui/components/popover";
import { Calendar } from "@ui/components/calendar";
import { Calendar as CalendarIcon, X } from "lucide-react";
import { cn } from "@ui/lib";
import type { ReportFilters as Filters, GroupBy, ProfitabilityLevel } from "../types";
import type { DateRange } from "react-day-picker";

/**
 * DateRangePicker Component
 *
 * A date range picker for filtering reports by date period.
 */
interface DateRangePickerProps {
	dateFrom?: string;
	dateTo?: string;
	onChange: (from: string | undefined, to: string | undefined) => void;
}

function DateRangePicker({ dateFrom, dateTo, onChange }: DateRangePickerProps) {
	const t = useTranslations("reports.filters");
	const [isOpen, setIsOpen] = useState(false);

	const selected: DateRange | undefined =
		dateFrom || dateTo
			? {
					from: dateFrom ? new Date(dateFrom) : undefined,
					to: dateTo ? new Date(dateTo) : undefined,
				}
			: undefined;

	const handleSelect = (range: DateRange | undefined) => {
		if (range?.from && range?.to) {
			onChange(range.from.toISOString(), range.to.toISOString());
			setIsOpen(false);
		} else if (range?.from) {
			onChange(range.from.toISOString(), undefined);
		} else {
			onChange(undefined, undefined);
		}
	};

	const handleClear = () => {
		onChange(undefined, undefined);
		setIsOpen(false);
	};

	const formatDateRange = () => {
		if (!dateFrom && !dateTo) return t("dateRange");
		const fromStr = dateFrom
			? format(new Date(dateFrom), "dd/MM/yyyy", { locale: fr })
			: "...";
		const toStr = dateTo
			? format(new Date(dateTo), "dd/MM/yyyy", { locale: fr })
			: "...";
		return `${fromStr} - ${toStr}`;
	};

	const handlePreset = (preset: string) => {
		const now = new Date();
		let from: Date;
		let to: Date = now;

		switch (preset) {
			case "last7days":
				from = subDays(now, 7);
				break;
			case "last30days":
				from = subDays(now, 30);
				break;
			case "thisMonth":
				from = startOfMonth(now);
				to = endOfMonth(now);
				break;
			case "lastMonth":
				from = startOfMonth(subMonths(now, 1));
				to = endOfMonth(subMonths(now, 1));
				break;
			default:
				return;
		}

		onChange(from.toISOString(), to.toISOString());
		setIsOpen(false);
	};

	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					size="sm"
					className={cn(
						"gap-2 min-w-[200px] justify-start",
						(dateFrom || dateTo) && "text-foreground"
					)}
				>
					<CalendarIcon className="h-4 w-4" />
					<span className="truncate">{formatDateRange()}</span>
					{(dateFrom || dateTo) && (
						<X
							className="h-3 w-3 ml-auto opacity-50 hover:opacity-100"
							onClick={(e) => {
								e.stopPropagation();
								handleClear();
							}}
						/>
					)}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0" align="start">
				<div className="flex">
					{/* Presets */}
					<div className="border-r p-2 space-y-1 w-32">
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start text-xs h-7"
							onClick={() => handlePreset("last7days")}
						>
							7 derniers jours
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start text-xs h-7"
							onClick={() => handlePreset("last30days")}
						>
							30 derniers jours
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start text-xs h-7"
							onClick={() => handlePreset("thisMonth")}
						>
							Ce mois
						</Button>
						<Button
							variant="ghost"
							size="sm"
							className="w-full justify-start text-xs h-7"
							onClick={() => handlePreset("lastMonth")}
						>
							Mois dernier
						</Button>
					</div>
					{/* Calendar */}
					<div className="p-2">
						<Calendar
							mode="range"
							selected={selected}
							onSelect={handleSelect}
							numberOfMonths={2}
							locale={fr}
							className="rounded-md border"
						/>
					</div>
				</div>
			</PopoverContent>
		</Popover>
	);
}

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

			{/* Date Range Picker */}
			<DateRangePicker
				dateFrom={filters.dateFrom}
				dateTo={filters.dateTo}
				onChange={(from, to) => {
					onFiltersChange({
						...filters,
						dateFrom: from,
						dateTo: to,
					});
				}}
			/>

			{/* Clear Filters */}
			<Button variant="ghost" size="sm" onClick={handleClearFilters}>
				{t("clear")}
			</Button>
		</div>
	);
}
