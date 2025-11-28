"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Textarea } from "@ui/components/textarea";
import { Skeleton } from "@ui/components/skeleton";
import {
  AlertOctagonIcon,
  CalendarIcon,
  EuroIcon,
  Loader2Icon,
  PlusIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import { AddQuoteFeeDialog, type AddedFee } from "./AddQuoteFeeDialog";
import { AddedFeesList } from "./AddedFeesList";
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
  // Story 6.5: Blocking violations flag
  hasBlockingViolations?: boolean;
  // Custom submit label for edit mode
  submitLabel?: string;
  // Added fees and promotions
  addedFees?: AddedFee[];
  onAddFee?: (fee: AddedFee) => void;
  onRemoveFee?: (feeId: string) => void;
}

/**
 * QuotePricingPanel Component
 * 
 * Right column of the Create Quote cockpit.
 * Contains suggested price, final price input, notes, validity, and submit button.
 * 
 * Story 6.5: Submit button is disabled when blocking violations exist.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see Story 6.5: Blocking and Non-Blocking Alerts
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
  hasBlockingViolations = false,
  submitLabel,
  addedFees = [],
  onAddFee,
  onRemoveFee,
}: QuotePricingPanelProps) {
  const t = useTranslations();

  // Calculate margin based on final price and internal cost
  const calculateMargin = (finalPrice: number, internalCost: number): number => {
    if (finalPrice <= 0) return 0;
    return ((finalPrice - internalCost) / finalPrice) * 100;
  };

  const internalCost = pricingResult?.internalCost ?? 0;
  const suggestedPrice = pricingResult?.price ?? 0;
  
  // Calculate total of added fees (positive for fees, negative for promotions)
  const addedFeesTotal = addedFees.reduce((sum, fee) => {
    return sum + (fee.type === "promotion" ? -Math.abs(fee.amount) : fee.amount);
  }, 0);
  
  // Total price including fees and promotions
  const totalPriceWithFees = formData.finalPrice + addedFeesTotal;
  const currentMargin = calculateMargin(totalPriceWithFees, internalCost);

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

          {/* Total with fees/promotions */}
          {addedFeesTotal !== 0 && formData.finalPrice > 0 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("quotes.create.basePrice")}
                </span>
                <span>{formatPrice(formData.finalPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className={addedFeesTotal > 0 ? "text-muted-foreground" : "text-green-600"}>
                  {addedFeesTotal > 0 ? t("quotes.create.addedFeesLabel") : t("quotes.create.promotionsLabel")}
                </span>
                <span className={addedFeesTotal > 0 ? "" : "text-green-600"}>
                  {addedFeesTotal > 0 ? "+" : ""}{formatPrice(addedFeesTotal)}
                </span>
              </div>
              <hr className="border-border" />
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {t("quotes.create.totalPrice")}
                </span>
                <span className="text-lg font-bold">
                  {formatPrice(totalPriceWithFees)}
                </span>
              </div>
            </div>
          )}

          {/* Live Margin Calculation */}
          {totalPriceWithFees > 0 && internalCost > 0 && (
            <div className="p-3 bg-muted/50 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("quotes.create.grossMargin")}
                </span>
                <span className="font-medium">
                  {formatPrice(totalPriceWithFees - internalCost)}
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

        </CardContent>
      </Card>

      {/* Added Fees and Promotions */}
      {onAddFee && onRemoveFee && (
        <>
          <div className="flex justify-end">
            <AddQuoteFeeDialog
              onAdd={onAddFee}
              disabled={isSubmitting}
              existingFeeIds={addedFees.filter(f => f.type === "fee").map(f => f.id)}
              existingPromotionIds={addedFees.filter(f => f.type === "promotion").map(f => f.id)}
            />
          </div>
          <AddedFeesList
            fees={addedFees}
            onRemove={onRemoveFee}
            disabled={isSubmitting}
          />
        </>
      )}

      {/* Submit Button - Story 6.5: Disabled when blocking violations exist */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="w-full">
              <Button
                type="button"
                size="lg"
                className={cn(
                  "w-full",
                  hasBlockingViolations && "opacity-50 cursor-not-allowed"
                )}
                onClick={onSubmit}
                disabled={!isFormValid || isSubmitting || isCalculating || hasBlockingViolations}
              >
                {isSubmitting ? (
                  <>
                    <Loader2Icon className="size-4 mr-2 animate-spin" />
                    {t("quotes.create.creating")}
                  </>
                ) : hasBlockingViolations ? (
                  <>
                    <AlertOctagonIcon className="size-4 mr-2" />
                    {t("quotes.compliance.blocked")}
                  </>
                ) : (
                  <>
                    <PlusIcon className="size-4 mr-2" />
                    {submitLabel || t("quotes.create.createQuote")}
                  </>
                )}
              </Button>
            </div>
          </TooltipTrigger>
          {hasBlockingViolations && (
            <TooltipContent side="top" className="max-w-xs">
              <p>{t("quotes.compliance.blockedTooltip")}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>

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
