# Story 5.5: Track RSE Counters Per Driver & Licence Regime

**Epic:** 5 - Fleet & RSE Compliance Engine  
**Status:** ready-for-dev  
**Priority:** High  
**Story Points:** 8

---

## User Story

**As a** scheduler,  
**I want** RSE counters (driving time, amplitude, breaks, rest) tracked per driver and licence regime,  
**So that** I can avoid cumulative violations across the planning horizon.

---

## Related Functional Requirements

- **FR29**: The system shall track service time separately for each relevant regulation regime (for example heavy vs light vehicles) per driver and per day, so that multi-licence drivers can operate under different rules in the same day without violating any legal counters.
- **FR30**: Compliance checks and decisions (including violations prevented) shall be logged for audit purposes.
- **FR49**: Multi-licence drivers can operate under different rules in the same day without violating any legal counters.

---

## Acceptance Criteria

### AC1: Counter Tracking Per Regime

**Given** a driver with multiple licences  
**When** they are assigned to missions throughout a day  
**Then** the system tracks their driving and amplitude per relevant regulation regime (e.g. LIGHT vs HEAVY), and stores counters in a way that can be read by the validator and by the Drivers UI

### AC2: Audit Logging

**Given** historical decisions (violations prevented, borderline cases)  
**When** compliance checks run  
**Then** they are logged with timestamps and reasons for audit (FR30)

### AC3: Multi-Regime Same Day

**Given** a multi-licence driver operating under different rules the same day  
**When** they drive a LIGHT vehicle in the morning and a HEAVY vehicle in the afternoon  
**Then** the system tracks service time separately for each regime without violating any legal counters (FR49)

### AC4: Compliance Snapshot in UI

**Given** the Drivers detail drawer  
**When** I open it  
**Then** I see a compliance snapshot (today's hours, amplitude, rest status) and a list of recent validation decisions with reasons

### AC5: Multi-Tenancy Enforcement

**Given** RSE counters for a driver  
**When** queried via API  
**Then** counters are scoped by organizationId (multi-tenancy enforced)

---

## Technical Tasks

### Database (packages/database)

1. **Create DriverRSECounter Model** (`packages/database/prisma/schema.prisma`)

   - Add `DriverRSECounter` model with fields: organizationId, driverId, date, regulatoryCategory, licenseCategoryId, drivingMinutes, amplitudeMinutes, breakMinutes, restMinutes
   - Add unique constraint on [organizationId, driverId, date, regulatoryCategory]
   - Add indexes for efficient per-day, per-driver queries

2. **Create ComplianceAuditLog Model** (`packages/database/prisma/schema.prisma`)

   - Add `ComplianceAuditLog` model with fields: organizationId, driverId, timestamp, quoteId, missionId, vehicleCategoryId, regulatoryCategory, decision, violations (JSON), warnings (JSON), reason, countersSnapshot (JSON)
   - Add indexes for organizationId, driverId, timestamp

3. **Run Prisma Migration**
   - Generate and apply migration for new models

### Backend (packages/api)

4. **Create RSE Counter Service** (`packages/api/src/services/rse-counter.ts`)

   - `getDriverCounters(organizationId, driverId, date)` - Get all counters for a driver on a date
   - `getDriverCountersByRegime(organizationId, driverId, date, regime)` - Get counter for specific regime
   - `recordDrivingActivity(input)` - Record/update driving activity (upsert counter)
   - `checkCumulativeCompliance(organizationId, driverId, date, additionalMinutes, regime)` - Check if adding activity would violate limits
   - `logComplianceDecision(input)` - Create audit log entry
   - `getRecentAuditLogs(organizationId, driverId, limit)` - Get recent audit logs for driver

5. **Extend Drivers API** (`packages/api/src/routes/vtc/drivers.ts`)

   - GET `/vtc/drivers/:driverId/rse-counters` - Get counters for a date (query param: date)
   - GET `/vtc/drivers/:driverId/rse-counters/:regime` - Get counter for specific regime
   - POST `/vtc/drivers/:driverId/rse-counters/record` - Record driving activity
   - GET `/vtc/drivers/:driverId/compliance-logs` - Get recent audit logs (query param: limit)

6. **Extend Compliance API** (`packages/api/src/routes/vtc/compliance.ts`)

   - POST `/vtc/compliance/check-cumulative` - Check cumulative compliance before assignment
   - Integrate audit logging into existing validation flow

7. **Integrate with Compliance Validator** (`packages/api/src/services/compliance-validator.ts`)
   - Add optional `existingCounters` parameter to `validateHeavyVehicleCompliance()`
   - Modify validation to consider cumulative daily totals

### Frontend (apps/web)

8. **Create RSE Counter Types** (`apps/web/modules/saas/fleet/types.ts`)

   - `DriverRSECounter` interface
   - `ComplianceAuditLog` interface
   - `ComplianceSnapshot` interface

9. **Create Compliance Snapshot Component** (`apps/web/modules/saas/fleet/components/ComplianceSnapshot.tsx`)

   - Display today's counters (driving hours, amplitude, breaks, rest)
   - Progress bars showing percentage of limits used
   - Color-coded status (green/orange/red)

10. **Create Audit Log List Component** (`apps/web/modules/saas/fleet/components/ComplianceAuditLogList.tsx`)

    - List recent compliance decisions
    - Show decision type (APPROVED/BLOCKED/WARNING), timestamp, reason
    - Expandable details for violations/warnings

11. **Extend DriverDrawer** (`apps/web/modules/saas/fleet/components/DriverDrawer.tsx`)

    - Add "Compliance" tab or section
    - Include ComplianceSnapshot component
    - Include ComplianceAuditLogList component

12. **Add Translations** (`packages/i18n/translations/en.json`, `packages/i18n/translations/fr.json`)
    - RSE counter labels
    - Compliance snapshot labels
    - Audit log labels

### Testing

13. **Unit Tests** (`packages/api/src/services/__tests__/rse-counter.test.ts`)

    - Test counter accumulation across multiple activities
    - Test separate tracking for LIGHT vs HEAVY regimes
    - Test cumulative compliance check
    - Test audit log creation
    - Test multi-tenancy enforcement

14. **API Tests** (`packages/api/src/routes/vtc/__tests__/drivers.test.ts` - extend)
    - Test GET /vtc/drivers/:driverId/rse-counters
    - Test POST /vtc/drivers/:driverId/rse-counters/record
    - Test GET /vtc/drivers/:driverId/compliance-logs
    - Test organization scoping

---

## Data Models

### DriverRSECounter

```prisma
model DriverRSECounter {
  id                 String                    @id @default(cuid())
  organizationId     String
  organization       Organization              @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  driverId           String
  driver             Driver                    @relation(fields: [driverId], references: [id], onDelete: Cascade)

  // Date (business date in Europe/Paris)
  date               DateTime                  @db.Date

  // Regulatory regime
  regulatoryCategory VehicleRegulatoryCategory
  licenseCategoryId  String?
  licenseCategory    LicenseCategory?          @relation(fields: [licenseCategoryId], references: [id])

  // Counters (in minutes for precision)
  drivingMinutes     Int                       @default(0)
  amplitudeMinutes   Int                       @default(0)
  breakMinutes       Int                       @default(0)
  restMinutes        Int                       @default(0)

  // Work period tracking
  workStartTime      DateTime?                 // First activity start time
  workEndTime        DateTime?                 // Last activity end time

  // Metadata
  createdAt          DateTime                  @default(now())
  updatedAt          DateTime                  @updatedAt

  @@unique([organizationId, driverId, date, regulatoryCategory])
  @@index([organizationId])
  @@index([driverId])
  @@index([date])
  @@map("driver_rse_counter")
}
```

### ComplianceAuditLog

```prisma
model ComplianceAuditLog {
  id                 String                    @id @default(cuid())
  organizationId     String
  organization       Organization              @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  driverId           String
  driver             Driver                    @relation(fields: [driverId], references: [id], onDelete: Cascade)

  // Timestamp
  timestamp          DateTime                  @default(now())

  // Context
  quoteId            String?
  missionId          String?
  vehicleCategoryId  String?
  regulatoryCategory VehicleRegulatoryCategory

  // Decision
  decision           String                    // "APPROVED", "BLOCKED", "WARNING"
  violations         Json?                     // Array of ComplianceViolation
  warnings           Json?                     // Array of ComplianceWarning
  reason             String

  // Counters snapshot at time of decision
  countersSnapshot   Json?

  @@index([organizationId])
  @@index([driverId])
  @@index([timestamp])
  @@map("compliance_audit_log")
}
```

---

## Interface Definitions

### RecordActivityInput

```typescript
interface RecordActivityInput {
  organizationId: string;
  driverId: string;
  date: Date;
  regulatoryCategory: "LIGHT" | "HEAVY";
  licenseCategoryId?: string;
  drivingMinutes: number;
  amplitudeMinutes?: number;
  breakMinutes?: number;
  workStartTime?: Date;
  workEndTime?: Date;
}
```

### LogDecisionInput

```typescript
interface LogDecisionInput {
  organizationId: string;
  driverId: string;
  quoteId?: string;
  missionId?: string;
  vehicleCategoryId?: string;
  regulatoryCategory: "LIGHT" | "HEAVY";
  decision: "APPROVED" | "BLOCKED" | "WARNING";
  violations?: ComplianceViolation[];
  warnings?: ComplianceWarning[];
  reason: string;
  countersSnapshot?: DriverRSECounter;
}
```

### ComplianceSnapshot

```typescript
interface ComplianceSnapshot {
  date: Date;
  counters: {
    light: DriverRSECounter | null;
    heavy: DriverRSECounter | null;
  };
  limits: {
    light: RSERules | null;
    heavy: RSERules | null;
  };
  status: {
    light: "OK" | "WARNING" | "VIOLATION";
    heavy: "OK" | "WARNING" | "VIOLATION";
  };
}
```

---

## Algorithm: Cumulative Compliance Check

```
1. Load existing counters for driver + date + regime
2. Add proposed activity to existing counters
3. Load RSE rules for the regime
4. Check:
   - Total driving time <= maxDailyDrivingHours
   - Total amplitude <= maxDailyAmplitudeHours
   - Breaks taken as required
5. Return compliance result with:
   - isCompliant: boolean
   - violations: if any limits exceeded
   - warnings: if approaching limits (>90%)
   - projectedCounters: what counters would be after activity
```

---

## Dependencies

- Story 5.1 (Fleet Models & Bases UI) ✅ Done
- Story 5.2 (Drivers, Licence Categories & RSE Rules) ✅ Done
- Story 5.3 (Heavy-Vehicle Compliance Validator) ✅ Done
- Story 5.4 (Alternative Staffing Options) ✅ Done
- Story 1.4 (Europe/Paris Business Time Strategy) ✅ Done

---

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/5-5-track-rse-counters-per-driver-licence-regime.context.xml

### Implementation Notes

- Follow existing service patterns from `compliance-validator.ts`
- Follow existing API patterns from `drivers.ts`
- Use upsert for counter updates (create if not exists, update if exists)
- Counters stored in minutes for precision, convert to hours for display
- Use Europe/Paris timezone for date calculations (per Story 1.4)
- Audit logs are append-only, never updated or deleted
- Consider background job for counter reconciliation from mission history (future enhancement)

### Test Strategy

- **Vitest**: Unit tests for rse-counter.ts service (counter accumulation, regime separation, compliance checks)
- **Vitest**: API tests for new driver endpoints (counters, audit logs)
- **Playwright MCP**: UI tests for ComplianceSnapshot in DriverDrawer
- **Curl**: Manual API verification
- **DB verification**: Check counter and audit log records via postgres_vtc_sixiemme_etoile MCP

---

## Files to Create/Modify

| File                                                                | Action | Description                                            |
| ------------------------------------------------------------------- | ------ | ------------------------------------------------------ |
| `packages/database/prisma/schema.prisma`                            | MODIFY | Add DriverRSECounter and ComplianceAuditLog models     |
| `packages/api/src/services/rse-counter.ts`                          | CREATE | RSE counter service with all counter operations        |
| `packages/api/src/routes/vtc/drivers.ts`                            | MODIFY | Add counter and audit log endpoints                    |
| `packages/api/src/routes/vtc/compliance.ts`                         | MODIFY | Add cumulative check endpoint, integrate audit logging |
| `packages/api/src/services/compliance-validator.ts`                 | MODIFY | Add existingCounters parameter support                 |
| `apps/web/modules/saas/fleet/types.ts`                              | MODIFY | Add RSE counter and audit log types                    |
| `apps/web/modules/saas/fleet/components/ComplianceSnapshot.tsx`     | CREATE | Compliance snapshot display component                  |
| `apps/web/modules/saas/fleet/components/ComplianceAuditLogList.tsx` | CREATE | Audit log list component                               |
| `apps/web/modules/saas/fleet/components/DriverDrawer.tsx`           | MODIFY | Add compliance tab with snapshot and logs              |
| `packages/i18n/translations/en.json`                                | MODIFY | Add RSE counter translations                           |
| `packages/i18n/translations/fr.json`                                | MODIFY | Add RSE counter translations                           |
| `packages/api/src/services/__tests__/rse-counter.test.ts`           | CREATE | Unit tests for RSE counter service                     |
| `packages/api/src/routes/vtc/__tests__/drivers.test.ts`             | MODIFY | Add tests for counter endpoints                        |

---

## Test Cases Summary

| Test ID | AC  | Description                             | Expected Result                           |
| ------- | --- | --------------------------------------- | ----------------------------------------- |
| T1      | AC1 | Record driving activity updates counter | Counter incremented correctly             |
| T2      | AC1 | Multiple activities accumulate          | Total equals sum of activities            |
| T3      | AC1 | Counters readable by validator          | Validator receives counter data           |
| T4      | AC2 | Compliance check creates audit log      | Log entry with decision and reason        |
| T5      | AC2 | Audit log includes counters snapshot    | Snapshot matches current counters         |
| T6      | AC3 | LIGHT morning + HEAVY afternoon         | Separate counters, no cross-contamination |
| T7      | AC3 | HEAVY limits don't affect LIGHT         | Each regime independent                   |
| T8      | AC4 | Driver drawer shows compliance snapshot | Today's hours, amplitude, status visible  |
| T9      | AC4 | Driver drawer shows audit logs          | Recent decisions with reasons             |
| T10     | AC5 | Counters filtered by organizationId     | Only org's counters returned              |
| T11     | AC5 | Cross-org access blocked                | 404 or forbidden response                 |
