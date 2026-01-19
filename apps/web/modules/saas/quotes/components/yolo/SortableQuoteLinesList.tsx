/**
 * Story 26.7: SortableQuoteLinesList Component
 * 
 * Main container component that provides DndContext and SortableContext
 * for drag & drop reordering of quote lines.
 * 
 * Features:
 * - Flat list with visual nesting via depth
 * - Re-parenting: drop a line inside a GROUP to nest it
 * - Groups can be dragged with all their children
 * - Accessible keyboard navigation
 */

"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { UniversalLineItemRow } from "./UniversalLineItemRow";
import { SortableQuoteLine } from "./SortableQuoteLine";
import { 
  getLineId, 
  validateNestingDepth, 
  buildTree, 
  flattenTree, 
  getDescendantIds,
  type QuoteLine,
  type QuoteLineWithChildren
} from "./dnd-utils";

interface SortableQuoteLinesListProps {
  /** Flat list of quote lines (with parentId for nesting) */
  lines: QuoteLine[];
  /** Callback when lines are reordered */
  onLinesChange: (updatedLines: QuoteLine[]) => void;
  /** Callback when a single line is updated */
  onLineUpdate?: (id: string, data: Partial<QuoteLine>) => void;
  /** Callback when a line should be toggled (expand/collapse) */
  onToggleExpand?: (id: string) => void;
  /** Map of expanded group IDs */
  expandedGroups?: Set<string>;
  /** Whether the list is in read-only mode */
  readOnly?: boolean;
}

/**
 * Determine if dragged item should be nested under a group
 */
function shouldNestUnderGroup(overLine: QuoteLine): boolean {
  // If dropping on/after a GROUP, nest inside it
  return overLine.type === "GROUP";
}

export function SortableQuoteLinesList({
  lines,
  onLinesChange,
  onLineUpdate,
  onToggleExpand,
  expandedGroups = new Set(),
  readOnly = false,
}: SortableQuoteLinesListProps) {
  const t = useTranslations("quotes.yolo");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  // Configure sensors for mouse/touch and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Build tree for rendering
  const tree = useMemo(() => buildTree(lines), [lines]);

  // Get IDs for sortable context (only visible items)
  const sortableIds = useMemo(() => {
    const ids: string[] = [];
    const addIds = (nodes: QuoteLineWithChildren[], parentExpanded = true) => {
      for (const node of nodes) {
        const id = getLineId(node);
        if (parentExpanded) {
          ids.push(id);
        }
        if (node.children?.length) {
          // Default expanded only when no explicit state is provided
          const isExpanded = expandedGroups.size === 0 || expandedGroups.has(id);
          addIds(node.children, parentExpanded && isExpanded);
        }
      }
    };
    addIds(tree);
    return ids;
  }, [tree, expandedGroups]);

  // Find active line for overlay
  const activeLine = useMemo(
    () => (activeId ? lines.find((l) => getLineId(l) === activeId) : null),
    [activeId, lines]
  );

  // Handle drag start
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Handle drag over (for visual feedback)
  const handleDragOver = useCallback((event: DragOverEvent) => {
    setOverId(event.over?.id as string | null);
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveId(null);
      setOverId(null);

      if (!over || active.id === over.id) {
        return;
      }

      const activeId = active.id as string;
      const overId = over.id as string;

      const activeIndex = lines.findIndex((l) => getLineId(l) === activeId);
      const overIndex = lines.findIndex((l) => getLineId(l) === overId);

      if (activeIndex === -1 || overIndex === -1) {
        return;
      }

      const activeLine = lines[activeIndex];
      const overLine = lines[overIndex];

      // Get all descendants if dragging a GROUP
      const descendantIds =
        activeLine.type === "GROUP" ? getDescendantIds(lines, activeId) : new Set<string>();

      const nestUnder = shouldNestUnderGroup(overLine);

      let newLines: QuoteLine[];

      if (nestUnder && overLine.type === "GROUP") {
        // Validate nesting depth before re-parenting
        if (!validateNestingDepth(lines, activeId, overId)) {
          // Cannot nest here - would exceed max depth
          return;
        }
        
        // Re-parent: move active line (and children) under the GROUP
        newLines = lines.map((line) => {
          const id = getLineId(line);
          if (id === activeId) {
            return { ...line, parentId: overId };
          }
          return line;
        });

        // Recalculate sort orders
        const tree = buildTree(newLines);
        newLines = flattenTree(tree);
      } else if (activeLine.parentId && !nestUnder) {
        // Moving OUT of a group to root level
        newLines = lines.map((line) => {
          const id = getLineId(line);
          if (id === activeId) {
            return { ...line, parentId: null };
          }
          return line;
        });

        // Apply move
        const updatedActiveIndex = newLines.findIndex((l) => getLineId(l) === activeId);
        newLines = arrayMove(newLines, updatedActiveIndex, overIndex);

        // Recalculate sort orders
        const tree = buildTree(newLines);
        newLines = flattenTree(tree);
      } else {
        // Simple reorder within same level
        // First, collect items to move (active + descendants)
        const itemsToMove = [activeId, ...Array.from(descendantIds)];
        const movingLines = lines.filter((l) => itemsToMove.includes(getLineId(l)));
        const remainingLines = lines.filter((l) => !itemsToMove.includes(getLineId(l)));

        // Find new position in remaining lines
        const newOverIndex = remainingLines.findIndex((l) => getLineId(l) === overId);
        if (newOverIndex === -1) {
          newLines = [...remainingLines, ...movingLines];
        } else {
          newLines = [
            ...remainingLines.slice(0, newOverIndex + 1),
            ...movingLines,
            ...remainingLines.slice(newOverIndex + 1),
          ];
        }

        // Recalculate sort orders while preserving tree structure
        const tree = buildTree(newLines);
        newLines = flattenTree(tree);
      }

      onLinesChange(newLines);
    },
    [lines, onLinesChange]
  );

  // Handle line update
  const handleLineUpdate = useCallback(
    (id: string, data: Partial<QuoteLine>) => {
      if (onLineUpdate) {
        onLineUpdate(id, data);
      } else {
        // Default: update locally
        const newLines = lines.map((line) =>
          getLineId(line) === id ? { ...line, ...data } : line
        );
        onLinesChange(newLines);
      }
    },
    [lines, onLinesChange, onLineUpdate]
  );

  // Render a single line with sortable wrapper
  const renderLine = (
    line: QuoteLineWithChildren,
    depth: number
  ): React.ReactNode => {
    const id = getLineId(line);
    // Default expanded when no explicit state is provided
    const isExpanded = line.type === "GROUP" ? (expandedGroups.size === 0 || expandedGroups.has(id)) : true;

    return (
      <React.Fragment key={id}>
        <SortableQuoteLine id={id} isOver={overId === id}>
          {({ dragHandleProps, isDragging, setNodeRef, style, isOver }) => (
            <div
              ref={setNodeRef}
              style={style}
              className={isOver ? "ring-2 ring-primary ring-offset-1" : ""}
            >
              <UniversalLineItemRow
                id={id}
                type={line.type}
                displayData={{
                  label: line.label || "",
                  description: line.description ?? undefined,
                  quantity: line.quantity ?? 1,
                  unitPrice: line.unitPrice ?? 0,
                  vatRate: line.vatRate ?? 10,
                  total: (line.quantity ?? 1) * (line.unitPrice ?? 0),
                }}
                sourceData={line.sourceData ?? null}
                depth={depth}
                isExpanded={isExpanded}
                isDragging={isDragging}
                disabled={readOnly}
                onDisplayDataChange={(field, value) => {
                  // Map displayData field to QuoteLine field
                  if (field === "label") {
                    handleLineUpdate(id, { label: value as string });
                  } else if (field === "quantity" || field === "unitPrice" || field === "vatRate") {
                    handleLineUpdate(id, { [field]: value });
                  }
                }}
                onToggleExpand={() => onToggleExpand?.(id)}
                dragHandleProps={dragHandleProps}
              />
            </div>
          )}
        </SortableQuoteLine>

        {isExpanded &&
          line.children?.map((child) =>
            renderLine(child, depth + 1)
          )}
      </React.Fragment>
    );
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
        <div className="border rounded-md bg-background">
          {/* Header row */}
          <div className="flex items-center px-4 py-2 border-b bg-muted/30 text-xs font-medium text-muted-foreground">
            <div className="w-8" /> {/* Drag handle space */}
            <div className="w-8" /> {/* Icon space */}
            <div className="flex-1">{t("headers.description")}</div>
            <div className="w-16 text-right">{t("headers.qty")}</div>
            <div className="w-24 text-right">{t("headers.unitPrice")}</div>
            <div className="w-24 text-right">{t("headers.total")}</div>
            <div className="w-12 text-right">{t("headers.vat")}</div>
          </div>

          {tree.map((line) => renderLine(line, 0))}

          {/* Empty state */}
          {tree.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              {t("emptyState")}
            </div>
          )}
        </div>
      </SortableContext>

      {/* Drag overlay for smooth dragging */}
      <DragOverlay>
        {activeLine ? (
          <div className="bg-background shadow-lg rounded border opacity-90">
            <UniversalLineItemRow
              id={getLineId(activeLine)}
              type={activeLine.type}
              displayData={{
                label: activeLine.label || "",
                quantity: activeLine.quantity ?? 1,
                unitPrice: activeLine.unitPrice ?? 0,
                vatRate: activeLine.vatRate ?? 10,
                total: (activeLine.quantity ?? 1) * (activeLine.unitPrice ?? 0),
              }}
              sourceData={activeLine.sourceData ?? null}
              depth={0}
              isDragging
              disabled
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default SortableQuoteLinesList;
