"use client";

/**
 * Promotion Summary Cards
 * Story 9.4: Settings → Pricing – Promotions & Promo Codes
 *
 * Displays summary statistics: Active, Expired, Upcoming, Total Uses
 */

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { Tag, Calendar, Clock, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import type { PromotionStats } from "../types/promotion";

interface PromotionSummaryCardsProps {
	stats: PromotionStats | undefined;
	isLoading: boolean;
}

export function PromotionSummaryCards({
	stats,
	isLoading,
}: PromotionSummaryCardsProps) {
	const t = useTranslations("settings.pricing.promotions");

	const cards = [
		{
			title: t("stats.active"),
			value: stats?.active ?? 0,
			icon: Tag,
			iconColor: "text-green-500",
			bgColor: "bg-green-50 dark:bg-green-950",
			testId: "stats-active",
		},
		{
			title: t("stats.expired"),
			value: stats?.expired ?? 0,
			icon: Calendar,
			iconColor: "text-gray-500",
			bgColor: "bg-gray-50 dark:bg-gray-950",
			testId: "stats-expired",
		},
		{
			title: t("stats.upcoming"),
			value: stats?.upcoming ?? 0,
			icon: Clock,
			iconColor: "text-blue-500",
			bgColor: "bg-blue-50 dark:bg-blue-950",
			testId: "stats-upcoming",
		},
		{
			title: t("stats.totalUses"),
			value: stats?.totalUses ?? 0,
			icon: Users,
			iconColor: "text-purple-500",
			bgColor: "bg-purple-50 dark:bg-purple-950",
			testId: "stats-total-uses",
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
