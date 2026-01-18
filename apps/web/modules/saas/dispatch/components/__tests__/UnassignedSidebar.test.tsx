import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { UnassignedSidebar } from "../UnassignedSidebar";
import { useMissions } from "../../hooks/useMissions";
import { useVehicleCategories } from "@saas/quotes/hooks/useVehicleCategories";

// Mock hooks
vi.mock("../../hooks/useMissions");
vi.mock("@saas/quotes/hooks/useVehicleCategories");
// Mock translation
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));
// Mock useDebounceValue to bypass debounce for testing logic flow
vi.mock("usehooks-ts", () => ({
  useDebounceValue: (val: string) => [val],
}));

describe("UnassignedSidebar Logic", () => {
    const mockOnSelect = vi.fn();
    
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useVehicleCategories).mockReturnValue({
            categories: [
                { id: "cat1", name: "Berline", code: "BER" },
                { id: "cat2", name: "Van", code: "VAN" },
            ],
            isLoading: false,
        } as unknown as ReturnType<typeof useVehicleCategories>);
        
        vi.mocked(useMissions).mockReturnValue({
            data: { 
                data: [], 
                meta: { total: 0, page: 1, limit: 50, totalPages: 0 } 
            },
            isLoading: false,
        } as unknown as ReturnType<typeof useMissions>);
    });

    it("initializes with unassignedOnly filter", () => {
        render(<UnassignedSidebar selectedMissionId={null} onSelectMission={mockOnSelect} />);
        
        expect(useMissions).toHaveBeenCalledWith(expect.objectContaining({
            filters: expect.objectContaining({
                unassignedOnly: true,
            })
        }));
    });

    it("updates search filter on input", async () => {
        render(<UnassignedSidebar selectedMissionId={null} onSelectMission={mockOnSelect} />);
        
        const input = screen.getByPlaceholderText("filters.searchPlaceholder");
        fireEvent.change(input, { target: { value: "Client Doe" } });
        
        // Since we mocked debounce to be instant, we check immediately
        await waitFor(() => {
            expect(useMissions).toHaveBeenCalledWith(expect.objectContaining({
                filters: expect.objectContaining({
                    unassignedOnly: true,
                    search: "Client Doe",
                })
            }));
        });
    });
});
