"use client";

/**
 * Zone Validation Results Panel
 * Story 17.11: Zone Topology Validation Tools
 *
 * Displays validation results with overlaps, missing fields, and warnings
 */

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from "@ui/components/collapsible";
import { ScrollArea } from "@ui/components/scroll-area";
import {
	AlertCircle,
	AlertTriangle,
	CheckCircle2,
	ChevronDown,
	ChevronRight,
	Info,
	X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface ZoneRef {
	id: string;
	name: string;
	code: string;
}

interface ZoneOverlapIssue {
	severity: "INFO" | "WARNING";
	zone1: ZoneRef;
	zone2: ZoneRef;
	overlapType: string;
	message: string;
	suggestion: string;
}

interface ZoneMissingFieldIssue {
	severity: "WARNING" | "ERROR";
	zone: ZoneRef;
	field: string;
	message: string;
	suggestion: string;
}

interface ZoneWarning {
	severity: "INFO" | "WARNING";
	type: string;
	message: string;
	suggestion: string;
}

export interface ZoneValidationResult {
	isValid: boolean;
	summary: {
		totalZones: number;
		activeZones: number;
		overlapsCount: number;
		missingFieldsCount: number;
		warningsCount: number;
	};
	overlaps: ZoneOverlapIssue[];
	missingFields: ZoneMissingFieldIssue[];
	warnings: ZoneWarning[];
}

interface ZoneValidationResultsPanelProps {
	result: ZoneValidationResult;
	onClose: () => void;
	onSelectZone?: (zoneId: string) => void;
}

function SeverityIcon({ severity }: { severity: "INFO" | "WARNING" | "ERROR" }) {
	switch (severity) {
		case "ERROR":
			return <AlertCircle className="h-4 w-4 text-destructive" />;
		case "WARNING":
			return <AlertTriangle className="h-4 w-4 text-amber-500" />;
		case "INFO":
			return <Info className="h-4 w-4 text-blue-500" />;
	}
}

function ZoneLink({
	zone,
	onClick,
}: {
	zone: ZoneRef;
	onClick?: (zoneId: string) => void;
}) {
	return (
		<button
			type="button"
			onClick={() => onClick?.(zone.id)}
			className="font-medium text-primary hover:underline"
		>
			{zone.name} ({zone.code})
		</button>
	);
}

export function ZoneValidationResultsPanel({
	result,
	onClose,
	onSelectZone,
}: ZoneValidationResultsPanelProps) {
	const t = useTranslations();
	const [overlapsOpen, setOverlapsOpen] = useState(true);
	const [missingFieldsOpen, setMissingFieldsOpen] = useState(true);
	const [warningsOpen, setWarningsOpen] = useState(true);

	const hasIssues =
		result.overlaps.length > 0 ||
		result.missingFields.length > 0 ||
		result.warnings.length > 0;

	return (
		<div className="absolute top-4 right-4 z-10 w-[400px] max-h-[calc(100vh-16rem)] bg-background border rounded-lg shadow-lg flex flex-col">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b">
				<div className="flex items-center gap-2">
					{result.isValid ? (
						<CheckCircle2 className="h-5 w-5 text-green-500" />
					) : (
						<AlertCircle className="h-5 w-5 text-destructive" />
					)}
					<h3 className="font-semibold">
						{t("pricing.zones.validation.title")}
					</h3>
				</div>
				<Button variant="ghost" size="icon" onClick={onClose}>
					<X className="h-4 w-4" />
				</Button>
			</div>

			{/* Summary */}
			<div className="p-4 border-b bg-muted/30">
				<div className="grid grid-cols-2 gap-2 text-sm">
					<div>
						<span className="text-muted-foreground">
							{t("pricing.zones.validation.totalZones")}:
						</span>{" "}
						<span className="font-medium">{result.summary.totalZones}</span>
					</div>
					<div>
						<span className="text-muted-foreground">
							{t("pricing.zones.validation.activeZones")}:
						</span>{" "}
						<span className="font-medium">{result.summary.activeZones}</span>
					</div>
					<div>
						<span className="text-muted-foreground">
							{t("pricing.zones.validation.overlaps")}:
						</span>{" "}
						<Badge
							variant={result.summary.overlapsCount > 0 ? "warning" : "secondary"}
							className="ml-1"
						>
							{result.summary.overlapsCount}
						</Badge>
					</div>
					<div>
						<span className="text-muted-foreground">
							{t("pricing.zones.validation.issues")}:
						</span>{" "}
						<Badge
							variant={result.summary.missingFieldsCount > 0 ? "destructive" : "secondary"}
							className="ml-1"
						>
							{result.summary.missingFieldsCount}
						</Badge>
					</div>
				</div>
			</div>

			{/* Results */}
			<ScrollArea className="flex-1 p-4">
				{!hasIssues ? (
					<div className="flex flex-col items-center justify-center py-8 text-center">
						<CheckCircle2 className="h-12 w-12 text-green-500 mb-3" />
						<p className="font-medium text-green-700">
							{t("pricing.zones.validation.noIssues")}
						</p>
						<p className="text-sm text-muted-foreground mt-1">
							{t("pricing.zones.validation.noIssuesDescription")}
						</p>
					</div>
				) : (
					<div className="space-y-4">
						{/* Overlaps Section */}
						{result.overlaps.length > 0 && (
							<Collapsible open={overlapsOpen} onOpenChange={setOverlapsOpen}>
								<CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium hover:text-primary">
									{overlapsOpen ? (
										<ChevronDown className="h-4 w-4" />
									) : (
										<ChevronRight className="h-4 w-4" />
									)}
									{t("pricing.zones.validation.overlapsSection")} ({result.overlaps.length})
								</CollapsibleTrigger>
								<CollapsibleContent className="mt-2 space-y-2">
									{result.overlaps.map((overlap, idx) => (
										<div
											key={`overlap-${idx}`}
											className="p-3 bg-muted/50 rounded-md text-sm"
										>
											<div className="flex items-start gap-2">
												<SeverityIcon severity={overlap.severity} />
												<div className="flex-1">
													<p>
														<ZoneLink zone={overlap.zone1} onClick={onSelectZone} />
														{" ↔ "}
														<ZoneLink zone={overlap.zone2} onClick={onSelectZone} />
													</p>
													<p className="text-muted-foreground mt-1">
														{overlap.suggestion}
													</p>
												</div>
											</div>
										</div>
									))}
								</CollapsibleContent>
							</Collapsible>
						)}

						{/* Missing Fields Section */}
						{result.missingFields.length > 0 && (
							<Collapsible open={missingFieldsOpen} onOpenChange={setMissingFieldsOpen}>
								<CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium hover:text-primary">
									{missingFieldsOpen ? (
										<ChevronDown className="h-4 w-4" />
									) : (
										<ChevronRight className="h-4 w-4" />
									)}
									{t("pricing.zones.validation.missingFieldsSection")} ({result.missingFields.length})
								</CollapsibleTrigger>
								<CollapsibleContent className="mt-2 space-y-2">
									{result.missingFields.map((issue, idx) => (
										<div
											key={`missing-${idx}`}
											className="p-3 bg-muted/50 rounded-md text-sm"
										>
											<div className="flex items-start gap-2">
												<SeverityIcon severity={issue.severity} />
												<div className="flex-1">
													<p>
														<ZoneLink zone={issue.zone} onClick={onSelectZone} />
														{" — "}
														<span className="text-muted-foreground">{issue.field}</span>
													</p>
													<p className="text-muted-foreground mt-1">
														{issue.suggestion}
													</p>
												</div>
											</div>
										</div>
									))}
								</CollapsibleContent>
							</Collapsible>
						)}

						{/* Warnings Section */}
						{result.warnings.length > 0 && (
							<Collapsible open={warningsOpen} onOpenChange={setWarningsOpen}>
								<CollapsibleTrigger className="flex items-center gap-2 w-full text-left font-medium hover:text-primary">
									{warningsOpen ? (
										<ChevronDown className="h-4 w-4" />
									) : (
										<ChevronRight className="h-4 w-4" />
									)}
									{t("pricing.zones.validation.warningsSection")} ({result.warnings.length})
								</CollapsibleTrigger>
								<CollapsibleContent className="mt-2 space-y-2">
									{result.warnings.map((warning, idx) => (
										<div
											key={`warning-${idx}`}
											className="p-3 bg-muted/50 rounded-md text-sm"
										>
											<div className="flex items-start gap-2">
												<SeverityIcon severity={warning.severity} />
												<div className="flex-1">
													<p>{warning.message}</p>
													<p className="text-muted-foreground mt-1">
														{warning.suggestion}
													</p>
												</div>
											</div>
										</div>
									))}
								</CollapsibleContent>
							</Collapsible>
						)}
					</div>
				)}
			</ScrollArea>
		</div>
	);
}
