import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MissionComplianceDetails } from "../MissionComplianceDetails";
import type { MissionComplianceDetails as MissionComplianceDetailsType } from "../../types";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}));

describe("MissionComplianceDetails", () => {
	const mockHeavyVehicleCompliance: MissionComplianceDetailsType = {
		missionId: "mission-123",
		vehicleRegulatoryCategory: "HEAVY",
		validationResult: {
			isCompliant: true,
			regulatoryCategory: "HEAVY",
			violations: [],
			warnings: [],
			adjustedDurations: {
				totalDrivingMinutes: 360,
				totalAmplitudeMinutes: 480,
				injectedBreakMinutes: 45,
				cappedSpeedApplied: false,
			},
			rulesApplied: [
				{
					ruleId: "max-driving-time",
					ruleName: "Maximum Daily Driving Time",
					threshold: 10,
					unit: "hours",
					result: "PASS",
				},
			],
		},
		auditLogs: [],
	};

	const mockLightVehicleCompliance: MissionComplianceDetailsType = {
		missionId: "mission-456",
		vehicleRegulatoryCategory: "LIGHT",
		validationResult: null,
		auditLogs: [],
	};

	const mockViolationCompliance: MissionComplianceDetailsType = {
		missionId: "mission-789",
		vehicleRegulatoryCategory: "HEAVY",
		validationResult: {
			isCompliant: false,
			regulatoryCategory: "HEAVY",
			violations: [
				{
					type: "DRIVING_TIME_EXCEEDED",
					message: "Total driving time exceeds maximum allowed",
					actual: 11.5,
					limit: 10,
					unit: "hours",
					severity: "BLOCKING",
				},
			],
			warnings: [],
			adjustedDurations: {
				totalDrivingMinutes: 690,
				totalAmplitudeMinutes: 840,
				injectedBreakMinutes: 90,
				cappedSpeedApplied: true,
			},
			rulesApplied: [
				{
					ruleId: "max-driving-time",
					ruleName: "Maximum Daily Driving Time",
					threshold: 10,
					unit: "hours",
					result: "FAIL",
				},
			],
		},
		auditLogs: [],
	};

	it("renders loading skeleton when isLoading is true", () => {
		render(
			<MissionComplianceDetails
				complianceDetails={null}
				isLoading={true}
			/>
		);

		// Skeleton should be rendered
		expect(document.querySelector(".animate-pulse")).toBeTruthy();
	});

	it("renders no data message when complianceDetails is null", () => {
		render(
			<MissionComplianceDetails
				complianceDetails={null}
				isLoading={false}
			/>
		);

		expect(screen.getByText("noData")).toBeInTheDocument();
	});

	it("renders LIGHT vehicle info for light vehicles", () => {
		render(
			<MissionComplianceDetails
				complianceDetails={mockLightVehicleCompliance}
				isLoading={false}
			/>
		);

		expect(screen.getByText("lightVehicle.title")).toBeInTheDocument();
		expect(screen.getByText("lightVehicle.description")).toBeInTheDocument();
	});

	it("renders HEAVY vehicle compliance details", () => {
		render(
			<MissionComplianceDetails
				complianceDetails={mockHeavyVehicleCompliance}
				isLoading={false}
			/>
		);

		expect(screen.getByText("vehicleType.heavy")).toBeInTheDocument();
		expect(screen.getByText("status.ok")).toBeInTheDocument();
	});

	it("renders violations for non-compliant HEAVY vehicle", () => {
		render(
			<MissionComplianceDetails
				complianceDetails={mockViolationCompliance}
				isLoading={false}
			/>
		);

		expect(screen.getByText("status.violation")).toBeInTheDocument();
		expect(screen.getByText(/violations/i)).toBeInTheDocument();
	});

	it("shows all rules passed message when compliant with no warnings", () => {
		render(
			<MissionComplianceDetails
				complianceDetails={mockHeavyVehicleCompliance}
				isLoading={false}
			/>
		);

		expect(screen.getByText("allRulesPassed")).toBeInTheDocument();
	});
});
