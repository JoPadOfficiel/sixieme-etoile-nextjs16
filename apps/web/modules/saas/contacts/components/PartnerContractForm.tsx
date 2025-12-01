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
import { ZoneRoutesTable, PackagesTable } from "./PriceOverrideTable";

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
  // Story 12.3: Override price assignments
  zoneRouteAssignments: [],
  excursionAssignments: [],
  dispoAssignments: [],
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
    // Story 12.3: Include override prices
    zoneRouteAssignments: contract.zoneRoutes.map((r) => ({
      zoneRouteId: r.id,
      overridePrice: r.overridePrice,
    })),
    excursionAssignments: contract.excursionPackages.map((p) => ({
      excursionPackageId: p.id,
      overridePrice: p.overridePrice,
    })),
    dispoAssignments: contract.dispoPackages.map((p) => ({
      dispoPackageId: p.id,
      overridePrice: p.overridePrice,
    })),
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

  // Story 12.3: Handle zone route price change
  const handleZoneRoutePriceChange = (routeId: string, newPrice: number | null) => {
    setFormData((prev) => ({
      ...prev,
      zoneRouteAssignments: prev.zoneRouteAssignments?.map((a) =>
        a.zoneRouteId === routeId ? { ...a, overridePrice: newPrice } : a
      ) ?? [],
    }));
  };

  // Story 12.3: Handle excursion price change
  const handleExcursionPriceChange = (packageId: string, newPrice: number | null) => {
    setFormData((prev) => ({
      ...prev,
      excursionAssignments: prev.excursionAssignments?.map((a) =>
        a.excursionPackageId === packageId ? { ...a, overridePrice: newPrice } : a
      ) ?? [],
    }));
  };

  // Story 12.3: Handle dispo price change
  const handleDispoPriceChange = (packageId: string, newPrice: number | null) => {
    setFormData((prev) => ({
      ...prev,
      dispoAssignments: prev.dispoAssignments?.map((a) =>
        a.dispoPackageId === packageId ? { ...a, overridePrice: newPrice } : a
      ) ?? [],
    }));
  };

  // Story 12.3: Merge contract data with form overrides for display
  const getRoutesWithOverrides = () => {
    if (!contractResponse?.data) return [];
    return contractResponse.data.zoneRoutes.map((route) => {
      const override = formData.zoneRouteAssignments?.find((a) => a.zoneRouteId === route.id);
      return {
        ...route,
        overridePrice: override?.overridePrice ?? route.overridePrice,
      };
    });
  };

  const getExcursionsWithOverrides = () => {
    if (!contractResponse?.data) return [];
    return contractResponse.data.excursionPackages.map((pkg) => {
      const override = formData.excursionAssignments?.find((a) => a.excursionPackageId === pkg.id);
      return {
        ...pkg,
        overridePrice: override?.overridePrice ?? pkg.overridePrice,
      };
    });
  };

  const getDisposWithOverrides = () => {
    if (!contractResponse?.data) return [];
    return contractResponse.data.dispoPackages.map((pkg) => {
      const override = formData.dispoAssignments?.find((a) => a.dispoPackageId === pkg.id);
      return {
        ...pkg,
        overridePrice: override?.overridePrice ?? pkg.overridePrice,
      };
    });
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

        {/* Story 12.3: Grid Assignments with Override Prices */}
        <div className="space-y-4 pt-4 border-t">
          <div>
            <h4 className="text-sm font-medium mb-2">
              {t("contacts.contract.gridAssignmentsTitle")}
            </h4>
            <p className="text-xs text-muted-foreground mb-4">
              {t("contacts.contract.gridAssignmentsHelp")}
            </p>
          </div>

          {/* Zone Routes */}
          <ZoneRoutesTable
            routes={getRoutesWithOverrides()}
            onPriceChange={handleZoneRoutePriceChange}
            disabled={saveMutation.isPending}
          />

          {/* Excursion Packages */}
          <PackagesTable
            packages={getExcursionsWithOverrides()}
            onPriceChange={handleExcursionPriceChange}
            type="excursion"
            disabled={saveMutation.isPending}
          />

          {/* Dispo Packages */}
          <PackagesTable
            packages={getDisposWithOverrides()}
            onPriceChange={handleDispoPriceChange}
            type="dispo"
            disabled={saveMutation.isPending}
          />
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
