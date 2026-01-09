import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { PositioningCostsSection } from "../PositioningCostsSection";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "quotes.positioning.title": "Positioning",
      "quotes.positioning.approachFee": "Approach Fee",
      "quotes.positioning.emptyReturn": "Empty Return",
      "quotes.positioning.total": "Total",
    };
    return translations[key] || key;
  },
}));

describe("PositioningCostsSection", () => {
    const mockSegments = {
        service: {
            distanceKm: 100,
            durationMinutes: 60,
            cost: { total: 500 },
            isEstimated: false
        }
    } as any;

    const mockVehicleSelection = {
        selectedVehicle: { baseName: "Paris Base" }
    } as any;

  it("renders nothing if no positioning costs and total is 0", () => {
    const { container } = render(
      <PositioningCostsSection
        segments={mockSegments}
        vehicleSelection={mockVehicleSelection}
        positioningCosts={null}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders approach and return when provided in positioningCosts", () => {
    const mockPositioningCosts = {
        approachFee: {
          distanceKm: 10,
          durationMinutes: 15,
          cost: 50,
          origin: "Base",
          destination: "Pickup",
          required: true
        },
        emptyReturn: {
          distanceKm: 10,
          durationMinutes: 15,
          cost: 50,
          origin: "Dropoff",
          destination: "Base",
          required: true
        },
        totalPositioningCost: 100
    } as any;

    render(
      <PositioningCostsSection
        segments={mockSegments}
        vehicleSelection={mockVehicleSelection}
        positioningCosts={mockPositioningCosts}
      />
    );

    expect(screen.getByText("Positioning")).toBeInTheDocument();
    expect(screen.getByText("Approach Fee")).toBeInTheDocument();
    expect(screen.getByText("Empty Return")).toBeInTheDocument();
  });
});
