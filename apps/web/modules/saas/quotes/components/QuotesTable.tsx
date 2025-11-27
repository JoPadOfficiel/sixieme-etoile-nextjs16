"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { useToast } from "@ui/hooks/use-toast";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BuildingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  FileTextIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  XCircleIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Quote, QuotesResponse, QuoteStatus } from "../types";
import { formatPrice, formatMargin, formatTripSummary } from "../types";
import { QuoteStatusBadge } from "./QuoteStatusBadge";
import { ProfitabilityIndicator } from "@saas/shared/components/ProfitabilityIndicator";
import { TripTransparencyPreview } from "@saas/shared/components/TripTransparencyPreview";

interface QuotesTableProps {
  onAddQuote: () => void;
}

const STATUS_OPTIONS: QuoteStatus[] = [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];

const CLIENT_TYPE_OPTIONS = [
  { value: "all", label: "all" },
  { value: "PARTNER", label: "partner" },
  { value: "PRIVATE", label: "private" },
] as const;

export function QuotesTable({ onAddQuote }: QuotesTableProps) {
  const t = useTranslations();
  const router = useRouter();
  const { activeOrganization, isSessionSynced } = useActiveOrganization();
  
  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [clientTypeFilter, setClientTypeFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 10;

  // Fetch quotes
  const { data, isLoading, error } = useQuery({
    queryKey: ["quotes", { search, statusFilter, clientTypeFilter, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (search) {
        params.set("search", search);
      }
      if (statusFilter && statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (clientTypeFilter && clientTypeFilter !== "all") {
        params.set("clientType", clientTypeFilter);
      }
      
      const response = await apiClient.vtc.quotes.$get({
        query: Object.fromEntries(params),
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch quotes");
      }
      
      const data = await response.json();
      // Transform API response to add optional status transition timestamps
      return {
        ...data,
        data: data.data.map((quote: Record<string, unknown>) => ({
          ...quote,
          sentAt: (quote.sentAt as string | null) ?? null,
          viewedAt: (quote.viewedAt as string | null) ?? null,
          acceptedAt: (quote.acceptedAt as string | null) ?? null,
          rejectedAt: (quote.rejectedAt as string | null) ?? null,
        })),
      } as QuotesResponse;
    },
    enabled: isSessionSynced,
  });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
    setPage(1);
  };

  const handleClientTypeChange = (value: string) => {
    setClientTypeFilter(value);
    setPage(1);
  };

  const { toast } = useToast();
  const queryClient = useQueryClient();

  /**
   * Story 7.2: Mutation for converting quote to invoice from table
   */
  const convertToInvoiceMutation = useMutation({
    mutationFn: async (quoteId: string) => {
      const response = await apiClient.vtc.invoices["from-quote"][":quoteId"].$post({
        param: { quoteId },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMessage = (errorData as { message?: string }).message || "Failed to convert quote to invoice";
        throw new Error(errorMessage);
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quotes"] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  const handleRowClick = (quote: Quote) => {
    // Story 6.3: Navigate to quote detail page
    router.push(`/app/${activeOrganization?.slug}/quotes/${quote.id}`);
  };

  const handleDuplicate = (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement duplicate functionality in Story 6.2
    console.log("Duplicate quote:", quote.id);
  };

  /**
   * Story 7.2: Handle convert to invoice from table dropdown
   */
  const handleConvertToInvoice = async (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const invoice = await convertToInvoiceMutation.mutateAsync(quote.id);
      toast({
        title: t("quotes.actions.convertSuccess"),
      });
      // Navigate to the created invoice
      router.push(`/app/${activeOrganization?.slug}/invoices/${(invoice as { id: string }).id}`);
    } catch (error) {
      toast({
        title: t("quotes.actions.convertError"),
        description: error instanceof Error ? error.message : undefined,
        variant: "error",
      });
    }
  };

  const handleCancel = async (quote: Quote, e: React.MouseEvent) => {
    e.stopPropagation();
    // TODO: Implement cancel functionality
    console.log("Cancel quote:", quote.id);
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("fr-FR", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "Europe/Paris",
    }).format(date);
  };

  return (
    <div className="space-y-4">
      {/* Header with search, filters, and add button */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("quotes.search")}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("quotes.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("quotes.filters.allStatuses")}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`quotes.status.${status.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Client type filter */}
          <Select value={clientTypeFilter} onValueChange={handleClientTypeChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("quotes.filters.clientType")} />
            </SelectTrigger>
            <SelectContent>
              {CLIENT_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`quotes.filters.${option.label}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Add button */}
        <Button onClick={onAddQuote}>
          <PlusIcon className="size-4 mr-2" />
          {t("quotes.addQuote")}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          {t("quotes.loadError")}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">{t("quotes.columns.id")}</TableHead>
                  <TableHead>{t("quotes.columns.contact")}</TableHead>
                  <TableHead>{t("quotes.columns.tripSummary")}</TableHead>
                  <TableHead>{t("quotes.columns.dateTime")}</TableHead>
                  <TableHead>{t("quotes.columns.vehicleCategory")}</TableHead>
                  <TableHead>{t("quotes.columns.status")}</TableHead>
                  <TableHead className="text-right">{t("quotes.columns.price")}</TableHead>
                  <TableHead className="text-right">{t("quotes.columns.margin")}</TableHead>
                  <TableHead>{t("quotes.columns.profitability")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      {search ? t("quotes.noResults") : t("quotes.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((quote) => (
                    <TableRow
                      key={quote.id}
                      className="cursor-pointer"
                      onClick={() => handleRowClick(quote)}
                    >
                      {/* Quote ID */}
                      <TableCell className="font-mono text-sm">
                        {quote.id.slice(0, 8)}
                      </TableCell>

                      {/* Contact */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {quote.contact.isPartner ? (
                            <BuildingIcon className="size-4 text-muted-foreground" />
                          ) : (
                            <UserIcon className="size-4 text-muted-foreground" />
                          )}
                          <div>
                            <div className="font-medium">{quote.contact.displayName}</div>
                            <Badge variant={quote.contact.isPartner ? "default" : "secondary"} className="text-xs">
                              {quote.contact.isPartner ? t("quotes.partner") : t("quotes.private")}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>

                      {/* Trip Summary with Preview */}
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-center gap-2">
                          <span className="truncate">
                            {formatTripSummary(quote.pickupAddress, quote.dropoffAddress)}
                          </span>
                          {quote.tripAnalysis && (
                            <TripTransparencyPreview
                              tripAnalysis={quote.tripAnalysis}
                              marginPercent={quote.marginPercent}
                              internalCost={quote.internalCost}
                              mode="hover"
                            />
                          )}
                        </div>
                      </TableCell>

                      {/* Date/Time */}
                      <TableCell className="text-muted-foreground">
                        {formatDateTime(quote.pickupAt)}
                      </TableCell>

                      {/* Vehicle Category */}
                      <TableCell>
                        <Badge variant="outline">
                          {quote.vehicleCategory.name}
                        </Badge>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <QuoteStatusBadge status={quote.status} />
                      </TableCell>

                      {/* Price */}
                      <TableCell className="text-right font-medium">
                        {formatPrice(quote.finalPrice)}
                      </TableCell>

                      {/* Margin */}
                      <TableCell className="text-right text-muted-foreground">
                        {formatMargin(quote.marginPercent)}
                      </TableCell>

                      {/* Profitability */}
                      <TableCell>
                        <ProfitabilityIndicator
                          marginPercent={quote.marginPercent}
                          compact
                        />
                      </TableCell>

                      {/* Actions */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="size-8">
                              <MoreHorizontalIcon className="size-4" />
                              <span className="sr-only">{t("quotes.actions.menu")}</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleRowClick(quote); }}>
                              <PencilIcon className="size-4 mr-2" />
                              {t("quotes.actions.viewEdit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleDuplicate(quote, e)}>
                              <CopyIcon className="size-4 mr-2" />
                              {t("quotes.actions.duplicate")}
                            </DropdownMenuItem>
                            {quote.status === "ACCEPTED" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={(e) => handleConvertToInvoice(quote, e)}>
                                  <FileTextIcon className="size-4 mr-2" />
                                  {t("quotes.actions.convertToInvoice")}
                                </DropdownMenuItem>
                              </>
                            )}
                            {(quote.status === "DRAFT" || quote.status === "SENT") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={(e) => handleCancel(quote, e)}
                                  className="text-destructive"
                                >
                                  <XCircleIcon className="size-4 mr-2" />
                                  {t("quotes.actions.cancel")}
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("quotes.pagination.showing", {
                  from: (page - 1) * limit + 1,
                  to: Math.min(page * limit, data.meta.total),
                  total: data.meta.total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  <ChevronLeftIcon className="size-4" />
                </Button>
                <span className="text-sm">
                  {t("quotes.pagination.page", {
                    current: page,
                    total: data.meta.totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(data.meta.totalPages, p + 1))}
                  disabled={page === data.meta.totalPages}
                >
                  <ChevronRightIcon className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default QuotesTable;
