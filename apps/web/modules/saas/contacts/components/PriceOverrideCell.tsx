"use client";

import { Input } from "@ui/components/input";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { CheckIcon, XIcon, PencilIcon, RotateCcwIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useRef, useEffect } from "react";
import { cn } from "@ui/lib";

interface PriceOverrideCellProps {
  catalogPrice: number;
  overridePrice: number | null;
  onSave: (newPrice: number | null) => void;
  currency?: string;
  disabled?: boolean;
}

/**
 * Story 12.3: Inline editable cell for override prices
 * 
 * Displays the current price (override or catalog) and allows inline editing.
 * - Click to edit
 * - Enter to save, Escape to cancel
 * - Reset button to clear override
 */
export function PriceOverrideCell({
  catalogPrice,
  overridePrice,
  onSave,
  currency = "€",
  disabled = false,
}: PriceOverrideCellProps) {
  const t = useTranslations("contacts.contract.priceOverride");
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasOverride = overridePrice !== null;

  // Focus input when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = () => {
    if (disabled) return;
    setInputValue(hasOverride ? overridePrice.toString() : "");
    setError(null);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setInputValue("");
    setError(null);
  };

  const handleSave = () => {
    // Empty value = reset to catalog
    if (inputValue.trim() === "") {
      onSave(null);
      setIsEditing(false);
      return;
    }

    const numValue = parseFloat(inputValue);
    
    // Validation
    if (isNaN(numValue)) {
      setError(t("invalidValue"));
      return;
    }
    if (numValue <= 0) {
      setError(t("priceMustBePositive"));
      return;
    }

    onSave(numValue);
    setIsEditing(false);
    setError(null);
  };

  const handleReset = () => {
    if (disabled) return;
    onSave(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSave();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <div className="relative">
          <Input
            ref={inputRef}
            type="number"
            step="0.01"
            min="0"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              // Small delay to allow button clicks
              setTimeout(() => {
                if (isEditing) handleCancel();
              }, 150);
            }}
            className={cn(
              "h-8 w-24 text-right pr-6",
              error && "border-destructive"
            )}
            placeholder={catalogPrice.toString()}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
            {currency}
          </span>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleSave}
        >
          <CheckIcon className="h-4 w-4 text-green-600" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleCancel}
        >
          <XIcon className="h-4 w-4 text-muted-foreground" />
        </Button>
        {error && (
          <span className="text-xs text-destructive ml-1">{error}</span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {hasOverride ? (
        <>
          <span className="font-medium text-primary">
            {overridePrice.toFixed(2)} {currency}
          </span>
          <Badge variant="secondary" className="text-xs">
            {t("negotiated")}
          </Badge>
          {!disabled && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleStartEdit}
                title={t("edit")}
              >
                <PencilIcon className="h-3 w-3" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleReset}
                title={t("resetToCatalog")}
              >
                <RotateCcwIcon className="h-3 w-3" />
              </Button>
            </>
          )}
        </>
      ) : (
        <>
          <span className="text-muted-foreground">
            {catalogPrice.toFixed(2)} {currency}
          </span>
          <Badge variant="outline" className="text-xs">
            {t("catalog")}
          </Badge>
          {!disabled && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleStartEdit}
              title={t("setNegotiated")}
            >
              <PencilIcon className="h-3 w-3" />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
