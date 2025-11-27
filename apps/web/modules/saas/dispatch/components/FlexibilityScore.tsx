"use client";

import { Badge } from "@ui/components/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import { Gauge } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { ScoreBreakdown } from "../types/assignment";

/**
 * FlexibilityScore Component
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 *
 * Displays the flexibility score (0-100) with color coding and breakdown tooltip.
 *
 * @see AC3: Flexibility Score Calculation
 */

interface FlexibilityScoreProps {
	score: number;
	breakdown: ScoreBreakdown;
	showLabel?: boolean;
	size?: "sm" | "md" | "lg";
	className?: string;
}

export function FlexibilityScore({
	score,
	breakdown,
	showLabel = false,
	size = "md",
	className,
}: FlexibilityScoreProps) {
	const t = useTranslations("dispatch.assignment.candidate.scoreBreakdown");

	const colorClass = getScoreColorClass(score);
	const bgClass = getScoreBgClass(score);

	const sizeClasses = {
		sm: "text-xs px-1.5 py-0.5",
		md: "text-sm px-2 py-1",
		lg: "text-base px-3 py-1.5",
	};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="outline"
						className={cn(
							"font-semibold cursor-help",
							colorClass,
							bgClass,
							sizeClasses[size],
							className,
						)}
						data-testid="flexibility-score"
					>
						<Gauge className={cn("mr-1", size === "sm" ? "size-3" : "size-4")} />
						{score}
						{showLabel && <span className="ml-1 font-normal">/100</span>}
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="top" className="w-64">
					<div className="space-y-2">
						<p className="font-semibold">{t("title")}</p>
						<div className="space-y-1.5">
							<ScoreRow
								label={t("licenses")}
								value={breakdown.licensesScore}
								max={25}
							/>
							<ScoreRow
								label={t("availability")}
								value={breakdown.availabilityScore}
								max={25}
							/>
							<ScoreRow
								label={t("distance")}
								value={breakdown.distanceScore}
								max={25}
							/>
							<ScoreRow
								label={t("rseCapacity")}
								value={breakdown.rseCapacityScore}
								max={25}
							/>
						</div>
						<div className="pt-1 border-t">
							<div className="flex justify-between font-semibold">
								<span>Total</span>
								<span>{score}/100</span>
							</div>
						</div>
					</div>
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

interface ScoreRowProps {
	label: string;
	value: number;
	max: number;
}

function ScoreRow({ label, value, max }: ScoreRowProps) {
	const percentage = (value / max) * 100;

	return (
		<div className="space-y-0.5">
			<div className="flex justify-between text-xs">
				<span className="text-muted-foreground">{label}</span>
				<span>{value.toFixed(1)}/{max}</span>
			</div>
			<div className="h-1.5 bg-muted rounded-full overflow-hidden">
				<div
					className={cn(
						"h-full rounded-full transition-all",
						percentage >= 70 ? "bg-green-500" : percentage >= 40 ? "bg-orange-500" : "bg-red-500",
					)}
					style={{ width: `${percentage}%` }}
				/>
			</div>
		</div>
	);
}

function getScoreColorClass(score: number): string {
	if (score >= 70) return "text-green-700 dark:text-green-400 border-green-500/50";
	if (score >= 40) return "text-orange-700 dark:text-orange-400 border-orange-500/50";
	return "text-red-700 dark:text-red-400 border-red-500/50";
}

function getScoreBgClass(score: number): string {
	if (score >= 70) return "bg-green-500/10";
	if (score >= 40) return "bg-orange-500/10";
	return "bg-red-500/10";
}

export default FlexibilityScore;
