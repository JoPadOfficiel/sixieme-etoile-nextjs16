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
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { useTranslations } from "next-intl";

interface ReclassificationWarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  direction: "toPartner" | "toPrivate";
  hasContract: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ReclassificationWarningDialog({
  open,
  onOpenChange,
  direction,
  hasContract,
  onConfirm,
  onCancel,
}: ReclassificationWarningDialogProps) {
  const t = useTranslations();

  const isToPrivate = direction === "toPrivate";

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {isToPrivate ? (
              <AlertTriangleIcon className="size-5 text-amber-500" />
            ) : (
              <InfoIcon className="size-5 text-blue-500" />
            )}
            {isToPrivate
              ? t("contacts.reclassification.toPrivate.title")
              : t("contacts.reclassification.toPartner.title")}
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                {isToPrivate
                  ? t("contacts.reclassification.toPrivate.description")
                  : t("contacts.reclassification.toPartner.description")}
              </p>
              <div className="rounded-lg bg-muted p-3 space-y-2">
                <p className="font-medium text-foreground">
                  {t("contacts.reclassification.thisWill")}
                </p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {isToPrivate ? (
                    <>
                      {hasContract && (
                        <li className="text-amber-600 dark:text-amber-400">
                          {t("contacts.reclassification.toPrivate.deleteContract")}
                        </li>
                      )}
                      <li>{t("contacts.reclassification.toPrivate.useDynamicPricing")}</li>
                    </>
                  ) : (
                    <>
                      <li>{t("contacts.reclassification.toPartner.enableGridPricing")}</li>
                      <li>{t("contacts.reclassification.toPartner.allowCommercialSettings")}</li>
                    </>
                  )}
                </ul>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("contacts.reclassification.existingUnaffected")}
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {t("common.confirmation.cancel")}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={isToPrivate ? "bg-amber-600 hover:bg-amber-700" : ""}
          >
            {t("contacts.reclassification.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
