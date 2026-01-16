"use client";

import { useState, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useQueryState, parseAsString } from "nuqs";
import { useTranslations } from "next-intl";
import { TripTransparencyPanel } from "@saas/quotes/components/TripTransparencyPanel";
import { useVehicleCategories } from "@saas/quotes/hooks/useVehicleCategories";
import { MissionsList } from "./MissionsList";
import { MissionsFilters } from "./MissionsFilters";
import { DispatchMapGoogle } from "./DispatchMapGoogle";
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
import { useAssignMission } from "../hooks/useAssignMission";
import { useRemoveSubcontracting } from "../hooks/useRemoveSubcontracting";
import type { MissionsFilters as Filters, MissionDetail, StayDayListItem } from "../types";
import type { PricingResult } from "@saas/quotes/types";
import type { CandidateBase } from "../types/assignment";

/**
 * DispatchPage Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 * Story 8.3: Multi-Base Optimisation & Visualisation
 * Story 8.5: Model & Surface Empty-Leg Opportunities
 *
 * Main 3-zone layout for the Dispatch screen:
 * - Left: Missions list with filters + Empty-leg opportunities
 * - Right-top: Map showing route and bases
 * - Right-bottom: TripTransparencyPanel + VehicleAssignmentPanel
 *
 * @see UX Spec 8.8 Dispatch Screen
 * @see AC1: Dispatch Screen Layout
 * @see Story 8.3: Multi-base visualization on map
 * @see Story 8.5: Empty-leg opportunities display
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
	
	// Map height state for scroll effect - binary toggle (expanded or collapsed)
	const MAP_HEIGHT_EXPANDED = 320; // Full height when at top
	const MAP_HEIGHT_COLLAPSED = 120; // Small height when scrolling
	
	const [isMapCollapsed, setIsMapCollapsed] = useState(false);
	const detailsContainerRef = useRef<HTMLDivElement>(null);

	const handleDetailsScroll = () => {
		if (detailsContainerRef.current) {
			const scrollTop = detailsContainerRef.current.scrollTop;
			// Binary toggle: collapsed if scrolled, expanded if at top
			setIsMapCollapsed(scrollTop > 10); // Small threshold to avoid jitter
		}
	};

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

	// Story 8.3: Fetch candidates when drawer is open
	const { data: candidatesData, isLoading: candidatesLoading } = useAssignmentCandidates({
		missionId: selectedMissionId,
		enabled: isAssignmentDrawerOpen && !!selectedMissionId,
	});

	// Story 5.6: Fetch compliance details when mission is selected
	const { data: complianceDetails, isLoading: complianceLoading } = useMissionCompliance({
		missionId: selectedMissionId,
		enabled: !!selectedMissionId,
	});

	// Story 22.11: Notes update hook
	const { updateNotes, isUpdating: isUpdatingNotes } = useMissionNotesUpdate();

	// Story 8.3: Transform candidates to map-friendly format
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

	// Story 8.3: Get active candidate for route display
	const activeCandidate = useMemo(() => {
		const activeId = hoveredCandidateId ?? selectedCandidateId;
		if (!activeId || !candidatesData?.candidates) return null;
		return candidatesData.candidates.find((c) => c.candidateId === activeId) ?? null;
	}, [candidatesData, hoveredCandidateId, selectedCandidateId]);

	// Story 8.3: Determine route display mode
	const isPreview = hoveredCandidateId !== null && selectedCandidateId !== hoveredCandidateId;
	const showApproach = activeCandidate !== null;
	const showReturn = selectedCandidateId !== null && !isPreview;

	// Update URL when filters change
	const handleFiltersChange = useCallback(
		(newFilters: Filters) => {
			setFilters(newFilters);

			// Update URL params
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

	// Handle assignment drawer (Story 8.2)
	const handleOpenAssignmentDrawer = useCallback(() => {
		if (selectedMissionId) {
			setIsAssignmentDrawerOpen(true);
		}
	}, [selectedMissionId]);

	const handleCloseAssignmentDrawer = useCallback(() => {
		setIsAssignmentDrawerOpen(false);
		// Story 8.3: Reset candidate selection when drawer closes
		setSelectedCandidateId(null);
		setHoveredCandidateId(null);
	}, []);

	// Story 8.3: Handlers for candidate hover/select from drawer
	const handleCandidateHoverStart = useCallback((candidateId: string) => {
		setHoveredCandidateId(candidateId);
	}, []);

	const handleCandidateHoverEnd = useCallback(() => {
		setHoveredCandidateId(null);
	}, []);

	const handleSelectedCandidateChange = useCallback((candidateId: string | null) => {
		setSelectedCandidateId(candidateId);
	}, []);

	// Story 8.3: Handler for candidate select from map
	const handleMapCandidateSelect = useCallback((vehicleId: string) => {
		setSelectedCandidateId((prev) => (prev === vehicleId ? null : vehicleId));
	}, []);

	// Remove subcontracting mutation
	const removeSubcontractingMutation = useRemoveSubcontracting({
		onSuccess: () => {
			// Open assignment drawer after removing subcontractor
			if (selectedMissionId) {
				setIsAssignmentDrawerOpen(true);
			}
		},
		onError: (error) => {
			console.error("Failed to remove subcontracting:", error);
		},
	});

	// Handlers for subcontractor management
	const handleChangeSubcontractor = useCallback(() => {
		// TODO: Open subcontractor selection dialog
		console.log("Change subcontractor for mission:", selectedMissionId);
	}, [selectedMissionId]);

	const handleRemoveSubcontractor = useCallback(() => {
		if (selectedMissionId) {
			removeSubcontractingMutation.mutate(selectedMissionId);
		}
	}, [selectedMissionId, removeSubcontractingMutation]);

	// Convert mission detail to PricingResult for TripTransparencyPanel
	const pricingResult = selectedMission ? missionToPricingResult(selectedMission) : null;

	const missions = missionsData?.data || [];

	return (
		<div className="h-screen flex gap-4 p-4 overflow-hidden">
			{/* Left Panel - Missions List with independent scroll */}
			<div className="w-1/3 flex flex-col h-full" data-testid="dispatch-left-panel">
				{/* Header - always visible */}
				<div className="flex-shrink-0 pb-4">
					<h1 className="text-2xl font-bold tracking-tight mb-1">{t("title")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("subtitle", { count: missions.length })}
					</p>
				</div>

				{/* Filters - always visible */}
				<div className="flex-shrink-0 pb-4">
					<MissionsFilters
						filters={filters}
						onFiltersChange={handleFiltersChange}
						vehicleCategories={vehicleCategories}
					/>
				</div>

				{/* Scrollable missions list */}
				<div className="flex-1 overflow-y-auto min-h-0 space-y-4">
					<MissionsList
						missions={missions}
						selectedMissionId={selectedMissionId}
						onSelectMission={handleSelectMission}
						isLoading={missionsLoading}
					/>

					{/* Story 8.5: Empty-Leg Opportunities - compact */}
					<EmptyLegsList />
				</div>
			</div>

			{/* Right Panel - Map fixed + scrollable details */}
			<div className="w-2/3 flex flex-col h-full" data-testid="dispatch-right-panel">
				{/* Map - binary toggle height: full when at top, small when scrolled */}
				<div 
					className="flex-shrink-0 overflow-hidden transition-[height] duration-200 ease-in-out" 
					style={{ height: isMapCollapsed ? `${MAP_HEIGHT_COLLAPSED}px` : `${MAP_HEIGHT_EXPANDED}px` }}
				>
					<DispatchMapGoogle
						mission={selectedMission || null}
						bases={bases}
						isLoading={basesLoading}
						// Story 8.3: Multi-base visualization props
						candidateBases={isAssignmentDrawerOpen ? candidateBases : undefined}
						selectedCandidateId={selectedCandidateId}
						hoveredCandidateId={hoveredCandidateId}
						activeSegments={activeCandidate?.segments}
						showApproach={showApproach}
						showReturn={showReturn}
						isPreview={isPreview}
						isLoadingRoutes={candidatesLoading}
						onCandidateSelect={handleMapCandidateSelect}
						onCandidateHoverStart={handleCandidateHoverStart}
						onCandidateHoverEnd={handleCandidateHoverEnd}
					/>
				</div>

				{/* Scrollable details section */}
				<div 
					ref={detailsContainerRef}
					onScroll={handleDetailsScroll}
					className="flex-1 overflow-y-auto min-h-0 pt-4"
				>
					<div className="flex flex-col gap-4">
						<TripTransparencyPanel
							pricingResult={pricingResult}
							isLoading={missionDetailLoading}
						/>
						{/* Story 24.7: Mission Contact Panel (Agency + EndCustomer) */}
						{selectedMissionId && (
							<MissionContactPanel
								mission={selectedMission || null}
								isLoading={missionDetailLoading}
							/>
						)}
						{/* Story 22.11: Mission Notes Section */}
						{selectedMissionId && selectedMission && (
							<MissionNotesSection
								notes={selectedMission.notes}
								missionId={selectedMissionId}
								onUpdateNotes={async (notes) => {
									await updateNotes({ quoteId: selectedMission.quoteId, notes });
								}}
								isUpdating={isUpdatingNotes}
							/>
						)}
						{/* Story 21.5: RSE Staffing Costs Section */}
						{selectedMissionId && (
							<StaffingCostsSection
								tripAnalysis={selectedMission?.tripAnalysis ?? null}
								isLoading={missionDetailLoading}
							/>
						)}
						{/* Story 22.9: Staffing Timeline for STAY missions */}
						{selectedMissionId && selectedMission?.tripType === "STAY" && (
							<StaffingTimeline
								stayDays={(selectedMission?.tripAnalysis as Record<string, unknown>)?.stayDays as StayDayListItem[] | undefined}
							/>
						)}
						{/* Story 5.6: Compliance Details */}
						{selectedMissionId && (
							<MissionComplianceDetails
								complianceDetails={complianceDetails ?? null}
								isLoading={complianceLoading}
							/>
						)}
						{/* Story 8.6: Subcontracting Suggestions */}
						<SubcontractingSuggestions missionId={selectedMissionId} />
							<VehicleAssignmentPanel
								assignment={selectedMission?.assignment || null}
								isSubcontracted={selectedMission?.isSubcontracted ?? false}
								subcontractor={selectedMission?.subcontractor ?? null}
								isLoading={missionDetailLoading}
								onAssign={selectedMissionId && !selectedMission?.isSubcontracted ? handleOpenAssignmentDrawer : undefined}
								onChangeSubcontractor={selectedMissionId && selectedMission?.isSubcontracted ? handleChangeSubcontractor : undefined}
								onRemoveSubcontractor={selectedMissionId && selectedMission?.isSubcontracted ? handleRemoveSubcontractor : undefined}
								quoteId={selectedMission?.quoteId}
							/>
					</div>
				</div>
			</div>
		{/* Assignment Drawer (Story 8.2 + 8.3) */}
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
				// Story 8.3: Multi-base visualization callbacks
				onCandidateHoverStart={handleCandidateHoverStart}
				onCandidateHoverEnd={handleCandidateHoverEnd}
				onSelectedCandidateChange={handleSelectedCandidateChange}
			/>
		</div>
	);
}

/**
 * Convert MissionDetail to PricingResult format for TripTransparencyPanel
 */
function missionToPricingResult(mission: MissionDetail): PricingResult | null {
	if (!mission.tripAnalysis) return null;

	const tripAnalysis = mission.tripAnalysis as Record<string, unknown>;

	return {
		price: mission.finalPrice,
		internalCost: mission.internalCost || 0,
		marginPercent: mission.marginPercent || 0,
		pricingMode: mission.pricingMode,
		tripAnalysis: {
			totalDistanceKm: (tripAnalysis.totalDistanceKm as number) || 0,
			totalDurationMinutes: (tripAnalysis.totalDurationMinutes as number) || 0,
			totalInternalCost: (tripAnalysis.totalInternalCost as number) || mission.internalCost || 0,
			routingSource: (tripAnalysis.routingSource as string) || "ESTIMATE",
			segments: (tripAnalysis.segments as Record<string, unknown>) || {
				service: {
					distanceKm: 0,
					durationMinutes: 0,
					cost: { total: 0 },
					isEstimated: true,
				},
			},
			costBreakdown: (tripAnalysis.costBreakdown as Record<string, unknown>) || {
				fuel: { amount: 0, distanceKm: 0, consumptionL100km: 0, pricePerLiter: 0 },
				tolls: { amount: 0, distanceKm: 0, ratePerKm: 0 },
				wear: { amount: 0, distanceKm: 0, ratePerKm: 0 },
				driver: { amount: 0, durationMinutes: 0, hourlyRate: 0 },
				parking: { amount: 0, description: "" },
				total: mission.internalCost || 0,
			},
			vehicleSelection: tripAnalysis.vehicleSelection as Record<string, unknown> | undefined,
		},
		matchedGrid: null,
		appliedRules: [],
		complianceResult: (tripAnalysis.complianceResult as Record<string, unknown>) || null,
	} as unknown as PricingResult;
}

export default DispatchPage;
