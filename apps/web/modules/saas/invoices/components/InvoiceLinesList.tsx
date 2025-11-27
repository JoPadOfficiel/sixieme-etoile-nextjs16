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
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { useTranslations } from "next-intl";
import type { InvoiceLine } from "../types";
import { formatPrice, formatVatRate, getLineTypeLabel, calculateLineTotals } from "../types";

export interface InvoiceLinesListProps {
  lines: InvoiceLine[];
  totalExclVat: string;
  totalVat: string;
  totalInclVat: string;
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
}: InvoiceLinesListProps) {
  const t = useTranslations("invoices.detail");

  // Calculate VAT breakdown by rate
  const { vatBreakdown } = calculateLineTotals(lines);

  return (
    <div className="space-y-6">
      {/* Lines Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("lines")}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50%]">{t("description")}</TableHead>
                <TableHead className="text-right">{t("quantity")}</TableHead>
                <TableHead className="text-right">{t("unitPrice")}</TableHead>
                <TableHead className="text-right">{t("vatRate")}</TableHead>
                <TableHead className="text-right">{t("totalExclVat")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    {t("noLines")}
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
                      {parseFloat(line.quantity).toFixed(2)}
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
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Totals Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">{t("totals")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* VAT Breakdown */}
          {Object.keys(vatBreakdown).length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                {t("vatBreakdown")}
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
              <span className="text-muted-foreground">{t("totalExclVat")}</span>
              <span className="font-medium">{formatPrice(totalExclVat)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("totalVat")}</span>
              <span className="font-medium">{formatPrice(totalVat)}</span>
            </div>
            <div className="border-t border-border" />
            <div className="flex justify-between text-lg">
              <span className="font-semibold">{t("totalInclVat")}</span>
              <span className="font-bold">{formatPrice(totalInclVat)}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default InvoiceLinesList;
