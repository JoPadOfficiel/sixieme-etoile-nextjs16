"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import {
  BuildingIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2Icon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import type { ContactWithCounts, ContactsResponse } from "../types";

interface ContactsTableProps {
  onAddContact: () => void;
  onEditContact: (contact: ContactWithCounts) => void;
}

export function ContactsTable({ onAddContact, onEditContact }: ContactsTableProps) {
  const t = useTranslations();
  const { isSessionSynced } = useActiveOrganization();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", { search, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      if (search) {
        params.set("search", search);
      }
      const response = await apiClient.vtc.contacts.$get({
        query: Object.fromEntries(params),
      });
      if (!response.ok) {
        throw new Error("Failed to fetch contacts");
      }
      return response.json() as Promise<ContactsResponse>;
    },
    // Only fetch when session is synced with the active organization
    enabled: isSessionSynced,
  });

  const getTypeIcon = (type: ContactWithCounts["type"]) => {
    switch (type) {
      case "INDIVIDUAL":
        return <UserIcon className="size-4" />;
      case "BUSINESS":
        return <BuildingIcon className="size-4" />;
      case "AGENCY":
        return <UsersIcon className="size-4" />;
    }
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page on search
  };

  return (
    <div className="space-y-4">
      {/* Header with search and add button */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("contacts.search")}
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button onClick={onAddContact}>
          <PlusIcon className="size-4 mr-2" />
          {t("contacts.addContact")}
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="text-center py-12 text-destructive">
          {t("contacts.loadError")}
        </div>
      ) : (
        <>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("contacts.columns.name")}</TableHead>
                  <TableHead>{t("contacts.columns.type")}</TableHead>
                  <TableHead>{t("contacts.columns.company")}</TableHead>
                  <TableHead>{t("contacts.columns.email")}</TableHead>
                  <TableHead>{t("contacts.columns.phone")}</TableHead>
                  <TableHead className="text-center">{t("contacts.columns.quotes")}</TableHead>
                  <TableHead className="text-center">{t("contacts.columns.invoices")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                      {search ? t("contacts.noResults") : t("contacts.empty")}
                    </TableCell>
                  </TableRow>
                ) : (
                  data?.data.map((contact) => (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer"
                      onClick={() => onEditContact(contact)}
                    >
                      <TableCell className="font-medium">
                        {contact.displayName}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(contact.type)}
                          <Badge variant={contact.isPartner ? "default" : "secondary"}>
                            {contact.isPartner
                              ? t("contacts.partner")
                              : t("contacts.private")}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.companyName || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.email || "-"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {contact.phone || "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{contact._count.quotes}</Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">{contact._count.invoices}</Badge>
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
                {t("contacts.pagination.showing", {
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
                  {t("contacts.pagination.page", {
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
