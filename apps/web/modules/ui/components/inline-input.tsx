/**
 * Story 26.6: InlineInput Component
 *
 * A click-to-edit inline input component that switches between
 * a <span> (read mode) and <input> (edit mode).
 * Designed for Notion/Airtable-like editing experience.
 */

"use client";

import { cn } from "@ui/lib";
import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

export interface InlineInputProps {
  /** Current value */
  value: string;
  /** Callback when value is committed (Enter/Blur) */
  onChange: (value: string) => void;
  /** Optional: Called on every keystroke during editing */
  onValueChange?: (value: string) => void;
  /** Input type: text or number */
  type?: "text" | "number";
  /** Placeholder when value is empty */
  placeholder?: string;
  /** Disable editing */
  disabled?: boolean;
  /** Additional CSS classes for the wrapper */
  className?: string;
  /** Additional CSS classes for the input element */
  inputClassName?: string;
  /** Format function for display mode */
  formatValue?: (value: string) => string;
  /** Minimum width to prevent layout shift */
  minWidth?: string;
  /** Text alignment */
  align?: "left" | "center" | "right";
  /** Font weight for display */
  fontWeight?: "normal" | "medium" | "semibold" | "bold";
  /** Show visual indicator when hovering (editable hint) */
  showEditHint?: boolean;
}

export function InlineInput({
  value,
  onChange,
  onValueChange,
  type = "text",
  placeholder = "",
  disabled = false,
  className,
  inputClassName,
  formatValue,
  minWidth = "3rem",
  align = "left",
  fontWeight = "normal",
  showEditHint = true,
}: InlineInputProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const spanRef = useRef<HTMLSpanElement>(null);

  const [prevValue, setPrevValue] = useState(value);

  // Sync edit value when external value changes (and not currently editing)
  if (value !== prevValue) {
    setPrevValue(value);
    if (!isEditing) {
      setEditValue(value);
    }
  }

  // Auto-focus and select all when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleStartEdit = useCallback(() => {
    if (disabled) return;
    setEditValue(value);
    setIsEditing(true);
  }, [disabled, value]);

  const handleCommit = useCallback(() => {
    setIsEditing(false);
    const trimmedValue = editValue.trim();
    if (trimmedValue !== value) {
      onChange(trimmedValue);
    }
  }, [editValue, value, onChange]);

  const handleCancel = useCallback(() => {
    setIsEditing(false);
    setEditValue(value);
  }, [value]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleCommit();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      }
    },
    [handleCommit, handleCancel]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = e.target.value;
      setEditValue(newValue);
      onValueChange?.(newValue);
    },
    [onValueChange]
  );

  const handleBlur = useCallback(() => {
    handleCommit();
  }, [handleCommit]);

  // Display value (formatted or raw)
  const displayValue = formatValue ? formatValue(value) : value;
  const showPlaceholder = !displayValue && placeholder;

  // Alignment classes
  const alignmentClass = {
    left: "text-left",
    center: "text-center",
    right: "text-right",
  }[align];

  // Font weight classes
  const fontWeightClass = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  }[fontWeight];

  // Base styles for both span and input to maintain layout stability
  const baseStyles = cn(
    "inline-block w-full px-1 py-0.5 rounded-sm transition-colors",
    alignmentClass,
    fontWeightClass
  );

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type={type}
        value={editValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          baseStyles,
          "border border-primary bg-background ring-2 ring-primary/20 outline-none",
          "text-foreground",
          inputClassName,
          className
        )}
        style={{ minWidth }}
        aria-label="Edit value"
      />
    );
  }

  return (
    <span
      ref={spanRef}
      onClick={handleStartEdit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleStartEdit();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      className={cn(
        baseStyles,
        "cursor-text select-none",
        showPlaceholder && "text-muted-foreground italic",
        !disabled && showEditHint && "hover:bg-muted/50",
        disabled && "cursor-not-allowed opacity-60",
        className
      )}
      style={{ minWidth }}
      aria-label={disabled ? "Value (read-only)" : "Click to edit"}
    >
      {showPlaceholder ? placeholder : displayValue}
    </span>
  );
}

export default InlineInput;
