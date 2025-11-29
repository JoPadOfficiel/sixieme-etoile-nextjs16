"use client";

/**
 * Advanced Rate List Component
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 *
 * Data table displaying all advanced rate modifiers with filtering and actions
 */

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Skeleton } from "@ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import type {
	AdvancedRate,
	AdvancedRateStatusFilter,
	AdvancedRateTypeFilter,
} from "../types/advanced-rate";
import {
	formatAdjustment,
	getConditionsDisplay,
	getStatusColor,
	getTypeColor,
} from "../types/advanced-rate";

interface AdvancedRateListProps {
	rates: AdvancedRate[];
	isLoading: boolean;
	typeFilter: AdvancedRateTypeFilter;
	statusFilter: AdvancedRateStatusFilter;
	onTypeFilterChange: (type: AdvancedRateTypeFilter) => void;
	onStatusFilterChange: (status: AdvancedRateStatusFilter) => void;
	onEdit: (rate: AdvancedRate) => void;
	onDelete: (rate: AdvancedRate) => void;
}

export function AdvancedRateList({
	rates,
	isLoading,
	typeFilter,
	statusFilter,
	onTypeFilterChange,
	onStatusFilterChange,
	onEdit,
	onDelete,
}: AdvancedRateListProps) {
	const t = useTranslations("settings.pricing.advancedRates");

	// Day names for formatting
	const dayNames: Record<string, string> = {
		"0": t("form.days.0"),
		"1": t("form.days.1"),
		"2": t("form.days.2"),
		"3": t("form.days.3"),
		"4": t("form.days.4"),
		"5": t("form.days.5"),
		"6": t("form.days.6"),
	};

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex items-center gap-4">
				<Select
					value={typeFilter}
					onValueChange={(value) =>
						onTypeFilterChange(value as AdvancedRateTypeFilter)
					}
				>
					<SelectTrigger className="w-[180px]" data-testid="type-filter">
						<SelectValue placeholder={t("table.type")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("status.all")}</SelectItem>
						<SelectItem value="NIGHT">{t("types.NIGHT")}</SelectItem>
						<SelectItem value="WEEKEND">{t("types.WEEKEND")}</SelectItem>
					</SelectContent>
				</Select>

				<Select
					value={statusFilter}
					onValueChange={(value) =>
						onStatusFilterChange(value as AdvancedRateStatusFilter)
					}
				>
					<SelectTrigger className="w-[150px]" data-testid="status-filter">
						<SelectValue placeholder={t("table.status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("status.all")}</SelectItem>
						<SelectItem value="active">{t("status.active")}</SelectItem>
						<SelectItem value="inactive">{t("status.inactive")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border" data-testid="rates-table">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("table.name")}</TableHead>
							<TableHead>{t("table.type")}</TableHead>
							<TableHead>{t("table.conditions")}</TableHead>
							<TableHead className="text-right">{t("table.adjustment")}</TableHead>
							<TableHead className="text-center">{t("table.priority")}</TableHead>
							<TableHead>{t("table.status")}</TableHead>
							<TableHead className="w-[70px]">{t("table.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							// Loading skeletons
							Array.from({ length: 5 }).map((_, i) => (
								<TableRow key={i}>
									<TableCell>
										<Skeleton className="h-4 w-32" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-40" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-16 ml-auto" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-8 mx-auto" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-16" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-8" />
									</TableCell>
								</TableRow>
							))
						) : rates.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									<div className="text-muted-foreground">
										<p className="font-medium">{t("empty.title")}</p>
										<p className="text-sm">{t("empty.description")}</p>
									</div>
								</TableCell>
							</TableRow>
						) : (
							rates.map((rate) => (
								<TableRow key={rate.id} data-testid="rate-row">
									<TableCell>
										<div className="font-medium">{rate.name}</div>
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={getTypeColor(rate.appliesTo)}
										>
											{t(`types.${rate.appliesTo}`)}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{getConditionsDisplay(rate, dayNames)}
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatAdjustment(rate.adjustmentType, rate.value ?? 0)}
									</TableCell>
									<TableCell className="text-center">{rate.priority}</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={getStatusColor(rate.isActive)}
										>
											{rate.isActive ? t("status.active") : t("status.inactive")}
										</Badge>
									</TableCell>
									<TableCell>
										<DropdownMenu>
											<DropdownMenuTrigger asChild>
												<Button
													variant="ghost"
													size="icon"
													className="size-8"
													data-testid="row-actions"
												>
													<MoreHorizontal className="size-4" />
													<span className="sr-only">Actions</span>
												</Button>
											</DropdownMenuTrigger>
											<DropdownMenuContent align="end">
												<DropdownMenuItem
													onClick={() => onEdit(rate)}
													data-testid="edit-button"
												>
													<Pencil className="mr-2 size-4" />
													{t("actions.edit")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => onDelete(rate)}
													className="text-destructive focus:text-destructive"
													data-testid="delete-button"
												>
													<Trash2 className="mr-2 size-4" />
													{t("actions.delete")}
												</DropdownMenuItem>
											</DropdownMenuContent>
										</DropdownMenu>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
