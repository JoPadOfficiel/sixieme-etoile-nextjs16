/**
 * Story 26.7: SortableQuoteLinesList Component
 * Story 26.20: Visual Polish - Glassmorphism & Micro-animations
 *
 * Main container component that provides DndContext and SortableContext
 * for drag & drop reordering of quote lines.
 *
 * Features:
 * - Flat list with visual nesting via depth
 * - Re-parenting: drop a line inside a GROUP to nest it
 * - Groups can be dragged with all their children
 * - Accessible keyboard navigation
 * - Glassmorphism effects on panels (Story 26.20)
 * - Framer Motion animations on line entry/exit (Story 26.20)
 */

"use client";

import {
	DndContext,
	type DragEndEvent,
	type DragOverEvent,
	DragOverlay,
	type DragStartEvent,
	KeyboardSensor,
	PointerSensor,
	closestCenter,
	useSensor,
	useSensors,
} from "@dnd-kit/core";
import {
	SortableContext,
	arrayMove,
	sortableKeyboardCoordinates,
	verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Button } from "@ui/components/button";
import { Checkbox } from "@ui/components/checkbox";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import type React from "react";
import { useCallback, useMemo, useState } from "react";
import { useQuoteLinesStore } from "../../stores/useQuoteLinesStore";
import { SortableQuoteLine } from "./SortableQuoteLine";
import { UniversalLineItemRow } from "./UniversalLineItemRow";
import {
	type QuoteLine,
	type QuoteLineWithChildren,
	buildTree,
	calculateLineTotal,
	flattenTree,
	getDescendantIds,
	getLineDepth,
	getLineId,
	validateNestingDepth,
} from "./dnd-utils";

/**
 * Story 26.20: Animation variants for line items
 */
const lineAnimationVariants = {
	initial: { opacity: 0, y: -8, scale: 0.98 },
	animate: { opacity: 1, y: 0, scale: 1 },
	exit: { opacity: 0, y: 8, scale: 0.98 },
};

const lineTransition = {
	duration: 0.2,
	ease: "easeOut" as const,
};

interface SortableQuoteLinesListProps {
	/** Flat list of quote lines (with parentId for nesting) */
	lines: QuoteLine[];
	/** Callback when lines are reordered */
	onLinesChange: (updatedLines: QuoteLine[]) => void;
	/** Callback when a single line is updated */
	onLineUpdate?: (id: string, data: Partial<QuoteLine>) => void;
	/** Callback when a line should be toggled (expand/collapse) */
	onToggleExpand?: (id: string) => void;
	/** Callback when a line is detached from operational data */
	onLineDetach?: (id: string) => void;
	/** Callback when a new line is manually added */
	onLineAdd?: () => void;
	/** Callback when edit line is requested - fills main form */
	onEditLine?: (line: QuoteLine) => void;
	/** Map of expanded group IDs */
	expandedGroups?: Set<string>;
	/** Whether the list is in read-only mode */
	readOnly?: boolean;
	/** Currency code for price formatting */
	currency?: string;
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
	onLineDetach,
	expandedGroups = new Set(),
	readOnly = false,
	currency = "EUR",
	onLineAdd,
	onEditLine,
}: SortableQuoteLinesListProps) {
	const t = useTranslations("quotes.yolo");
	const [activeId, setActiveId] = useState<string | null>(null);
	const [overId, setOverId] = useState<string | null>(null);

	// Story 26.19: Selection state from store
	const {
		selectedLineIds,
		lastSelectedId,
		toggleLineSelection,
		selectRange,
		selectAll,
		deselectAll,
	} = useQuoteLinesStore();

	const allSelected = lines.length > 0 && selectedLineIds.size === lines.length;
	const someSelected =
		selectedLineIds.size > 0 && selectedLineIds.size < lines.length;

	const handleHeaderCheckboxChange = useCallback(() => {
		if (allSelected) {
			deselectAll();
		} else {
			selectAll();
		}
	}, [allSelected, deselectAll, selectAll]);

	// Configure sensors for mouse/touch and keyboard
	const sensors = useSensors(
		useSensor(PointerSensor, {
			activationConstraint: {
				distance: 8, // Prevent accidental drags
			},
		}),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		}),
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
					const isExpanded =
						expandedGroups.size === 0 || expandedGroups.has(id);
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
		[activeId, lines],
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
				activeLine.type === "GROUP"
					? getDescendantIds(lines, activeId)
					: new Set<string>();

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
				const updatedActiveIndex = newLines.findIndex(
					(l) => getLineId(l) === activeId,
				);
				newLines = arrayMove(newLines, updatedActiveIndex, overIndex);

				// Recalculate sort orders
				const tree = buildTree(newLines);
				newLines = flattenTree(tree);
			} else {
				// Simple reorder within same level
				// First, collect items to move (active + descendants)
				const itemsToMove = [activeId, ...Array.from(descendantIds)];
				const movingLines = lines.filter((l) =>
					itemsToMove.includes(getLineId(l)),
				);
				const remainingLines = lines.filter(
					(l) => !itemsToMove.includes(getLineId(l)),
				);

				// Find new position in remaining lines
				const newOverIndex = remainingLines.findIndex(
					(l) => getLineId(l) === overId,
				);
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
		[lines, onLinesChange],
	);

	// Handle line update
	const handleLineUpdate = useCallback(
		(id: string, data: Partial<QuoteLine>) => {
			if (onLineUpdate) {
				onLineUpdate(id, data);
			} else {
				// Default: update locally
				const newLines = lines.map((line) =>
					getLineId(line) === id ? { ...line, ...data } : line,
				);
				onLinesChange(newLines);
			}
		},
		[lines, onLinesChange, onLineUpdate],
	);

	// Handle line detach (Story 26.9: Operational Detach Logic)
	const handleLineDetach = useCallback(
		(id: string) => {
			if (onLineDetach) {
				onLineDetach(id);
			} else {
				// Default: update locally - set sourceData to undefined and type to MANUAL
				const newLines = lines.map((line) =>
					getLineId(line) === id
						? { ...line, sourceData: undefined, type: "MANUAL" as const }
						: line,
				);
				onLinesChange(newLines);
			}
		},
		[lines, onLinesChange, onLineDetach],
	);

	// Story 26.19: Handle selection change with shift-click support
	const handleSelectionChange = useCallback(
		(id: string, shiftKey: boolean) => {
			if (shiftKey && lastSelectedId) {
				selectRange(lastSelectedId, id);
			} else {
				toggleLineSelection(id);
			}
		},
		[lastSelectedId, selectRange, toggleLineSelection],
	);

	// Render a single line with sortable wrapper and animations (Story 26.20)
	const renderLine = (
		line: QuoteLineWithChildren,
		depth: number,
	): React.ReactNode => {
		const id = getLineId(line);
		// Default expanded when no explicit state is provided
		const isExpanded =
			line.type === "GROUP"
				? expandedGroups.size === 0 || expandedGroups.has(id)
				: true;

		return (
			<motion.div
				key={id}
				layout
				variants={lineAnimationVariants}
				initial="initial"
				animate="animate"
				exit="exit"
				transition={lineTransition}
			>
				<SortableQuoteLine id={id} isOver={overId === id}>
					{({ dragHandleProps, isDragging, setNodeRef, style, isOver }) => (
						<div
							ref={setNodeRef}
							style={style}
							className={
								isOver ? "rounded-lg ring-2 ring-primary ring-offset-1" : ""
							}
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
									// Use calculateLineTotal for correct GROUP totals (L1 fix)
									total: calculateLineTotal(line, lines),
								}}
								sourceData={line.sourceData ?? null}
								depth={depth}
								isExpanded={isExpanded}
								isDragging={isDragging}
								disabled={readOnly}
								currency={currency}
								onDisplayDataChange={(field, value) => {
									// Map displayData field to QuoteLine field
									if (field === "label") {
										handleLineUpdate(id, { label: value as string });
									} else if (
										field === "quantity" ||
										field === "unitPrice" ||
										field === "vatRate"
									) {
										handleLineUpdate(id, { [field]: value });
									}
								}}
								onToggleExpand={() => onToggleExpand?.(id)}
								onDetach={() => handleLineDetach(id)}
								onEditLine={onEditLine}
								dragHandleProps={dragHandleProps}
								// Story 26.19: Selection props
								isSelected={selectedLineIds.has(id)}
								onSelectionChange={handleSelectionChange}
								showSelection={selectedLineIds.size > 0}
								// Story 28.6: Dispatch toggle
								dispatchable={line.dispatchable ?? true}
								onDispatchableChange={(lineId, value) => handleLineUpdate(lineId, { dispatchable: value })}
							/>
						</div>
					)}
				</SortableQuoteLine>

				{isExpanded && (
					<AnimatePresence mode="popLayout">
						{line.children?.map((child) => renderLine(child, depth + 1))}
					</AnimatePresence>
				)}
			</motion.div>
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
			<SortableContext
				items={sortableIds}
				strategy={verticalListSortingStrategy}
			>
				{/* Story 26.20: Glassmorphism container */}
				<div className="rounded-xl border border-white/20 bg-white/80 shadow-xl backdrop-blur-md dark:border-slate-700/50 dark:bg-slate-900/80">
					{/* Header row with subtle glassmorphism */}
					<div className="flex items-center rounded-t-xl border-white/10 border-b bg-gradient-to-r from-muted/40 to-muted/20 px-4 py-3 font-medium text-muted-foreground text-xs dark:border-slate-700/30">
						<div className="flex w-8 items-center justify-center">
							{/* Story 26.19: Select All Checkbox */}
							{!readOnly && (
								<Checkbox
									checked={
										allSelected ? true : someSelected ? "indeterminate" : false
									}
									onCheckedChange={handleHeaderCheckboxChange}
									aria-label={t("actions.selectAll") || "Tout sélectionner"}
									className="h-4 w-4"
								/>
							)}
						</div>
						<div className="w-8" /> {/* Icon space */}
						<div className="flex-1">{t("headers.description")}</div>
						<div className="w-16 text-right">{t("headers.qty")}</div>
						<div className="w-24 text-right">{t("headers.unitPrice")}</div>
						<div className="w-24 text-right">{t("headers.total")}</div>
						<div className="w-12 text-right">{t("headers.vat")}</div>
					</div>
					{/* Story 26.20: Animated list with AnimatePresence */}
					<AnimatePresence mode="popLayout">
						{tree.map((line) => renderLine(line, 0))}
					</AnimatePresence>
					{/* Empty state with subtle animation */}
					{tree.length === 0 && (
						<motion.div
							initial={{ opacity: 0 }}
							animate={{ opacity: 1 }}
							className="p-8 text-center text-muted-foreground"
						>
							{t("emptyState")}
						</motion.div>
					)}
				</div>
			</SortableContext>

			{/* Add Line Button (Story 26.17 UX Improvement) */}
			{!readOnly && onLineAdd && (
				<Button
					variant="outline"
					size="sm"
					className="mt-2 w-full border-dashed"
					onClick={onLineAdd}
				>
					<Plus className="mr-2 h-4 w-4" />
					{t("actions.addManualLine") || "Ajouter une ligne manuelle"}
				</Button>
			)}
			{/* Story 26.20: DragOverlay with glassmorphism effect */}
			<DragOverlay>
				{activeLine ? (
					<motion.div
						initial={{ scale: 1.02, opacity: 0.9 }}
						animate={{ scale: 1.05, opacity: 0.95 }}
						className="rounded-xl border border-white/30 bg-white/90 shadow-2xl backdrop-blur-lg dark:border-slate-600/50 dark:bg-slate-800/90"
					>
						<UniversalLineItemRow
							id={getLineId(activeLine)}
							type={activeLine.type}
							displayData={{
								label:
									activeLine.type === "GROUP"
										? `${activeLine.label || ""} (${getDescendantIds(lines, getLineId(activeLine)).length} items)`
										: activeLine.label || "",
								quantity: activeLine.quantity ?? 1,
								unitPrice: activeLine.unitPrice ?? 0,
								vatRate: activeLine.vatRate ?? 10,
								// Use calculateLineTotal for correct GROUP totals (H2, H4 fix)
								total: calculateLineTotal(activeLine, lines),
							}}
							sourceData={activeLine.sourceData ?? null}
							// Preserve correct depth in overlay (M2 fix)
							depth={getLineDepth(activeLine, lines)}
							isDragging
							disabled
						/>
					</motion.div>
				) : null}
			</DragOverlay>
		</DndContext>
	);
}

export default SortableQuoteLinesList;
