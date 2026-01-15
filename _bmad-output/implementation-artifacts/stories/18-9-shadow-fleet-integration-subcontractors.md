# Story 18.9: Shadow Fleet Integration (Subcontractors)

Status: ready-for-dev

## Story

As a **dispatcher**,
I want to see available subcontractor vehicles alongside internal fleet in the assignment drawer,
So that I can handle peak demand by leveraging external capacity with full margin visibility.

## Business Context

**FR86:** The system shall support integration of external subcontractor partners (Shadow Fleet) as temporary nodes in the dispatch graph, with their availability, zones, and indicative pricing, enabling elastic capacity during peak demand.

### Value Proposition

- **Elastic Capacity**: Handle demand peaks (events, high season) without permanent fleet investment
- **Dispatch Integration**: Subcontractors appear as candidates alongside internal vehicles
- **Margin Transparency**: Operators see clear cost comparison before assigning to external partners
- **Visual Distinction**: Shadow Fleet entries are clearly marked as external

### Prerequisites

- Epic 8 (Dispatch & Strategic Optimisation) - DONE
- Story 8.6 (Subcontractor Directory & Suggestions) - DONE

## Acceptance Criteria

### AC1: Shadow Fleet Candidates in Assignment Drawer

**Given** a configured list of subcontractor partners with their zones and indicative pricing,
**When** a dispatcher opens the assignment drawer for a mission,
**Then** they shall see subcontractor vehicles as "Shadow Fleet" entries alongside internal candidates.

**And** Shadow Fleet entries shall be visually distinct (badge, icon, or color).

### AC2: Shadow Fleet Entry Display

**Given** a Shadow Fleet candidate in the assignment drawer,
**When** the dispatcher views the candidate,
**Then** they shall see:

- Partner/company name
- Vehicle category offered
- Indicative price (based on ratePerKm/ratePerHour)
- Availability status (available/unavailable)
- Zone match indicator (pickup/dropoff coverage)

### AC3: Margin Comparison on Selection

**Given** a dispatcher selects a Shadow Fleet candidate,
**When** the selection is made,
**Then** the system shall calculate and display:

- Internal cost (what it would cost with internal fleet)
- Subcontractor cost (indicative price)
- Resulting margin if subcontracted
- Recommendation badge (SUBCONTRACT / INTERNAL / REVIEW)

### AC4: Shadow Fleet Assignment Flow

**Given** a dispatcher confirms assignment to a Shadow Fleet candidate,
**When** the assignment is confirmed,
**Then** the mission shall be marked as subcontracted with:

- `isSubcontracted = true`
- `subcontractorId` set to the selected partner
- `subcontractedPrice` set to the agreed price
- Audit log entry created

### AC5: Shadow Fleet Filtering

**Given** the assignment drawer with mixed candidates (internal + Shadow Fleet),
**When** the dispatcher uses filters,
**Then** they shall be able to:

- Filter to show only internal fleet
- Filter to show only Shadow Fleet
- Sort by cost (including subcontractor indicative prices)

### AC6: Subcontractor Availability Model

**Given** a subcontractor partner in the system,
**When** their availability is queried for a mission,
**Then** the system shall check:

- Operating zones match (pickup and/or dropoff)
- Vehicle category compatibility
- Active status (`isActive = true`)
- Optional: Manual availability flag if configured

## Tasks / Subtasks

### Task 1: Extend SubcontractorProfile Model (AC: 6)

- [ ] 1.1 Add optional `availabilityStatus` enum field (AVAILABLE, BUSY, OFFLINE)
- [ ] 1.2 Add optional `availabilityNotes` field for manual status notes
- [ ] 1.3 Create migration for new fields
- [ ] 1.4 Update seed data if needed

### Task 2: Create Shadow Fleet Candidates Service (AC: 1, 2, 6)

- [ ] 2.1 Create `shadow-fleet-service.ts` in `packages/api/src/services/`
- [ ] 2.2 Implement `getShadowFleetCandidates(missionId, organizationId)` function
- [ ] 2.3 Calculate indicative price using existing `calculateSubcontractorPrice()` logic
- [ ] 2.4 Return candidates in format compatible with `AssignmentCandidate` type
- [ ] 2.5 Add zone match scoring using existing `isPointInZone()` logic

### Task 3: Extend Assignment Candidates API (AC: 1, 2)

- [ ] 3.1 Modify `/api/vtc/missions/:id/candidates` to include Shadow Fleet
- [ ] 3.2 Add `isShadowFleet: boolean` flag to candidate response
- [ ] 3.3 Add `subcontractorId` and `subcontractorName` fields for Shadow Fleet candidates
- [ ] 3.4 Add query param `?includeShadowFleet=true` (default: true)

### Task 4: Extend AssignmentCandidate Type (AC: 1, 2, 3)

- [ ] 4.1 Add `isShadowFleet: boolean` to `AssignmentCandidate` type
- [ ] 4.2 Add `subcontractorId?: string` field
- [ ] 4.3 Add `subcontractorName?: string` field
- [ ] 4.4 Add `indicativePrice?: number` for Shadow Fleet candidates
- [ ] 4.5 Add `marginComparison?: MarginComparison` for Shadow Fleet candidates

### Task 5: Update CandidatesList Component (AC: 1, 2)

- [ ] 5.1 Add visual distinction for Shadow Fleet entries (badge/icon)
- [ ] 5.2 Display partner name instead of vehicle name for Shadow Fleet
- [ ] 5.3 Show indicative price prominently
- [ ] 5.4 Add "Shadow Fleet" badge with distinct styling

### Task 6: Add Margin Comparison Panel (AC: 3)

- [ ] 6.1 Create `ShadowFleetMarginPanel` component
- [ ] 6.2 Show when Shadow Fleet candidate is selected
- [ ] 6.3 Display internal vs subcontractor cost comparison
- [ ] 6.4 Show recommendation badge (reuse from SubcontractingSuggestions)

### Task 7: Update CandidateFilters Component (AC: 5)

- [ ] 7.1 Add "Fleet Type" filter (All / Internal / Shadow Fleet)
- [ ] 7.2 Update filter logic in AssignmentDrawer
- [ ] 7.3 Add translations for new filter options

### Task 8: Update Assignment Flow for Shadow Fleet (AC: 4)

- [ ] 8.1 Modify `useAssignMission` hook to handle Shadow Fleet assignments
- [ ] 8.2 When Shadow Fleet candidate selected, call subcontract endpoint instead
- [ ] 8.3 Show price confirmation dialog for Shadow Fleet assignments
- [ ] 8.4 Reuse `SubcontractingDialog` component for confirmation

### Task 9: Add Translations (AC: All)

- [ ] 9.1 Add French translations in `apps/web/messages/fr/dispatch.json`
- [ ] 9.2 Add English translations in `apps/web/messages/en/dispatch.json`

### Task 10: Write Tests (AC: All)

- [ ] 10.1 Unit tests for `shadow-fleet-service.ts`
- [ ] 10.2 API integration tests for candidates endpoint with Shadow Fleet
- [ ] 10.3 Component tests for Shadow Fleet display in CandidatesList
- [ ] 10.4 E2E test for Shadow Fleet assignment flow

## Dev Notes

### Existing Code to Reuse

1. **Subcontractor Service** (`packages/api/src/services/subcontractor-service.ts`):

   - `findSubcontractorsForMission()` - Zone matching logic
   - `calculateSubcontractorPrice()` - Price calculation
   - `compareMargins()` - Margin comparison
   - `isPointInZone()` - Geospatial matching

2. **Subcontractor Types** (`apps/web/modules/saas/dispatch/types/subcontractor.ts`):

   - `MarginComparison` interface
   - `SubcontractingSuggestion` interface
   - Helper functions: `formatPrice`, `getRecommendationColor`

3. **Subcontracting UI** (`apps/web/modules/saas/dispatch/components/`):

   - `SubcontractingDialog.tsx` - Reuse for confirmation
   - `SubcontractingSuggestions.tsx` - Reuse margin comparison table

4. **Assignment Types** (`apps/web/modules/saas/dispatch/types/assignment.ts`):
   - `AssignmentCandidate` - Extend with Shadow Fleet fields
   - `CandidateCompliance` - Reuse for Shadow Fleet

### Architecture Pattern

```
┌─────────────────────────────────────────────────────────────┐
│                    AssignmentDrawer                          │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ CandidateFilters (+ Fleet Type filter)                  ││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ CandidatesList                                          ││
│  │  ├─ Internal Candidate (existing)                       ││
│  │  ├─ Internal Candidate (existing)                       ││
│  │  ├─ 🏢 Shadow Fleet: Partner A (NEW - visually distinct)││
│  │  └─ 🏢 Shadow Fleet: Partner B (NEW - visually distinct)││
│  └─────────────────────────────────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ ShadowFleetMarginPanel (shown when SF selected)         ││
│  │  - Internal cost vs Subcontractor cost                  ││
│  │  - Margin comparison                                    ││
│  │  - Recommendation badge                                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### API Response Extension

```typescript
// Extended AssignmentCandidate for Shadow Fleet
interface AssignmentCandidate {
  // ... existing fields ...

  // NEW: Shadow Fleet fields
  isShadowFleet: boolean;
  subcontractorId?: string;
  subcontractorName?: string;
  indicativePrice?: number;
  marginComparison?: {
    internalCost: number;
    subcontractorCost: number;
    savings: number;
    savingsPercent: number;
    recommendation: "SUBCONTRACT" | "INTERNAL" | "REVIEW";
  };
}
```

### Visual Design for Shadow Fleet Entries

```
┌────────────────────────────────────────────────────────┐
│ 🏢 Partner Transport ABC          [Shadow Fleet] badge │
│ Category: Berline                                      │
│ Zones: CDG ✓, Paris ✓                                  │
│ Indicative Price: €180.00                              │
│ ────────────────────────────────────────────────────── │
│ Margin if subcontracted: €45.00 (20%)  [SUBCONTRACT]  │
└────────────────────────────────────────────────────────┘
```

### Project Structure Notes

Files to create:

- `packages/api/src/services/shadow-fleet-service.ts`
- `apps/web/modules/saas/dispatch/components/ShadowFleetMarginPanel.tsx`

Files to modify:

- `packages/database/prisma/schema.prisma` (SubcontractorProfile)
- `packages/api/src/routes/vtc/missions.ts` (candidates endpoint)
- `apps/web/modules/saas/dispatch/types/assignment.ts`
- `apps/web/modules/saas/dispatch/components/CandidatesList.tsx`
- `apps/web/modules/saas/dispatch/components/CandidateFilters.tsx`
- `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx`
- `apps/web/modules/saas/dispatch/hooks/useAssignMission.ts`
- `apps/web/messages/fr/dispatch.json`
- `apps/web/messages/en/dispatch.json`

### References

- [Source: docs/bmad/epics.md#Story-18.9] - Story definition
- [Source: docs/bmad/prd.md#FR86] - Functional requirement
- [Source: packages/api/src/services/subcontractor-service.ts] - Existing subcontractor logic
- [Source: apps/web/modules/saas/dispatch/components/SubcontractingSuggestions.tsx] - UI patterns
- [Source: apps/web/modules/saas/dispatch/types/assignment.ts] - Assignment types

## Dev Agent Record

### Agent Model Used

Claude 3.5 Sonnet (Cascade)

### Completion Notes List

- Story created from Epic 18 backlog
- Builds on existing Story 8.6 subcontractor infrastructure
- Reuses existing margin comparison and zone matching logic
- Visual distinction pattern follows existing badge conventions
- Added `availabilityStatus` enum (AVAILABLE, BUSY, OFFLINE) to SubcontractorProfile
- Created shadow-fleet-service.ts with candidate generation and transformation
- Extended /missions/:id/candidates API to include Shadow Fleet candidates
- Added `isShadowFleet` flag and related fields to AssignmentCandidate type
- Updated CandidateRow with distinct purple styling for Shadow Fleet entries
- Added Fleet Type filter (All/Internal/Shadow Fleet) to CandidateFilters
- Updated AssignmentDrawer with fleet type filtering logic
- Added FR/EN translations for all new UI elements

### File List

**Created:**

- `packages/api/src/services/shadow-fleet-service.ts` - Shadow Fleet candidate service
- `packages/database/prisma/migrations/20251231122437_add_subcontractor_availability_status/migration.sql` - DB migration

**Modified:**

- `packages/database/prisma/schema.prisma` - Added SubcontractorAvailability enum and fields
- `packages/api/src/routes/vtc/missions.ts` - Extended candidates endpoint with Shadow Fleet
- `apps/web/modules/saas/dispatch/types/assignment.ts` - Extended types with Shadow Fleet fields
- `apps/web/modules/saas/dispatch/components/CandidateRow.tsx` - Shadow Fleet display
- `apps/web/modules/saas/dispatch/components/CandidateFilters.tsx` - Fleet Type filter
- `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx` - Fleet type filtering
- `packages/i18n/translations/fr.json` - French translations
- `packages/i18n/translations/en.json` - English translations
