"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@ui/components/badge";
import { CheckCircle, XCircle, AlertTriangle, Clock, Timer, Coffee, Gauge } from "lucide-react";
import { cn } from "@ui/lib";
import type { AppliedComplianceRule } from "../types";

/**
 * ComplianceRulesList Component
 *
 * Story 5.6: Surface Compliance Statuses & Logs in UI
 *
 * Displays a list of applied compliance rules with their pass/fail/warning status.
 */

interface ComplianceRulesListProps {
	rules: AppliedComplianceRule[];
	className?: string;
}

/**
 * Get icon for rule type
 */
function getRuleIcon(ruleId: string) {
	if (ruleId.includes("driving")) return Clock;
	if (ruleId.includes("amplitude")) return Timer;
	if (ruleId.includes("break")) return Coffee;
	if (ruleId.includes("speed")) return Gauge;
	return Clock;
}

/**
 * Get result icon and color
 */
function getResultConfig(result: "PASS" | "FAIL" | "WARNING") {
	switch (result) {
		case "PASS":
			return {
				Icon: CheckCircle,
				className: "text-green-500",
				badgeVariant: "default" as const,
				bgClass: "bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800",
			};
		case "FAIL":
			return {
				Icon: XCircle,
				className: "text-red-500",
				badgeVariant: "destructive" as const,
				bgClass: "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800",
			};
		case "WARNING":
			return {
				Icon: AlertTriangle,
				className: "text-orange-500",
				badgeVariant: "secondary" as const,
				bgClass: "bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800",
			};
	}
}

export function ComplianceRulesList({ rules, className }: ComplianceRulesListProps) {
	const t = useTranslations("dispatch.compliance");

	if (rules.length === 0) {
		return (
			<div className={cn("text-sm text-muted-foreground text-center py-4", className)}>
				{t("noRulesChecked")}
			</div>
		);
	}

	return (
		<div className={cn("space-y-2", className)}>
			{rules.map((rule, index) => {
				const RuleIcon = getRuleIcon(rule.ruleId);
				const resultConfig = getResultConfig(rule.result);

				return (
					<div
						key={rule.ruleId || index}
						className={cn(
							"flex items-center justify-between p-3 rounded-lg border",
							resultConfig.bgClass
						)}
					>
						<div className="flex items-center gap-3">
							<RuleIcon className="h-4 w-4 text-muted-foreground" />
							<div>
								<p className="text-sm font-medium">{rule.ruleName}</p>
								<p className="text-xs text-muted-foreground">
									{t("threshold")}: {rule.threshold} {rule.unit}
								</p>
							</div>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant={resultConfig.badgeVariant}>
								{t(`result.${rule.result.toLowerCase()}`)}
							</Badge>
							<resultConfig.Icon className={cn("h-5 w-5", resultConfig.className)} />
						</div>
					</div>
				);
			})}
		</div>
	);
}
