import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SortableQuoteLine } from "../SortableQuoteLine";
import { DndContext } from "@dnd-kit/core";

// Mock useSortable
vi.mock("@dnd-kit/sortable", () => ({
  useSortable: vi.fn(() => ({
    attributes: { role: "button" },
    listeners: { onKeyDown: vi.fn() },
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
    isOver: false,
  })),
}));

describe("SortableQuoteLine", () => {
  it("renders children and provides drag handles", () => {
    const renderChild = vi.fn(({ dragHandleProps }) => (
      <div {...dragHandleProps} data-testid="child">
        Child Content
      </div>
    ));

    render(
      <DndContext>
        <SortableQuoteLine id="test-1">
          {renderChild}
        </SortableQuoteLine>
      </DndContext>
    );

    expect(screen.getByTestId("child")).toBeDefined();
    expect(screen.getByText("Child Content")).toBeDefined();
    expect(renderChild).toHaveBeenCalledWith(
      expect.objectContaining({
        isDragging: false,
        isOver: false,
        dragHandleProps: expect.objectContaining({
          role: "button",
        }),
      })
    );
  });
});
