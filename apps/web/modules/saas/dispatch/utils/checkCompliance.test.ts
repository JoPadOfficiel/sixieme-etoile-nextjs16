import { describe, it, expect } from "vitest";
import { checkCompliance, DriverCalendarEvent } from "./checkCompliance";
import type { MissionListItem } from "../types";

// Mock Mission Helper
const createMission = (id: string, pickupAt: string): MissionListItem => ({
  id,
  quoteId: "q1",
  pickupAt,
  pickupAddress: "A",
  dropoffAddress: "B",
  passengerCount: 1,
  luggageCount: 0,
  finalPrice: 100,
  contact: { id: "c1", displayName: "Client", isPartner: false },
  vehicleCategory: { id: "v1", name: "Sedan", code: "SEDAN" },
  profitability: { marginPercent: 20, level: "green" },
  compliance: { status: "OK", warnings: [] },
  pickupLatitude: 0,
  pickupLongitude: 0,
  dropoffLatitude: 0,
  dropoffLongitude: 0,
  assignment: null,
  isSubcontracted: false,
  subcontractor: null,
});

describe("checkCompliance", () => {
  const driverId = "d1";

  it("should BLOCK assignment if driver has a calendar event", () => {
    const mission = createMission("m1", "2024-01-01T10:00:00Z");
    const events: DriverCalendarEvent[] = [
      {
        id: "e1",
        driverId,
        startAt: "2024-01-01T09:00:00Z",
        endAt: "2024-01-01T12:00:00Z",
        type: "HOLIDAY",
      },
    ];

    const result = checkCompliance(mission, driverId, [], events);
    expect(result).toEqual({
      valid: false,
      level: "BLOCK",
      reason: "Impossible: Chauffeur indisponible (HOLIDAY)",
    });
  });

  it("should WARN if missions overlap", () => {
    const mission = createMission("m1", "2024-01-01T10:00:00Z");
    const existing = [createMission("m2", "2024-01-01T10:30:00Z")]; // Overlaps at 10:30

    const result = checkCompliance(mission, driverId, existing, []);
    expect(result).toEqual({
      valid: true,
      level: "WARN",
      reason: "Attention: Chevauchement de missions détecté",
    });
  });

  it("should WARN if RSE limit exceeded (>10h)", () => {
    const mission = createMission("m1", "2024-01-01T20:00:00Z");
    // Create 10 existing missions of 1h each
    const existing = Array.from({ length: 10 }, (_, i) =>
      createMission(`ext-${i}`, `2024-01-01T${8 + i}:00:00Z`)
    );

    const result = checkCompliance(mission, driverId, existing, []);
    expect(result).toEqual({
      valid: true,
      level: "WARN",
      reason: "Attention: Risque dépassement RSE (>10h)",
    });
  });

  it("should return OK if no conflicts", () => {
    const mission = createMission("m1", "2024-01-01T14:00:00Z");
    const existing = [createMission("m2", "2024-01-01T10:00:00Z")];
    const events: DriverCalendarEvent[] = [
      {
        id: "e1",
        driverId,
        startAt: "2024-01-01T08:00:00Z",
        endAt: "2024-01-01T09:00:00Z",
        type: "PERSONAL",
      },
    ];

    const result = checkCompliance(mission, driverId, existing, events);
    expect(result).toEqual({ valid: true, level: "OK" });
  });
});
