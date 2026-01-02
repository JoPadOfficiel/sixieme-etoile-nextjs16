"use client";

import { useState, useMemo, useCallback } from "react";
import { Button } from "@ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { MapPin, ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useToast } from "@ui/hooks/use-toast";
import { CandidateFilters } from "./CandidateFilters";
import { CandidatesList } from "./CandidatesList";
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { useAssignMission } from "../hooks/useAssignMission";
import type {
	CandidateSortBy,
	ComplianceFilter,
	FleetTypeFilter,
} from "../types/assignment";

/**
 * AssignmentDrawer Component
 *
 * Story 8.2: Implement Assignment Drawer with Candidate Vehicles/Drivers & Flexibility Score
 * Story 8.3: Multi-Base Optimisation & Visualisation - Added hover state for map preview
 *
 * Main drawer component for assigning vehicles/drivers to missions.
 * Opens from the right side and displays candidate list with filters.
 *
 * @see AC1: Assignment Drawer Opens on Button Click
 * @see AC6: Candidate Selection and Assignment
 * @see Story 8.3 AC2: Route Preview on Hover
 */

interface AssignmentDrawerProps {
	isOpen: boolean;
	onClose: () => void;
	missionId: string | null;
	missionSummary?: {
		pickupAddress: string;
		dropoffAddress: string;
		pickupAt: string;
	};
	onAssignmentComplete?: () => void;
	// Story 8.3: Hover state callbacks for map preview
	onCandidateHoverStart?: (candidateId: string) => void;
	onCandidateHoverEnd?: () => void;
	/** Story 8.3: Expose selected candidate ID to parent */
	onSelectedCandidateChange?: (candidateId: string | null) => void;
}

export function AssignmentDrawer({
	isOpen,
	onClose,
	missionId,
	missionSummary,
	onAssignmentComplete,
	onCandidateHoverStart,
	onCandidateHoverEnd,
	onSelectedCandidateChange,
}: AssignmentDrawerProps) {
	const t = useTranslations("dispatch.assignment");
	const { toast } = useToast();

	// State
	const [selectedCandidateId, setSelectedCandidateIdInternal] = useState<string | null>(null);
	const [sortBy, setSortBy] = useState<CandidateSortBy>("score");
	const [complianceFilter, setComplianceFilter] = useState<ComplianceFilter>("all");
	// Story 18.9: Fleet type filter state
	const [fleetTypeFilter, setFleetTypeFilter] = useState<FleetTypeFilter>("all");
	const [search, setSearch] = useState("");

	// Story 8.3: Wrap setSelectedCandidateId to notify parent
	const setSelectedCandidateId = useCallback((id: string | null) => {
		setSelectedCandidateIdInternal(id);
		onSelectedCandidateChange?.(id);
	}, [onSelectedCandidateChange]);

	// Fetch candidates
	const {
		data: candidatesData,
		isLoading: candidatesLoading,
	} = useAssignmentCandidates({
		missionId,
		enabled: isOpen && !!missionId,
	});

	// Assign mutation
	const assignMutation = useAssignMission({
		onSuccess: () => {
			toast({
				title: t("success"),
				variant: "default",
			});
			onClose();
			onAssignmentComplete?.();
		},
		onError: (error) => {
			toast({
				title: t("error"),
				description: error.message,
				variant: "error",
			});
		},
	});

	// Filter and sort candidates
	const candidates = candidatesData?.candidates;
	const filteredCandidates = useMemo(() => {
		if (!candidates) return [];

		let result = [...candidates];

		// Apply compliance filter
		if (complianceFilter === "ok") {
			result = result.filter((c) => c.compliance.status === "OK");
		} else if (complianceFilter === "warnings") {
			result = result.filter((c) => c.compliance.status !== "VIOLATION");
		}

		// Story 18.9: Apply fleet type filter
		if (fleetTypeFilter === "internal") {
			result = result.filter((c) => !c.isShadowFleet);
		} else if (fleetTypeFilter === "shadow") {
			result = result.filter((c) => c.isShadowFleet);
		}

		// Apply search filter
		if (search) {
			const searchLower = search.toLowerCase();
			result = result.filter(
				(c) =>
					c.vehicleName.toLowerCase().includes(searchLower) ||
					(c.driverName?.toLowerCase().includes(searchLower) ?? false) ||
					c.baseName.toLowerCase().includes(searchLower) ||
					// Story 18.9: Also search in subcontractor name
					(c.subcontractorName?.toLowerCase().includes(searchLower) ?? false),
			);
		}

		// Apply sorting
		result.sort((a, b) => {
			switch (sortBy) {
				case "score":
					return b.flexibilityScore - a.flexibilityScore;
				case "cost":
					return a.estimatedCost.total - b.estimatedCost.total;
				case "distance":
					return a.baseDistanceKm - b.baseDistanceKm;
				default:
					return 0;
			}
		});

		return result;
	}, [candidates, complianceFilter, fleetTypeFilter, search, sortBy]);

	// Get selected candidate
	const selectedCandidate = useMemo(() => {
		if (!selectedCandidateId || !candidates) return null;
		return candidates.find((c) => c.candidateId === selectedCandidateId) ?? null;
	}, [selectedCandidateId, candidates]);

	// Handle confirm assignment
	const handleConfirmAssignment = useCallback(() => {
		if (!missionId || !selectedCandidate) return;

		assignMutation.mutate({
			missionId,
			vehicleId: selectedCandidate.vehicleId,
			driverId: selectedCandidate.driverId ?? undefined,
		});
	}, [missionId, selectedCandidate, assignMutation]);

	// Reset state when drawer closes
	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				setSelectedCandidateId(null);
				setSearch("");
				onClose();
			}
		},
		[onClose, setSelectedCandidateId],
	);

	// Format pickup time
	const pickupTime = missionSummary?.pickupAt
		? format(new Date(missionSummary.pickupAt), "PPp")
		: "";

	return (
		<Sheet open={isOpen} onOpenChange={handleOpenChange}>
			<SheetContent
				className="w-[650px] sm:max-w-[650px] flex flex-col"
				data-testid="assignment-drawer"
			>
				<SheetHeader>
					<SheetTitle>{t("title")}</SheetTitle>
					{missionSummary && (
						<SheetDescription asChild>
							<div className="space-y-1">
								<span className="flex items-center gap-1 text-sm">
									<MapPin className="size-3.5 text-green-600" />
									<span className="truncate">{missionSummary.pickupAddress}</span>
									<ArrowRight className="size-3 text-muted-foreground flex-shrink-0" />
									<MapPin className="size-3.5 text-red-600" />
									<span className="truncate">{missionSummary.dropoffAddress}</span>
								</span>
								<span className="text-xs text-muted-foreground block">{pickupTime}</span>
							</div>
						</SheetDescription>
					)}
				</SheetHeader>

				<div className="flex-1 overflow-hidden flex flex-col py-4 gap-4">
					<CandidateFilters
						sortBy={sortBy}
						onSortChange={setSortBy}
						complianceFilter={complianceFilter}
						onComplianceFilterChange={setComplianceFilter}
						fleetTypeFilter={fleetTypeFilter}
						onFleetTypeFilterChange={setFleetTypeFilter}
						search={search}
						onSearchChange={setSearch}
					/>

					<CandidatesList
						candidates={filteredCandidates}
						selectedId={selectedCandidateId}
						onSelect={setSelectedCandidateId}
						isLoading={candidatesLoading}
						className="flex-1 max-h-[calc(100vh-18rem)]"
						onHoverStart={onCandidateHoverStart}
						onHoverEnd={onCandidateHoverEnd}
					/>
				</div>

				<SheetFooter className="gap-2 sm:gap-2">
					<Button variant="outline" onClick={onClose}>
						{t("cancel", { ns: "common" })}
					</Button>
					<Button
						onClick={handleConfirmAssignment}
						disabled={!selectedCandidateId || assignMutation.isPending}
						data-testid="confirm-assignment"
					>
						{assignMutation.isPending && (
							<Loader2 className="size-4 mr-2 animate-spin" />
						)}
						{t("confirm")}
					</Button>
				</SheetFooter>
			</SheetContent>
		</Sheet>
	);
}

export default AssignmentDrawer;
