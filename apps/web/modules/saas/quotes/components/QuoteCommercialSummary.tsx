"use client";

import { Badge } from "@ui/components/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import {
  CalendarIcon,
  CarIcon,
  ClockIcon,
  MapPinIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import type { Quote } from "../types";
import { formatPrice, formatMargin } from "../types";

interface QuoteCommercialSummaryProps {
  quote: Quote;
  className?: string;
}

/**
 * QuoteCommercialSummary Component
 * 
 * Left column of the Quote Detail page.
 * Displays immutable commercial data for SENT/ACCEPTED quotes.
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
 * @see FR32: Sent quotes remain commercially fixed
 */
export function QuoteCommercialSummary({
  quote,
  className,
}: QuoteCommercialSummaryProps) {
  const t = useTranslations();

  const marginPercent = quote.marginPercent ? parseFloat(quote.marginPercent) : null;
  const internalCost = quote.internalCost ? parseFloat(quote.internalCost) : null;
  const suggestedPrice = parseFloat(quote.suggestedPrice);
  const finalPrice = parseFloat(quote.finalPrice);

  // Extract applied rules if available
  const appliedRules = quote.appliedRules as { rules?: Array<{ type: string; description: string }> } | null;
  const rules = appliedRules?.rules || [];

  // Format pickup date
  const pickupDate = new Date(quote.pickupAt);
  const formattedDate = pickupDate.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const formattedTime = pickupDate.toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className={cn("space-y-4", className)}>
      {/* Pricing Mode */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              {t("quotes.detail.commercial.pricing")}
            </CardTitle>
            <Badge variant={quote.pricingMode === "FIXED_GRID" ? "default" : "secondary"}>
              {quote.pricingMode === "FIXED_GRID"
                ? t("quotes.create.pricingMode.fixedGrid")
                : t("quotes.create.pricingMode.dynamic")}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Prices */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {t("quotes.detail.commercial.suggestedPrice")}
              </span>
              <span>{formatPrice(suggestedPrice)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="font-medium">
                {t("quotes.detail.commercial.finalPrice")}
              </span>
              <span className="text-xl font-bold">{formatPrice(finalPrice)}</span>
            </div>
          </div>

          <hr className="border-border" />

          {/* Cost & Margin */}
          {internalCost !== null && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("quotes.detail.commercial.internalCost")}
                </span>
                <span>{formatPrice(internalCost)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("quotes.detail.commercial.grossMargin")}
                </span>
                <span>{formatPrice(finalPrice - internalCost)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t("quotes.detail.commercial.marginPercent")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{formatMargin(marginPercent)}</span>
                  {marginPercent !== null && (
                    <ProfitabilityIndicator marginPercent={marginPercent} compact />
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Applied Rules */}
          {rules.length > 0 && (
            <>
              <hr className="border-border" />
              <div className="space-y-2">
                <span className="text-sm font-medium">
                  {t("quotes.detail.commercial.appliedRules")}
                </span>
                <div className="space-y-1">
                  {rules.slice(0, 3).map((rule, index) => (
                    <div key={index} className="text-xs text-muted-foreground">
                      • {rule.description || rule.type}
                    </div>
                  ))}
                  {rules.length > 3 && (
                    <div className="text-xs text-muted-foreground">
                      +{rules.length - 3} {t("quotes.detail.commercial.moreRules")}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Trip Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("quotes.detail.commercial.tripDetails")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Pickup */}
          <div className="flex items-start gap-2">
            <MapPinIcon className="size-4 text-green-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium">{t("quotes.detail.commercial.pickup")}</div>
              <div className="text-muted-foreground">{quote.pickupAddress}</div>
            </div>
          </div>

          {/* Dropoff */}
          <div className="flex items-start gap-2">
            <MapPinIcon className="size-4 text-red-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium">{t("quotes.detail.commercial.dropoff")}</div>
              <div className="text-muted-foreground">{quote.dropoffAddress}</div>
            </div>
          </div>

          <hr className="border-border" />

          {/* Date/Time */}
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon className="size-4 text-muted-foreground" />
            <span>{formattedDate}</span>
            <ClockIcon className="size-4 text-muted-foreground ml-2" />
            <span>{formattedTime}</span>
          </div>

          {/* Vehicle & Passengers */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CarIcon className="size-4 text-muted-foreground" />
              <span>{quote.vehicleCategory.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <UsersIcon className="size-4 text-muted-foreground" />
              <span>{quote.passengerCount}</span>
            </div>
          </div>

          {/* Trip Type */}
          <Badge variant="outline" className="text-xs">
            {t(`quotes.create.tripTypes.${quote.tripType.toLowerCase()}`)}
          </Badge>
        </CardContent>
      </Card>
    </div>
  );
}

export default QuoteCommercialSummary;
