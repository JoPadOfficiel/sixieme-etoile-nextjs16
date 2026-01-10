"use client";

import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";
import { formatPrice } from "../types";
import { ArrowUpRightIcon, ArrowDownRightIcon, Building2Icon, UserIcon } from "lucide-react";
import type { BidirectionalPricingInfo, PricingMode } from "@saas/shared/types"; // Assuming shared types path

interface BidirectionalPriceToggleProps {
  pricingInfo: BidirectionalPricingInfo;
  currentMode: PricingMode;
  onModeChange: (mode: PricingMode) => void;
  className?: string;
}

export function BidirectionalPriceToggle({
  pricingInfo,
  currentMode,
  onModeChange,
  className,
}: BidirectionalPriceToggleProps) {
  const t = useTranslations();

  const {
    partnerGridPrice,
    clientDirectPrice,
    priceDifferencePercent,
  } = pricingInfo;

  if (partnerGridPrice === null || clientDirectPrice === null) return null;

  const isPositiveDiff = (priceDifferencePercent || 0) > 0;

  return (
    <div className={cn("grid grid-cols-2 gap-2 p-1 bg-muted rounded-lg", className)}>
      {/* Partner Grid Option */}
      <button
        type="button"
        onClick={() => onModeChange("PARTNER_GRID")}
        className={cn(
          "relative flex flex-col items-start gap-1 p-2 rounded-md border text-left transition-all",
          currentMode === "PARTNER_GRID" || currentMode === "FIXED_GRID"
            ? "bg-background border-primary shadow-sm ring-1 ring-primary"
            : "bg-transparent border-transparent hover:bg-background/50 text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-1.5 w-full">
          <Building2Icon className="size-3.5" />
          <span className="text-xs font-medium truncate">
            {t("quotes.create.pricing.partnerGrid")}
          </span>
        </div>
        <div className="text-sm font-bold">
          {formatPrice(partnerGridPrice)}
        </div>
      </button>

      {/* Client Direct Option */}
      <button
        type="button"
        onClick={() => onModeChange("CLIENT_DIRECT")}
        className={cn(
          "relative flex flex-col items-start gap-1 p-2 rounded-md border text-left transition-all",
          currentMode === "CLIENT_DIRECT" || currentMode === "DYNAMIC"
            ? "bg-background border-primary shadow-sm ring-1 ring-primary"
            : "bg-transparent border-transparent hover:bg-background/50 text-muted-foreground"
        )}
      >
        <div className="flex items-center gap-1.5 w-full">
          <UserIcon className="size-3.5" />
          <span className="text-xs font-medium truncate">
            {t("quotes.create.pricing.clientDirect")}
          </span>
          {/* Difference Badge */}
          {priceDifferencePercent !== 0 && (
            <span className={cn(
              "ml-auto text-[10px] font-bold px-1 rounded flex items-center",
              isPositiveDiff 
                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            )}>
              {isPositiveDiff ? <ArrowUpRightIcon className="size-2.5 mr-0.5" /> : <ArrowDownRightIcon className="size-2.5 mr-0.5" />}
              {Math.abs(priceDifferencePercent || 0)}%
            </span>
          )}
        </div>
        <div className="flex items-center justify-between w-full">
          <span className="text-sm font-bold">
            {formatPrice(clientDirectPrice)}
          </span>
        </div>
      </button>
    </div>
  );
}
