"use client";

import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import { Badge } from "@ui/components/badge";
import { Card, CardContent } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { cn } from "@ui/lib";
import {
	ClockIcon,
	EuroIcon,
	FuelIcon,
	GaugeIcon,
	MapIcon,
	PencilIcon,
	PercentIcon,
	RefreshCwIcon,
	RouteIcon,
	TruckIcon,
	UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import type { AuditLogEntry, PricingResult } from "../types";
import {
	formatDistance,
	formatDuration,
	formatPrice,
	getEffectiveCost,
	getOriginalCost,
	hasComplianceWarnings,
	hasManualCostOverrides,
	isCostOverridden,
} from "../types";
import { CalculationValidationSection } from "./CalculationValidationSection";
import { ComplianceWarningAlert } from "./ComplianceWarningAlert";
import { EditableCostRow } from "./EditableCostRow";
import { ModernRouteMap } from "./ModernRouteMap";
import { PositioningCostsSection } from "./PositioningCostsSection";
import { PricingSegmentsSection } from "./PricingSegmentsSection";
import { StaffingCostsSection } from "./StaffingCostsSection";
import { StaffingPlanBadge } from "./StaffingPlanBadge";
import { TimeAnalysisSection } from "./TimeAnalysisSection";
import { ZoneTransparencySection } from "./ZoneTransparencySection";

interface RouteCoordinates {
	pickup?: { lat: number; lng: number; address: string };
	dropoff?: { lat: number; lng: number; address: string };
	/** Story 19.7: Support for excursion waypoints */
	waypoints?: Array<{ lat: number; lng: number; address: string }>;
}

interface TripTransparencyPanelProps {
	pricingResult: PricingResult | null;
	isLoading: boolean;
	className?: string;
	// Story 6.8: Cost editing props
	canEditCosts?: boolean;
	onCostUpdate?: (componentName: string, value: number) => Promise<void>;
	isCostUpdating?: boolean;
	// Story 10.1: Route visualization
	routeCoordinates?: RouteCoordinates;
	// Story 21.9: Encoded polyline for route display
	encodedPolyline?: string | null;
	// Story 21.9: Validation props
	onRecalculate?: () => Promise<void>;
	isRecalculating?: boolean;
	auditLog?: AuditLogEntry[];
}

/**
 * TripTransparencyPanel Component
 *
 * Central panel displaying trip transparency with distance, duration,
 * internal cost, margin, and segment breakdown.
 *
 * Story 6.5: Includes compliance warnings section for non-blocking alerts.
 * Story 6.8: Supports manual editing of cost components for authorized users.
 *
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see Story 6.5: Blocking and Non-Blocking Alerts
 * @see Story 6.8: Manual Editing of Cost Components
 * @see UX Spec 6.1.5 TripTransparencyPanel
 * @see FR21-FR24 Shadow Calculation and Profitability
 */
export function TripTransparencyPanel({
	pricingResult,
	isLoading,
	className,
	canEditCosts = false,
	onCostUpdate,
	isCostUpdating = false,
	routeCoordinates,
	encodedPolyline,
	onRecalculate,
	isRecalculating = false,
	auditLog = [],
}: TripTransparencyPanelProps) {
	const t = useTranslations();

	// Story 6.8: Handle cost save
	const handleCostSave = useCallback(
		async (componentName: string, value: number) => {
			if (onCostUpdate) {
				await onCostUpdate(componentName, value);
			}
		},
		[onCostUpdate],
	);

	if (isLoading) {
		return (
			<div className={cn("space-y-4", className)}>
				<TripTransparencySkeleton />
			</div>
		);
	}

	if (!pricingResult) {
		return (
			<div className={cn("space-y-4", className)}>
				<Card>
					<CardContent className="py-12">
						<div className="text-center text-muted-foreground">
							<MapIcon className="mx-auto mb-4 size-12 opacity-50" />
							<p className="font-medium text-lg">
								{t("quotes.create.tripTransparency.empty.title")}
							</p>
							<p className="mt-1 text-sm">
								{t("quotes.create.tripTransparency.empty.description")}
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const {
		tripAnalysis,
		marginPercent,
		internalCost,
		price,
		pricingMode,
		matchedGrid,
		commissionData,
		appliedRules,
	} = pricingResult;

	// Story 16.3: Extract zone multiplier rule for display
	const zoneMultiplierRule = appliedRules?.find(
		(rule) => rule.type === "ZONE_MULTIPLIER",
	) as
		| {
				type: string;
				description: string;
				pickupZone?: { code: string; name: string; multiplier: number };
				dropoffZone?: { code: string; name: string; multiplier: number };
				appliedMultiplier?: number;
				priceBefore?: number;
				priceAfter?: number;
		  }
		| undefined;

	// Story 16.6: Extract round trip rule for display
	const roundTripRule = appliedRules?.find(
		(rule) => rule.type === "ROUND_TRIP",
	) as
		| {
				type: string;
				description: string;
				multiplier: number;
				priceBeforeRoundTrip?: number;
				priceAfterRoundTrip?: number;
		  }
		| undefined;

	return (
		<div className={cn("space-y-4", className)}>
			{/* Pricing Mode Badge */}
			<div className="flex items-center justify-between">
				<h3 className="font-semibold text-lg">
					{t("quotes.create.tripTransparency.title")}
				</h3>
				<div className="flex items-center gap-2">
					<Badge
						variant={pricingMode === "FIXED_GRID" ? "default" : "secondary"}
					>
						{pricingMode === "FIXED_GRID"
							? t("quotes.create.pricingMode.fixedGrid")
							: t("quotes.create.pricingMode.dynamic")}
					</Badge>
					{matchedGrid && (
						<Badge variant="outline" className="text-xs">
							{matchedGrid.name}
						</Badge>
					)}
					{/* Story 16.6: Round Trip Badge */}
					{roundTripRule && (
						<Badge
							variant="default"
							className="bg-purple-600 text-xs hover:bg-purple-700"
						>
							<RefreshCwIcon className="mr-1 size-3" />
							{t("quotes.create.tripTransparency.roundTrip")}
						</Badge>
					)}
					{/* Story 19.1: Staffing Plan Badge */}
					<StaffingPlanBadge compliancePlan={tripAnalysis.compliancePlan} />
				</div>
			</div>

			{/* Summary Cards */}
			{/* Story 22.2: Conditional grid - 5 columns when staffing costs exist */}
			<div
				className={cn(
					"grid gap-3",
					tripAnalysis.compliancePlan?.additionalCost &&
						tripAnalysis.compliancePlan.additionalCost > 0
						? "grid-cols-2 lg:grid-cols-5"
						: "grid-cols-2 lg:grid-cols-4",
				)}
			>
				<SummaryCard
					icon={GaugeIcon}
					label={t("quotes.create.tripTransparency.distance")}
					value={formatDistance(tripAnalysis.totalDistanceKm)}
				/>
				<SummaryCard
					icon={ClockIcon}
					label={t("quotes.create.tripTransparency.duration")}
					value={formatDuration(tripAnalysis.totalDurationMinutes)}
				/>
				<SummaryCard
					icon={EuroIcon}
					label={t("quotes.create.tripTransparency.internalCost")}
					value={formatPrice(internalCost)}
				/>
				<SummaryCard
					icon={PercentIcon}
					label={t("quotes.create.tripTransparency.margin")}
					value={`${marginPercent.toFixed(1)}%`}
					extra={
						<ProfitabilityIndicator marginPercent={marginPercent} compact />
					}
				/>
				{/* Story 22.2: Staffing Cost Summary Card - only shown when staffing costs exist */}
				{tripAnalysis.compliancePlan?.additionalCost &&
					tripAnalysis.compliancePlan.additionalCost > 0 && (
						<SummaryCard
							icon={UsersIcon}
							label={t("quotes.create.tripTransparency.staffingCost")}
							value={formatPrice(tripAnalysis.compliancePlan.additionalCost)}
							extra={
								<span className="text-blue-600 text-xs dark:text-blue-400">
									{tripAnalysis.compliancePlan.adjustedSchedule.driversRequired}{" "}
									{t("quotes.staffing.drivers")}
								</span>
							}
						/>
					)}
			</div>

			{/* Tabs for detailed breakdown */}
			<Tabs defaultValue="overview" className="w-full">
				<TabsList
					className={cn(
						"grid w-full",
						pricingResult.complianceResult &&
							hasComplianceWarnings(pricingResult.complianceResult)
							? "grid-cols-4"
							: "grid-cols-3",
					)}
				>
					<TabsTrigger value="overview">
						{t("quotes.create.tripTransparency.tabs.overview")}
					</TabsTrigger>
					<TabsTrigger value="route">
						{t("quotes.create.tripTransparency.tabs.route")}
					</TabsTrigger>
					<TabsTrigger value="costs">
						{t("quotes.create.tripTransparency.tabs.costs")}
					</TabsTrigger>
					{/* Story 6.5: Compliance tab when warnings exist */}
					{pricingResult.complianceResult &&
						hasComplianceWarnings(pricingResult.complianceResult) && (
							<TabsTrigger value="compliance" className="text-amber-600">
								{t("quotes.create.tripTransparency.tabs.compliance")}
							</TabsTrigger>
						)}
				</TabsList>

				{/* Overview Tab */}
				<TabsContent value="overview" className="mt-4">
					<Card>
						<CardContent className="pt-4">
							<div className="space-y-4">
								{/* Price Summary */}
								<div className="flex items-center justify-between border-b py-2">
									<span className="text-muted-foreground">
										{t("quotes.create.tripTransparency.suggestedPrice")}
									</span>
									<span className="font-bold text-xl">
										{formatPrice(price)}
									</span>
								</div>
								<div className="flex items-center justify-between border-b py-2">
									<span className="text-muted-foreground">
										{t("quotes.create.tripTransparency.internalCost")}
									</span>
									<span className="font-medium">
										{formatPrice(internalCost)}
									</span>
								</div>
								<div className="flex items-center justify-between py-2">
									<span className="text-muted-foreground">
										{t("quotes.create.tripTransparency.grossMargin")}
									</span>
									<div className="flex items-center gap-2">
										<span className="font-medium">
											{formatPrice(price - internalCost)}
										</span>
										{!commissionData && (
											<ProfitabilityIndicator marginPercent={marginPercent} />
										)}
									</div>
								</div>

								{/* Story 7.4: Commission Section for Partners */}
								{commissionData && commissionData.commissionPercent > 0 && (
									<>
										<div className="flex items-center justify-between border-t py-2">
											<span className="flex items-center gap-1 text-muted-foreground">
												<PercentIcon className="size-3" />
												{t("quotes.create.tripTransparency.commission")} (
												{commissionData.commissionPercent}%)
											</span>
											<span className="font-medium text-orange-600">
												-{formatPrice(commissionData.commissionAmount)}
											</span>
										</div>
										<div className="-mx-2 flex items-center justify-between rounded bg-muted/30 px-2 py-2">
											<span className="font-medium">
												{t("quotes.create.tripTransparency.netMargin")}
											</span>
											<div className="flex items-center gap-2">
												<span className="font-bold">
													{formatPrice(commissionData.effectiveMargin)} (
													{commissionData.effectiveMarginPercent.toFixed(1)}%)
												</span>
												<ProfitabilityIndicator
													marginPercent={commissionData.effectiveMarginPercent}
												/>
											</div>
										</div>
									</>
								)}

								{/* Vehicle Selection Info */}
								{tripAnalysis.vehicleSelection?.selectedVehicle && (
									<div className="mt-4 rounded-lg bg-muted/50 p-3">
										<div className="flex items-center gap-2 text-sm">
											<TruckIcon className="size-4 text-muted-foreground" />
											<span className="font-medium">
												{
													tripAnalysis.vehicleSelection.selectedVehicle
														.vehicleName
												}
											</span>
											<span className="text-muted-foreground">
												{t("quotes.create.tripTransparency.from")}{" "}
												{tripAnalysis.vehicleSelection.selectedVehicle.baseName}
											</span>
										</div>
									</div>
								)}

								{/* Story 16.3: Zone Multiplier Info */}
								{zoneMultiplierRule && (
									<div className="mt-4 rounded-lg bg-muted/50 p-3">
										<div className="flex items-center justify-between text-sm">
											<div className="flex items-center gap-2">
												<MapIcon className="size-4 text-muted-foreground" />
												<span className="text-muted-foreground">
													{t("quotes.create.tripTransparency.zones")}:
												</span>
												<span className="font-medium">
													{zoneMultiplierRule.pickupZone?.name ?? "Unknown"} →{" "}
													{zoneMultiplierRule.dropoffZone?.name ?? "Unknown"}
												</span>
											</div>
											{zoneMultiplierRule.appliedMultiplier &&
												zoneMultiplierRule.appliedMultiplier !== 1.0 && (
													<Badge variant="outline" className="text-xs">
														×{zoneMultiplierRule.appliedMultiplier.toFixed(2)}
													</Badge>
												)}
										</div>
										{zoneMultiplierRule.appliedMultiplier &&
											zoneMultiplierRule.appliedMultiplier !== 1.0 && (
												<div className="mt-1 text-muted-foreground text-xs">
													{t(
														"quotes.create.tripTransparency.zoneMultiplierApplied",
														{
															multiplier:
																zoneMultiplierRule.appliedMultiplier.toFixed(2),
														},
													)}
												</div>
											)}
									</div>
								)}

								{/* Story 22.2: Staffing Costs Section in Overview Tab */}
								{/* Display staffing costs prominently when RSE compliance requires additional staffing */}
								<StaffingCostsSection
									compliancePlan={tripAnalysis.compliancePlan}
								/>

								{/* Story 21.3: Time Analysis Section */}
								<TimeAnalysisSection timeAnalysis={tripAnalysis.timeAnalysis} />

								{/* Story 21.8: Zone Transparency Section */}
								<ZoneTransparencySection
									zoneTransparency={tripAnalysis.zoneTransparency}
								/>

								{/* Story 21.9: Calculation Validation Section */}
								<CalculationValidationSection
									validation={pricingResult.validation}
									onRecalculate={onRecalculate}
									isRecalculating={isRecalculating}
									auditLog={auditLog}
								/>
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Route Tab - Segments A/B/C or Excursion Legs */}
				<TabsContent value="route" className="mt-4">
					{/* Route Map Preview - Story 19.7: Pass waypoints for excursions */}
					{routeCoordinates &&
						(routeCoordinates.pickup || routeCoordinates.dropoff) && (
							<div className="mb-4">
								<ModernRouteMap
									pickup={routeCoordinates.pickup}
									dropoff={routeCoordinates.dropoff}
									waypoints={routeCoordinates.waypoints}
									encodedPolyline={
										encodedPolyline || tripAnalysis.encodedPolyline
									}
								/>
							</div>
						)}

					{/* Story 21.4: Pricing Segments and Traversed Zones Visualization */}
					<PricingSegmentsSection
						zoneSegments={tripAnalysis.zoneSegments}
						routeSegmentation={tripAnalysis.routeSegmentation}
					/>

					<Card>
						<CardContent className="pt-4">
							{/* Story 16.7: Display excursion legs if present */}
							{tripAnalysis.excursionLegs &&
							tripAnalysis.excursionLegs.length > 0 ? (
								<>
									{/* Excursion Multi-Stop Badge */}
									<div className="mb-4 flex items-center gap-2">
										<Badge variant="secondary" className="text-xs">
											<MapIcon className="mr-1 size-3" />
											{t("quotes.create.tripTransparency.excursion")} (
											{tripAnalysis.totalStops ??
												tripAnalysis.excursionLegs.length - 1}{" "}
											{t("quotes.create.tripTransparency.stops")})
										</Badge>
										{tripAnalysis.isMultiDay && (
											<Badge variant="outline" className="text-xs">
												{t("quotes.create.tripTransparency.multiDay")}
											</Badge>
										)}
									</div>
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>#</TableHead>
												<TableHead>
													{t("quotes.create.tripTransparency.leg")}
												</TableHead>
												<TableHead className="text-right">
													{t("quotes.create.tripTransparency.distance")}
												</TableHead>
												<TableHead className="text-right">
													{t("quotes.create.tripTransparency.duration")}
												</TableHead>
												<TableHead className="text-right">
													{t("quotes.create.tripTransparency.cost")}
												</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{tripAnalysis.excursionLegs.map((leg) => (
												<TableRow key={leg.order}>
													<TableCell className="font-medium">
														{leg.order}
													</TableCell>
													<TableCell>
														<div className="flex flex-col">
															<span className="font-medium text-sm">
																{leg.fromAddress}
															</span>
															<span className="text-muted-foreground text-xs">
																→ {leg.toAddress}
															</span>
														</div>
													</TableCell>
													<TableCell className="text-right">
														{formatDistance(leg.distanceKm)}
													</TableCell>
													<TableCell className="text-right">
														{formatDuration(leg.durationMinutes)}
													</TableCell>
													<TableCell className="text-right">
														{formatPrice(leg.cost.total)}
													</TableCell>
												</TableRow>
											))}
											{/* Total Row */}
											<TableRow className="bg-muted/50 font-medium">
												<TableCell></TableCell>
												<TableCell>
													{t("quotes.create.tripTransparency.total")}
												</TableCell>
												<TableCell className="text-right">
													{formatDistance(tripAnalysis.totalDistanceKm)}
												</TableCell>
												<TableCell className="text-right">
													{formatDuration(tripAnalysis.totalDurationMinutes)}
												</TableCell>
												<TableCell className="text-right">
													{formatPrice(tripAnalysis.totalInternalCost)}
												</TableCell>
											</TableRow>
										</TableBody>
									</Table>
								</>
							) : tripAnalysis.segments && tripAnalysis.segments.service ? (
								/* Standard Transfer/Dispo segments */
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>
												{t("quotes.create.tripTransparency.segment")}
											</TableHead>
											<TableHead className="text-right">
												{t("quotes.create.tripTransparency.distance")}
											</TableHead>
											<TableHead className="text-right">
												{t("quotes.create.tripTransparency.duration")}
											</TableHead>
											<TableHead className="text-right">
												{t("quotes.create.tripTransparency.cost")}
											</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{tripAnalysis.segments.approach && (
											<SegmentRow
												segment={tripAnalysis.segments.approach}
												label={t(
													"quotes.create.tripTransparency.segments.approach",
												)}
												description={t(
													"quotes.create.tripTransparency.segments.approachDesc",
												)}
											/>
										)}
										<SegmentRow
											segment={tripAnalysis.segments.service}
											label={t(
												"quotes.create.tripTransparency.segments.service",
											)}
											description={t(
												"quotes.create.tripTransparency.segments.serviceDesc",
											)}
											isMain
										/>
										{tripAnalysis.segments.return && (
											<SegmentRow
												segment={tripAnalysis.segments.return}
												label={t(
													"quotes.create.tripTransparency.segments.return",
												)}
												description={t(
													"quotes.create.tripTransparency.segments.returnDesc",
												)}
											/>
										)}

										{/* Story 22.1: Round trip return leg segments */}
										{tripAnalysis.isRoundTrip && (
											<>
												{/* Separator for round trip segments */}
												<TableRow className="bg-blue-50 dark:bg-blue-950/30">
													<TableCell colSpan={4} className="py-2">
														<div className="flex items-center gap-2 font-medium text-blue-700 text-sm dark:text-blue-400">
															<RefreshCwIcon className="size-4" />
															{t(
																"quotes.create.tripTransparency.segments.returnLeg",
															)}
														</div>
													</TableCell>
												</TableRow>

												{tripAnalysis.segments.returnApproach && (
													<SegmentRow
														segment={tripAnalysis.segments.returnApproach}
														label={t(
															"quotes.create.tripTransparency.segments.returnApproach",
														)}
														description={t(
															"quotes.create.tripTransparency.segments.returnApproachDesc",
														)}
													/>
												)}
												{tripAnalysis.segments.returnService && (
													<SegmentRow
														segment={tripAnalysis.segments.returnService}
														label={t(
															"quotes.create.tripTransparency.segments.returnService",
														)}
														description={t(
															"quotes.create.tripTransparency.segments.returnServiceDesc",
														)}
														isMain
													/>
												)}
												{tripAnalysis.segments.finalReturn && (
													<SegmentRow
														segment={tripAnalysis.segments.finalReturn}
														label={t(
															"quotes.create.tripTransparency.segments.finalReturn",
														)}
														description={t(
															"quotes.create.tripTransparency.segments.finalReturnDesc",
														)}
													/>
												)}
											</>
										)}
										{/* Total Row */}
										<TableRow className="bg-muted/50 font-medium">
											<TableCell>
												{t("quotes.create.tripTransparency.total")}
											</TableCell>
											<TableCell className="text-right">
												{formatDistance(tripAnalysis.totalDistanceKm)}
											</TableCell>
											<TableCell className="text-right">
												{formatDuration(tripAnalysis.totalDurationMinutes)}
											</TableCell>
											<TableCell className="text-right">
												{formatPrice(tripAnalysis.totalInternalCost)}
											</TableCell>
										</TableRow>
									</TableBody>
								</Table>
							) : (
								/* Story 20.1: Segments not available - graceful fallback */
								<NoSegmentsMessage t={t} tripAnalysis={tripAnalysis} />
							)}

							{/* Routing Source */}
							<div className="mt-4 flex items-center gap-1 text-muted-foreground text-xs">
								<RouteIcon className="size-3" />
								{t("quotes.create.tripTransparency.routingSource")}:{" "}
								{tripAnalysis.routingSource === "GOOGLE_API"
									? "Google Maps"
									: tripAnalysis.routingSource === "VEHICLE_SELECTION"
										? t("quotes.create.tripTransparency.vehicleSelection")
										: t("quotes.create.tripTransparency.estimate")}
							</div>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Costs Tab - Cost Breakdown */}
				{/* Story 6.8: Editable costs for authorized users */}
				<TabsContent value="costs" className="mt-4">
					{/* Story 21.2: Detailed Positioning Costs Section (Approach/Return) */}
					{/* Story 21.6: Enhanced with automatic positioning costs */}
					<PositioningCostsSection
						segments={tripAnalysis.segments}
						vehicleSelection={tripAnalysis.vehicleSelection}
						positioningCosts={tripAnalysis.positioningCosts}
					/>

					{/* Story 21.1: Ultra-Detailed Staffing Costs Section */}
					<StaffingCostsSection compliancePlan={tripAnalysis.compliancePlan} />

					<Card>
						<CardContent className="pt-4">
							{/* Story 6.8: Manual Edit Badge */}
							{hasManualCostOverrides(tripAnalysis) && (
								<div className="mb-3 flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-700">
									<PencilIcon className="size-4" />
									<span className="font-medium text-sm">
										{t("quotes.create.tripTransparency.costs.manuallyEdited")}
									</span>
								</div>
							)}
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>
											{t("quotes.create.tripTransparency.costType")}
										</TableHead>
										<TableHead className="text-right">
											{t("quotes.create.tripTransparency.amount")}
										</TableHead>
										<TableHead className="text-right">
											{t("quotes.create.tripTransparency.details")}
										</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody className="group">
									{tripAnalysis.costBreakdown?.fuel && (
										<EditableCostRow
											icon={FuelIcon}
											label={t("quotes.create.tripTransparency.costs.fuel")}
											amount={getEffectiveCost(tripAnalysis, "fuel")}
											originalAmount={getOriginalCost(tripAnalysis, "fuel")}
											details={
												/* Story 20.5: Show fuel price source badge */
												<span className="flex items-center gap-2">
													<span>
														{tripAnalysis.costBreakdown.fuel.distanceKm.toFixed(
															1,
														)}{" "}
														km ×{" "}
														{tripAnalysis.costBreakdown.fuel.consumptionL100km}{" "}
														L/100km ×{" "}
														{formatPrice(
															tripAnalysis.costBreakdown.fuel.pricePerLiter,
														)}
														/L
													</span>
													{tripAnalysis.fuelPriceSource?.source ===
													"REALTIME" ? (
														<Badge
															variant="default"
															className="h-4 bg-green-600 px-1.5 py-0 text-[10px] hover:bg-green-700"
														>
															API
														</Badge>
													) : tripAnalysis.fuelPriceSource?.source ===
														"CACHE" ? (
														<Badge
															variant="secondary"
															className="h-4 px-1.5 py-0 text-[10px]"
														>
															Cache
														</Badge>
													) : (
														<Badge
															variant="outline"
															className="h-4 px-1.5 py-0 text-[10px]"
														>
															Défaut
														</Badge>
													)}
												</span>
											}
											componentName="fuel"
											isEditable={canEditCosts}
											isEdited={isCostOverridden(tripAnalysis, "fuel")}
											isLoading={isCostUpdating}
											onSave={handleCostSave}
										/>
									)}
									{tripAnalysis.costBreakdown?.tolls && (
										<EditableCostRow
											icon={RouteIcon}
											label={t("quotes.create.tripTransparency.costs.tolls")}
											amount={getEffectiveCost(tripAnalysis, "tolls")}
											originalAmount={getOriginalCost(tripAnalysis, "tolls")}
											details={
												/* Story 20.3: Show toll source badge */
												tripAnalysis.tollSource === "GOOGLE_API" ? (
													<Badge
														variant="default"
														className="h-4 bg-green-600 px-1.5 py-0 text-[10px] hover:bg-green-700"
													>
														API
													</Badge>
												) : (
													<span className="flex items-center gap-2">
														<span>
															{tripAnalysis.costBreakdown.tolls.distanceKm.toFixed(
																1,
															)}{" "}
															km ×{" "}
															{formatPrice(
																tripAnalysis.costBreakdown.tolls.ratePerKm,
															)}
															/km
														</span>
														<Badge
															variant="secondary"
															className="h-4 px-1.5 py-0 text-[10px]"
														>
															Estimé
														</Badge>
													</span>
												)
											}
											componentName="tolls"
											isEditable={canEditCosts}
											isEdited={isCostOverridden(tripAnalysis, "tolls")}
											isLoading={isCostUpdating}
											onSave={handleCostSave}
										/>
									)}
									{tripAnalysis.costBreakdown?.wear && (
										<EditableCostRow
											icon={TruckIcon}
											label={t("quotes.create.tripTransparency.costs.wear")}
											amount={getEffectiveCost(tripAnalysis, "wear")}
											originalAmount={getOriginalCost(tripAnalysis, "wear")}
											details={`${tripAnalysis.costBreakdown.wear.distanceKm.toFixed(1)} km × ${formatPrice(tripAnalysis.costBreakdown.wear.ratePerKm)}/km`}
											componentName="wear"
											isEditable={canEditCosts}
											isEdited={isCostOverridden(tripAnalysis, "wear")}
											isLoading={isCostUpdating}
											onSave={handleCostSave}
										/>
									)}
									{tripAnalysis.costBreakdown?.driver && (
										<EditableCostRow
											icon={ClockIcon}
											label={t("quotes.create.tripTransparency.costs.driver")}
											amount={getEffectiveCost(tripAnalysis, "driver")}
											originalAmount={getOriginalCost(tripAnalysis, "driver")}
											details={`${formatDuration(tripAnalysis.costBreakdown.driver.durationMinutes)} × ${formatPrice(tripAnalysis.costBreakdown.driver.hourlyRate)}/h`}
											componentName="driver"
											isEditable={canEditCosts}
											isEdited={isCostOverridden(tripAnalysis, "driver")}
											isLoading={isCostUpdating}
											onSave={handleCostSave}
										/>
									)}
									{tripAnalysis.costBreakdown?.parking &&
										tripAnalysis.costBreakdown.parking.amount > 0 && (
											<EditableCostRow
												icon={MapIcon}
												label={t(
													"quotes.create.tripTransparency.costs.parking",
												)}
												amount={getEffectiveCost(tripAnalysis, "parking")}
												originalAmount={getOriginalCost(
													tripAnalysis,
													"parking",
												)}
												details={tripAnalysis.costBreakdown.parking.description}
												componentName="parking"
												isEditable={canEditCosts}
												isEdited={isCostOverridden(tripAnalysis, "parking")}
												isLoading={isCostUpdating}
												onSave={handleCostSave}
											/>
										)}
									{/* Total Row */}
									<TableRow className="bg-muted/50 font-medium">
										<TableCell>
											{t("quotes.create.tripTransparency.totalCost")}
										</TableCell>
										<TableCell className="text-right">
											{formatPrice(
												tripAnalysis.effectiveCosts?.total ??
													tripAnalysis.costBreakdown?.total ??
													0,
											)}
										</TableCell>
										<TableCell />
									</TableRow>
								</TableBody>
							</Table>
						</CardContent>
					</Card>
				</TabsContent>

				{/* Story 6.5: Compliance Tab - Warnings */}
				{pricingResult.complianceResult &&
					hasComplianceWarnings(pricingResult.complianceResult) && (
						<TabsContent value="compliance" className="mt-4">
							<ComplianceWarningAlert
								warnings={pricingResult.complianceResult.warnings}
							/>
						</TabsContent>
					)}
			</Tabs>
		</div>
	);
}

// ============================================================================
// Sub-components
// ============================================================================

interface SummaryCardProps {
	icon: React.ComponentType<{ className?: string }>;
	label: string;
	value: string;
	extra?: React.ReactNode;
}

function SummaryCard({ icon: Icon, label, value, extra }: SummaryCardProps) {
	return (
		<Card>
			<CardContent className="p-4">
				<div className="mb-1 flex items-center gap-2 text-muted-foreground">
					<Icon className="size-4" />
					<span className="font-medium text-xs">{label}</span>
				</div>
				<div className="flex items-center justify-between">
					<span className="font-bold text-lg">{value}</span>
					{extra}
				</div>
			</CardContent>
		</Card>
	);
}

interface SegmentRowProps {
	segment: {
		distanceKm: number;
		durationMinutes: number;
		cost: { total: number };
		isEstimated: boolean;
	};
	label: string;
	description: string;
	isMain?: boolean;
}

function SegmentRow({
	segment,
	label,
	description,
	isMain = false,
}: SegmentRowProps) {
	return (
		<TableRow className={isMain ? "bg-primary/5" : ""}>
			<TableCell>
				<div>
					<span className={cn("font-medium", isMain && "text-primary")}>
						{label}
					</span>
					<div className="text-muted-foreground text-xs">{description}</div>
				</div>
			</TableCell>
			<TableCell className="text-right">
				{formatDistance(segment.distanceKm)}
				{segment.isEstimated && (
					<span className="ml-1 text-muted-foreground text-xs">*</span>
				)}
			</TableCell>
			<TableCell className="text-right">
				{formatDuration(segment.durationMinutes)}
			</TableCell>
			<TableCell className="text-right">
				{formatPrice(segment.cost.total)}
			</TableCell>
		</TableRow>
	);
}

// Note: CostRow component moved to EditableCostRow.tsx

/**
 * Story 20.1: NoSegmentsMessage Component
 *
 * Displays a graceful fallback when segment data is not available.
 * This can happen for:
 * - Quotes in progress of creation
 * - Legacy quotes without tripAnalysis segments
 * - Edge cases where pricing engine returns partial data
 */
interface NoSegmentsMessageProps {
	t: ReturnType<typeof useTranslations>;
	tripAnalysis: {
		totalDistanceKm: number;
		totalDurationMinutes: number;
		totalInternalCost: number;
	};
}

function NoSegmentsMessage({ t, tripAnalysis }: NoSegmentsMessageProps) {
	return (
		<div className="space-y-4">
			{/* Info message */}
			<div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
				<RouteIcon className="size-5 flex-shrink-0 text-muted-foreground" />
				<div>
					<p className="font-medium text-sm">
						{t("quotes.create.tripTransparency.segments.notAvailable")}
					</p>
					<p className="mt-1 text-muted-foreground text-xs">
						{t("quotes.create.tripTransparency.segments.notAvailableDesc")}
					</p>
				</div>
			</div>

			{/* Summary totals table - always show totals if available */}
			<Table>
				<TableHeader>
					<TableRow>
						<TableHead>{t("quotes.create.tripTransparency.segment")}</TableHead>
						<TableHead className="text-right">
							{t("quotes.create.tripTransparency.distance")}
						</TableHead>
						<TableHead className="text-right">
							{t("quotes.create.tripTransparency.duration")}
						</TableHead>
						<TableHead className="text-right">
							{t("quotes.create.tripTransparency.cost")}
						</TableHead>
					</TableRow>
				</TableHeader>
				<TableBody>
					<TableRow className="bg-muted/50 font-medium">
						<TableCell>{t("quotes.create.tripTransparency.total")}</TableCell>
						<TableCell className="text-right">
							{formatDistance(tripAnalysis.totalDistanceKm)}
						</TableCell>
						<TableCell className="text-right">
							{formatDuration(tripAnalysis.totalDurationMinutes)}
						</TableCell>
						<TableCell className="text-right">
							{formatPrice(tripAnalysis.totalInternalCost)}
						</TableCell>
					</TableRow>
				</TableBody>
			</Table>
		</div>
	);
}

function TripTransparencySkeleton() {
	return (
		<>
			<div className="flex items-center justify-between">
				<Skeleton className="h-6 w-40" />
				<Skeleton className="h-6 w-24" />
			</div>
			<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
				{[1, 2, 3, 4].map((i) => (
					<Card key={i}>
						<CardContent className="p-4">
							<Skeleton className="mb-2 h-4 w-20" />
							<Skeleton className="h-6 w-16" />
						</CardContent>
					</Card>
				))}
			</div>
			<Card>
				<CardContent className="space-y-3 pt-4">
					<Skeleton className="h-8 w-full" />
					<Skeleton className="h-24 w-full" />
				</CardContent>
			</Card>
		</>
	);
}

export default TripTransparencyPanel;
