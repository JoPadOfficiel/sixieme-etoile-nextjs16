"use client";

import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  DownloadIcon,
  Loader2Icon,
  SendIcon,
  XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";
import type { Invoice, InvoiceStatus } from "../types";
import { getValidInvoiceTransitions } from "../types";

interface InvoiceHeaderProps {
  invoice: Invoice;
  onStatusChange: (newStatus: InvoiceStatus) => void;
  onDownload?: () => void;
  isLoading: boolean;
}

/**
 * InvoiceHeader Component
 * 
 * Displays invoice header with status badge, contact info, and action buttons.
 * Actions are shown based on current invoice status.
 * 
 * @see Story 7.1: Invoice & InvoiceLine Models and Invoices UI
 */
export function InvoiceHeader({
  invoice,
  onStatusChange,
  onDownload,
  isLoading,
}: InvoiceHeaderProps) {
  const t = useTranslations();
  const { activeOrganization } = useActiveOrganization();

  const validTransitions = getValidInvoiceTransitions(invoice.status);
  const canIssue = validTransitions.includes("ISSUED");
  const canMarkPaid = validTransitions.includes("PAID");
  const canCancel = validTransitions.includes("CANCELLED");

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Left: Back link, Invoice Number, Status */}
      <div className="space-y-2">
        <Link
          href={`/app/${activeOrganization?.slug}/invoices`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeftIcon className="size-4" />
          {t("invoices.detail.backToInvoices")}
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">
            {t("invoices.detail.title")} {invoice.number}
          </h1>
          <InvoiceStatusBadge status={invoice.status} />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{invoice.contact.displayName}</span>
          <Badge variant={invoice.contact.isPartner ? "default" : "secondary"} className="text-xs">
            {invoice.contact.isPartner ? t("invoices.partner") : t("invoices.private")}
          </Badge>
        </div>
      </div>

      {/* Right: Action buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {canIssue && (
          <Button onClick={() => onStatusChange("ISSUED")} disabled={isLoading}>
            {isLoading ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <SendIcon className="size-4 mr-2" />
            )}
            {t("invoices.actions.issue")}
          </Button>
        )}

        {canMarkPaid && (
          <Button onClick={() => onStatusChange("PAID")} disabled={isLoading} variant="default">
            {isLoading ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <CheckCircleIcon className="size-4 mr-2" />
            )}
            {t("invoices.actions.markPaid")}
          </Button>
        )}

        {canCancel && (
          <Button onClick={() => onStatusChange("CANCELLED")} disabled={isLoading} variant="outline">
            {isLoading ? (
              <Loader2Icon className="size-4 mr-2 animate-spin" />
            ) : (
              <XCircleIcon className="size-4 mr-2" />
            )}
            {t("invoices.actions.cancel")}
          </Button>
        )}

        {onDownload && (
          <Button onClick={onDownload} disabled={isLoading} variant="outline">
            <DownloadIcon className="size-4 mr-2" />
            {t("invoices.actions.download")}
          </Button>
        )}
      </div>
    </div>
  );
}

export default InvoiceHeader;
