/**
 * Story 26.7: Yolo Billing Module Exports
 * 
 * Barrel file for all "Yolo Mode" billing components.
 */

// Core row component (Stories 26.5, 26.6)
export { UniversalLineItemRow } from "./UniversalLineItemRow";
export type { 
  LineItemType, 
  DisplayData, 
  SourceData, 
  UniversalLineItemRowProps 
} from "./UniversalLineItemRow";

// Drag & Drop components (Story 26.7)
export { SortableQuoteLine } from "./SortableQuoteLine";
export { SortableQuoteLinesList } from "./SortableQuoteLinesList";
export type { QuoteLineWithChildren } from "./SortableQuoteLinesList";

// DnD utilities (Story 26.7)
export {
  getLineId,
  recalculateSortOrder,
  moveLine,
  getDescendantIds,
  isDescendantOf,
  validateNestingDepth,
} from "./dnd-utils";
