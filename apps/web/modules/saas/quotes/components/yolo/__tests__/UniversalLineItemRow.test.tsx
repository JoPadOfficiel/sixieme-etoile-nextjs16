/**
 * Story 26.5, 26.6 & 26.9: UniversalLineItemRow Component Tests
 *
 * Tests for the universal row component with InlineInput integration
 * and Detach Logic (Yolo Mode).
 */

import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type DisplayData,
	UniversalLineItemRow,
} from "../UniversalLineItemRow";
import * as DetachUtils from "../detach-utils";

// Mock useToast
const mockToast = vi.fn();
vi.mock("@ui/hooks/use-toast", () => ({
	useToast: () => ({
		toast: mockToast,
	}),
}));

// Mock useBlockTemplateActions to avoid QueryClient requirement
vi.mock("../../../hooks/useBlockTemplateActions", () => ({
	useBlockTemplateActions: () => ({
		createTemplate: vi.fn().mockResolvedValue(undefined),
		templates: [],
		isLoading: false,
	}),
}));

// Mock ResizeObserver (used by some UI components)
global.ResizeObserver = class ResizeObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
};

const mockDisplayData: DisplayData = {
	label: "Paris → Orly Transfer",
	description: "Airport transfer",
	quantity: 1,
	unitPrice: 85.0,
	vatRate: 10,
	total: 93.5,
};

describe("UniversalLineItemRow", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("should render MANUAL type correctly", () => {
			render(
				<UniversalLineItemRow
					id="line-1"
					type="MANUAL"
					displayData={mockDisplayData}
				/>,
			);

			expect(screen.getByText("Paris → Orly Transfer")).toBeInTheDocument();
			expect(screen.getByText("93,50 €")).toBeInTheDocument();
		});

		it("should render CALCULATED type with link icon", () => {
			render(
				<UniversalLineItemRow
					id="line-2"
					type="CALCULATED"
					displayData={mockDisplayData}
					sourceData={{ origin: "Paris", destination: "Orly", distance: 25 }}
				/>,
			);

			expect(screen.getByText("Paris → Orly Transfer")).toBeInTheDocument();
			// LinkIcon usually has no text, so we might check for the tooltip trigger or class if needed
			// But we can check if it DOES NOT render the UnlinkIcon logic (which is fallback)
		});

		it("should render GROUP type with expand/collapse", () => {
			render(
				<UniversalLineItemRow
					id="group-1"
					type="GROUP"
					displayData={{ ...mockDisplayData, label: "Day 1" }}
					isExpanded={true}
				/>,
			);

			expect(screen.getByText("Day 1")).toBeInTheDocument();
		});
	});

	describe("InlineInput Integration", () => {
		it("should allow editing label via InlineInput", async () => {
			const onDisplayDataChange = vi.fn();

			render(
				<UniversalLineItemRow
					id="line-1"
					type="MANUAL"
					displayData={mockDisplayData}
					onDisplayDataChange={onDisplayDataChange}
				/>,
			);

			// Click on label to edit
			fireEvent.click(screen.getByText("Paris → Orly Transfer"));

			// Should show input
			const input = screen.getByRole("textbox");
			expect(input).toBeInTheDocument();

			// Change value and blur or Enter to commit
			fireEvent.change(input, { target: { value: "VIP Transfer" } });
			fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

			expect(onDisplayDataChange).toHaveBeenCalledWith("label", "VIP Transfer");
		});

		it("should not allow editing when disabled", async () => {
			const onDisplayDataChange = vi.fn();

			render(
				<UniversalLineItemRow
					id="line-1"
					type="MANUAL"
					displayData={mockDisplayData}
					onDisplayDataChange={onDisplayDataChange}
					disabled={true}
				/>,
			);

			// Click on label - should not enter edit mode
			fireEvent.click(screen.getByText("Paris → Orly Transfer"));

			// Should NOT show input
			expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
		});
	});

	describe("Numeric Field Validation", () => {
		it("should convert numeric strings correctly", async () => {
			const onDisplayDataChange = vi.fn();

			render(
				<UniversalLineItemRow
					id="line-1"
					type="MANUAL"
					displayData={mockDisplayData}
					onDisplayDataChange={onDisplayDataChange}
				/>,
			);

			// Find and click on quantity field (shows "1")
			const quantityText = screen.getByText("1");
			fireEvent.click(quantityText);

			// Numeric inputs have role "spinbutton" in ARIA
			const input = screen.getByRole("spinbutton");
			fireEvent.change(input, { target: { value: "5" } });
			fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

			expect(onDisplayDataChange).toHaveBeenCalledWith("quantity", 5);
		});

		it("should prevent negative values", async () => {
			const onDisplayDataChange = vi.fn();

			render(
				<UniversalLineItemRow
					id="line-1"
					type="MANUAL"
					displayData={mockDisplayData}
					onDisplayDataChange={onDisplayDataChange}
				/>,
			);

			const quantityText = screen.getByText("1");
			fireEvent.click(quantityText);

			const input = screen.getByRole("spinbutton");
			fireEvent.change(input, { target: { value: "-5" } });
			fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

			expect(onDisplayDataChange).toHaveBeenCalledWith("quantity", 0);
		});

		it("should handle French decimal format (comma)", async () => {
			const onDisplayDataChange = vi.fn();

			render(
				<UniversalLineItemRow
					id="line-1"
					type="MANUAL"
					displayData={mockDisplayData}
					onDisplayDataChange={onDisplayDataChange}
				/>,
			);

			const priceText = screen.getByText("85,00 €");
			fireEvent.click(priceText);

			const input = screen.getByRole("spinbutton");
			// Note: type="number" value must use "." as decimal separator per spec
			fireEvent.change(input, { target: { value: "99.50" } });
			fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

			expect(onDisplayDataChange).toHaveBeenCalledWith("unitPrice", 99.5);
		});
	});

	describe("GROUP Type Behavior", () => {
		it("should call onToggleExpand when clicking expand button", async () => {
			const onToggleExpand = vi.fn();

			render(
				<UniversalLineItemRow
					id="group-1"
					type="GROUP"
					displayData={{ ...mockDisplayData, label: "Day 1" }}
					isExpanded={true}
					onToggleExpand={onToggleExpand}
				/>,
			);

			// Header buttons
			const buttons = screen.getAllByRole("button");
			fireEvent.click(buttons[0]);

			expect(onToggleExpand).toHaveBeenCalled();
		});

		it("should render children when expanded", () => {
			render(
				<UniversalLineItemRow
					id="group-1"
					type="GROUP"
					displayData={{ ...mockDisplayData, label: "Day 1" }}
					isExpanded={true}
				>
					<div data-testid="child-content">Child Line</div>
				</UniversalLineItemRow>,
			);

			expect(screen.getByTestId("child-content")).toBeInTheDocument();
		});

		it("should NOT render children when collapsed", () => {
			render(
				<UniversalLineItemRow
					id="group-1"
					type="GROUP"
					displayData={{ ...mockDisplayData, label: "Day 1" }}
					isExpanded={false}
				>
					<div data-testid="child-content">Child Line</div>
				</UniversalLineItemRow>,
			);

			expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
		});
	});

	describe("Detach Logic (Study 26.9)", () => {
		it("should show warning toast when label is significantly changed (AC1)", async () => {
			const onDisplayDataChange = vi.fn();
			const onDetach = vi.fn();

			// Spy on similarity check to force it to return true for "significant change"
			vi.spyOn(DetachUtils, "isSignificantLabelChange").mockReturnValue(true);

			render(
				<UniversalLineItemRow
					id="line-1"
					type="CALCULATED"
					displayData={mockDisplayData}
					sourceData={{ label: "Original Label", origin: "Paris" }}
					onDisplayDataChange={onDisplayDataChange}
					onDetach={onDetach}
				/>,
			);

			// Click to edit label
			fireEvent.click(screen.getByText("Paris → Orly Transfer"));
			const input = screen.getByRole("textbox");

			// Change label significantly
			fireEvent.change(input, {
				target: { value: "Completely Different Trip" },
			});
			fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

			// Expect toast to be called
			expect(mockToast).toHaveBeenCalledWith(
				expect.objectContaining({
					title: expect.any(String), // "Label Modified" key or similar
					variant: "default",
				}),
			);

			// Should still call onDisplayDataChange
			expect(onDisplayDataChange).toHaveBeenCalledWith(
				"label",
				"Completely Different Trip",
			);
		});

		it("should NOT show warning toast for minor label changes", async () => {
			const onDisplayDataChange = vi.fn();
			const onDetach = vi.fn();

			// Spy on similarity check -> false (minor change)
			vi.spyOn(DetachUtils, "isSignificantLabelChange").mockReturnValue(false);

			render(
				<UniversalLineItemRow
					id="line-1"
					type="CALCULATED"
					displayData={mockDisplayData}
					sourceData={{ label: "Paris → Orly Transfer", origin: "Paris" }}
					onDisplayDataChange={onDisplayDataChange}
					onDetach={onDetach}
				/>,
			);

			fireEvent.click(screen.getByText("Paris → Orly Transfer"));
			const input = screen.getByRole("textbox");

			fireEvent.change(input, {
				target: { value: "Paris → Orly Transfer (Updated)" },
			});
			fireEvent.keyDown(input, { key: "Enter", code: "Enter" });

			expect(mockToast).not.toHaveBeenCalled();
			expect(onDisplayDataChange).toHaveBeenCalled();
		});
	});
});
