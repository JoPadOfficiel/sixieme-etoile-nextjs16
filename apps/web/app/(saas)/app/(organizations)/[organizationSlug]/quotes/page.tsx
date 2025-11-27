"use client";

import { QuotesTable } from "@saas/quotes/components";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";

/**
 * Quotes List Page
 * 
 * Displays a paginated, filterable list of quotes with status and profitability indicators.
 * 
 * @see Story 6.1: Implement Quotes List with Status & Profitability
 * @see UX Spec 8.3.1 Quotes List
 * @see FR31-FR33 Quote lifecycle
 * @see FR24 Profitability indicator
 */
export default function QuotesPage() {
  const t = useTranslations();
  const router = useRouter();
  const { activeOrganization } = useActiveOrganization();

  const handleAddQuote = () => {
    // Navigate to create quote page (Story 6.2)
    router.push(`/app/${activeOrganization?.slug}/quotes/new`);
  };

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("quotes.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("quotes.description")}</p>
      </div>

      <QuotesTable onAddQuote={handleAddQuote} />
    </div>
  );
}
