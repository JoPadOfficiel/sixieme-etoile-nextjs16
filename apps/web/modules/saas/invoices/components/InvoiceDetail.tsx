"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import {
  BuildingIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useInvoiceDetail, useUpdateInvoice } from "../hooks/useInvoiceDetail";
import { InvoiceHeader } from "./InvoiceHeader";
import { InvoiceLinesList } from "./InvoiceLinesList";
import type { InvoiceStatus } from "../types";
import { formatDate, formatPrice, isOverdue, getDaysUntilDue } from "../types";
import { useToast } from "@ui/hooks/use-toast";

interface InvoiceDetailProps {
  invoiceId: string;
}

/**
 * InvoiceDetail Component
 * 
 * Displays full invoice details with two-column layout:
 * - Left: Billing entity and metadata
 * - Right: Line items and VAT breakdown
 * 
 * @see Story 7.1: Invoice & InvoiceLine Models and Invoices UI
 * @see FR33-FR36: Invoice lifecycle and immutability
 */
export function InvoiceDetail({ invoiceId }: InvoiceDetailProps) {
  const t = useTranslations();
  const { activeOrganization } = useActiveOrganization();
  const { toast } = useToast();

  const { data: invoice, isLoading, error } = useInvoiceDetail({ invoiceId });
  const updateMutation = useUpdateInvoice();

  const handleStatusChange = async (newStatus: InvoiceStatus) => {
    if (!invoice) return;

    try {
      await updateMutation.mutateAsync({
        invoiceId: invoice.id,
        data: { status: newStatus },
      });
      toast({
        title: t("invoices.statusUpdated"),
        description: t(`invoices.status.${newStatus.toLowerCase()}`),
      });
    } catch (error) {
      toast({
        title: t("invoices.updateError"),
        description: error instanceof Error ? error.message : t("invoices.unknownError"),
        variant: "error",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2Icon className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">{t("invoices.notFound")}</p>
        <Link
          href={`/app/${activeOrganization?.slug}/invoices`}
          className="text-sm text-muted-foreground hover:text-foreground mt-2 inline-block"
        >
          {t("invoices.detail.backToInvoices")}
        </Link>
      </div>
    );
  }

  const overdue = isOverdue(invoice);
  const daysUntilDue = getDaysUntilDue(invoice);

  return (
    <div className="space-y-6">
      {/* Header */}
      <InvoiceHeader
        invoice={invoice}
        onStatusChange={handleStatusChange}
        isLoading={updateMutation.isPending}
      />

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column: Billing Info & Metadata */}
        <div className="space-y-6">
          {/* Billing Entity */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {invoice.contact.isPartner ? (
                  <BuildingIcon className="size-5" />
                ) : (
                  <UserIcon className="size-5" />
                )}
                {t("invoices.detail.billingInfo")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-semibold">{invoice.contact.displayName}</h4>
                {invoice.contact.companyName && (
                  <p className="text-sm text-muted-foreground">{invoice.contact.companyName}</p>
                )}
              </div>

              {invoice.contact.billingAddress && (
                <div className="flex items-start gap-2 text-sm">
                  <MapPinIcon className="size-4 mt-0.5 text-muted-foreground" />
                  <span className="whitespace-pre-line">{invoice.contact.billingAddress}</span>
                </div>
              )}

              {invoice.contact.email && (
                <div className="flex items-center gap-2 text-sm">
                  <MailIcon className="size-4 text-muted-foreground" />
                  <a href={`mailto:${invoice.contact.email}`} className="hover:underline">
                    {invoice.contact.email}
                  </a>
                </div>
              )}

              {invoice.contact.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <PhoneIcon className="size-4 text-muted-foreground" />
                  <a href={`tel:${invoice.contact.phone}`} className="hover:underline">
                    {invoice.contact.phone}
                  </a>
                </div>
              )}

              {invoice.contact.vatNumber && (
                <div className="text-sm">
                  <span className="text-muted-foreground">{t("invoices.detail.vatNumber")}: </span>
                  <span className="font-mono">{invoice.contact.vatNumber}</span>
                </div>
              )}

              <Badge variant={invoice.contact.isPartner ? "default" : "secondary"}>
                {invoice.contact.isPartner ? t("invoices.partner") : t("invoices.private")}
              </Badge>
            </CardContent>
          </Card>

          {/* Invoice Metadata */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{t("invoices.detail.metadata")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("invoices.detail.invoiceNumber")}</span>
                <span className="font-mono font-medium">{invoice.number}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("invoices.columns.issueDate")}</span>
                <span>{formatDate(invoice.issueDate)}</span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{t("invoices.columns.dueDate")}</span>
                <div className="flex items-center gap-2">
                  <span className={overdue ? "text-destructive font-medium" : ""}>
                    {formatDate(invoice.dueDate)}
                  </span>
                  {overdue && invoice.status !== "PAID" && invoice.status !== "CANCELLED" && (
                    <Badge variant="destructive" className="text-xs">
                      {t("invoices.overdue")}
                    </Badge>
                  )}
                  {!overdue && invoice.status === "ISSUED" && daysUntilDue <= 7 && (
                    <Badge variant="outline" className="text-xs text-orange-600">
                      {daysUntilDue === 0
                        ? t("invoices.dueToday")
                        : t("invoices.dueIn", { days: daysUntilDue })}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Story 7.4: Enhanced Commission Section for Partners */}
              {invoice.contact.isPartner && invoice.commissionAmount && parseFloat(invoice.commissionAmount) > 0 && (
                <div className="space-y-2 pt-2 border-t">
                  <h4 className="text-sm font-medium">{t("invoices.detail.commissionSection")}</h4>
                  {invoice.contact.partnerContract?.commissionPercent && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("invoices.detail.commissionRate")}</span>
                      <span>{invoice.contact.partnerContract.commissionPercent}%</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("invoices.detail.commissionAmount")}</span>
                    <span className="font-medium text-orange-600">-{formatPrice(invoice.commissionAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{t("invoices.detail.netAmount")}</span>
                    <span className="font-medium">
                      {formatPrice(parseFloat(invoice.totalExclVat) - parseFloat(invoice.commissionAmount))}
                    </span>
                  </div>
                </div>
              )}

              {invoice.quoteId && (
                <div className="flex justify-between text-sm items-center">
                  <span className="text-muted-foreground">{t("invoices.detail.sourceQuote")}</span>
                  <Link
                    href={`/app/${activeOrganization?.slug}/quotes/${invoice.quoteId}`}
                    className="inline-flex items-center gap-1 text-primary hover:underline"
                  >
                    <ExternalLinkIcon className="size-3" />
                    {t("invoices.detail.viewQuote")}
                  </Link>
                </div>
              )}

              {invoice.notes && (
                <div className="pt-2 border-t">
                  <p className="text-sm text-muted-foreground mb-1">{t("invoices.detail.notes")}</p>
                  <p className="text-sm whitespace-pre-line">{invoice.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Lines & Totals */}
        <InvoiceLinesList
          lines={invoice.lines}
          totalExclVat={invoice.totalExclVat}
          totalVat={invoice.totalVat}
          totalInclVat={invoice.totalInclVat}
        />
      </div>
    </div>
  );
}

export default InvoiceDetail;
