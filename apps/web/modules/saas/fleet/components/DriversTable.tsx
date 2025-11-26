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
	ChevronLeftIcon,
	ChevronRightIcon,
	Loader2Icon,
	PlusIcon,
	SearchIcon,
	ShieldCheckIcon,
	UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { DriverWithLicenses, DriversResponse, DriverEmploymentStatus } from "../types";

interface DriversTableProps {
	onAddDriver: () => void;
	onEditDriver: (driver: DriverWithLicenses) => void;
}

const employmentStatusColors: Record<DriverEmploymentStatus, "default" | "secondary" | "outline"> = {
	EMPLOYEE: "default",
	CONTRACTOR: "secondary",
	FREELANCE: "outline",
};

export function DriversTable({ onAddDriver, onEditDriver }: DriversTableProps) {
	const t = useTranslations();
	const { isSessionSynced } = useActiveOrganization();
	const [search, setSearch] = useState("");
	const [activeFilter, setActiveFilter] = useState<"ALL" | "true" | "false">("ALL");
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, error } = useQuery({
		queryKey: ["drivers", { search, activeFilter, page, limit }],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});
			if (search) {
				params.set("search", search);
			}
			if (activeFilter !== "ALL") {
				params.set("isActive", activeFilter);
			}
			const response = await apiClient.vtc.drivers.$get({
				query: Object.fromEntries(params),
			});
			if (!response.ok) {
				throw new Error("Failed to fetch drivers");
			}
			return response.json() as Promise<DriversResponse>;
		},
		enabled: isSessionSynced,
	});

	const handleSearch = (value: string) => {
		setSearch(value);
		setPage(1);
	};

	const handleActiveChange = (value: string) => {
		setActiveFilter(value as "ALL" | "true" | "false");
		setPage(1);
	};

	const getFullName = (driver: DriverWithLicenses) => {
		return `${driver.firstName} ${driver.lastName}`;
	};

	const formatHourlyCost = (cost: string | null) => {
		if (!cost) return "-";
		return `${parseFloat(cost).toFixed(2)} €/h`;
	};

	return (
		<div className="space-y-4">
			{/* Header with search, filters, and add button */}
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-4 flex-1">
					<div className="relative flex-1 max-w-sm">
						<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
						<Input
							placeholder={t("fleet.drivers.search")}
							value={search}
							onChange={(e) => handleSearch(e.target.value)}
							className="pl-9"
						/>
					</div>
					<Select value={activeFilter} onValueChange={handleActiveChange}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder={t("fleet.drivers.filterByStatus")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ALL">{t("fleet.drivers.allDrivers")}</SelectItem>
							<SelectItem value="true">{t("fleet.drivers.status.active")}</SelectItem>
							<SelectItem value="false">{t("fleet.drivers.status.inactive")}</SelectItem>
						</SelectContent>
					</Select>
				</div>
				<Button onClick={onAddDriver}>
					<PlusIcon className="size-4 mr-2" />
					{t("fleet.drivers.addDriver")}
				</Button>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
				</div>
			) : error ? (
				<div className="text-center py-12 text-destructive">
					{t("fleet.drivers.loadError")}
				</div>
			) : (
				<>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("fleet.drivers.columns.name")}</TableHead>
									<TableHead>{t("fleet.drivers.columns.licenses")}</TableHead>
									<TableHead>{t("fleet.drivers.columns.employmentStatus")}</TableHead>
									<TableHead>{t("fleet.drivers.columns.hourlyCost")}</TableHead>
									<TableHead>{t("fleet.drivers.columns.contact")}</TableHead>
									<TableHead>{t("fleet.drivers.columns.status")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data?.data.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
											{search ? t("fleet.drivers.noResults") : t("fleet.drivers.empty")}
										</TableCell>
									</TableRow>
								) : (
									data?.data.map((driver) => (
										<TableRow
											key={driver.id}
											className="cursor-pointer"
											onClick={() => onEditDriver(driver)}
										>
											<TableCell className="font-medium">
												<div className="flex items-center gap-2">
													<UserIcon className="size-4 text-muted-foreground" />
													<span>{getFullName(driver)}</span>
												</div>
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-1 flex-wrap">
													{driver.driverLicenses.length === 0 ? (
														<span className="text-muted-foreground text-sm">
															{t("fleet.drivers.noLicenses")}
														</span>
													) : (
														driver.driverLicenses.map((license) => (
															<Badge
																key={license.id}
																variant="outline"
																className="flex items-center gap-1"
															>
																<ShieldCheckIcon className="size-3" />
																{license.licenseCategory.code}
															</Badge>
														))
													)}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={employmentStatusColors[driver.employmentStatus]}>
													{t(`fleet.drivers.employmentStatus.${driver.employmentStatus.toLowerCase()}`)}
												</Badge>
											</TableCell>
											<TableCell className="font-mono text-sm">
												{formatHourlyCost(driver.hourlyCost)}
											</TableCell>
											<TableCell className="text-muted-foreground text-sm">
												<div className="flex flex-col">
													{driver.email && <span>{driver.email}</span>}
													{driver.phone && <span>{driver.phone}</span>}
													{!driver.email && !driver.phone && <span>-</span>}
												</div>
											</TableCell>
											<TableCell>
												<Badge variant={driver.isActive ? "default" : "secondary"}>
													{driver.isActive
														? t("fleet.drivers.status.active")
														: t("fleet.drivers.status.inactive")}
												</Badge>
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
								{t("fleet.drivers.pagination.showing", {
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
									{t("fleet.drivers.pagination.page", {
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
