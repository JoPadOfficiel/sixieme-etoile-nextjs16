"use client";

import { AlertCircle, CheckCircle2, MapPin, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { cn } from "@ui/lib";
import type { AssignmentCandidate } from "../types/assignment";

/**
 * Story 30.2: CandidateCard Component
 * 
 * Displays a candidate vehicle/driver pair with:
 * - Warning badge for RSE/schedule conflicts
 * - Force Assign button for overriding warnings
 * - Compliance status indicator
 */

interface CandidateCardProps {
	candidate: AssignmentCandidate;
	isSelected: boolean;
	onSelect: (candidateId: string) => void;
	onForceAssign?: (candidateId: string) => void;
	costDifference?: number | null;
	isBestOption?: boolean;
	className?: string;
}

export function CandidateCard({
	candidate,
	isSelected,
	onSelect,
	onForceAssign,
	costDifference,
	isBestOption,
	className,
}: CandidateCardProps) {
	const t = useTranslations("dispatch.assignment.candidate");
	const [showForceAssignDialog, setShowForceAssignDialog] = useState(false);

	// Story 30.2: Check for warnings (RSE, schedule overlap)
	const hasWarnings = candidate.compliance?.warnings && candidate.compliance.warnings.length > 0;
	const warningMessages = (candidate.compliance?.warnings ?? []).filter(
		(w): w is string => typeof w === 'string'
	);

	const handleForceAssign = () => {
		setShowForceAssignDialog(false);
		onForceAssign?.(candidate.candidateId);
	};

	return (
		<>
			<div
				onClick={() => onSelect(candidate.candidateId)}
				className={cn(
					"p-4 rounded-lg border-2 cursor-pointer transition-all",
					isSelected
						? "border-primary bg-primary/5"
						: "border-border hover:border-primary/50 hover:bg-muted/30",
					hasWarnings && "border-orange-400 bg-orange-50/30",
					className
				)}
				data-testid={`candidate-card-${candidate.candidateId}`}
			>
				{/* Header: Vehicle + Driver */}
				<div className="flex items-start justify-between gap-3 mb-3">
					<div className="flex-1 min-w-0">
						<div className="flex items-center gap-2 mb-1">
							<p className="font-semibold text-sm truncate">
								{candidate.vehicleName}
							</p>
							{isBestOption && (
								<Badge variant="default" className="shrink-0">
									{t("bestOption")}
								</Badge>
							)}
							{/* Story 30.2: Warning badge for RSE/schedule conflicts */}
							{hasWarnings && (
								<Badge variant="destructive" className="shrink-0 bg-orange-500">
									⚠️ {t("warning")}
								</Badge>
							)}
						</div>
						{candidate.driverName && (
							<p className="text-xs text-muted-foreground truncate">
								{candidate.driverName}
							</p>
						)}
					</div>
					<div className="text-right shrink-0">
						<p className="font-bold text-sm">
							{candidate.estimatedCost?.total
								? `€${candidate.estimatedCost.total.toFixed(2)}`
								: "N/A"}
						</p>
						{costDifference !== null && costDifference !== undefined && (
							<p
								className={cn(
									"text-xs",
									costDifference > 0
										? "text-orange-600"
										: "text-green-600"
								)}
							>
								{costDifference > 0 ? "+" : ""}
								€{costDifference.toFixed(2)}
							</p>
						)}
					</div>
				</div>

				{/* Compliance Status */}
				<div className="flex items-center gap-2 mb-3">
					{candidate.compliance?.status === "OK" ? (
						<CheckCircle2 className="size-4 text-green-600" />
					) : candidate.compliance?.status === "WARNING" ? (
						<AlertCircle className="size-4 text-orange-500" />
					) : (
						<AlertCircle className="size-4 text-red-600" />
					)}
					<span className="text-xs font-medium">
						{candidate.compliance?.status === "OK"
							? t("compliant")
							: candidate.compliance?.status === "WARNING"
								? t("warning")
								: t("violation")}
					</span>
					<span className="text-xs text-muted-foreground ml-auto">
						Score: {candidate.flexibilityScore.toFixed(1)}
					</span>
				</div>

				{/* Story 30.2: Display warning details */}
				{hasWarnings && (
					<div className="mb-3 p-2 bg-orange-50 rounded border border-orange-200">
						<ul className="text-xs text-orange-900 space-y-1">
							{warningMessages.map((msg, i) => (
								<li key={i} className="flex items-start gap-2">
									<span className="mt-0.5">•</span>
									<span>{msg}</span>
								</li>
							))}
						</ul>
					</div>
				)}

				{/* Location Info */}
				<div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
					<MapPin className="size-3" />
					<span>{candidate.baseName}</span>
					{candidate.baseDistanceKm && (
						<span className="ml-auto">
							{candidate.baseDistanceKm.toFixed(1)} km
						</span>
					)}
				</div>

				{/* Segments */}
				<div className="grid grid-cols-3 gap-2 mb-3 text-xs">
					<div className="p-2 bg-muted rounded">
						<p className="font-medium">Approche</p>
						<p className="text-muted-foreground">
							{candidate.segments.approach.distanceKm
								? `${candidate.segments.approach.distanceKm.toFixed(1)} km`
								: "N/A"}
						</p>
					</div>
					<div className="p-2 bg-muted rounded">
						<p className="font-medium">Service</p>
						<p className="text-muted-foreground">
							{candidate.segments.service.distanceKm
								? `${candidate.segments.service.distanceKm.toFixed(1)} km`
								: "N/A"}
						</p>
					</div>
					<div className="p-2 bg-muted rounded">
						<p className="font-medium">Retour</p>
						<p className="text-muted-foreground">
							{candidate.segments.return.distanceKm
								? `${candidate.segments.return.distanceKm.toFixed(1)} km`
								: "N/A"}
						</p>
					</div>
				</div>

				{/* Story 30.2: Force Assign button for warnings */}
				{hasWarnings && onForceAssign && (
					<Button
						variant="outline"
						size="sm"
						className="w-full border-orange-500 text-orange-600 hover:bg-orange-50"
						onClick={(e) => {
							e.stopPropagation();
							setShowForceAssignDialog(true);
						}}
					>
						<Zap className="size-3 mr-2" />
						{t("forceAssign")}
					</Button>
				)}
			</div>

			{/* Story 30.2: Force Assign Confirmation Dialog */}
			<Dialog open={showForceAssignDialog} onOpenChange={setShowForceAssignDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{t("forceAssignTitle")}</DialogTitle>
						<DialogDescription>
							{t("forceAssignDescription")}
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-3 my-4">
						<p className="text-sm font-medium">{t("warnings")}:</p>
						<ul className="space-y-2">
							{warningMessages.map((msg, i) => (
								<li key={i} className="flex items-start gap-2 text-sm">
									<AlertCircle className="size-4 text-orange-500 mt-0.5 shrink-0" />
									<span>{msg}</span>
								</li>
							))}
						</ul>
					</div>

					<div className="flex gap-3 justify-end">
						<Button
							variant="outline"
							onClick={() => setShowForceAssignDialog(false)}
						>
							{t("cancel")}
						</Button>
						<Button
							variant="destructive"
							onClick={handleForceAssign}
						>
							{t("confirmForceAssign")}
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}

export default CandidateCard;
