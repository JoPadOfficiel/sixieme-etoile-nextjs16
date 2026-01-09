import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { MultiZoneSelect } from "../MultiZoneSelect";
import { PricingZone } from "../../types";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string, params?: any) => {
        if (key === "routes.form.zonesSelected") return `${params.count} selected`;
        return key;
    },
}));

// Mock ZoneMapPickerDialog
vi.mock("../ZoneMapPickerDialog", () => ({
    ZoneMapPickerDialog: () => <div data-testid="zone-map-picker-dialog" />
}));

const mockZones: PricingZone[] = [
	{ id: "z1", name: "Zone Paris", code: "PAR", city: "Paris", isActive: true } as any,
	{ id: "z2", name: "Zone Lyon", code: "LYO", city: "Lyon", isActive: true } as any,
	{ id: "z3", name: "Zone Marseille", code: "MRS", city: "Marseille", isActive: true } as any,
];

describe("MultiZoneSelect", () => {
	const mockOnChange = vi.fn();

	const defaultProps = {
		zones: mockZones,
		selectedIds: [],
		onChange: mockOnChange,
	};

	it("renders with default placeholder", () => {
		render(<MultiZoneSelect {...defaultProps} />);
		expect(screen.getByText("routes.form.selectZones")).toBeInTheDocument();
	});

	it("renders with selected count", () => {
		render(<MultiZoneSelect {...defaultProps} selectedIds={["z1", "z2"]} />);
		expect(screen.getByText("2 selected")).toBeInTheDocument();
	});

	it("renders badges for selected zones", () => {
		render(<MultiZoneSelect {...defaultProps} selectedIds={["z1"]} />);
		expect(screen.getByTestId("zone-badge")).toHaveTextContent("Zone Paris");
	});

	it("opens popover and lists zones", async () => {
		render(<MultiZoneSelect {...defaultProps} />);
		
		fireEvent.click(screen.getByTestId("multi-zone-select"));
		
		expect(screen.getByPlaceholderText("routes.form.searchZones")).toBeVisible();
		expect(screen.getByText("Zone Paris")).toBeVisible();
		expect(screen.getByText("Zone Lyon")).toBeVisible();
	});

	it("calls onChange when selecting a zone", () => {
		render(<MultiZoneSelect {...defaultProps} />);
		
		fireEvent.click(screen.getByTestId("multi-zone-select"));
		fireEvent.click(screen.getByText("Zone Paris"));
		
		expect(mockOnChange).toHaveBeenCalledWith(["z1"]);
	});

	it("calls onChange when unselecting a zone from list", () => {
		render(<MultiZoneSelect {...defaultProps} selectedIds={["z1"]} />);
		
		fireEvent.click(screen.getByTestId("multi-zone-select"));
        
        // "Zone Paris" appears in the Badge and in the List
        // We want to click the one in the list.
        // The list item is a button containing the text.
        // The badge is a wrapper, the remove button inside has sr-only "Remove".
        
        // Find the button that contains this text.
        const buttons = screen.getAllByRole("button");
        const listOption = buttons.find(b => b.textContent?.includes("Zone Paris") && !b.getAttribute("data-testid")?.includes("multi-zone-select"));
        
		fireEvent.click(listOption!);
		
		expect(mockOnChange).toHaveBeenCalledWith([]);
	});

    it("searches and filters zones", () => {
        render(<MultiZoneSelect {...defaultProps} />);
        
        fireEvent.click(screen.getByTestId("multi-zone-select"));
        const searchInput = screen.getByPlaceholderText("routes.form.searchZones");
        
        fireEvent.change(searchInput, { target: { value: "Lyon" } });
        
        expect(screen.queryByText("Zone Paris")).not.toBeInTheDocument();
        expect(screen.getByText("Zone Lyon")).toBeVisible();
    });

    it("removes zone when clicking badge X", () => {
        render(<MultiZoneSelect {...defaultProps} selectedIds={["z1", "z2"]} />);
        
        // Find the remove button for Zone Paris (z1)
        // Since we have multiple badges, we need to be specific.
        // The badge text contains "Zone Paris".
        const badges = screen.getAllByTestId("zone-badge");
        const parisBadge = badges.find(b => b.textContent?.includes("Zone Paris"));
        
        // click the button inside
        const removeBtn = parisBadge!.querySelector("button");
        fireEvent.click(removeBtn!);
        
        expect(mockOnChange).toHaveBeenCalledWith(["z2"]);
    });
});
