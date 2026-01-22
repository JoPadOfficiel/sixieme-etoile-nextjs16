"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { cn } from "@ui/lib";
import { 
  UserIcon, 
  BuildingIcon,
  MailIcon,
  PhoneIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import type { Quote } from "../types";
import { getQuoteClientDisplay } from "../types";

/**
 * Story 29.2: QuoteClientCard Component
 * 
 * Displays client information in a compact card format for multi-mission quotes.
 * Extracted from QuoteCommercialSummary for sidebar use.
 */

interface QuoteClientCardProps {
  quote: Quote;
  className?: string;
}

export function QuoteClientCard({ quote, className }: QuoteClientCardProps) {
  const t = useTranslations("quotes.detail");

  const clientDisplay = getQuoteClientDisplay(quote);

  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t("commercial.client")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main client name */}
        <div className="flex items-start gap-2">
          <UserIcon className="size-4 text-primary mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate">{clientDisplay.clientName}</div>
            {/* Show difficulty score if endCustomer exists and has score */}
            {clientDisplay.hasEndCustomer && quote.endCustomer?.difficultyScore && (
              <div className="flex items-center gap-1 mt-1">
                <Badge variant="outline" className="text-xs">
                  {t("commercial.difficultyScore")}: {quote.endCustomer.difficultyScore}/5
                </Badge>
              </div>
            )}
          </div>
        </div>

        {/* Agency name (only if endCustomer exists) */}
        {clientDisplay.hasEndCustomer && clientDisplay.agencyName && (
          <div className="flex items-start gap-2 pl-6">
            <BuildingIcon className="size-3 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-sm text-muted-foreground truncate">
              {clientDisplay.agencyName}
            </span>
          </div>
        )}

        {/* Contact email */}
        {quote.contact.email && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MailIcon className="size-3 shrink-0" />
            <span className="truncate">{quote.contact.email}</span>
          </div>
        )}

        {/* Contact phone */}
        {quote.contact.phone && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <PhoneIcon className="size-3 shrink-0" />
            <span>{quote.contact.phone}</span>
          </div>
        )}

        {/* Partner badge */}
        {quote.contact.isPartner && (
          <Badge variant="secondary" className="text-xs">
            {t("commercial.partnerContact")}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

export default QuoteClientCard;
