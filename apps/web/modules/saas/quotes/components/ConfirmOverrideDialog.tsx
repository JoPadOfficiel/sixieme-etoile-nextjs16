"use client";

import { useState } from "react";
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
import { Checkbox } from "@ui/components/checkbox";
import { Label } from "@ui/components/label";
import { AlertTriangleIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatPrice } from "../types";

interface ConfirmOverrideDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  partnerName: string;
  currentPrice: number;
  onConfirm: () => void;
}

/**
 * ConfirmOverrideDialog Component
 * 
 * Modal dialog that appears when an admin tries to override a contract price.
 * Requires the admin to acknowledge the implications before proceeding.
 * 
 * @see Story 16.4: Prix Bloqués pour Agences Partenaires
 * @see AC4: Admin Override with Confirmation
 */
export function ConfirmOverrideDialog({
  open,
  onOpenChange,
  partnerName,
  currentPrice,
  onConfirm,
}: ConfirmOverrideDialogProps) {
  const t = useTranslations();
  const [acknowledged, setAcknowledged] = useState(false);

  const handleConfirm = () => {
    if (acknowledged) {
      onConfirm();
      onOpenChange(false);
      setAcknowledged(false); // Reset for next time
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setAcknowledged(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 size-10 rounded-full bg-amber-100 flex items-center justify-center">
              <AlertTriangleIcon className="size-5 text-amber-600" />
            </div>
            <AlertDialogTitle>
              {t("quotes.create.pricing.overrideDialog.title")}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="pt-2 space-y-3">
            <p>
              {t("quotes.create.pricing.overrideDialog.message", { partnerName })}
            </p>
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("quotes.create.pricing.overrideDialog.currentPrice")}
                </span>
                <span className="font-medium">{formatPrice(currentPrice)}</span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="py-4">
          <div className="flex items-start gap-3">
            <Checkbox
              id="acknowledge"
              checked={acknowledged}
              onCheckedChange={(checked) => setAcknowledged(checked === true)}
            />
            <Label 
              htmlFor="acknowledge" 
              className="text-sm text-muted-foreground cursor-pointer leading-relaxed"
            >
              {t("quotes.create.pricing.overrideDialog.checkbox")}
            </Label>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel}>
            {t("quotes.create.pricing.overrideDialog.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!acknowledged}
            className="bg-amber-600 hover:bg-amber-700 text-white"
          >
            {t("quotes.create.pricing.overrideDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export default ConfirmOverrideDialog;
