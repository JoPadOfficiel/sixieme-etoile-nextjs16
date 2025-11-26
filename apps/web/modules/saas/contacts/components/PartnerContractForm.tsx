"use client";

import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Textarea } from "@ui/components/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@ui/components/select";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2Icon, SaveIcon, BuildingIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useMemo } from "react";
import { useToast } from "@ui/hooks/use-toast";
import type { PartnerContract, PartnerContractFormData, PaymentTerms } from "../types";

interface PartnerContractFormProps {
  contactId: string;
  isPartner: boolean;
}

const PAYMENT_TERMS_OPTIONS: { value: PaymentTerms; label: string }[] = [
  { value: "IMMEDIATE", label: "Immediate" },
  { value: "DAYS_15", label: "15 days" },
  { value: "DAYS_30", label: "30 days" },
  { value: "DAYS_45", label: "45 days" },
  { value: "DAYS_60", label: "60 days" },
];

const DEFAULT_FORM_DATA: PartnerContractFormData = {
  billingAddress: "",
  paymentTerms: "DAYS_30",
  commissionPercent: 0,
  notes: "",
  zoneRouteIds: [],
  excursionPackageIds: [],
  dispoPackageIds: [],
};

function contractToFormData(contract: PartnerContract | null): PartnerContractFormData {
  if (!contract) return DEFAULT_FORM_DATA;
  return {
    billingAddress: contract.billingAddress || "",
    paymentTerms: contract.paymentTerms,
    commissionPercent: parseFloat(contract.commissionPercent),
    notes: contract.notes || "",
    zoneRouteIds: contract.zoneRoutes.map((r) => r.id),
    excursionPackageIds: contract.excursionPackages.map((p) => p.id),
    dispoPackageIds: contract.dispoPackages.map((p) => p.id),
  };
}

export function PartnerContractForm({ contactId, isPartner }: PartnerContractFormProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing contract
  const { data: contractResponse, isLoading } = useQuery({
    queryKey: ["partnerContract", contactId],
    queryFn: async () => {
      const response = await apiClient.vtc.contacts[":contactId"].contract.$get({
        param: { contactId },
      });
      if (!response.ok) {
        throw new Error("Failed to fetch contract");
      }
      const json = await response.json() as { data: PartnerContract | null; isPartner: boolean };
      return json;
    },
    enabled: isPartner,
  });

  // Derive initial form data from contract response
  const initialFormData = useMemo(
    () => contractToFormData(contractResponse?.data ?? null),
    [contractResponse?.data]
  );

  const [formData, setFormData] = useState<PartnerContractFormData>(initialFormData);

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: PartnerContractFormData) => {
      const response = await apiClient.vtc.contacts[":contactId"].contract.$put({
        param: { contactId },
        json: data,
      });
      if (!response.ok) {
        throw new Error("Failed to save contract");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partnerContract", contactId] });
      toast({ title: t("contacts.contract.saved") });
    },
    onError: () => {
      toast({ title: t("contacts.contract.saveFailed"), variant: "error" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (!isPartner) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2Icon className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 border-t pt-6 mt-6">
      <div className="flex items-center gap-2">
        <BuildingIcon className="size-5 text-primary" />
        <h3 className="text-lg font-semibold">{t("contacts.contract.title")}</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("contacts.contract.description")}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Billing Address */}
        <div className="space-y-2">
          <Label htmlFor="billingAddress">{t("contacts.contract.billingAddress")}</Label>
          <Textarea
            id="billingAddress"
            value={formData.billingAddress || ""}
            onChange={(e) => setFormData({ ...formData, billingAddress: e.target.value })}
            placeholder={t("contacts.contract.billingAddressPlaceholder")}
            rows={2}
          />
        </div>

        {/* Payment Terms */}
        <div className="space-y-2">
          <Label htmlFor="paymentTerms">{t("contacts.contract.paymentTerms")}</Label>
          <Select
            value={formData.paymentTerms}
            onValueChange={(value: PaymentTerms) => setFormData({ ...formData, paymentTerms: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("contacts.contract.selectPaymentTerms")} />
            </SelectTrigger>
            <SelectContent>
              {PAYMENT_TERMS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Commission Percent */}
        <div className="space-y-2">
          <Label htmlFor="commissionPercent">{t("contacts.contract.commissionPercent")}</Label>
          <div className="flex items-center gap-2">
            <Input
              id="commissionPercent"
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={formData.commissionPercent}
              onChange={(e) => setFormData({ ...formData, commissionPercent: parseFloat(e.target.value) || 0 })}
              className="max-w-[120px]"
            />
            <span className="text-muted-foreground">%</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("contacts.contract.commissionHelp")}
          </p>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label htmlFor="contractNotes">{t("contacts.contract.notes")}</Label>
          <Textarea
            id="contractNotes"
            value={formData.notes || ""}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder={t("contacts.contract.notesPlaceholder")}
            rows={3}
          />
        </div>

        {/* Grid Assignments Info */}
        <div className="rounded-lg bg-muted/50 p-4">
          <p className="text-sm text-muted-foreground">
            {t("contacts.contract.gridAssignmentsInfo")}
          </p>
          {contractResponse?.data && (
            <div className="mt-2 space-y-1 text-sm">
              <p>• {t("contacts.contract.zoneRoutes")}: {contractResponse.data.zoneRoutes.length}</p>
              <p>• {t("contacts.contract.excursionPackages")}: {contractResponse.data.excursionPackages.length}</p>
              <p>• {t("contacts.contract.dispoPackages")}: {contractResponse.data.dispoPackages.length}</p>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending ? (
            <Loader2Icon className="size-4 animate-spin mr-2" />
          ) : (
            <SaveIcon className="size-4 mr-2" />
          )}
          {t("contacts.contract.save")}
        </Button>
      </form>
    </div>
  );
}
