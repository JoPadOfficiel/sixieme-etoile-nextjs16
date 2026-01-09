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
import { User, TrendingUp, Briefcase, BarChart3 } from "lucide-react";
import { ContactForm } from "./ContactForm";
import { PartnerContractForm } from "./PartnerContractForm";
import { ContactTimeline } from "./ContactTimeline";
import { ContactCommercialSummary } from "./ContactCommercialSummary";
import { EndCustomerList } from "./EndCustomerList";
import type { Contact } from "../types";

interface ContactDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}

export function ContactDrawer({ open, onOpenChange, contact }: ContactDrawerProps) {
  const t = useTranslations();
  const [activeTab, setActiveTab] = useState("details");

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
      <SheetContent className="sm:max-w-xl overflow-y-auto">
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
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className={`grid w-full ${contact.isPartner ? "grid-cols-5" : "grid-cols-3"}`}>
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
