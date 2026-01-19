/**
 * Story 26.9: Detach Warning Modal
 *
 * A confirmation dialog that appears when the user attempts to modify
 * a sensitive field on a CALCULATED line. Explains the consequences
 * of detaching from the operational route.
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
import { AlertTriangleIcon, UnlinkIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export interface DetachWarningModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback when the modal should close */
  onClose: () => void;
  /** Callback when the user confirms the detach action */
  onConfirm: () => void;
  /** The name of the field being modified */
  fieldName?: string;
  /** The original value of the field */
  originalValue?: string;
  /** The new value being proposed */
  newValue?: string;
}

export function DetachWarningModal({
  isOpen,
  onClose,
  onConfirm,
  fieldName,
  originalValue,
  newValue,
}: DetachWarningModalProps) {
  const t = useTranslations();

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
              <AlertTriangleIcon className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            </div>
            <DialogTitle className="text-lg font-semibold">
              {t("quotes.yolo.detach.title") || "Detach from Route Logic?"}
            </DialogTitle>
          </div>
          <DialogDescription className="text-muted-foreground">
            {t("quotes.yolo.detach.description") ||
              "This action will disconnect this line from the operational route data."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Warning explanation */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30">
            <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
              {t("quotes.yolo.detach.warningTitle") || "What will happen:"}
            </h4>
            <ul className="text-sm text-amber-700 dark:text-amber-300 space-y-1">
              <li className="flex items-start gap-2">
                <UnlinkIcon className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {t("quotes.yolo.detach.bullet1") ||
                    "The line will be converted to MANUAL mode"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <UnlinkIcon className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {t("quotes.yolo.detach.bullet2") ||
                    "The link to the operational route will be removed"}
                </span>
              </li>
              <li className="flex items-start gap-2">
                <UnlinkIcon className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {t("quotes.yolo.detach.bullet3") ||
                    'The Mission Order will show "See Notes" for this line'}
                </span>
              </li>
            </ul>
          </div>

          {/* Field change details */}
          {fieldName && (
            <div className="rounded-lg border bg-muted/30 p-4">
              <h4 className="text-sm font-medium mb-2">
                {t("quotes.yolo.detach.changeDetails") || "Change Details:"}
              </h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs mb-1">
                    {t("quotes.yolo.detach.field") || "Field"}
                  </p>
                  <p className="font-medium capitalize">
                    {fieldName.replace(/([A-Z])/g, " $1").trim()}
                  </p>
                </div>
                {originalValue && (
                  <div>
                    <p className="text-muted-foreground text-xs mb-1">
                      {t("quotes.yolo.detach.from") || "From"}
                    </p>
                    <p className="font-mono text-xs truncate" title={originalValue}>
                      {originalValue}
                    </p>
                  </div>
                )}
                {newValue && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground text-xs mb-1">
                      {t("quotes.yolo.detach.to") || "To"}
                    </p>
                    <p className="font-mono text-xs truncate" title={newValue}>
                      {newValue}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            {t("common.cancel") || "Cancel"}
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            className="bg-amber-600 hover:bg-amber-700"
          >
            <UnlinkIcon className="h-4 w-4 mr-2" />
            {t("quotes.yolo.detach.confirm") || "Detach Line"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default DetachWarningModal;
