/**
 * Story 26.7: Yolo Billing Module Exports
 * 
 * Barrel file for all "Yolo Mode" billing components and utilities.
 */

/** Row component for rendering individual quote/invoice lines */
export { UniversalLineItemRow } from "./UniversalLineItemRow";
export type { 
  LineItemType, 
  DisplayData, 
  SourceData, 
  UniversalLineItemRowProps 
} from "./UniversalLineItemRow";

/** Wrapper component providing sortable capabilities to a single row */
export { SortableQuoteLine } from "./SortableQuoteLine";

/** Main container component orchestrating drag & drop for quote lines */
export { SortableQuoteLinesList } from "./SortableQuoteLinesList";
export type { QuoteLineWithChildren } from "./dnd-utils";

/** 
 * Utility functions for DnD operations, 
 * consolidated from SortableQuoteLinesList for better testability and reusability.
 */
export {
  getLineId,
  recalculateSortOrder,
  moveLine,
  getDescendantIds,
  isDescendantOf,
  validateNestingDepth,
  buildTree,
  flattenTree,
  calculateGroupTotals,
  calculateLineTotal,
  getLineDepth,
  type QuoteLine,
} from "./dnd-utils";
