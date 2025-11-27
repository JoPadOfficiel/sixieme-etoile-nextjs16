"use client";

import { Badge } from "@ui/components/badge";
import { Card, CardContent } from "@ui/components/card";
import { Skeleton } from "@ui/components/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import {
  ClockIcon,
  EuroIcon,
  FuelIcon,
  GaugeIcon,
  MapIcon,
  PercentIcon,
  RouteIcon,
  TruckIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import type { PricingResult } from "../types";
import { formatPrice, formatDistance, formatDuration } from "../types";

interface TripTransparencyPanelProps {
  pricingResult: PricingResult | null;
  isLoading: boolean;
  className?: string;
}

/**
 * TripTransparencyPanel Component
 * 
 * Central panel displaying trip transparency with distance, duration,
 * internal cost, margin, and segment breakdown.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see UX Spec 6.1.5 TripTransparencyPanel
 * @see FR21-FR24 Shadow Calculation and Profitability
 */
export function TripTransparencyPanel({
  pricingResult,
  isLoading,
  className,
}: TripTransparencyPanelProps) {
  const t = useTranslations();

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

  const { tripAnalysis, marginPercent, internalCost, price, pricingMode, matchedGrid } = pricingResult;

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pricing Mode Badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t("quotes.create.tripTransparency.title")}
        </h3>
        <div className="flex items-center gap-2">
          <Badge variant={pricingMode === "FIXED_GRID" ? "default" : "secondary"}>
            {pricingMode === "FIXED_GRID"
              ? t("quotes.create.pricingMode.fixedGrid")
              : t("quotes.create.pricingMode.dynamic")}
          </Badge>
          {matchedGrid && (
            <Badge variant="outline" className="text-xs">
              {matchedGrid.name}
            </Badge>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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
          extra={<ProfitabilityIndicator marginPercent={marginPercent} compact />}
        />
      </div>

      {/* Tabs for detailed breakdown */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            {t("quotes.create.tripTransparency.tabs.overview")}
          </TabsTrigger>
          <TabsTrigger value="route">
            {t("quotes.create.tripTransparency.tabs.route")}
          </TabsTrigger>
          <TabsTrigger value="costs">
            {t("quotes.create.tripTransparency.tabs.costs")}
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-4">
                {/* Price Summary */}
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {t("quotes.create.tripTransparency.suggestedPrice")}
                  </span>
                  <span className="text-xl font-bold">{formatPrice(price)}</span>
                </div>
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="text-muted-foreground">
                    {t("quotes.create.tripTransparency.internalCost")}
                  </span>
                  <span className="font-medium">{formatPrice(internalCost)}</span>
                </div>
                <div className="flex items-center justify-between py-2">
                  <span className="text-muted-foreground">
                    {t("quotes.create.tripTransparency.grossMargin")}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">
                      {formatPrice(price - internalCost)}
                    </span>
                    <ProfitabilityIndicator marginPercent={marginPercent} />
                  </div>
                </div>

                {/* Vehicle Selection Info */}
                {tripAnalysis.vehicleSelection?.selectedVehicle && (
                  <div className="mt-4 p-3 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      <TruckIcon className="size-4 text-muted-foreground" />
                      <span className="font-medium">
                        {tripAnalysis.vehicleSelection.selectedVehicle.vehicleName}
                      </span>
                      <span className="text-muted-foreground">
                        {t("quotes.create.tripTransparency.from")}{" "}
                        {tripAnalysis.vehicleSelection.selectedVehicle.baseName}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Route Tab - Segments A/B/C */}
        <TabsContent value="route" className="mt-4">
          <Card>
            <CardContent className="pt-4">
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
                  {tripAnalysis.segments.approach && (
                    <SegmentRow
                      segment={tripAnalysis.segments.approach}
                      label={t("quotes.create.tripTransparency.segments.approach")}
                      description={t("quotes.create.tripTransparency.segments.approachDesc")}
                    />
                  )}
                  <SegmentRow
                    segment={tripAnalysis.segments.service}
                    label={t("quotes.create.tripTransparency.segments.service")}
                    description={t("quotes.create.tripTransparency.segments.serviceDesc")}
                    isMain
                  />
                  {tripAnalysis.segments.return && (
                    <SegmentRow
                      segment={tripAnalysis.segments.return}
                      label={t("quotes.create.tripTransparency.segments.return")}
                      description={t("quotes.create.tripTransparency.segments.returnDesc")}
                    />
                  )}
                  {/* Total Row */}
                  <TableRow className="font-medium bg-muted/50">
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

              {/* Routing Source */}
              <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
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
        <TabsContent value="costs" className="mt-4">
          <Card>
            <CardContent className="pt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("quotes.create.tripTransparency.costType")}</TableHead>
                    <TableHead className="text-right">
                      {t("quotes.create.tripTransparency.amount")}
                    </TableHead>
                    <TableHead className="text-right">
                      {t("quotes.create.tripTransparency.details")}
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <CostRow
                    icon={FuelIcon}
                    label={t("quotes.create.tripTransparency.costs.fuel")}
                    amount={tripAnalysis.costBreakdown.fuel.amount}
                    details={`${tripAnalysis.costBreakdown.fuel.distanceKm.toFixed(1)} km × ${tripAnalysis.costBreakdown.fuel.consumptionL100km} L/100km × ${formatPrice(tripAnalysis.costBreakdown.fuel.pricePerLiter)}/L`}
                  />
                  <CostRow
                    icon={RouteIcon}
                    label={t("quotes.create.tripTransparency.costs.tolls")}
                    amount={tripAnalysis.costBreakdown.tolls.amount}
                    details={`${tripAnalysis.costBreakdown.tolls.distanceKm.toFixed(1)} km × ${formatPrice(tripAnalysis.costBreakdown.tolls.ratePerKm)}/km`}
                  />
                  <CostRow
                    icon={TruckIcon}
                    label={t("quotes.create.tripTransparency.costs.wear")}
                    amount={tripAnalysis.costBreakdown.wear.amount}
                    details={`${tripAnalysis.costBreakdown.wear.distanceKm.toFixed(1)} km × ${formatPrice(tripAnalysis.costBreakdown.wear.ratePerKm)}/km`}
                  />
                  <CostRow
                    icon={ClockIcon}
                    label={t("quotes.create.tripTransparency.costs.driver")}
                    amount={tripAnalysis.costBreakdown.driver.amount}
                    details={`${formatDuration(tripAnalysis.costBreakdown.driver.durationMinutes)} × ${formatPrice(tripAnalysis.costBreakdown.driver.hourlyRate)}/h`}
                  />
                  {tripAnalysis.costBreakdown.parking.amount > 0 && (
                    <CostRow
                      icon={MapIcon}
                      label={t("quotes.create.tripTransparency.costs.parking")}
                      amount={tripAnalysis.costBreakdown.parking.amount}
                      details={tripAnalysis.costBreakdown.parking.description}
                    />
                  )}
                  {/* Total Row */}
                  <TableRow className="font-medium bg-muted/50">
                    <TableCell>
                      {t("quotes.create.tripTransparency.totalCost")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(tripAnalysis.costBreakdown.total)}
                    </TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
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
        <div className="flex items-center gap-2 text-muted-foreground mb-1">
          <Icon className="size-4" />
          <span className="text-xs font-medium">{label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">{value}</span>
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

function SegmentRow({ segment, label, description, isMain = false }: SegmentRowProps) {
  return (
    <TableRow className={isMain ? "bg-primary/5" : ""}>
      <TableCell>
        <div>
          <span className={cn("font-medium", isMain && "text-primary")}>
            {label}
          </span>
          <div className="text-xs text-muted-foreground">{description}</div>
        </div>
      </TableCell>
      <TableCell className="text-right">
        {formatDistance(segment.distanceKm)}
        {segment.isEstimated && (
          <span className="text-xs text-muted-foreground ml-1">*</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        {formatDuration(segment.durationMinutes)}
      </TableCell>
      <TableCell className="text-right">{formatPrice(segment.cost.total)}</TableCell>
    </TableRow>
  );
}

interface CostRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  amount: number;
  details: string;
}

function CostRow({ icon: Icon, label, amount, details }: CostRowProps) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">{formatPrice(amount)}</TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        {details}
      </TableCell>
    </TableRow>
  );
}

function TripTransparencySkeleton() {
  return (
    <>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-6 w-24" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-20 mb-2" />
              <Skeleton className="h-6 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="pt-4 space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    </>
  );
}

export default TripTransparencyPanel;
