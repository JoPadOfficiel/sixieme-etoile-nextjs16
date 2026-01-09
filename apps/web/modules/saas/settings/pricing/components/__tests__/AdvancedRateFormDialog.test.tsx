import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { AdvancedRateFormDialog } from "../AdvancedRateFormDialog";

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

describe("AdvancedRateFormDialog", () => {
	const mockOnSubmit = vi.fn();
	const mockOnOpenChange = vi.fn();

	const defaultProps = {
		open: true,
		onOpenChange: mockOnOpenChange,
		rate: null,
		zones: [],
		onSubmit: mockOnSubmit,
		isSubmitting: false,
	};

	it("renders and submits with single vehicle category (simulated as array)", async () => {
		render(<AdvancedRateFormDialog {...defaultProps} />);

		// Fill required fields
		fireEvent.change(screen.getByTestId("name-input"), { target: { value: "Night Rate" } });
		fireEvent.change(screen.getByTestId("value-input"), { target: { value: "20" } });
        fireEvent.change(screen.getByTestId("start-time-input"), { target: { value: "22:00" } });
        fireEvent.change(screen.getByTestId("end-time-input"), { target: { value: "06:00" } });

		// Select category
		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: JSON.stringify(["cat-1"]) } });

		// Submit
		fireEvent.click(screen.getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
				name: "Night Rate",
				vehicleCategoryIds: ["cat-1"],
			}));
		});
	});

    it("renders and submits with multiple vehicle categories", async () => {
		render(<AdvancedRateFormDialog {...defaultProps} />);

		fireEvent.change(screen.getByTestId("name-input"), { target: { value: "Multi Rate" } });
		fireEvent.change(screen.getByTestId("value-input"), { target: { value: "15" } });
        fireEvent.change(screen.getByTestId("start-time-input"), { target: { value: "22:00" } });
        fireEvent.change(screen.getByTestId("end-time-input"), { target: { value: "06:00" } });

		// Select multiple categories
		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: JSON.stringify(["cat-1", "cat-2"]) } });

		fireEvent.click(screen.getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
				name: "Multi Rate",
				vehicleCategoryIds: ["cat-1", "cat-2"],
			}));
		});
	});

    it("renders and submits with 'All Categories' (empty array)", async () => {
		render(<AdvancedRateFormDialog {...defaultProps} />);

		fireEvent.change(screen.getByTestId("name-input"), { target: { value: "Global Rate" } });
		fireEvent.change(screen.getByTestId("value-input"), { target: { value: "10" } });
        fireEvent.change(screen.getByTestId("start-time-input"), { target: { value: "22:00" } });
        fireEvent.change(screen.getByTestId("end-time-input"), { target: { value: "06:00" } });

		// Clear categories (empty array)
		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: JSON.stringify([]) } });
        
		fireEvent.click(screen.getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
				name: "Global Rate",
				vehicleCategoryIds: [],
			}));
		});
	});
	it("calls onOpenChange(false) when cancelled", () => {
		render(<AdvancedRateFormDialog {...defaultProps} />);
		
		fireEvent.click(screen.getByText("form.cancel"));
		
		expect(mockOnOpenChange).toHaveBeenCalledWith(false);
	});
});
