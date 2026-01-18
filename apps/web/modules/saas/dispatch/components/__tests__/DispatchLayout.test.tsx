
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { DispatchLayout } from "../shell/DispatchLayout";
import { DispatchSidebar } from "../shell/DispatchSidebar";

// Mock dependencies
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key === "title" ? "Dispatch" : key,
}));

vi.mock("@ui/components/button", () => ({
  Button: ({ children, onClick, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

// Mock DispatchHeader as it's tested separately
vi.mock("../shell/DispatchHeader", () => ({
  DispatchHeader: () => <div data-testid="dispatch-header">Header</div>,
}));

describe("DispatchLayout", () => {
  const defaultProps = {
    sidebar: <div data-testid="sidebar">Sidebar Content</div>,
    inspector: <div data-testid="inspector">Inspector Content</div>,
    children: <div data-testid="main">Main Content</div>,
    isSidebarCollapsed: false,
    onSidebarToggle: vi.fn(),
  };

  it("renders the 3-column layout components correctly", () => {
    render(<DispatchLayout {...defaultProps} />);
    expect(screen.getByTestId("dispatch-header")).toBeInTheDocument();
    expect(screen.getByTestId("sidebar")).toBeInTheDocument();
    expect(screen.getByTestId("main")).toBeInTheDocument();
    expect(screen.getByTestId("inspector")).toBeInTheDocument();
  });
});

describe("DispatchSidebar", () => {
  const onToggleMock = vi.fn();

  it("renders content and handles toggle click", () => {
    render(
      <DispatchSidebar isCollapsed={false} onToggle={onToggleMock}>
        <div data-testid="backlog-items">Items</div>
      </DispatchSidebar>
    );

    expect(screen.getByTestId("backlog-items")).toBeInTheDocument();
    
    // Test toggle click (assuming Chevron icon is inside the button)
    // The simplified mock button just renders children, so we look for the button itself if possible or just fire click on what we find.
    // However, our code has a button with icon. In the test, we can try to find by role 'button'.
    const buttons = screen.getAllByRole("button");
    const toggleButton = buttons[0]; 
    fireEvent.click(toggleButton);
    expect(onToggleMock).toHaveBeenCalledTimes(1);
  });

  it("applies collapsed styles when isCollapsed is true", () => {
    const { container } = render(
      <DispatchSidebar isCollapsed={true} onToggle={onToggleMock}>
        <div>Items</div>
      </DispatchSidebar>
    );
    // Check for width class that indicates collapsed state
    expect(container.firstChild).toHaveClass("w-[50px]");
  });
});
