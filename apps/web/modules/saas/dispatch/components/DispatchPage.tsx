"use client";

import { useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { TripTransparencyPanel } from "@saas/quotes/components/TripTransparencyPanel";
import { useVehicleCategories } from "@saas/quotes/hooks/useVehicleCategories";
import { MissionsList } from "./MissionsList";
import { MissionsFilters } from "./MissionsFilters";
import { DispatchMap } from "./DispatchMap";
import { VehicleAssignmentPanel } from "./VehicleAssignmentPanel";
import { useMissions, useMissionDetail } from "../hooks/useMissions";
import { useOperatingBases } from "../hooks/useOperatingBases";
import type { MissionsFilters as Filters, MissionDetail } from "../types";
import type { PricingResult } from "@saas/quotes/types";

/**
 * DispatchPage Component
 *
 * Story 8.1: Implement Dispatch Screen Layout
 *
 * Main 3-zone layout for the Dispatch screen:
 * - Left: Missions list with filters
 * - Right-top: Map showing route and bases
 * - Right-bottom: TripTransparencyPanel + VehicleAssignmentPanel
 *
 * @see UX Spec 8.8 Dispatch Screen
 * @see AC1: Dispatch Screen Layout
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
	const [selectedMissionId, setSelectedMissionId] = useState<string | null>(null);

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
	}, []);

	// Convert mission detail to PricingResult for TripTransparencyPanel
	const pricingResult = selectedMission ? missionToPricingResult(selectedMission) : null;

	const missions = missionsData?.data || [];

	return (
		<div className="h-[calc(100vh-8rem)] flex gap-4 p-4">
			{/* Left Panel - Missions List */}
			<div className="w-2/5 flex flex-col gap-4" data-testid="dispatch-left-panel">
				<div>
					<h1 className="text-2xl font-bold tracking-tight mb-1">{t("title")}</h1>
					<p className="text-sm text-muted-foreground">
						{t("subtitle", { count: missions.length })}
					</p>
				</div>

				<MissionsFilters
					filters={filters}
					onFiltersChange={handleFiltersChange}
					vehicleCategories={vehicleCategories}
				/>

				<MissionsList
					missions={missions}
					selectedMissionId={selectedMissionId}
					onSelectMission={handleSelectMission}
					isLoading={missionsLoading}
				/>
			</div>

			{/* Right Panel - Map + Transparency */}
			<div className="w-3/5 flex flex-col gap-4" data-testid="dispatch-right-panel">
				{/* Map */}
				<div className="h-1/2">
					<DispatchMap
						mission={selectedMission || null}
						bases={bases}
						isLoading={basesLoading}
					/>
				</div>

				{/* Transparency + Assignment */}
				<div className="h-1/2 overflow-auto flex flex-col gap-4">
					<TripTransparencyPanel
						pricingResult={pricingResult}
						isLoading={missionDetailLoading}
						className="flex-1"
					/>
					<VehicleAssignmentPanel
						assignment={selectedMission?.assignment || null}
						isLoading={missionDetailLoading}
						// onAssign will be implemented in Story 8.2
					/>
				</div>
			</div>
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
