/**
 * Story 26.7: dnd-kit utilities for quote lines reordering
 * 
 * Provides helper functions for managing sortOrder and parentId
 * during drag & drop operations.
 */

import type { QuoteLine } from "../UniversalLineItemRow";

/**
 * Get the unique identifier for a line
 */
export function getLineId(line: QuoteLine): string {
  return line.id || line.tempId || "";
}

/**
 * Recalculate sortOrder for all lines after a drag operation
 * Preserves parent-child relationships
 */
export function recalculateSortOrder(lines: QuoteLine[]): QuoteLine[] {
  // Group lines by parentId
  const groups = new Map<string | null, QuoteLine[]>();
  
  for (const line of lines) {
    const parentKey = line.parentId || null;
    if (!groups.has(parentKey)) {
      groups.set(parentKey, []);
    }
    groups.get(parentKey)!.push(line);
  }
  
  // Assign sortOrder within each group
  const result: QuoteLine[] = [];
  
  const processGroup = (parentId: string | null) => {
    const groupLines = groups.get(parentId) || [];
    groupLines.forEach((line, index) => {
      result.push({ ...line, sortOrder: index });
      // Recursively process children
      const lineId = getLineId(line);
      if (groups.has(lineId)) {
        processGroup(lineId);
      }
    });
  };
  
  processGroup(null);
  
  return result;
}

/**
 * Move a line to a new position and optionally re-parent it
 */
export function moveLine(
  lines: QuoteLine[],
  activeId: string,
  overId: string,
  newParentId?: string | null
): QuoteLine[] {
  const activeIndex = lines.findIndex(l => getLineId(l) === activeId);
  const overIndex = lines.findIndex(l => getLineId(l) === overId);
  
  if (activeIndex === -1 || overIndex === -1) {
    return lines;
  }
  
  // Create new array
  const result = [...lines];
  
  // Remove active item
  const [movedItem] = result.splice(activeIndex, 1);
  
  // Update parentId if provided
  const updatedItem = newParentId !== undefined 
    ? { ...movedItem, parentId: newParentId }
    : movedItem;
  
  // Calculate new insertion index (adjust if we removed before the target)
  const newOverIndex = activeIndex < overIndex 
    ? overIndex - 1 
    : overIndex;
  
  // Insert at new position
  result.splice(newOverIndex + 1, 0, updatedItem);
  
  // Recalculate sort orders
  return recalculateSortOrder(result);
}

/**
 * Get all descendant IDs of a group (for moving groups with children)
 */
export function getDescendantIds(
  lines: QuoteLine[],
  groupId: string
): string[] {
  const descendants: string[] = [];
  const queue = [groupId];
  
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    for (const line of lines) {
      if (line.parentId === currentId) {
        const id = getLineId(line);
        descendants.push(id);
        queue.push(id);
      }
    }
  }
  
  return descendants;
}

/**
 * Check if a line is nested under a specific parent (at any depth)
 */
export function isDescendantOf(
  lines: QuoteLine[],
  lineId: string,
  potentialAncestorId: string
): boolean {
  const descendants = getDescendantIds(lines, potentialAncestorId);
  return descendants.includes(lineId);
}

/**
 * Validate that nesting depth doesn't exceed max (1 level for GROUPs)
 */
export function validateNestingDepth(
  lines: QuoteLine[],
  lineId: string,
  newParentId: string
): boolean {
  // Find the proposed parent
  const parent = lines.find(l => getLineId(l) === newParentId);
  
  // Only GROUPs can have children
  if (parent?.type !== "GROUP") {
    return false;
  }
  
  // Check if parent itself has a parent (would be depth > 1)
  if (parent.parentId) {
    return false;
  }
  
  return true;
}
