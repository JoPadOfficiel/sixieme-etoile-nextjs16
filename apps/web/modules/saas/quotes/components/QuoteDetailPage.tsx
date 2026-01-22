"use client";

import { Skeleton } from "@ui/components/skeleton";
import { useToast } from "@ui/hooks/use-toast";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { QuoteHeader } from "./QuoteHeader";
import { QuoteCommercialSummary } from "./QuoteCommercialSummary";
import { TripTransparencyPanel } from "./TripTransparencyPanel";
import { QuoteActivityLog } from "./QuoteActivityLog";
import { CostBreakdownDisplay } from "./CostBreakdownDisplay";
import { QuoteAssignmentInfo } from "./QuoteAssignmentInfo";
import { QuoteLinesTable } from "./QuoteLinesTable";
import { MultiMissionMap } from "./MultiMissionMap";
import { QuoteLineSelectionProvider } from "../contexts/QuoteLineSelectionContext";
import { useQuoteDetail } from "../hooks/useQuoteDetail";
import { useQuoteActions } from "../hooks/useQuoteActions";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useGenerateQuotePdf } from "@saas/documents/hooks/useDocuments";
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
  const router = useRouter();
  const { activeOrganization } = useActiveOrganization();

  // Fetch quote data
  const { data: quote, isLoading, error } = useQuoteDetail(quoteId);

  // Quote actions (Story 7.2: Added convertToInvoice and isConverting)
  const { 
    sendQuote, 
    acceptQuote, 
    rejectQuote, 
    updateNotes, 
    convertToInvoice,
    isLoading: isActionsLoading,
    isConverting,
  } = useQuoteActions();

  // Story 7.5: PDF generation
  const generatePdfMutation = useGenerateQuotePdf();

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

  /**
   * Story 7.2: Handle convert to invoice
   * Calls API to create invoice with deep-copy semantics
   * Navigates to the created invoice on success
   */
  const handleConvertToInvoice = async () => {
    try {
      const invoice = await convertToInvoice(quoteId);
      toast({
        title: t("quotes.detail.actions.convertSuccess"),
      });
      // Navigate to the created invoice
      router.push(`/app/${activeOrganization?.slug}/invoices/${invoice.id}`);
    } catch (error) {
      toast({
        title: t("quotes.detail.actions.convertError"),
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  // Handle update notes
  const handleUpdateNotes = async (notes: string | null) => {
    await updateNotes(quoteId, notes);
  };

  /**
   * Story 7.5: Handle PDF generation and download
   */
  // Story 7.5: Handle PDF generation and preview
  const handleDownloadPdf = async () => {
    try {
      const document = await generatePdfMutation.mutateAsync(quoteId);
      toast({
        title: t("documents.generated"),
      });
      // Open file URL in new tab (Preview)
      if (document.url) {
        window.open(document.url, "_blank");
      }
    } catch (error) {
      toast({
        title: t("documents.generateError"),
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
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
      <div className="py-4">
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
  const hasMultipleLines = data.lines && data.lines.length > 0;

  return (
    <QuoteLineSelectionProvider>
      <div className="py-4 space-y-6">
        {/* Header */}
        <QuoteHeader
          quote={data}
          onSend={handleSend}
          onAccept={handleAccept}
          onReject={handleReject}
          onConvertToInvoice={handleConvertToInvoice}
          onDownloadPdf={handleDownloadPdf}
          isLoading={isActionsLoading || isConverting || generatePdfMutation.isPending}
        />

        {/* Story 29.2: Multi-Mission Lines Table + Map */}
        {hasMultipleLines && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <QuoteLinesTable lines={data.lines} />
            <MultiMissionMap lines={data.lines} />
          </div>
        )}

        {/* 3-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Commercial Summary + Cost Breakdown */}
          <div className="lg:col-span-3 space-y-4">
            <QuoteCommercialSummary quote={data} />
            {/* Story 15.7: Display cost breakdown for audit */}
            <CostBreakdownDisplay 
              breakdown={(data.tripAnalysis as TripAnalysis | null)?.costBreakdown ?? null} 
              compact 
            />
          </div>

          {/* Center Column - Trip Transparency */}
          <div className="lg:col-span-6">
            <TripTransparencyPanel
              pricingResult={pricingResult}
              isLoading={false}
              routeCoordinates={{
                pickup: data.pickupLatitude && data.pickupLongitude
                  ? { 
                      lat: parseFloat(data.pickupLatitude), 
                      lng: parseFloat(data.pickupLongitude), 
                      address: data.pickupAddress 
                    }
                  : undefined,
                dropoff: data.dropoffLatitude && data.dropoffLongitude
                  ? { 
                      lat: parseFloat(data.dropoffLatitude), 
                      lng: parseFloat(data.dropoffLongitude), 
                      address: data.dropoffAddress ?? "" 
                    }
                  : undefined,
              }}
            />
          </div>

          {/* Right Column - Assignment Info & Activity */}
          <div className="lg:col-span-3 space-y-4">
            {/* Story 20.8: Display assignment info in quote details */}
            <QuoteAssignmentInfo quote={data} />
            <QuoteActivityLog
              quote={data}
              onUpdateNotes={handleUpdateNotes}
              isUpdating={isActionsLoading}
            />
          </div>
        </div>
      </div>
    </QuoteLineSelectionProvider>
  );
}

/**
 * Skeleton loading state for quote detail
 */
function QuoteDetailSkeleton() {
  return (
    <div className="py-4 space-y-6">
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
