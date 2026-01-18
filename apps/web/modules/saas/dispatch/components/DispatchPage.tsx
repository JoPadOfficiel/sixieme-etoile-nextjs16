"use client";

import { useState, useCallback, useMemo } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { TripTransparencyPanel } from "@saas/quotes/components/TripTransparencyPanel";
import { UnassignedSidebar } from "./UnassignedSidebar";
import { VehicleAssignmentPanel } from "./VehicleAssignmentPanel";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { SubcontractingSuggestions } from "./SubcontractingSuggestions";
import { MissionComplianceDetails } from "./MissionComplianceDetails";
import { StaffingCostsSection } from "./StaffingCostsSection";
import { StaffingTimeline } from "./StaffingTimeline";
import { useMissionDetail, useMissionNotesUpdate } from "../hooks/useMissions";
import { MissionNotesSection } from "./MissionNotesSection";
import { MissionContactPanel } from "./MissionContactPanel";
import { useMissionCompliance } from "../hooks/useMissionCompliance";
import { useOperatingBases } from "../hooks/useOperatingBases";
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { useRemoveSubcontracting } from "../hooks/useRemoveSubcontracting";
import type { MissionDetail, StayDayListItem } from "../types";
import type { PricingResult } from "@saas/quotes/types";
import type { CandidateBase } from "../types/assignment";

// Shell Components
import { DispatchLayout } from "./shell/DispatchLayout";
import { DispatchSidebar } from "./shell/DispatchSidebar";
import { DispatchMain } from "./shell/DispatchMain";
import { DispatchInspector } from "./shell/DispatchInspector";

/**
 * DispatchPage Component
 *
 * Story 27.1: Unified Dispatch Shell & Navigation (Cockpit)
 * Story 27.5: Unassigned Backlog Sidebar Logic
 *
 * Refactored to use a 3-column layout: Sidebar (Backlog), Main (Gantt/Map), Inspector.
 */

export function DispatchPage() {
	const [selectedMissionId, setSelectedMissionId] = useQueryState("missionId", parseAsString);
	const [isAssignmentDrawerOpen, setIsAssignmentDrawerOpen] = useState(false);
	
	// Sidebar state
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	// Story 8.3: Multi-base visualization state
	const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
	const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);

	// Fetch data
	// Note: Missions list fetching is now handled by UnassignedSidebar for the Backlog

	const { data: selectedMission, isLoading: missionDetailLoading } = useMissionDetail({
		missionId: selectedMissionId,
	});

	const { data: bases = [], isLoading: basesLoading } = useOperatingBases();

	// Fetch candidates when drawer is open
	const { data: candidatesData } = useAssignmentCandidates({
		missionId: selectedMissionId,
		enabled: isAssignmentDrawerOpen && !!selectedMissionId,
	});

	// Compliance details
	const { data: complianceDetails, isLoading: complianceLoading } = useMissionCompliance({
		missionId: selectedMissionId,
		enabled: !!selectedMissionId,
	});

	// Notes update hook
	const { updateNotes, isUpdating: isUpdatingNotes } = useMissionNotesUpdate();

	// Transform candidates to map-friendly format
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	const candidateBases = useMemo<CandidateBase[]>(() => {
		if (!candidatesData?.candidates) return [];
		return candidatesData.candidates.map((candidate) => ({
			candidateId: candidate.candidateId,
			vehicleId: candidate.vehicleId,
			baseId: candidate.baseId,
			baseName: candidate.baseName,
			latitude: candidate.baseLatitude,
			longitude: candidate.baseLongitude,
			isSelected: candidate.candidateId === selectedCandidateId,
			isHovered: candidate.candidateId === hoveredCandidateId,
			estimatedCost: candidate.estimatedCost.total,
			segments: candidate.segments,
		}));
	}, [candidatesData, selectedCandidateId, hoveredCandidateId]);

	// Handle mission selection
	const handleSelectMission = useCallback((missionId: string) => {
		setSelectedMissionId(missionId);
	}, [setSelectedMissionId]);

	// Handle assignment drawer
	const handleOpenAssignmentDrawer = useCallback(() => {
		if (selectedMissionId) {
			setIsAssignmentDrawerOpen(true);
		}
	}, [selectedMissionId]);

	const handleCloseAssignmentDrawer = useCallback(() => {
		setIsAssignmentDrawerOpen(false);
		setSelectedCandidateId(null);
		setHoveredCandidateId(null);
	}, []);

	// Handlers for candidate hover/select
	const handleCandidateHoverStart = useCallback((candidateId: string) => {
		setHoveredCandidateId(candidateId);
	}, []);

	const handleCandidateHoverEnd = useCallback(() => {
		setHoveredCandidateId(null);
	}, []);

	const handleSelectedCandidateChange = useCallback((candidateId: string | null) => {
		setSelectedCandidateId(candidateId);
	}, []);

	// Remove subcontracting
	const removeSubcontractingMutation = useRemoveSubcontracting({
		onSuccess: () => {
			if (selectedMissionId) {
				setIsAssignmentDrawerOpen(true);
			}
		},
		onError: (error) => {
			console.error("Failed to remove subcontracting:", error);
		},
	});

	const handleChangeSubcontractor = useCallback(() => {
		console.log("Change subcontractor for mission:", selectedMissionId);
	}, [selectedMissionId]);

	const handleRemoveSubcontractor = useCallback(() => {
		if (selectedMissionId) {
			removeSubcontractingMutation.mutate(selectedMissionId);
		}
	}, [selectedMissionId, removeSubcontractingMutation]);

	// Convert mission detail to PricingResult
	const pricingResult = selectedMission ? missionToPricingResult(selectedMission) : null;

	return (
		<>
			<DispatchLayout
				isSidebarCollapsed={isSidebarCollapsed}
				onSidebarToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
				
				// Left Sidebar: Backlog
				sidebar={
					<DispatchSidebar 
						isCollapsed={isSidebarCollapsed} 
						onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
					>
						<UnassignedSidebar
							selectedMissionId={selectedMissionId}
							onSelectMission={handleSelectMission}
							isCollapsed={isSidebarCollapsed}
						/>
					</DispatchSidebar>
				}
				
				// Right Inspector: Mission Details
				inspector={selectedMissionId ? (
					<DispatchInspector>
						<div className="p-4 space-y-4">
							<h3 className="font-semibold text-lg border-b pb-2">Mission Inspector</h3>
							<TripTransparencyPanel
								pricingResult={pricingResult}
								isLoading={missionDetailLoading}
							/>
							<MissionContactPanel
								mission={selectedMission || null}
								isLoading={missionDetailLoading}
							/>
							{selectedMission && (
								<MissionNotesSection
									notes={selectedMission.notes}
									missionId={selectedMissionId}
									onUpdateNotes={async (notes) => {
										await updateNotes({ quoteId: selectedMission.quoteId, notes });
									}}
									isUpdating={isUpdatingNotes}
								/>
							)}
							<StaffingCostsSection
								tripAnalysis={selectedMission?.tripAnalysis ?? null}
								isLoading={missionDetailLoading}
							/>
							{selectedMission?.tripType === "STAY" && (
								<StaffingTimeline
									stayDays={(selectedMission?.tripAnalysis as Record<string, unknown>)?.stayDays as StayDayListItem[] | undefined}
								/>
							)}
							<MissionComplianceDetails
								complianceDetails={complianceDetails ?? null}
								isLoading={complianceLoading}
							/>
							<SubcontractingSuggestions missionId={selectedMissionId} />
							<VehicleAssignmentPanel
								assignment={selectedMission?.assignment || null}
								isSubcontracted={selectedMission?.isSubcontracted ?? false}
								subcontractor={selectedMission?.subcontractor ?? null}
								isLoading={missionDetailLoading}
								onAssign={selectedMission && !selectedMission.isSubcontracted ? handleOpenAssignmentDrawer : undefined}
								onChangeSubcontractor={selectedMission && selectedMission.isSubcontracted ? handleChangeSubcontractor : undefined}
								onRemoveSubcontractor={selectedMission && selectedMission.isSubcontracted ? handleRemoveSubcontractor : undefined}
								quoteId={selectedMission?.quoteId}
							/>
						</div>
					</DispatchInspector>
				) : null}
			>
				{/* Main Content: Map / Gantt */}
				<DispatchMain 
					mission={selectedMission || null}
					bases={bases}
					isLoadingBases={basesLoading}
				/>
			</DispatchLayout>

			{/* Assignment Drawer */}
			<AssignmentDrawer
				isOpen={isAssignmentDrawerOpen}
				onClose={handleCloseAssignmentDrawer}
				missionId={selectedMissionId}
				missionSummary={
					selectedMission
						? {
								pickupAddress: selectedMission.pickupAddress,
								dropoffAddress: selectedMission.dropoffAddress,
								pickupAt: selectedMission.pickupAt,
								endCustomerName: selectedMission.endCustomer 
									? `${selectedMission.endCustomer.firstName} ${selectedMission.endCustomer.lastName}`
									: undefined,
							}
						: undefined
				}
				onCandidateHoverStart={handleCandidateHoverStart}
				onCandidateHoverEnd={handleCandidateHoverEnd}
				onSelectedCandidateChange={handleSelectedCandidateChange}
			/>
		</>
	);
}

// Helper to convert mission to pricing result
function missionToPricingResult(mission: MissionDetail): PricingResult | null {
	if (!mission.tripAnalysis) return null;

	const tripAnalysis = mission.tripAnalysis as Record<string, unknown>;

	// Helper to ensure number
	const num = (v: unknown) => (typeof v === 'number' ? v : 0);

	return {
		price: mission.finalPrice,
		internalCost: mission.internalCost || 0,
		marginPercent: mission.marginPercent || 0,
		pricingMode: mission.pricingMode,
		tripAnalysis: {
			totalDistanceKm: num(tripAnalysis.totalDistanceKm),
			totalDurationMinutes: num(tripAnalysis.totalDurationMinutes),
			totalInternalCost: num(tripAnalysis.totalInternalCost) || mission.internalCost || 0,
			routingSource: (tripAnalysis.routingSource as string) || "ESTIMATE",
			segments: (tripAnalysis.segments as Record<string, unknown>) || {},
			costBreakdown: (tripAnalysis.costBreakdown as Record<string, unknown>) || {},
			vehicleSelection: tripAnalysis.vehicleSelection as Record<string, unknown> | undefined,
		},
		matchedGrid: null,
		appliedRules: [],
		complianceResult: (tripAnalysis.complianceResult as Record<string, unknown>) || null,
	} as unknown as PricingResult;
}

export default DispatchPage;
