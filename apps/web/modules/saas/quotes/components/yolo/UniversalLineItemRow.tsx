/**
 * Story 26.5 & 26.6: UniversalLineItemRow Component
 *
 * A universal row component for Quote/Invoice line items.
 * Supports three types: CALCULATED, MANUAL, GROUP.
 * Uses InlineInput for click-to-edit functionality.
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
import { useCallback, useState } from "react";

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
  [key: string]: unknown;
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
  /** Callback when display data changes */
  onDisplayDataChange?: (field: keyof DisplayData, value: string | number) => void;
  /** Callback when expand/collapse is toggled */
  onToggleExpand?: () => void;
  /** Drag handle props (from dnd-kit) */
  dragHandleProps?: Record<string, unknown>;
  /** Children rows (for GROUP type) */
  children?: React.ReactNode;
}

/** Format price for display */
function formatPrice(value: number): string {
  return value.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
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

export function UniversalLineItemRow({
  id,
  type,
  displayData,
  sourceData,
  depth = 0,
  isExpanded = true,
  isDragging = false,
  isSelected = false,
  disabled = false,
  onDisplayDataChange,
  onToggleExpand,
  dragHandleProps,
  children,
}: UniversalLineItemRowProps) {
  const t = useTranslations();
  const [isHovered, setIsHovered] = useState(false);

  const handleFieldChange = useCallback(
    (field: keyof DisplayData) => (value: string) => {
      if (onDisplayDataChange) {
        // Convert to appropriate type
        if (field === "quantity" || field === "unitPrice" || field === "vatRate" || field === "total") {
          const numValue = parseFloat(value.replace(",", ".")) || 0;
          onDisplayDataChange(field, numValue);
        } else {
          onDisplayDataChange(field, value);
        }
      }
    },
    [onDisplayDataChange]
  );

  // Determine if this line is "linked" (has source data)
  const isLinked = type === "CALCULATED" && sourceData !== null && sourceData !== undefined;

  // Indentation based on depth
  const indentPadding = depth * 24;

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
            {formatPrice(displayData.total)}
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
          formatValue={(v) => formatPrice(parseFloat(v) || 0)}
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
        {formatPrice(displayData.total)}
      </div>
    </div>
  );
}

export default UniversalLineItemRow;
