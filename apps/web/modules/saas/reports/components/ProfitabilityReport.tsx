"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import { ReportSummaryCards } from "./ReportSummaryCards";
import { ReportFilters } from "./ReportFilters";
import { ProfitabilityReportTable } from "./ProfitabilityReportTable";
import { useProfitabilityReport } from "../hooks/useProfitabilityReport";
import type { ReportFilters as Filters } from "../types";

/**
 * ProfitabilityReport Component
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 *
 * Main report component with filters, summary cards, and data table.
 */

export function ProfitabilityReport() {
	const t = useTranslations("reports");

	const [filters, setFilters] = useState<Filters>({
		groupBy: "none",
		profitabilityLevel: "all",
	});

	const { data, isLoading } = useProfitabilityReport({ filters });

	return (
		<div className="space-y-6">
			{/* Summary Cards */}
			<ReportSummaryCards summary={data?.summary ?? null} isLoading={isLoading} />

			{/* Report Card */}
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle>{t("profitabilityReport.title")}</CardTitle>
							<CardDescription>{t("profitabilityReport.description")}</CardDescription>
						</div>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{/* Filters */}
					<ReportFilters filters={filters} onFiltersChange={setFilters} />

					{/* Table */}
					<ProfitabilityReportTable
						data={data?.data ?? []}
						groupBy={filters.groupBy}
						isLoading={isLoading}
					/>
				</CardContent>
			</Card>
		</div>
	);
}
