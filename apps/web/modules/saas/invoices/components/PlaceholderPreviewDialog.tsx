/**
 * PlaceholderPreviewDialog Component
 * Story 28.10: Execution Feedback Loop (Placeholders)
 *
 * Displays a preview of invoice lines with placeholders replaced by actual mission data.
 * Allows finalizing (permanently replacing) placeholders.
 */

"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@ui/components/dialog";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@ui/components/table";
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
import { useToast } from "@ui/hooks/use-toast";
import { apiClient } from "@shared/lib/api-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { CheckCircleIcon, Loader2Icon, SparklesIcon } from "lucide-react";
import type { InvoiceLine } from "../types";
import type { MissionContext } from "../utils/placeholders";
import {
  replacePlaceholders,
  hasPlaceholders,
  findPlaceholders,
} from "../utils/placeholders";

interface PlaceholderPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceId: string;
  lines: InvoiceLine[];
  missionContext: MissionContext | null;
}

export function PlaceholderPreviewDialog({
  open,
  onOpenChange,
  invoiceId,
  lines,
  missionContext,
}: PlaceholderPreviewDialogProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Find lines with placeholders
  const linesWithPlaceholders = lines.filter((line) =>
    hasPlaceholders(line.description)
  );

  // Finalize mutation
  const finalizeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.vtc.invoices[":id"][
        "finalize-placeholders"
      ].$post({
        param: { id: invoiceId },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(
          (error as { message?: string }).message ||
            "Failed to finalize placeholders"
        );
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["invoice", invoiceId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      toast({
        title: t("invoices.placeholders.finalizeSuccess"),
        description: t("invoices.placeholders.finalizeSuccessDescription", {
          count: (data as { updatedLinesCount: number }).updatedLinesCount,
        }),
      });
      setConfirmOpen(false);
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: t("invoices.placeholders.finalizeError"),
        description: error.message,
        variant: "error",
      });
    },
  });

  const handleFinalize = () => {
    setConfirmOpen(true);
  };

  const handleConfirmFinalize = () => {
    finalizeMutation.mutate();
  };

  // No placeholders found
  if (linesWithPlaceholders.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("invoices.placeholders.previewTitle")}</DialogTitle>
            <DialogDescription>
              {t("invoices.placeholders.noPlaceholders")}
            </DialogDescription>
          </DialogHeader>
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircleIcon className="size-12 mx-auto mb-4 text-green-500" />
            <p>{t("invoices.placeholders.allResolved")}</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // No mission context available
  if (!missionContext) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("invoices.placeholders.previewTitle")}</DialogTitle>
            <DialogDescription>
              {t("invoices.placeholders.noMissionContext")}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.close")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="size-5" />
              {t("invoices.placeholders.previewTitle")}
            </DialogTitle>
            <DialogDescription>
              {t("invoices.placeholders.previewDescription")}
            </DialogDescription>
          </DialogHeader>

          {/* Mission Context Summary */}
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="text-sm font-medium">
              {t("invoices.placeholders.missionData")}
            </h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">
                  {"{{driver}}"} →{" "}
                </span>
                <span className="font-medium">
                  {missionContext.driverName || "[Non assigné]"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {"{{plate}}"} →{" "}
                </span>
                <span className="font-medium">
                  {missionContext.vehiclePlate || "[Non assigné]"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {"{{start}}"} →{" "}
                </span>
                <span className="font-medium">
                  {missionContext.startAt
                    ? new Date(missionContext.startAt).toLocaleString("fr-FR")
                    : "[Non assigné]"}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">
                  {"{{end}}"} →{" "}
                </span>
                <span className="font-medium">
                  {missionContext.endAt
                    ? new Date(missionContext.endAt).toLocaleString("fr-FR")
                    : "[Non assigné]"}
                </span>
              </div>
            </div>
          </div>

          {/* Preview Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("invoices.placeholders.original")}</TableHead>
                <TableHead>{t("invoices.placeholders.preview")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {linesWithPlaceholders.map((line) => {
                const placeholders = findPlaceholders(line.description);
                const previewText = replacePlaceholders(
                  line.description,
                  missionContext
                );

                return (
                  <TableRow key={line.id}>
                    <TableCell className="align-top">
                      <div className="space-y-1">
                        <p className="text-sm">{line.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {placeholders.map((token) => (
                            <Badge
                              key={token}
                              variant="secondary"
                              className="text-xs"
                            >
                              {token}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="align-top">
                      <p className="text-sm font-medium text-green-700 dark:text-green-400">
                        {previewText}
                      </p>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleFinalize}>
              <CheckCircleIcon className="size-4 mr-1" />
              {t("invoices.placeholders.finalize")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t("invoices.placeholders.confirmTitle")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t("invoices.placeholders.confirmDescription", {
                count: linesWithPlaceholders.length,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={finalizeMutation.isPending}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmFinalize}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending ? (
                <Loader2Icon className="size-4 mr-1 animate-spin" />
              ) : (
                <CheckCircleIcon className="size-4 mr-1" />
              )}
              {t("invoices.placeholders.confirmAction")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default PlaceholderPreviewDialog;
