# Story 14.4: Interactive Map for Zone Selection

**Status:** in-progress  
**Epic:** 14 - Flexible Route Pricing System  
**Priority:** Medium  
**Estimate:** 8 SP  
**Created:** 2025-12-01

---

## Story

**As a** pricing administrator,  
**I want** to select zones visually on an interactive map,  
**So that** I can easily identify and configure route pricing without memorizing zone names.

---

## Context

### Problem

L'interface actuelle de sélection de zones (`MultiZoneSelect`) ne propose qu'une liste déroulante avec les noms des zones. Les administrateurs doivent mémoriser les noms des zones et leur position géographique, ce qui est difficile quand il y a beaucoup de zones.

### Current Limitations

- Pas de visualisation géographique lors de la sélection de zones
- Difficile de savoir quelles zones sont adjacentes sans regarder la carte séparément
- Pas de contexte visuel pour comprendre la couverture géographique
- Sélection par adresse (point) n'apporte pas de valeur vs autocomplétion

### Solution

Ajouter un bouton "Sélectionner sur la carte" à côté du sélecteur de zones qui ouvre un dialog avec une carte Google Maps affichant toutes les zones existantes. L'utilisateur peut cliquer sur les zones pour les sélectionner/désélectionner visuellement.

---

## Acceptance Criteria

### AC1: Visual Zone Selection Button

**Given** I am configuring a route origin or destination with "Zones" tab selected  
**When** I see the MultiZoneSelect dropdown  
**Then** There is a "Select on map" button next to the dropdown

### AC2: Open Zone Map Dialog

**Given** I click on "Select on map" button  
**When** The dialog opens  
**Then** I see a Google Maps with all existing zones displayed as colored polygons/areas

### AC3: Multi-Zone Selection on Map

**Given** The zone map dialog is open  
**When** I click on a zone polygon on the map  
**Then** The zone is toggled (selected/deselected) and visually highlighted

### AC4: Zone Hover Information

**Given** Zones are displayed on the map  
**When** I hover over a zone  
**Then** The zone name and code are displayed in a tooltip

### AC5: Selection Confirmation

**Given** I have selected one or more zones on the map  
**When** I click "Confirm"  
**Then** The selected zones are applied to the MultiZoneSelect dropdown

### AC6: Pre-selected Zones

**Given** Some zones are already selected in the dropdown  
**When** I open the map dialog  
**Then** Those zones are visually highlighted as selected on the map

### AC7: Cancel Selection

**Given** The map dialog is open  
**When** I click "Cancel" or close the dialog  
**Then** No changes are made to the zone selection

### AC8: Quick Zone Creation (Optional - Phase 2)

**Given** I need a specific zone that doesn't exist  
**When** I click "Create zone" in the map dialog  
**Then** I can draw a new zone polygon and save it directly

---

## Technical Details

### Architecture

```
MultiZoneSelect.tsx
├── Dropdown with badges (existing)
└── [NEW] Map button → opens ZoneMapPickerDialog

ZoneMapPickerDialog.tsx (NEW)
├── Dialog wrapper
├── ZonesInteractiveMap component (reuse from Story 11.1)
├── Zone list sidebar with selection state
├── Confirm/Cancel buttons
└── Zone click handlers for selection
```

### Key Components

#### 1. ZoneMapPickerDialog (New)

```typescript
interface ZoneMapPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  zones: PricingZone[];
  selectedIds: string[];
  onConfirm: (selectedIds: string[]) => void;
}
```

#### 2. MultiZoneSelect (Modified)

Add a map button that opens the dialog:

```tsx
<Button variant="ghost" size="icon" onClick={() => setMapDialogOpen(true)}>
  <MapIcon className="h-4 w-4" />
</Button>
```

### Reuse Existing Components

- `ZonesInteractiveMap.tsx` from Story 11.1 - Already displays zones on map
- `ZoneDrawingMap.tsx` - For optional zone creation feature

### Zone Display on Map

```typescript
// Each zone should have:
interface ZoneMapDisplay {
  id: string;
  name: string;
  code: string;
  geometry: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  isSelected: boolean;
  color: string; // Different color for selected vs unselected
}
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│                    Select Zones on Map                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────┬─────────────┐   │
│  │                                               │ Selected:   │   │
│  │              GOOGLE MAP                       │             │   │
│  │                                               │ ☑ Zone A    │   │
│  │     ┌──────┐                                  │ ☑ Zone B    │   │
│  │     │Zone A│  ┌──────┐                        │ ☐ Zone C    │   │
│  │     │(sel) │  │Zone B│                        │             │   │
│  │     └──────┘  │(sel) │  ┌──────┐              │             │   │
│  │               └──────┘  │Zone C│              │             │   │
│  │                         └──────┘              │             │   │
│  │                                               │             │   │
│  └───────────────────────────────────────────────┴─────────────┘   │
│                                                                     │
│  💡 Click on zones to select/deselect them                          │
│                                                                     │
│                              [Cancel]  [Confirm Selection (2)]      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File                                                               | Action | Description                          |
| ------------------------------------------------------------------ | ------ | ------------------------------------ |
| `apps/web/modules/saas/pricing/components/ZoneMapPickerDialog.tsx` | Create | New dialog for zone selection on map |
| `apps/web/modules/saas/pricing/components/MultiZoneSelect.tsx`     | Modify | Add map button                       |
| `packages/i18n/translations/fr.json`                               | Modify | Add French translations              |
| `packages/i18n/translations/en.json`                               | Modify | Add English translations             |

---

## Test Cases

### TC1: Open Zone Map Dialog

```typescript
test("opens zone map dialog when clicking map button", async ({ page }) => {
  // Navigate to route form with zones mode
  // Click map button
  // Verify dialog is visible with zones on map
});
```

### TC2: Click to Select Zone

```typescript
test("clicking zone polygon toggles selection", async ({ page }) => {
  // Open zone map dialog
  // Click on a zone polygon
  // Verify zone is highlighted as selected
  // Click again
  // Verify zone is deselected
});
```

### TC3: Confirm Zone Selection

```typescript
test("confirming selection updates MultiZoneSelect", async ({ page }) => {
  // Open zone map dialog
  // Select 2 zones
  // Click confirm
  // Verify dialog closes
  // Verify MultiZoneSelect shows 2 selected zones
});
```

### TC4: Pre-selected Zones Shown

```typescript
test("pre-selected zones are highlighted on map", async ({ page }) => {
  // Select zones in dropdown first
  // Open zone map dialog
  // Verify those zones are highlighted on map
});
```

---

## Dependencies

- Story 14.3 (MultiZoneSelect) ✅ Done
- Story 11.1 (ZonesInteractiveMap) ✅ Done
- Google Maps API key configured in organization settings ✅

---

## Definition of Done

- [ ] `ZoneMapPickerDialog` component created
- [ ] `MultiZoneSelect` updated with map button
- [ ] Zone polygons displayed on map with click selection
- [ ] Hover tooltip showing zone name/code
- [ ] Pre-selected zones highlighted
- [ ] Translations added (FR/EN)
- [ ] AC1-AC7 validated
- [ ] Works inside Sheet/Dialog (z-index)
- [ ] Code committed with descriptive message

---

## Notes

### Previous Implementation (Removed)

The initial implementation focused on address point selection via map click with reverse geocoding. This was removed because:

1. **No added value**: Address autocomplete already provides easy address selection
2. **Less precise**: Clicking on a map is less precise than typing an address
3. **Wrong focus**: The real need is visual zone selection, not address selection

The `AddressMapPickerDialog.tsx` component created initially should be removed or repurposed for zone selection.
