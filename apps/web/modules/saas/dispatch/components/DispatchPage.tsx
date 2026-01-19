"use client";

import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { useToast } from "@ui/hooks/use-toast";
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { useMissionDetail } from "../hooks/useMissions";
import { useOperatingBases } from "../hooks/useOperatingBases";
import { useAssignMission } from "../hooks/useAssignMission";
import type { CandidateBase } from "../types/assignment";
import type { MissionListItem } from "../types";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { UnassignedSidebar } from "./UnassignedSidebar";
import { MissionRow } from "./MissionRow";

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

	// DnD State
	const [activeDragMission, setActiveDragMission] = useState<MissionListItem | null>(null);
	const { toast } = useToast();

	// Story 27.9: Assignment Mutation
	const assignMissionMutation = useAssignMission({
		onSuccess: () => toast({ title: "Mission assigned" }),
		onError: () =>
			toast({ title: "Assignment failed", variant: "error" }),
	});

	const sensors = useSensors(
		useSensor(MouseSensor, {
			activationConstraint: {
				distance: 8,
			},
		}),
		useSensor(TouchSensor),
	);

	const handleDragStart = (event: DragStartEvent) => {
		if (event.active.data.current?.type === "MISSION") {
			setActiveDragMission(
				event.active.data.current.mission as MissionListItem,
			);
		}
	};

	const handleDragEnd = (event: DragEndEvent) => {
		const { active, over } = event;
		setActiveDragMission(null);

		if (over && over.data.current?.type === "DRIVER") {
			const missionId = String(active.id).replace("mission-", "");
			const driverId = over.data.current.driverId;

			assignMissionMutation.mutate({
				missionId,
				driverId,
				vehicleId: "temp-vehicle-id", // Placeholder until we have vehicle selection logic
			});
		}
	};

	return (
		<DndContext
			sensors={sensors}
			onDragStart={handleDragStart}
			onDragEnd={handleDragEnd}
		>
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

			<DragOverlay>
				{activeDragMission ? (
					<div className="w-[350px] opacity-90 cursor-grabbing bg-background shadow-xl rounded-lg border pointer-events-none">
						<MissionRow
							mission={activeDragMission}
							isSelected={false}
							onSelect={() => {}}
						/>
					</div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

// Helper to ensure number
// removed


export default DispatchPage;
