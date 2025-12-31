"use client";

import { Badge } from "@ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import {
  CheckCircle2Icon,
  ClockIcon,
  EuroIcon,
  FuelIcon,
  GaugeIcon,
  RouteIcon,
  TruckIcon,
  ZapIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

/**
 * Story 18.6: Route scenario type
 */
type RouteScenarioType = "MIN_TIME" | "MIN_DISTANCE" | "MIN_TCO";

/**
 * Story 18.6: Single route scenario with full cost breakdown
 */
interface RouteScenario {
  type: RouteScenarioType;
  label: string;
  durationMinutes: number;
  distanceKm: number;
  tollCost: number;
  fuelCost: number;
  driverCost: number;
  wearCost: number;
  tco: number;
  encodedPolyline?: string | null;
  isFromCache: boolean;
  isRecommended: boolean;
}

/**
 * Story 18.6: Complete route scenarios result
 */
interface RouteScenarios {
  scenarios: RouteScenario[];
  selectedScenario: RouteScenarioType;
  selectionReason: string;
  selectionOverridden: boolean;
  fallbackUsed: boolean;
  fallbackReason?: string;
  calculatedAt: string;
}

interface RouteScenarioComparisonProps {
  routeScenarios: RouteScenarios | null | undefined;
  onScenarioSelect?: (scenarioType: RouteScenarioType) => void;
  className?: string;
}

/**
 * Story 18.6: Route Scenario Comparison Component
 * 
 * Displays a comparison table of the three route scenarios:
 * - MIN_TIME: Fastest route (pessimistic traffic)
 * - MIN_DISTANCE: Shortest distance route
 * - MIN_TCO: Optimal total cost of ownership
 * 
 * @see FR83: Multi-scenario route optimization
 */
export function RouteScenarioComparison({
  routeScenarios,
  onScenarioSelect,
  className,
}: RouteScenarioComparisonProps) {
  const t = useTranslations();

  if (!routeScenarios || routeScenarios.scenarios.length === 0) {
    return null;
  }

  const { scenarios, selectedScenario, selectionReason, fallbackUsed } = routeScenarios;

  // Get scenario icon
  const getScenarioIcon = (type: RouteScenarioType) => {
    switch (type) {
      case "MIN_TIME":
        return ClockIcon;
      case "MIN_DISTANCE":
        return GaugeIcon;
      case "MIN_TCO":
        return EuroIcon;
    }
  };

  // Get scenario color
  const getScenarioColor = (type: RouteScenarioType, isSelected: boolean) => {
    if (isSelected) return "bg-primary text-primary-foreground";
    switch (type) {
      case "MIN_TIME":
        return "bg-blue-50 text-blue-700 hover:bg-blue-100";
      case "MIN_DISTANCE":
        return "bg-green-50 text-green-700 hover:bg-green-100";
      case "MIN_TCO":
        return "bg-amber-50 text-amber-700 hover:bg-amber-100";
    }
  };

  // Format duration
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours === 0) return `${mins} min`;
    return `${hours}h ${mins}min`;
  };

  // Format price
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
    }).format(amount);
  };

  // Format distance
  const formatDistance = (km: number) => {
    return `${km.toFixed(1)} km`;
  };

  // Find best values for highlighting
  const minDuration = Math.min(...scenarios.map(s => s.durationMinutes));
  const minDistance = Math.min(...scenarios.map(s => s.distanceKm));
  const minTco = Math.min(...scenarios.map(s => s.tco));

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RouteIcon className="size-4" />
            {t("quotes.create.tripTransparency.routeScenarios.title")}
          </CardTitle>
          {fallbackUsed && (
            <Badge variant="outline" className="text-xs text-amber-600">
              {t("quotes.create.tripTransparency.routeScenarios.partialData")}
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {selectionReason}
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">
                {t("quotes.create.tripTransparency.routeScenarios.scenario")}
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <ClockIcon className="size-3" />
                  {t("quotes.create.tripTransparency.routeScenarios.duration")}
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <GaugeIcon className="size-3" />
                  {t("quotes.create.tripTransparency.routeScenarios.distance")}
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <RouteIcon className="size-3" />
                  {t("quotes.create.tripTransparency.routeScenarios.tolls")}
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <FuelIcon className="size-3" />
                  {t("quotes.create.tripTransparency.routeScenarios.fuel")}
                </div>
              </TableHead>
              <TableHead className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <TruckIcon className="size-3" />
                  {t("quotes.create.tripTransparency.routeScenarios.driver")}
                </div>
              </TableHead>
              <TableHead className="text-right font-semibold">
                <div className="flex items-center justify-end gap-1">
                  <EuroIcon className="size-3" />
                  TCO
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scenarios.map((scenario) => {
              const Icon = getScenarioIcon(scenario.type);
              const isSelected = scenario.type === selectedScenario;
              const isBestDuration = scenario.durationMinutes === minDuration;
              const isBestDistance = scenario.distanceKm === minDistance;
              const isBestTco = scenario.tco === minTco;

              return (
                <TableRow
                  key={scenario.type}
                  className={cn(
                    "cursor-pointer transition-colors",
                    isSelected && "bg-primary/5",
                    !isSelected && "hover:bg-muted/50"
                  )}
                  onClick={() => onScenarioSelect?.(scenario.type)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className={cn(
                          "flex items-center gap-1 text-xs",
                          getScenarioColor(scenario.type, isSelected)
                        )}
                      >
                        <Icon className="size-3" />
                        {scenario.label}
                      </Badge>
                      {scenario.isRecommended && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <CheckCircle2Icon className="size-4 text-green-600" />
                            </TooltipTrigger>
                            <TooltipContent>
                              {t("quotes.create.tripTransparency.routeScenarios.recommended")}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(isBestDuration && "text-green-600 font-medium")}>
                      {formatDuration(scenario.durationMinutes)}
                    </span>
                    {isBestDuration && (
                      <ZapIcon className="size-3 inline ml-1 text-green-600" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className={cn(isBestDistance && "text-green-600 font-medium")}>
                      {formatDistance(scenario.distanceKm)}
                    </span>
                    {isBestDistance && (
                      <ZapIcon className="size-3 inline ml-1 text-green-600" />
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(scenario.tollCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(scenario.fuelCost)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPrice(scenario.driverCost)}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    <span className={cn(isBestTco && "text-green-600")}>
                      {formatPrice(scenario.tco)}
                    </span>
                    {isBestTco && (
                      <CheckCircle2Icon className="size-3 inline ml-1 text-green-600" />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <ZapIcon className="size-3 text-green-600" />
            {t("quotes.create.tripTransparency.routeScenarios.bestValue")}
          </div>
          <div className="flex items-center gap-1">
            <CheckCircle2Icon className="size-3 text-green-600" />
            {t("quotes.create.tripTransparency.routeScenarios.recommendedOption")}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default RouteScenarioComparison;
