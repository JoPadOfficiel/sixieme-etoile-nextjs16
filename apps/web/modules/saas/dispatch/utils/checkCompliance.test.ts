import { describe, it, expect } from "vitest";
import { 
  checkCompliance,
  type DriverCalendarEvent,
} from "./checkCompliance";
import {
  checkConstraints,
  aggregateDiagnostics,
  type CandidateConstraints,
  type MissionTimeWindow,
  type ConstraintCheckResult,
} from "./checkConstraints";
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

// Story 30.2: Helper for creating mission time windows
const createMissionWindow = (startAt: string, durationMinutes: number): MissionTimeWindow => ({
  startAt: new Date(startAt),
  endAt: new Date(new Date(startAt).getTime() + durationMinutes * 60000),
  durationMinutes,
});

// Story 30.2: Helper for creating candidate constraints
const createCandidate = (overrides: Partial<CandidateConstraints> = {}): CandidateConstraints => ({
  driverId: "d1",
  driverName: "Jean Dupont",
  driverLicenseCategoryIds: ["license-b"],
  vehicleRequiredLicenseCategoryId: null,
  existingMissions: [],
  calendarEvents: [],
  dailyDrivingMinutes: 0,
  lastMissionEndAt: null,
  ...overrides,
});

describe("checkCompliance (legacy)", () => {
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

  // Story 30.2: Updated - overlaps now BLOCK instead of WARN
  it("should BLOCK if missions overlap (Story 30.2)", () => {
    const mission = createMission("m1", "2024-01-01T10:00:00Z");
    const existing = [createMission("m2", "2024-01-01T10:30:00Z")]; // Overlaps at 10:30

    const result = checkCompliance(mission, driverId, existing, []);
    expect(result).toEqual({
      valid: false,
      level: "BLOCK",
      reason: "Impossible: Chevauchement de missions",
    });
  });

  // Story 30.2: Updated RSE threshold to 9h
  it("should WARN if RSE limit exceeded (>9h)", () => {
    const mission = createMission("m1", "2024-01-01T20:00:00Z");
    // Create 9 existing missions of 1h each = 9h, + new mission = 10h > 9h limit
    const existing = Array.from({ length: 9 }, (_, i) =>
      createMission(`ext-${i}`, `2024-01-01T${8 + i}:00:00Z`)
    );

    const result = checkCompliance(mission, driverId, existing, []);
    expect(result).toEqual({
      valid: true,
      level: "WARN",
      reason: "Attention: Risque dépassement RSE (>9h conduite)",
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

// Story 30.2: Tests for "Le Cerveau" algorithm
describe("checkConstraints (Le Cerveau)", () => {
  
  describe("License Validation (BLOCKING)", () => {
    it("should BLOCK if driver lacks required license", () => {
      const mission = createMissionWindow("2024-01-01T10:00:00Z", 60);
      const candidate = createCandidate({
        driverLicenseCategoryIds: ["license-b"], // Only has B
        vehicleRequiredLicenseCategoryId: "license-d", // Needs D
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(true);
      expect(result.blockReason).toBe("Permis requis non détenu");
      expect(result.diagnostics.excludedByLicense).toBe(1);
    });

    it("should NOT block if driver has required license", () => {
      const mission = createMissionWindow("2024-01-01T10:00:00Z", 60);
      const candidate = createCandidate({
        driverLicenseCategoryIds: ["license-b", "license-d"],
        vehicleRequiredLicenseCategoryId: "license-d",
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(false);
      expect(result.diagnostics.excludedByLicense).toBe(0);
    });

    it("should NOT block if no license required", () => {
      const mission = createMissionWindow("2024-01-01T10:00:00Z", 60);
      const candidate = createCandidate({
        driverLicenseCategoryIds: ["license-b"],
        vehicleRequiredLicenseCategoryId: null,
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(false);
    });
  });

  describe("Schedule Overlap Validation (BLOCKING)", () => {
    it("should BLOCK if driver has overlapping mission", () => {
      const mission = createMissionWindow("2024-01-01T11:00:00Z", 60); // 11:00-12:00
      const candidate = createCandidate({
        existingMissions: [
          {
            id: "m1",
            startAt: "2024-01-01T10:00:00Z",
            endAt: "2024-01-01T12:00:00Z", // 10:00-12:00 overlaps
            ref: "MIS-001",
          },
        ],
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(true);
      expect(result.blockReason).toContain("Chevauchement");
      expect(result.blockReason).toContain("MIS-001");
      expect(result.diagnostics.excludedBySchedule).toBe(1);
    });

    it("should NOT block if missions don't overlap", () => {
      const mission = createMissionWindow("2024-01-01T14:00:00Z", 60); // 14:00-15:00
      const candidate = createCandidate({
        existingMissions: [
          {
            id: "m1",
            startAt: "2024-01-01T10:00:00Z",
            endAt: "2024-01-01T12:00:00Z", // 10:00-12:00 no overlap
          },
        ],
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(false);
      expect(result.diagnostics.excludedBySchedule).toBe(0);
    });
  });

  describe("Calendar Event Validation (BLOCKING)", () => {
    it("should BLOCK if driver has calendar event (holiday)", () => {
      const mission = createMissionWindow("2024-01-01T10:00:00Z", 60);
      const candidate = createCandidate({
        calendarEvents: [
          {
            id: "e1",
            driverId: "d1",
            startAt: "2024-01-01T00:00:00Z",
            endAt: "2024-01-02T00:00:00Z",
            type: "HOLIDAY",
          },
        ],
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(true);
      expect(result.blockReason).toBe("Indisponible: Congés");
      expect(result.diagnostics.excludedByCalendar).toBe(1);
    });

    it("should BLOCK if driver has calendar event (sick)", () => {
      const mission = createMissionWindow("2024-01-01T10:00:00Z", 60);
      const candidate = createCandidate({
        calendarEvents: [
          {
            id: "e1",
            driverId: "d1",
            startAt: "2024-01-01T08:00:00Z",
            endAt: "2024-01-01T18:00:00Z",
            type: "SICK",
          },
        ],
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(true);
      expect(result.blockReason).toBe("Indisponible: Arrêt maladie");
    });
  });

  describe("RSE Warnings", () => {
    it("should WARN if daily driving exceeds 9h", () => {
      const mission = createMissionWindow("2024-01-01T18:00:00Z", 120); // 2h mission
      const candidate = createCandidate({
        dailyDrivingMinutes: 8 * 60, // Already 8h driving
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("RSE_DRIVING_TIME");
      expect(result.warnings[0].message).toContain("10h");
    });

    it("should WARN if rest time is insufficient (<11h)", () => {
      const mission = createMissionWindow("2024-01-01T06:00:00Z", 60);
      const candidate = createCandidate({
        lastMissionEndAt: new Date("2024-01-01T00:00:00Z"), // Only 6h rest
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(false);
      expect(result.warnings).toHaveLength(1);
      expect(result.warnings[0].type).toBe("RSE_REST_TIME");
      expect(result.warnings[0].message).toContain("6h");
    });

    it("should NOT warn if rest time is sufficient (>=11h)", () => {
      const mission = createMissionWindow("2024-01-01T12:00:00Z", 60);
      const candidate = createCandidate({
        lastMissionEndAt: new Date("2024-01-01T00:00:00Z"), // 12h rest
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe("Multiple Warnings", () => {
    it("should return multiple warnings if applicable", () => {
      const mission = createMissionWindow("2024-01-01T06:00:00Z", 120);
      const candidate = createCandidate({
        dailyDrivingMinutes: 8 * 60, // 8h + 2h = 10h > 9h
        lastMissionEndAt: new Date("2024-01-01T00:00:00Z"), // Only 6h rest
      });

      const result = checkConstraints(mission, candidate);
      
      expect(result.isBlocked).toBe(false);
      expect(result.warnings).toHaveLength(2);
      expect(result.warnings.map(w => w.type)).toContain("RSE_DRIVING_TIME");
      expect(result.warnings.map(w => w.type)).toContain("RSE_REST_TIME");
    });
  });
});

describe("aggregateDiagnostics", () => {
  it("should aggregate diagnostics from multiple results", () => {
    const results: ConstraintCheckResult[] = [
      {
        isBlocked: true,
        blockReason: "License",
        warnings: [],
        diagnostics: { excludedByLicense: 1, excludedBySchedule: 0, excludedByCalendar: 0, excludedByRSE: 0 },
      },
      {
        isBlocked: true,
        blockReason: "Schedule",
        warnings: [],
        diagnostics: { excludedByLicense: 0, excludedBySchedule: 1, excludedByCalendar: 0, excludedByRSE: 0 },
      },
      {
        isBlocked: true,
        blockReason: "License",
        warnings: [],
        diagnostics: { excludedByLicense: 1, excludedBySchedule: 0, excludedByCalendar: 0, excludedByRSE: 0 },
      },
    ];

    const aggregated = aggregateDiagnostics(results);
    
    expect(aggregated.excludedByLicense).toBe(2);
    expect(aggregated.excludedBySchedule).toBe(1);
    expect(aggregated.excludedByCalendar).toBe(0);
    expect(aggregated.excludedByRSE).toBe(0);
  });
});
