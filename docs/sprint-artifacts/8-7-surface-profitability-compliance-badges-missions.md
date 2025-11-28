# Story 8.7: Surface Profitability & Compliance Badges for Missions

**Epic:** 8 - Dispatch & Strategic Optimisation  
**Story ID:** 8-7  
**Status:** done  
**Created:** 2025-11-28  
**Updated:** 2025-11-28

---

## Description

As a **dispatcher**,  
I want profitability and compliance badges visible on each mission in the Dispatch screen,  
So that I can spot problematic assignments at a glance.

## Business Value

- **Quick identification** of loss-making missions (red profitability badge)
- **Immediate visibility** of compliance issues (RSE violations for heavy vehicles)
- **Clear view** of unassigned missions requiring attention
- **Reduced cognitive load** for dispatchers managing multiple missions

## Related Functional Requirements

| FR ID | Description                                                    |
| ----- | -------------------------------------------------------------- |
| FR24  | Profitability indicator (green/orange/red) based on margin     |
| FR47  | Heavy-vehicle compliance validator with explicit error reasons |
| FR48  | Alternative staffing options when compliance fails             |
| FR49  | Track service time per regulation regime                       |
| FR50  | Driver flexibility scoring                                     |

---

## Acceptance Criteria

### AC1: Profitability Badge Display

**Given** the missions list in Dispatch  
**When** I view it  
**Then** each row shows a profitability badge:

- 🟢 **Green**: Margin ≥ 20% (profitable)
- 🟠 **Orange**: Margin 0-20% (low margin)
- 🔴 **Red**: Margin < 0% (loss)

**And** hovering shows a tooltip with exact margin percentage.

### AC2: Compliance Badge Display

**Given** the missions list in Dispatch  
**When** I view it  
**Then** each row shows a compliance badge:

- ✅ **OK** (green shield): No violations or warnings
- ⚠️ **WARNING** (amber triangle): Approaching limits
- ❌ **VIOLATION** (red X): RSE rules exceeded

**And** hovering shows a tooltip with specific warnings/violations.

### AC3: Assignment Badge Display

**Given** the missions list in Dispatch  
**When** I view it  
**Then** each row shows an assignment badge:

- 👤 **Assigned** (blue): Vehicle/driver assigned
- 👤 **Unassigned** (gray): No assignment yet

**And** hovering shows vehicle name, driver name, and base when assigned.

### AC4: Badge Integration in MissionRow

**Given** the `MissionRow` component  
**When** rendered in the missions list  
**Then** it displays all three badges (profitability, compliance, assignment) in the last column.

### AC5: Internationalization

**Given** the dispatch badges  
**When** the user switches language (EN/FR)  
**Then** all badge tooltips display in the selected language.

---

## Technical Implementation

### Components Created

| Component            | Path                                                           | Description                       |
| -------------------- | -------------------------------------------------------------- | --------------------------------- |
| `DispatchBadges`     | `apps/web/modules/saas/dispatch/components/DispatchBadges.tsx` | Main badges container             |
| `ProfitabilityBadge` | (internal)                                                     | Green/orange/red margin indicator |
| `ComplianceBadge`    | (internal)                                                     | OK/Warning/Violation indicator    |
| `AssignmentBadge`    | (internal)                                                     | Assigned/Unassigned indicator     |

### Types Defined

```typescript
// apps/web/modules/saas/dispatch/types/mission.ts

interface MissionProfitability {
  marginPercent: number | null;
  level: "green" | "orange" | "red";
}

interface MissionCompliance {
  status: "OK" | "WARNING" | "VIOLATION";
  warnings: string[];
}

interface MissionAssignment {
  vehicleId: string | null;
  vehicleName: string | null;
  baseName: string | null;
  driverId: string | null;
  driverName: string | null;
}
```

### Backend Functions

```typescript
// packages/api/src/routes/vtc/missions.ts

function getProfitabilityLevel(
  marginPercent: number | null
): "green" | "orange" | "red";
function getComplianceStatus(tripAnalysis: unknown): MissionCompliance;
function getAssignment(tripAnalysis: unknown): MissionAssignment | null;
```

### Translations

**Namespace:** `dispatch.badges`

| Key                     | EN         | FR            |
| ----------------------- | ---------- | ------------- |
| `profitability.green`   | Profitable | Rentable      |
| `profitability.orange`  | Low margin | Marge faible  |
| `profitability.red`     | Loss       | Perte         |
| `compliance.ok`         | Compliant  | Conforme      |
| `compliance.warning`    | Warning    | Avertissement |
| `compliance.violation`  | Violation  | Violation     |
| `assignment.assigned`   | Assigned   | Assigné       |
| `assignment.unassigned` | Unassigned | Non assigné   |

---

## Test Coverage

### Unit Tests (Vitest)

**File:** `apps/web/modules/saas/dispatch/components/__tests__/DispatchBadges.test.tsx`

| Test | Description                                                | Status  |
| ---- | ---------------------------------------------------------- | ------- |
| 1    | Renders green profitability badge when margin >= 20%       | ✅ Pass |
| 2    | Renders orange profitability badge when 0% <= margin < 20% | ✅ Pass |
| 3    | Renders red profitability badge when margin < 0%           | ✅ Pass |
| 4    | Renders compliance OK badge when no violations             | ✅ Pass |
| 5    | Renders compliance warning badge when warnings exist       | ✅ Pass |
| 6    | Renders compliance violation badge when violations exist   | ✅ Pass |
| 7    | Renders assigned badge when vehicle/driver assigned        | ✅ Pass |
| 8    | Renders unassigned badge when no assignment                | ✅ Pass |

### E2E Tests (Playwright)

| Test | Description                                 | Status  |
| ---- | ------------------------------------------- | ------- |
| 1    | Dispatch page displays profitability badges | ✅ Pass |
| 2    | Tooltip shows margin percentage on hover    | ✅ Pass |
| 3    | Compliance badge reflects mission status    | ✅ Pass |
| 4    | Assignment badge updates after assignment   | ✅ Pass |

### API Tests (Curl)

```bash
# List missions with badges data
curl -X GET "http://localhost:3000/api/vtc/missions" \
  -H "Cookie: better-auth.session_token=<token>"

# Expected response includes profitability, compliance, assignment for each mission
```

---

## Dependencies

### Prerequisites (Stories)

- **Story 4.7**: Profitability Indicator (provides margin calculation)
- **Story 5.3-5.6**: RSE Compliance Engine (provides compliance status)
- **Story 8.1**: Dispatch Screen Layout (provides MissionRow integration)

### Technical Dependencies

- `@ui/components/badge` - shadcn/ui Badge component
- `@ui/components/tooltip` - shadcn/ui Tooltip component
- `lucide-react` - Icons (TrendingUp, TrendingDown, AlertTriangle, ShieldCheck, XCircle, UserCheck, UserX)
- `next-intl` - Internationalization

---

## Files Modified/Created

| Action   | File                                                                          |
| -------- | ----------------------------------------------------------------------------- |
| Created  | `apps/web/modules/saas/dispatch/components/DispatchBadges.tsx`                |
| Modified | `apps/web/modules/saas/dispatch/components/MissionRow.tsx`                    |
| Modified | `apps/web/modules/saas/dispatch/components/index.ts`                          |
| Modified | `apps/web/modules/saas/dispatch/types/mission.ts`                             |
| Created  | `apps/web/modules/saas/dispatch/components/__tests__/DispatchBadges.test.tsx` |
| Modified | `packages/i18n/translations/en.json`                                          |
| Modified | `packages/i18n/translations/fr.json`                                          |
| Modified | `packages/api/src/routes/vtc/missions.ts`                                     |

---

## Definition of Done

- [x] All acceptance criteria met
- [x] Unit tests written and passing (8/8)
- [x] E2E tests written and passing
- [x] Translations added (EN/FR)
- [x] Code reviewed
- [x] Documentation updated
- [x] No console errors or warnings
- [x] Responsive design verified
- [x] Accessibility: icons have aria-labels via tooltips

---

## Notes

### Design Decisions

1. **Compact badges**: Using icon-only badges with tooltips to save horizontal space in the table row
2. **Color coding**: Following PRD profitability indicator spec (green ≥20%, orange 0-20%, red <0%)
3. **Lucide icons**: Consistent with project icon library
4. **Tooltip details**: Showing additional context (margin %, warnings list, vehicle/driver info) on hover

### Future Enhancements

- Real-time badge updates via WebSocket when mission status changes
- Filtering missions by badge status (e.g., "show only red profitability")
- Batch operations on missions with specific badge states
