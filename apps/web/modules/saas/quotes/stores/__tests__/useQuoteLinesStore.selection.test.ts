/**
 * Story 26.19: Selection Store Tests
 *
 * Tests for the selection state and bulk actions in useQuoteLinesStore.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { useQuoteLinesStore } from "../useQuoteLinesStore";

describe("useQuoteLinesStore selection", () => {
	beforeEach(() => {
		// Reset store state before each test
		useQuoteLinesStore.setState({
			lines: [
				{ tempId: "line-1", type: "MANUAL", label: "Line 1", quantity: 1, unitPrice: 100 },
				{ tempId: "line-2", type: "MANUAL", label: "Line 2", quantity: 2, unitPrice: 50 },
				{ tempId: "line-3", type: "MANUAL", label: "Line 3", quantity: 1, unitPrice: 200 },
				{ tempId: "line-4", type: "GROUP", label: "Group 1", quantity: 1, unitPrice: 0 },
				{ tempId: "line-5", type: "MANUAL", label: "Line 5", quantity: 1, unitPrice: 75, parentId: "line-4" },
			],
			selectedLineIds: new Set(),
			lastSelectedId: null,
		});
	});

	describe("selectLine", () => {
		it("should select a single line", () => {
			const { selectLine } = useQuoteLinesStore.getState();

			selectLine("line-1");

			const { selectedLineIds, lastSelectedId } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(true);
			expect(selectedLineIds.size).toBe(1);
			expect(lastSelectedId).toBe("line-1");
		});

		it("should add to existing selection", () => {
			const { selectLine } = useQuoteLinesStore.getState();

			selectLine("line-1");
			selectLine("line-2");

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(true);
			expect(selectedLineIds.has("line-2")).toBe(true);
			expect(selectedLineIds.size).toBe(2);
		});
	});

	describe("deselectLine", () => {
		it("should deselect a line", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-1", "line-2"]),
			});

			const { deselectLine } = useQuoteLinesStore.getState();
			deselectLine("line-1");

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(false);
			expect(selectedLineIds.has("line-2")).toBe(true);
			expect(selectedLineIds.size).toBe(1);
		});
	});

	describe("toggleLineSelection", () => {
		it("should select an unselected line", () => {
			const { toggleLineSelection } = useQuoteLinesStore.getState();

			toggleLineSelection("line-1");

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(true);
		});

		it("should deselect a selected line", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-1"]),
			});

			const { toggleLineSelection } = useQuoteLinesStore.getState();
			toggleLineSelection("line-1");

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(false);
		});
	});

	describe("selectRange", () => {
		it("should select all lines between two indices", () => {
			const { selectRange } = useQuoteLinesStore.getState();

			selectRange("line-1", "line-3");

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(true);
			expect(selectedLineIds.has("line-2")).toBe(true);
			expect(selectedLineIds.has("line-3")).toBe(true);
			expect(selectedLineIds.size).toBe(3);
		});

		it("should work in reverse order", () => {
			const { selectRange } = useQuoteLinesStore.getState();

			selectRange("line-3", "line-1");

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(true);
			expect(selectedLineIds.has("line-2")).toBe(true);
			expect(selectedLineIds.has("line-3")).toBe(true);
		});

		it("should add to existing selection", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-5"]),
			});

			const { selectRange } = useQuoteLinesStore.getState();
			selectRange("line-1", "line-2");

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.has("line-1")).toBe(true);
			expect(selectedLineIds.has("line-2")).toBe(true);
			expect(selectedLineIds.has("line-5")).toBe(true);
			expect(selectedLineIds.size).toBe(3);
		});
	});

	describe("selectAll", () => {
		it("should select all lines", () => {
			const { selectAll } = useQuoteLinesStore.getState();

			selectAll();

			const { selectedLineIds, lines } = useQuoteLinesStore.getState();
			expect(selectedLineIds.size).toBe(lines.length);
		});
	});

	describe("deselectAll", () => {
		it("should deselect all lines", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-1", "line-2", "line-3"]),
				lastSelectedId: "line-3",
			});

			const { deselectAll } = useQuoteLinesStore.getState();
			deselectAll();

			const { selectedLineIds, lastSelectedId } = useQuoteLinesStore.getState();
			expect(selectedLineIds.size).toBe(0);
			expect(lastSelectedId).toBeNull();
		});
	});

	describe("deleteSelected", () => {
		it("should remove selected lines", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-2"]),
			});

			const { deleteSelected } = useQuoteLinesStore.getState();
			deleteSelected();

			const { lines, selectedLineIds } = useQuoteLinesStore.getState();
			expect(lines.length).toBe(4);
			expect(lines.find((l) => l.tempId === "line-2")).toBeUndefined();
			expect(selectedLineIds.size).toBe(0);
		});

		it("should remove multiple selected lines", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-1", "line-3"]),
			});

			const { deleteSelected } = useQuoteLinesStore.getState();
			deleteSelected();

			const { lines } = useQuoteLinesStore.getState();
			expect(lines.length).toBe(3);
			expect(lines.find((l) => l.tempId === "line-1")).toBeUndefined();
			expect(lines.find((l) => l.tempId === "line-3")).toBeUndefined();
		});

		it("should remove GROUP and its children when GROUP is selected", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-4"]),
			});

			const { deleteSelected } = useQuoteLinesStore.getState();
			deleteSelected();

			const { lines } = useQuoteLinesStore.getState();
			expect(lines.length).toBe(3);
			expect(lines.find((l) => l.tempId === "line-4")).toBeUndefined();
			expect(lines.find((l) => l.tempId === "line-5")).toBeUndefined();
		});

		it("should do nothing when no lines are selected", () => {
			const { deleteSelected } = useQuoteLinesStore.getState();
			deleteSelected();

			const { lines } = useQuoteLinesStore.getState();
			expect(lines.length).toBe(5);
		});
	});

	describe("duplicateSelected", () => {
		it("should duplicate selected lines", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-2"]),
			});

			const { duplicateSelected } = useQuoteLinesStore.getState();
			duplicateSelected();

			const { lines } = useQuoteLinesStore.getState();
			expect(lines.length).toBe(6);

			// Find the duplicate
			const duplicates = lines.filter(
				(l) => l.label === "Line 2" && l.tempId !== "line-2",
			);
			expect(duplicates.length).toBe(1);
			expect(duplicates[0].quantity).toBe(2);
			expect(duplicates[0].unitPrice).toBe(50);
		});

		it("should select duplicated lines after duplication", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-1"]),
			});

			const { duplicateSelected } = useQuoteLinesStore.getState();
			duplicateSelected();

			const { selectedLineIds, lines } = useQuoteLinesStore.getState();
			// Original should not be selected, only the duplicate
			expect(selectedLineIds.has("line-1")).toBe(false);
			expect(selectedLineIds.size).toBe(1);

			// The new line should be selected
			const newLine = lines.find(
				(l) => l.label === "Line 1" && l.tempId !== "line-1",
			);
			expect(newLine).toBeDefined();
			expect(selectedLineIds.has(newLine!.tempId!)).toBe(true);
		});

		it("should duplicate multiple selected lines", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-1", "line-2"]),
			});

			const { duplicateSelected } = useQuoteLinesStore.getState();
			duplicateSelected();

			const { lines, selectedLineIds } = useQuoteLinesStore.getState();
			expect(lines.length).toBe(7);
			expect(selectedLineIds.size).toBe(2);
		});

		it("should do nothing when no lines are selected", () => {
			const { duplicateSelected } = useQuoteLinesStore.getState();
			duplicateSelected();

			const { lines } = useQuoteLinesStore.getState();
			expect(lines.length).toBe(5);
		});
	});

	describe("setLines clears selection", () => {
		it("should clear selection when lines are replaced", () => {
			useQuoteLinesStore.setState({
				selectedLineIds: new Set(["line-1", "line-2"]),
			});

			const { setLines } = useQuoteLinesStore.getState();
			setLines([{ tempId: "new-line", type: "MANUAL", label: "New Line" }]);

			const { selectedLineIds } = useQuoteLinesStore.getState();
			expect(selectedLineIds.size).toBe(0);
		});
	});
});
