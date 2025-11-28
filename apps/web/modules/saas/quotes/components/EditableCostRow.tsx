/**
 * Story 6.8: EditableCostRow Component
 * 
 * A table row component for displaying and editing cost components.
 * Supports inline editing with save/cancel functionality.
 */

"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { TableCell, TableRow } from "@ui/components/table";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { 
  CheckIcon, 
  XIcon, 
  PencilIcon, 
  Loader2Icon,
  InfoIcon,
} from "lucide-react";
import { cn } from "@ui/lib";
import { useTranslations } from "next-intl";
import { formatPrice } from "../types";

export interface EditableCostRowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  amount: number;
  originalAmount?: number;
  details: string;
  componentName: 'fuel' | 'tolls' | 'wear' | 'driver' | 'parking';
  isEditable: boolean;
  isEdited: boolean;
  isLoading?: boolean;
  onSave: (componentName: string, value: number) => Promise<void>;
  onCancel?: () => void;
}

export function EditableCostRow({
  icon: Icon,
  label,
  amount,
  originalAmount,
  details,
  componentName,
  isEditable,
  isEdited,
  isLoading = false,
  onSave,
}: EditableCostRowProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(amount.toString());
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update edit value when amount changes externally
  useEffect(() => {
    if (!isEditing) {
      setEditValue(amount.toString());
    }
  }, [amount, isEditing]);

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (!isEditable || isLoading) return;
    setEditValue(amount.toString());
    setIsEditing(true);
  }, [isEditable, isLoading, amount]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(amount.toString());
  }, [amount]);

  const handleSave = useCallback(async () => {
    const numValue = parseFloat(editValue);
    if (isNaN(numValue) || numValue < 0) {
      // Invalid value, reset
      handleCancel();
      return;
    }

    setIsSaving(true);
    try {
      await onSave(componentName, numValue);
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to save cost:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editValue, componentName, onSave, handleCancel]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only valid number input
    const value = e.target.value;
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setEditValue(value);
    }
  }, []);

  const showLoading = isLoading || isSaving;

  return (
    <TableRow className={cn(isEdited && "bg-amber-50/50")}>
      <TableCell>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span>{label}</span>
          {isEdited && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center">
                    <PencilIcon className="size-3 text-amber-600" />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs">
                    {t("quotes.create.tripTransparency.costs.editedTooltip")}
                    <br />
                    <span className="text-muted-foreground">
                      {t("quotes.create.tripTransparency.costs.originalValue")}: {formatPrice(originalAmount ?? amount)}
                    </span>
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
      
      <TableCell className="text-right">
        {isEditing ? (
          <div className="flex items-center justify-end gap-1">
            <Input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={editValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              className="w-24 h-8 text-right text-sm"
              disabled={showLoading}
            />
            <span className="text-muted-foreground text-sm">€</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleSave}
              disabled={showLoading}
            >
              {showLoading ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4 text-green-600" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={handleCancel}
              disabled={showLoading}
            >
              <XIcon className="size-4 text-red-600" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-1">
            <span className={cn(isEdited && "text-amber-700 font-medium")}>
              {formatPrice(amount)}
            </span>
            {isEditable && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity"
                onClick={handleStartEdit}
                disabled={showLoading}
              >
                {showLoading ? (
                  <Loader2Icon className="size-3 animate-spin" />
                ) : (
                  <PencilIcon className="size-3 text-muted-foreground hover:text-foreground" />
                )}
              </Button>
            )}
          </div>
        )}
      </TableCell>
      
      <TableCell className="text-right text-xs text-muted-foreground">
        <div className="flex items-center justify-end gap-1">
          <span>{details}</span>
          {isEdited && originalAmount !== undefined && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <InfoIcon className="size-3 text-amber-600 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">
                    {t("quotes.create.tripTransparency.costs.originalValue")}: {formatPrice(originalAmount)}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Read-only cost row (for non-editable scenarios)
 */
export function CostRow({
  icon: Icon,
  label,
  amount,
  details,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  amount: number;
  details: string;
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span>{label}</span>
        </div>
      </TableCell>
      <TableCell className="text-right">{formatPrice(amount)}</TableCell>
      <TableCell className="text-right text-xs text-muted-foreground">
        {details}
      </TableCell>
    </TableRow>
  );
}

export default EditableCostRow;
