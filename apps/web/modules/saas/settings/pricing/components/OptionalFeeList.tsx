"use client";

/**
 * Optional Fee List Component
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
 *
 * Data table displaying all optional fees with filtering and actions
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
	OptionalFee,
	OptionalFeeTypeFilter,
	OptionalFeeStatusFilter,
} from "../types/optional-fee";
import {
	formatAmount,
	formatVatRate,
	getStatusColor,
	getAmountTypeColor,
	hasAutoApplyRules,
} from "../types/optional-fee";

interface OptionalFeeListProps {
	fees: OptionalFee[];
	isLoading: boolean;
	typeFilter: OptionalFeeTypeFilter;
	statusFilter: OptionalFeeStatusFilter;
	onTypeFilterChange: (type: OptionalFeeTypeFilter) => void;
	onStatusFilterChange: (status: OptionalFeeStatusFilter) => void;
	onEdit: (fee: OptionalFee) => void;
	onDelete: (fee: OptionalFee) => void;
}

export function OptionalFeeList({
	fees,
	isLoading,
	typeFilter,
	statusFilter,
	onTypeFilterChange,
	onStatusFilterChange,
	onEdit,
	onDelete,
}: OptionalFeeListProps) {
	const t = useTranslations("settings.pricing.optionalFees");

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex items-center gap-4">
				<Select
					value={typeFilter}
					onValueChange={(value) =>
						onTypeFilterChange(value as OptionalFeeTypeFilter)
					}
				>
					<SelectTrigger className="w-[180px]" data-testid="type-filter">
						<SelectValue placeholder={t("table.type")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("status.all")}</SelectItem>
						<SelectItem value="FIXED">{t("types.FIXED")}</SelectItem>
						<SelectItem value="PERCENTAGE">{t("types.PERCENTAGE")}</SelectItem>
					</SelectContent>
				</Select>

				<Select
					value={statusFilter}
					onValueChange={(value) =>
						onStatusFilterChange(value as OptionalFeeStatusFilter)
					}
				>
					<SelectTrigger className="w-[180px]" data-testid="status-filter">
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
			<div className="rounded-md border" data-testid="fees-table">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("table.name")}</TableHead>
							<TableHead>{t("table.type")}</TableHead>
							<TableHead className="text-right">{t("table.amount")}</TableHead>
							<TableHead className="text-center">{t("table.vat")}</TableHead>
							<TableHead className="text-center">{t("table.autoApply")}</TableHead>
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
										<Skeleton className="h-5 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-16 ml-auto" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-12 mx-auto" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-16 mx-auto" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-16" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-8" />
									</TableCell>
								</TableRow>
							))
						) : fees.length === 0 ? (
							<TableRow>
								<TableCell colSpan={8} className="h-24 text-center">
									<div className="text-muted-foreground">
										<p className="font-medium">{t("empty.title")}</p>
										<p className="text-sm">{t("empty.description")}</p>
									</div>
								</TableCell>
							</TableRow>
						) : (
							fees.map((fee) => (
								<TableRow key={fee.id} data-testid="fee-row">
									<TableCell>
										<div>
											<div className="font-medium">{fee.name}</div>
											{fee.description && (
												<div className="text-sm text-muted-foreground truncate max-w-[200px]">
													{fee.description}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={getAmountTypeColor(fee.amountType)}
										>
											{t(`types.${fee.amountType}`)}
										</Badge>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatAmount(fee.amount, fee.amountType)}
									</TableCell>
									<TableCell className="text-center">
										{formatVatRate(fee.vatRate, fee.isTaxable)}
									</TableCell>
									<TableCell className="text-center">
										{hasAutoApplyRules(fee.autoApplyRules) ? (
											<Badge variant="outline" className="bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300">
												{t("autoApply.enabled")}
											</Badge>
										) : (
											<span className="text-muted-foreground text-sm">
												{t("autoApply.disabled")}
											</span>
										)}
									</TableCell>
									<TableCell>
										{fee.vehicleCategoryNames?.length
											? fee.vehicleCategoryNames.join(", ")
											: "All Categories"}
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={getStatusColor(fee.isActive)}
										>
											{fee.isActive ? t("status.active") : t("status.inactive")}
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
													onClick={() => setTimeout(() => onEdit(fee), 0)}
													data-testid="edit-button"
												>
													<Pencil className="mr-2 size-4" />
													{t("actions.edit")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => setTimeout(() => onDelete(fee), 0)}
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
