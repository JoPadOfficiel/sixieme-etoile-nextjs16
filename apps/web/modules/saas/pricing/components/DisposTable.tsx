"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import {
	ClockIcon,
	EditIcon,
	Loader2Icon,
	RulerIcon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { DispoPackage, VehicleCategory } from "../types";

interface DisposTableProps {
	dispos: DispoPackage[];
	vehicleCategories: VehicleCategory[];
	isLoading?: boolean;
	onEdit: (dispo: DispoPackage) => void;
	onDelete: (dispo: DispoPackage) => void;
	// Filters
	search: string;
	onSearchChange: (search: string) => void;
	vehicleCategoryId: string;
	onVehicleCategoryIdChange: (categoryId: string) => void;
	statusFilter: string;
	onStatusFilterChange: (status: string) => void;
	// Pagination
	page: number;
	totalPages: number;
	total: number;
	onPageChange: (page: number) => void;
}

export function DisposTable({
	dispos,
	vehicleCategories,
	isLoading = false,
	onEdit,
	onDelete,
	search,
	onSearchChange,
	vehicleCategoryId,
	onVehicleCategoryIdChange,
	statusFilter,
	onStatusFilterChange,
	page,
	totalPages,
	total,
	onPageChange,
}: DisposTableProps) {
	const t = useTranslations();

	// Sort categories for filters
	const sortedCategories = [...vehicleCategories].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format(price);
	};

	const formatRate = (rate: number, unit: string) => {
		return `${formatPrice(rate)}/${unit}`;
	};

	const formatDuration = (hours: number) => {
		if (hours < 1) {
			return `${Math.round(hours * 60)} min`;
		}
		return `${hours}h`;
	};

	const formatDistance = (km: number) => {
		return `${km} km`;
	};

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				{/* Search */}
				<div className="relative min-w-[200px] flex-1">
					<SearchIcon className="-translate-y-1/2 absolute top-1/2 left-3 size-4 text-muted-foreground" />
					<Input
						placeholder={t("dispos.searchPlaceholder")}
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-9"
					/>
				</div>

				{/* Vehicle Category Filter */}
				<Select
					value={vehicleCategoryId}
					onValueChange={onVehicleCategoryIdChange}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder={t("dispos.filters.vehicleCategory")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">
							{t("dispos.filters.allCategories")}
						</SelectItem>
						{sortedCategories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Status Filter */}
				<Select value={statusFilter} onValueChange={onStatusFilterChange}>
					<SelectTrigger className="w-[140px]">
						<SelectValue placeholder={t("dispos.filters.status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("dispos.filters.allStatus")}</SelectItem>
						<SelectItem value="active">{t("dispos.filters.active")}</SelectItem>
						<SelectItem value="inactive">
							{t("dispos.filters.inactive")}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("dispos.table.name")}</TableHead>
							<TableHead>{t("dispos.table.vehicleCategory")}</TableHead>
							<TableHead>{t("dispos.table.included")}</TableHead>
							<TableHead className="text-right">
								{t("dispos.table.basePrice")}
							</TableHead>
							<TableHead className="text-right">
								{t("dispos.table.overageRates")}
							</TableHead>
							<TableHead>{t("dispos.table.status")}</TableHead>
							<TableHead className="w-[100px]">
								{t("dispos.table.actions")}
							</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									<Loader2Icon className="mx-auto size-6 animate-spin text-muted-foreground" />
								</TableCell>
							</TableRow>
						) : dispos.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="h-24 text-center text-muted-foreground"
								>
									{t("dispos.noDispos")}
								</TableCell>
							</TableRow>
						) : (
							dispos.map((dispo) => (
								<TableRow key={dispo.id}>
									<TableCell>
										<div className="flex flex-col">
											<span className="font-medium">{dispo.name}</span>
											{dispo.description && (
												<span className="line-clamp-1 text-muted-foreground text-xs">
													{dispo.description}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span>{dispo.vehicleCategory.name}</span>
											<span className="text-muted-foreground text-xs">
												{dispo.vehicleCategory.maxPassengers}{" "}
												{t("dispos.passengers")}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-1 text-sm">
												<ClockIcon className="size-3 text-muted-foreground" />
												<span>
													{formatDuration(dispo.includedDurationHours)}
												</span>
											</div>
											<div className="flex items-center gap-1 text-sm">
												<RulerIcon className="size-3 text-muted-foreground" />
												<span>{formatDistance(dispo.includedDistanceKm)}</span>
											</div>
										</div>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatPrice(dispo.basePrice)}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex flex-col gap-1 text-sm">
											<span>{formatRate(dispo.overageRatePerKm, "km")}</span>
											<span>{formatRate(dispo.overageRatePerHour, "h")}</span>
										</div>
									</TableCell>
									<TableCell>
										<Badge variant={dispo.isActive ? "default" : "secondary"}>
											{dispo.isActive
												? t("common.active")
												: t("common.inactive")}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onEdit(dispo)}
												title={t("common.edit")}
											>
												<EditIcon className="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onDelete(dispo)}
												title={t("common.delete")}
												className="text-destructive hover:text-destructive"
											>
												<Trash2Icon className="size-4" />
											</Button>
										</div>
									</TableCell>
								</TableRow>
							))
						)}
					</TableBody>
				</Table>
			</div>

			{/* Pagination */}
			{totalPages > 1 && (
				<div className="flex items-center justify-between">
					<p className="text-muted-foreground text-sm">
						{t("dispos.pagination.showing", { count: dispos.length, total })}
					</p>
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(page - 1)}
							disabled={page <= 1}
						>
							{t("common.previous")}
						</Button>
						<span className="text-sm">
							{t("dispos.pagination.page", { page, totalPages })}
						</span>
						<Button
							variant="outline"
							size="sm"
							onClick={() => onPageChange(page + 1)}
							disabled={page >= totalPages}
						>
							{t("common.next")}
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
