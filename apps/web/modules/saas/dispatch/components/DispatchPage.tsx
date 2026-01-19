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
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { useMissionDetail } from "../hooks/useMissions";
import { useOperatingBases } from "../hooks/useOperatingBases";
import type { CandidateBase } from "../types/assignment";
import type { MissionListItem } from "../types";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { UnassignedSidebar } from "./UnassignedSidebar";
import { MissionRow } from "./MissionRow";
import { useToast } from "@ui/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import { checkCompliance, type DriverCalendarEvent } from "../utils/checkCompliance";
import type { GanttDriver } from "./gantt/types";

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

	// Fetch drivers for Gantt (Story 27.9) and Calendar Events (Story 27.10)
	const { data: driversData } = useQuery({
		queryKey: ["fleet-drivers"],
		queryFn: async () => {
			const res = await apiClient.vtc.drivers.$get({ query: { isActive: "true", limit: "100" } });
			if (!res.ok) throw new Error("Failed to fetch drivers");
			return res.json();
		},
	});

	// Mock Calendar Events (Story 27.10)
	const mockCalendarEvents: DriverCalendarEvent[] = useMemo(() => {
		if (!driversData?.data) return [];
		// Assign a holiday to the first driver for testing
		const firstDriver = driversData.data[0];
		if (!firstDriver) return [];
		
		return [{
			id: "evt-mock-1",
			driverId: firstDriver.id,
			startAt: new Date(), // Today
			endAt: new Date(new Date().getTime() + 24 * 3600000), // Tomorrow
			type: "HOLIDAY"
		}];
	}, [driversData]);

	const drivers = useMemo<GanttDriver[]>(() => {
		if (!driversData?.data) return [];
		return driversData.data.map((d: any) => ({
			id: d.id,
			name: `${d.firstName} ${d.lastName}`,
			avatar: undefined,
			status: d.isActive ? "AVAILABLE" : "UNAVAILABLE", 
			missions: [], // TODO: Populate with real missions
		}));
	}, [driversData]);

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

	// Story 27.9: Pre-selected driver for Assignment Drawer
	const [preSelectedDriverId, setPreSelectedDriverId] = useState<string | null>(null);

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
		setPreSelectedDriverId(null);
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
	const { toast } = useToast();
	const [activeDragMission, setActiveDragMission] = useState<MissionListItem | null>(null);

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

			// Story 27.10: Check Compliance
			if (active.data.current?.mission) {
				const mission = active.data.current.mission as MissionListItem;
				
				// Filter events for this driver
				const driverEvents = mockCalendarEvents.filter(e => e.driverId === driverId);
				// Get existing missions (Mocking empty for now as they are not easily available in this context yet)
				const existingMissions: MissionListItem[] = []; 

				const compliance = checkCompliance(mission, driverId, existingMissions, driverEvents);

				if (!compliance.valid && compliance.level === "BLOCK") {
					toast({
						title: "Impossible d'assigner",
						description: compliance.reason,
						variant: "destructive",
					});
					return; // Block assignment
				}

				if (compliance.valid && compliance.level === "WARN") {
					toast({
						title: "Attention",
						description: compliance.reason,
						variant: "warning", // Ensure variant exists in toast or use default
						className: "bg-yellow-100 border-yellow-500 text-yellow-900" 
					});
					// Proceed but warn
				}
			}

			// Story 27.9: Open assignment drawer with pre-selected driver
			setSelectedMissionId(missionId);
			setPreSelectedDriverId(driverId);
			setIsAssignmentDrawerOpen(true);
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
					drivers={drivers}
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
				preSelectedDriverId={preSelectedDriverId}
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
