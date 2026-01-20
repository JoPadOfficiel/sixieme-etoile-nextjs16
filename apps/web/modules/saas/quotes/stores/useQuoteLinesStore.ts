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

			deselectAll: () =>
				set({ selectedLineIds: new Set(), lastSelectedId: null }),

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

					// 1. Identify lines to duplicate
					// We need to duplicate selected lines.
					// IF a Group is selected, we should also duplicate its children even if they aren't explicitly in selectedLineIds
					// (Standard behavior for "Duplicate Group"). Or we strictly follow selection.
					// The Story notes say: "Les lignes GROUP sélectionnées incluent implicitement leurs enfants pour les actions".
					// So we must expand selection to include descendants for the operation.

					const effectiveIdsToDuplicate = new Set<string>(selectedLineIds);

					// Expand selection to include children of selected groups
					lines.forEach((line) => {
						if (selectedLineIds.has(getLineId(line)) && line.type === "GROUP") {
							const descendants = getDescendantIds(lines, getLineId(line));
							descendants.forEach((childId) =>
								effectiveIdsToDuplicate.add(childId),
							);
						}
					});

					// 2. Create map of Old ID -> New ID
					const idMap = new Map<string, string>();
					effectiveIdsToDuplicate.forEach((oldId) => {
						const newTempId = `dup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
						idMap.set(oldId, newTempId);
					});

					// 3. Create duplicates with remapped IDs and ParentIDs
					const duplicates: QuoteLine[] = [];
					const newSelectedIds = new Set<string>(); // We will select the NEW items

					// Process lines in order to maintain relative sorting
					lines.forEach((line) => {
						const oldId = getLineId(line);
						if (effectiveIdsToDuplicate.has(oldId)) {
							const newId = idMap.get(oldId)!;

							// Check if parent was also duplicated
							let newParentId = line.parentId;
							if (line.parentId && idMap.has(line.parentId)) {
								newParentId = idMap.get(line.parentId) ?? null; // Should exist
							}

							const duplicate: QuoteLine = {
								...line,
								id: undefined, // Clear DB ID
								tempId: newId,
								parentId: newParentId,
								// We will adjust sortOrder later
							};

							duplicates.push(duplicate);
							newSelectedIds.add(newId);
						}
					});

					// 4. Insert duplicates
					// Strategy: Insert the whole block of duplicates after the *last* item of the *last* selected original block.
					// This keeps duplicates together.

					// Find insertion index: last index of any line in the effective set
					let lastIndex = -1;
					for (let i = lines.length - 1; i >= 0; i--) {
						if (effectiveIdsToDuplicate.has(getLineId(lines[i]))) {
							lastIndex = i;
							break;
						}
					}

					const newLines = [
						...lines.slice(0, lastIndex + 1),
						...duplicates,
						...lines.slice(lastIndex + 1),
					];

					// 5. Re-index sortOrder for everyone to be clean
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
