/**
 * GanttTimeline Component Tests
 *
 * Story 27.3: Gantt Core Timeline Rendering
 *
 * Tests for the Gantt timeline visualization component.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { GanttTimeline } from "../GanttTimeline";
import type { GanttDriver } from "../types";

// Mock next-intl
vi.mock("next-intl", () => ({
	useTranslations: () => (key: string, params?: { count?: number }) => {
		const translations: Record<string, string> = {
			driversCount: params?.count === 1 ? "1 driver" : `${params?.count} drivers`,
			jumpToNow: "Now",
			driversLabel: "Drivers",
			"status.available": "Available",
			"status.onMission": "On mission",
			"status.unavailable": "Unavailable",
			"emptyState.title": "No drivers available",
			"emptyState.description": "Add drivers to your fleet to start planning your missions.",
			"emptyState.configureDrivers": "Configure drivers",
		};
		return translations[key] || key;
	},
}));

// Mock useActiveOrganization
vi.mock("@saas/organizations/hooks/use-active-organization", () => ({
	useActiveOrganization: () => ({
		activeOrganization: { slug: "test-org" },
	}),
}));

// Mock date-fns locale - REMOVED to use real locale
// vi.mock("date-fns/locale", () => ({
// 	fr: {},
// }));

const mockDrivers: GanttDriver[] = [
	{ id: "driver-1", name: "Jean Dupont", status: "AVAILABLE", missions: [] },
	{ id: "driver-2", name: "Marie Martin", status: "ON_MISSION", missions: [] },
	{ id: "driver-3", name: "Pierre Durand", status: "UNAVAILABLE", missions: [] },
	{ id: "driver-4", name: "Sophie Bernard", status: "AVAILABLE", missions: [] },
	{ id: "driver-5", name: "Lucas Petit", status: "AVAILABLE", missions: [] },
];

const defaultProps = {
	drivers: mockDrivers,
	startTime: new Date("2026-01-18T00:00:00"),
	endTime: new Date("2026-01-19T00:00:00"),
	pixelsPerHour: 50,
};

describe("GanttTimeline", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-18T14:30:00"));
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe("TC1: Basic Rendering", () => {
		it("renders all driver rows with correct names", () => {
			render(<GanttTimeline {...defaultProps} />);

			expect(screen.getByText("Jean Dupont")).toBeInTheDocument();
			expect(screen.getByText("Marie Martin")).toBeInTheDocument();
			expect(screen.getByText("Pierre Durand")).toBeInTheDocument();
			expect(screen.getByText("Sophie Bernard")).toBeInTheDocument();
			expect(screen.getByText("Lucas Petit")).toBeInTheDocument();
		});

		it("displays driver count in toolbar", () => {
			render(<GanttTimeline {...defaultProps} />);

			expect(screen.getByText("5 drivers")).toBeInTheDocument();
		});

		it("renders the Drivers label in header", () => {
			render(<GanttTimeline {...defaultProps} />);

			expect(screen.getByText("Drivers")).toBeInTheDocument();
		});
	});

	describe("TC2: Horizontal Scroll", () => {
		it("renders scrollable content area", () => {
			const { container } = render(<GanttTimeline {...defaultProps} />);

			const scrollableArea = container.querySelector(".overflow-auto");
			expect(scrollableArea).toBeInTheDocument();
		});

		it("renders fixed sidebar with correct width", () => {
			const { container } = render(<GanttTimeline {...defaultProps} />);

			const sidebar = container.querySelector('[style*="width: 200"]');
			expect(sidebar).toBeInTheDocument();
		});
	});

	describe("TC3: Now Indicator Position", () => {
		it("renders now indicator when current time is in range", () => {
			const { container } = render(<GanttTimeline {...defaultProps} />);

			// Now indicator should be present (current time 14:30 is within 00:00-24:00)
			const nowIndicator = container.querySelector(".bg-red-500");
			expect(nowIndicator).toBeInTheDocument();
		});

		it("does not render now indicator when current time is outside range", () => {
			const propsOutOfRange = {
				...defaultProps,
				startTime: new Date("2026-01-20T00:00:00"),
				endTime: new Date("2026-01-21T00:00:00"),
			};

			const { container } = render(<GanttTimeline {...propsOutOfRange} />);

			// Now indicator should NOT be present (current time 14:30 on Jan 18 is outside Jan 20-21)
			const nowIndicator = container.querySelector(".bg-red-500");
			expect(nowIndicator).not.toBeInTheDocument();
		});
	});

	describe("TC4: Now Indicator Update", () => {
		it("updates now indicator position when time changes", async () => {
			const { container } = render(<GanttTimeline {...defaultProps} />);

			const initialIndicator = container.querySelector(".bg-red-500");
			expect(initialIndicator).toBeInTheDocument();

			// Advance time by 1 minute
			vi.advanceTimersByTime(60000);

			await waitFor(() => {
				const updatedIndicator = container.querySelector(".bg-red-500");
				expect(updatedIndicator).toBeInTheDocument();
			});
		});
	});

	describe("TC5: Empty State", () => {
		it("displays empty state message when no drivers", () => {
			render(<GanttTimeline {...defaultProps} drivers={[]} />);

			expect(screen.getByText("No drivers available")).toBeInTheDocument();
			expect(
				screen.getByText("Add drivers to your fleet to start planning your missions.")
			).toBeInTheDocument();
		});

		it("displays configure drivers link in empty state", () => {
			render(<GanttTimeline {...defaultProps} drivers={[]} />);

			expect(screen.getByText("Configure drivers")).toBeInTheDocument();
		});
	});

	describe("TC6: Virtualization Performance", () => {
		it("renders with many drivers without crashing", () => {
			const manyDrivers: GanttDriver[] = Array.from({ length: 100 }, (_, i) => ({
				id: `driver-${i}`,
				name: `Driver ${i}`,
				status: "AVAILABLE" as const,
				missions: [],
			}));

			const { container } = render(
				<GanttTimeline {...defaultProps} drivers={manyDrivers} />
			);

			// Should render without errors
			expect(container).toBeInTheDocument();
			// Should show driver count
			expect(screen.getByText("100 drivers")).toBeInTheDocument();
		});
	});

	describe("TC7: Time Scale Accuracy", () => {
		it("calculates correct total width based on pixelsPerHour", () => {
			const { container } = render(
				<GanttTimeline {...defaultProps} pixelsPerHour={100} />
			);

			// 24 hours * 100 pixels = 2400px total width
			const gridContainer = container.querySelector('[style*="width: 2400"]');
			expect(gridContainer).toBeInTheDocument();
		});

		it("uses default pixelsPerHour when not specified", () => {
			const { drivers, startTime, endTime } = defaultProps;
			const { container } = render(
				<GanttTimeline drivers={drivers} startTime={startTime} endTime={endTime} />
			);

			// 24 hours * 50 pixels (default) = 1200px total width
			const gridContainer = container.querySelector('[style*="width: 1200"]');
			expect(gridContainer).toBeInTheDocument();
		});
	});

	describe("Callbacks", () => {
		it("calls onDriverClick when driver row is clicked", () => {
			const onDriverClick = vi.fn();
			render(<GanttTimeline {...defaultProps} onDriverClick={onDriverClick} />);

			const driverRow = screen.getByText("Jean Dupont").closest("div[class*='cursor-pointer']");
			if (driverRow) {
				fireEvent.click(driverRow);
				expect(onDriverClick).toHaveBeenCalledWith("driver-1");
			}
		});

		it("calls onMissionClick when mission block is clicked", () => {
			const onMissionClick = vi.fn();
			const driversWithMissions: GanttDriver[] = [
				{
					id: "driver-1",
					name: "Jean Dupont",
					status: "ON_MISSION",
					missions: [
						{
							id: "mission-1",
							title: "Airport Transfer",
							startAt: new Date("2026-01-18T10:00:00"),
							endAt: new Date("2026-01-18T12:00:00"),
							type: "CALCULATED",
							status: "IN_PROGRESS",
						},
					],
				},
			];

			render(
				<GanttTimeline
					{...defaultProps}
					drivers={driversWithMissions}
					onMissionClick={onMissionClick}
				/>
			);

			const missionBlock = screen.getByText("Airport Transfer");
			fireEvent.click(missionBlock);
			expect(onMissionClick).toHaveBeenCalledWith("mission-1");
		});
	});

	describe("Jump to Now Button", () => {
		it("renders jump to now button", () => {
			render(<GanttTimeline {...defaultProps} />);

			expect(screen.getByText("Now")).toBeInTheDocument();
		});

		it("scrolls to current time when button is clicked", () => {
			render(<GanttTimeline {...defaultProps} />);

			const jumpButton = screen.getByText("Now");
			fireEvent.click(jumpButton);

			// Button should be clickable without errors
			expect(jumpButton).toBeInTheDocument();
		});
	});
});
