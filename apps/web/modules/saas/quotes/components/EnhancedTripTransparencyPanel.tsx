"use client";

import { useCallback } from "react";
import { Card, CardContent } from "@ui/components/card";
import { Button } from "@ui/components/button";
import { Skeleton } from "@ui/components/skeleton";
import {
  CarIcon,
  ClockIcon,
  DownloadIcon,
  EuroIcon,
  LayersIcon,
  MapIcon,
  TruckIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

import { CollapsibleSection } from "./CollapsibleSection";
import { TripSummaryHeader } from "./TripSummaryHeader";
import { PositioningCostsSection } from "./PositioningCostsSection";
import { PricingSegmentsSection } from "./PricingSegmentsSection";
import { StaffingCostsSection } from "./StaffingCostsSection";
import { TimeAnalysisSection } from "./TimeAnalysisSection";
import { ModernRouteMap } from "./ModernRouteMap";
import { OperationalCostsContent } from "./OperationalCostsContent";
import { PriceBreakdownContent } from "./PriceBreakdownContent";
import { useTripTransparencyState } from "../hooks/useTripTransparencyState";
import type { PricingResult } from "../types";
import { formatPrice } from "../types";

interface RouteCoordinates {
  pickup?: { lat: number; lng: number; address: string };
  dropoff?: { lat: number; lng: number; address: string };
  waypoints?: Array<{ lat: number; lng: number; address: string }>;
}

interface EnhancedTripTransparencyPanelProps {
  pricingResult: PricingResult | null;
  isLoading: boolean;
  className?: string;
  canEditCosts?: boolean;
  onCostUpdate?: (componentName: string, value: number) => Promise<void>;
  isCostUpdating?: boolean;
  routeCoordinates?: RouteCoordinates;
}

/**
 * EnhancedTripTransparencyPanel Component
 * 
 * Story 21-7: Unified TripTransparency interface with collapsible sections.
 * Provides a single organized view of all pricing calculations with:
 * - Trip Summary Header (always visible)
 * - Collapsible sections for each pricing component
 * - PDF export functionality
 * - Consistent visual design
 * 
 * @see Story 21-7: Enhanced TripTransparency Interface with Detailed Calculation
 * @see FR101, FR102: Enhanced interface with organized sections
 */
export function EnhancedTripTransparencyPanel({
  pricingResult,
  isLoading,
  className,
  canEditCosts = false,
  onCostUpdate,
  isCostUpdating = false,
  routeCoordinates,
}: EnhancedTripTransparencyPanelProps) {
  const t = useTranslations();
  const {
    setExpandedSections,
    isExpanded,
  } = useTripTransparencyState(["price-breakdown"]);

  const handleCostSave = useCallback(async (componentName: string, value: number) => {
    if (onCostUpdate) {
      await onCostUpdate(componentName, value);
    }
  }, [onCostUpdate]);

  const handleToggleSection = useCallback((sectionId: string) => {
    setExpandedSections((prev: string[]) => {
      if (prev.includes(sectionId)) {
        return prev.filter((id: string) => id !== sectionId);
      }
      return [...prev, sectionId];
    });
  }, [setExpandedSections]);

  const handleExportPdf = useCallback(() => {
    window.print();
  }, []);

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        <EnhancedTripTransparencySkeleton />
      </div>
    );
  }

  if (!pricingResult) {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <MapIcon className="size-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">
                {t("quotes.create.tripTransparency.empty.title")}
              </p>
              <p className="text-sm mt-1">
                {t("quotes.create.tripTransparency.empty.description")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { tripAnalysis, commissionData } = pricingResult;

  // Determine which sections to show
  const hasStaffing = tripAnalysis.compliancePlan && 
    tripAnalysis.compliancePlan.planType !== "NONE" && 
    tripAnalysis.compliancePlan.isRequired &&
    tripAnalysis.compliancePlan.additionalCost > 0;

  const hasPositioning = tripAnalysis.segments && 
    (tripAnalysis.segments.approach || tripAnalysis.segments.return || tripAnalysis.positioningCosts);

  const hasTimeAnalysis = tripAnalysis.timeAnalysis !== null && tripAnalysis.timeAnalysis !== undefined;

  const hasPricingSegments = tripAnalysis.zoneSegments && 
    tripAnalysis.zoneSegments.length > 1;

  // Calculate badge values
  const staffingBadge = hasStaffing 
    ? formatPrice(tripAnalysis.compliancePlan!.additionalCost)
    : undefined;

  const positioningBadge = tripAnalysis.positioningCosts
    ? formatPrice(tripAnalysis.positioningCosts.totalPositioningCost)
    : undefined;

  const timeAnalysisBadge = tripAnalysis.timeAnalysis?.differenceFromGoogle
    ? `${tripAnalysis.timeAnalysis.differenceFromGoogle > 0 ? "+" : ""}${Math.floor(tripAnalysis.timeAnalysis.differenceFromGoogle / 60)}h${Math.abs(tripAnalysis.timeAnalysis.differenceFromGoogle % 60).toString().padStart(2, "0")} vs Google`
    : undefined;

  const zonesBadge = hasPricingSegments
    ? t("quotes.tripTransparency.enhanced.badges.zonesTraversed", { count: tripAnalysis.zoneSegments!.length })
    : undefined;

  const operationalCostsBadge = tripAnalysis.costBreakdown?.total
    ? formatPrice(tripAnalysis.costBreakdown.total)
    : undefined;

  return (
    <div className={cn("space-y-4 print:space-y-2", className)}>
      {/* Trip Summary Header - Always visible */}
      <TripSummaryHeader pricingResult={pricingResult} />

      {/* Export PDF Button */}
      <div className="flex justify-end print:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={handleExportPdf}
          className="gap-2"
        >
          <DownloadIcon className="size-4" />
          {t("quotes.tripTransparency.enhanced.exportPdf")}
        </Button>
      </div>

      {/* Route Map Preview */}
      {routeCoordinates && (routeCoordinates.pickup || routeCoordinates.dropoff) && (
        <div className="print:hidden">
          <ModernRouteMap
            pickup={routeCoordinates.pickup}
            dropoff={routeCoordinates.dropoff}
            waypoints={routeCoordinates.waypoints}
            encodedPolyline={tripAnalysis.encodedPolyline}
          />
        </div>
      )}

      {/* Collapsible Sections */}
      <div className="space-y-3 print:space-y-2">
        {/* Price Breakdown Section */}
        <CollapsibleSection
          title={t("quotes.tripTransparency.enhanced.sections.priceBreakdown")}
          icon={EuroIcon}
          badge={formatPrice(pricingResult.price)}
          colorScheme="indigo"
          isOpen={isExpanded("price-breakdown")}
          onToggle={() => handleToggleSection("price-breakdown")}
        >
          <PriceBreakdownContent
            pricingResult={pricingResult}
            commissionData={commissionData}
          />
        </CollapsibleSection>

        {/* Time Analysis Section */}
        {hasTimeAnalysis && (
          <CollapsibleSection
            title={t("quotes.tripTransparency.enhanced.sections.timeAnalysis")}
            icon={ClockIcon}
            badge={timeAnalysisBadge}
            colorScheme="purple"
            isOpen={isExpanded("time-analysis")}
            onToggle={() => handleToggleSection("time-analysis")}
          >
            <TimeAnalysisSection 
              timeAnalysis={tripAnalysis.timeAnalysis} 
              className="mb-0 border-0 bg-transparent p-0"
            />
          </CollapsibleSection>
        )}

        {/* Pricing Segments Section */}
        {hasPricingSegments && (
          <CollapsibleSection
            title={t("quotes.tripTransparency.enhanced.sections.pricingSegments")}
            icon={LayersIcon}
            badge={zonesBadge}
            colorScheme="emerald"
            isOpen={isExpanded("pricing-segments")}
            onToggle={() => handleToggleSection("pricing-segments")}
          >
            <PricingSegmentsSection
              zoneSegments={tripAnalysis.zoneSegments}
              routeSegmentation={tripAnalysis.routeSegmentation}
              className="mb-0 border-0 bg-transparent p-0"
            />
          </CollapsibleSection>
        )}

        {/* Positioning Costs Section */}
        {hasPositioning && (
          <CollapsibleSection
            title={t("quotes.tripTransparency.enhanced.sections.positioningCosts")}
            icon={CarIcon}
            badge={positioningBadge}
            colorScheme="amber"
            isOpen={isExpanded("positioning")}
            onToggle={() => handleToggleSection("positioning")}
          >
            <PositioningCostsSection
              segments={tripAnalysis.segments}
              vehicleSelection={tripAnalysis.vehicleSelection}
              positioningCosts={tripAnalysis.positioningCosts}
              className="mb-0 border-0 bg-transparent p-0"
            />
          </CollapsibleSection>
        )}

        {/* Operational Costs Section */}
        <CollapsibleSection
          title={t("quotes.tripTransparency.enhanced.sections.operationalCosts")}
          icon={TruckIcon}
          badge={operationalCostsBadge}
          colorScheme="gray"
          isOpen={isExpanded("operational")}
          onToggle={() => handleToggleSection("operational")}
        >
          <OperationalCostsContent
            tripAnalysis={tripAnalysis}
            canEditCosts={canEditCosts}
            onCostSave={handleCostSave}
            isCostUpdating={isCostUpdating}
          />
        </CollapsibleSection>

        {/* RSE Staffing Section */}
        {hasStaffing && (
          <CollapsibleSection
            title={t("quotes.tripTransparency.enhanced.sections.staffing")}
            icon={UsersIcon}
            badge={staffingBadge}
            colorScheme="blue"
            isOpen={isExpanded("staffing")}
            onToggle={() => handleToggleSection("staffing")}
          >
            <StaffingCostsSection
              compliancePlan={tripAnalysis.compliancePlan}
              className="mb-0 border-0 bg-transparent p-0"
            />
          </CollapsibleSection>
        )}
      </div>
    </div>
  );
}

/**
 * Skeleton loader for EnhancedTripTransparencyPanel
 */
function EnhancedTripTransparencySkeleton() {
  return (
    <div className="space-y-4">
      {/* Header skeleton */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-40" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
            </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Section skeletons */}
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 rounded-lg" />
      ))}
    </div>
  );
}

export default EnhancedTripTransparencyPanel;
