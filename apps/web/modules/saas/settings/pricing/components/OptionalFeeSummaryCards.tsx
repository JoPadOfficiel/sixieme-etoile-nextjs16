"use client";

/**
 * Optional Fee Summary Cards
 * Story 9.3: Settings → Pricing – Optional Fees Catalogue
 *
 * Displays summary statistics: Fixed Fees, Percentage Fees, Taxable, Total Active
 */

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { Euro, Percent, Receipt, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import type { OptionalFeeStats } from "../types/optional-fee";

interface OptionalFeeSummaryCardsProps {
	stats: OptionalFeeStats | undefined;
	isLoading: boolean;
}

export function OptionalFeeSummaryCards({
	stats,
	isLoading,
}: OptionalFeeSummaryCardsProps) {
	const t = useTranslations("settings.pricing.optionalFees");

	const cards = [
		{
			title: t("stats.fixed"),
			value: stats?.fixed ?? 0,
			icon: Euro,
			iconColor: "text-blue-500",
			bgColor: "bg-blue-50 dark:bg-blue-950",
			testId: "stats-fixed",
		},
		{
			title: t("stats.percentage"),
			value: stats?.percentage ?? 0,
			icon: Percent,
			iconColor: "text-purple-500",
			bgColor: "bg-purple-50 dark:bg-purple-950",
			testId: "stats-percentage",
		},
		{
			title: t("stats.taxable"),
			value: stats?.taxable ?? 0,
			icon: Receipt,
			iconColor: "text-amber-500",
			bgColor: "bg-amber-50 dark:bg-amber-950",
			testId: "stats-taxable",
		},
		{
			title: t("stats.totalActive"),
			value: stats?.totalActive ?? 0,
			icon: Settings,
			iconColor: "text-green-500",
			bgColor: "bg-green-50 dark:bg-green-950",
			testId: "stats-total",
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-4">
			{cards.map((card) => (
				<Card key={card.testId} data-testid={card.testId}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{card.title}</CardTitle>
						<div className={`rounded-full p-2 ${card.bgColor}`}>
							<card.icon className={`size-4 ${card.iconColor}`} />
						</div>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<Skeleton className="h-8 w-16" />
						) : (
							<div className="text-2xl font-bold">{card.value}</div>
						)}
					</CardContent>
				</Card>
			))}
		</div>
	);
}
