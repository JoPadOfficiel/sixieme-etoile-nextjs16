"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Progress } from "@ui/components/progress";
import { Skeleton } from "@ui/components/skeleton";
import { MapIcon, RouteIcon, CheckCircleIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface CoverageStats {
	totalZones: number;
	activeZones: number;
	totalPossibleRoutes: number;
	configuredRoutes: number;
	activeRoutes: number;
	coveragePercent: number;
	byCategory: {
		[categoryId: string]: {
			categoryName: string;
			configured: number;
			active: number;
			total: number;
			coveragePercent: number;
		};
	};
}

interface CoverageStatsCardProps {
	stats: CoverageStats | null;
	isLoading: boolean;
}

export function CoverageStatsCard({ stats, isLoading }: CoverageStatsCardProps) {
	const t = useTranslations();

	if (isLoading) {
		return (
			<Card>
				<CardHeader className="pb-2">
					<Skeleton className="h-5 w-32" />
				</CardHeader>
				<CardContent className="space-y-4">
					<Skeleton className="h-4 w-full" />
					<Skeleton className="h-2 w-full" />
					<div className="grid grid-cols-3 gap-4">
						<Skeleton className="h-16" />
						<Skeleton className="h-16" />
						<Skeleton className="h-16" />
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!stats) {
		return null;
	}

	const coverageColor =
		stats.coveragePercent >= 50
			? "text-green-600"
			: stats.coveragePercent >= 25
				? "text-orange-500"
				: "text-red-500";

	return (
		<Card>
			<CardHeader className="pb-2">
				<CardTitle className="flex items-center gap-2 text-base">
					<RouteIcon className="size-4" />
					{t("routes.coverage.title")}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Summary line */}
				<p className="text-muted-foreground text-sm">
					{t("routes.coverage.summary", {
						configured: stats.configuredRoutes,
						active: stats.activeRoutes,
						zones: stats.activeZones,
						percent: stats.coveragePercent.toFixed(1),
					})}
				</p>

				{/* Progress bar */}
				<div className="space-y-1">
					<div className="flex justify-between text-sm">
						<span className="text-muted-foreground">
							{t("routes.coverage.coverageLabel")}
						</span>
						<span className={coverageColor}>
							{stats.coveragePercent.toFixed(1)}%
						</span>
					</div>
					<Progress value={stats.coveragePercent} className="h-2" />
				</div>

				{/* Stats grid */}
				<div className="grid grid-cols-3 gap-4">
					<div className="rounded-lg border p-3 text-center">
						<div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
							<MapIcon className="size-3" />
							{t("routes.coverage.zones")}
						</div>
						<div className="font-semibold text-2xl">{stats.activeZones}</div>
					</div>
					<div className="rounded-lg border p-3 text-center">
						<div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
							<RouteIcon className="size-3" />
							{t("routes.coverage.routes")}
						</div>
						<div className="font-semibold text-2xl">
							{stats.configuredRoutes}
						</div>
					</div>
					<div className="rounded-lg border p-3 text-center">
						<div className="flex items-center justify-center gap-1 text-muted-foreground text-xs">
							<CheckCircleIcon className="size-3" />
							{t("routes.coverage.active")}
						</div>
						<div className="font-semibold text-2xl">{stats.activeRoutes}</div>
					</div>
				</div>

				{/* Category breakdown */}
				{Object.keys(stats.byCategory).length > 0 && (
					<div className="space-y-2">
						<h4 className="font-medium text-sm">
							{t("routes.coverage.byCategory")}
						</h4>
						<div className="space-y-1">
							{Object.entries(stats.byCategory).map(([categoryId, cat]) => (
								<div
									key={categoryId}
									className="flex items-center justify-between text-sm"
								>
									<span className="text-muted-foreground">
										{cat.categoryName}
									</span>
									<span>
										{cat.configured} {t("routes.coverage.routesConfigured")} (
										{cat.coveragePercent.toFixed(1)}%)
									</span>
								</div>
							))}
						</div>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
