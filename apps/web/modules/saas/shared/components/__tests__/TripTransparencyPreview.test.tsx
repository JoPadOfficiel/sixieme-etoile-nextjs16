/**
 * TripTransparencyPreview Component Tests
 * 
 * @see Story 6.7: Integrate TripTransparencyPanel & Profitability Indicator Across Screens
 */

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { TripTransparencyPreview } from "../TripTransparencyPreview";
import type { TripAnalysis } from "../../types/pricing";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// Sample trip analysis data
const mockTripAnalysis: TripAnalysis = {
  segments: {
    approach: {
      name: "approach",
      description: "Base to Pickup",
      distanceKm: 12,
      durationMinutes: 15,
      cost: { total: 25, fuel: 10, tolls: 5, wear: 5, driver: 5 },
      isEstimated: false,
    },
    service: {
      name: "service",
      description: "Pickup to Dropoff",
      distanceKm: 28,
      durationMinutes: 30,
      cost: { total: 50, fuel: 20, tolls: 10, wear: 10, driver: 10 },
      isEstimated: false,
    },
    return: {
      name: "return",
      description: "Dropoff to Base",
      distanceKm: 5.2,
      durationMinutes: 7,
      cost: { total: 10, fuel: 4, tolls: 2, wear: 2, driver: 2 },
      isEstimated: true,
    },
  },
  totalDistanceKm: 45.2,
  totalDurationMinutes: 52,
  totalInternalCost: 85,
  costBreakdown: {
    fuel: { amount: 34, distanceKm: 45.2, consumptionL100km: 8, pricePerLiter: 1.85 },
    tolls: { amount: 17, distanceKm: 45.2, ratePerKm: 0.15 },
    wear: { amount: 17, distanceKm: 45.2, ratePerKm: 0.10 },
    driver: { amount: 17, durationMinutes: 52, hourlyRate: 20 },
    parking: { amount: 0, description: "" },
    total: 85,
  },
  calculatedAt: "2025-11-27T14:00:00Z",
  routingSource: "GOOGLE_API",
};

describe("TripTransparencyPreview", () => {
  describe("Rendering", () => {
    it("should render with valid trip analysis data", () => {
      render(
        <TripTransparencyPreview
          tripAnalysis={mockTripAnalysis}
          marginPercent={24.5}
          internalCost={85}
          mode="inline"
        />
      );

      // Check that key metrics are displayed
      expect(screen.getByText("45.2 km")).toBeInTheDocument();
      expect(screen.getByText(/52/)).toBeInTheDocument(); // Duration
    });

    it("should render empty state when tripAnalysis is null", () => {
      render(
        <TripTransparencyPreview
          tripAnalysis={null}
          marginPercent={null}
          internalCost={null}
          mode="inline"
        />
      );

      // Check for empty state message
      expect(screen.getByText("quotes.create.tripTransparency.empty.title")).toBeInTheDocument();
    });

    it("should handle string margin percent", () => {
      render(
        <TripTransparencyPreview
          tripAnalysis={mockTripAnalysis}
          marginPercent="24.5"
          internalCost="85"
          mode="inline"
        />
      );

      expect(screen.getByText("24.5%")).toBeInTheDocument();
    });

    it("should display segments when available", () => {
      render(
        <TripTransparencyPreview
          tripAnalysis={mockTripAnalysis}
          marginPercent={24.5}
          internalCost={85}
          mode="inline"
        />
      );

      // Check for segment labels
      expect(screen.getByText("quotes.create.tripTransparency.segments.approach")).toBeInTheDocument();
      expect(screen.getByText("quotes.create.tripTransparency.segments.service")).toBeInTheDocument();
      expect(screen.getByText("quotes.create.tripTransparency.segments.return")).toBeInTheDocument();
    });
  });

  describe("Mode handling", () => {
    it("should render inline mode without popover", () => {
      const { container } = render(
        <TripTransparencyPreview
          tripAnalysis={mockTripAnalysis}
          marginPercent={24.5}
          internalCost={85}
          mode="inline"
        />
      );

      // In inline mode, content should be directly visible
      expect(container.querySelector("[data-radix-popper-content-wrapper]")).not.toBeInTheDocument();
    });

    it("should render hover mode with popover trigger", () => {
      render(
        <TripTransparencyPreview
          tripAnalysis={mockTripAnalysis}
          marginPercent={24.5}
          internalCost={85}
          mode="hover"
        />
      );

      // In hover mode, there should be a trigger element
      const trigger = document.querySelector('[data-state]');
      expect(trigger).toBeTruthy();
    });
  });

  describe("Edge cases", () => {
    it("should handle trip analysis without approach segment", () => {
      const tripWithoutApproach: TripAnalysis = {
        ...mockTripAnalysis,
        segments: {
          ...mockTripAnalysis.segments,
          approach: null,
        },
      };

      render(
        <TripTransparencyPreview
          tripAnalysis={tripWithoutApproach}
          marginPercent={24.5}
          internalCost={85}
          mode="inline"
        />
      );

      // Should not show approach segment
      expect(screen.queryByText("quotes.create.tripTransparency.segments.approach")).not.toBeInTheDocument();
      // Should still show service segment
      expect(screen.getByText("quotes.create.tripTransparency.segments.service")).toBeInTheDocument();
    });

    it("should handle trip analysis without return segment", () => {
      const tripWithoutReturn: TripAnalysis = {
        ...mockTripAnalysis,
        segments: {
          ...mockTripAnalysis.segments,
          return: null,
        },
      };

      render(
        <TripTransparencyPreview
          tripAnalysis={tripWithoutReturn}
          marginPercent={24.5}
          internalCost={85}
          mode="inline"
        />
      );

      // Should not show return segment
      expect(screen.queryByText("quotes.create.tripTransparency.segments.return")).not.toBeInTheDocument();
    });

    it("should handle zero margin", () => {
      render(
        <TripTransparencyPreview
          tripAnalysis={mockTripAnalysis}
          marginPercent={0}
          internalCost={85}
          mode="inline"
        />
      );

      expect(screen.getByText("0.0%")).toBeInTheDocument();
    });

    it("should handle negative margin", () => {
      render(
        <TripTransparencyPreview
          tripAnalysis={mockTripAnalysis}
          marginPercent={-5.5}
          internalCost={85}
          mode="inline"
        />
      );

      expect(screen.getByText("-5.5%")).toBeInTheDocument();
    });
  });
});
