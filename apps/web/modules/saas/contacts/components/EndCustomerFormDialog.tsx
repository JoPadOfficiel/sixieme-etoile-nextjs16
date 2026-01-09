"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import { useToast } from "@ui/hooks/use-toast";

import { Button } from "@ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@ui/components/form";
import { Input } from "@ui/components/input";
import { Textarea } from "@ui/components/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@ui/components/select";

import type { EndCustomerWithCounts } from "../types";

// Schema (matching API validation)
const endCustomerSchema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  difficultyScore: z.coerce.number().min(1).max(5).nullable().optional(),
  notes: z.string().optional(),
});

type EndCustomerFormValues = z.infer<typeof endCustomerSchema>;

interface EndCustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string;
  customer?: EndCustomerWithCounts | null;
}

export function EndCustomerFormDialog({
  open,
  onOpenChange,
  contactId,
  customer,
}: EndCustomerFormDialogProps) {
  const t = useTranslations("contacts.endCustomers");
  const tForm = useTranslations("contacts.form"); // Reuse existing form translations
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<EndCustomerFormValues>({
    resolver: zodResolver(endCustomerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      difficultyScore: null,
      notes: "",
    },
  });

  // Reset form when dialog opens/closes or customer changes
  useEffect(() => {
    if (open) {
      if (customer) {
        form.reset({
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email || "",
          phone: customer.phone || "",
          difficultyScore: customer.difficultyScore,
          notes: customer.notes || "",
        });
      } else {
        form.reset({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          difficultyScore: null, // Reset to null explicitly
          notes: "",
        });
      }
    }
  }, [open, customer, form]);

  const createMutation = useMutation({
    mutationFn: async (values: EndCustomerFormValues) => {
      const response = await apiClient.vtc.contacts[":contactId"]["end-customers"].$post({
        param: { contactId },
        json: {
            ...values,
            email: values.email || undefined, // Transform empty string to undefined if needed, or backend handles it
            difficultyScore: values.difficultyScore ? Number(values.difficultyScore) : null
        },
      });
      if (!response.ok) throw new Error("Failed to create end customer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["end-customers", contactId] });
      toast({ title: t("createSuccess") });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: EndCustomerFormValues) => {
      if (!customer) return;
      const response = await apiClient.vtc["end-customers"][":id"].$patch({
        param: { id: customer.id },
        json: {
            ...values,
            email: values.email || undefined,
            difficultyScore: values.difficultyScore ? Number(values.difficultyScore) : null
        },
      });
      if (!response.ok) throw new Error("Failed to update end customer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["end-customers", contactId] });
      toast({ title: t("updateSuccess") });
      onOpenChange(false);
    },
  });

  const onSubmit = (values: EndCustomerFormValues) => {
    if (customer) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{customer ? t("edit") : t("add")}</DialogTitle>
          <DialogDescription>
            {t("listDescription")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("firstName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{tForm("lastName")}</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForm("email")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="email" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForm("phone")}</FormLabel>
                  <FormControl>
                    <Input {...field} type="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="difficultyScore"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForm("difficultyScore")}</FormLabel>
                  <Select
                    onValueChange={(value) => field.onChange(value === "none" ? null : value)}
                    value={field.value?.toString() ?? "none"}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={tForm("difficultyScorePlaceholder")} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">{tForm("difficultyScoreNone")}</SelectItem>
                      <SelectItem value="1">1 - {tForm("difficultyScore1")}</SelectItem>
                      <SelectItem value="2">2 - {tForm("difficultyScore2")}</SelectItem>
                      <SelectItem value="3">3 - {tForm("difficultyScore3")}</SelectItem>
                      <SelectItem value="4">4 - {tForm("difficultyScore4")}</SelectItem>
                      <SelectItem value="5">5 - {tForm("difficultyScore5")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {tForm("difficultyScoreHelp")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{tForm("notes")}</FormLabel>
                  <FormControl>
                    <Textarea {...field} rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
