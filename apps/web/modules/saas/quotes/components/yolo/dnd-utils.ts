/** Line item type enum matching Prisma schema */
export type LineItemType = "CALCULATED" | "MANUAL" | "GROUP";

/**
 * Quote line representation used in the DnD list
 */
export interface QuoteLine {
  id?: string;
  tempId?: string;
  type: LineItemType;
  label: string;
  description?: string | null;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  vatRate?: number;
  parentId?: string | null;
  sortOrder?: number;
  sourceData?: Record<string, unknown>;
  displayData?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Extended QuoteLine with children for tree structure
 */
export interface QuoteLineWithChildren extends QuoteLine {
  children?: QuoteLineWithChildren[];
}

/**
 * Get the unique identifier for a line (priority to persisted id, fallback to tempId)
 */
export function getLineId(line: QuoteLine): string {
  return line.id || line.tempId || "";
}

/**
 * Build a tree structure from a flat list of lines
 * @param lines Flat array of quote lines
 * @returns Tree structure with children
 */
export function buildTree(lines: QuoteLine[]): QuoteLineWithChildren[] {
  const lineMap = new Map<string, QuoteLineWithChildren>();
  const roots: QuoteLineWithChildren[] = [];

  // First pass: create map
  for (const line of lines) {
    const id = getLineId(line);
    lineMap.set(id, { ...line, children: [] });
  }

  // Second pass: build tree
  for (const line of lines) {
    const id = getLineId(line);
    const node = lineMap.get(id)!;

    if (line.parentId && lineMap.has(line.parentId)) {
      const parent = lineMap.get(line.parentId)!;
      parent.children = parent.children || [];
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort by sortOrder at each level
  const sortNodes = (nodes: QuoteLineWithChildren[]) => {
    nodes.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
    for (const node of nodes) {
      if (node.children?.length) {
        sortNodes(node.children);
      }
    }
  };
  sortNodes(roots);

  return roots;
}

/**
 * Flatten a tree structure back to a sorted flat array with updated sortOrder and parentId
 * @param nodes Tree structure nodes
 * @param parentId Parent ID for the current level
 * @param startOrder Starting sort order for this level
 * @returns Flat array of lines
 */
export function flattenTree(
  nodes: QuoteLineWithChildren[],
  parentId: string | null = null,
  startOrder = 0
): QuoteLine[] {
  const result: QuoteLine[] = [];
  let order = startOrder;

  for (const node of nodes) {
    const { children, ...lineWithoutChildren } = node;
    result.push({
      ...lineWithoutChildren,
      parentId,
      sortOrder: order++,
    } as QuoteLine);

    if (children?.length) {
      result.push(...flattenTree(children, getLineId(node), 0));
    }
  }

  return result;
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
 * 
 * Rules:
 * - Only GROUPs can have children
 * - GROUPs cannot be nested under other GROUPs (max depth = 1)
 * - Parent GROUP must be at root level (no parentId)
 * 
 * @param lines Flat array of all lines
 * @param lineId ID of the line being moved
 * @param newParentId ID of the proposed parent GROUP
 * @returns true if nesting is valid, false otherwise
 */
export function validateNestingDepth(
  lines: QuoteLine[],
  lineId: string,
  newParentId: string
): boolean {
  // Find the line being moved
  const movingLine = lines.find(l => getLineId(l) === lineId);
  
  // Prevent GROUP from being nested under another GROUP (H3 fix)
  if (movingLine?.type === "GROUP") {
    return false;
  }
  
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

/**
 * Story 26.6: Auto-calculate group totals
 * 
 * Calculates the total price for each GROUP item by summing the totals 
 * of its immediate children.
 * 
 * @param lines Flat list of lines
 * @returns Updated list with corrected group totals
 */
export function calculateGroupTotals(lines: QuoteLine[]): QuoteLine[] {
  const result = [...lines];
  
  // Find all groups
  const groups = result.filter(l => l.type === "GROUP");
  
  groups.forEach(group => {
    const groupId = getLineId(group);
    // Find immediate children
    const childLines = result.filter(l => l.parentId === groupId);
    const groupTotal = childLines.reduce((sum, line) => {
      // Use totalPrice if available, otherwise calculate from qty * unitPrice (M3 fix)
      const price = (line.totalPrice as number) 
        || ((line.quantity ?? 1) * (line.unitPrice ?? 0));
      return sum + price;
    }, 0);
    
    // Update group total in both fields for consistency
    const index = result.findIndex(l => getLineId(l) === groupId);
    if (index !== -1) {
      result[index] = {
        ...result[index],
        totalPrice: groupTotal,
        // Also update nested total if it's stored in displayData
        displayData: {
          ...(result[index].displayData as Record<string, unknown> || {}),
          total: groupTotal
        }
      };
    }
  });
  
  return result;
}

/**
 * Calculate the total for a single line item.
 * For GROUP items, sums children totals.
 * For CALCULATED/MANUAL items, uses qty * unitPrice.
 * 
 * @param line The line to calculate total for
 * @param allLines All lines (needed for GROUP total calculation)
 * @returns The calculated total
 */
export function calculateLineTotal(line: QuoteLine, allLines: QuoteLine[]): number {
  if (line.type === "GROUP") {
    const lineId = getLineId(line);
    const children = allLines.filter(l => l.parentId === lineId);
    return children.reduce((sum, child) => {
      return sum + calculateLineTotal(child, allLines);
    }, 0);
  }
  return (line.quantity ?? 1) * (line.unitPrice ?? 0);
}

/**
 * Get the depth of a line in the tree structure.
 * 
 * @param line The line to check
 * @param allLines All lines in the list
 * @returns The depth level (0 = root, 1 = nested under GROUP)
 */
export function getLineDepth(line: QuoteLine, allLines: QuoteLine[]): number {
  if (!line.parentId) return 0;
  const parent = allLines.find(l => getLineId(l) === line.parentId);
  if (!parent) return 0;
  return 1 + getLineDepth(parent, allLines);
}
