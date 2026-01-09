import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { OptionalFeeFormDialog } from "../OptionalFeeFormDialog";

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
			</select>
		</div>
	)},
}));

describe("OptionalFeeFormDialog", () => {
	const mockOnSubmit = vi.fn();
	const mockOnOpenChange = vi.fn();

	const defaultProps = {
		open: true,
		onOpenChange: mockOnOpenChange,
		fee: null,
		onSubmit: mockOnSubmit,
		isSubmitting: false,
	};

	it("renders and submits with vehicle category", async () => {
		render(<OptionalFeeFormDialog {...defaultProps} />);

		// Fill required fields
		fireEvent.change(screen.getByTestId("name-input"), { target: { value: "Child Seat" } });
		fireEvent.change(screen.getByTestId("amount-input"), { target: { value: "10" } });

		// Select category
		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: JSON.stringify(["cat-1"]) } });

		// Submit
		fireEvent.click(screen.getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
				name: "Child Seat",
				vehicleCategoryIds: ["cat-1"],
			}));
		});
	});
});
