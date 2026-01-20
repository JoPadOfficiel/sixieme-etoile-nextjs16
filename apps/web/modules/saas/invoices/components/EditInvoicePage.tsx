"use client";

import { Button } from "@ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@ui/components/card";
import { Input } from "@ui/components/input";
import { Label } from "@ui/components/label";
import { Skeleton } from "@ui/components/skeleton";
import { Textarea } from "@ui/components/textarea";
import { useToast } from "@ui/hooks/use-toast";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, CalendarIcon, Loader2Icon, SaveIcon } from "lucide-react";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { useInvoiceDetail } from "../hooks/useInvoiceDetail";
import { InvoiceLinesList } from "./InvoiceLinesList";
import { AddInvoiceFeeDialog } from "./AddInvoiceFeeDialog";

interface EditInvoicePageProps {
  invoiceId: string;
}

interface EditFormData {
  dueDate: string;
  notes: string;
}

/**
 * EditInvoicePage Component
 * 
 * Edit page for DRAFT invoices.
 * Allows editing notes, due date, and invoice lines.
 * 
 * @see Story 7.1: Invoice Management
 */
export function EditInvoicePage({ invoiceId }: EditInvoicePageProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { activeOrganization } = useActiveOrganization();

  // Fetch invoice data
  const { data: invoice, isLoading, error } = useInvoiceDetail({ invoiceId });

  // Form state - initialized lazily when invoice data arrives
  const [formData, setFormData] = useState<EditFormData | null>(null);

  // Initialize form on first invoice load
  if (invoice && !formData) {
    // This pattern is acceptable - it's synchronous state initialization
    // based on props/data that just arrived
    setFormData({
      dueDate: invoice.dueDate ? invoice.dueDate.split("T")[0] : "",
      notes: invoice.notes || "",
    });
  }

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!formData) throw new Error("Form not initialized");
      const response = await apiClient.vtc.invoices[":id"].$patch({
        param: { id: invoiceId },
        json: {
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
          notes: formData.notes || null,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error((error as { message?: string }).message || "Failed to update invoice");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      toast({
        title: t("invoices.edit.success"),
      });
      router.push(`/app/${activeOrganization?.slug}/invoices/${invoiceId}`);
    },
    onError: (error) => {
      toast({
        title: t("invoices.edit.error"),
        description: error.message,
        variant: "error",
      });
    },
  });

  // Handle submit
  const handleSubmit = () => {
    updateMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return <EditInvoiceSkeleton />;
  }

  // Error state
  if (error || !invoice) {
    return (
      <div className="py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {t("invoices.notFound")}
          </h1>
        </div>
      </div>
    );
  }

  // Check if invoice is editable
  if (invoice.status !== "DRAFT") {
    return (
      <div className="py-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive">
            {t("invoices.edit.notEditable")}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t("invoices.edit.notEditableDescription")}
          </p>
          <Link
            href={`/app/${activeOrganization?.slug}/invoices/${invoiceId}`}
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline mt-4"
          >
            <ArrowLeftIcon className="size-4" />
            {t("invoices.edit.backToDetail")}
          </Link>
        </div>
      </div>
    );
  }

  // Form not initialized yet
  if (!formData) {
    return <EditInvoiceSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Link
            href={`/app/${activeOrganization?.slug}/invoices/${invoiceId}`}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeftIcon className="size-4" />
            {t("invoices.edit.backToDetail")}
          </Link>
          <h1 className="text-2xl font-bold">
            {t("invoices.edit.title")} {invoice.number}
          </h1>
          <p className="text-sm text-muted-foreground">
            {invoice.contact.displayName}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending ? (
            <Loader2Icon className="size-4 mr-2 animate-spin" />
          ) : (
            <SaveIcon className="size-4 mr-2" />
          )}
          {t("invoices.edit.save")}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Invoice Details */}
        <div className="lg:col-span-1 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {t("invoices.detail.metadata")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Due Date */}
              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  {t("invoices.columns.dueDate")}
                </Label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    id="dueDate"
                    type="date"
                    value={formData.dueDate}
                    onChange={(e) => setFormData(prev => prev ? { ...prev, dueDate: e.target.value } : null)}
                    disabled={updateMutation.isPending}
                    className="pl-9"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">{t("invoices.detail.notes")}</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => prev ? { ...prev, notes: e.target.value } : null)}
                  disabled={updateMutation.isPending}
                  rows={4}
                  placeholder={t("invoices.detail.notes")}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center and Right - Invoice Lines */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  {t("invoices.detail.lines")}
                </CardTitle>
                {/* Story 28.9: Clarify auto-save behavior */}
                <p className="text-xs text-muted-foreground mt-1">
                  {t("invoices.edit.linesAutoSave")}
                </p>
              </div>
              <AddInvoiceFeeDialog
                invoiceId={invoiceId}
                disabled={updateMutation.isPending}
              />
            </CardHeader>
            <CardContent>
              <InvoiceLinesList lines={invoice.lines} invoiceId={invoiceId} editable />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

/**
 * Skeleton loading state
 */
function EditInvoiceSkeleton() {
  return (
    <div className="py-4 space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-48" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div>
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    </div>
  );
}

export default EditInvoicePage;
