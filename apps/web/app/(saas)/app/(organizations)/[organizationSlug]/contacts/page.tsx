"use client";

import { ContactsTable, ContactDrawer, type ContactTab } from "@saas/contacts/components";
import type { ContactWithCounts } from "@saas/contacts/types";
import { useState, useCallback, Suspense, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";

/**
 * Story 25.5: Deep Linking Navigation for Contacts
 * 
 * URL Query Parameters:
 * - `id`: Contact ID to open in drawer
 * - `tab`: Tab to display (details, timeline, commercial, end-customers, contract)
 * 
 * Example: /contacts?id=abc123&tab=end-customers
 */

// Valid tabs for URL validation
const VALID_TABS: ContactTab[] = ["details", "timeline", "commercial", "end-customers", "contract"];

function isValidTab(tab: string | null): tab is ContactTab {
  return tab !== null && VALID_TABS.includes(tab as ContactTab);
}

function ContactsPageContent() {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Story 25.5: Read URL params for deep linking - derive state from URL
  const urlContactId = searchParams.get("id");
  const urlTab = searchParams.get("tab");
  
  // Derive initial tab from URL
  const derivedInitialTab = useMemo<ContactTab>(() => {
    if (isValidTab(urlTab)) {
      return urlTab;
    }
    // MED-3 fix: Warn if an invalid tab was specified in URL
    if (urlTab !== null) {
      console.warn(`[Deep Linking] Invalid tab parameter: "${urlTab}". Valid tabs: ${VALID_TABS.join(", ")}. Defaulting to "details".`);
    }
    return "details";
  }, [urlTab]);
  
  // Local state for manual drawer control (when user adds/edits contact manually)
  const [manuallySelectedContact, setManuallySelectedContact] = useState<ContactWithCounts | null>(null);
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);
  const [manualTab, setManualTab] = useState<ContactTab>("details");

  // Fetch specific contact if URL has id param (for deep linking)
  // Note: The single contact API doesn't return _count, so we add it for type compatibility
  const { data: deepLinkContact, isLoading: isLoadingDeepLink, isError: isDeepLinkError } = useQuery({
    queryKey: ["contact", urlContactId],
    queryFn: async () => {
      if (!urlContactId) return null;
      const response = await apiClient.vtc.contacts[":id"].$get({
        param: { id: urlContactId },
      });
      if (!response.ok) {
        throw new Error("Contact not found");
      }
      const contact = await response.json();
      // Add _count for type compatibility with ContactWithCounts
      // The actual counts are not needed for drawer display
      return {
        ...contact,
        _count: { quotes: contact.quotes?.length ?? 0, invoices: contact.invoices?.length ?? 0 }
      } as ContactWithCounts;
    },
    enabled: !!urlContactId,
    retry: false, // Don't retry on 404
  });

  // MED-2 fix: Show error toast and clear URL when deep link contact not found
  useEffect(() => {
    if (isDeepLinkError && urlContactId) {
      toast({
        title: t("contacts.loadError"),
        description: `Contact ID: ${urlContactId}`,
        variant: "error",
      });
      // Clear the invalid URL params
      router.replace(pathname, { scroll: false });
    }
  }, [isDeepLinkError, urlContactId, toast, t, router, pathname]);

  // Story 25.5: Derive drawer state from URL or manual control
  // If URL has a contact ID and we have fetched the contact, show the drawer
  const isDeepLinkActive = !!urlContactId && !!deepLinkContact && !isLoadingDeepLink;
  const drawerOpen = isDeepLinkActive || isManualDrawerOpen;
  const selectedContact = isDeepLinkActive ? deepLinkContact : manuallySelectedContact;
  const currentTab = isDeepLinkActive ? derivedInitialTab : manualTab;

  // Story 25.5: Update URL when drawer/tab changes
  const updateUrl = useCallback((contactId: string | null, tab: ContactTab | null) => {
    const params = new URLSearchParams();
    if (contactId) {
      params.set("id", contactId);
      if (tab && tab !== "details") {
        params.set("tab", tab);
      }
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [pathname, router]);

  const handleAddContact = () => {
    // Clear URL and open drawer for new contact
    updateUrl(null, null);
    setManuallySelectedContact(null);
    setManualTab("details");
    setIsManualDrawerOpen(true);
  };

  const handleEditContact = (contact: ContactWithCounts) => {
    // Update URL and open drawer with selected contact
    updateUrl(contact.id, "details");
    setManuallySelectedContact(contact);
    setManualTab("details");
    setIsManualDrawerOpen(true);
  };

  const handleDrawerOpenChange = (open: boolean) => {
    if (!open) {
      // Clear URL when drawer closes
      updateUrl(null, null);
      setManuallySelectedContact(null);
      setManualTab("details");
      setIsManualDrawerOpen(false);
    }
  };

  // Story 25.5: Handle tab changes to update URL
  const handleTabChange = (tab: ContactTab) => {
    setManualTab(tab);
    if (selectedContact) {
      updateUrl(selectedContact.id, tab);
    }
  };

  return (
    <div className="py-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">{t("contacts.title")}</h1>
        <p className="text-muted-foreground mt-2">{t("contacts.description")}</p>
      </div>

      <ContactsTable
        onAddContact={handleAddContact}
        onEditContact={handleEditContact}
      />

      <ContactDrawer
        open={drawerOpen}
        onOpenChange={handleDrawerOpenChange}
        contact={selectedContact}
        initialTab={currentTab}
        onTabChange={handleTabChange}
      />
    </div>
  );
}

// Wrap in Suspense for useSearchParams
export default function ContactsPage() {
  return (
    <Suspense fallback={
      <div className="py-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded mb-4" />
        <div className="h-4 w-64 bg-muted rounded mb-8" />
        <div className="h-64 w-full bg-muted rounded" />
      </div>
    }>
      <ContactsPageContent />
    </Suspense>
  );
}
