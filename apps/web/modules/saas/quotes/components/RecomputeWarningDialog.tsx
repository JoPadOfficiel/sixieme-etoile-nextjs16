/**
 * Story 6.8: RecomputeWarningDialog Component
 * 
 * Warning dialog shown when user attempts to recompute pricing
 * on a quote with manual cost overrides.
 */

"use client";

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
import { AlertTriangleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { CostOverrides } from "../types";
import { formatPrice } from "../types";

interface RecomputeWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  costOverrides: CostOverrides | null;
  onConfirm: () => void;
  onCancel: () => void;
}

export function RecomputeWarningDialog({
  open,
  onOpenChange,
  costOverrides,
  onConfirm,
  onCancel,
}: RecomputeWarningDialogProps) {
  const t = useTranslations();

  if (!costOverrides?.hasManualEdits) {
    return null;
  }

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onCancel();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangleIcon className="size-5 text-amber-600" />
            {t("quotes.create.recomputeWarning.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-3">
              <p>{t("quotes.create.recomputeWarning.description")}</p>
              
              {/* List of overrides */}
              <div className="bg-muted/50 rounded-md p-3 space-y-1">
                {costOverrides.overrides.map((override) => (
                  <div 
                    key={override.componentName}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="capitalize">{override.componentName}</span>
                    <span>
                      <span className="text-muted-foreground line-through mr-2">
                        {formatPrice(override.originalValue)}
                      </span>
                      <span className="font-medium text-amber-700">
                        {formatPrice(override.editedValue)}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              
              <p className="text-sm text-muted-foreground">
                {t("quotes.create.recomputeWarning.warning")}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {t("common.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            {t("quotes.create.recomputeWarning.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default RecomputeWarningDialog;
