"use client";

import { useState } from "react";
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
  LockIcon,
  PlusIcon,
  PencilIcon,
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
import { ContractPriceBadge } from "./ContractPriceBadge";
import { ConfirmOverrideDialog } from "./ConfirmOverrideDialog";
import { BidirectionalPriceToggle } from "./BidirectionalPriceToggle";
import type { CreateQuoteFormData, PricingResult, PricingMode } from "../types";
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
  // Story 16.4: Contract price locking
  partnerName?: string;
  isAdmin?: boolean;
  onContractPriceOverride?: (originalPrice: number) => void;
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
  // Story 16.4: Contract price locking
  partnerName,
  isAdmin = false,
  onContractPriceOverride,
}: QuotePricingPanelProps) {
  const t = useTranslations();
  
  // Story 16.4: State for override dialog
  const [showOverrideDialog, setShowOverrideDialog] = useState(false);
  const [priceOverridden, setPriceOverridden] = useState(false);
  

  
  // Story 19.5: Check if this is an OFF_GRID trip (manual pricing only)
  const isManualPricingMode = formData.tripType === "OFF_GRID" || pricingResult?.pricingMode === "MANUAL";

  // Calculate margin based on final price and internal cost
  const calculateMargin = (finalPrice: number, internalCost: number): number => {
    if (finalPrice <= 0) return 0;
    return ((finalPrice - internalCost) / finalPrice) * 100;
  };

  const internalCost = pricingResult?.internalCost ?? 0;
  
  // Story 24.9: Bidirectional Pricing Logic
  const bidirectionalInfo = pricingResult?.bidirectionalPricing;
  // Fix: Show toggle if bidirectional info exists, even if partnerGridPrice is null (indicates "No Grid" vs "Direct")
  const showBidirectionalToggle = !!bidirectionalInfo && 
                                  bidirectionalInfo.clientDirectPrice !== null;
                                  
  // Determine effective pricing mode (user selected > result default > DYNAMIC)
  const effectivePricingMode = formData.pricingMode || pricingResult?.pricingMode || "DYNAMIC";

  // Story 16.4: Check if this is a contract price (FIXED_GRID or PARTNER_GRID)
  // Story 24.9: Relaxed check to depend on effectivePricingMode
  const isContractPrice = effectivePricingMode === "FIXED_GRID" || effectivePricingMode === "PARTNER_GRID";
  const isPriceLocked = isContractPrice && !priceOverridden;
  
  // Determine effective suggested price
  let suggestedPrice = pricingResult?.price ?? 0;
  
  if (showBidirectionalToggle && bidirectionalInfo) {
    if ((effectivePricingMode === "PARTNER_GRID" || effectivePricingMode === "FIXED_GRID") && bidirectionalInfo.partnerGridPrice) {
      suggestedPrice = bidirectionalInfo.partnerGridPrice;
    } else if ((effectivePricingMode === "CLIENT_DIRECT" || effectivePricingMode === "DYNAMIC") && bidirectionalInfo.clientDirectPrice) {
      suggestedPrice = bidirectionalInfo.clientDirectPrice;
    }
  }

  // Handle pricing mode toggle
  const handlePricingModeChange = (mode: PricingMode) => {
    onFormChange("pricingMode", mode);
    
    // Story 24.9: Auto-update final price to matched selected mode
    if (bidirectionalInfo) {
      if ((mode === "PARTNER_GRID" || mode === "FIXED_GRID") && bidirectionalInfo.partnerGridPrice !== null) {
        onFormChange("finalPrice", bidirectionalInfo.partnerGridPrice);
        // Reset override state since we're switching to a potentially locked grid price
        setPriceOverridden(false);
      } else if ((mode === "CLIENT_DIRECT" || mode === "DYNAMIC") && bidirectionalInfo.clientDirectPrice !== null) {
        onFormChange("finalPrice", bidirectionalInfo.clientDirectPrice);
      }
    }
  };
  
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

  // Story 16.4: Handle click on locked price field (admin only)
  const handleLockedPriceClick = () => {
    if (isPriceLocked && isAdmin) {
      setShowOverrideDialog(true);
    }
  };

  // Story 16.4: Handle override confirmation
  const handleOverrideConfirm = () => {
    setPriceOverridden(true);
    if (onContractPriceOverride) {
      onContractPriceOverride(suggestedPrice);
    }
  };

  // Check if form is valid for submission
  // Story 16.8 & 16.9: Dropoff is optional for DISPO and OFF_GRID trips
  const isDropoffRequired = formData.tripType !== "DISPO" && formData.tripType !== "OFF_GRID";
  const isFormValid =
    formData.contactId &&
    formData.pickupAddress &&
    (!isDropoffRequired || formData.dropoffAddress) &&
    formData.pickupAt &&
    formData.vehicleCategoryId &&
    formData.finalPrice > 0 &&
    // Story 19.5: Notes required for OFF_GRID
    (!isManualPricingMode || formData.notes.trim().length > 0);

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
          {/* Story 24.9: Bidirectional Pricing Toggle */}
          {showBidirectionalToggle && bidirectionalInfo && (
            <div className="mb-4">
              <Label className="mb-2 block">{t("quotes.create.pricing.pricingStrategy")}</Label>
              <BidirectionalPriceToggle
                pricingInfo={bidirectionalInfo}
                currentMode={effectivePricingMode}
                onModeChange={handlePricingModeChange}
              />
            </div>
          )}

          {/* Suggested Price */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("quotes.create.suggestedPrice")}</Label>
              {/* Story 16.4: Contract Price Badge */}
              {isContractPrice && <ContractPriceBadge />}
            </div>
            {/* Story 19.5: Manual pricing mode for OFF_GRID */}
            {isManualPricingMode ? (
              <div className="space-y-3">
                {/* Manual Pricing Badge */}
                <div data-testid="manual-pricing-badge" className="flex items-center gap-2 p-3 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
                  <PencilIcon className="size-5 text-amber-600 dark:text-amber-400" />
                  <div>
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      {t("quotes.create.pricing.manualPricingMode")}
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                      {t("quotes.create.pricing.manualPricingHint")}
                    </p>
                  </div>
                </div>
              </div>
            ) : isCalculating ? (
              <Skeleton data-testid="pricing-skeleton" className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-2">
                  <div data-testid="suggested-price" className="flex-1 p-3 bg-muted rounded-md">
                  <div className="flex items-center gap-2">
                    <EuroIcon className="size-4 text-muted-foreground" />
                    <span className="text-lg font-bold">
                      {suggestedPrice > 0 ? formatPrice(suggestedPrice) : "—"}
                    </span>
                  </div>
                </div>
                {/* Story 16.4: Hide "Use Suggested" button for contract prices */}
                {suggestedPrice > 0 && formData.finalPrice !== suggestedPrice && !isPriceLocked && (
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
            {/* Story 16.4: Locked price display for contract prices */}
            {isPriceLocked ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div 
                      className={cn(
                        "relative cursor-not-allowed",
                        isAdmin && "cursor-pointer"
                      )}
                      onClick={handleLockedPriceClick}
                    >
                      <LockIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-blue-600" />
                      <Input
                        id="finalPrice"
                        type="number"
                        value={formData.finalPrice || ""}
                        disabled
                        className="pl-9 text-lg font-medium bg-muted/50 cursor-not-allowed"
                        readOnly
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    <p>
                      {isAdmin 
                        ? t("quotes.create.pricing.contractPriceTooltipAdmin")
                        : t("quotes.create.pricing.contractPriceTooltip")
                      }
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <div className="relative">
                <EuroIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                  id="finalPrice"
                  data-testid="final-price"
                  type="number"
                  min={0}
                  step={0.01}
                  value={formData.finalPrice || ""}
                  onChange={handleFinalPriceChange}
                  disabled={isSubmitting}
                  className={cn(
                    "pl-9 text-lg font-medium",
                    // Story 19.5: Highlight for manual pricing mode
                    isManualPricingMode && "border-amber-400 focus:border-amber-500 focus:ring-amber-500"
                  )}
                  placeholder={isManualPricingMode 
                    ? t("quotes.create.pricing.manualPricePlaceholder")
                    : "0.00"
                  }
                />
              </div>
            )}
          </div>

          {/* Story 16.4: Override Dialog */}
          <ConfirmOverrideDialog
            open={showOverrideDialog}
            onOpenChange={setShowOverrideDialog}
            partnerName={partnerName ?? "Partner"}
            currentPrice={suggestedPrice}
            onConfirm={handleOverrideConfirm}
          />

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

      {/* Story 19.10: Notes in separate prominent card */}
      <Card className={cn(
        isManualPricingMode && "border-amber-400 dark:border-amber-600"
      )}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {isManualPricingMode 
              ? t("quotes.create.sections.notesRequired")
              : t("quotes.create.sections.notes")
            }
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Textarea
              id="notes"
              data-testid="quote-notes"
              value={formData.notes}
              onChange={(e) => onFormChange("notes", e.target.value)}
              disabled={isSubmitting}
              rows={4}
              placeholder={isManualPricingMode
                ? t("quotes.create.notesPlaceholderOffGrid")
                : t("quotes.create.notesPlaceholder")
              }
              className={cn(
                isManualPricingMode && "border-amber-400 focus:border-amber-500 focus:ring-amber-500"
              )}
            />
            {isManualPricingMode && (
              <p className="text-xs text-amber-600 dark:text-amber-400">
                {t("quotes.create.notesRequiredHint")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Options - Story 19.10: Simplified to only validity date */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            {t("quotes.create.sections.options")}
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              vehicleCategoryId={formData.vehicleCategoryId}
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
                data-testid="create-quote-button"
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
          {/* Story 16.8 & 16.9: Only show dropoff validation for non-DISPO/OFF_GRID */}
          {isDropoffRequired && !formData.dropoffAddress && (
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
          {/* Story 19.5: Notes validation for OFF_GRID */}
          {isManualPricingMode && !formData.notes.trim() && (
            <p>• {t("quotes.create.validation.notesRequiredOffGrid")}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default QuotePricingPanel;
