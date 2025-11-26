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
	ArrowLeftRightIcon,
	ArrowRightIcon,
	EditIcon,
	Loader2Icon,
	SearchIcon,
	Trash2Icon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { PricingZone, RouteDirection, VehicleCategory, ZoneRoute } from "../types";

interface RoutesTableProps {
	routes: ZoneRoute[];
	zones: PricingZone[];
	vehicleCategories: VehicleCategory[];
	isLoading?: boolean;
	onEdit: (route: ZoneRoute) => void;
	onDelete: (route: ZoneRoute) => void;
	// Filters
	search: string;
	onSearchChange: (search: string) => void;
	fromZoneId: string;
	onFromZoneIdChange: (zoneId: string) => void;
	toZoneId: string;
	onToZoneIdChange: (zoneId: string) => void;
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

const DirectionIcon = ({ direction }: { direction: RouteDirection }) => {
	switch (direction) {
		case "BIDIRECTIONAL":
			return <ArrowLeftRightIcon className="size-4" />;
		case "A_TO_B":
			return <ArrowRightIcon className="size-4" />;
		case "B_TO_A":
			return <ArrowRightIcon className="size-4 rotate-180" />;
	}
};

export function RoutesTable({
	routes,
	zones,
	vehicleCategories,
	isLoading = false,
	onEdit,
	onDelete,
	search,
	onSearchChange,
	fromZoneId,
	onFromZoneIdChange,
	toZoneId,
	onToZoneIdChange,
	vehicleCategoryId,
	onVehicleCategoryIdChange,
	statusFilter,
	onStatusFilterChange,
	page,
	totalPages,
	total,
	onPageChange,
}: RoutesTableProps) {
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

	const getDirectionLabel = (direction: RouteDirection) => {
		switch (direction) {
			case "BIDIRECTIONAL":
				return t("routes.direction.bidirectional");
			case "A_TO_B":
				return t("routes.direction.aToB");
			case "B_TO_A":
				return t("routes.direction.bToA");
		}
	};

	return (
		<div className="space-y-4">
			{/* Filters */}
			<div className="flex flex-wrap gap-3">
				{/* Search */}
				<div className="relative flex-1 min-w-[200px]">
					<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
					<Input
						placeholder={t("routes.searchPlaceholder")}
						value={search}
						onChange={(e) => onSearchChange(e.target.value)}
						className="pl-9"
					/>
				</div>

				{/* From Zone Filter */}
				<Select value={fromZoneId} onValueChange={onFromZoneIdChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder={t("routes.filters.fromZone")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("routes.filters.allZones")}</SelectItem>
						{sortedZones.map((zone) => (
							<SelectItem key={zone.id} value={zone.id}>
								{zone.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* To Zone Filter */}
				<Select value={toZoneId} onValueChange={onToZoneIdChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder={t("routes.filters.toZone")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("routes.filters.allZones")}</SelectItem>
						{sortedZones.map((zone) => (
							<SelectItem key={zone.id} value={zone.id}>
								{zone.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{/* Vehicle Category Filter */}
				<Select value={vehicleCategoryId} onValueChange={onVehicleCategoryIdChange}>
					<SelectTrigger className="w-[180px]">
						<SelectValue placeholder={t("routes.filters.vehicleCategory")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("routes.filters.allCategories")}</SelectItem>
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
						<SelectValue placeholder={t("routes.filters.status")} />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">{t("routes.filters.allStatus")}</SelectItem>
						<SelectItem value="active">{t("routes.filters.active")}</SelectItem>
						<SelectItem value="inactive">{t("routes.filters.inactive")}</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Table */}
			<div className="rounded-md border">
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{t("routes.table.fromZone")}</TableHead>
							<TableHead>{t("routes.table.toZone")}</TableHead>
							<TableHead>{t("routes.table.vehicleCategory")}</TableHead>
							<TableHead>{t("routes.table.direction")}</TableHead>
							<TableHead className="text-right">{t("routes.table.fixedPrice")}</TableHead>
							<TableHead>{t("routes.table.status")}</TableHead>
							<TableHead className="w-[100px]">{t("routes.table.actions")}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{isLoading ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center">
									<Loader2Icon className="mx-auto size-6 animate-spin text-muted-foreground" />
								</TableCell>
							</TableRow>
						) : routes.length === 0 ? (
							<TableRow>
								<TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
									{t("routes.noRoutes")}
								</TableCell>
							</TableRow>
						) : (
							routes.map((route) => (
								<TableRow key={route.id}>
									<TableCell>
										<div className="flex flex-col">
											<span className="font-medium">{route.fromZone.name}</span>
											<span className="text-xs text-muted-foreground">
												{route.fromZone.code}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span className="font-medium">{route.toZone.name}</span>
											<span className="text-xs text-muted-foreground">
												{route.toZone.code}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex flex-col">
											<span>{route.vehicleCategory.name}</span>
											<span className="text-xs text-muted-foreground">
												{route.vehicleCategory.maxPassengers} {t("routes.passengers")}
											</span>
										</div>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-2">
											<DirectionIcon direction={route.direction} />
											<span className="text-sm">{getDirectionLabel(route.direction)}</span>
										</div>
									</TableCell>
									<TableCell className="text-right font-medium">
										{formatPrice(route.fixedPrice)}
									</TableCell>
									<TableCell>
										<Badge variant={route.isActive ? "default" : "secondary"}>
											{route.isActive ? t("common.active") : t("common.inactive")}
										</Badge>
									</TableCell>
									<TableCell>
										<div className="flex items-center gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onEdit(route)}
												title={t("common.edit")}
											>
												<EditIcon className="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												onClick={() => onDelete(route)}
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
					<p className="text-sm text-muted-foreground">
						{t("routes.pagination.showing", { count: routes.length, total })}
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
							{t("routes.pagination.page", { page, totalPages })}
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
