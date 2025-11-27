import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ComplianceAlertBanner } from "../ComplianceAlertBanner";
import type { ComplianceViolation } from "../../types";

// Mock next-intl
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "quotes.compliance.banner.title": "Trip Cannot Be Created",
      "quotes.compliance.banner.description": "This trip violates regulatory constraints.",
      "quotes.compliance.banner.suggestedActions": "Suggested Actions:",
      "quotes.compliance.banner.action.reduceDuration": "Reduce the trip duration",
      "quotes.compliance.banner.action.changeVehicle": "Use a LIGHT vehicle",
      "quotes.compliance.banner.action.splitTrip": "Split the trip",
      "quotes.compliance.banner.viewAlternatives": "View Alternatives",
      "quotes.compliance.violations.DRIVING_TIME_EXCEEDED": "Maximum Driving Time Exceeded",
      "quotes.compliance.violations.AMPLITUDE_EXCEEDED": "Maximum Work Amplitude Exceeded",
      "quotes.compliance.actual": "Actual",
      "quotes.compliance.limit": "Limit",
    };
    return translations[key] || key;
  },
}));

describe("ComplianceAlertBanner", () => {
  const mockViolations: ComplianceViolation[] = [
    {
      type: "DRIVING_TIME_EXCEEDED",
      message: "Total driving time (11h) exceeds maximum allowed (10h)",
      actual: 11,
      limit: 10,
      unit: "hours",
      severity: "BLOCKING",
    },
  ];

  it("should not render when violations array is empty", () => {
    const { container } = render(<ComplianceAlertBanner violations={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render banner when violations exist", () => {
    render(<ComplianceAlertBanner violations={mockViolations} />);
    
    expect(screen.getByText("Trip Cannot Be Created")).toBeInTheDocument();
    expect(screen.getByText("This trip violates regulatory constraints.")).toBeInTheDocument();
  });

  it("should display violation details", () => {
    render(<ComplianceAlertBanner violations={mockViolations} />);
    
    expect(screen.getByText("Maximum Driving Time Exceeded")).toBeInTheDocument();
    expect(screen.getByText(/11h/)).toBeInTheDocument();
    expect(screen.getByText(/10h/)).toBeInTheDocument();
  });

  it("should display multiple violations", () => {
    const multipleViolations: ComplianceViolation[] = [
      ...mockViolations,
      {
        type: "AMPLITUDE_EXCEEDED",
        message: "Total work amplitude (15h) exceeds maximum allowed (14h)",
        actual: 15,
        limit: 14,
        unit: "hours",
        severity: "BLOCKING",
      },
    ];

    render(<ComplianceAlertBanner violations={multipleViolations} />);
    
    expect(screen.getByText("Maximum Driving Time Exceeded")).toBeInTheDocument();
    expect(screen.getByText("Maximum Work Amplitude Exceeded")).toBeInTheDocument();
  });

  it("should display suggested actions", () => {
    render(<ComplianceAlertBanner violations={mockViolations} />);
    
    expect(screen.getByText("Suggested Actions:")).toBeInTheDocument();
    expect(screen.getByText("Reduce the trip duration")).toBeInTheDocument();
    expect(screen.getByText("Use a LIGHT vehicle")).toBeInTheDocument();
    expect(screen.getByText("Split the trip")).toBeInTheDocument();
  });

  it("should toggle expanded state when clicking collapse button", () => {
    render(<ComplianceAlertBanner violations={mockViolations} />);
    
    // Initially expanded
    expect(screen.getByText("Suggested Actions:")).toBeInTheDocument();
    
    // Find and click the collapse button (ChevronUp icon)
    const collapseButton = screen.getByRole("button");
    fireEvent.click(collapseButton);
    
    // Should be collapsed - suggested actions should not be visible
    expect(screen.queryByText("Suggested Actions:")).not.toBeInTheDocument();
  });

  it("should call onRequestAlternatives when button is clicked", () => {
    const mockOnRequestAlternatives = vi.fn();
    
    render(
      <ComplianceAlertBanner
        violations={mockViolations}
        onRequestAlternatives={mockOnRequestAlternatives}
      />
    );
    
    const alternativesButton = screen.getByText("View Alternatives");
    fireEvent.click(alternativesButton);
    
    expect(mockOnRequestAlternatives).toHaveBeenCalledTimes(1);
  });

  it("should not show alternatives button when callback is not provided", () => {
    render(<ComplianceAlertBanner violations={mockViolations} />);
    
    expect(screen.queryByText("View Alternatives")).not.toBeInTheDocument();
  });

  it("should apply custom className", () => {
    const { container } = render(
      <ComplianceAlertBanner violations={mockViolations} className="custom-class" />
    );
    
    const alert = container.querySelector("[role='alert']");
    expect(alert).toHaveClass("custom-class");
  });
});
