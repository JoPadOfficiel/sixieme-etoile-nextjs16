"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQueryState, parseAsString } from "nuqs";
import { useTranslations } from "next-intl";
import { TripTransparencyPanel } from "@saas/quotes/components/TripTransparencyPanel";
import { useVehicleCategories } from "@saas/quotes/hooks/useVehicleCategories";
import { MissionsList } from "./MissionsList";
import { MissionsFilters } from "./MissionsFilters";
import { VehicleAssignmentPanel } from "./VehicleAssignmentPanel";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { EmptyLegsList } from "./EmptyLegsList";
import { SubcontractingSuggestions } from "./SubcontractingSuggestions";
import { MissionComplianceDetails } from "./MissionComplianceDetails";
import { StaffingCostsSection } from "./StaffingCostsSection";
import { StaffingTimeline } from "./StaffingTimeline";
import { useMissions, useMissionDetail, useMissionNotesUpdate } from "../hooks/useMissions";
import { MissionNotesSection } from "./MissionNotesSection";
import { MissionContactPanel } from "./MissionContactPanel";
import { useMissionCompliance } from "../hooks/useMissionCompliance";
import { useOperatingBases } from "../hooks/useOperatingBases";
import { useAssignmentCandidates } from "../hooks/useAssignmentCandidates";
import { useRemoveSubcontracting } from "../hooks/useRemoveSubcontracting";
import type { MissionsFilters as Filters, MissionDetail, StayDayListItem } from "../types";
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
 * Refactored to use a 3-column layout: Sidebar (Backlog), Main (Gantt/Map), Inspector.
 *
 * @see Story 27.1
 */

export function DispatchPage() {
	const t = useTranslations("dispatch");
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Parse filters from URL
	const initialFilters: Filters = {
		dateFrom: searchParams.get("dateFrom") || undefined,
		dateTo: searchParams.get("dateTo") || undefined,
		vehicleCategoryId: searchParams.get("vehicleCategoryId") || undefined,
		clientType: (searchParams.get("clientType") as Filters["clientType"]) || "ALL",
		search: searchParams.get("search") || undefined,
	};

	const [filters, setFilters] = useState<Filters>(initialFilters);
	const [selectedMissionId, setSelectedMissionId] = useQueryState("missionId", parseAsString);
	const [isAssignmentDrawerOpen, setIsAssignmentDrawerOpen] = useState(false);
	
	// Sidebar state
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	// Story 8.3: Multi-base visualization state
	const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(null);
	const [hoveredCandidateId, setHoveredCandidateId] = useState<string | null>(null);

	// Fetch data
	const { data: missionsData, isLoading: missionsLoading } = useMissions({
		filters,
		page: 1,
		limit: 50,
	});

	const { data: selectedMission, isLoading: missionDetailLoading } = useMissionDetail({
		missionId: selectedMissionId,
	});

	const { data: bases = [], isLoading: basesLoading } = useOperatingBases();
	const { categories: vehicleCategories = [] } = useVehicleCategories();

	// Fetch candidates when drawer is open
	const { data: candidatesData, isLoading: candidatesLoading } = useAssignmentCandidates({
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

	// Update URL when filters change
	const handleFiltersChange = useCallback(
		(newFilters: Filters) => {
			setFilters(newFilters);
			const params = new URLSearchParams();
			if (newFilters.dateFrom) params.set("dateFrom", newFilters.dateFrom);
			if (newFilters.dateTo) params.set("dateTo", newFilters.dateTo);
			if (newFilters.vehicleCategoryId) params.set("vehicleCategoryId", newFilters.vehicleCategoryId);
			if (newFilters.clientType && newFilters.clientType !== "ALL") {
				params.set("clientType", newFilters.clientType);
			}
			if (newFilters.search) params.set("search", newFilters.search);

			const queryString = params.toString();
			router.replace(`${pathname}${queryString ? `?${queryString}` : ""}`, { scroll: false });
		},
		[pathname, router]
	);

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
	const missions = missionsData?.data || [];

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
						<div className="flex flex-col h-full p-2 space-y-4">
							<div className="flex-shrink-0">
								<h2 className="text-sm font-semibold mb-2 px-2 uppercase tracking-wider text-muted-foreground">
									{t("title")}
								</h2>
								<MissionsFilters
									filters={filters}
									onFiltersChange={handleFiltersChange}
									vehicleCategories={vehicleCategories}
								/>
							</div>
							<div className="flex-1 overflow-y-auto space-y-3 min-h-0">
								<MissionsList
									missions={missions}
									selectedMissionId={selectedMissionId}
									onSelectMission={handleSelectMission}
									isLoading={missionsLoading}
								/>
								<EmptyLegsList />
							</div>
						</div>
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
