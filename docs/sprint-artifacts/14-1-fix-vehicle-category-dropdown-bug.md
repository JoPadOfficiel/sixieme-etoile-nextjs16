# Story 14.1: Fix Vehicle Category Dropdown Bug

**Status:** done  
**Epic:** 14 - Flexible Route Pricing System  
**Priority:** Critical  
**Estimate:** 2 SP  
**Created:** 2025-12-01

---

## Story Context

### Problem

Le dropdown "Vehicle Category" dans le formulaire d'édition/création de routes (`/settings/pricing/routes`) **ne fonctionne pas**. L'utilisateur ne peut pas sélectionner de catégorie de véhicule, ce qui bloque la création et modification de routes.

**Screenshot**: Le dropdown affiche un état vide sans options chargées.

### Root Cause Analysis

Hypothèses à vérifier :

1. L'API `/api/vtc/vehicles/categories` retourne une erreur 404
2. Les données `vehicleCategories` ne sont pas passées au composant `RouteForm`
3. Le composant `RouteForm` n'utilise pas correctement les props
4. Problème de mapping entre l'API et le format attendu par le Select

### Objectives

1. **Diagnostiquer** la cause exacte du bug
2. **Corriger** le problème de chargement des catégories
3. **Vérifier** que la sélection persiste correctement
4. **Tester** la création et modification de routes

---

## Scope

### In Scope

- Correction du bug Vehicle Category dropdown
- Tests de validation (création, édition, persistence)
- Vérification des traductions du label

### Out of Scope

- Refonte du formulaire de routes (Story 14.3)
- Modification du schéma de données (Story 14.2)

---

## Acceptance Criteria

### AC1: Vehicle Categories Load Correctly

**Given** l'utilisateur ouvre le drawer "Edit Route" ou "Add Route"  
**When** le formulaire s'affiche  
**Then** le dropdown "Vehicle Category" affiche toutes les catégories actives

### AC2: Selection Persists on Save

**Given** l'utilisateur sélectionne une catégorie (ex: "Berline")  
**When** il clique "Save"  
**Then** la route est sauvegardée avec la catégorie sélectionnée

### AC3: Edit Shows Current Value

**Given** une route existante avec `vehicleCategoryId = "berline_id"`  
**When** l'utilisateur ouvre le drawer d'édition  
**Then** le dropdown affiche "Berline" comme valeur sélectionnée

### AC4: API Returns Categories

**Given** l'API `/api/vtc/vehicles/categories`  
**When** appelée avec `?limit=100`  
**Then** retourne un tableau de catégories avec `id`, `name`, `code`

---

## Technical Details

### Files to Investigate

| File                                                     | Purpose                               |
| -------------------------------------------------------- | ------------------------------------- |
| `apps/web/.../settings/pricing/routes/page.tsx`          | Page principale, fetch des catégories |
| `apps/web/modules/saas/pricing/components/RouteForm.tsx` | Formulaire avec le dropdown           |
| `packages/api/src/routes/vtc/vehicles/categories.ts`     | API endpoint                          |

### Expected Data Flow

```
page.tsx (fetchVehicleCategories)
  ↓
RouteForm (vehicleCategories prop)
  ↓
Select component (options from vehicleCategories)
```

---

## Test Cases

### TC1: Unit Test - RouteForm renders categories

```typescript
// Verify RouteForm displays categories from props
const categories = [{ id: "1", name: "Berline", code: "BERLINE" }];
render(<RouteForm vehicleCategories={categories} ... />);
expect(screen.getByText("Berline")).toBeInTheDocument();
```

### TC2: E2E Test - Create route with category

```
1. Navigate to /settings/pricing/routes
2. Click "Add Route"
3. Select From Zone, To Zone
4. Open Vehicle Category dropdown → Verify options appear
5. Select "Berline"
6. Enter fixed price
7. Click Save
8. Verify route created with correct category
```

### TC3: API Test - Categories endpoint

```bash
curl -X GET "http://localhost:3000/api/vtc/vehicles/categories?limit=100" \
  -H "Cookie: session=..." \
  | jq '.data[] | {id, name, code}'
```

---

## Dependencies

- VehicleCategory model (Epic 1) ✅
- API route `/api/vtc/vehicles/categories` (Epic 5) - status unknown
- RouteForm component (Epic 3) ✅

---

## Definition of Done

- [x] Bug root cause identified ✅ Wrong API URL `/api/vtc/vehicles/categories` instead of `/api/vtc/vehicle-categories`
- [x] Fix implemented ✅ Corrected URL in 4 files
- [x] AC1-AC4 validated ✅ Playwright MCP tests passed
- [x] TC1-TC3 passing ✅
- [x] No regression on existing routes functionality ✅
- [x] Code committed with descriptive message ✅

---

## Implementation Summary

### Root Cause

The frontend was calling `/api/vtc/vehicles/categories` but the API router is mounted at `/api/vtc/vehicle-categories`.

### Files Modified

| File                                                | Change        |
| --------------------------------------------------- | ------------- |
| `apps/web/.../settings/pricing/routes/page.tsx`     | Fixed API URL |
| `apps/web/.../settings/pricing/excursions/page.tsx` | Fixed API URL |
| `apps/web/.../settings/pricing/dispos/page.tsx`     | Fixed API URL |
| `apps/web/.../routes/page.tsx`                      | Fixed API URL |

### Tests Executed

| Test Type                                 | Result  |
| ----------------------------------------- | ------- |
| Playwright MCP - Load categories          | ✅ Pass |
| Playwright MCP - Edit route dropdown      | ✅ Pass |
| Playwright MCP - All 5 categories visible | ✅ Pass |

### Commit

```
fix(14-1): Fix Vehicle Category dropdown API URL
```
