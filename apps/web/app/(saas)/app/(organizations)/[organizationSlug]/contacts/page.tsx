"use client";

import { ContactsTable, ContactDrawer } from "@saas/contacts/components";
import type { ContactWithCounts } from "@saas/contacts/types";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function ContactsPage() {
  const t = useTranslations();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactWithCounts | null>(null);

  const handleAddContact = () => {
    setSelectedContact(null);
    setDrawerOpen(true);
  };

  const handleEditContact = (contact: ContactWithCounts) => {
    setSelectedContact(contact);
    setDrawerOpen(true);
  };

  return (
    <div className="container py-8">
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
        onOpenChange={setDrawerOpen}
        contact={selectedContact}
      />
    </div>
  );
}
