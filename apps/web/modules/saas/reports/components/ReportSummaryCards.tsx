"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from "lucide-react";
import { cn } from "@ui/lib";
import type { ProfitabilityReportSummary } from "../types";

/**
 * ReportSummaryCards Component
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 *
 * Displays summary cards for key profitability metrics.
 */

interface ReportSummaryCardsProps {
	summary: ProfitabilityReportSummary | null;
	isLoading?: boolean;
	className?: string;
}

function formatCurrency(value: number): string {
	return new Intl.NumberFormat("fr-FR", {
		style: "currency",
		currency: "EUR",
		minimumFractionDigits: 0,
		maximumFractionDigits: 0,
	}).format(value);
}

function SummaryCardSkeleton() {
	return (
		<Card>
			<CardHeader className="pb-2">
				<Skeleton className="h-4 w-24" />
			</CardHeader>
			<CardContent>
				<Skeleton className="h-8 w-32" />
			</CardContent>
		</Card>
	);
}

export function ReportSummaryCards({
	summary,
	isLoading,
	className,
}: ReportSummaryCardsProps) {
	const t = useTranslations("reports.summary");

	if (isLoading) {
		return (
			<div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
				<SummaryCardSkeleton />
				<SummaryCardSkeleton />
				<SummaryCardSkeleton />
				<SummaryCardSkeleton />
			</div>
		);
	}

	if (!summary) {
		return null;
	}

	const marginColor =
		summary.avgMarginPercent >= 20
			? "text-green-600"
			: summary.avgMarginPercent >= 0
				? "text-orange-600"
				: "text-red-600";

	return (
		<div className={cn("grid gap-4 md:grid-cols-2 lg:grid-cols-4", className)}>
			{/* Total Revenue */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">{t("totalRevenue")}</CardTitle>
					<DollarSign className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{formatCurrency(summary.totalRevenue)}</div>
					<p className="text-xs text-muted-foreground">
						{t("fromQuotes", { count: summary.totalCount })}
					</p>
				</CardContent>
			</Card>

			{/* Total Cost */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">{t("totalCost")}</CardTitle>
					<TrendingDown className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className="text-2xl font-bold">{formatCurrency(summary.totalCost)}</div>
					<p className="text-xs text-muted-foreground">{t("internalCosts")}</p>
				</CardContent>
			</Card>

			{/* Average Margin */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">{t("avgMargin")}</CardTitle>
					<TrendingUp className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className={cn("text-2xl font-bold", marginColor)}>
						{summary.avgMarginPercent.toFixed(1)}%
					</div>
					<p className="text-xs text-muted-foreground">{t("averageMargin")}</p>
				</CardContent>
			</Card>

			{/* Loss Count */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">{t("lossCount")}</CardTitle>
					<AlertTriangle className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					<div className={cn("text-2xl font-bold", summary.lossCount > 0 && "text-red-600")}>
						{summary.lossCount}
					</div>
					<p className="text-xs text-muted-foreground">
						{t("lossPercentage", {
							percent:
								summary.totalCount > 0
									? ((summary.lossCount / summary.totalCount) * 100).toFixed(1)
									: 0,
						})}
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
