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
// Mock UI components if necessary, or rely on JSDOM
// Select component from Shadcn might need pointer events mocking or simple interaction

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
        } as any);
        
        vi.mocked(useMissions).mockReturnValue({
            data: { 
                data: [], 
                meta: { total: 0, page: 1, limit: 50, totalPages: 0 } 
            },
            isLoading: false,
        } as any);
    });

    it("initializes with unassignedOnly filter", () => {
        render(<UnassignedSidebar selectedMissionId={null} onSelectMission={mockOnSelect} />);
        
        expect(useMissions).toHaveBeenCalledWith(expect.objectContaining({
            filters: expect.objectContaining({
                unassignedOnly: true,
            })
        }));
    });

    it("updates search filter on input", () => {
        render(<UnassignedSidebar selectedMissionId={null} onSelectMission={mockOnSelect} />);
        
        const input = screen.getByPlaceholderText("filters.searchPlaceholder");
        fireEvent.change(input, { target: { value: "Client Doe" } });
        
        // Assert useMissions called with new search
        expect(useMissions).toHaveBeenCalledWith(expect.objectContaining({
            filters: expect.objectContaining({
                unassignedOnly: true,
                search: "Client Doe",
            })
        }));
    });
});
