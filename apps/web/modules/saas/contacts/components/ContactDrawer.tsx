"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@ui/components/sheet";
import { useTranslations } from "next-intl";
import { ContactForm } from "./ContactForm";
import { PartnerContractForm } from "./PartnerContractForm";
import type { Contact } from "../types";

interface ContactDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Contact | null;
}

export function ContactDrawer({ open, onOpenChange, contact }: ContactDrawerProps) {
  const t = useTranslations();

  const handleSuccess = () => {
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
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
        <div className="mt-6">
          <ContactForm
            contact={contact}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
          {/* Show partner contract form for existing partner contacts */}
          {contact?.id && contact.isPartner && (
            <PartnerContractForm
              contactId={contact.id}
              isPartner={contact.isPartner}
            />
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
