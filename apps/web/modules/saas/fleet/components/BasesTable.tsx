"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
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
	MapPinIcon,
	PlusIcon,
	SearchIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { OperatingBaseWithCount, BasesResponse } from "../types";

interface BasesTableProps {
	onAddBase: () => void;
	onEditBase: (base: OperatingBaseWithCount) => void;
}

export function BasesTable({ onAddBase, onEditBase }: BasesTableProps) {
	const t = useTranslations();
	const { isSessionSynced } = useActiveOrganization();
	const [search, setSearch] = useState("");
	const [page, setPage] = useState(1);
	const limit = 10;

	const { data, isLoading, error } = useQuery({
		queryKey: ["bases", { search, page, limit }],
		queryFn: async () => {
			const params = new URLSearchParams({
				page: page.toString(),
				limit: limit.toString(),
			});
			if (search) {
				params.set("search", search);
			}
			const response = await apiClient.vtc.bases.$get({
				query: Object.fromEntries(params),
			});
			if (!response.ok) {
				throw new Error("Failed to fetch bases");
			}
			return response.json() as Promise<BasesResponse>;
		},
		enabled: isSessionSynced,
	});

	const handleSearch = (value: string) => {
		setSearch(value);
		setPage(1);
	};

	return (
		<div className="space-y-4">
			{/* Header with search and add button */}
			<div className="flex items-center justify-between gap-4">
				<div className="relative flex-1 max-w-sm">
					<SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
					<Input
						placeholder={t("fleet.bases.search")}
						value={search}
						onChange={(e) => handleSearch(e.target.value)}
						className="pl-9"
					/>
				</div>
				<Button onClick={onAddBase}>
					<PlusIcon className="size-4 mr-2" />
					{t("fleet.bases.addBase")}
				</Button>
			</div>

			{/* Table */}
			{isLoading ? (
				<div className="flex items-center justify-center py-12">
					<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
				</div>
			) : error ? (
				<div className="text-center py-12 text-destructive">
					{t("fleet.bases.loadError")}
				</div>
			) : (
				<>
					<div className="rounded-md border">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>{t("fleet.bases.columns.name")}</TableHead>
									<TableHead>{t("fleet.bases.columns.address")}</TableHead>
									<TableHead>{t("fleet.bases.columns.city")}</TableHead>
									<TableHead>{t("fleet.bases.columns.postalCode")}</TableHead>
									<TableHead className="text-center">{t("fleet.bases.columns.vehicles")}</TableHead>
									<TableHead>{t("fleet.bases.columns.status")}</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data?.data.length === 0 ? (
									<TableRow>
										<TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
											{search ? t("fleet.bases.noResults") : t("fleet.bases.empty")}
										</TableCell>
									</TableRow>
								) : (
									data?.data.map((base) => (
										<TableRow
											key={base.id}
											className="cursor-pointer"
											onClick={() => onEditBase(base)}
										>
											<TableCell className="font-medium">
												<div className="flex items-center gap-2">
													<MapPinIcon className="size-4 text-muted-foreground" />
													<span>{base.name}</span>
												</div>
											</TableCell>
											<TableCell className="text-muted-foreground">
												{base.addressLine1}
											</TableCell>
											<TableCell>{base.city}</TableCell>
											<TableCell className="font-mono text-sm">
												{base.postalCode}
											</TableCell>
											<TableCell className="text-center">
												<Badge variant="outline" className="gap-1">
													<CarIcon className="size-3" />
													{base._count.vehicles}
												</Badge>
											</TableCell>
											<TableCell>
												<Badge variant={base.isActive ? "default" : "secondary"}>
													{base.isActive
														? t("fleet.bases.status.active")
														: t("fleet.bases.status.inactive")}
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
								{t("fleet.bases.pagination.showing", {
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
									{t("fleet.bases.pagination.page", {
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
