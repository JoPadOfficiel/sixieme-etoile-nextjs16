# Story 14.3: Update Pricing UI for Flexible Routes

**Status:** done  
**Epic:** 14 - Flexible Route Pricing System  
**Priority:** High  
**Estimate:** 8 SP  
**Created:** 2025-12-01

---

## Story Context

### Problem

L'interface actuelle de création/édition de routes (`RouteForm.tsx`) ne supporte que la sélection d'une **zone unique** pour l'origine et la destination. Avec l'extension du schéma (Story 14.2), le backend supporte maintenant :

1. **Multi-zones** : Plusieurs zones peuvent être sélectionnées comme origine et/ou destination
2. **Adresses spécifiques** : Une adresse précise peut être définie via Google Places

Cependant, l'UI n'a pas été mise à jour pour exploiter ces nouvelles capacités.

### Current UI Limitations

```tsx
// RouteForm.tsx - Sélection zone unique
<Select value={formData.fromZoneId} ...>
  {activeZones.map((zone) => (
    <SelectItem key={zone.id} value={zone.id}>
      {zone.name}
    </SelectItem>
  ))}
</Select>
```

### Objectives

1. Permettre la sélection de **plusieurs zones** via un multi-select pour origine et destination
2. Permettre la sélection d'une **adresse spécifique** via Google Places autocomplete
3. Ajouter un **toggle** pour choisir entre mode "Zones" et mode "Adresse"
4. Maintenir la **rétrocompatibilité** avec les routes existantes (zone unique)
5. Mettre à jour les **types TypeScript** pour refléter le nouveau schéma

---

## Scope

### In Scope

- Modification de `RouteForm.tsx` pour supporter multi-zones et adresses
- Création d'un composant `MultiZoneSelect` réutilisable
- Création d'un composant `AddressAutocomplete` avec Google Places
- Mise à jour des types dans `types.ts`
- Mise à jour de l'API create/update pour supporter le nouveau format
- Traductions FR/EN pour les nouveaux éléments UI

### Out of Scope

- Carte interactive (Story 14.4)
- Modification du pricing engine (Story 14.5)
- Migration des routes existantes vers multi-zones

---

## Acceptance Criteria

### AC1: Toggle Origin Type

**Given** je suis sur le formulaire de création de route  
**When** je vois la section "Origine"  
**Then** je peux choisir entre "Zones" et "Adresse" via un toggle/tabs

### AC2: Multi-Zone Origin Selection

**Given** j'ai sélectionné "Zones" comme type d'origine  
**When** je clique sur le sélecteur de zones  
**Then** je peux sélectionner plusieurs zones via des checkboxes  
**And** les zones sélectionnées s'affichent sous forme de badges

### AC3: Address Origin Selection

**Given** j'ai sélectionné "Adresse" comme type d'origine  
**When** je tape dans le champ d'adresse  
**Then** Google Places autocomplete me propose des suggestions  
**And** je peux sélectionner une adresse qui remplit les champs `originPlaceId`, `originAddress`, `originLat`, `originLng`

### AC4: Toggle Destination Type

**Given** je suis sur le formulaire de création de route  
**When** je vois la section "Destination"  
**Then** je peux choisir entre "Zones" et "Adresse" via un toggle/tabs

### AC5: Multi-Zone Destination Selection

**Given** j'ai sélectionné "Zones" comme type de destination  
**When** je clique sur le sélecteur de zones  
**Then** je peux sélectionner plusieurs zones via des checkboxes

### AC6: Address Destination Selection

**Given** j'ai sélectionné "Adresse" comme type de destination  
**When** je tape dans le champ d'adresse  
**Then** Google Places autocomplete me propose des suggestions

### AC7: Form Validation

**Given** je soumets le formulaire  
**When** le type est "Zones" mais aucune zone n'est sélectionnée  
**Then** un message d'erreur s'affiche

**And** quand le type est "Adresse" mais aucune adresse n'est sélectionnée  
**Then** un message d'erreur s'affiche

### AC8: API Integration

**Given** je soumets le formulaire avec des données valides  
**When** l'API reçoit la requête  
**Then** les données sont correctement enregistrées avec `originType`, `originZones[]`, ou `originPlaceId`/`originAddress`/`originLat`/`originLng`

### AC9: Edit Mode Compatibility

**Given** j'édite une route existante avec `fromZoneId` legacy  
**When** le formulaire s'ouvre  
**Then** la zone legacy est affichée comme zone sélectionnée en mode "Zones"

---

## Technical Details

### New Types

```typescript
// types.ts
export type OriginDestinationType = "ZONES" | "ADDRESS";

export interface ZoneRouteFormData {
  // Origin
  originType: OriginDestinationType;
  originZoneIds: string[]; // For ZONES type
  originPlaceId?: string; // For ADDRESS type
  originAddress?: string;
  originLat?: number;
  originLng?: number;

  // Destination
  destinationType: OriginDestinationType;
  destinationZoneIds: string[];
  destPlaceId?: string;
  destAddress?: string;
  destLat?: number;
  destLng?: number;

  // Common
  vehicleCategoryId: string;
  direction: RouteDirection;
  fixedPrice: number;
  isActive: boolean;
}
```

### New Components

1. **`MultiZoneSelect`** - Composant multi-select avec checkboxes et badges
2. **`AddressAutocomplete`** - Composant avec Google Places API
3. **`OriginDestinationTypeToggle`** - Toggle entre ZONES et ADDRESS

### API Changes

```typescript
// createRouteSchema (zone-routes.ts)
const createRouteSchema = z.object({
  // Origin
  originType: z.enum(["ZONES", "ADDRESS"]).default("ZONES"),
  originZoneIds: z.array(z.string()).optional(),
  originPlaceId: z.string().optional(),
  originAddress: z.string().optional(),
  originLat: z.number().optional(),
  originLng: z.number().optional(),

  // Destination
  destinationType: z.enum(["ZONES", "ADDRESS"]).default("ZONES"),
  destinationZoneIds: z.array(z.string()).optional(),
  destPlaceId: z.string().optional(),
  destAddress: z.string().optional(),
  destLat: z.number().optional(),
  destLng: z.number().optional(),

  // Legacy (backward compatibility)
  fromZoneId: z.string().optional(),
  toZoneId: z.string().optional(),

  // Common
  vehicleCategoryId: z.string().min(1),
  direction: routeDirectionEnum.default("BIDIRECTIONAL"),
  fixedPrice: z.coerce.number().positive(),
  isActive: z.boolean().default(true),
});
```

### Google Places Integration

```typescript
// Utiliser @react-google-maps/api ou google.maps.places.Autocomplete
// Nécessite NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
```

---

## UI Mockup

```
┌─────────────────────────────────────────────────────┐
│ Créer une route                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│ ORIGINE                                             │
│ ┌─────────────┬─────────────┐                       │
│ │   Zones     │   Adresse   │  ← Toggle             │
│ └─────────────┴─────────────┘                       │
│                                                     │
│ [Mode Zones]                                        │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Sélectionner les zones...                    ▼  │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐              │
│ │ Paris ×  │ │ CDG ×    │ │ Orly ×   │  ← Badges   │
│ └──────────┘ └──────────┘ └──────────┘              │
│                                                     │
│ [Mode Adresse]                                      │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 🔍 Rechercher une adresse...                    │ │
│ └─────────────────────────────────────────────────┘ │
│ Hôtel Ritz Paris, Place Vendôme, 75001 Paris       │
│                                                     │
│ DESTINATION                                         │
│ (même structure que Origine)                        │
│                                                     │
│ CATÉGORIE DE VÉHICULE                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Berline (4 passagers)                        ▼  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ DIRECTION                                           │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ↔ Bidirectionnel                             ▼  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ PRIX FIXE (EUR)                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ 85.00                                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ☑ Route active                                  │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│                        [Annuler]  [Créer la route]  │
└─────────────────────────────────────────────────────┘
```

---

## Test Cases

### TC1: Create Route with Multi-Zone Origin

```typescript
// Playwright test
test("can create route with multiple origin zones", async ({ page }) => {
  await page.goto("/app/org/settings/pricing/routes");
  await page.click("button:has-text('Ajouter')");

  // Select ZONES mode (default)
  await page.click("[data-testid='origin-zones-toggle']");

  // Open multi-select
  await page.click("[data-testid='origin-zones-select']");

  // Select multiple zones
  await page.click("text=Paris Intra-Muros");
  await page.click("text=Zone Premium Paris");
  await page.click("text=La Défense");

  // Close dropdown
  await page.keyboard.press("Escape");

  // Verify badges
  await expect(page.locator("[data-testid='zone-badge']")).toHaveCount(3);

  // Fill rest of form...
  // Submit and verify
});
```

### TC2: Create Route with Address Origin

```typescript
test("can create route with address origin", async ({ page }) => {
  await page.goto("/app/org/settings/pricing/routes");
  await page.click("button:has-text('Ajouter')");

  // Switch to ADDRESS mode
  await page.click("[data-testid='origin-address-toggle']");

  // Type address
  await page.fill("[data-testid='origin-address-input']", "Hôtel Ritz Paris");

  // Wait for autocomplete
  await page.waitForSelector(".pac-item");

  // Select first suggestion
  await page.click(".pac-item:first-child");

  // Verify address is filled
  await expect(
    page.locator("[data-testid='origin-address-display']")
  ).toContainText("Place Vendôme");
});
```

### TC3: Edit Legacy Route

```typescript
test("can edit legacy route with single zone", async ({ page }) => {
  // Navigate to existing route
  await page.goto("/app/org/settings/pricing/routes");
  await page.click("tr:first-child button:has-text('Modifier')");

  // Verify legacy zone is shown as selected
  await expect(page.locator("[data-testid='zone-badge']")).toHaveCount(1);

  // Can add more zones
  await page.click("[data-testid='origin-zones-select']");
  await page.click("text=Nouvelle Zone");

  // Now has 2 zones
  await expect(page.locator("[data-testid='zone-badge']")).toHaveCount(2);
});
```

---

## Dependencies

- Story 14.2 (Schema extension) ✅
- Google Maps API key configured
- `@react-google-maps/api` or similar library

---

## Risks & Mitigations

| Risk                     | Impact | Mitigation                                         |
| ------------------------ | ------ | -------------------------------------------------- |
| Google Places API quota  | Medium | Implement debouncing, cache results                |
| Complex form state       | Medium | Use React Hook Form or similar                     |
| Breaking existing routes | High   | Maintain backward compatibility with legacy fields |

---

## Definition of Done

- [x] `MultiZoneSelect` component created and tested
- [x] `AddressAutocomplete` component created and tested
- [x] `RouteForm` updated with toggle and new fields
- [x] Types updated in `types.ts`
- [x] API create/update endpoints updated
- [x] Translations added (FR/EN)
- [x] AC1-AC9 validated
- [x] TC1-TC3 passing
- [x] No regression on existing routes
- [x] Code committed with descriptive message
