"use client";

/**
 * Advanced Rate Summary Cards Component
 * Story 9.2: Settings → Pricing – Advanced Rate Modifiers
 * Story 11.7: Removed deprecated types (LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY)
 *
 * Displays summary statistics for advanced rate modifiers by type
 * Only NIGHT and WEEKEND types are supported
 */

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { Calendar, Moon, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import type { AdvancedRateStats } from "../types/advanced-rate";

interface AdvancedRateSummaryCardsProps {
	stats: AdvancedRateStats | undefined;
	isLoading: boolean;
}

export function AdvancedRateSummaryCards({
	stats,
	isLoading,
}: AdvancedRateSummaryCardsProps) {
	const t = useTranslations("settings.pricing.advancedRates");

	// Note: Only NIGHT and WEEKEND types supported (Story 11.7)
	// LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY removed - zone pricing handled by PricingZone.priceMultiplier
	const cards = [
		{
			key: "night",
			title: t("stats.night"),
			value: stats?.night ?? 0,
			icon: Moon,
			color: "text-indigo-600",
			bgColor: "bg-indigo-100 dark:bg-indigo-900/30",
		},
		{
			key: "weekend",
			title: t("stats.weekend"),
			value: stats?.weekend ?? 0,
			icon: Calendar,
			color: "text-purple-600",
			bgColor: "bg-purple-100 dark:bg-purple-900/30",
		},
		{
			key: "totalActive",
			title: t("stats.totalActive"),
			value: stats?.totalActive ?? 0,
			icon: Settings,
			color: "text-gray-600",
			bgColor: "bg-gray-100 dark:bg-gray-800",
		},
	];

	return (
		<div className="grid gap-4 md:grid-cols-3">
			{cards.map((card) => (
				<Card key={card.key} data-testid={`stats-${card.key}`}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="text-sm font-medium">{card.title}</CardTitle>
						<div className={`rounded-full p-2 ${card.bgColor}`}>
							<card.icon className={`h-4 w-4 ${card.color}`} />
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
