
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { DispatchHeader } from "../shell/DispatchHeader";
import * as nuqs from "nuqs";

// Mock translations
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key === "title" ? "Dispatch" : key,
}));

// Mock nuqs
vi.mock("nuqs", () => ({
  useQueryState: vi.fn(),
  parseAsString: {
    withDefault: vi.fn().mockReturnValue("default_parser"),
  },
}));

describe("DispatchHeader", () => {
  const setViewModeMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    vi.mocked(nuqs.useQueryState).mockReturnValue(["gantt", setViewModeMock]);
  });

  it("renders correctly with title and view toggles", () => {
    render(<DispatchHeader />);
    expect(screen.getByText("Dispatch")).toBeInTheDocument();
    expect(screen.getByText("Gantt")).toBeInTheDocument();
    expect(screen.getByText("List")).toBeInTheDocument();
    expect(screen.getByText("Map")).toBeInTheDocument();
  });

  it("calls setViewMode with 'list' when List button is clicked", () => {
    render(<DispatchHeader />);
    const listButton = screen.getByText("List");
    fireEvent.click(listButton);
    expect(setViewModeMock).toHaveBeenCalledWith("list");
  });

  it("calls setViewMode with 'map' when Map button is clicked", () => {
    render(<DispatchHeader />);
    const mapButton = screen.getByText("Map");
    fireEvent.click(mapButton);
    expect(setViewModeMock).toHaveBeenCalledWith("map");
  });

  it("calls setViewMode with 'gantt' when Gantt button is clicked", () => {
    // Setup initial state as 'list' so we can switch back to gantt
    vi.mocked(nuqs.useQueryState).mockReturnValue(["list", setViewModeMock]);
    
    render(<DispatchHeader />);
    const ganttButton = screen.getByText("Gantt");
    fireEvent.click(ganttButton);
    expect(setViewModeMock).toHaveBeenCalledWith("gantt");
  });
});
