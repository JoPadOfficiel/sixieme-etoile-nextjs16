"use client";

import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@ui/components/popover";
import { Skeleton } from "@ui/components/skeleton";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import {
  BuildingIcon,
  CheckIcon,
  ChevronsUpDownIcon,
  SearchIcon,
  UserIcon,
  XIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { cn } from "@ui/lib";
import type { Contact } from "../types";

interface ContactSelectorProps {
  value: Contact | null;
  onChange: (contact: Contact | null) => void;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

interface ContactsResponse {
  data: Contact[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * ContactSelector Component
 * 
 * Combobox for selecting a contact with search functionality.
 * Displays Partner/Private badge for each contact.
 * 
 * @see Story 6.2: Create Quote 3-Column Cockpit
 * @see AC3: Contact Selector with Type Badge
 */
export function ContactSelector({
  value,
  onChange,
  disabled = false,
  required = false,
  className,
}: ContactSelectorProps) {
  const t = useTranslations();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Fetch contacts with search
  const { data, isLoading } = useQuery({
    queryKey: ["contacts", "selector", search],
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: "20",
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
    enabled: open,
  });

  const contacts = data?.data ?? [];

  const handleSelect = (contact: Contact) => {
    onChange(contact);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <div className={cn("space-y-2", className)}>
      <Label>
        {t("quotes.create.contact")}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full justify-between h-auto min-h-10 py-2"
          >
            {value ? (
              <div className="flex items-center gap-2 text-left">
                {value.isPartner ? (
                  <BuildingIcon className="size-4 text-muted-foreground shrink-0" />
                ) : (
                  <UserIcon className="size-4 text-muted-foreground shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{value.displayName}</div>
                  {value.companyName && (
                    <div className="text-xs text-muted-foreground truncate">
                      {value.companyName}
                    </div>
                  )}
                </div>
                <Badge
                  variant={value.isPartner ? "default" : "secondary"}
                  className="shrink-0 text-xs"
                >
                  {value.isPartner ? t("quotes.partner") : t("quotes.private")}
                </Badge>
              </div>
            ) : (
              <span className="text-muted-foreground">
                {t("quotes.create.selectContact")}
              </span>
            )}
            <div className="flex items-center gap-1 shrink-0 ml-2">
              {value && (
                <XIcon
                  className="size-4 text-muted-foreground hover:text-foreground cursor-pointer"
                  onClick={handleClear}
                />
              )}
              <ChevronsUpDownIcon className="size-4 text-muted-foreground" />
            </div>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          {/* Search input */}
          <div className="p-2 border-b">
            <div className="relative">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder={t("quotes.create.searchContacts")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                autoFocus
              />
            </div>
          </div>

          {/* Contact list */}
          <div className="max-h-[300px] overflow-y-auto">
            {isLoading ? (
              <div className="p-2 space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-2 p-2">
                    <Skeleton className="size-8 rounded-full" />
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : contacts.length === 0 ? (
              <div className="p-4 text-center text-sm text-muted-foreground">
                {search
                  ? t("quotes.create.noContactsFound")
                  : t("quotes.create.noContacts")}
              </div>
            ) : (
              <div className="p-1">
                {contacts.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-2 p-2 rounded-md text-left",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      value?.id === contact.id && "bg-accent"
                    )}
                    onClick={() => handleSelect(contact)}
                  >
                    {contact.isPartner ? (
                      <BuildingIcon className="size-4 text-muted-foreground shrink-0" />
                    ) : (
                      <UserIcon className="size-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">
                        {contact.displayName}
                      </div>
                      {contact.companyName && (
                        <div className="text-xs text-muted-foreground truncate">
                          {contact.companyName}
                        </div>
                      )}
                      {contact.email && (
                        <div className="text-xs text-muted-foreground truncate">
                          {contact.email}
                        </div>
                      )}
                    </div>
                    <Badge
                      variant={contact.isPartner ? "default" : "secondary"}
                      className="shrink-0 text-xs"
                    >
                      {contact.isPartner ? t("quotes.partner") : t("quotes.private")}
                    </Badge>
                    {value?.id === contact.id && (
                      <CheckIcon className="size-4 text-primary shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default ContactSelector;
