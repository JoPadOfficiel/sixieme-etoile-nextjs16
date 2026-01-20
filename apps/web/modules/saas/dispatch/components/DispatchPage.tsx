"use client";

import {
	DndContext,
	type DragEndEvent,
	DragOverlay,
	type DragStartEvent,
	MouseSensor,
	TouchSensor,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import { parseAsString, useQueryState } from "nuqs";
import { useCallback, useMemo, useState } from "react";
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { DISPATCH_QUERY_OPTIONS } from "../hooks/useDispatchRealtime";
import { useMissionDetail } from "../hooks/useMissions";
import { useOperatingBases } from "../hooks/useOperatingBases";
import type { MissionListItem } from "../types";
import type { CandidateBase } from "../types/assignment";
import {
	type DriverCalendarEvent,
	checkCompliance,
} from "../utils/checkCompliance";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { MissionRow } from "./MissionRow";
import { UnassignedSidebar } from "./UnassignedSidebar";
import type { GanttDriver } from "./gantt/types";

import { InspectorPanel } from "./InspectorPanel";
// Shell Components
import { DispatchLayout } from "./shell/DispatchLayout";
import { DispatchMain } from "./shell/DispatchMain";
import { DispatchSidebar } from "./shell/DispatchSidebar";

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

	/**
	 * Fetch drivers with calendar events and missions for Gantt and Compliance.
	 *
	 * Story 27.9, 27.10, 27.13
	 *
	 * NOTE: This query uses a DIFFERENT key than useDriversForGantt hook because:
	 * - This query includes calendar events (includeEvents: true)
	 * - This query includes missions per driver (includeMissions: true)
	 * - useDriversForGantt is a simpler query without these inclusions
	 *
	 * Both share the same polling configuration via DISPATCH_QUERY_OPTIONS.
	 */
	const DISPATCH_DRIVERS_QUERY_KEY = [
		"dispatch-drivers",
		"with-events-missions",
	] as const;

	const { data: driversData } = useQuery<any>({
		queryKey: DISPATCH_DRIVERS_QUERY_KEY,
		queryFn: async () => {
			const res = await apiClient.vtc.drivers.$get({
				query: {
					isActive: "true",
					limit: "100",
					includeEvents: "true",
					includeMissions: "true",
				},
			});
			if (!res.ok) throw new Error("Failed to fetch drivers");
			return res.json() as Promise<any>;
		},
		...DISPATCH_QUERY_OPTIONS,
	});

	// Real Calendar Events (Story 27.10)
	const calendarEvents: DriverCalendarEvent[] = useMemo(() => {
		if (!driversData?.data) return [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return driversData.data
			.flatMap((d: any) => d.driverCalendarEvents || [])
			.map((e: any) => ({
				id: e.id,
				driverId: e.driverId,
				startAt: new Date(e.startAt),
				endAt: new Date(e.endAt),
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				type: e.eventType as any,
			}));
	}, [driversData]);

	const drivers = useMemo<GanttDriver[]>(() => {
		if (!driversData?.data) return [];
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		return driversData.data.map((d: any) => ({
			id: d.id,
			name: `${d.firstName} ${d.lastName}`,
			avatar: undefined,
			status: d.isActive ? "AVAILABLE" : "UNAVAILABLE",
			// Map API missions to MissionListItem subset needed for Gantt & Compliance
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			missions: (d.missions || []).map((m: any) => {
				const startAt = new Date(m.startAt);
				const endAt = m.endAt
					? new Date(m.endAt)
					: new Date(startAt.getTime() + 60 * 60000); // Default 1h if null

				const missionPartial: any = {
					id: m.id,
					startAt, // Required by GanttMission
					endAt, // Required by GanttMission
					pickupAt: m.startAt, // Keep raw string for other uses if needed
					// We don't have all details here, but enough for Gantt
					title: m.title || "Mission",
					status: m.status,
					clientName: "Client", // TODO: Need client name in API
					type: "TRANS", // Default type
				};

				// Determine conflict (Visual feedback AC4)
				// We need to check against OTHER missions and events for this driver
				// This is "display-time" check, slightly expensive but necessary for red borders
				const otherMissions = (d.missions || [])
					.filter((om: any) => om.id !== m.id)
					.map((om: any) => ({
						id: om.id,
						pickupAt: om.startAt,
					}));

				const driverEvents = (d.driverCalendarEvents || []).map((e: any) => ({
					id: e.id,
					driverId: d.id,
					startAt: e.startAt,
					endAt: e.endAt,
					type: e.eventType,
				}));

				const compliance = checkCompliance(
					missionPartial,
					d.id,
					otherMissions,
					driverEvents,
				);

				return {
					...missionPartial,
					isConflict: !compliance.valid || compliance.level !== "OK", // Red border if BLOCK or WARN
				};
			}),
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
	const [preSelectedDriverId, setPreSelectedDriverId] = useState<string | null>(
		null,
	);

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
	const [activeDragMission, setActiveDragMission] =
		useState<MissionListItem | null>(null);

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
				const driverEvents = calendarEvents.filter(
					(e) => e.driverId === driverId,
				);

				// Get existing missions from the drivers list (which now uses real data)
				const targetDriver = drivers.find((d) => d.id === driverId);
				const existingMissions: MissionListItem[] =
					(targetDriver?.missions as any) || [];

				const compliance = checkCompliance(
					mission,
					driverId,
					existingMissions,
					driverEvents,
				);

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
						className: "bg-yellow-100 border-yellow-500 text-yellow-900",
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
					<div className="pointer-events-none w-[350px] cursor-grabbing rounded-lg border bg-background opacity-90 shadow-xl">
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
