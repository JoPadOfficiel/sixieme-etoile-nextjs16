"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@ui/components/dropdown-menu";
import { MoreHorizontal, Plus, Pencil, Trash } from "lucide-react";
import { apiClient } from "@shared/lib/api-client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@ui/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@ui/components/alert-dialog";

import type { EndCustomerWithCounts } from "../types";
import { EndCustomerFormDialog } from "./EndCustomerFormDialog";

interface EndCustomerListProps {
  contactId: string;
}

export function EndCustomerList({ contactId }: EndCustomerListProps) {
  const t = useTranslations("contacts.endCustomers");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<EndCustomerWithCounts | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<string | null>(null);

  // Fetch End Customers
  const { data, isLoading } = useQuery({
    queryKey: ["end-customers", contactId],
    queryFn: async () => {
      const response = await apiClient.vtc.contacts[":contactId"]["end-customers"].$get({
        param: { contactId },
        query: {}, // Empty query for default pagination
      });
      if (!response.ok) throw new Error("Failed to fetch end customers");
      const json = await response.json();
      return json.data;
    },
  });

  // Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiClient.vtc["end-customers"][":id"].$delete({
        param: { id },
      });
      if (!response.ok) throw new Error("Failed to delete end customer");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["end-customers", contactId] });
      toast({ title: t("deleteSuccess") });
      setDeleteConfirmationId(null);
    },
    onError: () => {
      toast({ title: t("deleteError"), variant: "error" });
    },
  });

  const handleEdit = (customer: EndCustomerWithCounts) => {
    setSelectedCustomer(customer);
    setIsDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id);
  };

  const handleCreate = () => {
    setSelectedCustomer(null);
    setIsDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">{t("listTitle")}</h3>
          <p className="text-sm text-muted-foreground">{t("listDescription")}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="mr-2 h-4 w-4" />
          {t("add")}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("columns.name")}</TableHead>
              <TableHead>{t("columns.email")}</TableHead>
              <TableHead>{t("columns.phone")}</TableHead>
              <TableHead>{t("columns.quotes")}</TableHead>
              <TableHead>{t("columns.invoices")}</TableHead>
              <TableHead className="w-[70px]">{t("columns.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Loading...
                </TableCell>
              </TableRow>
            ) : !data || data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {t("emptyDescription")}
                </TableCell>
              </TableRow>
            ) : (
              data.map((customer: EndCustomerWithCounts) => (
                <TableRow key={customer.id}>
                  <TableCell className="font-medium">
                    {customer.firstName} {customer.lastName}
                    {customer.difficultyScore && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        Diff: {customer.difficultyScore}/5
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{customer.email || "-"}</TableCell>
                  <TableCell>{customer.phone || "-"}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                       {customer._count.quotes}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                       {customer._count.invoices || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(customer)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("edit")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeleteConfirmationId(customer.id)}
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          {t("delete")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EndCustomerFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        contactId={contactId}
        customer={selectedCustomer}
      />

      <AlertDialog open={!!deleteConfirmationId} onOpenChange={(open) => !open && setDeleteConfirmationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmationId && handleDelete(deleteConfirmationId)}
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
