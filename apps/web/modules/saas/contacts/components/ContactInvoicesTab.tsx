"use client";

/**
 * ContactInvoicesTab Component (Story 25.6: Multi-Invoice Payment Tracking - Lettrage)
 *
 * Displays all unpaid invoices for a contact with multi-select capability
 * and bulk payment (lettrage) functionality.
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { Skeleton } from "@ui/components/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import {
  CreditCard,
  Receipt,
  AlertTriangle,
  CheckCircle,
  Clock,
  Euro,
} from "lucide-react";
import { BulkPaymentModal } from "@saas/invoices/components/BulkPaymentModal";
import type { ContactBalance, UnpaidInvoice } from "@saas/invoices/types/payment";

interface ContactInvoicesTabProps {
  contactId: string;
  contactName: string;
  balanceData: ContactBalance | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getStatusBadge(status: string, isOverdue: boolean) {
  if (status === "PARTIAL") {
    return (
      <Badge variant="secondary" className="gap-1 bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
        <Clock className="h-3 w-3" />
        Partiel
      </Badge>
    );
  }
  if (isOverdue) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertTriangle className="h-3 w-3" />
        En retard
      </Badge>
    );
  }
  return (
    <Badge variant="default" className="gap-1">
      <Receipt className="h-3 w-3" />
      Émise
    </Badge>
  );
}

/**
 * Loading skeleton
 */
function InvoicesTabSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

export function ContactInvoicesTab({
  contactId,
  contactName,
  balanceData,
  isLoading,
  error,
  refetch,
}: ContactInvoicesTabProps) {
  const t = useTranslations("invoices");

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Get selected invoices for payment modal
  const selectedInvoices = useMemo((): UnpaidInvoice[] => {
    if (!balanceData) return [];
    return balanceData.unpaidInvoices.filter((inv) => selectedIds.has(inv.id));
  }, [balanceData, selectedIds]);

  // Calculate total selected
  const totalSelected = useMemo(() => {
    return selectedInvoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  }, [selectedInvoices]);

  // Check if all are selected
  const allSelected = useMemo(() => {
    if (!balanceData || balanceData.unpaidInvoices.length === 0) return false;
    return balanceData.unpaidInvoices.every((inv) => selectedIds.has(inv.id));
  }, [balanceData, selectedIds]);

  // Handle select all toggle
  const handleSelectAll = () => {
    if (!balanceData) return;
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(balanceData.unpaidInvoices.map((inv) => inv.id)));
    }
  };

  // Handle individual toggle
  const handleToggle = (invoiceId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  };

  // Handle payment success
  const handlePaymentSuccess = () => {
    setSelectedIds(new Set());
    refetch();
  };

  if (isLoading) {
    return <InvoicesTabSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-destructive">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
            <p>{error}</p>
            <Button variant="outline" className="mt-4" onClick={refetch}>
              {t("retry")}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!balanceData || balanceData.unpaidInvoices.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <p>{t("noOutstandingInvoices")}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Balance Summary Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Euro className="h-5 w-5 text-muted-foreground" />
            {t("outstandingBalance")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t("bulkPayment.totalOutstanding")}</p>
              <p className="text-2xl font-bold text-destructive">
                {formatCurrency(balanceData.totalOutstanding)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("invoiceCount")}</p>
              <p className="text-2xl font-bold">{balanceData.invoiceCount}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t("breakdown")}</p>
              <div className="flex gap-2 mt-1">
                {balanceData.breakdown.issued > 0 && (
                  <Badge variant="outline">{formatCurrency(balanceData.breakdown.issued)} émis</Badge>
                )}
                {balanceData.breakdown.partial > 0 && (
                  <Badge variant="secondary">{formatCurrency(balanceData.breakdown.partial)} partiel</Badge>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium">
              {selectedIds.size} facture(s) sélectionnée(s)
            </span>
            <Badge variant="default" data-testid="selected-invoices-total">
              {formatCurrency(totalSelected)}
            </Badge>
          </div>
          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            className="gap-2"
            data-testid="apply-bulk-payment-btn"
          >
            <CreditCard className="h-4 w-4" />
            {t("bulkPayment.applyPayment")}
          </Button>
        </div>
      )}

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={handleSelectAll}
                    aria-label="Tout sélectionner"
                    data-testid="invoice-select-all"
                  />
                </TableHead>
                <TableHead>{t("columns.number")}</TableHead>
                <TableHead>{t("columns.issueDate")}</TableHead>
                <TableHead>{t("columns.dueDate")}</TableHead>
                <TableHead>{t("columns.status")}</TableHead>
                <TableHead className="text-right">{t("columns.total")}</TableHead>
                <TableHead className="text-right">{t("columns.paid")}</TableHead>
                <TableHead className="text-right">{t("columns.remaining")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {balanceData.unpaidInvoices.map((invoice) => (
                <TableRow
                  key={invoice.id}
                  className={selectedIds.has(invoice.id) ? "bg-primary/5" : ""}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(invoice.id)}
                      onCheckedChange={() => handleToggle(invoice.id)}
                      aria-label={`Sélectionner ${invoice.number}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{invoice.number}</TableCell>
                  <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell>
                    <span className={invoice.isOverdue ? "text-destructive font-medium" : ""}>
                      {formatDate(invoice.dueDate)}
                    </span>
                  </TableCell>
                  <TableCell>{getStatusBadge(invoice.status, invoice.isOverdue)}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(invoice.totalInclVat)}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    {invoice.paidAmount > 0 ? formatCurrency(invoice.paidAmount) : "-"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {formatCurrency(invoice.remainingAmount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Bulk Payment Modal */}
      <BulkPaymentModal
        open={isPaymentModalOpen}
        onOpenChange={setIsPaymentModalOpen}
        invoices={selectedInvoices}
        contactName={contactName}
        onSuccess={handlePaymentSuccess}
      />
    </div>
  );
}
