"use client";

import React, { useState, useEffect, useRef } from "react";
import { Link, AlignLeft, ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@ui/lib"; // Assuming standard shadcn utils
import { Input } from "@ui/components/input";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@ui/components/tooltip";

// Define strict types matching the Zod schema locally to ensure self-containment 
// while waiting for package publication
export type BlockType = "CALCULATED" | "MANUAL" | "GROUP";

export interface QuoteLine {
  id?: string;
  tempId?: string;
  type: BlockType;
  label: string;
  description?: string | null;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  vatRate?: number;
  sourceData?: Record<string, unknown>; // JSON
  displayData?: Record<string, unknown>; // JSON
  parentId?: string | null;
  sortOrder?: number;
  [key: string]: unknown;
}

interface UniversalLineItemRowProps {
  line: QuoteLine;
  depth: number;
  index: number;
  onUpdate: (id: string, data: Partial<QuoteLine>) => void;
  onToggleExpand?: (id: string) => void;
  isExpanded?: boolean;
  currency?: string;
  readOnly?: boolean;
}

export function UniversalLineItemRow({
  line,
  depth,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  index,
  onUpdate,
  onToggleExpand,
  isExpanded = true,
  currency = "EUR",
  readOnly = false,
}: UniversalLineItemRowProps) {
  const [isEditingLabel, setIsEditingLabel] = useState(false);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingLabel && labelInputRef.current) {
      labelInputRef.current.focus();
    }
  }, [isEditingLabel]);

  // Update handler wrapper
  const handleUpdate = (field: keyof QuoteLine, value: unknown) => {
    const id = line.id || line.tempId;
    if (id) {
      onUpdate(id, { [field]: value });
    }
  };

  /**
   * Render different icons based on block type
   */
  const renderIcon = () => {
    switch (line.type) {
      case "CALCULATED":
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex h-6 w-6 items-center justify-center rounded-sm bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                  <Link className="h-3.5 w-3.5" />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Linked to Pricing Engine</p>
                {line.sourceData && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    {String(line.sourceData.pickupAddress || '').split(',')[0]} → {String(line.sourceData.dropoffAddress || '').split(',')[0]}
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      case "GROUP":
        return (
          <div 
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-sm text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-800 dark:hover:text-gray-100"
            onClick={(e) => {
              e.stopPropagation();
              const id = line.id || line.tempId;
              if (id && onToggleExpand) onToggleExpand(id);
            }}
          >
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </div>
        );
      case "MANUAL":
      default:
        return (
          <div className="flex h-6 w-6 items-center justify-center rounded-sm text-gray-400">
            <AlignLeft className="h-3.5 w-3.5" />
          </div>
        );
    }
  };

  /**
   * Main Row Render
   */
  return (
    <div 
      className={cn(
        "group flex items-center border-b border-gray-100 dark:border-gray-800 py-2 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors animate-in fade-in duration-200",
        line.type === "GROUP" ? "bg-slate-50/50 dark:bg-slate-900/20 font-medium" : "bg-white dark:bg-background"
      )}
      style={{ paddingLeft: `${depth * 24 + 12}px` }}
      data-row-type={line.type}
      data-testid={`row-${line.type.toLowerCase()}`}
    >
      {/* 1. Drag Handle / Grip (Visual only for now) */}
      <div className="mr-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab active:cursor-grabbing text-gray-300">
        <div className="grid grid-cols-2 gap-[2px] w-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="w-[3px] h-[3px] rounded-full bg-current" />
          ))}
        </div>
      </div>

      {/* 2. Block Type Icon */}
      <div className="mr-3 shrink-0">
        {renderIcon()}
      </div>

      {/* 3. Label / Content */}
      <div className="flex-1 mr-4 min-w-0">
        {isEditingLabel && !readOnly ? (
          <Input
            ref={labelInputRef}
            value={line.label}
            onChange={(e) => handleUpdate("label", e.target.value)}
            onBlur={() => setIsEditingLabel(false)}
            onKeyDown={(e) => {
              if (e.key === "Enter") setIsEditingLabel(false);
            }}
            className="h-7 px-1 py-0 text-sm border-none shadow-none focus-visible:ring-1 bg-white dark:bg-black/20"
          />
        ) : (
          <span 
            onClick={() => !readOnly && setIsEditingLabel(true)}
            className={cn(
              "block truncate text-sm px-1 py-0.5 rounded cursor-text border border-transparent hover:border-gray-200 dark:hover:border-gray-700",
              !line.label && "text-gray-400 italic",
              line.type === "GROUP" && "text-base font-semibold text-gray-900 dark:text-gray-100"
            )}
          >
            {line.label || "Untitled block"}
          </span>
        )}
      </div>

      {/* 4. Commercial Columns (Hidden for Groups if they serve as headers only, but typically groups can have totals) */}
      {/* 4. Commercial Columns (Hidden for Groups if they serve as headers only, but typically groups can have totals) */}
      {line.type !== "GROUP" && (
        <div className="flex items-center space-x-2 shrink-0 text-sm">
          {/* Quantity */}
          <div className="w-16">
            <NumberInput
              value={line.quantity ?? 1}
              onChange={(val) => handleUpdate("quantity", val)}
              disabled={readOnly}
              placeholder="Qty"
              className="h-7 px-2 text-right text-xs bg-transparent border-transparent hover:border-gray-200 focus-visible:bg-white focus-visible:border-gray-300"
            />
          </div>

          {/* Unit Price */}
          <div className="w-24 relative">
             <NumberInput
                value={line.unitPrice ?? 0}
                onChange={(val) => handleUpdate("unitPrice", val)}
                disabled={readOnly}
                step={0.01}
                className="h-7 pl-6 pr-2 text-right text-xs bg-transparent border-transparent hover:border-gray-200 focus-visible:bg-white focus-visible:border-gray-300"
              />
              <span className="absolute left-2 top-1.5 text-xs text-gray-400 pointer-events-none">
                {getCurrencySymbol(currency)}
              </span>
          </div>

          {/* Total (Read Only) */}
          <div className="w-24 text-right pr-2 text-sm font-medium tabular-nums text-gray-700 dark:text-gray-300">
             {new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format((line.quantity ?? 1) * (line.unitPrice ?? 0))}
          </div>

           {/* VAT (Small) */}
           <div className="w-12 text-xs text-gray-400 text-right">
             {(line.vatRate ?? 10)}%
           </div>
        </div>
      )}
      
      {/* Group Subtotals can go here if needed, but for now empty */}
      {line.type === "GROUP" && (
        <div className="flex items-center space-x-2 shrink-0 text-gray-400 text-xs italic pr-4">
           {/* Section summary could go here */}
           Section
        </div>
      )}
    </div>
  );
}

// Helper component to handle local state for decimal inputs
function NumberInput({ 
  value = 0, 
  onChange, 
  className, 
  step = 1,
  ...props 
}: Omit<React.ComponentProps<typeof Input>, 'onChange'> & { onChange: (val: number) => void }) {
  const [localValue, setLocalValue] = useState<string>(value.toString());

  // Sync local state when external value changes
  useEffect(() => {
    // Only update if the parsed value is different to avoid cursor jumping or fighting validation
    if (parseFloat(localValue) !== value) {
      setLocalValue(value.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setLocalValue(raw);
    
    // Only fire onChange if it's a valid number
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    // On blur, force valid number format from parent
    setLocalValue(value.toString());
  };

  return (
    <Input
      type="number"
      step={step}
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      className={className}
      {...props}
    />
  );
}

function getCurrencySymbol(code: string): string {
  try {
    return (0).toLocaleString('fr-FR', { style: 'currency', currency: code, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();
  } catch {
    return code; // Fallback
  }
}
