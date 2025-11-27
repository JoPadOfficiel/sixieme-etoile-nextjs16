"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Textarea } from "@ui/components/textarea";
import { Skeleton } from "@ui/components/skeleton";
import {
  CalendarIcon,
  EuroIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import type { CreateQuoteFormData, PricingResult } from "../types";
import { formatPrice } from "../types";

interface QuotePricingPanelProps {
  formData: CreateQuoteFormData;
  pricingResult: PricingResult | null;
  isCalculating: boolean;
  isSubmitting: boolean;
  onFormChange: <K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => void;
  onSubmit: () => void;
  className?: string;
}

/**
 * QuotePricingPanel Component
 * 
 * Right column of the Create Quote cockpit.
 * Contains suggested price, final price input, notes, validity, and submit button.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see UX Spec 8.3.2 Create Quote - Right Column
 * @see FR16 Operator Override with Live Profitability Feedback
 */
export function QuotePricingPanel({
  formData,
  pricingResult,
  isCalculating,
  isSubmitting,
  onFormChange,
  onSubmit,
  className,
}: QuotePricingPanelProps) {
  const t = useTranslations();

  // Calculate margin based on final price and internal cost
  const calculateMargin = (finalPrice: number, internalCost: number): number => {
    if (finalPrice <= 0) return 0;
    return ((finalPrice - internalCost) / finalPrice) * 100;
  };

  const internalCost = pricingResult?.internalCost ?? 0;
  const suggestedPrice = pricingResult?.price ?? 0;
  const currentMargin = calculateMargin(formData.finalPrice, internalCost);

  // Format date for date input
  const formatDateInput = (date: Date | null): string => {
    if (!date) return "";
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleValidUntilChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      onFormChange("validUntil", new Date(value));
    } else {
      onFormChange("validUntil", null);
    }
  };

  const handleFinalPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    onFormChange("finalPrice", value);
  };

  // Use suggested price when it changes
  const handleUseSuggestedPrice = () => {
    if (suggestedPrice > 0) {
      onFormChange("finalPrice", suggestedPrice);
    }
  };

  // Check if form is valid for submission
  const isFormValid =
    formData.contactId &&
    formData.pickupAddress &&
    formData.dropoffAddress &&
    formData.pickupAt &&
    formData.vehicleCategoryId &&
    formData.finalPrice > 0;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Pricing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("quotes.create.sections.pricing")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Suggested Price */}
          <div className="space-y-2">
            <Label>{t("quotes.create.suggestedPrice")}</Label>
            {isCalculating ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <EuroIcon className="size-4 text-muted-foreground" />
                    <span className="text-lg font-bold">
                      {suggestedPrice > 0 ? formatPrice(suggestedPrice) : "—"}
                    </span>
                  </div>
                </div>
                {suggestedPrice > 0 && formData.finalPrice !== suggestedPrice && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseSuggestedPrice}
                  >
                    {t("quotes.create.useSuggested")}
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Final Price */}
          <div className="space-y-2">
            <Label htmlFor="finalPrice">
              {t("quotes.create.finalPrice")} *
            </Label>
            <div className="relative">
              <EuroIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="finalPrice"
                type="number"
                min={0}
                step={0.01}
                value={formData.finalPrice || ""}
                onChange={handleFinalPriceChange}
                disabled={isSubmitting}
                className="pl-9 text-lg font-medium"
                placeholder="0.00"
              />
            </div>
          </div>

          {/* Live Margin Calculation */}
          {formData.finalPrice > 0 && internalCost > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("quotes.create.grossMargin")}
                </span>
                <span className="font-medium">
                  {formatPrice(formData.finalPrice - internalCost)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground text-sm">
                  {t("quotes.create.marginPercent")}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{currentMargin.toFixed(1)}%</span>
                  <ProfitabilityIndicator marginPercent={currentMargin} compact />
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options (placeholder for future optional fees & promotions) */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("quotes.create.sections.options")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Validity Date */}
          <div className="space-y-2">
            <Label htmlFor="validUntil">
              {t("quotes.create.validUntil")}
            </Label>
            <div className="relative">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                id="validUntil"
                type="date"
                value={formatDateInput(formData.validUntil)}
                onChange={handleValidUntilChange}
                disabled={isSubmitting}
                className="pl-9"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">{t("quotes.create.notes")}</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => onFormChange("notes", e.target.value)}
              disabled={isSubmitting}
              rows={3}
              placeholder={t("quotes.create.notesPlaceholder")}
            />
          </div>

          {/* Future: Optional Fees Checklist */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            {t("quotes.create.optionalFeesComingSoon")}
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={onSubmit}
        disabled={!isFormValid || isSubmitting || isCalculating}
      >
        {isSubmitting ? (
          <>
            <Loader2Icon className="size-4 mr-2 animate-spin" />
            {t("quotes.create.creating")}
          </>
        ) : (
          <>
            <PlusIcon className="size-4 mr-2" />
            {t("quotes.create.createQuote")}
          </>
        )}
      </Button>

      {/* Validation Hints */}
      {!isFormValid && (
        <div className="text-xs text-muted-foreground space-y-1">
          {!formData.contactId && (
            <p>• {t("quotes.create.validation.contactRequired")}</p>
          )}
          {!formData.pickupAddress && (
            <p>• {t("quotes.create.validation.pickupRequired")}</p>
          )}
          {!formData.dropoffAddress && (
            <p>• {t("quotes.create.validation.dropoffRequired")}</p>
          )}
          {!formData.pickupAt && (
            <p>• {t("quotes.create.validation.dateTimeRequired")}</p>
          )}
          {!formData.vehicleCategoryId && (
            <p>• {t("quotes.create.validation.vehicleRequired")}</p>
          )}
          {formData.finalPrice <= 0 && (
            <p>• {t("quotes.create.validation.priceRequired")}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default QuotePricingPanel;
