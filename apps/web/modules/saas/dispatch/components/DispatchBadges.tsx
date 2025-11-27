"use client";

import { Badge } from "@ui/components/badge";
import {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from "@ui/components/tooltip";
import {
	TrendingUp,
	TrendingDown,
	AlertTriangle,
	ShieldCheck,
	XCircle,
	UserCheck,
	UserX,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import type { MissionProfitability, MissionCompliance, MissionAssignment } from "../types";

/**
 * DispatchBadges Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Displays compact badges for profitability, compliance, and assignment status
 * on each mission row in the Dispatch screen.
 *
 * @see UX Spec 6.1.6 Dispatch Badges
 * @see FR24 Profitability indicator
 * @see FR47-FR49 Compliance indicators
 */

interface DispatchBadgesProps {
	profitability: MissionProfitability;
	compliance: MissionCompliance;
	assignment: MissionAssignment | null;
	className?: string;
}

export function DispatchBadges({
	profitability,
	compliance,
	assignment,
	className,
}: DispatchBadgesProps) {
	const t = useTranslations("dispatch.badges");

	return (
		<div className={cn("flex items-center gap-1.5", className)}>
			<ProfitabilityBadge profitability={profitability} t={t} />
			<ComplianceBadge compliance={compliance} t={t} />
			<AssignmentBadge assignment={assignment} t={t} />
		</div>
	);
}

// Profitability Badge
interface ProfitabilityBadgeProps {
	profitability: MissionProfitability;
	t: ReturnType<typeof useTranslations>;
}

function ProfitabilityBadge({ profitability, t }: ProfitabilityBadgeProps) {
	const config = getProfitabilityConfig(profitability.level);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="outline"
						className={cn("p-1", config.className)}
						data-testid="profitability-badge"
					>
						<config.Icon className="size-3.5" />
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p className="font-medium">{t(`profitability.${profitability.level}`)}</p>
					{profitability.marginPercent !== null && (
						<p className="text-xs text-muted-foreground">
							{profitability.marginPercent.toFixed(1)}% margin
						</p>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function getProfitabilityConfig(level: "green" | "orange" | "red") {
	switch (level) {
		case "green":
			return {
				Icon: TrendingUp,
				className: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
			};
		case "orange":
			return {
				Icon: AlertTriangle,
				className: "border-orange-500/50 bg-orange-500/10 text-orange-700 dark:text-orange-400",
			};
		case "red":
			return {
				Icon: TrendingDown,
				className: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
			};
	}
}

// Compliance Badge
interface ComplianceBadgeProps {
	compliance: MissionCompliance;
	t: ReturnType<typeof useTranslations>;
}

function ComplianceBadge({ compliance, t }: ComplianceBadgeProps) {
	const config = getComplianceConfig(compliance.status);

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="outline"
						className={cn("p-1", config.className)}
						data-testid="compliance-badge"
					>
						<config.Icon className="size-3.5" />
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p className="font-medium">{t(`compliance.${compliance.status.toLowerCase()}`)}</p>
					{compliance.warnings.length > 0 && (
						<ul className="text-xs text-muted-foreground mt-1">
							{compliance.warnings.slice(0, 3).map((warning, i) => (
								<li key={i}>• {warning}</li>
							))}
							{compliance.warnings.length > 3 && (
								<li>• +{compliance.warnings.length - 3} more</li>
							)}
						</ul>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

function getComplianceConfig(status: "OK" | "WARNING" | "VIOLATION") {
	switch (status) {
		case "OK":
			return {
				Icon: ShieldCheck,
				className: "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400",
			};
		case "WARNING":
			return {
				Icon: AlertTriangle,
				className: "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-400",
			};
		case "VIOLATION":
			return {
				Icon: XCircle,
				className: "border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-400",
			};
	}
}

// Assignment Badge
interface AssignmentBadgeProps {
	assignment: MissionAssignment | null;
	t: ReturnType<typeof useTranslations>;
}

function AssignmentBadge({ assignment, t }: AssignmentBadgeProps) {
	const isAssigned = assignment?.vehicleId !== null;
	const config = isAssigned
		? {
				Icon: UserCheck,
				className: "border-blue-500/50 bg-blue-500/10 text-blue-700 dark:text-blue-400",
				label: "assigned",
			}
		: {
				Icon: UserX,
				className: "border-gray-500/50 bg-gray-500/10 text-gray-700 dark:text-gray-400",
				label: "unassigned",
			};

	return (
		<TooltipProvider>
			<Tooltip>
				<TooltipTrigger asChild>
					<Badge
						variant="outline"
						className={cn("p-1", config.className)}
						data-testid="assignment-badge"
					>
						<config.Icon className="size-3.5" />
					</Badge>
				</TooltipTrigger>
				<TooltipContent side="top">
					<p className="font-medium">{t(`assignment.${config.label}`)}</p>
					{isAssigned && assignment && (
						<div className="text-xs text-muted-foreground mt-1">
							{assignment.vehicleName && <p>{assignment.vehicleName}</p>}
							{assignment.driverName && <p>{assignment.driverName}</p>}
							{assignment.baseName && <p>Base: {assignment.baseName}</p>}
						</div>
					)}
				</TooltipContent>
			</Tooltip>
		</TooltipProvider>
	);
}

export default DispatchBadges;
