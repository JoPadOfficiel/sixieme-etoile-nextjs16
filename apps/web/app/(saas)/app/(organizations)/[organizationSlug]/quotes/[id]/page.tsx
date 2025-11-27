import { QuoteDetailPage } from "@saas/quotes/components/QuoteDetailPage";
import { getTranslations } from "next-intl/server";

interface QuoteDetailPageProps {
  params: Promise<{
    organizationSlug: string;
    id: string;
  }>;
}

export async function generateMetadata({ params }: QuoteDetailPageProps) {
  const { id } = await params;
  const t = await getTranslations();

  return {
    title: `${t("quotes.detail.title")} - ${id.substring(0, 8)}`,
  };
}

export default async function QuoteDetailRoute({ params }: QuoteDetailPageProps) {
  const { id } = await params;

  return <QuoteDetailPage quoteId={id} />;
}
