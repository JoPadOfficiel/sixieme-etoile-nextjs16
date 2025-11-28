"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Badge } from "@ui/components/badge";
import {
	ShieldCheck,
	ShieldAlert,
	ShieldX,
	ChevronDown,
	ChevronUp,
	Clock,
	AlertTriangle,
	XCircle,
	Car,
	Truck,
} from "lucide-react";
import type {
	MissionComplianceAuditLog,
	ComplianceDecision,
	ComplianceViolation,
	ComplianceWarning,
} from "../types";

/**
 * MissionComplianceAuditLogs Component
 *
 * Story 5.6: Surface Compliance Statuses & Logs in UI
 *
 * Displays a list of compliance audit log entries for a mission.
 */

interface MissionComplianceAuditLogsProps {
	logs: MissionComplianceAuditLog[];
	className?: string;
}

/**
 * Get decision icon
 */
function DecisionIcon({ decision }: { decision: ComplianceDecision }) {
	switch (decision) {
		case "APPROVED":
			return <ShieldCheck className="h-4 w-4 text-green-500" />;
		case "WARNING":
			return <ShieldAlert className="h-4 w-4 text-orange-500" />;
		case "BLOCKED":
			return <ShieldX className="h-4 w-4 text-red-500" />;
	}
}

/**
 * Get decision badge variant
 */
function getDecisionVariant(
	decision: ComplianceDecision
): "default" | "secondary" | "destructive" {
	switch (decision) {
		case "APPROVED":
			return "default";
		case "WARNING":
			return "secondary";
		case "BLOCKED":
			return "destructive";
	}
}

/**
 * Format timestamp for display
 */
function formatTimestamp(timestamp: string): string {
	const date = new Date(timestamp);
	return date.toLocaleString(undefined, {
		dateStyle: "short",
		timeStyle: "short",
	});
}

/**
 * Single audit log entry
 */
function AuditLogEntry({ log }: { log: MissionComplianceAuditLog }) {
	const t = useTranslations("dispatch.compliance");
	const [isOpen, setIsOpen] = useState(false);

	const hasDetails =
		(log.violations && log.violations.length > 0) ||
		(log.warnings && log.warnings.length > 0);

	return (
		<div className="border rounded-lg p-3 hover:bg-muted/50 transition-colors">
			<button
				type="button"
				className="w-full text-left"
				onClick={() => hasDetails && setIsOpen(!isOpen)}
				disabled={!hasDetails}
			>
				<div className="flex items-start justify-between gap-2">
					<div className="flex items-start gap-3">
						<DecisionIcon decision={log.decision} />
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<Badge variant={getDecisionVariant(log.decision)}>
									{t(`decision.${log.decision.toLowerCase()}`)}
								</Badge>
								<Badge variant="outline" className="gap-1">
									{log.regulatoryCategory === "LIGHT" ? (
										<Car className="h-3 w-3" />
									) : (
										<Truck className="h-3 w-3" />
									)}
									{log.regulatoryCategory}
								</Badge>
							</div>
							<p className="text-sm text-muted-foreground line-clamp-2">
								{log.reason}
							</p>
						</div>
					</div>
					<div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
						<Clock className="h-3 w-3" />
						{formatTimestamp(log.timestamp)}
						{hasDetails && (
							<span className="ml-1">
								{isOpen ? (
									<ChevronUp className="h-4 w-4" />
								) : (
									<ChevronDown className="h-4 w-4" />
								)}
							</span>
						)}
					</div>
				</div>
			</button>

			{hasDetails && isOpen && (
				<div className="mt-3 pt-3 border-t space-y-3">
					{/* Violations */}
					{log.violations && log.violations.length > 0 && (
						<div>
							<h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
								<XCircle className="h-4 w-4 text-red-500" />
								{t("violations")} ({log.violations.length})
							</h4>
							<ul className="space-y-1.5">
								{log.violations.map((v: ComplianceViolation, i: number) => (
									<li
										key={i}
										className="text-sm text-muted-foreground bg-red-50 dark:bg-red-950 rounded px-2 py-1"
									>
										<span className="font-medium text-red-700 dark:text-red-300">
											{v.type}:
										</span>{" "}
										{v.message}
									</li>
								))}
							</ul>
						</div>
					)}

					{/* Warnings */}
					{log.warnings && log.warnings.length > 0 && (
						<div>
							<h4 className="text-sm font-medium flex items-center gap-1.5 mb-2">
								<AlertTriangle className="h-4 w-4 text-orange-500" />
								{t("warnings")} ({log.warnings.length})
							</h4>
							<ul className="space-y-1.5">
								{log.warnings.map((w: ComplianceWarning, i: number) => (
									<li
										key={i}
										className="text-sm text-muted-foreground bg-orange-50 dark:bg-orange-950 rounded px-2 py-1"
									>
										<span className="font-medium text-orange-700 dark:text-orange-300">
											{w.type}:
										</span>{" "}
										{w.message} ({w.percentOfLimit}% {t("ofLimit")})
									</li>
								))}
							</ul>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export function MissionComplianceAuditLogs({
	logs,
	className,
}: MissionComplianceAuditLogsProps) {
	const t = useTranslations("dispatch.compliance");

	if (logs.length === 0) {
		return (
			<p className="text-muted-foreground text-sm text-center py-4">
				{t("noAuditLogs")}
			</p>
		);
	}

	return (
		<div className={className}>
			<div className="space-y-2">
				{logs.map((log) => (
					<AuditLogEntry key={log.id} log={log} />
				))}
			</div>
		</div>
	);
}
