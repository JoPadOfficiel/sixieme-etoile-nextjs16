"use client";

/**
 * Seasonal Multiplier List Component
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 *
 * Data table displaying all seasonal multipliers with filtering and actions
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
	SeasonalMultiplier,
	SeasonalMultiplierStatusFilter,
} from "../types/seasonal-multiplier";
import {
	formatDateRange,
	formatMultiplierAsFactor,
	formatMultiplierAsPercent,
	getStatusColor,
} from "../types/seasonal-multiplier";

interface SeasonalMultiplierListProps {
	multipliers: SeasonalMultiplier[];
	isLoading: boolean;
	statusFilter: SeasonalMultiplierStatusFilter;
	onStatusFilterChange: (status: SeasonalMultiplierStatusFilter) => void;
	onEdit: (multiplier: SeasonalMultiplier) => void;
	onDelete: (multiplier: SeasonalMultiplier) => void;
}

export function SeasonalMultiplierList({
	multipliers,
	isLoading,
	statusFilter,
	onStatusFilterChange,
	onEdit,
	onDelete,
}: SeasonalMultiplierListProps) {
	const t = useTranslations("settings.pricing.seasonalMultipliers");

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex items-center gap-4">
				<Select
					value={statusFilter}
					onValueChange={(value) =>
						onStatusFilterChange(value as SeasonalMultiplierStatusFilter)
					}
				>
					<SelectTrigger className="w-[180px]" data-testid="status-filter">
						<SelectValue placeholder={t("table.status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("status.all")}</SelectItem>
						<SelectItem value="active">{t("status.active")}</SelectItem>
						<SelectItem value="upcoming">{t("status.upcoming")}</SelectItem>
						<SelectItem value="expired">{t("status.expired")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border" data-testid="multipliers-table">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("table.name")}</TableHead>
							<TableHead>{t("table.period")}</TableHead>
							<TableHead className="text-right">{t("table.multiplier")}</TableHead>
							<TableHead className="text-center">{t("table.priority")}</TableHead>
							<TableHead>{t("table.category") || "Category"}</TableHead>
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
						) : multipliers.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									<div className="text-muted-foreground">
										<p className="font-medium">{t("empty.title")}</p>
										<p className="text-sm">{t("empty.description")}</p>
									</div>
								</TableCell>
							</TableRow>
						) : (
							multipliers.map((multiplier) => (
								<TableRow key={multiplier.id} data-testid="multiplier-row">
									<TableCell>
										<div>
											<div className="font-medium">{multiplier.name}</div>
											{multiplier.description && (
												<div className="text-sm text-muted-foreground truncate max-w-[200px]">
													{multiplier.description}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										{formatDateRange(multiplier.startDate, multiplier.endDate)}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex flex-col items-end">
											<span className="font-medium">
												{formatMultiplierAsFactor(multiplier.multiplier)}
											</span>
											<span className="text-sm text-muted-foreground">
												{formatMultiplierAsPercent(multiplier.multiplier)}
											</span>
										</div>
									</TableCell>
									<TableCell className="text-center">
										{multiplier.priority}
									</TableCell>
									<TableCell>
										{multiplier.vehicleCategoryNames?.length
											? multiplier.vehicleCategoryNames.join(", ")
											: "All Categories"}
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={getStatusColor(multiplier.status)}
										>
											{t(`status.${multiplier.status}`)}
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
													onClick={() => setTimeout(() => onEdit(multiplier), 0)}
													data-testid="edit-button"
												>
													<Pencil className="mr-2 size-4" />
													{t("actions.edit")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => setTimeout(() => onDelete(multiplier), 0)}
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
