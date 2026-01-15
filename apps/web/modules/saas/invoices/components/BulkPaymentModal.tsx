"use client";

/**
 * BulkPaymentModal Component (Story 25.6: Multi-Invoice Payment Tracking - Lettrage)
 *
 * Modal dialog for applying bulk payments across multiple invoices.
 * Shows payment allocation preview and allows confirmation.
 */

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { Badge } from "@ui/components/badge";
import { ScrollArea } from "@ui/components/scroll-area";
import {
  CheckCircle,
  CircleDot,
  Loader2,
  AlertTriangle,
  Euro,
  Receipt,
} from "lucide-react";
import { useBulkPayment } from "../hooks/useBulkPayment";
import type { UnpaidInvoice, PaymentMethod } from "../types/payment";
import { PAYMENT_METHOD_LABELS } from "../types/payment";

interface BulkPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: UnpaidInvoice[];
  contactName: string;
  onSuccess?: () => void;
}

/**
 * Preview of how payment will be allocated (FIFO simulation)
 */
interface AllocationPreview {
  invoiceId: string;
  invoiceNumber: string;
  remainingBefore: number;
  amountApplied: number;
  remainingAfter: number;
  willBePaid: boolean;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

export function BulkPaymentModal({
  open,
  onOpenChange,
  invoices,
  contactName,
  onSuccess,
}: BulkPaymentModalProps) {
  const t = useTranslations("invoices.bulkPayment");
  const { applyPayment, isLoading, error: paymentError, reset } = useBulkPayment();

  // Use key to reset form state when modal opens
  const [formKey, setFormKey] = useState(0);
  const [paymentAmount, setPaymentAmount] = useState<string>("");
  const [paymentReference, setPaymentReference] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | "">("");

  // Handle modal open change - reset form when closing
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset on next open
      setFormKey((k) => k + 1);
      setPaymentAmount("");
      setPaymentReference("");
      setPaymentMethod("");
      reset();
    }
    onOpenChange(newOpen);
  };

  // Calculate total outstanding
  const totalOutstanding = useMemo(() => {
    return invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  }, [invoices]);

  // Parse payment amount
  const parsedAmount = useMemo(() => {
    const num = parseFloat(paymentAmount.replace(",", "."));
    return isNaN(num) || num <= 0 ? 0 : num;
  }, [paymentAmount]);

  // Calculate allocation preview (FIFO simulation)
  const allocationPreview = useMemo((): AllocationPreview[] => {
    if (parsedAmount <= 0 || invoices.length === 0) return [];

    let remaining = parsedAmount;
    const allocations: AllocationPreview[] = [];

    // Sort by issue date (oldest first)
    const sortedInvoices = [...invoices].sort(
      (a, b) => new Date(a.issueDate).getTime() - new Date(b.issueDate).getTime()
    );

    for (const invoice of sortedInvoices) {
      if (remaining <= 0) {
        allocations.push({
          invoiceId: invoice.id,
          invoiceNumber: invoice.number,
          remainingBefore: invoice.remainingAmount,
          amountApplied: 0,
          remainingAfter: invoice.remainingAmount,
          willBePaid: false,
        });
        continue;
      }

      const toApply = Math.min(remaining, invoice.remainingAmount);
      const afterApply = invoice.remainingAmount - toApply;

      allocations.push({
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        remainingBefore: invoice.remainingAmount,
        amountApplied: Math.round(toApply * 100) / 100,
        remainingAfter: Math.round(Math.max(0, afterApply) * 100) / 100,
        willBePaid: afterApply < 0.01,
      });

      remaining -= toApply;
    }

    return allocations;
  }, [invoices, parsedAmount]);

  // Calculate overage
  const overage = useMemo(() => {
    return Math.max(0, parsedAmount - totalOutstanding);
  }, [parsedAmount, totalOutstanding]);

  // Count fully paid invoices in preview
  const willBePaidCount = allocationPreview.filter((a) => a.willBePaid).length;

  const handleSubmit = async () => {
    if (parsedAmount <= 0 || invoices.length === 0) return;

    try {
      await applyPayment({
        invoiceIds: invoices.map((inv) => inv.id),
        paymentAmount: parsedAmount,
        paymentReference: paymentReference || undefined,
        paymentMethod: paymentMethod || undefined,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch {
      // Error is handled by the hook
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg" key={formKey}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Euro className="h-5 w-5 text-green-600" />
            {t("title")}
          </DialogTitle>
          <DialogDescription>
            {t("description", { contactName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Total Outstanding */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Receipt className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{t("totalOutstanding")}</span>
            </div>
            <span className="text-lg font-bold text-destructive">
              {formatCurrency(totalOutstanding)}
            </span>
          </div>

          {/* Payment Amount Input */}
          <div className="space-y-2">
            <Label htmlFor="payment-amount">{t("paymentAmount")}</Label>
            <div className="relative">
              <Input
                id="payment-amount"
                type="text"
                inputMode="decimal"
                placeholder="0,00"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="pr-12"
                data-testid="payment-amount-input"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                €
              </span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>{t("paymentMethod")}</Label>
            <Select
              value={paymentMethod}
              onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
            >
              <SelectTrigger>
                <SelectValue placeholder={t("selectMethod")} />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map((method) => (
                  <SelectItem key={method} value={method}>
                    {PAYMENT_METHOD_LABELS[method]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payment Reference */}
          <div className="space-y-2">
            <Label htmlFor="payment-reference">{t("paymentReference")}</Label>
            <Input
              id="payment-reference"
              placeholder={t("referencePlaceholder")}
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
            />
          </div>

          <hr className="my-4 border-t text-muted" />

          {/* Allocation Preview */}
          {parsedAmount > 0 && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {t("allocationPreview")}
                {willBePaidCount > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {willBePaidCount} {t("willBePaid")}
                  </Badge>
                )}
              </Label>
              <ScrollArea className="h-[150px] rounded border p-2" data-testid="allocation-preview">
                <div className="space-y-2">
                  {allocationPreview.map((alloc) => (
                    <div
                      key={alloc.invoiceId}
                      className={`flex items-center justify-between p-2 rounded text-sm ${
                        alloc.willBePaid
                          ? "bg-green-50 dark:bg-green-950"
                          : alloc.amountApplied > 0
                            ? "bg-orange-50 dark:bg-orange-950"
                            : "bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {alloc.willBePaid ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : alloc.amountApplied > 0 ? (
                          <CircleDot className="h-4 w-4 text-orange-600" />
                        ) : (
                          <CircleDot className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="font-medium">{alloc.invoiceNumber}</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {alloc.amountApplied > 0 && (
                            <span className="text-green-600">
                              -{formatCurrency(alloc.amountApplied)}
                            </span>
                          )}
                        </div>
                        {!alloc.willBePaid && alloc.remainingAfter > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {t("remaining")}: {formatCurrency(alloc.remainingAfter)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>

              {/* Overage Warning */}
              {overage > 0 && (
                <div className="flex items-center gap-2 p-2 rounded bg-yellow-50 dark:bg-yellow-950 text-yellow-800 dark:text-yellow-200 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>
                    {t("overage")}: {formatCurrency(overage)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {paymentError && (
            <div className="flex items-center gap-2 p-2 rounded bg-destructive/10 text-destructive text-sm">
              <AlertTriangle className="h-4 w-4" />
              <span>{paymentError}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isLoading || parsedAmount <= 0}
            data-testid="confirm-payment-btn"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("applyPayment")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
