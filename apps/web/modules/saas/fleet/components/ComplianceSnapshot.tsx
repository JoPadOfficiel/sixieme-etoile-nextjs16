"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Progress } from "@ui/components/progress";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import {
	ShieldCheck,
	AlertTriangle,
	XCircle,
	Clock,
	Timer,
	Coffee,
	Car,
	Truck,
} from "lucide-react";
import type {
	ComplianceSnapshot as ComplianceSnapshotType,
	ComplianceStatus,
	DriverRSECounter,
	RSERules,
	VehicleRegulatoryCategory,
} from "../types";

interface ComplianceSnapshotProps {
	snapshot: ComplianceSnapshotType | null;
	isLoading?: boolean;
}

/**
 * Convert minutes to hours with 1 decimal place
 */
function minutesToHours(minutes: number): string {
	return (minutes / 60).toFixed(1);
}

/**
 * Calculate percentage of limit used
 */
function calculatePercentage(actual: number, limit: number): number {
	if (limit <= 0) return 0;
	return Math.min(100, Math.round((actual / limit) * 100));
}

/**
 * Get status color classes
 */
function getStatusColor(status: ComplianceStatus): {
	bg: string;
	text: string;
	border: string;
	progress: string;
} {
	switch (status) {
		case "OK":
			return {
				bg: "bg-green-50 dark:bg-green-950",
				text: "text-green-700 dark:text-green-300",
				border: "border-green-200 dark:border-green-800",
				progress: "bg-green-500",
			};
		case "WARNING":
			return {
				bg: "bg-orange-50 dark:bg-orange-950",
				text: "text-orange-700 dark:text-orange-300",
				border: "border-orange-200 dark:border-orange-800",
				progress: "bg-orange-500",
			};
		case "VIOLATION":
			return {
				bg: "bg-red-50 dark:bg-red-950",
				text: "text-red-700 dark:text-red-300",
				border: "border-red-200 dark:border-red-800",
				progress: "bg-red-500",
			};
	}
}

/**
 * Get status icon
 */
function StatusIcon({ status }: { status: ComplianceStatus }) {
	switch (status) {
		case "OK":
			return <ShieldCheck className="h-5 w-5 text-green-500" />;
		case "WARNING":
			return <AlertTriangle className="h-5 w-5 text-orange-500" />;
		case "VIOLATION":
			return <XCircle className="h-5 w-5 text-red-500" />;
	}
}

/**
 * Counter display for a single regime
 */
function RegimeCounterCard({
	regime,
	counter,
	rules,
	status,
}: {
	regime: VehicleRegulatoryCategory;
	counter: DriverRSECounter | null;
	rules: RSERules | null;
	status: ComplianceStatus;
}) {
	const t = useTranslations("fleet.compliance");
	const colors = getStatusColor(status);

	const drivingMinutes = counter?.drivingMinutes ?? 0;
	const amplitudeMinutes = counter?.amplitudeMinutes ?? 0;
	const breakMinutes = counter?.breakMinutes ?? 0;

	// For LIGHT vehicles, show simple counters without limits
	const hasLimits = regime === "HEAVY" && rules;

	const drivingLimitMinutes = hasLimits ? rules.maxDailyDrivingHours * 60 : 0;
	const amplitudeLimitMinutes = hasLimits ? rules.maxDailyAmplitudeHours * 60 : 0;

	const drivingPercent = hasLimits
		? calculatePercentage(drivingMinutes, drivingLimitMinutes)
		: 0;
	const amplitudePercent = hasLimits
		? calculatePercentage(amplitudeMinutes, amplitudeLimitMinutes)
		: 0;

	return (
		<div className={`rounded-lg border p-4 ${colors.bg} ${colors.border}`}>
			<div className="flex items-center justify-between mb-3">
				<div className="flex items-center gap-2">
					{regime === "LIGHT" ? (
						<Car className="h-5 w-5 text-muted-foreground" />
					) : (
						<Truck className="h-5 w-5 text-muted-foreground" />
					)}
					<span className="font-medium">
						{regime === "LIGHT" ? t("regimeLight") : t("regimeHeavy")}
					</span>
				</div>
				<div className="flex items-center gap-2">
					<StatusIcon status={status} />
					<Badge
						variant={
							status === "OK"
								? "default"
								: status === "WARNING"
									? "secondary"
									: "destructive"
						}
					>
						{t(`status.${status.toLowerCase()}`)}
					</Badge>
				</div>
			</div>

			<div className="space-y-4">
				{/* Driving Time */}
				<div>
					<div className="flex items-center justify-between text-sm mb-1">
						<div className="flex items-center gap-1.5">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span>{t("drivingTime")}</span>
						</div>
						<span className={colors.text}>
							{minutesToHours(drivingMinutes)}h
							{hasLimits && ` / ${rules.maxDailyDrivingHours}h`}
						</span>
					</div>
					{hasLimits && (
						<Progress
							value={drivingPercent}
							className="h-2"
							// @ts-expect-error - custom indicator color prop
							indicatorClassName={
								drivingPercent >= 100
									? "bg-red-500"
									: drivingPercent >= 90
										? "bg-orange-500"
										: "bg-green-500"
							}
						/>
					)}
				</div>

				{/* Amplitude */}
				<div>
					<div className="flex items-center justify-between text-sm mb-1">
						<div className="flex items-center gap-1.5">
							<Timer className="h-4 w-4 text-muted-foreground" />
							<span>{t("amplitude")}</span>
						</div>
						<span className={colors.text}>
							{minutesToHours(amplitudeMinutes)}h
							{hasLimits && ` / ${rules.maxDailyAmplitudeHours}h`}
						</span>
					</div>
					{hasLimits && (
						<Progress
							value={amplitudePercent}
							className="h-2"
							// @ts-expect-error - custom indicator color prop
							indicatorClassName={
								amplitudePercent >= 100
									? "bg-red-500"
									: amplitudePercent >= 90
										? "bg-orange-500"
										: "bg-green-500"
							}
						/>
					)}
				</div>

				{/* Breaks */}
				<div className="flex items-center justify-between text-sm">
					<div className="flex items-center gap-1.5">
						<Coffee className="h-4 w-4 text-muted-foreground" />
						<span>{t("breaksTaken")}</span>
					</div>
					<span className="text-muted-foreground">
						{minutesToHours(breakMinutes)}h
					</span>
				</div>
			</div>
		</div>
	);
}

/**
 * Loading skeleton for compliance snapshot
 */
function ComplianceSnapshotSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-48" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-32 w-full" />
			</CardContent>
		</Card>
	);
}

/**
 * Compliance Snapshot Component
 *
 * Displays RSE counters and compliance status for both LIGHT and HEAVY regimes
 */
export function ComplianceSnapshot({
	snapshot,
	isLoading,
}: ComplianceSnapshotProps) {
	const t = useTranslations("fleet.compliance");

	if (isLoading) {
		return <ComplianceSnapshotSkeleton />;
	}

	if (!snapshot) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<ShieldCheck className="h-5 w-5" />
						{t("snapshotTitle")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">{t("noData")}</p>
				</CardContent>
			</Card>
		);
	}

	const formattedDate = new Date(snapshot.date).toLocaleDateString();

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg flex items-center gap-2">
						<ShieldCheck className="h-5 w-5" />
						{t("snapshotTitle")}
					</CardTitle>
					<span className="text-sm text-muted-foreground">{formattedDate}</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* LIGHT Regime */}
				<RegimeCounterCard
					regime="LIGHT"
					counter={snapshot.counters.light}
					rules={snapshot.limits.light}
					status={snapshot.status.light}
				/>

				{/* HEAVY Regime */}
				<RegimeCounterCard
					regime="HEAVY"
					counter={snapshot.counters.heavy}
					rules={snapshot.limits.heavy}
					status={snapshot.status.heavy}
				/>
			</CardContent>
		</Card>
	);
}
