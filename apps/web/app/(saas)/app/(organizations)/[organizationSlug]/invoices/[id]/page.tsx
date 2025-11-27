import { InvoiceDetail } from "@saas/invoices";
import { getTranslations } from "next-intl/server";

interface InvoiceDetailPageProps {
  params: Promise<{
    organizationSlug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: InvoiceDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations();

  return {
    title: `${t("invoices.detail.title")} - ${id.substring(0, 8)}`,
  };
}

/**
 * Invoice Detail Page
 * 
 * Displays full invoice details with billing info, lines, and VAT breakdown.
 * 
 * @see Story 7.1: Implement Invoice & InvoiceLine Models and Invoices UI
 * @see FR33-FR36 Invoice lifecycle and immutability
 */
export default async function InvoiceDetailRoute({ params }: InvoiceDetailPageProps) {
  const { id } = await params;

  return (
    <div className="container py-8">
      <InvoiceDetail invoiceId={id} />
    </div>
  );
}
