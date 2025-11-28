"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Checkbox } from "@ui/components/checkbox";
import { Label } from "@ui/components/label";
import { Skeleton } from "@ui/components/skeleton";
import { Badge } from "@ui/components/badge";
import { AlertCircleIcon, TagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { useOptionalFees } from "../hooks/useOptionalFees";

interface OptionalFeesSelectorProps {
  selectedFeeIds: string[];
  onFeeToggle: (feeId: string, checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Format price for display
 */
function formatPrice(amount: number, type: "FIXED" | "PERCENTAGE"): string {
  if (type === "PERCENTAGE") {
    return `${amount}%`;
  }
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * OptionalFeesSelector Component
 * 
 * Displays a list of available optional fees with checkboxes.
 * Used in quote/invoice creation and editing.
 * 
 * @see Story 9.3: Optional Fees Catalogue
 * @see FR56: Optional fees selection
 */
export function OptionalFeesSelector({
  selectedFeeIds,
  onFeeToggle,
  disabled = false,
  className,
}: OptionalFeesSelectorProps) {
  const t = useTranslations();
  const { fees, isLoading, error } = useOptionalFees();

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TagIcon className="size-4" />
            {t("quotes.create.optionalFees.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn("border-destructive/50", className)}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TagIcon className="size-4" />
            {t("quotes.create.optionalFees.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive text-sm">
            <AlertCircleIcon className="size-4" />
            {t("quotes.create.optionalFees.loadError")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (fees.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TagIcon className="size-4" />
            {t("quotes.create.optionalFees.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {t("quotes.create.optionalFees.noFees")}
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate total of selected fees
  const selectedTotal = fees
    .filter((fee) => selectedFeeIds.includes(fee.id) && fee.amountType === "FIXED")
    .reduce((sum, fee) => sum + fee.amount, 0);

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TagIcon className="size-4" />
            {t("quotes.create.optionalFees.title")}
          </CardTitle>
          {selectedFeeIds.length > 0 && (
            <Badge variant="secondary">
              {selectedFeeIds.length} {t("quotes.create.optionalFees.selected")}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {fees.map((fee) => {
          const isSelected = selectedFeeIds.includes(fee.id);
          return (
            <div
              key={fee.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                isSelected
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-muted/50",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <Checkbox
                id={`fee-${fee.id}`}
                checked={isSelected}
                onCheckedChange={(checked) => {
                  if (!disabled) {
                    onFeeToggle(fee.id, checked === true);
                  }
                }}
                disabled={disabled}
                className="mt-0.5"
              />
              <div className="flex-1 min-w-0">
                <Label
                  htmlFor={`fee-${fee.id}`}
                  className={cn(
                    "font-medium cursor-pointer",
                    disabled && "cursor-not-allowed"
                  )}
                >
                  {fee.name}
                </Label>
                {fee.description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {fee.description}
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="font-medium text-sm">
                  {formatPrice(fee.amount, fee.amountType)}
                </span>
                {fee.isTaxable && fee.vatRate && (
                  <p className="text-xs text-muted-foreground">
                    TVA {fee.vatRate}%
                  </p>
                )}
              </div>
            </div>
          );
        })}

        {/* Total if any fixed fees selected */}
        {selectedTotal > 0 && (
          <div className="flex items-center justify-between pt-2 border-t text-sm">
            <span className="text-muted-foreground">
              {t("quotes.create.optionalFees.total")}
            </span>
            <span className="font-medium">
              {formatPrice(selectedTotal, "FIXED")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default OptionalFeesSelector;
