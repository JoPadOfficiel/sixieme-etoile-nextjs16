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
	MapPinIcon,
	RulerIcon,
	SearchIcon,
	Trash2Icon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { ExcursionPackage, PricingZone, VehicleCategory } from "../types";

interface ExcursionsTableProps {
	excursions: ExcursionPackage[];
	zones: PricingZone[];
	vehicleCategories: VehicleCategory[];
	isLoading?: boolean;
	onEdit: (excursion: ExcursionPackage) => void;
	onDelete: (excursion: ExcursionPackage) => void;
	// Story 14.6: Partner assignment
	onAssignPartners?: (excursion: ExcursionPackage) => void;
	// Filters
	search: string;
	onSearchChange: (search: string) => void;
	zoneId: string;
	onZoneIdChange: (zoneId: string) => void;
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

export function ExcursionsTable({
	excursions,
	zones,
	vehicleCategories,
	isLoading = false,
	onEdit,
	onDelete,
	onAssignPartners,
	search,
	onSearchChange,
	zoneId,
	onZoneIdChange,
	vehicleCategoryId,
	onVehicleCategoryIdChange,
	statusFilter,
	onStatusFilterChange,
	page,
	totalPages,
	total,
	onPageChange,
}: ExcursionsTableProps) {
	const t = useTranslations();

	// Sort zones and categories for filters
	const sortedZones = [...zones].sort((a, b) => a.name.localeCompare(b.name));
	const sortedCategories = [...vehicleCategories].sort((a, b) =>
		a.name.localeCompare(b.name),
	);

	const formatPrice = (price: number) => {
		return new Intl.NumberFormat("fr-FR", {
			style: "currency",
			currency: "EUR",
		}).format(price);
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
						placeholder={t("excursions.searchPlaceholder")}
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-9"
					/>
				</div>

				{/* Zone Filter */}
				<Select value={zoneId} onValueChange={onZoneIdChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder={t("excursions.filters.zone")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">
							{t("excursions.filters.allZones")}
						</SelectItem>
						{sortedZones.map((zone) => (
							<SelectItem key={zone.id} value={zone.id}>
								{zone.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Vehicle Category Filter */}
				<Select
					value={vehicleCategoryId}
					onValueChange={onVehicleCategoryIdChange}
				>
					<SelectTrigger className="w-[180px]">
						<SelectValue
							placeholder={t("excursions.filters.vehicleCategory")}
						/>
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">
							{t("excursions.filters.allCategories")}
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
						<SelectValue placeholder={t("excursions.filters.status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">
							{t("excursions.filters.allStatus")}
						</SelectItem>
						<SelectItem value="active">
							{t("excursions.filters.active")}
						</SelectItem>
						<SelectItem value="inactive">
							{t("excursions.filters.inactive")}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("excursions.table.name")}</TableHead>
							<TableHead>{t("excursions.table.zones")}</TableHead>
							<TableHead>{t("excursions.table.vehicleCategory")}</TableHead>
							<TableHead>{t("excursions.table.included")}</TableHead>
							<TableHead className="text-right">
								{t("excursions.table.price")}
							</TableHead>
							<TableHead>{t("excursions.table.status")}</TableHead>
							<TableHead className="w-[100px]">
								{t("excursions.table.actions")}
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
						) : excursions.length === 0 ? (
							<TableRow>
								<TableCell
									colSpan={7}
									className="h-24 text-center text-muted-foreground"
								>
									{t("excursions.noExcursions")}
								</TableCell>
							</TableRow>
						) : (
							excursions.map((excursion) => (
								<TableRow key={excursion.id}>
									<TableCell>
										<div className="flex flex-col">
											<span className="font-medium">{excursion.name}</span>
											{excursion.description && (
												<span className="line-clamp-1 text-muted-foreground text-xs">
													{excursion.description}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											{excursion.originZone && (
												<div className="flex items-center gap-1 text-sm">
													<MapPinIcon className="size-3 text-green-600" />
													<span>{excursion.originZone.name}</span>
												</div>
											)}
											{excursion.destinationZone && (
												<div className="flex items-center gap-1 text-sm">
													<MapPinIcon className="size-3 text-red-600" />
													<span>{excursion.destinationZone.name}</span>
												</div>
											)}
											{!excursion.originZone && !excursion.destinationZone && (
												<span className="text-muted-foreground text-xs">
													{t("excursions.noZones")}
												</span>
											)}
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span>{excursion.vehicleCategory.name}</span>
											<span className="text-muted-foreground text-xs">
												{excursion.vehicleCategory.maxPassengers}{" "}
												{t("excursions.passengers")}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col gap-1">
											<div className="flex items-center gap-1 text-sm">
												<ClockIcon className="size-3 text-muted-foreground" />
												<span>
													{formatDuration(excursion.includedDurationHours)}
												</span>
											</div>
											<div className="flex items-center gap-1 text-sm">
												<RulerIcon className="size-3 text-muted-foreground" />
												<span>
													{formatDistance(excursion.includedDistanceKm)}
												</span>
											</div>
										</div>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatPrice(excursion.price)}
									</TableCell>
									<TableCell>
										<Badge
											variant={excursion.isActive ? "default" : "secondary"}
										>
											{excursion.isActive
												? t("common.active")
												: t("common.inactive")}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											{onAssignPartners && (
												<Button
													variant="ghost"
													size="icon"
													onClick={() => onAssignPartners(excursion)}
													title={t("routes.partnerAssignment.assignButton")}
												>
													<UsersIcon className="size-4" />
												</Button>
											)}
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onEdit(excursion)}
												title={t("common.edit")}
											>
												<EditIcon className="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onDelete(excursion)}
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
						{t("excursions.pagination.showing", {
							count: excursions.length,
							total,
						})}
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
							{t("excursions.pagination.page", { page, totalPages })}
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
