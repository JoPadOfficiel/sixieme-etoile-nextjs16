"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { cn } from "@ui/lib";
import { 
  MapPinIcon, 
  CalendarIcon, 
  ClockIcon,
  XIcon,
  RouteIcon,
  EuroIcon,
  GaugeIcon,
  PercentIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { TripTransparencyPanel } from "./TripTransparencyPanel";
import { useQuoteLineSelection } from "../contexts/QuoteLineSelectionContext";
import type { Quote, PricingResult, TripAnalysis } from "../types";

/**
 * Story 29.2: QuoteLineDetailPanel Component
 * 
 * Displays detailed TripTransparency panel for the selected quote line.
 * Shows Overview, Route, and Costs tabs for the specific service.
 */

interface QuoteLineDetailPanelProps {
  lines: Quote["lines"];
  className?: string;
}

interface SourceData {
  origin?: string;
  destination?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  dropoffLatitude?: number;
  dropoffLongitude?: number;
  pickupAt?: string;
  tripType?: string;
  encodedPolyline?: string;
  pricingResult?: PricingResult;
  tripAnalysis?: TripAnalysis;
  formData?: {
    vehicleCategoryId?: string;
    vehicleCategoryName?: string;
    tripType?: string;
    pickupAt?: string;
  };
}

function formatDateTime(isoString: string | undefined): string {
  if (!isoString) return "-";
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

function formatPrice(price: string | number | undefined): string {
  if (price === undefined || price === null) return "-";
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(numPrice);
}

export function QuoteLineDetailPanel({ lines, className }: QuoteLineDetailPanelProps) {
  const t = useTranslations("quotes.detail");
  const { selectedLineId, setSelectedLineId } = useQuoteLineSelection();

  // Find the selected line
  const selectedLine = useMemo(() => {
    if (!selectedLineId || !lines) return null;
    return lines.find(line => line.id === selectedLineId) || null;
  }, [selectedLineId, lines]);

  // Extract data from selected line
  const lineData = useMemo(() => {
    if (!selectedLine) return null;
    
    const sourceData = selectedLine.sourceData as SourceData | undefined;
    const tripType = sourceData?.tripType || sourceData?.formData?.tripType || selectedLine.type || "TRANSFER";
    const origin = sourceData?.origin || "-";
    const destination = sourceData?.destination || "-";
    const pickupAt = sourceData?.pickupAt || sourceData?.formData?.pickupAt;
    
    // Extract or build pricingResult from sourceData
    const pricingResult = sourceData?.pricingResult || null;
    const tripAnalysis = sourceData?.tripAnalysis || pricingResult?.tripAnalysis || null;
    
    // Build route coordinates
    const routeCoordinates = {
      pickup: sourceData?.pickupLatitude && sourceData?.pickupLongitude
        ? { 
            lat: sourceData.pickupLatitude, 
            lng: sourceData.pickupLongitude, 
            address: origin 
          }
        : undefined,
      dropoff: sourceData?.dropoffLatitude && sourceData?.dropoffLongitude
        ? { 
            lat: sourceData.dropoffLatitude, 
            lng: sourceData.dropoffLongitude, 
            address: destination 
          }
        : undefined,
    };

    return {
      tripType,
      origin,
      destination,
      pickupAt,
      totalPrice: selectedLine.totalPrice,
      pricingResult,
      tripAnalysis,
      routeCoordinates,
      encodedPolyline: sourceData?.encodedPolyline,
      lineIndex: lines?.findIndex(l => l.id === selectedLine.id) ?? 0,
    };
  }, [selectedLine, lines]);

  // If no line is selected, don't render
  if (!selectedLineId || !selectedLine || !lineData) {
    return null;
  }

  const handleClose = () => {
    setSelectedLineId(null);
  };

  // Build a minimal pricingResult if we have tripAnalysis
  const displayPricingResult: PricingResult | null = lineData.pricingResult || (lineData.tripAnalysis ? {
    pricingMode: "DYNAMIC" as const,
    price: typeof lineData.totalPrice === "string" ? parseFloat(lineData.totalPrice) : (lineData.totalPrice || 0),
    currency: "EUR",
    internalCost: lineData.tripAnalysis.totalInternalCost || 0,
    margin: (typeof lineData.totalPrice === "string" ? parseFloat(lineData.totalPrice) : (lineData.totalPrice || 0)) - (lineData.tripAnalysis.totalInternalCost || 0),
    marginPercent: lineData.tripAnalysis.totalInternalCost 
      ? (((typeof lineData.totalPrice === "string" ? parseFloat(lineData.totalPrice) : (lineData.totalPrice || 0)) - lineData.tripAnalysis.totalInternalCost) / (typeof lineData.totalPrice === "string" ? parseFloat(lineData.totalPrice) : (lineData.totalPrice || 1))) * 100
      : 0,
    profitabilityIndicator: "green" as const,
    matchedGrid: null,
    appliedRules: [],
    isContractPrice: false,
    fallbackReason: null,
    tripAnalysis: lineData.tripAnalysis,
    complianceResult: null,
  } : null);

  return (
    <Card className={cn("border-primary/20 bg-primary/5", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <RouteIcon className="size-4 text-primary" />
            {t("lineDetail.title")} #{lineData.lineIndex + 1}
            <Badge variant="default" className="ml-2">
              {lineData.tripType}
            </Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <XIcon className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Line Summary Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-background rounded-lg border">
          {/* Route */}
          <div className="col-span-2 space-y-1">
            <div className="flex items-center gap-1 text-sm">
              <MapPinIcon className="size-3 text-green-500 shrink-0" />
              <span className="truncate font-medium" title={lineData.origin}>
                {lineData.origin}
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPinIcon className="size-3 text-red-500 shrink-0" />
              <span className="truncate" title={lineData.destination}>
                {lineData.destination}
              </span>
            </div>
          </div>

          {/* Date/Time */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <CalendarIcon className="size-3" />
              {t("lineDetail.dateTime")}
            </div>
            <div className="text-sm font-medium">
              {formatDateTime(lineData.pickupAt)}
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <EuroIcon className="size-3" />
              {t("lineDetail.price")}
            </div>
            <div className="text-lg font-bold text-primary">
              {formatPrice(lineData.totalPrice)}
            </div>
          </div>
        </div>

        {/* TripTransparency Panel for this line */}
        {displayPricingResult ? (
          <TripTransparencyPanel
            pricingResult={displayPricingResult}
            isLoading={false}
            routeCoordinates={lineData.routeCoordinates}
            encodedPolyline={lineData.encodedPolyline}
          />
        ) : (
          /* Fallback: Show basic info if no tripAnalysis */
          <div className="p-4 bg-muted/50 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <GaugeIcon className="size-3" />
                  {t("lineDetail.distance")}
                </div>
                <div className="text-sm font-medium">—</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ClockIcon className="size-3" />
                  {t("lineDetail.duration")}
                </div>
                <div className="text-sm font-medium">—</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <EuroIcon className="size-3" />
                  {t("lineDetail.internalCost")}
                </div>
                <div className="text-sm font-medium">—</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <PercentIcon className="size-3" />
                  {t("lineDetail.margin")}
                </div>
                <div className="text-sm font-medium">—</div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">
              {t("lineDetail.noDetailedData")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default QuoteLineDetailPanel;
