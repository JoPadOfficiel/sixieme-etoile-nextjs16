/**
 * Story 26.7: SortableQuoteLine Component
 * 
 * Wrapper component that makes a QuoteLine draggable using dnd-kit.
 * Uses useSortable hook to provide drag handle and transform capabilities.
 */

"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { QuoteLine } from "../UniversalLineItemRow";

interface SortableQuoteLineProps {
  /** The quote line data */
  line: QuoteLine;
  /** Unique ID for the sortable item */
  id: string;
  /** Whether the line is currently being dragged over */
  isOver?: boolean;
  /** Children to render (the actual row content) */
  children: (props: {
    dragHandleProps: Record<string, unknown>;
    isDragging: boolean;
    setNodeRef: (node: HTMLElement | null) => void;
    style: React.CSSProperties;
    isOver: boolean;
  }) => React.ReactNode;
}

export function SortableQuoteLine({ 
  id, 
  isOver: externalIsOver,
  children 
}: SortableQuoteLineProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
    isOver: sortableIsOver,
  } = useSortable({ id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : "auto",
    position: "relative" as const,
  };

  // Combine drag handle props for passing to child component
  const dragHandleProps = {
    ...attributes,
    ...listeners,
    role: "button",
    "aria-label": "Drag to reorder",
    tabIndex: 0,
    style: { cursor: isDragging ? "grabbing" : "grab" },
  };

  const isOver = externalIsOver ?? sortableIsOver;

  return children({
    dragHandleProps,
    isDragging,
    setNodeRef,
    style,
    isOver,
  });
}

export default SortableQuoteLine;
