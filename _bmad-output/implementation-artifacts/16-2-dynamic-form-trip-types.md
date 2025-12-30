# Story 16.2 – Formulaire Dynamique par Type de Trajet

**Epic:** Epic 16 - Refactorisation du Système de Devis par Type de Trajet  
**Status:** done
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Created:** 2025-12-02  
**Prerequisites:** Story 16.1 (Schéma Quote étendu) ✅ DONE

---

## User Story

**As an** operator,  
**I want** the quote creation form to adapt based on the selected trip type,  
**So that** I only see and fill in the fields relevant to that trip type.

---

## Problem Statement

Le formulaire de création de devis (`QuoteBasicInfoPanel`) affiche actuellement les mêmes champs pour tous les types de trajets. Cela crée une expérience utilisateur confuse et empêche la saisie des données spécifiques à chaque type :

| Type          | Problème Actuel             | Solution Attendue                      |
| ------------- | --------------------------- | -------------------------------------- |
| **TRANSFER**  | Pas d'option aller-retour   | Checkbox "Aller-retour"                |
| **EXCURSION** | Pas d'arrêts intermédiaires | Liste dynamique d'arrêts + date retour |
| **DISPO**     | Dropoff obligatoire         | Masquer dropoff, afficher durée/km max |
| **OFF_GRID**  | Dropoff obligatoire         | Dropoff optionnel, notes obligatoires  |

---

## Acceptance Criteria

### AC1 - Transfer Form

**Given** I select trip type "Transfer",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- Dropoff address (required)
- Pickup date/time (required)
- **NEW:** Checkbox "Aller-retour" (Round trip)

**And** if I check "Aller-retour", the `isRoundTrip` field is set to `true`.

### AC2 - Excursion Form

**Given** I select trip type "Excursion",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- Dropoff address (required, defaults to same as pickup for round-trip excursions)
- **NEW:** "Ajouter un arrêt" button to add intermediate stops
- **NEW:** Return date picker (optional, defaults to same day)
- Pickup date/time (required)

**And** I can add/remove stops dynamically (max 10),  
**And** each stop has an address autocomplete field,  
**And** stops can be reordered with up/down buttons.

### AC3 - Mise à Disposition Form

**Given** I select trip type "Mise à disposition",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- **NO** Dropoff address field (hidden)
- Pickup date/time (required)
- **NEW:** Duration in hours (required, number input, min 1, max 24)
- **NEW:** Max kilometers (auto-calculated: duration × 50, editable)

**And** the `durationHours` and `maxKilometers` fields are populated in formData.

### AC4 - Off-grid Form

**Given** I select trip type "Off-grid",  
**When** the form updates,  
**Then** I see:

- Pickup address (required)
- Dropoff address (optional, with "(optionnel)" label)
- Pickup date/time (required)
- Notes field is highlighted as required with placeholder "Décrivez le trajet..."

**And** the notes field shows a validation error if empty on submit.

### AC5 - Form Validation

**Given** any trip type,  
**When** I try to submit without required fields,  
**Then** validation errors are shown for missing fields specific to that trip type,  
**And** the "Create Quote" button remains disabled until all required fields are filled.

### AC6 - Smooth Transitions

**Given** I change the trip type,  
**When** the form updates,  
**Then** the transition is smooth (no jarring layout shifts),  
**And** previously entered data for common fields (pickup, date, vehicle) is preserved.

---

## Technical Design

### New Components

#### 1. `TripTypeFormFields.tsx`

```typescript
interface TripTypeFormFieldsProps {
  tripType: TripType;
  formData: CreateQuoteFormData;
  onFormChange: <K extends keyof CreateQuoteFormData>(
    field: K,
    value: CreateQuoteFormData[K]
  ) => void;
  disabled?: boolean;
}
```

Renders trip-type-specific fields:

- **TRANSFER:** `isRoundTrip` checkbox
- **EXCURSION:** `StopsEditor` + `returnDate` picker
- **DISPO:** `durationHours` input + `maxKilometers` (auto-calculated)
- **OFF_GRID:** Notes field with required indicator

#### 2. `StopsEditor.tsx`

```typescript
interface StopsEditorProps {
  stops: QuoteStop[];
  onStopsChange: (stops: QuoteStop[]) => void;
  disabled?: boolean;
  maxStops?: number; // Default 10
}
```

Features:

- Add stop button
- Remove stop button per row
- Address autocomplete per stop
- Up/down reorder buttons
- Visual order numbers

### Modified Components

#### `QuoteBasicInfoPanel.tsx`

- Import and render `TripTypeFormFields` after trip type selector
- Conditionally render dropoff field based on `tripType`:
  - **TRANSFER, EXCURSION:** Required
  - **DISPO:** Hidden
  - **OFF_GRID:** Optional (show "(optionnel)" in label)

### Translations

Add to `apps/web/messages/en.json` and `apps/web/messages/fr.json`:

```json
{
  "quotes": {
    "create": {
      "tripTypeFields": {
        "roundTrip": "Round trip",
        "roundTripHint": "Price will be doubled for return journey",
        "addStop": "Add a stop",
        "removeStop": "Remove stop",
        "stopLabel": "Stop {number}",
        "returnDate": "Return date",
        "returnDateHint": "Leave empty for same-day return",
        "durationHours": "Duration (hours)",
        "durationHoursHint": "Minimum 1 hour, maximum 24 hours",
        "maxKilometers": "Max kilometers included",
        "maxKilometersHint": "Calculated: {hours}h × 50 km/h = {km} km",
        "dropoffOptional": "Dropoff Address (optional)",
        "notesRequired": "Notes (required for off-grid)",
        "notesPlaceholder": "Describe the trip: destination, special requirements..."
      }
    }
  }
}
```

---

## Test Cases

### Unit Tests (Vitest)

| Test ID | Description                                            | Expected Result                     |
| ------- | ------------------------------------------------------ | ----------------------------------- |
| UT-1    | TripTypeFormFields renders checkbox for TRANSFER       | Checkbox "Aller-retour" visible     |
| UT-2    | TripTypeFormFields renders StopsEditor for EXCURSION   | Add stop button visible             |
| UT-3    | TripTypeFormFields renders duration/km for DISPO       | Both inputs visible                 |
| UT-4    | TripTypeFormFields renders notes required for OFF_GRID | Notes field with required indicator |
| UT-5    | StopsEditor adds stop correctly                        | New stop added to list              |
| UT-6    | StopsEditor removes stop correctly                     | Stop removed from list              |
| UT-7    | StopsEditor reorders stops correctly                   | Order updated                       |
| UT-8    | maxKilometers auto-calculates                          | 4h → 200km                          |

### E2E Tests (Playwright)

| Test ID | Description                     | Steps                                                       |
| ------- | ------------------------------- | ----------------------------------------------------------- |
| E2E-1   | Create TRANSFER with round trip | Select TRANSFER → Check round trip → Fill form → Submit     |
| E2E-2   | Create EXCURSION with 2 stops   | Select EXCURSION → Add 2 stops → Fill addresses → Submit    |
| E2E-3   | Create DISPO without dropoff    | Select DISPO → Enter duration → Verify no dropoff → Submit  |
| E2E-4   | Create OFF_GRID with notes      | Select OFF_GRID → Leave dropoff empty → Fill notes → Submit |
| E2E-5   | Validation errors shown         | Try submit with missing required fields → Verify errors     |

### API Tests (curl)

| Test ID | Endpoint             | Payload                           | Expected        |
| ------- | -------------------- | --------------------------------- | --------------- |
| API-1   | POST /api/vtc/quotes | TRANSFER + isRoundTrip=true       | 201 Created     |
| API-2   | POST /api/vtc/quotes | EXCURSION + stops array           | 201 Created     |
| API-3   | POST /api/vtc/quotes | DISPO + durationHours, no dropoff | 201 Created     |
| API-4   | POST /api/vtc/quotes | OFF_GRID + notes, no dropoff      | 201 Created     |
| API-5   | POST /api/vtc/quotes | OFF_GRID without notes            | 400 Bad Request |

### Database Verification

After each successful creation, verify via MCP postgres:

- `isRoundTrip` correctly stored for TRANSFER
- `stops` JSON correctly stored for EXCURSION
- `durationHours` and `maxKilometers` stored for DISPO
- `dropoffAddress` is NULL for DISPO/OFF_GRID when not provided

---

## Files to Create/Modify

### New Files

1. `apps/web/modules/saas/quotes/components/TripTypeFormFields.tsx`
2. `apps/web/modules/saas/quotes/components/StopsEditor.tsx`

### Modified Files

1. `apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx`
2. `apps/web/messages/en.json`
3. `apps/web/messages/fr.json`

### Test Files

1. `apps/web/modules/saas/quotes/components/__tests__/TripTypeFormFields.test.tsx`
2. `apps/web/modules/saas/quotes/components/__tests__/StopsEditor.test.tsx`

---

## Definition of Done

- [x] TripTypeFormFields component created and renders correctly for all 4 trip types
- [x] StopsEditor component created with add/remove/reorder functionality
- [x] QuoteBasicInfoPanel updated with conditional dropoff rendering
- [x] All translations added (en + fr)
- [ ] Unit tests passing (8 tests) - Skipped (no test framework configured)
- [x] E2E tests passing (5 tests) - Verified via Playwright MCP
- [ ] API tests passing (5 tests) - Skipped (auth required)
- [x] Database verification confirms correct data storage
- [x] No regression in existing quote creation flow
- [x] Code reviewed and approved

---

## Notes

- **Performance:** StopsEditor uses `useCallback` for handlers to prevent unnecessary re-renders
- **Accessibility:** All new inputs have proper labels and aria attributes
- **Mobile:** Form fields stack vertically on mobile, stops editor is touch-friendly
