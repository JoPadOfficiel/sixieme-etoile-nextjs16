import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PromotionFormDialog } from "../PromotionFormDialog";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

// Mock VehicleCategorySelector
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

describe("PromotionFormDialog", () => {
	const mockOnSubmit = vi.fn();
	const mockOnOpenChange = vi.fn();

	const defaultProps = {
		open: true,
		onOpenChange: mockOnOpenChange,
		promotion: null,
		onSubmit: mockOnSubmit,
		isSubmitting: false,
	};

	it("renders and submits with vehicle category", async () => {
		render(<PromotionFormDialog {...defaultProps} />);

		// Fill required fields
		fireEvent.change(screen.getByTestId("code-input"), { target: { value: "PROMO2024" } });
		fireEvent.change(screen.getByTestId("value-input"), { target: { value: "10" } });
		fireEvent.change(screen.getByTestId("valid-from-input"), { target: { value: "2024-01-01" } });
		fireEvent.change(screen.getByTestId("valid-to-input"), { target: { value: "2024-12-31" } });

		// Select category
		const select = screen.getByTestId("vehicle-category-select-multi");
		fireEvent.change(select, { target: { value: JSON.stringify(["cat-1"]) } });

		// Submit
		fireEvent.click(screen.getByTestId("submit-button"));

		await waitFor(() => {
			expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
				code: "PROMO2024",
				vehicleCategoryIds: ["cat-1"],
			}));
		});
	});
});
