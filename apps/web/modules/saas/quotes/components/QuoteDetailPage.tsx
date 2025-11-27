"use client";

import { Skeleton } from "@ui/components/skeleton";
import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";
import { QuoteHeader } from "./QuoteHeader";
import { QuoteCommercialSummary } from "./QuoteCommercialSummary";
import { TripTransparencyPanel } from "./TripTransparencyPanel";
import { QuoteActivityLog } from "./QuoteActivityLog";
import { useQuoteDetail } from "../hooks/useQuoteDetail";
import { useQuoteActions } from "../hooks/useQuoteActions";
import type { PricingResult, TripAnalysis } from "../types";

interface QuoteDetailPageProps {
  quoteId: string;
}

/**
 * QuoteDetailPage Component
 * 
 * Main 3-column layout for quote detail view.
 * - Left: Commercial summary (prices, costs, margin)
 * - Center: Trip Transparency (stored tripAnalysis)
 * - Right: Activity log and notes
 * 
 * @see Story 6.3: Quote Detail with Stored tripAnalysis
 * @see FR32: Sent quotes remain commercially fixed
 */
export function QuoteDetailPage({ quoteId }: QuoteDetailPageProps) {
  const t = useTranslations();
  const { toast } = useToast();

  // Fetch quote data
  const { data: quote, isLoading, error } = useQuoteDetail(quoteId);

  // Quote actions
  const { sendQuote, acceptQuote, rejectQuote, updateNotes, isLoading: isActionsLoading } = useQuoteActions();

  // Handle send quote
  const handleSend = async () => {
    try {
      await sendQuote(quoteId);
    } catch {
      // Error handled in hook
    }
  };

  // Handle accept quote
  const handleAccept = async () => {
    try {
      await acceptQuote(quoteId);
    } catch {
      // Error handled in hook
    }
  };

  // Handle reject quote
  const handleReject = async () => {
    try {
      await rejectQuote(quoteId);
    } catch {
      // Error handled in hook
    }
  };

  // Handle convert to invoice (placeholder)
  const handleConvertToInvoice = () => {
    toast({
      title: t("quotes.detail.actions.invoiceComingSoon"),
    });
  };

  // Handle update notes
  const handleUpdateNotes = async (notes: string | null) => {
    await updateNotes(quoteId, notes);
  };

  // Transform stored tripAnalysis to PricingResult for TripTransparencyPanel
  const transformToPricingResult = (tripAnalysis: TripAnalysis | null, quote: typeof data): PricingResult | null => {
    if (!tripAnalysis || !quote) return null;

    const marginPercent = quote.marginPercent ? parseFloat(quote.marginPercent) : 0;
    const internalCost = quote.internalCost ? parseFloat(quote.internalCost) : 0;
    const finalPrice = parseFloat(quote.finalPrice);

    return {
      pricingMode: quote.pricingMode,
      price: finalPrice,
      currency: "EUR",
      internalCost,
      margin: finalPrice - internalCost,
      marginPercent,
      profitabilityIndicator: marginPercent >= 20 ? "green" : marginPercent >= 0 ? "orange" : "red",
      matchedGrid: null, // Would come from appliedRules if available
      appliedRules: [],
      isContractPrice: quote.pricingMode === "FIXED_GRID",
      fallbackReason: null,
      tripAnalysis,
      complianceResult: null, // Story 6.7: Add missing complianceResult field
    };
  };

  // Loading state
  if (isLoading) {
    return <QuoteDetailSkeleton />;
  }

  // Error state
  if (error || !quote) {
    return (
      <div className="container py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {t("quotes.detail.notFound")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("quotes.detail.notFoundDescription")}
          </p>
        </div>
      </div>
    );
  }

  const data = quote;
  const pricingResult = transformToPricingResult(data.tripAnalysis, data);

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <QuoteHeader
        quote={data}
        onSend={handleSend}
        onAccept={handleAccept}
        onReject={handleReject}
        onConvertToInvoice={handleConvertToInvoice}
        isLoading={isActionsLoading}
      />

      {/* 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column - Commercial Summary */}
        <div className="lg:col-span-3">
          <QuoteCommercialSummary quote={data} />
        </div>

        {/* Center Column - Trip Transparency */}
        <div className="lg:col-span-6">
          <TripTransparencyPanel
            pricingResult={pricingResult}
            isLoading={false}
          />
        </div>

        {/* Right Column - Activity & Notes */}
        <div className="lg:col-span-3">
          <QuoteActivityLog
            quote={data}
            onUpdateNotes={handleUpdateNotes}
            isUpdating={isActionsLoading}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state for quote detail
 */
function QuoteDetailSkeleton() {
  return (
    <div className="container py-6 space-y-6">
      {/* Header skeleton */}
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>

      {/* 3-Column skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="lg:col-span-6">
          <Skeleton className="h-96 w-full" />
        </div>
        <div className="lg:col-span-3 space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    </div>
  );
}

export default QuoteDetailPage;
