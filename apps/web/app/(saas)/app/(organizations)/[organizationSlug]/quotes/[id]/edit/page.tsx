import { EditQuoteCockpit } from "@saas/quotes/components/EditQuoteCockpit";

interface EditQuotePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditQuotePage({ params }: EditQuotePageProps) {
  const { id } = await params;
  return <EditQuoteCockpit quoteId={id} />;
}
