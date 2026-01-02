# Story 19.6: Implement Automatic Vehicle Category Selection Based on Capacity

## Status: DONE ✅

## Description

En tant qu'**opérateur VTC**, je veux que le système **sélectionne automatiquement** la catégorie de véhicule la plus adaptée lorsque je modifie le nombre de passagers ou de bagages, afin de **gagner du temps** et **éviter les erreurs** de capacité.

## Acceptance Criteria

| AC      | Description                                                                                                                                                                     | Status |
| ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| **AC1** | Quand `passengerCount` change et dépasse `vehicleCategory.maxPassengers`, le système sélectionne automatiquement la catégorie la moins chère capable d'accueillir les passagers | ✅     |
| **AC2** | Quand `luggageCount` change et dépasse la capacité bagages, le système sélectionne automatiquement une catégorie adaptée                                                        | ✅     |
| **AC3** | La sélection automatique choisit la catégorie avec le `priceMultiplier` le plus bas parmi celles qui satisfont la capacité                                                      | ✅     |
| **AC4** | Si aucune catégorie ne peut accueillir les passagers/bagages, un message d'erreur bloquant s'affiche                                                                            | ✅     |
| **AC5** | L'opérateur peut toujours changer manuellement la catégorie après la sélection automatique                                                                                      | ✅     |
| **AC6** | Un toast de notification informe l'opérateur quand une sélection automatique a lieu                                                                                             | ✅     |
| **AC7** | La sélection automatique ne se déclenche que si la catégorie actuelle est insuffisante (pas de downgrade automatique)                                                           | ✅     |

## Technical Implementation

### New Functions Added

#### `findOptimalCategory` (useScenarioHelpers.ts)

```typescript
export function findOptimalCategory(
  passengerCount: number,
  luggageCount: number,
  categories: VehicleCategory[]
): VehicleCategory | null;
```

- Filters categories that meet capacity requirements
- Sorts by `priceMultiplier` ascending (cheapest first)
- Returns the cheapest suitable category or null

#### `getAutoSelectResult` (useScenarioHelpers.ts)

```typescript
export function getAutoSelectResult(
  passengerCount: number,
  luggageCount: number,
  currentCategory: VehicleCategory | null,
  allCategories: VehicleCategory[]
): AutoSelectResult;
```

- Determines if auto-selection should occur
- Only triggers when current category is insufficient (no automatic downgrade)
- Returns selection decision with reason

### Modified Components

1. **QuoteBasicInfoPanel.tsx**

   - Added `allCategories` prop
   - Added `useEffect` to detect passenger/luggage count changes
   - Calls `getAutoSelectResult` on capacity changes
   - Shows toast notification on auto-selection
   - Shows error toast when no suitable category exists

2. **CreateQuoteCockpit.tsx**

   - Passes `allVehicleCategories` to `QuoteBasicInfoPanel`

3. **EditQuoteCockpit.tsx**
   - Passes `allVehicleCategories` to `QuoteBasicInfoPanel`

## Files Modified

| File                                                               | Change                                                                           |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `apps/web/modules/saas/quotes/hooks/useScenarioHelpers.ts`         | Added `findOptimalCategory`, `getAutoSelectResult`, `AutoSelectResult` interface |
| `apps/web/modules/saas/quotes/components/QuoteBasicInfoPanel.tsx`  | Added auto-selection logic with useEffect                                        |
| `apps/web/modules/saas/quotes/components/CreateQuoteCockpit.tsx`   | Pass `allCategories` prop                                                        |
| `apps/web/modules/saas/quotes/components/EditQuoteCockpit.tsx`     | Pass `allCategories` prop                                                        |
| `apps/web/modules/saas/quotes/components/VehicleCapacityPanel.tsx` | Added auto-selection logic (component not currently used)                        |

## Test Scenarios

| Test | Scenario                                     | Expected Result                          |
| ---- | -------------------------------------------- | ---------------------------------------- |
| T1   | Increase passengers beyond category capacity | Auto-select cheapest suitable category   |
| T2   | Current category is sufficient               | No change                                |
| T3   | No category can accommodate                  | Show error toast                         |
| T4   | Multiple suitable categories                 | Select cheapest (lowest priceMultiplier) |
| T5   | Manual change after auto-select              | Manual selection is preserved            |
| T6   | Luggage exceeds capacity                     | Auto-select suitable category            |

## Dependencies

- Story 6.6 (Helpers for Common Scenarios) - ✅ DONE
- `VehicleCategory.maxPassengers` - Available
- `VehicleCategory.maxLuggageVolume` - Available
- `VehicleCategory.priceMultiplier` - Available

## Notes

- The auto-selection only triggers when capacity **increases** beyond the current category's limits
- No automatic downgrade occurs (if user selects a larger category, it stays)
- Toast notifications use existing i18n keys from `quotes.helpers.capacity.*`
- The `VehicleCapacityPanel` component was also updated but is not currently used in the codebase
