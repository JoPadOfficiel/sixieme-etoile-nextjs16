import { EditInvoicePage } from "@saas/invoices";

interface EditInvoicePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function Page({ params }: EditInvoicePageProps) {
  const { id } = await params;
  return <EditInvoicePage invoiceId={id} />;
}
