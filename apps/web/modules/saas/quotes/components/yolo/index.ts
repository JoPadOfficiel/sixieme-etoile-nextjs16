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
	UniversalLineItemRowProps,
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

/**
 * Story 26.9: Detach Warning Modal
 * Modal component for confirming operational data detachment
 */
export { DetachWarningModal } from "./DetachWarningModal";
export type { DetachWarningModalProps } from "./DetachWarningModal";

/**
 * Story 26.9: Detach Utilities
 * Functions for detecting sensitive changes and protecting operational data
 */
export {
	isSensitiveField,
	isSensitiveFieldChange,
	calculateLabelSimilarity,
	isSignificantLabelChange,
	checkDetachRequirement,
	getOriginalLabelFromSource,
	SENSITIVE_FIELDS,
	LABEL_SIMILARITY_THRESHOLD,
} from "./detach-utils";
export type {
	FieldChangeEvent,
	DetachCheckResult,
	SensitiveField,
} from "./detach-utils";

/**
 * Story 26.14: Yolo Quote Editor
 * Main editor with Undo/Redo history support
 */
export { YoloQuoteEditor } from "./YoloQuoteEditor";
