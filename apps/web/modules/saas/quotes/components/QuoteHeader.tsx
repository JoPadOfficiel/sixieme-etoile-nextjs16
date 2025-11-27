"use client";

import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  FileTextIcon,
  Loader2Icon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import type { Quote } from "../types";

interface QuoteHeaderProps {
  quote: Quote;
  onSend: () => void;
  onAccept: () => void;
  onReject: () => void;
  onConvertToInvoice: () => void;
  isLoading: boolean;
}

/**
 * QuoteHeader Component
 * 
 * Displays quote header with status badge, contact info, and action buttons.
 * Actions are shown based on current quote status.
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
 */
export function QuoteHeader({
  quote,
  onSend,
  onAccept,
  onReject,
  onConvertToInvoice,
  isLoading,
}: QuoteHeaderProps) {
  const t = useTranslations();
  const { activeOrganization } = useActiveOrganization();

  const canSend = quote.status === "DRAFT";
  const canAcceptReject = quote.status === "SENT" || quote.status === "VIEWED";
  const canConvert = quote.status === "ACCEPTED";

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Back link, Quote ID, Status */}
      <div className="space-y-2">
        <Link
          href={`/app/${activeOrganization?.slug}/quotes`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          {t("quotes.detail.backToQuotes")}
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {t("quotes.detail.title")} #{quote.id.substring(0, 8)}
          </h1>
          <QuoteStatusBadge status={quote.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{quote.contact.displayName}</span>
          <Badge variant={quote.contact.isPartner ? "default" : "secondary"} className="text-xs">
            {quote.contact.isPartner ? t("quotes.partner") : t("quotes.private")}
          </Badge>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {canSend && (
          <Button onClick={onSend} disabled={isLoading}>
            {isLoading ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <SendIcon className="size-4 mr-2" />
            )}
            {t("quotes.detail.actions.send")}
          </Button>
        )}

        {canAcceptReject && (
          <>
            <Button onClick={onAccept} disabled={isLoading} variant="default">
              {isLoading ? (
                <Loader2Icon className="size-4 mr-2 animate-spin" />
              ) : (
                <CheckCircleIcon className="size-4 mr-2" />
              )}
              {t("quotes.detail.actions.accept")}
            </Button>
            <Button onClick={onReject} disabled={isLoading} variant="outline">
              {isLoading ? (
                <Loader2Icon className="size-4 mr-2 animate-spin" />
              ) : (
                <XCircleIcon className="size-4 mr-2" />
              )}
              {t("quotes.detail.actions.reject")}
            </Button>
          </>
        )}

        {canConvert && (
          <Button onClick={onConvertToInvoice} disabled={isLoading}>
            {isLoading ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <FileTextIcon className="size-4 mr-2" />
            )}
            {t("quotes.detail.actions.convertToInvoice")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default QuoteHeader;
