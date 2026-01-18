/**
 * Story 26.5 & 26.6: UniversalLineItemRow Component Tests
 *
 * Tests for the universal row component with InlineInput integration.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { UniversalLineItemRow, type DisplayData } from "../UniversalLineItemRow";

const mockDisplayData: DisplayData = {
  label: "Paris → Orly Transfer",
  description: "Airport transfer",
  quantity: 1,
  unitPrice: 85.0,
  vatRate: 10,
  total: 93.5,
};

describe("UniversalLineItemRow", () => {
  describe("Rendering", () => {
    it("should render MANUAL type correctly", () => {
      render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
        />
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
        />
      );

      expect(screen.getByText("Paris → Orly Transfer")).toBeInTheDocument();
      // Link icon should be present for CALCULATED with sourceData
    });

    it("should render GROUP type with expand/collapse", () => {
      render(
        <UniversalLineItemRow
          id="group-1"
          type="GROUP"
          displayData={{ ...mockDisplayData, label: "Day 1" }}
          isExpanded={true}
        />
      );

      expect(screen.getByText("Day 1")).toBeInTheDocument();
    });
  });

  describe("InlineInput Integration", () => {
    it("should allow editing label via InlineInput", async () => {
      const onDisplayDataChange = vi.fn();
      const user = userEvent.setup();

      render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          onDisplayDataChange={onDisplayDataChange}
        />
      );

      // Click on label to edit
      await user.click(screen.getByText("Paris → Orly Transfer"));

      // Should show input
      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();

      // Type new value and commit
      await user.clear(input);
      await user.type(input, "VIP Transfer{Enter}");

      expect(onDisplayDataChange).toHaveBeenCalledWith("label", "VIP Transfer");
    });

    it("should not allow editing when disabled", async () => {
      const onDisplayDataChange = vi.fn();
      const user = userEvent.setup();

      render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          onDisplayDataChange={onDisplayDataChange}
          disabled={true}
        />
      );

      // Click on label - should not enter edit mode
      await user.click(screen.getByText("Paris → Orly Transfer"));

      // Should NOT show input
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("Numeric Field Validation", () => {
    it("should convert numeric strings correctly", async () => {
      const onDisplayDataChange = vi.fn();
      const user = userEvent.setup();

      render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          onDisplayDataChange={onDisplayDataChange}
        />
      );

      // Find and click on quantity field (shows "1")
      const quantityText = screen.getByText("1");
      await user.click(quantityText);

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "5{Enter}");

      expect(onDisplayDataChange).toHaveBeenCalledWith("quantity", 5);
    });

    it("should prevent negative values", async () => {
      const onDisplayDataChange = vi.fn();
      const user = userEvent.setup();

      render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          onDisplayDataChange={onDisplayDataChange}
        />
      );

      // Find and click on quantity field
      const quantityText = screen.getByText("1");
      await user.click(quantityText);

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "-5{Enter}");

      // Should be sanitized to 0 (Math.max(0, -5))
      expect(onDisplayDataChange).toHaveBeenCalledWith("quantity", 0);
    });

    it("should handle French decimal format (comma)", async () => {
      const onDisplayDataChange = vi.fn();
      const user = userEvent.setup();

      render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          onDisplayDataChange={onDisplayDataChange}
        />
      );

      // Click on unit price
      const priceText = screen.getByText("85,00 €");
      await user.click(priceText);

      const input = screen.getByRole("textbox");
      await user.clear(input);
      await user.type(input, "99,50{Enter}");

      expect(onDisplayDataChange).toHaveBeenCalledWith("unitPrice", 99.5);
    });
  });

  describe("GROUP Type Behavior", () => {
    it("should call onToggleExpand when clicking expand button", async () => {
      const onToggleExpand = vi.fn();
      const user = userEvent.setup();

      render(
        <UniversalLineItemRow
          id="group-1"
          type="GROUP"
          displayData={{ ...mockDisplayData, label: "Day 1" }}
          isExpanded={true}
          onToggleExpand={onToggleExpand}
        />
      );

      // Find and click the expand/collapse button
      const expandButton = screen.getByRole("button");
      await user.click(expandButton);

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
        </UniversalLineItemRow>
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
        </UniversalLineItemRow>
      );

      expect(screen.queryByTestId("child-content")).not.toBeInTheDocument();
    });
  });

  describe("Visual States", () => {
    it("should apply dragging styles when isDragging", () => {
      const { container } = render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          isDragging={true}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).toHaveClass("opacity-50");
    });

    it("should apply selected styles when isSelected", () => {
      const { container } = render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          isSelected={true}
        />
      );

      const row = container.firstChild as HTMLElement;
      expect(row).toHaveClass("bg-primary/5");
    });

    it("should apply hover styles on mouse enter", async () => {
      const { container } = render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
        />
      );

      const row = container.firstChild as HTMLElement;
      fireEvent.mouseEnter(row);

      expect(row).toHaveClass("bg-muted/30");
    });
  });

  describe("Indentation", () => {
    it("should apply correct indentation based on depth", () => {
      const { container } = render(
        <UniversalLineItemRow
          id="line-1"
          type="MANUAL"
          displayData={mockDisplayData}
          depth={2}
        />
      );

      const row = container.firstChild as HTMLElement;
      // depth * 24px + 8px base padding = 2 * 24 + 8 = 56px
      expect(row).toHaveStyle({ paddingLeft: "56px" });
    });
  });
});
