# Story 5.6: Surface Compliance Statuses & Logs in UI

**Epic:** 5 - Fleet & RSE Compliance Engine  
**Status:** ready-for-dev  
**Priority:** High  
**Story Points:** 5

---

## User Story

**As an** operator,  
**I want** clear compliance statuses and logs surfaced in Dispatch and Drivers views,  
**So that** I understand why a mission is blocked or risky.

---

## Related Functional Requirements

- **FR30**: Compliance checks and decisions (including violations prevented) shall be logged for audit purposes.
- **FR46**: The UI shall provide blocking alerts when a requested trip is operationally or regulatorily impossible and guide the operator to adjust parameters or staffing.
- **FR47**: The system shall provide a heavy-vehicle compliance validator that checks daily amplitude, total driving time, mandatory breaks and mandatory daily rest against configurable legal thresholds and blocks non-compliant missions with explicit error reasons.
- **FR48**: When heavy-vehicle compliance validation fails, the system shall generate and present alternative, legally compliant staffing or scheduling options.
- **FR49**: The system shall track service time separately for each relevant regulation regime per driver and per day.

---

## Acceptance Criteria

### AC1: Dispatch Compliance Badge with Details

**Given** the Dispatch screen  
**When** I look at the missions list  
**Then** each mission shows a compliance badge (OK / Warning / Violation) with Lucide icons as per UX spec  
**And** clicking the mission reveals details of which rules were checked and any warnings

### AC2: Mission Compliance Details Panel

**Given** a selected mission in the Dispatch screen  
**When** I view the mission detail panel (right side)  
**Then** I see a compliance section showing:

- Overall status (OK/Warning/Violation) with icon
- List of rules checked with pass/fail status
- Violations with explicit reasons (type, actual vs limit, unit)
- Warnings with percentage of limit reached

### AC3: Compliance Audit Logs for Mission

**Given** a mission with compliance checks  
**When** I expand the compliance details  
**Then** I see a list of recent validation decisions with:

- Timestamp
- Decision (APPROVED/BLOCKED/WARNING)
- Reason
- Expandable details for violations/warnings

### AC4: Driver Compliance in Drawer (Verification)

**Given** the Drivers detail drawer  
**When** I open it  
**Then** I see a compliance snapshot (today's hours, amplitude, rest status)  
**And** a list of recent validation decisions with reasons  
_(Already implemented in Story 5.5 - verify integration works correctly)_

### AC5: LIGHT Vehicle Handling

**Given** a mission with a LIGHT vehicle  
**When** compliance is displayed  
**Then** the badge shows "OK" (no RSE violations possible)  
**And** the details panel explains that RSE rules only apply to HEAVY vehicles

### AC6: Multi-Tenancy Enforcement

**Given** compliance data for a mission  
**When** queried via API  
**Then** data is scoped by organizationId (multi-tenancy enforced)

---

## Technical Tasks

### Database (packages/database)

1. **No schema changes required**
   - ComplianceAuditLog model already exists (Story 5.5)
   - MissionCompliance data derived from Quote.tripAnalysis

### Backend (packages/api)

2. **Create Mission Compliance API Endpoint** (`packages/api/src/routes/vtc/missions.ts`)

   - [ ] Add `GET /vtc/missions/:id/compliance` endpoint
   - [ ] Return: vehicleRegulatoryCategory, validationResult, auditLogs
   - [ ] Filter audit logs by missionId (quoteId)
   - [ ] Enforce organizationId scoping

3. **Extend Missions List Response** (`packages/api/src/routes/vtc/missions.ts`)
   - [ ] Ensure compliance status is included in list response (already present)
   - [ ] Add complianceDetails to MissionDetail response

### Frontend (apps/web)

4. **Create MissionComplianceDetails Component** (`apps/web/modules/saas/dispatch/components/MissionComplianceDetails.tsx`)

   - [ ] Display overall compliance status with icon
   - [ ] Show list of rules checked with pass/fail status
   - [ ] Display violations with explicit reasons
   - [ ] Display warnings with percentage indicators
   - [ ] Handle LIGHT vehicle case (no rules apply)

5. **Create ComplianceRulesList Component** (`apps/web/modules/saas/dispatch/components/ComplianceRulesList.tsx`)

   - [ ] Reusable list of applied compliance rules
   - [ ] Show rule name, threshold, result (PASS/FAIL/WARNING)
   - [ ] Color-coded status indicators

6. **Create MissionComplianceAuditLogs Component** (`apps/web/modules/saas/dispatch/components/MissionComplianceAuditLogs.tsx`)

   - [ ] List of audit log entries for the mission
   - [ ] Show timestamp, decision, reason
   - [ ] Expandable details for violations/warnings

7. **Extend Dispatch Types** (`apps/web/modules/saas/dispatch/types/mission.ts`)

   - [ ] Add `MissionComplianceDetails` interface
   - [ ] Extend `MissionDetail` with `complianceDetails` field

8. **Integrate into DispatchPage** (`apps/web/modules/saas/dispatch/components/DispatchPage.tsx`)

   - [ ] Add MissionComplianceDetails to the detail panel
   - [ ] Fetch compliance details when mission is selected
   - [ ] Position in TripTransparencyPanel area or as separate section

9. **Create useMissionCompliance Hook** (`apps/web/modules/saas/dispatch/hooks/useMissionCompliance.ts`)

   - [ ] Fetch compliance details for selected mission
   - [ ] Handle loading and error states

10. **Add Translations** (`packages/i18n/translations/en.json`, `packages/i18n/translations/fr.json`)
    - [ ] dispatch.compliance namespace
    - [ ] Status labels, rule names, violation messages

### Testing

11. **Unit Tests** (`apps/web/modules/saas/dispatch/components/__tests__/MissionComplianceDetails.test.tsx`)

    - [ ] Test HEAVY vehicle with violations
    - [ ] Test HEAVY vehicle with warnings
    - [ ] Test HEAVY vehicle OK status
    - [ ] Test LIGHT vehicle (N/A state)
    - [ ] Test empty audit logs

12. **API Tests** (`packages/api/src/routes/vtc/__tests__/missions.test.ts`)
    - [ ] Test GET /vtc/missions/:id/compliance
    - [ ] Test organization scoping
    - [ ] Test 404 for non-existent mission

---

## Data Models

### MissionComplianceDetails (Frontend Type)

```typescript
interface MissionComplianceDetails {
  missionId: string;
  vehicleRegulatoryCategory: "LIGHT" | "HEAVY";
  validationResult: ComplianceValidationResult | null;
  auditLogs: ComplianceAuditLog[];
}

interface ComplianceValidationResult {
  isCompliant: boolean;
  regulatoryCategory: "LIGHT" | "HEAVY";
  violations: ComplianceViolation[];
  warnings: ComplianceWarning[];
  adjustedDurations: {
    totalDrivingMinutes: number;
    totalAmplitudeMinutes: number;
    injectedBreakMinutes: number;
    cappedSpeedApplied: boolean;
  };
  rulesApplied: AppliedComplianceRule[];
}

interface ComplianceViolation {
  type:
    | "DRIVING_TIME_EXCEEDED"
    | "AMPLITUDE_EXCEEDED"
    | "BREAK_REQUIRED"
    | "SPEED_LIMIT_EXCEEDED";
  message: string;
  actual: number;
  limit: number;
  unit: "hours" | "minutes" | "km/h";
  severity: "BLOCKING";
}

interface ComplianceWarning {
  type: "APPROACHING_LIMIT" | "BREAK_RECOMMENDED";
  message: string;
  actual: number;
  limit: number;
  percentOfLimit: number;
}

interface AppliedComplianceRule {
  ruleId: string;
  ruleName: string;
  threshold: number;
  unit: string;
  result: "PASS" | "FAIL" | "WARNING";
}

interface ComplianceAuditLog {
  id: string;
  timestamp: string;
  decision: "APPROVED" | "BLOCKED" | "WARNING";
  reason: string;
  violations: ComplianceViolation[] | null;
  warnings: ComplianceWarning[] | null;
  countersSnapshot: unknown | null;
}
```

---

## API Design

### GET /api/vtc/missions/:id/compliance

**Response:**

```json
{
  "missionId": "mission-123",
  "vehicleRegulatoryCategory": "HEAVY",
  "validationResult": {
    "isCompliant": false,
    "regulatoryCategory": "HEAVY",
    "violations": [
      {
        "type": "DRIVING_TIME_EXCEEDED",
        "message": "Total driving time exceeds maximum allowed",
        "actual": 11.5,
        "limit": 10,
        "unit": "hours",
        "severity": "BLOCKING"
      }
    ],
    "warnings": [],
    "adjustedDurations": {
      "totalDrivingMinutes": 690,
      "totalAmplitudeMinutes": 840,
      "injectedBreakMinutes": 90,
      "cappedSpeedApplied": true
    },
    "rulesApplied": [
      {
        "ruleId": "max-driving-time",
        "ruleName": "Maximum Daily Driving Time",
        "threshold": 10,
        "unit": "hours",
        "result": "FAIL"
      },
      {
        "ruleId": "max-amplitude",
        "ruleName": "Maximum Daily Amplitude",
        "threshold": 14,
        "unit": "hours",
        "result": "PASS"
      }
    ]
  },
  "auditLogs": [
    {
      "id": "log-1",
      "timestamp": "2025-11-28T09:00:00Z",
      "decision": "BLOCKED",
      "reason": "Driving time exceeded: 11.5h > 10h limit",
      "violations": [...],
      "warnings": null,
      "countersSnapshot": {...}
    }
  ]
}
```

---

## Component Structure

```
DispatchPage
├── MissionsList
│   └── MissionRow
│       └── DispatchBadges (existing)
│           └── ComplianceBadge (existing - shows status + tooltip)
├── DispatchMapGoogle
└── Detail Panel (right side)
    ├── TripTransparencyPanel (existing)
    ├── VehicleAssignmentPanel (existing)
    └── MissionComplianceDetails (NEW)
        ├── ComplianceStatusHeader
        ├── ComplianceRulesList
        ├── ComplianceViolationsList
        ├── ComplianceWarningsList
        └── MissionComplianceAuditLogs
```

---

## UI/UX Notes

- **Badge Icons** (Lucide):

  - OK: `ShieldCheck` (green)
  - Warning: `AlertTriangle` (amber)
  - Violation: `XCircle` (red)

- **Layout**:

  - Compliance details in a Card below TripTransparencyPanel
  - Collapsible sections for rules, violations, warnings, logs
  - Use existing color scheme from ComplianceSnapshot component

- **LIGHT Vehicle State**:

  - Show "RSE rules do not apply to light vehicles" message
  - Badge shows OK with "N/A" tooltip

- **Empty States**:
  - No audit logs: "No compliance checks recorded"
  - No violations: "All rules passed"

---

## Dependencies

### Prerequisites (Done)

- Story 5.1: Fleet Models & Bases UI ✅
- Story 5.2: Drivers, Licence Categories & RSE Rules ✅
- Story 5.3: Heavy-Vehicle Compliance Validator ✅
- Story 5.4: Alternative Staffing Options ✅
- Story 5.5: RSE Counters & Audit Logs ✅
- Story 8.1: Dispatch Screen Layout ✅
- Story 6.5: Blocking & Non-Blocking Alerts ✅

### Related

- Story 8.7: Surface Profitability & Compliance Badges for Missions (backlog)

---

## Definition of Done

- [ ] API endpoint GET /vtc/missions/:id/compliance implemented
- [ ] MissionComplianceDetails component created
- [ ] ComplianceRulesList component created
- [ ] MissionComplianceAuditLogs component created
- [ ] Components integrated into DispatchPage
- [ ] LIGHT vehicle case handled correctly
- [ ] Translations added (EN/FR)
- [ ] Unit tests passing
- [ ] API tests passing
- [ ] E2E tests passing (Playwright)
- [ ] Multi-tenancy enforced
- [ ] Code reviewed
- [ ] Documentation updated

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/5-6-surface-compliance-statuses-logs-ui.context.xml`

### Implementation Notes

- Reuse patterns from ComplianceSnapshot and ComplianceAuditLogList (Story 5.5)
- Reuse DispatchBadges pattern for consistency
- Compliance data comes from Quote.tripAnalysis.complianceResult
- Audit logs filtered by quoteId (mission is derived from quote)
- Use existing compliance-validator.ts interfaces

### Implementation Summary

**Completed:**

- Added compliance types to `apps/web/modules/saas/dispatch/types/mission.ts`
- Created API endpoint `GET /vtc/missions/:id/compliance` in `packages/api/src/routes/vtc/missions.ts`
- Created `useMissionCompliance` hook for fetching compliance details
- Created `MissionComplianceDetails` component with:
  - Overall status display (OK/Warning/Violation)
  - Adjusted durations summary (driving time, amplitude, breaks)
  - Violations list with details
  - Warnings list with percentages
  - Collapsible rules list
  - Collapsible audit logs
  - LIGHT vehicle handling (shows "RSE rules don't apply")
- Created `ComplianceRulesList` component for displaying applied rules
- Created `MissionComplianceAuditLogs` component for audit log entries
- Integrated `MissionComplianceDetails` into `DispatchPage`
- Added EN/FR translations for `dispatch.compliance` namespace

### Test Strategy

- **Vitest**: Unit tests for new components
- **Vitest**: API tests for compliance endpoint
- **Playwright MCP**: E2E tests for Dispatch screen compliance flow
- **Curl**: Manual API verification
- **DB verification**: Check audit logs via postgres_vtc_sixiemme_etoile MCP

---

## Files to Create/Modify

| File                                                                                    | Action | Description                          |
| --------------------------------------------------------------------------------------- | ------ | ------------------------------------ |
| `packages/api/src/routes/vtc/missions.ts`                                               | MODIFY | Add GET /:id/compliance endpoint     |
| `apps/web/modules/saas/dispatch/types/mission.ts`                                       | MODIFY | Add MissionComplianceDetails type    |
| `apps/web/modules/saas/dispatch/hooks/useMissionCompliance.ts`                          | CREATE | Hook for fetching compliance details |
| `apps/web/modules/saas/dispatch/components/MissionComplianceDetails.tsx`                | CREATE | Main compliance details component    |
| `apps/web/modules/saas/dispatch/components/ComplianceRulesList.tsx`                     | CREATE | Rules list component                 |
| `apps/web/modules/saas/dispatch/components/MissionComplianceAuditLogs.tsx`              | CREATE | Audit logs component                 |
| `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`                            | MODIFY | Integrate compliance details         |
| `apps/web/modules/saas/dispatch/components/index.ts`                                    | MODIFY | Export new components                |
| `packages/i18n/translations/en.json`                                                    | MODIFY | Add dispatch.compliance translations |
| `packages/i18n/translations/fr.json`                                                    | MODIFY | Add dispatch.compliance translations |
| `apps/web/modules/saas/dispatch/components/__tests__/MissionComplianceDetails.test.tsx` | CREATE | Unit tests                           |
| `packages/api/src/routes/vtc/__tests__/missions.test.ts`                                | MODIFY | Add compliance endpoint tests        |

---

## Test Cases Summary

| Test ID | AC  | Description                             | Expected Result                         |
| ------- | --- | --------------------------------------- | --------------------------------------- |
| T1      | AC1 | Compliance badge shows on mission row   | Badge visible with correct status       |
| T2      | AC2 | Select mission shows compliance details | Details panel displays rules and status |
| T3      | AC2 | HEAVY vehicle with violations           | Violations listed with reasons          |
| T4      | AC2 | HEAVY vehicle with warnings             | Warnings listed with percentages        |
| T5      | AC3 | Audit logs displayed                    | Logs show timestamp, decision, reason   |
| T6      | AC4 | Driver drawer compliance tab            | Snapshot and logs visible               |
| T7      | AC5 | LIGHT vehicle selected                  | Shows "N/A" or "Rules don't apply"      |
| T8      | AC6 | Cross-org access attempt                | 404 or forbidden response               |
