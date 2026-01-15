"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@ui/components/select";
import { Textarea } from "@ui/components/textarea";
import { Switch } from "@ui/components/switch";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useToast } from "@ui/hooks/use-toast";
import type { Contact } from "../types";
import { ReclassificationWarningDialog } from "./ReclassificationWarningDialog";

interface ContactFormProps {
  contact?: Contact | null;
  onSuccess: () => void;
  onCancel: () => void;
}

function getInitialFormData(contact?: Contact | null) {
  if (contact) {
    return {
      displayName: contact.displayName || "",
      type: contact.type,
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      companyName: contact.companyName || "",
      vatNumber: contact.vatNumber || "",
      siret: contact.siret || "",
      billingAddress: contact.billingAddress || "",
      isPartner: contact.isPartner,
      notes: contact.notes || "",
      // Story 17.15: Client difficulty score for Patience Tax
      difficultyScore: contact.difficultyScore ?? null,
    };
  }
  return {
    displayName: "",
    type: "INDIVIDUAL" as "INDIVIDUAL" | "BUSINESS" | "AGENCY",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    companyName: "",
    vatNumber: "",
    siret: "",
    billingAddress: "",
    isPartner: false,
    notes: "",
    // Story 17.15: Client difficulty score for Patience Tax
    difficultyScore: null as number | null,
  };
}

export function ContactForm({ contact, onSuccess, onCancel }: ContactFormProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const initialData = useMemo(() => getInitialFormData(contact), [contact]);
  const [formData, setFormData] = useState(initialData);

  // Reclassification dialog state
  const [showReclassificationDialog, setShowReclassificationDialog] = useState(false);
  const [pendingIsPartnerChange, setPendingIsPartnerChange] = useState<boolean | null>(null);

  // Check if this is a reclassification (existing contact changing isPartner)
  const isReclassification = contact && pendingIsPartnerChange !== null && pendingIsPartnerChange !== contact.isPartner;
  const reclassificationDirection = pendingIsPartnerChange ? "toPartner" : "toPrivate";
  // We don't have direct access to partnerContract here, but we can assume it exists if contact is a partner
  const hasContract = contact?.isPartner ?? false;

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await apiClient.vtc.contacts.$post({
        json: {
          ...data,
          email: data.email || null,
          phone: data.phone || null,
          companyName: data.companyName || null,
          vatNumber: data.vatNumber || null,
          siret: data.siret || null,
          billingAddress: data.billingAddress || null,
          notes: data.notes || null,
          defaultClientType: data.isPartner ? "PARTNER" : "PRIVATE",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to create contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: t("contacts.notifications.created") });
      onSuccess();
    },
    onError: () => {
      toast({ title: t("contacts.notifications.createFailed"), variant: "error" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!contact) return;
      const response = await apiClient.vtc.contacts[":id"].$patch({
        param: { id: contact.id },
        json: {
          ...data,
          email: data.email || null,
          phone: data.phone || null,
          companyName: data.companyName || null,
          vatNumber: data.vatNumber || null,
          siret: data.siret || null,
          billingAddress: data.billingAddress || null,
          notes: data.notes || null,
          defaultClientType: data.isPartner ? "PARTNER" : "PRIVATE",
        },
      });
      if (!response.ok) {
        throw new Error("Failed to update contact");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
      toast({ title: t("contacts.notifications.updated") });
      onSuccess();
    },
    onError: () => {
      toast({ title: t("contacts.notifications.updateFailed"), variant: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (contact) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  const updateField = <K extends keyof typeof formData>(
    field: K,
    value: (typeof formData)[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Contact Type */}
      <div className="space-y-2">
        <Label htmlFor="type">{t("contacts.form.type")}</Label>
        <Select
          value={formData.type}
          onValueChange={(value) => updateField("type", value as typeof formData.type)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INDIVIDUAL">{t("contacts.types.individual")}</SelectItem>
            <SelectItem value="BUSINESS">{t("contacts.types.business")}</SelectItem>
            <SelectItem value="AGENCY">{t("contacts.types.agency")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Display Name */}
      <div className="space-y-2">
        <Label htmlFor="displayName">{t("contacts.form.displayName")} *</Label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => updateField("displayName", e.target.value)}
          required
        />
      </div>

      {/* Partner Toggle */}
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="space-y-0.5">
          <Label htmlFor="isPartner">{t("contacts.form.isPartner")}</Label>
          <p className="text-sm text-muted-foreground">
            {t("contacts.form.isPartnerDescription")}
          </p>
        </div>
        <Switch
          id="isPartner"
          checked={formData.isPartner}
          onCheckedChange={(checked: boolean) => {
            // If editing an existing contact and changing isPartner, show warning dialog
            if (contact && checked !== contact.isPartner) {
              setPendingIsPartnerChange(checked);
              setShowReclassificationDialog(true);
            } else {
              updateField("isPartner", checked);
            }
          }}
        />
      </div>

      {/* Reclassification Warning Dialog */}
      {isReclassification && (
        <ReclassificationWarningDialog
          open={showReclassificationDialog}
          onOpenChange={setShowReclassificationDialog}
          direction={reclassificationDirection}
          hasContract={hasContract}
          onConfirm={() => {
            if (pendingIsPartnerChange !== null) {
              updateField("isPartner", pendingIsPartnerChange);
            }
            setShowReclassificationDialog(false);
            setPendingIsPartnerChange(null);
          }}
          onCancel={() => {
            setShowReclassificationDialog(false);
            setPendingIsPartnerChange(null);
          }}
        />
      )}

      {/* Person Fields */}
      {formData.type === "INDIVIDUAL" && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t("contacts.form.personInfo")}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">{t("contacts.form.firstName")}</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => updateField("firstName", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">{t("contacts.form.lastName")}</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => updateField("lastName", e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="billingAddress">{t("contacts.form.billingAddress")}</Label>
            <Textarea
              id="billingAddress"
              value={formData.billingAddress}
              onChange={(e) => updateField("billingAddress", e.target.value)}
              rows={3}
            />
          </div>
        </div>
      )}

      {/* Company Fields */}
      {(formData.type === "BUSINESS" || formData.type === "AGENCY") && (
        <div className="space-y-4">
          <h3 className="text-sm font-medium">{t("contacts.form.companyInfo")}</h3>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">{t("contacts.form.companyName")}</Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) => updateField("companyName", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="vatNumber">{t("contacts.form.vatNumber")}</Label>
                <Input
                  id="vatNumber"
                  value={formData.vatNumber}
                  onChange={(e) => updateField("vatNumber", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siret">{t("contacts.form.siret")}</Label>
                <Input
                  id="siret"
                  value={formData.siret}
                  onChange={(e) => updateField("siret", e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="billingAddress">{t("contacts.form.billingAddress")}</Label>
              <Textarea
                id="billingAddress"
                value={formData.billingAddress}
                onChange={(e) => updateField("billingAddress", e.target.value)}
                rows={3}
              />
            </div>
          </div>
        </div>
      )}

      {/* Contact Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{t("contacts.form.contactInfo")}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("contacts.form.email")}</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t("contacts.form.phone")}</Label>
            <Input
              id="phone"
              type="tel"
              value={formData.phone}
              onChange={(e) => updateField("phone", e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">{t("contacts.form.notes")}</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => updateField("notes", e.target.value)}
          rows={3}
        />
      </div>

      {/* Story 17.15: Client Difficulty Score (Patience Tax) */}
      <div className="space-y-2">
        <Label htmlFor="difficultyScore">{t("contacts.form.difficultyScore")}</Label>
        <Select
          value={formData.difficultyScore?.toString() ?? "none"}
          onValueChange={(value) => updateField("difficultyScore", value === "none" ? null : parseInt(value, 10))}
        >
          <SelectTrigger id="difficultyScore">
            <SelectValue placeholder={t("contacts.form.difficultyScorePlaceholder")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">{t("contacts.form.difficultyScoreNone")}</SelectItem>
            <SelectItem value="1">1 - {t("contacts.form.difficultyScore1")}</SelectItem>
            <SelectItem value="2">2 - {t("contacts.form.difficultyScore2")}</SelectItem>
            <SelectItem value="3">3 - {t("contacts.form.difficultyScore3")}</SelectItem>
            <SelectItem value="4">4 - {t("contacts.form.difficultyScore4")}</SelectItem>
            <SelectItem value="5">5 - {t("contacts.form.difficultyScore5")}</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t("contacts.form.difficultyScoreHelp")}
        </p>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isPending}>
          {t("common.confirmation.cancel")}
        </Button>
        <Button type="submit" disabled={isPending || !formData.displayName}>
          {isPending && <Loader2Icon className="size-4 mr-2 animate-spin" />}
          {contact ? t("contacts.form.update") : t("contacts.form.create")}
        </Button>
      </div>
    </form>
  );
}
