/**
 * Story 30.2: Constraint Checker Service
 * 
 * Integrates the "Le Cerveau" constraint checking algorithm with Prisma queries
 * for robust dispatch validation.
 */

import { db } from "@repo/database";
import { areIntervalsOverlapping } from "date-fns";

export interface ConstraintCheckInput {
  driverId: string;
  missionStartAt: Date;
  missionEndAt: Date;
  vehicleRequiredLicenseCategoryId: string | null;
}

export interface ConstraintDiagnostics {
  excludedByLicense: number;
  excludedBySchedule: number;
  excludedByCalendar: number;
  excludedByRSE: number;
}

/**
 * Story 30.2: Check driver constraints for mission assignment
 * 
 * Returns:
 * - isBlocked: true if driver cannot be assigned
 * - blockReason: reason for blocking (if blocked)
 * - diagnostics: aggregated exclusion counts
 */
export async function checkDriverConstraints(
  input: ConstraintCheckInput
): Promise<{
  isBlocked: boolean;
  blockReason: string | null;
  diagnostics: ConstraintDiagnostics;
}> {
  const { driverId, missionStartAt, missionEndAt, vehicleRequiredLicenseCategoryId } = input;

  // 1. BLOCKING: Check License Requirement
  if (vehicleRequiredLicenseCategoryId) {
    const hasLicense = await db.driverLicense.findFirst({
      where: {
        driverId,
        licenseCategory: {
          id: vehicleRequiredLicenseCategoryId,
        },
        OR: [
          { validTo: null },
          { validTo: { gt: new Date() } },
        ],
      },
    });

    if (!hasLicense) {
      return {
        isBlocked: true,
        blockReason: "Permis requis non détenu",
        diagnostics: {
          excludedByLicense: 1,
          excludedBySchedule: 0,
          excludedByCalendar: 0,
          excludedByRSE: 0,
        },
      };
    }
  }

  // 2. BLOCKING: Check Calendar Events
  const calendarConflict = await db.driverCalendarEvent.findFirst({
    where: {
      driverId,
      startAt: { lt: missionEndAt },
      endAt: { gt: missionStartAt },
    },
  });

  if (calendarConflict) {
    return {
      isBlocked: true,
      blockReason: `Indisponible: ${getEventTypeLabel(calendarConflict.type)}`,
      diagnostics: {
        excludedByLicense: 0,
        excludedBySchedule: 0,
        excludedByCalendar: 1,
        excludedByRSE: 0,
      },
    };
  }

  // 3. BLOCKING: Check Mission Overlaps (Prisma query for strict overlap check)
  const missionOverlap = await db.mission.findFirst({
    where: {
      driverId,
      startAt: { lt: missionEndAt },
      endAt: { gt: missionStartAt },
    },
  });

  if (missionOverlap) {
    const overlapStart = Math.max(missionStartAt.getTime(), missionOverlap.startAt.getTime());
    const overlapEnd = Math.min(missionEndAt.getTime(), missionOverlap.endAt?.getTime() ?? missionEndAt.getTime());
    const overlapMinutes = Math.round((overlapEnd - overlapStart) / 60000);

    return {
      isBlocked: true,
      blockReason: `Chevauchement: ${overlapMinutes} min avec ${missionOverlap.ref || "mission existante"}`,
      diagnostics: {
        excludedByLicense: 0,
        excludedBySchedule: 1,
        excludedByCalendar: 0,
        excludedByRSE: 0,
      },
    };
  }

  // All checks passed
  return {
    isBlocked: false,
    blockReason: null,
    diagnostics: {
      excludedByLicense: 0,
      excludedBySchedule: 0,
      excludedByCalendar: 0,
      excludedByRSE: 0,
    },
  };
}

/**
 * Aggregate diagnostics from multiple constraint checks
 */
export function aggregateConstraintDiagnostics(
  results: Array<{ diagnostics: ConstraintDiagnostics }>
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
function getEventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    HOLIDAY: "Congés",
    SICK: "Arrêt maladie",
    PERSONAL: "Absence personnelle",
    TRAINING: "Formation",
    OTHER: "Indisponible",
  };
  return labels[type] || "Indisponible";
}
