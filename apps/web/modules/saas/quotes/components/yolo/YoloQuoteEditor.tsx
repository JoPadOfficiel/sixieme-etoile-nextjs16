"use client";

import { Button } from "@ui/components/button";
import { FolderPlusIcon, PlusIcon } from "lucide-react";
import { BookmarkPlusIcon, UploadCloudIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { useState } from "react";
import { useStore } from "zustand";
import { useQuoteLinesStore } from "../../stores/useQuoteLinesStore";
import { LoadQuoteTemplateDialog } from "./LoadQuoteTemplateDialog";
import { SaveQuoteTemplateDialog } from "./SaveQuoteTemplateDialog";
import { SelectionToolbar } from "./SelectionToolbar";
import { SortableQuoteLinesList } from "./SortableQuoteLinesList";
import type { QuoteLine } from "./dnd-utils";

/**
 * Story 26.14: YoloQuoteEditor
 *
 * Main editor component for Yolo Mode billing.
 * Integrates the Zustand store (with Zundo history) and the SortableQuoteLinesList.
 * Handles keyboard shortcuts for Undo/Redo.
 */

interface YoloQuoteEditorProps {
	/** Initial lines to populate the editor */
	initialLines?: QuoteLine[];
	/** Whether the editor is read-only */
	readOnly?: boolean;
	/** Currency code for display */
	currency?: string;
	/** Callback when lines change (for auto-save or parent sync) */
	onChange?: (lines: QuoteLine[]) => void;
	/** Callback when edit line is requested */
	onEditLine?: (line: QuoteLine) => void;
}

export function YoloQuoteEditor({
	initialLines = [],
	readOnly = false,
	currency = "EUR",
	onChange,
	onEditLine,
}: YoloQuoteEditorProps) {
	const t = useTranslations("quotes.yolo");
	const tTemplates = useTranslations("quotes.templates");
	const {
		lines,
		setLines,
		updateLine,
		// Story 26.19: Selection state and actions
		selectedLineIds,
		selectAll,
		deselectAll,
		deleteSelected,
		duplicateSelected,
	} = useQuoteLinesStore();
	// Fix: useStore(useQuoteLinesStore.temporal) to subscribe to temporal state changes reactively
	const { undo, redo, pastStates, futureStates, clear } = useStore(
		useQuoteLinesStore.temporal,
	);

	// Ref to track if we've initialized to prevent re-init loops
	const initialized = useRef(false);
	// Track previous initialLines length to detect "Loading -> Loaded" transition
	const prevInitialLength = useRef(initialLines.length);

	// Story 26.21: Template Dialog State
	const [saveDialogOpen, setSaveDialogOpen] = useState(false);
	const [loadDialogOpen, setLoadDialogOpen] = useState(false);

	const handleLoadLines = useCallback(
		(newLines: QuoteLine[], mode: "replace" | "append") => {
			if (mode === "replace") {
				useQuoteLinesStore.setState({ lines: newLines });
				clear(); // Clear history to start fresh
			} else {
				useQuoteLinesStore.setState((state) => ({
					lines: [...state.lines, ...newLines],
				}));
			}
		},
		[clear],
	);

	// Initialize store state
	useEffect(() => {
		if (!initialized.current) {
			useQuoteLinesStore.setState({ lines: initialLines });
			clear(); // Clear history after init so we can't undo initialization
			initialized.current = true;
		} else if (prevInitialLength.current === 0 && initialLines.length > 0) {
			// Late initialization: If we started with empty lines (loading) and now have data,
			// update the store. This prevents overwriting user edits on normal re-renders,
			// but ensures data appears when it finishes loading.
			useQuoteLinesStore.setState({ lines: initialLines });
			clear();
		}
		prevInitialLength.current = initialLines.length;
	}, [initialLines, clear]);

	// Sync back to parent (autosave hook)
	useEffect(() => {
		if (onChange) {
			onChange(lines);
		}
	}, [lines, onChange]);

	// Keyboard Shortcuts (Undo/Redo + Story 26.19: Selection shortcuts)
	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			if (readOnly) return;

			// Check for Cmd+Z or Ctrl+Z
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
				if (e.shiftKey) {
					// Redo: Cmd+Shift+Z or Ctrl+Shift+Z
					e.preventDefault();
					redo();
				} else {
					// Undo: Cmd+Z or Ctrl+Z
					e.preventDefault();
					undo();
				}
			}
			// Check for Ctrl+Y (Redo on Windows commonly)
			else if (e.ctrlKey && e.key.toLowerCase() === "y") {
				e.preventDefault();
				redo();
			}
			// Story 26.19: Cmd/Ctrl+A to select all
			else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "a") {
				e.preventDefault();
				selectAll();
			}
			// Story 26.19: Escape to deselect all
			else if (e.key === "Escape") {
				deselectAll();
			}
			// Story 26.19: Delete/Backspace to delete selected
			else if (
				(e.key === "Delete" || e.key === "Backspace") &&
				selectedLineIds.size > 0
			) {
				// Only trigger if not in an input field
				const target = e.target as HTMLElement;
				if (
					target.tagName !== "INPUT" &&
					target.tagName !== "TEXTAREA" &&
					!target.isContentEditable
				) {
					e.preventDefault();
					deleteSelected();
				}
			}
		},
		[
			readOnly,
			undo,
			redo,
			selectAll,
			deselectAll,
			deleteSelected,
			selectedLineIds,
		],
	);

	// Add global listener
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [lines.length, t]);

	// Handler: Edit selected line (only when exactly one is selected)
	const handleEditSelected = useCallback(() => {
		if (selectedLineIds.size === 1 && onEditLine) {
			const selectedId = Array.from(selectedLineIds)[0];
			const selectedLine = lines.find((line) => getLineId(line) === selectedId);
			if (selectedLine) {
				onEditLine(selectedLine);
			}
		}
	}, [selectedLineIds, lines, onEditLine]);

	// Story 26.17 UX: Handle manual line addition from UI button
	const handleManualAdd = useCallback(() => {
		const newLine: QuoteLine = {
			tempId: `manual-${Date.now()}`,
			type: "MANUAL",
			label: "Nouvelle ligne", // Placeholder
			description: "",
			quantity: 1,
			unitPrice: 0,
			totalPrice: 0,
			vatRate: 10,
			sortOrder: lines.length,
			parentId: null,
			displayData: {
				label: "Nouvelle ligne",
				quantity: 1,
				unitPrice: 0,
				vatRate: 10,
				total: 0,
			},
		};
		// Directly update store to trigger history tracking
		useQuoteLinesStore.setState((state) => ({
			lines: [...state.lines, newLine],
		}));
	}, [lines.length]);

	/**
	 * Story 26.17: Handle group addition
	 */
	const handleAddGroup = useCallback(() => {
		const newGroup: QuoteLine = {
			tempId: `group-${Date.now()}`,
			type: "GROUP",
			label: t("actions.newGroup") || "Nouveau Groupe",
			description: "",
			quantity: 1,
			unitPrice: 0,
			totalPrice: 0,
			vatRate: 0,
			sortOrder: lines.length,
			parentId: null,
			displayData: {
				label: t("actions.newGroup") || "Nouveau Groupe",
				quantity: 1,
				unitPrice: 0,
				vatRate: 0,
				total: 0,
			},
		};

		useQuoteLinesStore.setState((state) => ({
			lines: [...state.lines, newGroup],
		}));
	}, [lines.length, t]);

	return (
		<div className="space-y-4">
			{/* Optional Toolbar / Status Indicators */}
			<div className="flex items-center justify-between px-1">
				<div className="text-muted-foreground text-sm">
					{/* Story 26.19: Show selection count */}
					{selectedLineIds.size > 0 && (
						<span>
							{selectedLineIds.size} ligne{selectedLineIds.size > 1 ? "s" : ""}{" "}
							sélectionnée{selectedLineIds.size > 1 ? "s" : ""}
						</span>
					)}
				</div>
				<div className="flex space-x-2">
					<button
						type="button"
						onClick={() => undo()}
						disabled={pastStates.length === 0 || readOnly}
						className="rounded border px-2 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-40"
						title={t("actions.undo") || "Undo (Cmd+Z)"}
					>
						Undo
					</button>
					<button
						type="button"
						onClick={() => redo()}
						disabled={futureStates.length === 0 || readOnly}
						className="rounded border px-2 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-40"
						title={t("actions.redo") || "Redo (Cmd+Shift+Z)"}
					>
						Redo
					</button>
					<div className="mx-1 h-6 w-px bg-border" />
					<button
						type="button"
						onClick={() => setSaveDialogOpen(true)}
						disabled={readOnly || lines.length === 0}
						className="flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-40"
						title={tTemplates("saveQuoteAsTemplate") || "Save as Template"}
					>
						<BookmarkPlusIcon className="h-3 w-3" />
						<span className="sr-only sm:not-sr-only">
							{tTemplates("saveButton") || "Save Tpl"}
						</span>
					</button>
					<button
						type="button"
						onClick={() => setLoadDialogOpen(true)}
						disabled={readOnly}
						className="flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors hover:bg-muted disabled:opacity-40"
						title={tTemplates("loadTemplate") || "Load Template"}
					>
						<UploadCloudIcon className="h-3 w-3" />
						<span className="sr-only sm:not-sr-only">
							{tTemplates("loadButton") || "Load Tpl"}
						</span>
					</button>
				</div>
			</div>

			{/* Story 26.21: Template Dialogs */}
			<SaveQuoteTemplateDialog
				isOpen={saveDialogOpen}
				onOpenChange={setSaveDialogOpen}
				lines={lines}
			/>
			<LoadQuoteTemplateDialog
				isOpen={loadDialogOpen}
				onOpenChange={setLoadDialogOpen}
				currentLinesCount={lines.length}
				onLoadLines={handleLoadLines}
			/>

			<SortableQuoteLinesList
				lines={lines}
				onLinesChange={setLines}
				onLineUpdate={updateLine}
				readOnly={readOnly}
				currency={currency}
				onLineAdd={handleManualAdd}
				onEditLine={onEditLine}
			/>

			{/* Story 26.17: Explicit Action Buttons */}
			{!readOnly && (
				<div className="mt-4 flex gap-2">
					<Button
						variant="outline"
						size="sm"
						onClick={handleManualAdd}
						className="flex-1 border-dashed text-muted-foreground hover:bg-muted/50 hover:text-foreground"
					>
						<PlusIcon className="mr-2 h-4 w-4" />
						{t("actions.addManualLine") || "Ajouter ligne"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={handleAddGroup}
						className="flex-1 border-dashed text-muted-foreground hover:bg-muted/50 hover:text-foreground"
					>
						<FolderPlusIcon className="mr-2 h-4 w-4" />
						{t("actions.addGroup") || "Ajouter groupe"}
					</Button>
				</div>
			)}

			{/* Story 26.19: Selection Toolbar */}
			{!readOnly && (
				<SelectionToolbar
					selectedCount={selectedLineIds.size}
					onDelete={deleteSelected}
					onDuplicate={duplicateSelected}
					onEdit={selectedLineIds.size === 1 ? handleEditSelected : undefined}
					onDeselect={deselectAll}
				/>
			)}
		</div>
	);
}

export default YoloQuoteEditor;
