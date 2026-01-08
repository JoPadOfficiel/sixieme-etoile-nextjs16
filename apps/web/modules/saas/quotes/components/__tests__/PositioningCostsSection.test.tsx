/**
 * Story 23.4: Unit tests for PositioningCostsSection
 * 
 * Tests the rendering conditions and display of positioning costs
 * in the TripTransparencyPanel.
 */

import { render, screen } from "@testing-library/react";
import { PositioningCostsSection } from "../PositioningCostsSection";
import type { TripAnalysis } from "../../types";

// Mock next-intl
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => {
    const translations: Record<string, string> = {
      "quotes.positioning.title": "Coûts de Positionnement",
      "quotes.positioning.deadhead": "Deadhead",
      "quotes.positioning.approachFee": "Frais d'approche",
      "quotes.positioning.emptyReturn": "Retour à vide",
      "quotes.positioning.availabilityFee": "Frais de disponibilité",
      "quotes.positioning.total": "Total",
      "quotes.positioning.from": "De",
      "quotes.positioning.to": "Vers",
      "quotes.positioning.sourceBase": "Base source",
      "quotes.positioning.segmentTotal": "Total segment",
      "quotes.positioning.estimated": "Estimé",
      "quotes.positioning.info": "Ces coûts incluent le déplacement du véhicule depuis sa base jusqu'au point de prise en charge et le retour à vide après la mission.",
      "quotes.positioning.unknownBase": "Base inconnue",
    };
    return translations[key] || key;
  },
}));

describe("PositioningCostsSection", () => {
  const mockSegments: TripAnalysis["segments"] = {
    approach: {
      name: "approach",
      description: "Vehicle positioning from base to pickup",
      distanceKm: 10.5,
      durationMinutes: 15,
      cost: {
        fuel: { amount: 2.5, distanceKm: 10.5, consumptionL100km: 7.5, pricePerLiter: 1.85 },
        tolls: { amount: 0, distanceKm: 10.5, ratePerKm: 0 },
        wear: { amount: 1.5, distanceKm: 10.5, ratePerKm: 0.15 },
        driver: { amount: 6.25, durationMinutes: 15, hourlyRate: 25 },
        parking: { amount: 0, description: "" },
        total: 10.25,
      },
      isEstimated: false,
    },
    service: {
      name: "service",
      description: "Main service segment",
      distanceKm: 50,
      durationMinutes: 60,
      cost: {
        fuel: { amount: 12.5, distanceKm: 50, consumptionL100km: 7.5, pricePerLiter: 1.85 },
        tolls: { amount: 5, distanceKm: 50, ratePerKm: 0.1 },
        wear: { amount: 7.5, distanceKm: 50, ratePerKm: 0.15 },
        driver: { amount: 25, durationMinutes: 60, hourlyRate: 25 },
        parking: { amount: 0, description: "" },
        total: 50,
      },
      isEstimated: false,
    },
    return: {
      name: "return",
      description: "Empty return to base",
      distanceKm: 10.5,
      durationMinutes: 15,
      cost: {
        fuel: { amount: 2.5, distanceKm: 10.5, consumptionL100km: 7.5, pricePerLiter: 1.85 },
        tolls: { amount: 0, distanceKm: 10.5, ratePerKm: 0 },
        wear: { amount: 1.5, distanceKm: 10.5, ratePerKm: 0.15 },
        driver: { amount: 6.25, durationMinutes: 15, hourlyRate: 25 },
        parking: { amount: 0, description: "" },
        total: 10.25,
      },
      isEstimated: false,
    },
  };

  const mockVehicleSelection: TripAnalysis["vehicleSelection"] = {
    selectedVehicle: {
      vehicleId: "vehicle-1",
      vehicleName: "Mercedes Vito 8pl",
      baseId: "base-1",
      baseName: "Bussy-Saint-Martin",
    },
    candidatesConsidered: 5,
    candidatesAfterCapacityFilter: 4,
    candidatesAfterHaversineFilter: 3,
    candidatesWithRouting: 2,
    selectionCriterion: "MIN_COST",
    fallbackUsed: false,
  };

  const mockPositioningCosts: TripAnalysis["positioningCosts"] = {
    approachFee: {
      required: true,
      distanceKm: 10.5,
      durationMinutes: 15,
      cost: 10.25,
      reason: "Vehicle positioning from base to pickup",
    },
    emptyReturn: {
      required: true,
      distanceKm: 10.5,
      durationMinutes: 15,
      cost: 10.25,
      reason: "Empty return to base (100% of operational cost)",
    },
    availabilityFee: null,
    totalPositioningCost: 20.50,
  };

  describe("AC1: PositioningCostsSection s'affiche quand des coûts existent", () => {
    test("devrait s'afficher quand positioningCosts est fourni avec total > 0", () => {
      render(
        <PositioningCostsSection
          segments={mockSegments}
          vehicleSelection={mockVehicleSelection}
          positioningCosts={mockPositioningCosts}
        />
      );

      expect(screen.getByText("Coûts de Positionnement")).toBeInTheDocument();
      expect(screen.getByText("Frais d'approche")).toBeInTheDocument();
      expect(screen.getByText("Retour à vide")).toBeInTheDocument();
      expect(screen.getByText("20,50 €")).toBeInTheDocument();
    });

    test("devrait s'afficher quand positioningCosts est fourni avec total = 0 (Story 23.4)", () => {
      const zeroCosts: TripAnalysis["positioningCosts"] = {
        approachFee: {
          required: false,
          distanceKm: 0,
          durationMinutes: 0,
          cost: 0,
          reason: "No vehicle selected - approach cost estimated in base price",
        },
        emptyReturn: {
          required: true,
          distanceKm: 0,
          durationMinutes: 0,
          cost: 0,
          reason: "Retour à vide sera calculé au dispatch (dépend de la base du véhicule)",
        },
        availabilityFee: null,
        totalPositioningCost: 0,
      };

      render(
        <PositioningCostsSection
          segments={mockSegments}
          vehicleSelection={mockVehicleSelection}
          positioningCosts={zeroCosts}
        />
      );

      expect(screen.getByText("Coûts de Positionnement")).toBeInTheDocument();
      expect(screen.getByText("Retour à vide sera calculé au dispatch")).toBeInTheDocument();
    });

    test("ne devrait pas s'afficher quand positioningCosts est null et total <= 0", () => {
      const { container } = render(
        <PositioningCostsSection
          segments={null}
          vehicleSelection={null}
          positioningCosts={null}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe("AC3: L'interface utilisateur affiche les détails corrects", () => {
    test("devrait afficher l'approach fee avec distance, durée et coût", () => {
      render(
        <PositioningCostsSection
          segments={mockSegments}
          vehicleSelection={mockVehicleSelection}
          positioningCosts={mockPositioningCosts}
        />
      );

      expect(screen.getByText("Frais d'approche")).toBeInTheDocument();
      expect(screen.getByText("10,5km")).toBeInTheDocument();
      expect(screen.getByText("0,25h")).toBeInTheDocument();
      expect(screen.getByText("10,25 €")).toBeInTheDocument();
    });

    test("devrait afficher l'empty return avec distance, durée et coût", () => {
      render(
        <PositioningCostsSection
          segments={mockSegments}
          vehicleSelection={mockVehicleSelection}
          positioningCosts={mockPositioningCosts}
        />
      );

      expect(screen.getByText("Retour à vide")).toBeInTheDocument();
      expect(screen.getByText("10,5km")).toBeInTheDocument();
      expect(screen.getByText("0,25h")).toBeInTheDocument();
      expect(screen.getByText("10,25 €")).toBeInTheDocument();
    });

    test("devrait afficher l'availability fee pour les dispo trips", () => {
      const dispoCosts: TripAnalysis["positioningCosts"] = {
        approachFee: {
          required: true,
          distanceKm: 10.5,
          durationMinutes: 15,
          cost: 10.25,
          reason: "Vehicle positioning from base to pickup",
        },
        emptyReturn: {
          required: true,
          distanceKm: 10.5,
          durationMinutes: 15,
          cost: 10.25,
          reason: "Empty return to base (100% of operational cost)",
        },
        availabilityFee: {
          required: true,
          waitingHours: 2,
          ratePerHour: 50,
          cost: 100,
          reason: "2.0h beyond 4h included hours",
        },
        totalPositioningCost: 120.50,
      };

      render(
        <PositioningCostsSection
          segments={mockSegments}
          vehicleSelection={mockVehicleSelection}
          positioningCosts={dispoCosts}
        />
      );

      expect(screen.getByText("Frais de disponibilité")).toBeInTheDocument();
      expect(screen.getByText("2.0h beyond 4h included hours")).toBeInTheDocument();
      expect(screen.getByText("2.0h × 50,00 €/h")).toBeInTheDocument();
      expect(screen.getByText("100,00 €")).toBeInTheDocument();
    });
  });

  describe("AC4: Compatibilité avec les différents scénarios", () => {
    test("devrait s'afficher pour un quote avec véhicule sélectionné", () => {
      render(
        <PositioningCostsSection
          segments={mockSegments}
          vehicleSelection={mockVehicleSelection}
          positioningCosts={mockPositioningCosts}
        />
      );

      expect(screen.getByText("Coûts de Positionnement")).toBeInTheDocument();
      expect(screen.getByText("Bussy-Saint-Martin")).toBeInTheDocument();
    });

    test("devrait s'afficher pour un quote sans véhicule sélectionné", () => {
      const noVehicleCosts: TripAnalysis["positioningCosts"] = {
        approachFee: {
          required: false,
          distanceKm: 0,
          durationMinutes: 0,
          cost: 0,
          reason: "No vehicle selected - approach cost estimated in base price",
        },
        emptyReturn: {
          required: true,
          distanceKm: 0,
          durationMinutes: 0,
          cost: 0,
          reason: "Retour à vide sera calculé au dispatch (dépend de la base du véhicule)",
        },
        availabilityFee: null,
        totalPositioningCost: 0,
      };

      render(
        <PositioningCostsSection
          segments={null}
          vehicleSelection={null}
          positioningCosts={noVehicleCosts}
        />
      );

      expect(screen.getByText("Coûts de Positionnement")).toBeInTheDocument();
      expect(screen.getByText("Base inconnue")).toBeInTheDocument();
      expect(screen.getByText("Retour à vide sera calculé au dispatch")).toBeInTheDocument();
    });

    test("devrait afficher le total positioning cost", () => {
      render(
        <PositioningCostsSection
          segments={mockSegments}
          vehicleSelection={mockVehicleSelection}
          positioningCosts={mockPositioningCosts}
        />
      );

      expect(screen.getByText("Total")).toBeInTheDocument();
      expect(screen.getByText("20,50 €")).toBeInTheDocument();
    });
  });
});
