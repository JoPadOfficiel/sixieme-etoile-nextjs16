"use client";

import { useTranslations } from "next-intl";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import { TrendingUp, TrendingDown, AlertTriangle, FileText } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@ui/lib";
import type { ProfitabilityReportRow, GroupBy } from "../types";

/**
 * ProfitabilityReportTable Component
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 *
 * Displays profitability data in a table format.
 */

interface ProfitabilityReportTableProps {
	data: ProfitabilityReportRow[];
	groupBy: GroupBy;
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

function ProfitabilityBadge({ level }: { level: "green" | "orange" | "red" }) {
	const config = {
		green: {
			Icon: TrendingUp,
			className: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
		},
		orange: {
			Icon: AlertTriangle,
			className: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
		},
		red: {
			Icon: TrendingDown,
			className: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
		},
	}[level];

	return (
		<Badge variant="outline" className={cn("p-1", config.className)}>
			<config.Icon className="size-3.5" />
		</Badge>
	);
}

function TableSkeleton() {
	return (
		<div className="space-y-2">
			{Array.from({ length: 5 }).map((_, i) => (
				<Skeleton key={i} className="h-12 w-full" />
			))}
		</div>
	);
}

function EmptyState() {
	const t = useTranslations("reports");

	return (
		<div className="flex flex-col items-center justify-center py-12 text-center">
			<FileText className="h-12 w-12 text-muted-foreground mb-4" />
			<h3 className="text-lg font-medium">{t("empty.title")}</h3>
			<p className="text-sm text-muted-foreground mt-1">{t("empty.description")}</p>
		</div>
	);
}

export function ProfitabilityReportTable({
	data,
	groupBy,
	isLoading,
	className,
}: ProfitabilityReportTableProps) {
	const t = useTranslations("reports.table");

	if (isLoading) {
		return <TableSkeleton />;
	}

	if (data.length === 0) {
		return <EmptyState />;
	}

	const isGrouped = groupBy !== "none";

	return (
		<div className={cn("rounded-md border", className)}>
			<Table>
				<TableHeader>
					<TableRow>
						{isGrouped ? (
							<>
								<TableHead>{t("columns.group")}</TableHead>
								<TableHead className="text-right">{t("columns.count")}</TableHead>
							</>
						) : (
							<>
								<TableHead>{t("columns.date")}</TableHead>
								<TableHead>{t("columns.client")}</TableHead>
								<TableHead>{t("columns.vehicleCategory")}</TableHead>
							</>
						)}
						<TableHead className="text-right">{t("columns.revenue")}</TableHead>
						<TableHead className="text-right">{t("columns.cost")}</TableHead>
						<TableHead className="text-right">{t("columns.margin")}</TableHead>
						<TableHead className="text-center">{t("columns.status")}</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					{data.map((row) => (
						<TableRow key={row.id}>
							{isGrouped ? (
								<>
									<TableCell className="font-medium">
										{row.groupLabel || row.groupKey || "-"}
									</TableCell>
									<TableCell className="text-right">{row.count}</TableCell>
								</>
							) : (
								<>
									<TableCell>
										{row.pickupAt ? format(new Date(row.pickupAt), "dd/MM/yyyy") : "-"}
									</TableCell>
									<TableCell>{row.contactName || "-"}</TableCell>
									<TableCell>{row.vehicleCategory || "-"}</TableCell>
								</>
							)}
							<TableCell className="text-right font-medium">
								{formatCurrency(row.revenue)}
							</TableCell>
							<TableCell className="text-right text-muted-foreground">
								{formatCurrency(row.cost)}
							</TableCell>
							<TableCell
								className={cn(
									"text-right font-medium",
									row.profitabilityLevel === "green" && "text-green-600",
									row.profitabilityLevel === "orange" && "text-orange-600",
									row.profitabilityLevel === "red" && "text-red-600"
								)}
							>
								{row.marginPercent.toFixed(1)}%
							</TableCell>
							<TableCell className="text-center">
								<ProfitabilityBadge level={row.profitabilityLevel} />
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
