"use client";

import { CreateQuoteCockpit } from "@saas/quotes/components";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { ChevronLeftIcon } from "lucide-react";
import { Button } from "@ui/components/button";

/**
 * Create Quote Page
 * 
 * 3-column cockpit for creating new quotes with:
 * - Left: Basic info (contact, trip details, vehicle)
 * - Center: Trip Transparency (costs, segments, profitability)
 * - Right: Pricing & options (price, notes, submit)
 * 
 * @see Story 6.2: Implement Create Quote 3-Column Cockpit
 * @see UX Spec 8.3.2 Create Quote
 */
export default function CreateQuotePage() {
  const t = useTranslations();
  const { activeOrganization } = useActiveOrganization();

  return (
    <div className="container py-8">
      {/* Header with back link */}
      <div className="mb-8">
        <Link href={`/app/${activeOrganization?.slug}/quotes`}>
          <Button variant="ghost" size="sm" className="mb-4 -ml-2">
            <ChevronLeftIcon className="size-4 mr-1" />
            {t("quotes.create.backToQuotes")}
          </Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">
          {t("quotes.create.title")}
        </h1>
        <p className="text-muted-foreground mt-2">
          {t("quotes.create.description")}
        </p>
      </div>

      {/* 3-Column Cockpit */}
      <CreateQuoteCockpit />
    </div>
  );
}
