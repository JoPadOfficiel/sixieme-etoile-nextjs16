/**
 * Story 26.5, 26.6 & 26.9: UniversalLineItemRow Component
 *
 * A universal row component for Quote/Invoice line items.
 * Supports three types: CALCULATED, MANUAL, GROUP.
 * Uses InlineInput for click-to-edit functionality.
 * Includes detach logic to protect operational data integrity.
 */

"use client";

import { cn } from "@ui/lib";
import { InlineInput } from "@ui/components/inline-input";
import {
  LinkIcon,
  UnlinkIcon,
  GripVerticalIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ui/components/tooltip";
import { useTranslations } from "next-intl";
import { useCallback, useState, useMemo, useRef } from "react";
import { useToast } from "@ui/hooks/use-toast";
import { DetachWarningModal } from "./DetachWarningModal";
import {
  isSignificantLabelChange,
  isSensitiveField,
  getOriginalLabelFromSource,
} from "./detach-utils";

/** Line item type enum matching Prisma schema */
export type LineItemType = "CALCULATED" | "MANUAL" | "GROUP";

/** Display data structure for line items */
export interface DisplayData {
  label: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  vatRate: number;
  total: number;
}

/** Source data structure (operational truth) */
export interface SourceData {
  origin?: string;
  destination?: string;
  distance?: number;
  duration?: number;
  basePrice?: number;
  internalCost?: number;
  pickupAt?: string;
  dropoffAt?: string;
  [key: string]: unknown;
}

/** Pending change state for detach confirmation */
interface PendingDetachChange {
  fieldName: string;
  originalValue: string;
  newValue: string;
}

/** Props for UniversalLineItemRow */
export interface UniversalLineItemRowProps {
  /** Unique identifier */
  id: string;
  /** Line type: CALCULATED, MANUAL, or GROUP */
  type: LineItemType;
  /** Display data (editable by user) */
  displayData: DisplayData;
  /** Source data (operational truth, readonly) */
  sourceData?: SourceData | null;
  /** Nesting depth (0 = root, 1 = inside group) */
  depth?: number;
  /** Whether the line is expanded (for GROUP type) */
  isExpanded?: boolean;
  /** Whether the row is being dragged */
  isDragging?: boolean;
  /** Whether the row is selected */
  isSelected?: boolean;
  /** Whether editing is disabled */
  disabled?: boolean;
  /** Currency code for price formatting */
  currency?: string;
  /** Callback when display data changes */
  onDisplayDataChange?: (field: keyof DisplayData, value: string | number) => void;
  /** Callback when expand/collapse is toggled */
  onToggleExpand?: () => void;
  /** Callback when the line should be detached from operational data */
  onDetach?: () => void;
  /** Callback to insert a new line (for slash commands) */
  onInsert?: (type: LineItemType) => void;
  /** Drag handle props (from dnd-kit) */
  dragHandleProps?: Record<string, unknown>;
  /** Children rows (for GROUP type) */
  children?: React.ReactNode;
}

/** Format price for display */
function formatPrice(value: number, currency = "EUR"): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  });
}

/** Format number for display */
function formatNumber(value: number): string {
  return value.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

/** Indentation size in pixels per depth level */
const INDENT_SIZE_PX = 24;

export function UniversalLineItemRow({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  id: _id,
  type,
  displayData,
  sourceData,
  depth = 0,
  isExpanded = true,
  isDragging = false,
  isSelected = false,
  disabled = false,
  currency = "EUR",
  onDisplayDataChange,
  onToggleExpand,
  onDetach,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onInsert: _onInsert,
  dragHandleProps,
  children,
}: UniversalLineItemRowProps) {
  const t = useTranslations();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [isDetachModalOpen, setIsDetachModalOpen] = useState(false);
  const [pendingChange, setPendingChange] = useState<PendingDetachChange | null>(null);
  
  // Track the original label from sourceData for significant change detection
  const originalLabelFromSource = useMemo(
    () => getOriginalLabelFromSource(sourceData as Record<string, unknown> | null),
    [sourceData]
  );

  // Track if we've already shown the label warning this session
  const labelWarningShownRef = useRef(false);

  // Determine if this line is "linked" (has source data)
  const isLinked = type === "CALCULATED" && sourceData !== null && sourceData !== undefined;

  /**
   * Handles field changes with detach logic for CALCULATED lines
   */
  const handleFieldChange = useCallback(
    (field: keyof DisplayData) => (value: string) => {
      // For CALCULATED lines, check if this is a sensitive change
      if (isLinked && onDetach) {
        // Check for sensitive field changes that require confirmation
        if (isSensitiveField(field)) {
          const originalValue = String(displayData[field] ?? "");
          const newValue = value;
          
          if (originalValue !== newValue) {
            // Store pending change and show modal
            setPendingChange({
              fieldName: field,
              originalValue,
              newValue,
            });
            setIsDetachModalOpen(true);
            return; // Don't apply change yet
          }
        }

        // Check for significant label changes (warning only, no detach)
        if (field === "label" && !labelWarningShownRef.current) {
          if (isSignificantLabelChange(originalLabelFromSource || displayData.label, value)) {
            toast({
              title: t("quotes.yolo.detach.labelWarningTitle") || "Label Modified",
              description: t("quotes.yolo.detach.labelWarning") ||
                "You've significantly modified the label. The operational data remains unchanged.",
              variant: "default",
            });
            labelWarningShownRef.current = true;
          }
        }
      }

      // Apply the change normally
      if (onDisplayDataChange) {
        if (field === "quantity" || field === "unitPrice" || field === "vatRate" || field === "total") {
          const numValue = parseFloat(value.replace(",", ".")) || 0;
          const sanitizedValue = Math.max(0, numValue);
          onDisplayDataChange(field, sanitizedValue);
        } else {
          onDisplayDataChange(field, value);
        }
      }
    },
    [onDisplayDataChange, isLinked, onDetach, displayData, originalLabelFromSource, t, toast]
  );

  /**
   * Handle detach confirmation from modal
   */
  const handleDetachConfirm = useCallback(() => {
    if (onDetach) {
      onDetach();
      toast({
        title: t("quotes.yolo.detach.successTitle") || "Line Detached",
        description: t("quotes.yolo.detach.success") || "Line detached from operational route",
        variant: "default",
      });
    }

    // Apply the pending change after detach
    if (pendingChange && onDisplayDataChange) {
      const { fieldName, newValue } = pendingChange;
      if (fieldName === "quantity" || fieldName === "unitPrice" || fieldName === "vatRate" || fieldName === "total") {
        const numValue = parseFloat(newValue.replace(",", ".")) || 0;
        onDisplayDataChange(fieldName as keyof DisplayData, Math.max(0, numValue));
      } else {
        onDisplayDataChange(fieldName as keyof DisplayData, newValue);
      }
    }

    setPendingChange(null);
  }, [onDetach, pendingChange, onDisplayDataChange, t, toast]);

  /**
   * Handle cancel from detach modal
   */
  const handleDetachCancel = useCallback(() => {
    setPendingChange(null);
    setIsDetachModalOpen(false);
  }, []);

  // Indentation based on depth
  const indentPadding = depth * INDENT_SIZE_PX;

  // Row background based on state
  const rowBackground = cn(
    "group flex items-center gap-2 px-2 py-1.5 border-b border-border/50 transition-colors",
    isDragging && "opacity-50 bg-muted",
    isSelected && "bg-primary/5 border-primary/20",
    isHovered && !isDragging && "bg-muted/30",
    type === "GROUP" && "bg-muted/20 font-medium"
  );

  // Render GROUP type (container/header)
  if (type === "GROUP") {
    return (
      <div>
        <div
          className={rowBackground}
          style={{ paddingLeft: indentPadding + 8 }}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Drag handle */}
          <div
            {...dragHandleProps}
            className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <GripVerticalIcon className="size-4 text-muted-foreground" />
          </div>

          {/* Expand/Collapse toggle */}
          <button
            type="button"
            onClick={onToggleExpand}
            className="p-0.5 hover:bg-muted rounded"
          >
            {isExpanded ? (
              <ChevronDownIcon className="size-4 text-muted-foreground" />
            ) : (
              <ChevronRightIcon className="size-4 text-muted-foreground" />
            )}
          </button>

          {/* Group label */}
          <div className="flex-1">
            <InlineInput
              value={displayData.label}
              onChange={handleFieldChange("label")}
              placeholder={t("quotes.yolo.groupPlaceholder") || "Group name..."}
              disabled={disabled}
              fontWeight="semibold"
              className="text-sm"
            />
          </div>

          {/* Group total */}
          <div className="w-24 text-right text-sm font-medium">
            {formatPrice(displayData.total, currency)}
          </div>
        </div>

        {/* Children (nested lines) */}
        {isExpanded && children && (
          <div className="border-l-2 border-muted ml-4">{children}</div>
        )}
      </div>
    );
  }

  // Render CALCULATED or MANUAL type
  return (
    <>
      <div
        className={rowBackground}
        style={{ paddingLeft: indentPadding + 8 }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Drag handle */}
        <div
          {...dragHandleProps}
          className="cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <GripVerticalIcon className="size-4 text-muted-foreground" />
        </div>

        {/* Link indicator */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-5">
                {isLinked ? (
                  <LinkIcon className="size-4 text-green-600" />
                ) : type === "MANUAL" ? (
                  <UnlinkIcon className="size-4 text-muted-foreground" />
                ) : null}
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              {isLinked
                ? t("quotes.yolo.linkedToSource") || "Linked to pricing engine"
                : t("quotes.yolo.manualLine") || "Manual line (no source data)"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Label / Description */}
        <div className="flex-1 min-w-[200px]">
          <InlineInput
            value={displayData.label}
            onChange={handleFieldChange("label")}
            placeholder={t("quotes.yolo.labelPlaceholder") || "Description..."}
            disabled={disabled}
            className="text-sm"
          />
        </div>

        {/* Quantity */}
        <div className="w-16">
          <InlineInput
            value={formatNumber(displayData.quantity)}
            onChange={handleFieldChange("quantity")}
            type="number"
            disabled={disabled}
            align="right"
            className="text-sm"
            minWidth="2rem"
          />
        </div>

        {/* Unit Price */}
        <div className="w-24">
          <InlineInput
            value={displayData.unitPrice.toFixed(2)}
            onChange={handleFieldChange("unitPrice")}
            type="number"
            disabled={disabled}
            align="right"
            className="text-sm"
            formatValue={(v) => formatPrice(parseFloat(v) || 0, currency)}
          />
        </div>

        {/* VAT Rate */}
        <div className="w-16">
          <InlineInput
            value={displayData.vatRate.toString()}
            onChange={handleFieldChange("vatRate")}
            type="number"
            disabled={disabled}
            align="right"
            className="text-sm"
            formatValue={(v) => `${v}%`}
          />
        </div>

        {/* Total (read-only, calculated) */}
        <div className="w-24 text-right text-sm font-medium">
          {formatPrice(displayData.total, currency)}
        </div>
      </div>

      {/* Detach Warning Modal */}
      <DetachWarningModal
        isOpen={isDetachModalOpen}
        onClose={handleDetachCancel}
        onConfirm={handleDetachConfirm}
        fieldName={pendingChange?.fieldName}
        originalValue={pendingChange?.originalValue}
        newValue={pendingChange?.newValue}
      />
    </>
  );
}

export default UniversalLineItemRow;
