"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib";
import { 
  EuroIcon, 
  TrendingUpIcon,
  CalculatorIcon,
  FuelIcon,
  CarIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Quote } from "../types";

/**
 * Story 29.2: QuoteMultiMissionTotals Component
 * 
 * Displays aggregated totals for multi-mission quotes:
 * - Total price (sum of all lines)
 * - Internal cost
 * - Gross margin
 * - Margin percentage
 */

interface QuoteMultiMissionTotalsProps {
  quote: Quote;
  className?: string;
}

function formatPrice(price: string | number | null | undefined): string {
  if (price === null || price === undefined) return "—";
  const numPrice = typeof price === "string" ? parseFloat(price) : price;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(numPrice);
}

function formatMargin(margin: number | null | undefined): string {
  if (margin === null || margin === undefined) return "—";
  return `${margin.toFixed(1)}%`;
}

export function QuoteMultiMissionTotals({ quote, className }: QuoteMultiMissionTotalsProps) {
  const t = useTranslations("quotes.detail");

  // Calculate totals from lines
  const lines = quote.lines || [];
  const totalLinesPrice = lines.reduce((sum, line) => {
    const price = typeof line.totalPrice === "string" 
      ? parseFloat(line.totalPrice) 
      : (line.totalPrice || 0);
    return sum + price;
  }, 0);

  // Use quote-level values for internal cost and margin
  const finalPrice = parseFloat(quote.finalPrice);
  const internalCost = quote.internalCost ? parseFloat(quote.internalCost) : null;
  const marginPercent = quote.marginPercent ? parseFloat(quote.marginPercent) : null;
  const grossMargin = internalCost !== null ? finalPrice - internalCost : null;

  // Profitability indicator
  const getProfitabilityColor = (margin: number | null) => {
    if (margin === null) return "text-muted-foreground";
    if (margin >= 20) return "text-green-600";
    if (margin >= 0) return "text-amber-600";
    return "text-red-600";
  };

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <CalculatorIcon className="size-4" />
            {t("totals.title")}
          </CardTitle>
          <Badge variant="secondary">
            {lines.length} {lines.length > 1 ? t("totals.services") : t("totals.service")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* Total Price */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <EuroIcon className="size-3" />
              {t("totals.totalPrice")}
            </div>
            <div className="text-2xl font-bold">
              {formatPrice(finalPrice)}
            </div>
            {totalLinesPrice !== finalPrice && (
              <div className="text-xs text-muted-foreground">
                ({t("totals.linesTotal")}: {formatPrice(totalLinesPrice)})
              </div>
            )}
          </div>

          {/* Internal Cost */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <FuelIcon className="size-3" />
              {t("totals.internalCost")}
            </div>
            <div className="text-xl font-semibold">
              {formatPrice(internalCost)}
            </div>
          </div>

          {/* Gross Margin */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <TrendingUpIcon className="size-3" />
              {t("totals.grossMargin")}
            </div>
            <div className={cn("text-xl font-semibold", getProfitabilityColor(marginPercent))}>
              {formatPrice(grossMargin)}
            </div>
          </div>

          {/* Margin Percentage */}
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <CarIcon className="size-3" />
              {t("totals.marginPercent")}
            </div>
            <div className={cn("text-xl font-semibold flex items-center gap-2", getProfitabilityColor(marginPercent))}>
              {formatMargin(marginPercent)}
              {marginPercent !== null && (
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  marginPercent >= 20 ? "bg-green-500" : marginPercent >= 0 ? "bg-amber-500" : "bg-red-500"
                )} />
              )}
            </div>
          </div>
        </div>

        {/* Pricing Mode */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t("totals.pricingMode")}</span>
          <Badge variant={quote.pricingMode === "FIXED_GRID" ? "default" : "secondary"}>
            {quote.pricingMode === "FIXED_GRID" ? "Grille Fixe" : "Dynamique"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

export default QuoteMultiMissionTotals;
