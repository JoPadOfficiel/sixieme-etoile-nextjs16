"use client";

import { ContactsTable, ContactDrawer, type ContactTab } from "@saas/contacts/components";
import type { ContactWithCounts } from "@saas/contacts/types";
import { useState, useCallback, Suspense, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@shared/lib/api-client";
import { useQuery } from "@tanstack/react-query";

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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Story 25.5: Read URL params for deep linking - derive state from URL
  const urlContactId = searchParams.get("id");
  const urlTab = searchParams.get("tab");
  
  // Derive initial tab from URL
  const derivedInitialTab = useMemo<ContactTab>(() => {
    return isValidTab(urlTab) ? urlTab : "details";
  }, [urlTab]);
  
  // Local state for manual drawer control (when user adds/edits contact manually)
  const [manuallySelectedContact, setManuallySelectedContact] = useState<ContactWithCounts | null>(null);
  const [isManualDrawerOpen, setIsManualDrawerOpen] = useState(false);
  const [manualTab, setManualTab] = useState<ContactTab>("details");

  // Fetch specific contact if URL has id param (for deep linking)
  // Note: The single contact API doesn't return _count, so we add it for type compatibility
  const { data: deepLinkContact, isLoading: isLoadingDeepLink } = useQuery({
    queryKey: ["contact", urlContactId],
    queryFn: async () => {
      if (!urlContactId) return null;
      const response = await apiClient.vtc.contacts[":id"].$get({
        param: { id: urlContactId },
      });
      if (!response.ok) return null;
      const contact = await response.json();
      // Add _count for type compatibility with ContactWithCounts
      // The actual counts are not needed for drawer display
      return {
        ...contact,
        _count: { quotes: contact.quotes?.length ?? 0, invoices: contact.invoices?.length ?? 0 }
      } as ContactWithCounts;
    },
    enabled: !!urlContactId,
  });

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
    <Suspense fallback={<div className="py-4">Loading...</div>}>
      <ContactsPageContent />
    </Suspense>
  );
}
