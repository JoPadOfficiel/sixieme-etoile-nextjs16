"use client";

import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { useMissionDetail } from "../hooks/useMissions";
import { useOperatingBases } from "../hooks/useOperatingBases";
import type { CandidateBase } from "../types/assignment";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { UnassignedSidebar } from "./UnassignedSidebar";

// Shell Components
import { DispatchLayout } from "./shell/DispatchLayout";
import { DispatchMain } from "./shell/DispatchMain";
import { DispatchSidebar } from "./shell/DispatchSidebar";
import { InspectorPanel } from "./InspectorPanel";

/**
 * DispatchPage Component
 *
 * Story 27.1: Unified Dispatch Shell & Navigation (Cockpit)
 * Story 27.5: Unassigned Backlog Sidebar Logic
 *
 * Refactored to use a 3-column layout: Sidebar (Backlog), Main (Gantt/Map), Inspector.
 */

export function DispatchPage() {
	const [selectedMissionId, setSelectedMissionId] = useQueryState(
		"missionId",
		parseAsString,
	);
	const [isAssignmentDrawerOpen, setIsAssignmentDrawerOpen] = useState(false);

	// Sidebar state
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	// Story 8.3: Multi-base visualization state
	const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
		null,
	);
	const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(
		null,
	);

	// Fetch data
	// Note: Missions list fetching is now handled by UnassignedSidebar for the Backlog
	const { data: selectedMission } = useMissionDetail({
		missionId: selectedMissionId,
	});

	const { data: bases = [], isLoading: basesLoading } = useOperatingBases();

	// Fetch candidates when drawer is open
	const { data: candidatesData } = useAssignmentCandidates({
		missionId: selectedMissionId,
		enabled: isAssignmentDrawerOpen && !!selectedMissionId,
	});

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
	const handleSelectMission = useCallback(
		(missionId: string | null) => {
			setSelectedMissionId(missionId);
		},
		[setSelectedMissionId],
	);

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

	const handleSelectedCandidateChange = useCallback(
		(candidateId: string | null) => {
			setSelectedCandidateId(candidateId);
		},
		[],
	);

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
				inspector={null} // Substituted by InspectorPanel sheet
			>
				{/* Main Content: Map / Gantt */}
				<DispatchMain
					mission={selectedMission || null}
					bases={bases}
					isLoadingBases={basesLoading}
					onMissionSelect={handleSelectMission}
				/>
			</DispatchLayout>

			{/* Inspector Sheet */}
			<InspectorPanel 
				missionId={selectedMissionId} 
				onClose={() => setSelectedMissionId(null)}
				onOpenAssignment={handleOpenAssignmentDrawer}
			/>

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

// Helper to ensure number
// removed


export default DispatchPage;
