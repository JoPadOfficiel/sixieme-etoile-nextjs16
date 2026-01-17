"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { useToast } from "@ui/hooks/use-toast";
import { Loader2Icon, TrashIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { InvoiceLine } from "../types";
import { formatPrice, formatVatRate, getLineTypeLabel, calculateLineTotals } from "../types";
import { useDeleteInvoiceLine, useUpdateInvoiceLine } from "../hooks/useInvoiceLines";

export interface InvoiceLinesListProps {
  lines: InvoiceLine[];
  totalExclVat?: string;
  totalVat?: string;
  totalInclVat?: string;
  // Edit mode props
  invoiceId?: string;
  editable?: boolean;
}

/**
 * InvoiceLinesList Component
 * 
 * Displays invoice line items with VAT breakdown and totals.
 * 
 * @see FR35 VAT breakdown for transport & ancillary services
 * @see UX Spec 8.4.1 Invoice detail view
 */
export function InvoiceLinesList({
  lines,
  totalExclVat,
  totalVat,
  totalInclVat,
  invoiceId,
  editable = false,
}: InvoiceLinesListProps) {
  const t = useTranslations("invoices");
  const { toast } = useToast();
  const deleteLineMutation = useDeleteInvoiceLine(invoiceId ?? "");
  const updateLineMutation = useUpdateInvoiceLine(invoiceId ?? "");

  const handleDeleteLine = async (lineId: string) => {
    if (!invoiceId) return;
    try {
      await deleteLineMutation.mutateAsync(lineId);
      toast({ title: t("edit.lineDeleted") });
    } catch {
      toast({ title: t("edit.error"), variant: "error" });
    }
  };

  const handleUpdateQuantity = async (lineId: string, quantity: number) => {
    if (!invoiceId || quantity <= 0) return;
    try {
      await updateLineMutation.mutateAsync({ lineId, quantity });
      toast({ title: t("edit.lineUpdated") });
    } catch {
      toast({ title: t("edit.error"), variant: "error" });
    }
  };

  // Calculate VAT breakdown by rate and category breakdown
  const { vatBreakdown, categoryBreakdown } = calculateLineTotals(lines);

  // Check if we have multiple categories (for showing breakdown)
  const hasMultipleCategories = 
    (categoryBreakdown.transport !== 0 ? 1 : 0) +
    (categoryBreakdown.ancillary !== 0 ? 1 : 0) +
    (categoryBreakdown.adjustments !== 0 ? 1 : 0) > 1;

  return (
    <div className="space-y-6">
      {/* Lines Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("detail.lines")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">{t("detail.description")}</TableHead>
                <TableHead className="text-right">{t("detail.quantity")}</TableHead>
                <TableHead className="text-right">{t("detail.unitPrice")}</TableHead>
                <TableHead className="text-right">{t("detail.vatRate")}</TableHead>
                <TableHead className="text-right">{t("detail.total")}</TableHead>
                {editable && <TableHead className="w-[60px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={editable ? 6 : 5} className="text-center py-8 text-muted-foreground">
                    {t("detail.noLines")}
                  </TableCell>
                </TableRow>
              ) : (
                lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <span className="font-medium">{line.description}</span>
                        <Badge variant="outline" className="w-fit text-xs">
                          {getLineTypeLabel(line.lineType)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {editable ? (
                        <Input
                          type="number"
                          className="w-20 ml-auto h-8 text-right"
                          defaultValue={line.quantity}
                          min="1"
                          step="1"
                          onBlur={(e) => {
                            const val = parseFloat(e.target.value);
                            if (val !== parseFloat(line.quantity)) {
                              handleUpdateQuantity(line.id, val);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              const val = parseFloat((e.target as HTMLInputElement).value);
                              if (val !== parseFloat(line.quantity)) {
                                handleUpdateQuantity(line.id, val);
                              }
                            }
                          }}
                          disabled={updateLineMutation.isPending}
                        />
                      ) : (
                        parseFloat(line.quantity).toFixed(2)
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPrice(line.unitPriceExclVat)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatVatRate(line.vatRate)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatPrice(line.totalExclVat)}
                    </TableCell>
                    {editable && (
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteLine(line.id)}
                          disabled={deleteLineMutation.isPending}
                        >
                          {deleteLineMutation.isPending ? (
                            <Loader2Icon className="size-4 animate-spin" />
                          ) : (
                            <TrashIcon className="size-4" />
                          )}
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals Card - Only show if totals are provided */}
      {(totalExclVat || totalVat || totalInclVat) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">{t("detail.totals")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Category Breakdown - Story 7.3 */}
            {hasMultipleCategories && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("detail.categoryBreakdown")}
                </h4>
                <div className="space-y-1">
                  {categoryBreakdown.transport !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("detail.category.transport")}</span>
                      <span>{formatPrice(categoryBreakdown.transport)}</span>
                    </div>
                  )}
                  {categoryBreakdown.ancillary !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("detail.category.ancillary")}</span>
                      <span>{formatPrice(categoryBreakdown.ancillary)}</span>
                    </div>
                  )}
                  {categoryBreakdown.adjustments !== 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{t("detail.category.adjustments")}</span>
                      <span className={categoryBreakdown.adjustments < 0 ? "text-green-600" : ""}>
                        {formatPrice(categoryBreakdown.adjustments)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {hasMultipleCategories && <div className="border-t border-border" />}

            {/* VAT Breakdown */}
            {Object.keys(vatBreakdown).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-muted-foreground">
                  {t("detail.vatBreakdown")}
                </h4>
                <div className="space-y-1">
                  {Object.entries(vatBreakdown).map(([rateKey, { rate, base, vat }]) => (
                    <div key={rateKey} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        TVA {rate.toFixed(0)}% sur {formatPrice(base)}
                      </span>
                      <span>{formatPrice(vat)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-border" />

            {/* Summary Totals */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("detail.totalExclVat")}</span>
                <span className="font-medium">{formatPrice(totalExclVat)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("detail.totalVat")}</span>
                <span className="font-medium">{formatPrice(totalVat)}</span>
              </div>
              <div className="border-t border-border" />
              <div className="flex justify-between text-lg">
                <span className="font-semibold">{t("detail.totalInclVat")}</span>
                <span className="font-bold">{formatPrice(totalInclVat)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default InvoiceLinesList;
