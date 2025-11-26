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
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import {
	CarIcon,
	ChevronLeftIcon,
	ChevronRightIcon,
	Loader2Icon,
	PlusIcon,
	SearchIcon,
	TruckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type {
	VehicleWithRelations,
	VehiclesResponse,
	VehicleStatus,
	VehicleRegulatoryCategory,
} from "../types";

interface VehiclesTableProps {
	onAddVehicle: () => void;
	onEditVehicle: (vehicle: VehicleWithRelations) => void;
}

const statusColors: Record<VehicleStatus, "default" | "secondary" | "destructive"> = {
	ACTIVE: "default",
	MAINTENANCE: "secondary",
	OUT_OF_SERVICE: "destructive",
};

export function VehiclesTable({ onAddVehicle, onEditVehicle }: VehiclesTableProps) {
	const t = useTranslations();
	const { isSessionSynced } = useActiveOrganization();
	const [search, setSearch] = useState("");
	const [statusFilter, setStatusFilter] = useState<VehicleStatus | "ALL">("ALL");
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, error } = useQuery({
		queryKey: ["vehicles", { search, statusFilter, page, limit }],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});
			if (statusFilter !== "ALL") {
				params.set("status", statusFilter);
			}
			const response = await apiClient.vtc.vehicles.$get({
				query: Object.fromEntries(params),
			});
			if (!response.ok) {
				throw new Error("Failed to fetch vehicles");
			}
			return response.json() as Promise<VehiclesResponse>;
		},
		enabled: isSessionSynced,
	});

	const handleSearch = (value: string) => {
		setSearch(value);
		setPage(1);
	};

	const handleStatusChange = (value: string) => {
		setStatusFilter(value as VehicleStatus | "ALL");
		setPage(1);
	};

	const getRegulatoryIcon = (category: VehicleRegulatoryCategory) => {
		return category === "HEAVY" ? (
			<TruckIcon className="size-4" />
		) : (
			<CarIcon className="size-4" />
		);
	};

	return (
		<div className="space-y-4">
			{/* Header with search, filters, and add button */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-4 flex-1">
					<div className="relative flex-1 max-w-sm">
						<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={t("fleet.vehicles.search")}
							value={search}
							onChange={(e) => handleSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select value={statusFilter} onValueChange={handleStatusChange}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder={t("fleet.vehicles.filterByStatus")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">{t("fleet.vehicles.allStatuses")}</SelectItem>
							<SelectItem value="ACTIVE">{t("fleet.vehicles.status.active")}</SelectItem>
							<SelectItem value="MAINTENANCE">{t("fleet.vehicles.status.maintenance")}</SelectItem>
							<SelectItem value="OUT_OF_SERVICE">{t("fleet.vehicles.status.outOfService")}</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button onClick={onAddVehicle}>
					<PlusIcon className="size-4 mr-2" />
					{t("fleet.vehicles.addVehicle")}
				</Button>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
				</div>
			) : error ? (
				<div className="text-center py-12 text-destructive">
					{t("fleet.vehicles.loadError")}
				</div>
			) : (
				<>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("fleet.vehicles.columns.vehicle")}</TableHead>
									<TableHead>{t("fleet.vehicles.columns.registration")}</TableHead>
									<TableHead>{t("fleet.vehicles.columns.category")}</TableHead>
									<TableHead>{t("fleet.vehicles.columns.status")}</TableHead>
									<TableHead>{t("fleet.vehicles.columns.base")}</TableHead>
									<TableHead className="text-center">{t("fleet.vehicles.columns.seats")}</TableHead>
									<TableHead className="text-center">{t("fleet.vehicles.columns.luggage")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data?.data.length === 0 ? (
									<TableRow>
										<TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
											{search ? t("fleet.vehicles.noResults") : t("fleet.vehicles.empty")}
										</TableCell>
									</TableRow>
								) : (
									data?.data.map((vehicle) => (
										<TableRow
											key={vehicle.id}
											className="cursor-pointer"
											onClick={() => onEditVehicle(vehicle)}
										>
											<TableCell className="font-medium">
												<div className="flex items-center gap-2">
													{getRegulatoryIcon(vehicle.vehicleCategory.regulatoryCategory)}
													<span>{vehicle.internalName || vehicle.registrationNumber}</span>
												</div>
											</TableCell>
											<TableCell className="font-mono text-sm">
												{vehicle.registrationNumber}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-2">
													<Badge variant="outline">
														{vehicle.vehicleCategory.name}
													</Badge>
													<Badge
														variant={
															vehicle.vehicleCategory.regulatoryCategory === "HEAVY"
																? "secondary"
																: "default"
														}
													>
														{vehicle.vehicleCategory.regulatoryCategory}
													</Badge>
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={statusColors[vehicle.status]}>
													{t(`fleet.vehicles.status.${vehicle.status.toLowerCase()}`)}
												</Badge>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{vehicle.operatingBase.name}
											</TableCell>
											<TableCell className="text-center">
												{vehicle.passengerCapacity}
											</TableCell>
											<TableCell className="text-center">
												{vehicle.luggageCapacity ?? "-"}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					{/* Pagination */}
					{data && data.meta.totalPages > 1 && (
						<div className="flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								{t("fleet.vehicles.pagination.showing", {
									from: (page - 1) * limit + 1,
									to: Math.min(page * limit, data.meta.total),
									total: data.meta.total,
								})}
							</p>
							<div className="flex items-center gap-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.max(1, p - 1))}
									disabled={page === 1}
								>
									<ChevronLeftIcon className="size-4" />
								</Button>
								<span className="text-sm">
									{t("fleet.vehicles.pagination.page", {
										current: page,
										total: data.meta.totalPages,
									})}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
									disabled={page === data.meta.totalPages}
								>
									<ChevronRightIcon className="size-4" />
								</Button>
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
