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
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import {
  AlertTriangleIcon,
  BuildingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExternalLinkIcon,
  Loader2Icon,
  MoreHorizontalIcon,
  PencilIcon,
  SearchIcon,
  UserIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useInvoices } from "../hooks/useInvoices";
import type { InvoiceListItem, InvoiceStatus } from "../types";
import { formatPrice, formatDate, isOverdue, getDaysUntilDue } from "../types";
import { InvoiceStatusBadge } from "./InvoiceStatusBadge";

const STATUS_OPTIONS: InvoiceStatus[] = ["DRAFT", "ISSUED", "PAID", "CANCELLED"];

export function InvoicesTable() {
  const t = useTranslations();
  const router = useRouter();
  const { activeOrganization, isSessionSynced } = useActiveOrganization();

  // Filter state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch invoices
  const { data, isLoading, error } = useInvoices({
    page,
    limit,
    filters: {
      search: search || undefined,
      status: statusFilter !== "all" ? (statusFilter as InvoiceStatus) : undefined,
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

  const handleRowClick = (invoice: InvoiceListItem) => {
    router.push(`/app/${activeOrganization?.slug}/invoices/${invoice.id}`);
  };

  const handleViewQuote = (invoice: InvoiceListItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (invoice.quoteId) {
      router.push(`/app/${activeOrganization?.slug}/quotes/${invoice.quoteId}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header with search and filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("invoices.search")}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Status filter */}
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder={t("invoices.filters.status")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("invoices.filters.allStatuses")}</SelectItem>
              {STATUS_OPTIONS.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`invoices.status.${status.toLowerCase()}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          {t("invoices.loadError")}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">{t("invoices.columns.number")}</TableHead>
                  <TableHead>{t("invoices.columns.client")}</TableHead>
                  <TableHead>{t("invoices.columns.issueDate")}</TableHead>
                  <TableHead>{t("invoices.columns.dueDate")}</TableHead>
                  <TableHead className="text-right">{t("invoices.columns.total")}</TableHead>
                  <TableHead className="text-right">{t("invoices.columns.vat")}</TableHead>
                  <TableHead>{t("invoices.columns.status")}</TableHead>
                  <TableHead>{t("invoices.columns.sourceQuote")}</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      {search ? t("invoices.noResults") : t("invoices.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((invoice) => {
                    const overdue = isOverdue(invoice);
                    const daysUntilDue = getDaysUntilDue(invoice);

                    return (
                      <TableRow
                        key={invoice.id}
                        className="cursor-pointer"
                        onClick={() => handleRowClick(invoice)}
                      >
                        {/* Invoice Number */}
                        <TableCell className="font-mono text-sm font-medium">
                          {invoice.number}
                        </TableCell>

                        {/* Contact */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {invoice.contact.isPartner ? (
                              <BuildingIcon className="size-4 text-muted-foreground" />
                            ) : (
                              <UserIcon className="size-4 text-muted-foreground" />
                            )}
                            <div>
                              <div className="font-medium">{invoice.contact.displayName}</div>
                              <Badge
                                variant={invoice.contact.isPartner ? "default" : "secondary"}
                                className="text-xs"
                              >
                                {invoice.contact.isPartner
                                  ? t("invoices.partner")
                                  : t("invoices.private")}
                              </Badge>
                            </div>
                          </div>
                        </TableCell>

                        {/* Issue Date */}
                        <TableCell className="text-muted-foreground">
                          {formatDate(invoice.issueDate)}
                        </TableCell>

                        {/* Due Date */}
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className={overdue ? "text-destructive font-medium" : "text-muted-foreground"}>
                              {formatDate(invoice.dueDate)}
                            </span>
                            {overdue && (
                              <AlertTriangleIcon className="size-4 text-destructive" />
                            )}
                            {!overdue && invoice.status === "ISSUED" && daysUntilDue <= 7 && (
                              <Badge variant="outline" className="text-xs text-orange-600">
                                {daysUntilDue === 0
                                  ? t("invoices.dueToday")
                                  : t("invoices.dueIn", { days: daysUntilDue })}
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Total TTC */}
                        <TableCell className="text-right font-medium">
                          {formatPrice(invoice.totalInclVat)}
                        </TableCell>

                        {/* VAT */}
                        <TableCell className="text-right text-muted-foreground">
                          {formatPrice(invoice.totalVat)}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <InvoiceStatusBadge status={invoice.status} />
                        </TableCell>

                        {/* Source Quote */}
                        <TableCell>
                          {invoice.quoteId ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-auto p-1 text-xs"
                              onClick={(e) => handleViewQuote(invoice, e)}
                            >
                              <ExternalLinkIcon className="size-3 mr-1" />
                              {invoice.quoteId.substring(0, 8)}
                            </Button>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </TableCell>

                        {/* Actions */}
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                              <Button variant="ghost" size="icon" className="size-8">
                                <MoreHorizontalIcon className="size-4" />
                                <span className="sr-only">{t("invoices.actions.menu")}</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick(invoice);
                                }}
                              >
                                <PencilIcon className="size-4 mr-2" />
                                {t("invoices.actions.view")}
                              </DropdownMenuItem>
                              {invoice.quoteId && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={(e) => handleViewQuote(invoice, e)}>
                                    <ExternalLinkIcon className="size-4 mr-2" />
                                    {t("invoices.actions.viewQuote")}
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {data && data.meta.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("invoices.pagination.showing", {
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
                  {t("invoices.pagination.page", {
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

export default InvoicesTable;
