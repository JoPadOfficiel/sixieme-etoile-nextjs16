import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SeasonalMultiplierFormDialog } from "../SeasonalMultiplierFormDialog";
import { CreateSeasonalMultiplierRequest, UpdateSeasonalMultiplierRequest } from "../../types/seasonal-multiplier";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

// Mock VehicleCategorySelector
// Mock VehicleCategorySelector
vi.mock("../../../../quotes/components/VehicleCategorySelector", () => ({
	VehicleCategorySelector: ({ value, onChange, onMultiChange, mode, disabled }: any) => {
        if (mode === 'multiple') {
            return (
                 <div data-testid="vehicle-category-selector-multi">
                    <input
                        data-testid="vehicle-category-select-multi"
                        value={JSON.stringify(value || [])}
                        onChange={(e) => {
                            onMultiChange(JSON.parse(e.target.value));
                        }}
                        disabled={disabled}
                    />
                </div>
            );
        }
		return (
		<div data-testid="vehicle-category-selector">
			<select
				data-testid="vehicle-category-select"
				value={value || ""}
				onChange={(e) => onChange(e.target.value)}
				disabled={disabled}
			>
				<option value="">All Categories</option>
				<option value="cat-1">Category 1</option>
				<option value="cat-2">Category 2</option>
			</select>
		</div>
	)},
}));

// Mock UI components if strictly necessary, but assuming they render standard HTML elements that testing-library can interact with.
// If Dialog relies on Radix, we might need to verify "open" state rendering.

describe("SeasonalMultiplierFormDialog", () => {
	const mockOnSubmit = vi.fn();
	const mockOnOpenChange = vi.fn();

	const defaultProps = {
		open: true,
		onOpenChange: mockOnOpenChange,
		multiplier: null,
		onSubmit: mockOnSubmit,
		isSubmitting: false,
	};

	it("renders correctly with empty vehicle category by default", () => {
		render(<SeasonalMultiplierFormDialog {...defaultProps} />);

		expect(screen.getByTestId("multiplier-dialog")).toBeInTheDocument();
		const select = screen.getByTestId("vehicle-category-select-multi") as HTMLInputElement;
		expect(select.value).toBe("[]");
	});

	it("renders correctly with existing vehicle category", () => {
		const multiplier = {
			id: "1",
			name: "Test Multiplier",
			description: "Test Desc",
			startDate: "2023-01-01T00:00:00.000Z",
			endDate: "2023-01-31T00:00:00.000Z",
			multiplier: 1.5,
			priority: 1,
			isActive: true,
            status: "active" as const,
			vehicleCategoryIds: ["cat-1"],
            vehicleCategoryNames: ["Category 1"],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
		};

		render(
			<SeasonalMultiplierFormDialog
				{...defaultProps}
				multiplier={multiplier}
			/>
		);

		const select = screen.getByTestId("vehicle-category-select-multi") as HTMLInputElement;
		expect(JSON.parse(select.value)).toContain("cat-1");
	});

	it("updates vehicle category state on selection", () => {
		render(<SeasonalMultiplierFormDialog {...defaultProps} />);

		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: JSON.stringify(["cat-2"]) } });

		expect((select as HTMLInputElement).value).toBe('["cat-2"]');
	});

	it("submits the form with selected vehicle category", async () => {
		render(<SeasonalMultiplierFormDialog {...defaultProps} />);

        // Fill required fields
        fireEvent.change(screen.getByTestId("name-input"), { target: { value: "New Multiplier" } });
        fireEvent.change(screen.getByTestId("start-date-input"), { target: { value: "2024-01-01" } });
        fireEvent.change(screen.getByTestId("end-date-input"), { target: { value: "2024-01-31" } });
        fireEvent.change(screen.getByTestId("multiplier-input"), { target: { value: "1.2" } });

		// Select category
		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: JSON.stringify(["cat-1"]) } });

		// Submit
		fireEvent.click(screen.getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
				name: "New Multiplier",
				vehicleCategoryIds: ["cat-1"],
			}));
		});
	});

    it("submits the form with null vehicle category if 'All Categories' is selected", async () => {
		render(<SeasonalMultiplierFormDialog {...defaultProps} />);

        // Fill required fields
        fireEvent.change(screen.getByTestId("name-input"), { target: { value: "New Multiplier" } });
        fireEvent.change(screen.getByTestId("start-date-input"), { target: { value: "2024-01-01" } });
        fireEvent.change(screen.getByTestId("end-date-input"), { target: { value: "2024-01-31" } });
        fireEvent.change(screen.getByTestId("multiplier-input"), { target: { value: "1.2" } });

		// Select category (already empty/All, but explicit)
		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: "[]" } });

		// Submit
		fireEvent.click(screen.getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
				name: "New Multiplier",
				vehicleCategoryIds: [],
			}));
		});
	});
});
