"use client";

import { Badge } from "@ui/components/badge";
import { LockIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@ui/lib";

interface ContractPriceBadgeProps {
  className?: string;
}

/**
 * ContractPriceBadge Component
 * 
 * Displays a badge indicating that the price is a contractual/fixed price
 * from a partner grid. Used in QuotePricingPanel for FIXED_GRID pricing mode.
 * 
 * @see Story 16.4: Prix Bloqués pour Agences Partenaires
 */
export function ContractPriceBadge({ className }: ContractPriceBadgeProps) {
  const t = useTranslations();
  
  return (
    <Badge 
      variant="default" 
      className={cn(
        "bg-blue-600 hover:bg-blue-700 text-white gap-1",
        className
      )}
    >
      <LockIcon className="size-3" aria-hidden="true" />
      <span>{t("quotes.create.pricing.contractPrice")}</span>
    </Badge>
  );
}

export default ContractPriceBadge;
