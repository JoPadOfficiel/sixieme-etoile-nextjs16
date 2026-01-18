import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { UniversalLineItemRow, QuoteLine } from "../UniversalLineItemRow";

describe("UniversalLineItemRow", () => {
  const mockOnUpdate = vi.fn();
  const mockOnToggleExpand = vi.fn();

  const manualLine: QuoteLine = {
    id: "line-1",
    type: "MANUAL",
    label: "Manual Service",
    quantity: 1,
    unitPrice: 100,
    vatRate: 20,
  };

  const calculatedLine: QuoteLine = {
    id: "line-2",
    type: "CALCULATED",
    label: "Paris -> Lyon",
    quantity: 1,
    unitPrice: 500,
    sourceData: {
      pickupAddress: "Paris",
      dropoffAddress: "Lyon",
    },
  };

  const groupLine: QuoteLine = {
    id: "line-3",
    type: "GROUP",
    label: "Day 1",
  };

  it("renders MANUAL line correctly", () => {
    const { container } = render(
      <UniversalLineItemRow
        line={manualLine}
        depth={0}
        index={0}
        onUpdate={mockOnUpdate}
      />
    );
    // Check for Text icon container (approximate check via class or content)
    // In real implementation we might mock icons, but here we check structure via snapshot or text
    expect(screen.getByText("Manual Service")).toBeDefined();
    expect(screen.getByDisplayValue("100")).toBeDefined();
    expect(container.firstChild).toHaveClass("bg-white");
  });

  it("renders CALCULATED line with Link indicator", () => {
    render(
      <UniversalLineItemRow
        line={calculatedLine}
        depth={1}
        index={1}
        onUpdate={mockOnUpdate}
      />
    );
    expect(screen.getByText("Paris -> Lyon")).toBeDefined();
    // Check indentation
    const row = screen.getByText("Paris -> Lyon").closest(".group");
    // depth 1 * 24 + 12 = 36px
    expect(row).toHaveStyle({ paddingLeft: "36px" });
  });

  it("renders GROUP line with distinct style", () => {
    const { container } = render(
      <UniversalLineItemRow
        line={groupLine}
        depth={0}
        index={2}
        onUpdate={mockOnUpdate}
        onToggleExpand={mockOnToggleExpand}
      />
    );
    expect(screen.getByText("Day 1")).toBeDefined();
    expect(container.firstChild).toHaveClass("font-medium");
  });
    
  it("calls onToggleExpand when group header is clicked", () => {
    const { container } = render(
      <UniversalLineItemRow
        line={groupLine}
        depth={0}
        index={2}
        onUpdate={mockOnUpdate}
        onToggleExpand={mockOnToggleExpand}
      />
    );
    
    // Find the icon wrapper which has the onClick handler
    // It's the div containing the chevron
    const toggleButton = container.querySelector('.cursor-pointer');
    if (toggleButton) {
      fireEvent.click(toggleButton);
      expect(mockOnToggleExpand).toHaveBeenCalledWith("line-3");
    } else {
      throw new Error("Toggle button not found");
    }
  });

  it("calls onUpdate when quantity changes", () => {
    render(
      <UniversalLineItemRow
        line={manualLine}
        depth={0}
        index={0}
        onUpdate={mockOnUpdate}
      />
    );
    
    const qtyInput = screen.getByDisplayValue("1");
    fireEvent.change(qtyInput, { target: { value: "2" } });
    
    expect(mockOnUpdate).toHaveBeenCalledWith("line-1", { quantity: 2 });
  });

  it("opens slash menu when '/' is typed in label", async () => {
    // Mock getBoundingClientRect for Popover positioning
    Element.prototype.getBoundingClientRect = vi.fn(() => ({
      width: 100,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 100,
      x: 0,
      y: 0,
      toJSON: () => {},
    }));

    // Mock scrollIntoView for Command list
    Element.prototype.scrollIntoView = vi.fn();
    
    // Mock ResizeObserver
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    render(
      <UniversalLineItemRow
        line={manualLine}
        depth={0}
        index={0}
        onUpdate={mockOnUpdate}
      />
    );

    // Click label to enter edit mode
    fireEvent.click(screen.getByText("Manual Service"));

    // Find input
    const input = screen.getByDisplayValue("Manual Service");
    
    // Type "/"
    fireEvent.change(input, { target: { value: "Manual Service /" } });

    // Check onUpdate was called
    expect(mockOnUpdate).toHaveBeenCalledWith("line-1", { label: "Manual Service /" });

    // Using findByText to wait for Popover animation/portal
    const menuOption = await screen.findByText("Heading");
    expect(menuOption).toBeDefined();
  });
});
