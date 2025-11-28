"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Badge } from "@ui/components/badge";
import { Skeleton } from "@ui/components/skeleton";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Percent,
  Euro,
  MapPin,
  Package,
  Clock,
} from "lucide-react";
import type { CommercialMetricsResponse, ProfitabilityBand } from "../types";

interface ContactCommercialSummaryProps {
  contactId: string;
  isPartner: boolean;
}

/**
 * Format currency in EUR
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(amount);
}

/**
 * Get profitability icon and color based on band
 */
function getProfitabilityConfig(band: ProfitabilityBand) {
  switch (band) {
    case "green":
      return {
        Icon: TrendingUp,
        color: "text-green-600 dark:text-green-400",
        bgColor: "bg-green-100 dark:bg-green-900",
        label: "profitable",
      };
    case "orange":
      return {
        Icon: AlertTriangle,
        color: "text-orange-600 dark:text-orange-400",
        bgColor: "bg-orange-100 dark:bg-orange-900",
        label: "lowMargin",
      };
    case "red":
      return {
        Icon: TrendingDown,
        color: "text-red-600 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-900",
        label: "loss",
      };
    default:
      return {
        Icon: AlertTriangle,
        color: "text-muted-foreground",
        bgColor: "bg-muted",
        label: "unknown",
      };
  }
}

/**
 * Loading skeleton
 */
function CommercialSummarySkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
      <Skeleton className="h-32" />
    </div>
  );
}

/**
 * ContactCommercialSummary Component
 *
 * Displays commercial metrics for a contact including:
 * - Average margin and profitability trend
 * - Total revenue from quotes and invoices
 * - Commission percentage (for partners)
 * - Typical grids used (for partners)
 *
 * Story 2.5: Expose Commercial Context in CRM Views
 */
export function ContactCommercialSummary({
  contactId,
  isPartner,
}: ContactCommercialSummaryProps) {
  const t = useTranslations("contacts.commercial");
  const [data, setData] = useState<CommercialMetricsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    if (!contactId) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/vtc/contacts/${contactId}/commercial-metrics`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch commercial metrics");
      }

      const result = await response.json();
      setData(result);
    } catch (err) {
      console.error("Failed to fetch commercial metrics:", err);
      setError(t("fetchError"));
    } finally {
      setIsLoading(false);
    }
  }, [contactId, t]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (isLoading) {
    return <CommercialSummarySkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-destructive text-center">{error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return null;
  }

  const { metrics } = data;
  const profitConfig = getProfitabilityConfig(metrics.profitabilityBand);
  const ProfitIcon = profitConfig.Icon;

  return (
    <div className="space-y-4">
      {/* Profitability Overview */}
      <div className="grid grid-cols-2 gap-4">
        {/* Average Margin Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${profitConfig.bgColor}`}
              >
                <ProfitIcon className={`h-4 w-4 ${profitConfig.color}`} />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  {t("averageMargin")}
                </span>
                <p className={`text-2xl font-bold ${profitConfig.color}`}>
                  {metrics.averageMarginPercent !== null
                    ? `${metrics.averageMarginPercent.toFixed(1)}%`
                    : "—"}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t(`profitability.${profitConfig.label}`)}
            </p>
          </CardContent>
        </Card>

        {/* Total Revenue Card */}
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-blue-100 dark:bg-blue-900">
                <Euro className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <span className="text-sm text-muted-foreground">
                  {t("totalRevenue")}
                </span>
                <p className="text-2xl font-bold">
                  {formatCurrency(metrics.totalQuotesValue)}
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {t("fromQuotes", { count: metrics.totalQuotes })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{t("invoiceSummary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{metrics.totalInvoices}</p>
              <p className="text-xs text-muted-foreground">{t("totalInvoices")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(metrics.paidInvoicesValue)}
              </p>
              <p className="text-xs text-muted-foreground">{t("paidAmount")}</p>
            </div>
            <div>
              <p className="text-2xl font-bold">
                {formatCurrency(metrics.totalInvoicesValue)}
              </p>
              <p className="text-xs text-muted-foreground">{t("totalAmount")}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Partner-specific: Commission */}
      {isPartner && metrics.commissionPercent !== null && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Percent className="h-4 w-4" />
              {t("commission")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{metrics.commissionPercent}%</p>
            <p className="text-xs text-muted-foreground">{t("commissionDescription")}</p>
          </CardContent>
        </Card>
      )}

      {/* Partner-specific: Typical Grids */}
      {isPartner && metrics.typicalGrids && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">{t("typicalGrids")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Zone Routes */}
            {metrics.typicalGrids.zoneRoutes.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("zoneRoutes")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metrics.typicalGrids.zoneRoutes.map((route) => (
                    <Badge key={route.id} variant="secondary">
                      {route.fromZone} → {route.toZone}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Excursion Packages */}
            {metrics.typicalGrids.excursionPackages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("excursions")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metrics.typicalGrids.excursionPackages.map((pkg) => (
                    <Badge key={pkg.id} variant="secondary">
                      {pkg.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Dispo Packages */}
            {metrics.typicalGrids.dispoPackages.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">{t("dispoPackages")}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {metrics.typicalGrids.dispoPackages.map((pkg) => (
                    <Badge key={pkg.id} variant="secondary">
                      {pkg.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* No grids assigned */}
            {metrics.typicalGrids.zoneRoutes.length === 0 &&
              metrics.typicalGrids.excursionPackages.length === 0 &&
              metrics.typicalGrids.dispoPackages.length === 0 && (
                <p className="text-sm text-muted-foreground">{t("noGridsAssigned")}</p>
              )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
