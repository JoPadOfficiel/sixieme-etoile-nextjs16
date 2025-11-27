import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DispatchBadges } from "../DispatchBadges";
import type { MissionProfitability, MissionCompliance, MissionAssignment } from "../../types";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => {
		const translations: Record<string, string> = {
			"profitability.green": "Profitable",
			"profitability.orange": "Low margin",
			"profitability.red": "Loss",
			"compliance.ok": "Compliant",
			"compliance.warning": "Warning",
			"compliance.violation": "Violation",
			"assignment.assigned": "Assigned",
			"assignment.unassigned": "Unassigned",
		};
		return translations[key] || key;
	},
}));

describe("DispatchBadges", () => {
	const defaultProfitability: MissionProfitability = {
		marginPercent: 25,
		level: "green",
	};

	const defaultCompliance: MissionCompliance = {
		status: "OK",
		warnings: [],
	};

	const defaultAssignment: MissionAssignment = {
		vehicleId: "vehicle-1",
		vehicleName: "Mercedes S-Class",
		baseName: "Paris CDG",
		driverId: "driver-1",
		driverName: "John Doe",
	};

	it("renders green profitability badge when margin >= 20%", () => {
		render(
			<DispatchBadges
				profitability={{ marginPercent: 25, level: "green" }}
				compliance={defaultCompliance}
				assignment={defaultAssignment}
			/>
		);

		const badge = screen.getByTestId("profitability-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-green-700");
	});

	it("renders orange profitability badge when 0% <= margin < 20%", () => {
		render(
			<DispatchBadges
				profitability={{ marginPercent: 10, level: "orange" }}
				compliance={defaultCompliance}
				assignment={defaultAssignment}
			/>
		);

		const badge = screen.getByTestId("profitability-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-orange-700");
	});

	it("renders red profitability badge when margin < 0%", () => {
		render(
			<DispatchBadges
				profitability={{ marginPercent: -5, level: "red" }}
				compliance={defaultCompliance}
				assignment={defaultAssignment}
			/>
		);

		const badge = screen.getByTestId("profitability-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-red-700");
	});

	it("renders compliance OK badge when no violations", () => {
		render(
			<DispatchBadges
				profitability={defaultProfitability}
				compliance={{ status: "OK", warnings: [] }}
				assignment={defaultAssignment}
			/>
		);

		const badge = screen.getByTestId("compliance-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-green-700");
	});

	it("renders compliance warning badge when warnings exist", () => {
		render(
			<DispatchBadges
				profitability={defaultProfitability}
				compliance={{ status: "WARNING", warnings: ["Approaching limit"] }}
				assignment={defaultAssignment}
			/>
		);

		const badge = screen.getByTestId("compliance-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-amber-700");
	});

	it("renders compliance violation badge when violations exist", () => {
		render(
			<DispatchBadges
				profitability={defaultProfitability}
				compliance={{ status: "VIOLATION", warnings: ["Driving time exceeded"] }}
				assignment={defaultAssignment}
			/>
		);

		const badge = screen.getByTestId("compliance-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-red-700");
	});

	it("renders assigned badge when vehicle/driver assigned", () => {
		render(
			<DispatchBadges
				profitability={defaultProfitability}
				compliance={defaultCompliance}
				assignment={defaultAssignment}
			/>
		);

		const badge = screen.getByTestId("assignment-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-blue-700");
	});

	it("renders unassigned badge when no assignment", () => {
		render(
			<DispatchBadges
				profitability={defaultProfitability}
				compliance={defaultCompliance}
				assignment={null}
			/>
		);

		const badge = screen.getByTestId("assignment-badge");
		expect(badge).toBeInTheDocument();
		expect(badge).toHaveClass("text-gray-700");
	});

	it("renders all three badges", () => {
		render(
			<DispatchBadges
				profitability={defaultProfitability}
				compliance={defaultCompliance}
				assignment={defaultAssignment}
			/>
		);

		expect(screen.getByTestId("profitability-badge")).toBeInTheDocument();
		expect(screen.getByTestId("compliance-badge")).toBeInTheDocument();
		expect(screen.getByTestId("assignment-badge")).toBeInTheDocument();
	});
});
