"use client";

import { useMemo } from "react";
import { Skeleton } from "@ui/components/skeleton";
import { Car } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { CandidateRow } from "./CandidateRow";
import type { AssignmentCandidate, ConstraintDiagnostics } from "../types/assignment";
import { getBestCandidate, getCostDifference, isBestCandidate } from "../hooks/useRouteVisualization";

/**
 * CandidatesList Component
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 * Story 8.3: Multi-Base Optimisation & Visualisation - Added hover callbacks and cost comparison
 *
 * List of candidate vehicle/driver pairs for assignment.
 *
 * @see AC2: Candidate List Display
 * @see AC10: Empty State and Loading
 * @see Story 8.3 AC4: Cost Comparison Visualization
 */

interface CandidatesListProps {
	candidates: AssignmentCandidate[];
	selectedId: string | null;
	onSelect: (candidateId: string) => void;
	isLoading: boolean;
	className?: string;
	// Story 8.3: Hover callbacks for map preview
	onHoverStart?: (candidateId: string) => void;
	onHoverEnd?: () => void;
	/** Story 27.9: Explicit empty state for a specific driver */
	preSelectedDriverName?: string | null;
	/** Story 30.2: Diagnostics explaining why candidates were excluded */
	diagnostics?: ConstraintDiagnostics;
}

export function CandidatesList({
	candidates,
	selectedId,
	onSelect,
	isLoading,
	className,
	onHoverStart,
	onHoverEnd,
	preSelectedDriverName,
	diagnostics,
}: CandidatesListProps) {
	// Story 8.3: Find best candidate for cost comparison
	const bestCandidate = useMemo(() => getBestCandidate(candidates), [candidates]);

	if (isLoading) {
		return <CandidatesListSkeleton className={className} />;
	}

	if (candidates.length === 0) {
		return (
			<CandidatesListEmpty
				className={className}
				preSelectedDriverName={preSelectedDriverName}
				diagnostics={diagnostics}
			/>
		);
	}

	return (
		<div
			className={cn("space-y-2 overflow-auto", className)}
			data-testid="candidates-list"
		>
			{candidates.map((candidate) => (
				<CandidateRow
					key={candidate.candidateId}
					candidate={candidate}
					isSelected={candidate.candidateId === selectedId}
					onSelect={onSelect}
					onHoverStart={onHoverStart}
					onHoverEnd={onHoverEnd}
					costDifference={getCostDifference(candidate, bestCandidate)}
					isBestOption={isBestCandidate(candidate, bestCandidate)}
				/>
			))}
		</div>
	);
}

function CandidatesListSkeleton({ className }: { className?: string }) {
	return (
		<div className={cn("space-y-2", className)}>
			{[1, 2, 3, 4].map((i) => (
				<div key={i} className="p-3 rounded-lg border">
					<div className="flex items-start justify-between gap-3">
						<div className="flex-1 space-y-2">
							<div className="flex items-center gap-2">
								<Skeleton className="size-4" />
								<Skeleton className="h-4 w-32" />
								<Skeleton className="h-5 w-12" />
							</div>
							<div className="flex items-center gap-2">
								<Skeleton className="size-4" />
								<Skeleton className="h-4 w-24" />
							</div>
							<div className="flex items-center gap-2">
								<Skeleton className="size-3" />
								<Skeleton className="h-3 w-20" />
							</div>
						</div>
						<div className="flex flex-col items-end gap-2">
							<Skeleton className="h-6 w-16" />
							<Skeleton className="h-5 w-14" />
							<Skeleton className="h-4 w-12" />
						</div>
					</div>
				</div>
			))}
		</div>
	);
}

function CandidatesListEmpty({ 
	className,
	preSelectedDriverName,
	diagnostics,
}: { 
	className?: string;
	preSelectedDriverName?: string | null;
	diagnostics?: ConstraintDiagnostics;
}) {
	const t = useTranslations("dispatch.assignment.empty");

	// Story 30.2: Build diagnostic message if available
	const hasDiagnostics = diagnostics && (
		diagnostics.excludedByLicense > 0 ||
		diagnostics.excludedBySchedule > 0 ||
		diagnostics.excludedByCalendar > 0
	);

	const diagnosticLines: string[] = [];
	if (diagnostics) {
		if (diagnostics.excludedByLicense > 0) {
			diagnosticLines.push(`${diagnostics.excludedByLicense} exclu(s) pour permis incompatible`);
		}
		if (diagnostics.excludedBySchedule > 0) {
			diagnosticLines.push(`${diagnostics.excludedBySchedule} exclu(s) pour chevauchement horaire`);
		}
		if (diagnostics.excludedByCalendar > 0) {
			diagnosticLines.push(`${diagnostics.excludedByCalendar} exclu(s) pour indisponibilité`);
		}
	}

	return (
		<div
			className={cn(
				"flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-xl px-6",
				className,
			)}
			data-testid="candidates-list-empty"
		>
			<Car className="size-12 text-muted-foreground/30 mb-4" />
			<p className="text-lg font-medium text-muted-foreground">
				{preSelectedDriverName 
					? `Indisponible pour ${preSelectedDriverName}`
					: t("title")}
			</p>
			<p className="text-sm text-muted-foreground mt-2 max-w-[250px]">
				{preSelectedDriverName 
					? "Ce conducteur n'est pas éligible ou n'a pas de véhicule compatible pour cette mission."
					: t("description")}
			</p>
			{/* Story 30.2: Show diagnostic details */}
			{hasDiagnostics && (
				<div className="mt-4 p-3 bg-muted/50 rounded-lg text-left w-full max-w-[300px]">
					<p className="text-xs font-medium text-muted-foreground mb-2">
						Raisons d&apos;exclusion :
					</p>
					<ul className="text-xs text-muted-foreground space-y-1">
						{diagnosticLines.map((line, i) => (
							<li key={i} className="flex items-center gap-2">
								<span className="size-1.5 rounded-full bg-orange-400" />
								{line}
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	);
}

export default CandidatesList;
