import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MissionGanttCard } from "../MissionGanttCard";
import type { GanttMission } from "../types";
import { TooltipProvider } from "@ui/components/tooltip";

// Mock Tooltip components to avoid issues with Radix UI in tests if needed, 
// but usually rendering them is fine. If JSDOM has issues, we might mock.
// For now, let's try direct rendering.

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

describe("MissionGanttCard", () => {
    const baseMission: GanttMission = {
        id: "mission-1",
        title: "Airport Transfer",
        clientName: "Acme Corp",
        startAt: new Date("2024-01-01T10:00:00"),
        endAt: new Date("2024-01-01T11:00:00"),
        status: "ASSIGNED",
        type: "CALCULATED",
        pickupAddress: "CDG Airport",
        dropoffAddress: "Paris Center",
    };

    it("renders mission information correctly", () => {
        render(
            <TooltipProvider>
                <MissionGanttCard
                    mission={baseMission}
                    left={100}
                    width={200}
                    isSelected={false}
                />
            </TooltipProvider>
        );

        expect(screen.getByText("Acme Corp")).toBeInTheDocument();
        expect(screen.getByText(/CALCULATED • Airport Transfer/)).toBeInTheDocument();
    });

    it("applies correct styles for CALCULATED mission", () => {
        const { container } = render(
            <TooltipProvider>
                <MissionGanttCard
                    mission={{ ...baseMission, type: "CALCULATED" }}
                    left={100}
                    width={200}
                    isSelected={false}
                />
            </TooltipProvider>
        );

        // The first child is the div with the styling (TooltipTrigger renders asChild)
        const card = container.firstElementChild;
        expect(card).toHaveClass("border-solid");
    });

    it("applies correct styles for MANUAL mission", () => {
        const { container } = render(
            <TooltipProvider>
                <MissionGanttCard
                    mission={{ ...baseMission, type: "MANUAL" }}
                    left={100}
                    width={200}
                    isSelected={false}
                />
            </TooltipProvider>
        );

        const card = container.firstElementChild;
        expect(card).toHaveClass("border-dashed");
    });

    it("applies correct styles for PENDING status", () => {
        const { container } = render(
            <TooltipProvider>
                <MissionGanttCard
                    mission={{ ...baseMission, status: "PENDING" }}
                    left={100}
                    width={200}
                    isSelected={false}
                />
            </TooltipProvider>
        );

        const card = container.firstElementChild;
        expect(card).toHaveClass("bg-amber-100");
    });

    it("renders tooltip content on hover (simulated via snapshot or check)", () => {
        // Since Tooltip content is rendered in a Portal or requires user interaction, 
        // unit testing the trigger is often enough. 
        // But we can snapshot the component to ensure structure.
        const { asFragment } = render(
            <TooltipProvider>
                <MissionGanttCard
                    mission={baseMission}
                    left={100}
                    width={200}
                    isSelected={false}
                />
            </TooltipProvider>
        );
        expect(asFragment()).toMatchSnapshot();
    });
});
