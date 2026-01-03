"use client";

/**
 * SubcontractorsPage Component
 * Story 22.4: Implement Complete Subcontracting System
 *
 * Main page for managing subcontractor profiles
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PlusIcon, Loader2Icon } from "lucide-react";
import { Button } from "@ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { useSubcontractors } from "@saas/dispatch/hooks/useSubcontracting";
import { SubcontractorsTable } from "./SubcontractorsTable";
import { CreateSubcontractorDialog } from "./CreateSubcontractorDialog";
import type { SubcontractorListItem } from "../types";

type StatusFilter = "all" | "active" | "inactive";

export function SubcontractorsPage() {
	const t = useTranslations("subcontractors");
	const [searchQuery, setSearchQuery] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

	const { data, isLoading, error } = useSubcontractors({
		includeInactive: statusFilter !== "active",
	});

	const subcontractors = data?.subcontractors ?? [];

	// Filter subcontractors based on search and status
	// Story 22.4: Refactored - Subcontractor is now an independent company entity
	const filteredSubcontractors = subcontractors.filter((sub) => {
		// Search filter
		const searchLower = searchQuery.toLowerCase();
		const matchesSearch =
			!searchQuery ||
			sub.companyName.toLowerCase().includes(searchLower) ||
			sub.contactName?.toLowerCase().includes(searchLower) ||
			sub.email?.toLowerCase().includes(searchLower);

		// Status filter
		const matchesStatus =
			statusFilter === "all" ||
			(statusFilter === "active" && sub.isActive) ||
			(statusFilter === "inactive" && !sub.isActive);

		return matchesSearch && matchesStatus;
	}) as SubcontractorListItem[];

	return (
		<div className="py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
				<p className="text-muted-foreground mt-2">{t("description")}</p>
			</div>

			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
					<div>
						<CardTitle>{t("title")}</CardTitle>
						<CardDescription>{t("description")}</CardDescription>
					</div>
					<Button onClick={() => setIsCreateDialogOpen(true)}>
						<PlusIcon className="size-4 mr-2" />
						{t("addSubcontractor")}
					</Button>
				</CardHeader>
				<CardContent>
					{/* Filters */}
					<div className="flex items-center gap-4 mb-6">
						<Input
							placeholder={t("table.searchPlaceholder") || "Search..."}
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="max-w-sm"
						/>
						<Select
							value={statusFilter}
							onValueChange={(value) => setStatusFilter(value as StatusFilter)}
						>
							<SelectTrigger className="w-[180px]">
								<SelectValue placeholder={t("filter.all")} />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">{t("filter.all")}</SelectItem>
								<SelectItem value="active">{t("filter.active")}</SelectItem>
								<SelectItem value="inactive">{t("filter.inactive")}</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Content */}
					{isLoading ? (
						<div className="flex items-center justify-center py-12">
							<Loader2Icon className="size-8 animate-spin text-muted-foreground" />
						</div>
					) : error ? (
						<div className="text-center py-12 text-destructive">
							{t("toast.error")}
						</div>
					) : (
						<SubcontractorsTable subcontractors={filteredSubcontractors} />
					)}
				</CardContent>
			</Card>

			{/* Create Dialog */}
			<CreateSubcontractorDialog
				isOpen={isCreateDialogOpen}
				onClose={() => setIsCreateDialogOpen(false)}
			/>
		</div>
	);
}
