"use client";

import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileTextIcon,
  Loader2Icon,
  PencilIcon,
  PrinterIcon,
  SendIcon,
  XCircleIcon,
  AlertTriangleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useMissionOrder } from "@saas/dispatch/hooks/useMissionOrder";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import type { Quote } from "../types";

interface QuoteHeaderProps {
  quote: Quote;
  onSend: () => void;
  onAccept: () => void;
  onReject: () => void;
  onConvertToInvoice: () => void;
  onDownloadPdf?: () => void;
  isLoading: boolean;
}

/**
 * QuoteHeader Component
 * 
 * Displays quote header with status badge, contact info, and action buttons.
 * Actions are shown based on current quote status.
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
 * @see Story 25.1: Mission Sheet generation from accepted quote
 */
export function QuoteHeader({
  quote,
  onSend,
  onAccept,
  onReject,
  onConvertToInvoice,
  onDownloadPdf,
  isLoading,
}: QuoteHeaderProps) {
  const t = useTranslations();
  const { activeOrganization } = useActiveOrganization();
  
  // Story 25.1: Mission order generation
  const { generateMissionOrder, isGenerating } = useMissionOrder();

  const canEdit = quote.status === "DRAFT";
  const canSend = quote.status === "DRAFT";
  const canAcceptReject = quote.status === "SENT" || quote.status === "VIEWED";
  // Can only convert if ACCEPTED and no invoice exists yet
  const canConvert = quote.status === "ACCEPTED" && !quote.invoice;
  const hasInvoice = !!quote.invoice;
  
  // Story 25.1: Mission Sheet logic
  // Check if there's an assigned driver in tripAnalysis
  const tripAnalysis = quote.tripAnalysis as {
    assignment?: {
      driverId: string | null;
      driverName: string | null;
    } | null;
  } | null;
  const hasDriver = !!tripAnalysis?.assignment?.driverId;
  const isAccepted = quote.status === "ACCEPTED";

  const handleGenerateMissionSheet = () => {
    generateMissionOrder(quote.id);
  };

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
        {/* Edit button for DRAFT quotes */}
        {canEdit && (
          <Link href={`/app/${activeOrganization?.slug}/quotes/${quote.id}/edit`}>
            <Button variant="outline" disabled={isLoading}>
              <PencilIcon className="size-4 mr-2" />
              {t("quotes.detail.actions.edit")}
            </Button>
          </Link>
        )}

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

        {/* Show link to existing invoice if one exists */}
        {hasInvoice && quote.invoice && (
          <Link href={`/app/${activeOrganization?.slug}/invoices/${quote.invoice.id}`}>
            <Button variant="outline">
              <FileTextIcon className="size-4 mr-2" />
              {t("quotes.detail.actions.viewInvoice")} {quote.invoice.number}
            </Button>
          </Link>
        )}

        {/* Story 7.5: PDF Download button */}
        {onDownloadPdf && (
          <Button onClick={onDownloadPdf} disabled={isLoading} variant="outline">
            {isLoading ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <DownloadIcon className="size-4 mr-2" />
            )}
            {t("documents.actions.generateQuotePdf")}
          </Button>
        )}

        {/* Story 25.1: Mission Sheet button - Only for ACCEPTED quotes with driver */}
        {isAccepted && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    onClick={handleGenerateMissionSheet}
                    disabled={isGenerating || !hasDriver}
                    variant="secondary"
                  >
                    {isGenerating ? (
                      <Loader2Icon className="size-4 mr-2 animate-spin" />
                    ) : !hasDriver ? (
                      <AlertTriangleIcon className="size-4 mr-2 text-amber-500" />
                    ) : (
                      <PrinterIcon className="size-4 mr-2" />
                    )}
                    {t("quotes.detail.actions.generateMissionSheet")}
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasDriver && (
                <TooltipContent>
                  <p>{t("quotes.detail.actions.assignDriverFirst")}</p>
                </TooltipContent>
              )}
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </div>
  );
}

export default QuoteHeader;

