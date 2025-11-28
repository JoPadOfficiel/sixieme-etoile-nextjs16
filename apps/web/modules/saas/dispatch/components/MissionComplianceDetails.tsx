"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import {
	ShieldCheck,
	ShieldAlert,
	ShieldX,
	Car,
	Truck,
	ChevronDown,
	ChevronUp,
	Clock,
	Timer,
	AlertTriangle,
	XCircle,
	FileText,
	Info,
} from "lucide-react";
import { cn } from "@ui/lib";
import { ComplianceRulesList } from "./ComplianceRulesList";
import { MissionComplianceAuditLogs } from "./MissionComplianceAuditLogs";
import type {
	MissionComplianceDetails as MissionComplianceDetailsType,
	ComplianceViolation,
	ComplianceWarning,
} from "../types";

/**
 * MissionComplianceDetails Component
 *
 * Story 5.6: Surface Compliance Statuses & Logs in UI
 *
 * Displays detailed compliance information for a selected mission including:
 * - Overall compliance status
 * - Applied rules with pass/fail status
 * - Violations and warnings
 * - Audit logs
 */

interface MissionComplianceDetailsProps {
	complianceDetails: MissionComplianceDetailsType | null;
	isLoading?: boolean;
	className?: string;
}

/**
 * Get status icon
 */
function getStatusIcon(isCompliant: boolean, hasWarnings: boolean) {
	if (!isCompliant) return ShieldX;
	if (hasWarnings) return ShieldAlert;
	return ShieldCheck;
}

/**
 * Get status color
 */
function getStatusColor(isCompliant: boolean, hasWarnings: boolean) {
	if (!isCompliant) return "text-red-500";
	if (hasWarnings) return "text-orange-500";
	return "text-green-500";
}

/**
 * Get status badge variant
 */
function getStatusBadgeVariant(isCompliant: boolean, hasWarnings: boolean) {
	if (!isCompliant) return "destructive" as const;
	if (hasWarnings) return "secondary" as const;
	return "default" as const;
}

/**
 * Convert minutes to hours with 1 decimal
 */
function minutesToHours(minutes: number): string {
	return (minutes / 60).toFixed(1);
}

/**
 * Loading skeleton
 */
function ComplianceDetailsSkeleton() {
	return (
		<Card>
			<CardHeader>
				<Skeleton className="h-6 w-48" />
			</CardHeader>
			<CardContent className="space-y-4">
				<Skeleton className="h-20 w-full" />
				<Skeleton className="h-32 w-full" />
				<Skeleton className="h-24 w-full" />
			</CardContent>
		</Card>
	);
}

/**
 * LIGHT vehicle info panel
 */
function LightVehicleInfo() {
	const t = useTranslations("dispatch.compliance");

	return (
		<div className="flex items-start gap-3 p-4 rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800">
			<Info className="h-5 w-5 text-blue-500 mt-0.5" />
			<div>
				<p className="text-sm font-medium text-blue-700 dark:text-blue-300">
					{t("lightVehicle.title")}
				</p>
				<p className="text-sm text-blue-600 dark:text-blue-400 mt-1">
					{t("lightVehicle.description")}
				</p>
			</div>
		</div>
	);
}

/**
 * Violations list
 */
function ViolationsList({ violations }: { violations: ComplianceViolation[] }) {
	const t = useTranslations("dispatch.compliance");

	if (violations.length === 0) return null;

	return (
		<div className="space-y-2">
			<h4 className="text-sm font-medium flex items-center gap-2">
				<XCircle className="h-4 w-4 text-red-500" />
				{t("violations")} ({violations.length})
			</h4>
			<div className="space-y-2">
				{violations.map((violation, index) => (
					<div
						key={index}
						className="p-3 rounded-lg bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm font-medium text-red-700 dark:text-red-300">
									{t(`violationType.${violation.type.toLowerCase()}`, { defaultValue: violation.type })}
								</p>
								<p className="text-sm text-red-600 dark:text-red-400 mt-1">
									{violation.message}
								</p>
							</div>
							<Badge variant="destructive" className="shrink-0">
								{violation.actual} / {violation.limit} {violation.unit}
							</Badge>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Warnings list
 */
function WarningsList({ warnings }: { warnings: ComplianceWarning[] }) {
	const t = useTranslations("dispatch.compliance");

	if (warnings.length === 0) return null;

	return (
		<div className="space-y-2">
			<h4 className="text-sm font-medium flex items-center gap-2">
				<AlertTriangle className="h-4 w-4 text-orange-500" />
				{t("warnings")} ({warnings.length})
			</h4>
			<div className="space-y-2">
				{warnings.map((warning, index) => (
					<div
						key={index}
						className="p-3 rounded-lg bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800"
					>
						<div className="flex items-start justify-between">
							<div>
								<p className="text-sm font-medium text-orange-700 dark:text-orange-300">
									{t(`warningType.${warning.type.toLowerCase()}`, { defaultValue: warning.type })}
								</p>
								<p className="text-sm text-orange-600 dark:text-orange-400 mt-1">
									{warning.message}
								</p>
							</div>
							<Badge variant="secondary" className="shrink-0">
								{warning.percentOfLimit}% {t("ofLimit")}
							</Badge>
						</div>
					</div>
				))}
			</div>
		</div>
	);
}

/**
 * Adjusted durations summary
 */
function AdjustedDurationsSummary({
	durations,
}: {
	durations: {
		totalDrivingMinutes: number;
		totalAmplitudeMinutes: number;
		injectedBreakMinutes: number;
		cappedSpeedApplied: boolean;
	};
}) {
	const t = useTranslations("dispatch.compliance");

	if (!durations) return null;

	return (
		<div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/50">
			<div className="flex items-center gap-2">
				<Clock className="h-4 w-4 text-muted-foreground" />
				<div>
					<p className="text-xs text-muted-foreground">{t("totalDriving")}</p>
					<p className="text-sm font-medium">
						{minutesToHours(durations.totalDrivingMinutes)}h
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Timer className="h-4 w-4 text-muted-foreground" />
				<div>
					<p className="text-xs text-muted-foreground">{t("totalAmplitude")}</p>
					<p className="text-sm font-medium">
						{minutesToHours(durations.totalAmplitudeMinutes)}h
					</p>
				</div>
			</div>
			{durations.injectedBreakMinutes > 0 && (
				<div className="flex items-center gap-2">
					<FileText className="h-4 w-4 text-muted-foreground" />
					<div>
						<p className="text-xs text-muted-foreground">{t("injectedBreaks")}</p>
						<p className="text-sm font-medium">
							{durations.injectedBreakMinutes} min
						</p>
					</div>
				</div>
			)}
			{durations.cappedSpeedApplied && (
				<div className="col-span-2">
					<Badge variant="outline" className="text-xs">
						{t("cappedSpeedApplied")}
					</Badge>
				</div>
			)}
		</div>
	);
}

export function MissionComplianceDetails({
	complianceDetails,
	isLoading,
	className,
}: MissionComplianceDetailsProps) {
	const t = useTranslations("dispatch.compliance");
	const [isRulesOpen, setIsRulesOpen] = useState(false);
	const [isLogsOpen, setIsLogsOpen] = useState(false);

	if (isLoading) {
		return <ComplianceDetailsSkeleton />;
	}

	if (!complianceDetails) {
		return (
			<Card className={className}>
				<CardHeader>
					<CardTitle className="text-lg flex items-center gap-2">
						<ShieldCheck className="h-5 w-5" />
						{t("title")}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="text-muted-foreground text-sm">{t("noData")}</p>
				</CardContent>
			</Card>
		);
	}

	const { vehicleRegulatoryCategory, validationResult, auditLogs } = complianceDetails;
	const isLightVehicle = vehicleRegulatoryCategory === "LIGHT";

	// For LIGHT vehicles, show simplified view
	if (isLightVehicle) {
		return (
			<Card className={className}>
				<CardHeader>
					<div className="flex items-center justify-between">
						<CardTitle className="text-lg flex items-center gap-2">
							<ShieldCheck className="h-5 w-5 text-green-500" />
							{t("title")}
						</CardTitle>
						<Badge variant="outline" className="gap-1">
							<Car className="h-3 w-3" />
							{t("vehicleType.light")}
						</Badge>
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					<LightVehicleInfo />
					{auditLogs.length > 0 && (
						<div>
							<button
								type="button"
								className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50"
								onClick={() => setIsLogsOpen(!isLogsOpen)}
							>
								<span className="text-sm font-medium flex items-center gap-2">
									<FileText className="h-4 w-4" />
									{t("auditLogs")} ({auditLogs.length})
								</span>
								{isLogsOpen ? (
									<ChevronUp className="h-4 w-4" />
								) : (
									<ChevronDown className="h-4 w-4" />
								)}
							</button>
							{isLogsOpen && (
								<div className="mt-2">
									<MissionComplianceAuditLogs logs={auditLogs} />
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	// HEAVY vehicle - full compliance view
	const isCompliant = validationResult?.isCompliant ?? true;
	const hasWarnings = (validationResult?.warnings?.length ?? 0) > 0;
	const hasViolations = (validationResult?.violations?.length ?? 0) > 0;

	const statusColor = getStatusColor(isCompliant, hasWarnings);
	const badgeVariant = getStatusBadgeVariant(isCompliant, hasWarnings);

	// Render status icon based on compliance state
	const renderStatusIcon = () => {
		const iconClass = cn("h-5 w-5", statusColor);
		if (!isCompliant) return <ShieldX className={iconClass} />;
		if (hasWarnings) return <ShieldAlert className={iconClass} />;
		return <ShieldCheck className={iconClass} />;
	};

	return (
		<Card className={className}>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle className="text-lg flex items-center gap-2">
						{renderStatusIcon()}
						{t("title")}
					</CardTitle>
					<div className="flex items-center gap-2">
						<Badge variant="outline" className="gap-1">
							<Truck className="h-3 w-3" />
							{t("vehicleType.heavy")}
						</Badge>
						<Badge variant={badgeVariant}>
							{isCompliant
								? hasWarnings
									? t("status.warning")
									: t("status.ok")
								: t("status.violation")}
						</Badge>
					</div>
				</div>
			</CardHeader>
			<CardContent className="space-y-4">
				{/* Adjusted Durations Summary */}
				{validationResult?.adjustedDurations && (
					<AdjustedDurationsSummary durations={validationResult.adjustedDurations} />
				)}

				{/* Violations */}
				{hasViolations && (
					<ViolationsList violations={validationResult!.violations} />
				)}

				{/* Warnings */}
				{hasWarnings && (
					<WarningsList warnings={validationResult!.warnings} />
				)}

				{/* Rules Applied */}
				{validationResult?.rulesApplied && validationResult.rulesApplied.length > 0 && (
					<div>
						<button
							type="button"
							className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50"
							onClick={() => setIsRulesOpen(!isRulesOpen)}
						>
							<span className="text-sm font-medium flex items-center gap-2">
								<ShieldCheck className="h-4 w-4" />
								{t("rulesChecked")} ({validationResult.rulesApplied.length})
							</span>
							{isRulesOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</button>
						{isRulesOpen && (
							<div className="mt-2">
								<ComplianceRulesList rules={validationResult.rulesApplied} />
							</div>
						)}
					</div>
				)}

				{/* Audit Logs */}
				{auditLogs.length > 0 && (
					<div>
						<button
							type="button"
							className="flex items-center justify-between w-full p-2 rounded hover:bg-muted/50"
							onClick={() => setIsLogsOpen(!isLogsOpen)}
						>
							<span className="text-sm font-medium flex items-center gap-2">
								<FileText className="h-4 w-4" />
								{t("auditLogs")} ({auditLogs.length})
							</span>
							{isLogsOpen ? (
								<ChevronUp className="h-4 w-4" />
							) : (
								<ChevronDown className="h-4 w-4" />
							)}
						</button>
						{isLogsOpen && (
							<div className="mt-2">
								<MissionComplianceAuditLogs logs={auditLogs} />
							</div>
						)}
					</div>
				)}

				{/* No issues message */}
				{isCompliant && !hasWarnings && !hasViolations && (
					<div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800">
						<ShieldCheck className="h-5 w-5 text-green-500" />
						<p className="text-sm text-green-700 dark:text-green-300">
							{t("allRulesPassed")}
						</p>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
