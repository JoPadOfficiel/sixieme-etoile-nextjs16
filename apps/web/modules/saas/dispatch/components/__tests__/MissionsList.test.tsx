import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MissionsList } from "../MissionsList";
import type { MissionListItem } from "../../types";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: (scope?: string) => (key: string) => scope ? `${scope}.${key}` : key,
}));

// Mock date-fns
vi.mock("date-fns", () => ({
	format: (date: Date, formatStr: string) => {
		if (formatStr === "HH:mm") return "14:30";
		if (formatStr === "dd/MM/yyyy") return "28/11/2025";
		return date.toISOString();
	},
}));

describe("MissionsList", () => {
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

	const mockOnSelectMission = vi.fn();

	it("renders missions in table format", () => {
		render(
			<MissionsList
				missions={[mockMission]}
				selectedMissionId={null}
				onSelectMission={mockOnSelectMission}
				isLoading={false}
			/>
		);

		expect(screen.getByTestId("missions-list")).toBeInTheDocument();
		expect(screen.getByTestId("mission-row")).toBeInTheDocument();
	});

	it("highlights selected mission row", () => {
		render(
			<MissionsList
				missions={[mockMission]}
				selectedMissionId="mission-1"
				onSelectMission={mockOnSelectMission}
				isLoading={false}
			/>
		);

		const row = screen.getByTestId("mission-row");
		expect(row).toHaveAttribute("data-selected", "true");
	});

	it("calls onSelectMission when row clicked", () => {
		render(
			<MissionsList
				missions={[mockMission]}
				selectedMissionId={null}
				onSelectMission={mockOnSelectMission}
				isLoading={false}
			/>
		);

		const row = screen.getByTestId("mission-row");
		fireEvent.click(row);

		expect(mockOnSelectMission).toHaveBeenCalledWith("mission-1");
	});

	it("shows empty state when no missions", () => {
		render(
			<MissionsList
				missions={[]}
				selectedMissionId={null}
				onSelectMission={mockOnSelectMission}
				isLoading={false}
			/>
		);

		expect(screen.getByTestId("missions-list-empty")).toBeInTheDocument();
		expect(screen.getByText(/dispatch\.missions\.empty\.title/i)).toBeInTheDocument();
	});

	it("shows loading skeleton when isLoading", () => {
		render(
			<MissionsList
				missions={[]}
				selectedMissionId={null}
				onSelectMission={mockOnSelectMission}
				isLoading={true}
			/>
		);

		// Should not show empty state when loading
		expect(screen.queryByTestId("missions-list-empty")).not.toBeInTheDocument();
	});

	it("renders multiple missions", () => {
		const missions = [
			mockMission,
			{ ...mockMission, id: "mission-2", quoteId: "quote-2" },
			{ ...mockMission, id: "mission-3", quoteId: "quote-3" },
		];

		render(
			<MissionsList
				missions={missions}
				selectedMissionId={null}
				onSelectMission={mockOnSelectMission}
				isLoading={false}
			/>
		);

		const rows = screen.getAllByTestId("mission-row");
		expect(rows).toHaveLength(3);
	});
});
