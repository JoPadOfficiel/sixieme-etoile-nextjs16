import { areIntervalsOverlapping } from "date-fns";
import type { MissionListItem } from "../types";
import type { DriverCalendarEvent } from "./checkConstraints";

// Re-export Story 30.2 types and functions from dedicated module
export {
  checkConstraints,
  aggregateDiagnostics,
  type ConstraintCheckResult,
  type ConstraintWarning,
  type ConstraintDiagnostics,
  type CandidateConstraints,
  type ExistingMission,
  type MissionTimeWindow,
  type DriverCalendarEvent,
} from "./checkConstraints";

export type ComplianceResult =
  | { valid: true; level: "OK" }
  | { valid: true; level: "WARN"; reason: string }
  | { valid: false; level: "BLOCK"; reason: string };

/**
 * Legacy function - kept for backward compatibility
 * Checks compliance for a mission assignment to a driver.
 * Story 30.2: Updated to BLOCK on overlaps instead of WARN
 */
export function checkCompliance(
  mission: MissionListItem,
  driverId: string,
  existingMissions: MissionListItem[],
  calendarEvents: DriverCalendarEvent[]
): ComplianceResult {
  const missionStart = new Date(mission.pickupAt);
  const durationMins = 60; 
  const missionEnd = new Date(missionStart.getTime() + durationMins * 60000);

  // 1. Check Calendar Overlaps (BLOCK)
  const conflictingEvent = calendarEvents.find((event) => {
    return areIntervalsOverlapping(
      { start: missionStart, end: missionEnd },
      { start: new Date(event.startAt), end: new Date(event.endAt) }
    );
  });

  if (conflictingEvent) {
    return {
      valid: false,
      level: "BLOCK",
      reason: `Impossible: Chauffeur indisponible (${conflictingEvent.type})`,
    };
  }

  // 2. Check Mission Overlaps (Story 30.2: now BLOCK instead of WARN)
  const overlappingMission = existingMissions.find((m) => {
    if (m.id === mission.id) return false;
    const start = new Date(m.pickupAt);
    const end = new Date(start.getTime() + 60 * 60000);
    return areIntervalsOverlapping(
      { start: missionStart, end: missionEnd },
      { start, end }
    );
  });

  if (overlappingMission) {
    return {
      valid: false,
      level: "BLOCK",
      reason: "Impossible: Chevauchement de missions",
    };
  }

  // 3. RSE Check (WARN) - 9h max driving per day
  const dailyTotalMinutes = existingMissions.reduce((acc) => acc + 60, 0) + durationMins;
  if (dailyTotalMinutes > 540) { // 9h = 540 min
    return {
      valid: true,
      level: "WARN",
      reason: "Attention: Risque dépassement RSE (>9h conduite)",
    };
  }

  return { valid: true, level: "OK" };
}
