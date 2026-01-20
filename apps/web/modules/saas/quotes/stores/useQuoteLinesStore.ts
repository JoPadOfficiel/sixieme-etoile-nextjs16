import { temporal } from "zundo";
import { create } from "zustand";
import {
	type QuoteLine,
	getDescendantIds,
	getLineId,
} from "../components/yolo/dnd-utils";

interface QuoteLinesState {
	lines: QuoteLine[];
	setLines: (lines: QuoteLine[]) => void;
	updateLine: (id: string, data: Partial<QuoteLine>) => void;

	// Story 26.19: Selection State
	selectedLineIds: Set<string>;
	lastSelectedId: string | null;

	// Story 26.19: Selection Actions
	selectLine: (id: string) => void;
	deselectLine: (id: string) => void;
	toggleLineSelection: (id: string) => void;
	selectRange: (fromId: string, toId: string) => void;
	selectAll: () => void;
	deselectAll: () => void;

	// Story 26.19: Bulk Actions
	deleteSelected: () => void;
	duplicateSelected: () => void;
}

export const useQuoteLinesStore = create<QuoteLinesState>()(
	temporal(
		(set) => ({
			lines: [],
			setLines: (lines) => set({ lines, selectedLineIds: new Set() }),
			updateLine: (id, data) =>
				set((state) => ({
					lines: state.lines.map((line) =>
						getLineId(line) === id ? { ...line, ...data } : line,
					),
				})),

			// Story 26.19: Selection State
			selectedLineIds: new Set<string>(),
			lastSelectedId: null,

			// Story 26.19: Selection Actions
			selectLine: (id) =>
				set((state) => {
					const newSet = new Set(state.selectedLineIds);
					newSet.add(id);
					return { selectedLineIds: newSet, lastSelectedId: id };
				}),

			deselectLine: (id) =>
				set((state) => {
					const newSet = new Set(state.selectedLineIds);
					newSet.delete(id);
					return { selectedLineIds: newSet };
				}),

			toggleLineSelection: (id) =>
				set((state) => {
					const newSet = new Set(state.selectedLineIds);
					if (newSet.has(id)) {
						newSet.delete(id);
					} else {
						newSet.add(id);
					}
					return { selectedLineIds: newSet, lastSelectedId: id };
				}),

			selectRange: (fromId, toId) =>
				set((state) => {
					const { lines } = state;
					const fromIndex = lines.findIndex((l) => getLineId(l) === fromId);
					const toIndex = lines.findIndex((l) => getLineId(l) === toId);

					if (fromIndex === -1 || toIndex === -1) {
						return state;
					}

					const start = Math.min(fromIndex, toIndex);
					const end = Math.max(fromIndex, toIndex);

					const newSet = new Set(state.selectedLineIds);
					for (let i = start; i <= end; i++) {
						newSet.add(getLineId(lines[i]));
					}

					return { selectedLineIds: newSet, lastSelectedId: toId };
				}),

			selectAll: () =>
				set((state) => ({
					selectedLineIds: new Set(state.lines.map((l) => getLineId(l))),
				})),

			deselectAll: () => set({ selectedLineIds: new Set(), lastSelectedId: null }),

			// Story 26.19: Bulk Actions
			deleteSelected: () =>
				set((state) => {
					const { lines, selectedLineIds } = state;
					if (selectedLineIds.size === 0) return state;

					// Collect all IDs to delete (including descendants of selected GROUPs)
					const idsToDelete = new Set<string>();
					Array.from(selectedLineIds).forEach((id) => {
						idsToDelete.add(id);
						const line = lines.find((l) => getLineId(l) === id);
						if (line?.type === "GROUP") {
							const descendants = getDescendantIds(lines, id);
							descendants.forEach((descId) => {
								idsToDelete.add(descId);
							});
						}
					});

					const newLines = lines.filter(
						(line) => !idsToDelete.has(getLineId(line)),
					);

					return {
						lines: newLines,
						selectedLineIds: new Set(),
						lastSelectedId: null,
					};
				}),

			duplicateSelected: () =>
				set((state) => {
					const { lines, selectedLineIds } = state;
					if (selectedLineIds.size === 0) return state;

					// Find the last selected line's index for insertion point
					let lastSelectedIndex = -1;
					for (let i = lines.length - 1; i >= 0; i--) {
						if (selectedLineIds.has(getLineId(lines[i]))) {
							lastSelectedIndex = i;
							break;
						}
					}

					// Create duplicates
					const duplicates: QuoteLine[] = [];
					const newSelectedIds = new Set<string>();

					for (const line of lines) {
						const lineId = getLineId(line);
						if (selectedLineIds.has(lineId)) {
							const newTempId = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
							const duplicate: QuoteLine = {
								...line,
								id: undefined,
								tempId: newTempId,
								sortOrder: (line.sortOrder ?? 0) + 0.5,
							};
							duplicates.push(duplicate);
							newSelectedIds.add(newTempId);
						}
					}

					// Insert duplicates after the last selected line
					const newLines = [
						...lines.slice(0, lastSelectedIndex + 1),
						...duplicates,
						...lines.slice(lastSelectedIndex + 1),
					];

					// Recalculate sortOrder
					const sortedLines = newLines.map((line, index) => ({
						...line,
						sortOrder: index,
					}));

					return {
						lines: sortedLines,
						selectedLineIds: newSelectedIds,
						lastSelectedId: null,
					};
				}),
		}),
		{
			limit: 50,
			// Exclude selection state from history (only track lines changes)
			partialize: (state) => ({ lines: state.lines }),
		},
	),
);
