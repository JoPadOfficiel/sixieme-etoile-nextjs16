"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef } from "react";
import { useStore } from "zustand";
import { useQuoteLinesStore } from "../../stores/useQuoteLinesStore";
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
}

export function YoloQuoteEditor({
	initialLines = [],
	readOnly = false,
	currency = "EUR",
	onChange,
}: YoloQuoteEditorProps) {
	const t = useTranslations("quotes.yolo");
	const { lines, setLines, updateLine } = useQuoteLinesStore();
	// Fix: useStore(useQuoteLinesStore.temporal) to subscribe to temporal state changes reactively
	const { undo, redo, pastStates, futureStates, clear } = useStore(
		useQuoteLinesStore.temporal,
	);

	// Ref to track if we've initialized to prevent re-init loops
	const initialized = useRef(false);
	// Track previous initialLines length to detect "Loading -> Loaded" transition
	const prevInitialLength = useRef(initialLines.length);

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

	// Keyboard Shortcuts (Undo/Redo)
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
		},
		[readOnly, undo, redo],
	);

	// Add global listener
	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleKeyDown]);

	return (
		<div className="space-y-4">
			{/* Optional Toolbar / Status Indicators */}
			<div className="flex items-center justify-between px-1">
				<div className="text-muted-foreground text-sm">
					{/* Could show selection count or total here */}
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
				</div>
			</div>

			<SortableQuoteLinesList
				lines={lines}
				onLinesChange={setLines}
				onLineUpdate={updateLine}
				readOnly={readOnly}
				currency={currency}
			/>
		</div>
	);
}

export default YoloQuoteEditor;
