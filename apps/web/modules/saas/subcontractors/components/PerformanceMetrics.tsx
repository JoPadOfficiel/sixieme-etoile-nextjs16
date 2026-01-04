"use client";

/**
 * PerformanceMetrics Component
 * Story 22.10: Advanced Subcontracting Workflow
 *
 * Displays performance metrics for a subcontractor including:
 * - Total missions and success rate
 * - Average ratings
 * - Reliability score
 * - Recent missions list
 */

import { useTranslations } from "next-intl";
import { Star, TrendingUp, CheckCircle, Clock, Truck, MessageSquare } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Progress } from "@ui/components/progress";
import { Skeleton } from "@ui/components/skeleton";
import { useSubcontractorPerformance } from "../../dispatch/hooks/useSubcontracting";

interface PerformanceMetricsProps {
	subcontractorId: string;
}

export function PerformanceMetrics({ subcontractorId }: PerformanceMetricsProps) {
	const t = useTranslations("subcontractors");
	const { data, isLoading, error } = useSubcontractorPerformance(subcontractorId);

	if (isLoading) {
		return <PerformanceMetricsSkeleton />;
	}

	if (error || !data?.performance) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>{t("performance.title")}</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">
						{t("performance.noData")}
					</p>
				</CardContent>
			</Card>
		);
	}

	const { performance } = data;

	return (
		<div className="space-y-4">
			{/* Overview Cards */}
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{/* Total Missions */}
				<Card>
					<CardContent className="pt-4">
						<div className="flex items-center gap-2">
							<Truck className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground text-sm">
								{t("performance.totalMissions")}
							</span>
						</div>
						<p className="mt-1 text-2xl font-bold">{performance.totalMissions}</p>
					</CardContent>
				</Card>

				{/* Success Rate */}
				<Card>
					<CardContent className="pt-4">
						<div className="flex items-center gap-2">
							<CheckCircle className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground text-sm">
								{t("performance.successRate")}
							</span>
						</div>
						<p className="mt-1 text-2xl font-bold">{performance.successRate}%</p>
					</CardContent>
				</Card>

				{/* Average Rating */}
				<Card>
					<CardContent className="pt-4">
						<div className="flex items-center gap-2">
							<Star className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground text-sm">
								{t("performance.averageRating")}
							</span>
						</div>
						<div className="mt-1 flex items-center gap-1">
							<p className="text-2xl font-bold">{performance.averageRating.toFixed(1)}</p>
							<span className="text-muted-foreground text-sm">/5</span>
						</div>
					</CardContent>
				</Card>

				{/* Reliability Score */}
				<Card>
					<CardContent className="pt-4">
						<div className="flex items-center gap-2">
							<TrendingUp className="h-4 w-4 text-muted-foreground" />
							<span className="text-muted-foreground text-sm">
								{t("performance.reliabilityScore")}
							</span>
						</div>
						<p className="mt-1 text-2xl font-bold">{performance.reliabilityScore}</p>
						<Progress value={performance.reliabilityScore} className="mt-2 h-1" />
					</CardContent>
				</Card>
			</div>

			{/* Detailed Ratings */}
			<Card>
				<CardHeader>
					<CardTitle className="text-base">{t("performance.detailedRatings")}</CardTitle>
					<CardDescription>{t("performance.detailedRatingsDescription")}</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						<RatingItem
							icon={<Clock className="h-4 w-4" />}
							label={t("performance.punctuality")}
							value={performance.averagePunctuality}
						/>
						<RatingItem
							icon={<Truck className="h-4 w-4" />}
							label={t("performance.vehicleCondition")}
							value={performance.averageVehicleCondition}
						/>
						<RatingItem
							icon={<Star className="h-4 w-4" />}
							label={t("performance.professionalism")}
							value={performance.averageDriverProfessionalism}
						/>
						<RatingItem
							icon={<MessageSquare className="h-4 w-4" />}
							label={t("performance.communication")}
							value={performance.averageCommunication}
						/>
					</div>
				</CardContent>
			</Card>

			{/* Recent Missions */}
			{performance.recentMissions.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">{t("performance.recentMissions")}</CardTitle>
						<CardDescription>
							{t("performance.recentMissionsDescription", {
								count: performance.recentMissions.length,
							})}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							{performance.recentMissions.map((mission) => (
								<div
									key={mission.id}
									className="flex items-center justify-between rounded-lg border p-3"
								>
									<div className="flex-1">
										<p className="text-sm font-medium">
											{mission.pickupAddress} → {mission.dropoffAddress}
										</p>
										<p className="text-muted-foreground text-xs">
											{new Date(mission.pickupAt).toLocaleDateString()}
										</p>
									</div>
									<div className="flex items-center gap-2">
										<Badge variant={mission.status === "ACCEPTED" ? "default" : "secondary"}>
											{mission.status}
										</Badge>
										{mission.hasFeedback && mission.rating && (
											<div className="flex items-center gap-1">
												<Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
												<span className="text-sm">{mission.rating}</span>
											</div>
										)}
										<span className="font-medium">€{mission.subcontractedPrice}</span>
									</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function RatingItem({
	icon,
	label,
	value,
}: {
	icon: React.ReactNode;
	label: string;
	value: number | null;
}) {
	return (
		<div className="flex flex-col gap-1">
			<div className="text-muted-foreground flex items-center gap-2 text-sm">
				{icon}
				{label}
			</div>
			{value !== null ? (
				<div className="flex items-center gap-1">
					{[1, 2, 3, 4, 5].map((star) => (
						<Star
							key={star}
							className={`h-4 w-4 ${
								star <= value
									? "fill-yellow-400 text-yellow-400"
									: "text-muted-foreground"
							}`}
						/>
					))}
					<span className="ml-1 text-sm font-medium">{value.toFixed(1)}</span>
				</div>
			) : (
				<span className="text-muted-foreground text-sm">-</span>
			)}
		</div>
	);
}

function PerformanceMetricsSkeleton() {
	return (
		<div className="space-y-4">
			<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<Card key={i}>
						<CardContent className="pt-4">
							<Skeleton className="h-4 w-24" />
							<Skeleton className="mt-2 h-8 w-16" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardHeader>
					<Skeleton className="h-5 w-32" />
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 gap-4 md:grid-cols-4">
						{[1, 2, 3, 4].map((i) => (
							<div key={i} className="space-y-2">
								<Skeleton className="h-4 w-20" />
								<Skeleton className="h-4 w-24" />
							</div>
						))}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}

export default PerformanceMetrics;
