"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ui/components/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { useTranslations } from "next-intl";
import { User, TrendingUp, Briefcase, BarChart3, Receipt } from "lucide-react";
import { ContactForm } from "./ContactForm";
import { PartnerContractForm } from "./PartnerContractForm";
import { ContactTimeline } from "./ContactTimeline";
import { ContactCommercialSummary } from "./ContactCommercialSummary";
import { EndCustomerList } from "./EndCustomerList";
import { ContactInvoicesTab } from "./ContactInvoicesTab";
import type { Contact } from "../types";
import { useContactBalance } from "@saas/invoices/hooks/useContactBalance";
import { Badge } from "@ui/components/badge";

/**
 * Valid tab values for ContactDrawer deep linking.
 * Used to control which tab is displayed when opening a contact via URL.
 * 
 * @example URL: /contacts?id=abc123&tab=end-customers
 * 
 * Tabs available:
 * - `details`: Contact form/details (default)
 * - `timeline`: Activity history (quotes/invoices)
 * - `commercial`: Commercial summary with margins
 * - `invoices`: Invoice list with bulk payment (Story 25.6)
 * - `end-customers`: End customer list (partners only)
 * - `contract`: Partner contract settings (partners only)
 */
export type ContactTab = "details" | "timeline" | "commercial" | "invoices" | "end-customers" | "contract";

interface ContactDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
  /** Story 25.5: Initial tab to open for deep linking */
  initialTab?: ContactTab;
  /** Story 25.5: Callback when tab changes for URL sync */
  onTabChange?: (tab: ContactTab) => void;
}

export function ContactDrawer({ 
  open, 
  onOpenChange, 
  contact,
  initialTab,
  onTabChange,
}: ContactDrawerProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState<ContactTab>("details");
  // Story 25.5: Use initialTab if provided and drawer is open, otherwise use activeTab state
  const effectiveTab = (open && initialTab) ? initialTab : activeTab;

  const { data: balanceData, isLoading: isBalanceLoading, error: balanceError, refetch: refetchBalance } = useContactBalance({
    contactId: contact?.id || "",
    enabled: !!contact && open,
  });

  const handleTabChange = (tab: string) => {
    const newTab = tab as ContactTab;
    setActiveTab(newTab);
    onTabChange?.(newTab);
  };

  const handleSuccess = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Reset tab when drawer closes
      setActiveTab("details");
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
			<SheetContent className="w-full sm:!max-w-none sm:!w-full lg:!max-w-[75vw] lg:!w-[75vw] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {contact ? t("contacts.editContact") : t("contacts.addContact")}
          </SheetTitle>
          <SheetDescription>
            {contact
              ? t("contacts.editContactDescription")
              : t("contacts.addContactDescription")}
          </SheetDescription>
        </SheetHeader>

        {contact ? (
          <Tabs value={effectiveTab} onValueChange={handleTabChange} className="mt-6">
            <TabsList className={`grid w-full ${contact.isPartner ? "grid-cols-6" : "grid-cols-4"}`}>
              <TabsTrigger value="details" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                {t("contacts.tabs.details")}
              </TabsTrigger>
              <TabsTrigger value="timeline" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                {t("contacts.tabs.timeline")}
              </TabsTrigger>
              <TabsTrigger value="commercial" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("contacts.tabs.commercial")}
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                {t("contacts.tabs.invoices")}
                {balanceData && balanceData.totalOutstanding > 0 && (
                  <Badge variant="destructive" className="ml-2 h-5 min-w-5 px-1.5 rounded-full text-xs flex items-center justify-center">
                    {balanceData.invoiceCount}
                  </Badge>
                )}
              </TabsTrigger>
              {contact.isPartner && (
                <>
                  <TabsTrigger value="end-customers" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {t("contacts.tabs.endCustomers")}
                  </TabsTrigger>
                  <TabsTrigger value="contract" className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4" />
                    {t("contacts.tabs.contract")}
                  </TabsTrigger>
                </>
              )}
            </TabsList>

            <TabsContent value="details" className="mt-4">
              <ContactForm
                contact={contact}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <ContactTimeline contactId={contact.id} />
            </TabsContent>

            <TabsContent value="commercial" className="mt-4">
              <ContactCommercialSummary
                contactId={contact.id}
                isPartner={contact.isPartner}
              />
            </TabsContent>

            <TabsContent value="invoices" className="mt-4">
              <ContactInvoicesTab
                contactId={contact.id}
                contactName={contact.displayName}
                balanceData={balanceData}
                isLoading={isBalanceLoading}
                error={balanceError}
                refetch={refetchBalance}
              />
            </TabsContent>

            {contact.isPartner && (
              <>
                <TabsContent value="end-customers" className="mt-4">
                  <EndCustomerList contactId={contact.id} />
                </TabsContent>
                <TabsContent value="contract" className="mt-4">
                  <PartnerContractForm
                    contactId={contact.id}
                    isPartner={contact.isPartner}
                  />
                </TabsContent>
              </>
            )}
          </Tabs>
        ) : (
          <div className="mt-6">
            <ContactForm
              contact={contact}
              onSuccess={handleSuccess}
              onCancel={handleCancel}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
