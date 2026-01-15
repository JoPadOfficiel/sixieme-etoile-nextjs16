# Story 25.1: Generate & Manage Mission Sheets (Fiche Mission)

## 📋 Story Overview
| Field | Value |
|-------|-------|
| **Epic** | 25 - Documents, Payments & Deep Linking Enhancements |
| **Story ID** | 25.1 |
| **Status** | review |
| **Priority** | HIGH - Essential for driver operations |
| **Estimated Time** | 2-3h |
| **Branch** | `feature/25-1-mission-sheets` |
| **Agent Assignment** | Claude Sonnet |

## 🎯 Business Objective

Implement the generation of "Fiche Mission" (Transport Orders) that drivers can use as a reference and trip record. The document must be pre-filled with mission data but allow manual entry for actual costs and feedback.

## 📝 Description

As a **dispatcher**, I want to generate a PDF "Fiche Mission" for assigned drivers so they have all trip details and can record actual mileage and toll costs for later administrative processing.

### Current State
- Mission Orders are mentioned but not implemented in `pdf-generator.ts`
- Dispatch screen allows assignments but doesn't have a "Generate Mission Sheet" action
- Activity history for Drivers is basic and doesn't track document generation

### Target State
- New document type "MISSION_ORDER" in `pdf-generator.ts`
- Consistent header with branding (using work from 25.2)
- Table for trip details: Client, Vehicle, Pickup/Dropoff
- Manual entry fields (empty in PDF): Km départ/arrivée, Péages, Notes
- Action button in Dispatch → Assignment Drawer
- Automated Activity log entry: "Mission Sheet Generated" in Driver's CRM profile

## ✅ Acceptance Criteria

### AC1: PDF Template Implementation
- [ ] Implement `generateMissionOrderPdf()` in `pdf-generator.ts`
- [ ] Incorporate common header (from Story 25.2 reference)
- [ ] Include section "RÉSUMÉ MISSION" with ID, Driver, Vehicle
- [ ] Include section "TRAJET" with Pickup/Dropoff addresses and times
- [ ] Include section "CLIENT & PASSAGERS" with names and special notes
- [ ] Include section "ZONE DE SAISIE CONDUCTEUR" (Driver Input Area):
  - Km Départ (_____ km)
  - Km Arrivée (_____ km)
  - Péages / Tolls (_____ €)
  - Observations / Signatures

### AC2: Dispatch UI Integration
- [ ] Add "Generate Mission Sheet" button in the Dispatch Assignment Drawer
- [ ] Trigger PDF generation and download
- [ ] Show loading state during generation

### AC3: Driver CRM Activity Log
- [ ] Upon generation, create an activity record in the database
- [ ] Link activity to the `driverId` and `quoteId`
- [ ] Label: "Génération Fiche Mission"

## 🧪 Test Cases

### Unit Tests
1. **PDF Generation test**: Verify `MISSION_ORDER` type produces a valid buffer
2. **Branding consistency test**: Verify logo positioning matches 25.2 settings
3. **Activity log test**: Verify record creation in Driver profile

### Manual Verification
1. Navigate to Dispatch
2. Open an assigned mission
3. Click "Generate Mission Sheet"
4. Verify PDF layout and presence of fillable lines
5. Check Driver's activity history for the log entry

## 🔧 Technical Implementation

### Files to Modify
1. `packages/api/src/services/pdf-generator.ts`: Implement mission order logic
2. `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx`: Add generation action
3. `packages/api/src/routes/vtc/missions.ts` (or similar): Create activity record logic

## 📦 Deliverables
1. Updated PDF Service
2. New UI button in Dispatch
3. Activity logging integration

## 🔍 Review Findings & Action Items

### 🔴 Critical Issues
- **[RESOLVED] [AI-Review] AC3 Implementation Missing**: The automated activity log entry was skipped in `documents.ts` because the `Activity` model is missing in the current Prisma schema. This result in non-compliance with AC3 ("Upon generation, create an activity record").
  - *Action*: Implement the `Activity` model in Prisma or define an alternative logging strategy immediately. -> **Done** (Added Activity model and logging)

### 🟡 Medium Issues
- **[RESOLVED] [AI-Review] UX - AssignmentDrawer**: The "Print Mission Sheet" button is accessible when a candidate is merely selected but not yet assigned. Generating a mission sheet for an unconfirmed driver is risky.
  - *Action*: Disable the button until the assignment is confirmed/saved, or change the flow to assigning before printing. -> **Done** (Button now hidden if selection != current assignment)

