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
import { MapPin, ArrowRight, Loader2, Users, AlertTriangle, User } from "lucide-react";
import { Badge } from "@ui/components/badge";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Label } from "@ui/components/label";
import { useTranslations } from "next-intl";
import { format } from "date-fns";
import { useToast } from "@ui/hooks/use-toast";
import { CandidateFilters } from "./CandidateFilters";
import { CandidatesList } from "./CandidatesList";
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { useAssignMission } from "../hooks/useAssignMission";
import { useSubcontractMission } from "../hooks/useSubcontracting";
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
		endCustomerName?: string;
	};
	onAssignmentComplete?: () => void;
	// Story 8.3: Hover state callbacks for map preview
	onCandidateHoverStart?: (candidateId: string) => void;
	onCandidateHoverEnd?: () => void;
	/** Story 8.3: Expose selected candidate ID to parent */
	onSelectedCandidateChange?: (candidateId: string | null) => void;
	/** Story 27.9: Pre-filter candidates by driver ID (from drag & drop) */
	preSelectedDriverId?: string | null;
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
	preSelectedDriverId,
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
	// Story 20.8: Second driver for RSE double crew missions
	const [secondDriverId, setSecondDriverId] = useState<string | null>(null);

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

	// Subcontract mutation
	const subcontractMutation = useSubcontractMission();

	// Filter and sort candidates
	const candidates = candidatesData?.candidates;
	const filteredCandidates = useMemo(() => {
		if (!candidates) return [];

		let result = [...candidates];

		// Story 27.9: Apply pre-selected driver filter if present
		if (preSelectedDriverId) {
			result = result.filter((c) => c.driverId === preSelectedDriverId);
		}

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
					return (a.estimatedCost?.total ?? 0) - (b.estimatedCost?.total ?? 0);
				case "distance":
					return (a.baseDistanceKm ?? 0) - (b.baseDistanceKm ?? 0);
				default:
					return 0;
			}
		});

		return result;
	}, [candidates, complianceFilter, fleetTypeFilter, search, sortBy, preSelectedDriverId]);

	// Story 27.9: Get driver name for empty state messaging
	const preSelectedDriverName = useMemo(() => {
		if (!preSelectedDriverId || !candidates) return null;
		return candidates.find((c) => c.driverId === preSelectedDriverId)?.driverName ?? null;
	}, [preSelectedDriverId, candidates]);

	// Get selected candidate
	const selectedCandidate = useMemo(() => {
		if (!selectedCandidateId || !candidates) return null;
		return candidates.find((c) => c.candidateId === selectedCandidateId) ?? null;
	}, [selectedCandidateId, candidates]);

	// Story 20.8: Check if mission requires double crew from tripAnalysis
	const requiresDoubleCrew = useMemo(() => {
		const mission = candidatesData?.mission;
		if (!mission) return false;
		// Check compliancePlan.planType from tripAnalysis
		const tripAnalysis = mission.tripAnalysis;
		return tripAnalysis?.compliancePlan?.planType === "DOUBLE_CREW";
	}, [candidatesData]);

	// Story 20.8: Get available drivers for second driver selection (excluding primary driver)
	// FIXED: Filter by required license for the selected vehicle
	const availableSecondDrivers = useMemo(() => {
		if (!candidates || !selectedCandidate) return [];
		
		// Get the required license from the selected candidate's vehicle
		const requiredLicenses = selectedCandidate.driverLicenses || [];
		
		// Get unique drivers from candidates, excluding the selected primary driver
		// IMPORTANT: Only show drivers who have the required license for this vehicle
		const driversMap = new Map<string, { id: string; name: string }>();
		for (const c of candidates) {
			if (c.driverId && c.driverId !== selectedCandidate.driverId && !c.isShadowFleet) {
				// Check if this driver has the required license
				const hasRequiredLicense = requiredLicenses.length === 0 || 
					c.driverLicenses.some(license => requiredLicenses.includes(license));
				
				if (hasRequiredLicense) {
					driversMap.set(c.driverId, { id: c.driverId, name: c.driverName ?? "Unknown" });
				}
			}
		}
		return Array.from(driversMap.values());
	}, [candidates, selectedCandidate]);

	// Handle confirm assignment
	// Story 20.8: Include secondDriverId for RSE double crew missions
	// Story 18.9: Handle Shadow Fleet assignment (Subcontracting)
	const handleConfirmAssignment = useCallback(() => {
		if (!missionId || !selectedCandidate) return;

		if (selectedCandidate.isShadowFleet) {
			// Subcontracting flow
			if (!selectedCandidate.subcontractorId) {
				toast({
					title: t("error"),
					description: "Invalid subcontractor data",
					variant: "error",
				});
				return;
			}

			subcontractMutation.mutate({
				missionId,
				data: {
					subcontractorId: selectedCandidate.subcontractorId,
					agreedPrice: selectedCandidate.estimatedCost.total ?? 0, // Use estimated/indicative price
					notes: "Assigned via Dispatch",
				},
			}, {
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
				}
			});
		} else {
			// Internal assignment flow
			const payload = {
				missionId,
				vehicleId: selectedCandidate.vehicleId,
				driverId: selectedCandidate.driverId || undefined,
				// Story 20.8: Pass second driver if selected
				secondDriverId: secondDriverId || undefined,
			};
			assignMutation.mutate(payload);
		}
	}, [missionId, selectedCandidate, secondDriverId, assignMutation, subcontractMutation, toast, t, onClose, onAssignmentComplete]);

	const isPending = assignMutation.isPending || subcontractMutation.isPending;

	// Reset state when drawer closes
	const handleOpenChange = useCallback(
		(open: boolean) => {
			if (!open) {
				setSelectedCandidateId(null);
				setSecondDriverId(null);
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
				className="w-full sm:!max-w-none sm:!w-full lg:!max-w-[50vw] lg:!w-[50vw] flex flex-col"
				data-testid="assignment-drawer"
			>
				<SheetHeader>
					<div className="flex items-center gap-2">
						<SheetTitle>{t("title")}</SheetTitle>
						{/* Story 20.8: Show double crew badge if required */}
						{requiresDoubleCrew && (
							<Badge variant="warning" className="flex items-center gap-1">
								<Users className="size-3" />
								{t("doubleCrewRequired")}
							</Badge>
						)}
					</div>
					{missionSummary && (
						<SheetDescription asChild>
							<div className="space-y-1">
								{missionSummary.endCustomerName && (
									<div className="flex items-center gap-1.5 text-foreground font-medium mb-1">
										<User className="size-3.5 text-muted-foreground" />
										<span>{missionSummary.endCustomerName}</span>
									</div>
								)}
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
						preSelectedDriverName={preSelectedDriverName}
					/>

					{/* Story 20.8: Second driver selection for double crew missions */}
					{requiresDoubleCrew && selectedCandidate && !selectedCandidate.isShadowFleet && (
						<div className="border rounded-lg p-4 bg-amber-50 dark:bg-amber-950/20">
							<div className="flex items-center gap-2 mb-3">
								<Users className="size-4 text-amber-600" />
								<Label className="font-medium text-amber-800 dark:text-amber-200">
									{t("selectSecondDriver")}
								</Label>
							</div>
							<Select
								value={secondDriverId ?? ""}
								onValueChange={(value) => setSecondDriverId(value || null)}
							>
								<SelectTrigger className="w-full">
									<SelectValue placeholder={t("selectSecondDriverPlaceholder")} />
								</SelectTrigger>
								<SelectContent>
									{availableSecondDrivers.map((driver) => (
										<SelectItem key={driver.id} value={driver.id}>
											{driver.name}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
							{!secondDriverId && (
								<p className="text-xs text-amber-600 mt-2 flex items-center gap-1">
									<AlertTriangle className="size-3" />
									{t("secondDriverWarning")}
								</p>
							)}
						</div>
					)}
				</div>

				<SheetFooter className="gap-2 sm:gap-2">
					<Button variant="outline" onClick={onClose}>
						{t("cancel", { ns: "common" })}
					</Button>
					<Button
						onClick={handleConfirmAssignment}
						disabled={!selectedCandidateId || isPending}
						data-testid="confirm-assignment"
					>
						{isPending && (
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
