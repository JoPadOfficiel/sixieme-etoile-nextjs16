import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdvancedRateList } from "../AdvancedRateList";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

describe("AdvancedRateList", () => {
    const defaultProps = {
        rates: [],
        isLoading: false,
        typeFilter: "all" as const,
        statusFilter: "all" as const,
        onTypeFilterChange: vi.fn(),
        onStatusFilterChange: vi.fn(),
        onEdit: vi.fn(),
        onDelete: vi.fn(),
    };

    it("renders loading skeletons when isLoading is true", () => {
        render(<AdvancedRateList {...defaultProps} isLoading={true} />);
        
        // Skeletons usually have no text, but we can check if table rows are present
        // The implementation renders 5 loading rows
        const rows = screen.getAllByRole("row");
        // 1 header + 5 loading rows = 6
        expect(rows).toHaveLength(6);
    });

    it("renders empty state when no data and not loading", () => {
        render(<AdvancedRateList {...defaultProps} rates={[]} isLoading={false} />);
        
        expect(screen.getByText("empty.title")).toBeInTheDocument();
    });

    it("renders data rows when provided", () => {
        const mockRates = [
            { id: "1", name: "Rate 1", appliesTo: "NIGHT", value: 10, isActive: true } as any
        ];
        render(<AdvancedRateList {...defaultProps} rates={mockRates} isLoading={false} />);
        
        expect(screen.getByText("Rate 1")).toBeInTheDocument();
        expect(screen.queryByText("empty.title")).not.toBeInTheDocument();
    });
});
