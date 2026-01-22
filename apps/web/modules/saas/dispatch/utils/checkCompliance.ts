import { areIntervalsOverlapping, differenceInMinutes } from "date-fns";
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
 * Story 30.2: Constraint Check Result for "Le Cerveau" algorithm
 * Provides detailed diagnostics for assignment validation
 */
export interface ConstraintCheckResult {
  isBlocked: boolean;
  blockReason: string | null;
  warnings: ConstraintWarning[];
  diagnostics: ConstraintDiagnostics;
}

export interface ConstraintWarning {
  type: "RSE_DRIVING_TIME" | "RSE_REST_TIME" | "SCHEDULE_OVERLAP";
  message: string;
  details?: {
    overlapMinutes?: number;
    conflictingMissionId?: string;
    totalDrivingMinutes?: number;
    restMinutes?: number;
  };
}

export interface ConstraintDiagnostics {
  excludedByLicense: number;
  excludedBySchedule: number;
  excludedByCalendar: number;
  excludedByRSE: number;
}

/**
 * Story 30.2: Candidate constraints for validation
 */
export interface CandidateConstraints {
  driverId: string;
  driverName: string;
  driverLicenseCategoryIds: string[];
  vehicleRequiredLicenseCategoryId: string | null;
  existingMissions: ExistingMission[];
  calendarEvents: DriverCalendarEvent[];
  dailyDrivingMinutes: number;
  lastMissionEndAt: Date | null;
}

export interface ExistingMission {
  id: string;
  startAt: Date | string;
  endAt: Date | string;
  ref?: string | null;
}

export interface MissionTimeWindow {
  startAt: Date;
  endAt: Date;
  durationMinutes: number;
}

/**
 * Story 30.2: "Le Cerveau" - The Brain Algorithm
 * 
 * Validates assignment constraints with strict blocking rules and warnings.
 * 
 * BLOCKING (candidate excluded):
 * - License mismatch: Driver doesn't have required license for vehicle
 * - Schedule overlap: Driver has conflicting mission at same time
 * - Calendar conflict: Driver has calendar event (holiday, sick, etc.)
 * 
 * WARNING (candidate shown with alert):
 * - RSE driving time: >9h driving planned for the day
 * - RSE rest time: <11h rest since last mission
 */
export function checkConstraints(
  mission: MissionTimeWindow,
  candidate: CandidateConstraints
): ConstraintCheckResult {
  const warnings: ConstraintWarning[] = [];

  // 1. BLOCKING: Check License Requirement
  if (candidate.vehicleRequiredLicenseCategoryId) {
    const hasRequiredLicense = candidate.driverLicenseCategoryIds.includes(
      candidate.vehicleRequiredLicenseCategoryId
    );
    if (!hasRequiredLicense) {
      return {
        isBlocked: true,
        blockReason: `Permis requis non détenu`,
        warnings: [],
        diagnostics: {
          excludedByLicense: 1,
          excludedBySchedule: 0,
          excludedByCalendar: 0,
          excludedByRSE: 0,
        },
      };
    }
  }

  // 2. BLOCKING: Check Calendar Events (holidays, sick leave, etc.)
  const conflictingEvent = candidate.calendarEvents.find((event) => {
    return areIntervalsOverlapping(
      { start: mission.startAt, end: mission.endAt },
      { start: new Date(event.startAt), end: new Date(event.endAt) }
    );
  });

  if (conflictingEvent) {
    return {
      isBlocked: true,
      blockReason: `Indisponible: ${getEventTypeLabel(conflictingEvent.type)}`,
      warnings: [],
      diagnostics: {
        excludedByLicense: 0,
        excludedBySchedule: 0,
        excludedByCalendar: 1,
        excludedByRSE: 0,
      },
    };
  }

  // 3. BLOCKING: Check Mission Overlaps (strict - no overlaps allowed)
  const overlappingMission = candidate.existingMissions.find((m) => {
    const mStart = new Date(m.startAt);
    const mEnd = new Date(m.endAt);
    return areIntervalsOverlapping(
      { start: mission.startAt, end: mission.endAt },
      { start: mStart, end: mEnd }
    );
  });

  if (overlappingMission) {
    const overlapStart = Math.max(
      mission.startAt.getTime(),
      new Date(overlappingMission.startAt).getTime()
    );
    const overlapEnd = Math.min(
      mission.endAt.getTime(),
      new Date(overlappingMission.endAt).getTime()
    );
    const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);
    
    return {
      isBlocked: true,
      blockReason: `Chevauchement: ${overlapMinutes} min avec ${overlappingMission.ref || "mission existante"}`,
      warnings: [],
      diagnostics: {
        excludedByLicense: 0,
        excludedBySchedule: 1,
        excludedByCalendar: 0,
        excludedByRSE: 0,
      },
    };
  }

  // 4. WARNING: Check RSE Driving Time (>9h = warning)
  const RSE_MAX_DRIVING_MINUTES = 9 * 60; // 9 hours
  const totalDrivingMinutes = candidate.dailyDrivingMinutes + mission.durationMinutes;
  
  if (totalDrivingMinutes > RSE_MAX_DRIVING_MINUTES) {
    warnings.push({
      type: "RSE_DRIVING_TIME",
      message: `Risque RSE: ${Math.round(totalDrivingMinutes / 60)}h de conduite prévues (max 9h)`,
      details: {
        totalDrivingMinutes,
      },
    });
  }

  // 5. WARNING: Check RSE Rest Time (<11h = warning)
  const RSE_MIN_REST_MINUTES = 11 * 60; // 11 hours
  if (candidate.lastMissionEndAt) {
    const restMinutes = differenceInMinutes(mission.startAt, candidate.lastMissionEndAt);
    if (restMinutes < RSE_MIN_REST_MINUTES && restMinutes > 0) {
      warnings.push({
        type: "RSE_REST_TIME",
        message: `Repos insuffisant: ${Math.round(restMinutes / 60)}h (min 11h)`,
        details: {
          restMinutes,
        },
      });
    }
  }

  return {
    isBlocked: false,
    blockReason: null,
    warnings,
    diagnostics: {
      excludedByLicense: 0,
      excludedBySchedule: 0,
      excludedByCalendar: 0,
      excludedByRSE: 0,
    },
  };
}

/**
 * Story 30.2: Aggregate diagnostics from multiple candidate checks
 */
export function aggregateDiagnostics(
  results: ConstraintCheckResult[]
): ConstraintDiagnostics {
  return results.reduce(
    (acc, result) => ({
      excludedByLicense: acc.excludedByLicense + result.diagnostics.excludedByLicense,
      excludedBySchedule: acc.excludedBySchedule + result.diagnostics.excludedBySchedule,
      excludedByCalendar: acc.excludedByCalendar + result.diagnostics.excludedByCalendar,
      excludedByRSE: acc.excludedByRSE + result.diagnostics.excludedByRSE,
    }),
    {
      excludedByLicense: 0,
      excludedBySchedule: 0,
      excludedByCalendar: 0,
      excludedByRSE: 0,
    }
  );
}

/**
 * Helper to get French label for calendar event type
 */
function getEventTypeLabel(type: DriverCalendarEvent["type"]): string {
  const labels: Record<DriverCalendarEvent["type"], string> = {
    HOLIDAY: "Congés",
    SICK: "Arrêt maladie",
    PERSONAL: "Absence personnelle",
    TRAINING: "Formation",
    OTHER: "Indisponible",
  };
  return labels[type] || "Indisponible";
}

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
