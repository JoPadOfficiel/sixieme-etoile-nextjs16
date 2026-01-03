"use client";

import { InvoicesTable } from "@saas/invoices";
import { useTranslations } from "next-intl";

/**
 * Invoices List Page
 * 
 * Displays a paginated, filterable list of invoices with status and VAT breakdown.
 * 
 * @see Story 7.1: Implement Invoice & InvoiceLine Models and Invoices UI
 * @see UX Spec 8.4.1 Invoices List
 * @see FR33-FR36 Invoice lifecycle
 */
export default function InvoicesPage() {
  const t = useTranslations();

  return (
    <div className="py-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("invoices.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("invoices.description")}</p>
      </div>

      <InvoicesTable />
    </div>
  );
}
