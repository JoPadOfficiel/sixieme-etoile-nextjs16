/**
 * Story 26.6: InlineInput Component Tests
 *
 * Tests for click-to-edit inline input functionality.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { InlineInput } from "../inline-input";

describe("InlineInput", () => {
  describe("AC1 & AC2: Click to edit with auto-focus", () => {
    it("should display value as text initially", () => {
      render(<InlineInput value="Test Value" onChange={vi.fn()} />);

      expect(screen.getByText("Test Value")).toBeInTheDocument();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });

    it("should switch to edit mode and auto-focus on click", async () => {
      const user = userEvent.setup();
      render(<InlineInput value="Test" onChange={vi.fn()} />);

      await user.click(screen.getByText("Test"));

      const input = screen.getByRole("textbox");
      expect(input).toBeInTheDocument();
      expect(input).toHaveFocus();
      expect(input).toHaveValue("Test");
    });

    it("should select all text when entering edit mode", async () => {
      const user = userEvent.setup();
      render(<InlineInput value="Select Me" onChange={vi.fn()} />);

      await user.click(screen.getByText("Select Me"));

      const input = screen.getByRole("textbox") as HTMLInputElement;
      expect(input.selectionStart).toBe(0);
      expect(input.selectionEnd).toBe("Select Me".length);
    });
  });

  describe("AC3: Enter commits value", () => {
    it("should commit value on Enter key", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<InlineInput value="Old" onChange={onChange} />);

      await user.click(screen.getByText("Old"));
      await user.clear(screen.getByRole("textbox"));
      await user.type(screen.getByRole("textbox"), "New{Enter}");

      expect(onChange).toHaveBeenCalledWith("New");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("New")).toBeInTheDocument();
    });

    it("should not call onChange if value unchanged", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<InlineInput value="Same" onChange={onChange} />);

      await user.click(screen.getByText("Same"));
      await user.keyboard("{Enter}");

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("AC4: Escape cancels edit", () => {
    it("should cancel edit on Escape key", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<InlineInput value="Original" onChange={onChange} />);

      await user.click(screen.getByText("Original"));
      await user.clear(screen.getByRole("textbox"));
      await user.type(screen.getByRole("textbox"), "Changed");
      await user.keyboard("{Escape}");

      expect(onChange).not.toHaveBeenCalled();
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Original")).toBeInTheDocument();
    });
  });

  describe("AC5: Blur commits value", () => {
    it("should commit value on blur", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<InlineInput value="Initial" onChange={onChange} />);

      await user.click(screen.getByText("Initial"));
      await user.clear(screen.getByRole("textbox"));
      await user.type(screen.getByRole("textbox"), "Updated");
      await user.tab(); // Trigger blur

      expect(onChange).toHaveBeenCalledWith("Updated");
      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    });
  });

  describe("AC6: Layout stability", () => {
    it("should maintain wrapper element in both modes", () => {
      const { rerender } = render(
        <InlineInput value="Test Value" onChange={vi.fn()} />
      );

      // Read mode - span exists
      const span = screen.getByText("Test Value");
      expect(span.tagName.toLowerCase()).toBe("span");

      // Switch to edit mode
      fireEvent.click(span);

      // Edit mode - input exists, same structure
      const input = screen.getByRole("textbox");
      expect(input.tagName.toLowerCase()).toBe("input");
    });

    it("should apply minWidth to prevent layout shift", () => {
      render(
        <InlineInput value="X" onChange={vi.fn()} minWidth="5rem" />
      );

      const span = screen.getByText("X");
      expect(span).toHaveStyle({ minWidth: "5rem" });
    });
  });

  describe("AC7: Type support", () => {
    it("should support number type", async () => {
      const onChange = vi.fn();
      const user = userEvent.setup();
      render(<InlineInput value="42" onChange={onChange} type="number" />);

      await user.click(screen.getByText("42"));

      const input = screen.getByRole("textbox");
      expect(input).toHaveAttribute("type", "number");
    });

    it("should apply formatValue for display", () => {
      render(
        <InlineInput
          value="100"
          onChange={vi.fn()}
          formatValue={(v) => `$${v}`}
        />
      );

      expect(screen.getByText("$100")).toBeInTheDocument();
    });
  });

  describe("AC8: Placeholder support", () => {
    it("should show placeholder when value is empty", () => {
      render(
        <InlineInput value="" onChange={vi.fn()} placeholder="Enter text..." />
      );

      expect(screen.getByText("Enter text...")).toBeInTheDocument();
    });

    it("should show value instead of placeholder when value exists", () => {
      render(
        <InlineInput
          value="Has Value"
          onChange={vi.fn()}
          placeholder="Enter text..."
        />
      );

      expect(screen.getByText("Has Value")).toBeInTheDocument();
      expect(screen.queryByText("Enter text...")).not.toBeInTheDocument();
    });
  });

  describe("AC9: Disabled state", () => {
    it("should not enter edit mode when disabled", async () => {
      const user = userEvent.setup();
      render(<InlineInput value="Disabled" onChange={vi.fn()} disabled />);

      await user.click(screen.getByText("Disabled"));

      expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
      expect(screen.getByText("Disabled")).toBeInTheDocument();
    });

    it("should have disabled styling when disabled", () => {
      render(<InlineInput value="Disabled" onChange={vi.fn()} disabled />);

      const span = screen.getByText("Disabled");
      expect(span).toHaveClass("cursor-not-allowed");
      expect(span).toHaveClass("opacity-60");
    });
  });

  describe("Keyboard navigation", () => {
    it("should enter edit mode on Enter key when focused", async () => {
      const user = userEvent.setup();
      render(<InlineInput value="Focus Me" onChange={vi.fn()} />);

      const span = screen.getByText("Focus Me");
      span.focus();
      await user.keyboard("{Enter}");

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });

    it("should enter edit mode on Space key when focused", async () => {
      const user = userEvent.setup();
      render(<InlineInput value="Space Test" onChange={vi.fn()} />);

      const span = screen.getByText("Space Test");
      span.focus();
      await user.keyboard(" ");

      expect(screen.getByRole("textbox")).toBeInTheDocument();
    });
  });

  describe("onValueChange callback", () => {
    it("should call onValueChange on every keystroke", async () => {
      const onValueChange = vi.fn();
      const user = userEvent.setup();
      render(
        <InlineInput
          value="Start"
          onChange={vi.fn()}
          onValueChange={onValueChange}
        />
      );

      await user.click(screen.getByText("Start"));
      await user.type(screen.getByRole("textbox"), "ABC");

      expect(onValueChange).toHaveBeenCalledTimes(3);
    });
  });

  describe("Text alignment", () => {
    it("should apply left alignment by default", () => {
      render(<InlineInput value="Left" onChange={vi.fn()} />);

      const span = screen.getByText("Left");
      expect(span).toHaveClass("text-left");
    });

    it("should apply right alignment when specified", () => {
      render(<InlineInput value="Right" onChange={vi.fn()} align="right" />);

      const span = screen.getByText("Right");
      expect(span).toHaveClass("text-right");
    });

    it("should apply center alignment when specified", () => {
      render(<InlineInput value="Center" onChange={vi.fn()} align="center" />);

      const span = screen.getByText("Center");
      expect(span).toHaveClass("text-center");
    });
  });
});
