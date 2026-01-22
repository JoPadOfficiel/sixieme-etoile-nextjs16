"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { cn } from "@ui/lib";
import { 
  MapPinIcon, 
  CalendarIcon, 
  CarIcon, 
  EyeIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useQuoteLineSelection } from "../contexts/QuoteLineSelectionContext";
import type { Quote } from "../types";

/**
 * Story 29.2: QuoteLinesTable Component
 * 
 * Displays all QuoteLines in a table format for multi-mission quotes.
 * Clicking a row selects that line and triggers map zoom.
 */

interface QuoteLinesTableProps {
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
  formData?: {
    vehicleCategoryId?: string;
    vehicleCategoryName?: string;
    tripType?: string;
    pickupAt?: string;
  };
  pricingResult?: {
    distance?: number;
    duration?: number;
  };
}

function getTripTypeBadgeVariant(tripType: string): "default" | "secondary" | "outline" {
  switch (tripType?.toUpperCase()) {
    case "TRANSFER":
      return "default";
    case "EXCURSION":
      return "secondary";
    case "DISPO":
      return "outline";
    default:
      return "outline";
  }
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

function truncateAddress(address: string | undefined, maxLength = 30): string {
  if (!address) return "-";
  if (address.length <= maxLength) return address;
  return `${address.substring(0, maxLength)}...`;
}

export function QuoteLinesTable({ lines, className }: QuoteLinesTableProps) {
  const t = useTranslations("quotes.detail");
  const { selectedLineId, setSelectedLineId } = useQuoteLineSelection();

  if (!lines || lines.length === 0) {
    return null;
  }

  const handleRowClick = (lineId: string) => {
    if (selectedLineId === lineId) {
      setSelectedLineId(null);
    } else {
      setSelectedLineId(lineId);
    }
  };

  const handleViewAll = () => {
    setSelectedLineId(null);
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CarIcon className="size-4" />
            {t("lines.title")} ({lines.length})
          </CardTitle>
          {selectedLineId && (
            <Button variant="ghost" size="sm" onClick={handleViewAll}>
              <EyeIcon className="size-4 mr-1" />
              {t("lines.viewAll")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead className="w-24">{t("lines.type")}</TableHead>
                <TableHead>{t("lines.route")}</TableHead>
                <TableHead className="w-40">{t("lines.dateTime")}</TableHead>
                <TableHead className="w-28 text-right">{t("lines.price")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, index) => {
                const sourceData = line.sourceData as SourceData | undefined;
                const tripType = sourceData?.tripType || sourceData?.formData?.tripType || line.type || "TRANSFER";
                const origin = sourceData?.origin || "-";
                const destination = sourceData?.destination || "-";
                const pickupAt = sourceData?.pickupAt || sourceData?.formData?.pickupAt;
                const hasCoordinates = !!(
                  sourceData?.pickupLatitude && 
                  sourceData?.pickupLongitude && 
                  sourceData?.dropoffLatitude && 
                  sourceData?.dropoffLongitude
                );
                const isSelected = selectedLineId === line.id;

                return (
                  <TableRow
                    key={line.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      isSelected && "bg-primary/10 border-l-2 border-l-primary",
                      !isSelected && "hover:bg-muted/50"
                    )}
                    onClick={() => handleRowClick(line.id)}
                  >
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <Badge variant={getTripTypeBadgeVariant(tripType)}>
                        {tripType}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-1 text-sm">
                          <MapPinIcon className="size-3 text-green-500 shrink-0" />
                          <span className="truncate" title={origin}>
                            {truncateAddress(origin)}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPinIcon className="size-3 text-red-500 shrink-0" />
                          <span className="truncate" title={destination}>
                            {truncateAddress(destination)}
                          </span>
                        </div>
                        {!hasCoordinates && (
                          <div className="flex items-center gap-1 text-xs text-amber-600">
                            <AlertTriangleIcon className="size-3" />
                            {t("lines.noCoordinates")}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm">
                        <CalendarIcon className="size-3 text-muted-foreground" />
                        {formatDateTime(pickupAt)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(line.totalPrice)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuoteLinesTable;
