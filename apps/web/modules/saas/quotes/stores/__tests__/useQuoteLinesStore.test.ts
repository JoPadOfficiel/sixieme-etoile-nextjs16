import { act } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { QuoteLine } from "../../components/yolo/dnd-utils";
import { useQuoteLinesStore } from "../useQuoteLinesStore";

describe("useQuoteLinesStore", () => {
	const initialLines: QuoteLine[] = [
		{
			id: "1",
			type: "CALCULATED",
			label: "Item 1",
			quantity: 1,
			unitPrice: 100,
		},
	];

	beforeEach(() => {
		act(() => {
			useQuoteLinesStore.setState({ lines: initialLines });
			useQuoteLinesStore.temporal.getState().clear();
		});
	});

	it("should initialize with lines", () => {
		const { lines } = useQuoteLinesStore.getState();
		expect(lines).toEqual(initialLines);
	});

	it("should update lines and track history", () => {
		const newLines: QuoteLine[] = [
			...initialLines,
			{ id: "2", type: "MANUAL", label: "Item 2", quantity: 2, unitPrice: 50 },
		];

		act(() => {
			useQuoteLinesStore.getState().setLines(newLines);
		});

		const { lines } = useQuoteLinesStore.getState();
		expect(lines).toHaveLength(2);
		expect(useQuoteLinesStore.temporal.getState().pastStates).toHaveLength(1);
	});

	it("should undo changes", () => {
		const newLines: QuoteLine[] = [
			...initialLines,
			{ id: "2", type: "MANUAL", label: "Item 2", quantity: 2, unitPrice: 50 },
		];

		act(() => {
			useQuoteLinesStore.getState().setLines(newLines);
		});

		expect(useQuoteLinesStore.getState().lines).toHaveLength(2);

		act(() => {
			useQuoteLinesStore.temporal.getState().undo();
		});

		expect(useQuoteLinesStore.getState().lines).toHaveLength(1);
		expect(useQuoteLinesStore.getState().lines[0].id).toBe("1");
	});

	it("should redo changes", () => {
		const newLines: QuoteLine[] = [
			...initialLines,
			{ id: "2", type: "MANUAL", label: "Item 2", quantity: 2, unitPrice: 50 },
		];

		act(() => {
			useQuoteLinesStore.getState().setLines(newLines);
			useQuoteLinesStore.temporal.getState().undo();
		});

		expect(useQuoteLinesStore.getState().lines).toHaveLength(1);

		act(() => {
			useQuoteLinesStore.temporal.getState().redo();
		});

		expect(useQuoteLinesStore.getState().lines).toHaveLength(2);
	});

	it("should respect the limit of 50 history steps", () => {
		// This test might be a bit rigorous for integration but good sanity check if zundo options work
		act(() => {
			useQuoteLinesStore.temporal.getState().clear();
			// Only set lines clears history? No, clear() does.
			// Initial state is already set in beforeEach
		});

		// 55 updates
		for (let i = 0; i < 55; i++) {
			act(() => {
				useQuoteLinesStore
					.getState()
					.setLines([{ ...initialLines[0], quantity: i }]);
			});
		}

		expect(
			useQuoteLinesStore.temporal.getState().pastStates.length,
		).toBeLessThanOrEqual(50);
	});
});
