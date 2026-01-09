"use client";

/**
 * Promotion List Component
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 *
 * Data table displaying all promotions with filtering and actions
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
	Promotion,
	PromotionTypeFilter,
	PromotionStatusFilter,
} from "../types/promotion";
import {
	formatDiscountValue,
	formatUsage,
	formatDate,
	getPromotionStatusColor,
	getDiscountTypeColor,
} from "../types/promotion";

interface PromotionListProps {
	promotions: Promotion[];
	isLoading: boolean;
	typeFilter: PromotionTypeFilter;
	statusFilter: PromotionStatusFilter;
	onTypeFilterChange: (type: PromotionTypeFilter) => void;
	onStatusFilterChange: (status: PromotionStatusFilter) => void;
	onEdit: (promotion: Promotion) => void;
	onDelete: (promotion: Promotion) => void;
}

export function PromotionList({
	promotions,
	isLoading,
	typeFilter,
	statusFilter,
	onTypeFilterChange,
	onStatusFilterChange,
	onEdit,
	onDelete,
}: PromotionListProps) {
	const t = useTranslations("settings.pricing.promotions");

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex items-center gap-4">
				<Select
					value={typeFilter}
					onValueChange={(value) =>
						onTypeFilterChange(value as PromotionTypeFilter)
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
						onStatusFilterChange(value as PromotionStatusFilter)
					}
				>
					<SelectTrigger className="w-[180px]" data-testid="status-filter">
						<SelectValue placeholder={t("table.status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("status.all")}</SelectItem>
						<SelectItem value="active">{t("status.active")}</SelectItem>
						<SelectItem value="expired">{t("status.expired")}</SelectItem>
						<SelectItem value="upcoming">{t("status.upcoming")}</SelectItem>
						<SelectItem value="inactive">{t("status.inactive")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border" data-testid="promotions-table">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("table.code")}</TableHead>
							<TableHead>{t("table.type")}</TableHead>
							<TableHead className="text-right">{t("table.value")}</TableHead>
							<TableHead>{t("table.validFrom")}</TableHead>
							<TableHead>{t("table.validTo")}</TableHead>
							<TableHead className="text-center">{t("table.usage")}</TableHead>
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
										<Skeleton className="h-4 w-24" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-16 ml-auto" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-20" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-4 w-12 mx-auto" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-5 w-16" />
									</TableCell>
									<TableCell>
										<Skeleton className="h-8 w-8" />
									</TableCell>
								</TableRow>
							))
						) : promotions.length === 0 ? (
							<TableRow>
								<TableCell colSpan={9} className="h-24 text-center">
									<div className="text-muted-foreground">
										<p className="font-medium">{t("empty.title")}</p>
										<p className="text-sm">{t("empty.description")}</p>
									</div>
								</TableCell>
							</TableRow>
						) : (
							promotions.map((promotion) => (
								<TableRow key={promotion.id} data-testid="promotion-row">
									<TableCell>
										<div>
											<div className="font-mono font-medium">{promotion.code}</div>
											{promotion.description && (
												<div className="text-sm text-muted-foreground truncate max-w-[200px]">
													{promotion.description}
												</div>
											)}
										</div>
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={getDiscountTypeColor(promotion.discountType)}
										>
											{t(`types.${promotion.discountType}`)}
										</Badge>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatDiscountValue(promotion.value, promotion.discountType)}
									</TableCell>
									<TableCell className="text-sm">
										{formatDate(promotion.validFrom)}
									</TableCell>
									<TableCell className="text-sm">
										{formatDate(promotion.validTo)}
									</TableCell>
									<TableCell className="text-center font-mono text-sm">
										{formatUsage(promotion.currentUses, promotion.maxTotalUses)}
									</TableCell>
									<TableCell>
										{promotion.vehicleCategoryNames?.length
											? promotion.vehicleCategoryNames.join(", ")
											: "All Categories"}
									</TableCell>
									<TableCell>
										<Badge
											variant="secondary"
											className={getPromotionStatusColor(promotion.status)}
										>
											{t(`status.${promotion.status}`)}
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
													onClick={() => setTimeout(() => onEdit(promotion), 0)}
													data-testid="edit-button"
												>
													<Pencil className="mr-2 size-4" />
													{t("actions.edit")}
												</DropdownMenuItem>
												<DropdownMenuItem
													onClick={() => setTimeout(() => onDelete(promotion), 0)}
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
