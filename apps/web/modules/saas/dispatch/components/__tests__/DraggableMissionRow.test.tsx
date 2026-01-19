import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { DraggableMissionRow } from "../DraggableMissionRow";
import { useDraggable } from "@dnd-kit/core";
import type { MissionListItem } from "../../types";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: (scope?: string) => (key: string) => scope ? `${scope}.${key}` : key,
}));

// Mock dnd-kit
vi.mock("@dnd-kit/core", () => ({
	useDraggable: vi.fn(() => ({
		attributes: {},
		listeners: {},
		setNodeRef: vi.fn(),
		transform: null,
		isDragging: false,
	})),
}));

describe("DraggableMissionRow", () => {
	const mockMission: MissionListItem = {
		id: "mission-1",
		quoteId: "quote-1",
		pickupAt: "2025-11-28T14:30:00Z",
		pickupAddress: "123 Rue de Paris, 75001 Paris",
		dropoffAddress: "456 Avenue des Champs-Élysées, 75008 Paris",
		pickupLatitude: 48.8566,
		pickupLongitude: 2.3522,
		dropoffLatitude: 48.8738,
		dropoffLongitude: 2.2950,
		passengerCount: 2,
		luggageCount: 2,
		finalPrice: 150,
		contact: {
			id: "contact-1",
			displayName: "John Doe",
			isPartner: false,
		},
		vehicleCategory: {
			id: "cat-1",
			name: "Sedan",
			code: "SEDAN",
		},
		assignment: null,
		profitability: {
			marginPercent: 25,
			level: "green",
		},
		compliance: {
			status: "OK",
			warnings: [],
		},
		isSubcontracted: false,
		subcontractor: null,
	};

	it("renders successfully and contains MissionRow", () => {
		render(
			<DraggableMissionRow
				mission={mockMission}
				isSelected={false}
				onSelect={vi.fn()}
			/>
		);

		expect(screen.getByTestId("mission-row")).toBeInTheDocument();
	});

	it("calls onSelect when clicked", () => {
		const onSelect = vi.fn();
		render(
			<DraggableMissionRow
				mission={mockMission}
				isSelected={false}
				onSelect={onSelect}
			/>
		);

		fireEvent.click(screen.getByTestId("mission-row"));
		expect(onSelect).toHaveBeenCalledWith("mission-1");
	});

	it("applies dragging styles when isDragging is true", () => {
		vi.mocked(useDraggable).mockReturnValueOnce({
			attributes: {
				role: "button",
				tabIndex: 0,
				"aria-disabled": false,
				"aria-pressed": false,
				"aria-roledescription": "draggable",
				"aria-describedby": "DndDescribedBy-0",
			},
			listeners: {},
			setNodeRef: vi.fn(),
			transform: null,
			isDragging: true,
		});

		const { container } = render(
			<DraggableMissionRow
				mission={mockMission}
				isSelected={false}
				onSelect={vi.fn()}
			/>
		);

		expect(container.firstChild).toHaveClass("opacity-50");
	});
});
