"use client";

/**
 * Seasonal Multiplier Summary Cards
 * Story 9.1: Settings → Pricing – Seasonal Multipliers
 *
 * Displays summary statistics: Currently Active, Upcoming, Total
 */

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { Calendar, CheckCircle2, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import type { SeasonalMultiplierStats } from "../types/seasonal-multiplier";

interface SeasonalMultiplierSummaryCardsProps {
	stats: SeasonalMultiplierStats | undefined;
	isLoading: boolean;
}

export function SeasonalMultiplierSummaryCards({
	stats,
	isLoading,
}: SeasonalMultiplierSummaryCardsProps) {
	const t = useTranslations("settings.pricing.seasonalMultipliers");

	const cards = [
		{
			title: t("stats.currentlyActive"),
			value: stats?.currentlyActive ?? 0,
			icon: CheckCircle2,
			iconColor: "text-green-500",
			bgColor: "bg-green-50 dark:bg-green-950",
			testId: "stats-active",
		},
		{
			title: t("stats.upcoming"),
			value: stats?.upcoming ?? 0,
			icon: Calendar,
			iconColor: "text-blue-500",
			bgColor: "bg-blue-50 dark:bg-blue-950",
			testId: "stats-upcoming",
		},
		{
			title: t("stats.total"),
			value: stats?.total ?? 0,
			icon: Settings,
			iconColor: "text-gray-500",
			bgColor: "bg-gray-50 dark:bg-gray-900",
			testId: "stats-total",
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-3">
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
