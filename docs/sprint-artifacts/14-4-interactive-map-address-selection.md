# Story 14.4: Interactive Map for Address Selection

**Status:** in-progress  
**Epic:** 14 - Flexible Route Pricing System  
**Priority:** Medium  
**Estimate:** 5 SP  
**Created:** 2025-12-01

---

## Story

**As a** pricing administrator,  
**I want** to select addresses visually on a map,  
**So that** I can easily identify and configure location-based pricing without typing addresses manually.

---

## Context

### Problem

L'interface actuelle de sélection d'adresse (`AddressAutocomplete`) ne propose que la saisie textuelle avec autocomplétion Google Places. Pour certains cas d'usage (hôtels partenaires, lieux stratégiques, points d'intérêt), les administrateurs préfèrent pointer directement sur une carte plutôt que de chercher l'adresse exacte.

### Current Limitations

- Pas de visualisation géographique lors de la sélection
- Difficile de sélectionner un point précis sans connaître l'adresse exacte
- Pas de contexte visuel des zones existantes

### Solution

Ajouter un bouton "Sélectionner sur la carte" à côté du champ d'adresse qui ouvre un dialog avec une carte Google Maps interactive. L'utilisateur peut cliquer sur la carte pour placer un marqueur, et le système effectue un reverse geocoding pour obtenir l'adresse correspondante.

---

## Acceptance Criteria

### AC1: Open Map Dialog

**Given** I am configuring an address-based route origin or destination  
**When** I click on the "Select on map" button next to the address field  
**Then** A dialog opens with a Google Maps centered on Paris region

### AC2: Click to Place Marker

**Given** The map dialog is open  
**When** I click on any location on the map  
**Then** A marker is placed at that location and the address is displayed below the map

### AC3: Confirm Selection

**Given** I have selected a location on the map  
**When** I click "Confirm" button  
**Then** The dialog closes and the address field is populated with the selected address, latitude and longitude

### AC4: Update Selection

**Given** I have selected a location on the map  
**When** I click on a different location  
**Then** The marker moves to the new location and the address updates

### AC5: Cancel Selection

**Given** The map dialog is open  
**When** I click "Cancel" or close the dialog  
**Then** No changes are made to the address field

### AC6: Existing Address Centers Map

**Given** The address field already has a value with coordinates  
**When** I open the map dialog  
**Then** The map is centered on the existing location with a marker

### AC7: Geocoding Error Handling

**Given** I click on a location where reverse geocoding fails  
**When** The API returns an error  
**Then** A user-friendly error message is displayed and the coordinates are still usable with a fallback address format

---

## Technical Details

### Architecture

```
AddressAutocomplete.tsx
├── Input field (existing)
├── Suggestions dropdown (existing)
└── [NEW] Map button → opens AddressMapPickerDialog

AddressMapPickerDialog.tsx (NEW)
├── Dialog wrapper
├── GoogleMap component (reuse existing)
├── Selected address display
├── Confirm/Cancel buttons
└── Reverse geocoding logic
```

### Key Components

#### 1. AddressMapPickerDialog (New)

```typescript
interface AddressMapPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialPosition?: { lat: number; lng: number } | null;
  onConfirm: (result: AddressResult) => void;
}
```

#### 2. AddressAutocomplete (Modified)

Add a map button that opens the dialog:

```tsx
<Button variant="ghost" size="icon" onClick={() => setMapDialogOpen(true)}>
  <MapIcon className="h-4 w-4" />
</Button>
```

### Google Maps API Key

L'API key Google Maps est stockée dans les paramètres d'organisation et accessible via le `GoogleMapsProvider` existant. Pas besoin de variable d'environnement.

```typescript
// Utiliser le hook existant
const { apiKey, isLoaded } = useGoogleMaps();
```

### Reverse Geocoding

```typescript
async function reverseGeocode(lat: number, lng: number): Promise<string> {
  const geocoder = new google.maps.Geocoder();
  const response = await geocoder.geocode({ location: { lat, lng } });
  if (response.results[0]) {
    return response.results[0].formatted_address;
  }
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`; // Fallback
}
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────────────────┐
│                    Select Location on Map                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                                                     │   │
│  │                   GOOGLE MAP                        │   │
│  │                                                     │   │
│  │                      📍                             │   │
│  │                   (marker)                          │   │
│  │                                                     │   │
│  │                                                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  📍 Selected address:                                       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 15 Place Vendôme, 75001 Paris, France               │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  💡 Click on the map to select a location                   │
│                                                             │
│                              [Cancel]  [Confirm Selection]  │
└─────────────────────────────────────────────────────────────┘
```

---

## Files to Create/Modify

| File                                                                 | Action | Description                   |
| -------------------------------------------------------------------- | ------ | ----------------------------- |
| `apps/web/modules/saas/shared/components/AddressMapPickerDialog.tsx` | Create | New dialog component with map |
| `apps/web/modules/saas/shared/components/AddressAutocomplete.tsx`    | Modify | Add map button                |
| `packages/i18n/translations/fr.json`                                 | Modify | Add French translations       |
| `packages/i18n/translations/en.json`                                 | Modify | Add English translations      |

---

## Test Cases

### TC1: Open Map Dialog

```typescript
test("opens map dialog when clicking map button", async ({ page }) => {
  // Navigate to route form with address mode
  // Click map button
  // Verify dialog is visible with map
});
```

### TC2: Click Places Marker

```typescript
test("clicking map places marker and shows address", async ({ page }) => {
  // Open map dialog
  // Click on map
  // Verify marker appears
  // Verify address is displayed
});
```

### TC3: Confirm Selection

```typescript
test("confirming selection populates address field", async ({ page }) => {
  // Open map dialog
  // Click on map
  // Click confirm
  // Verify dialog closes
  // Verify address field has value
});
```

### TC4: Cancel Closes Dialog

```typescript
test("cancel closes dialog without changes", async ({ page }) => {
  // Open map dialog
  // Click on map
  // Click cancel
  // Verify dialog closes
  // Verify address field unchanged
});
```

---

## Dependencies

- Story 14.3 (AddressAutocomplete) ✅ Done
- Google Maps API key configured in organization settings ✅
- `GoogleMap.tsx` component ✅ Exists

---

## Definition of Done

- [ ] `AddressMapPickerDialog` component created
- [ ] `AddressAutocomplete` updated with map button
- [ ] Reverse geocoding implemented
- [ ] Translations added (FR/EN)
- [ ] AC1-AC7 validated
- [ ] Works inside Sheet/Dialog (z-index)
- [ ] Code committed with descriptive message
