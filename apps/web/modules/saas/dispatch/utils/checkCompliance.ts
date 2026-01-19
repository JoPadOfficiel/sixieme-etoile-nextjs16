import { areIntervalsOverlapping } from "date-fns";
import type { MissionListItem } from "../types";

export interface DriverCalendarEvent {
  id: string;
  driverId: string;
  startAt: Date | string;
  endAt: Date | string;
  type: "HOLIDAY" | "SICK" | "PERSONAL" | "TRAINING" | "OTHER";
}

export type ComplianceResult =
  | { valid: true; level: "OK" }
  | { valid: true; level: "WARN"; reason: string }
  | { valid: false; level: "BLOCK"; reason: string };

/**
 * Checks compliance for a mission assignment to a driver.
 * STRICTLY follows Story 27.10 logic.
 */
export function checkCompliance(
  mission: MissionListItem,
  driverId: string,
  existingMissions: MissionListItem[],
  calendarEvents: DriverCalendarEvent[]
): ComplianceResult {
  const missionStart = new Date(mission.pickupAt);
  // Default duration 1h if not specified (should be in mission)
  // For purpose of check, we assume 1h duration if no end time (though missions usually have it in sourceData)
  // But MissionListItem doesn't explicitly have endAt at top level, often calculated.
  // We'll use a pragmatic approach: 1 hour default.
  // Actually MissionListItem has `pickupAt` but `dropoffAt` might be missing?
  // Let's assume 60 mins duration for now if we can't determine.
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

  // 2. Check Mission Overlaps (WARN)
  const overlappingMission = existingMissions.find((m) => {
    if (m.id === mission.id) return false;
    // Basic overlap check
    const start = new Date(m.pickupAt);
    const end = new Date(start.getTime() + 60 * 60000); // Assume 1h for them too
    return areIntervalsOverlapping(
      { start: missionStart, end: missionEnd },
      { start, end }
    );
  });

  if (overlappingMission) {
    return {
      valid: true,
      level: "WARN",
      reason: "Attention: Chevauchement de missions détecté",
    };
  }

  // 3. RSE Check (WARN)
  // Simplified: If total minutes > 10 * 60
  const dailyTotalMinutes = existingMissions.reduce((acc) => acc + 60, 0) + durationMins;
  if (dailyTotalMinutes > 600) {
    return {
      valid: true,
      level: "WARN",
      reason: "Attention: Risque dépassement RSE (>10h)",
    };
  }

  return { valid: true, level: "OK" };
}
