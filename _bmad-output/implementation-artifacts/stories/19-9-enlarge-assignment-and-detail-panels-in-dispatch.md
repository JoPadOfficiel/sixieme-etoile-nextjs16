# Story 19.9: Enlarge Assignment and Detail Panels in Dispatch

**Epic:** Epic 19 - Pricing Engine Critical Fixes & Quote System Stabilization  
**Priority:** MEDIUM  
**Status:** done  
**Created:** 2026-01-02  
**Author:** Bob (Scrum Master) via BMad Orchestrator

---

## Description

L'écran Dispatch actuel utilise un layout 2/5 - 3/5 avec des panneaux de taille fixe qui limitent la visibilité des informations critiques pour les opérateurs. Le panneau d'assignation (AssignmentDrawer) est limité à 500px de largeur, et les panneaux de détail (TripTransparencyPanel, MissionComplianceDetails, VehicleAssignmentPanel) sont compressés dans une colonne étroite.

### Problème actuel

1. **AssignmentDrawer** : Largeur fixe de 500px insuffisante pour afficher les informations des candidats (véhicule, chauffeur, base, coûts, compliance)
2. **Panneau droit** : Ratio 3/5 trop étroit pour la carte + les panneaux de détail
3. **TripTransparencyPanel** : Informations de coût compressées, difficiles à lire
4. **MissionComplianceDetails** : Détails RSE tronqués
5. **CandidatesList** : Hauteur max limitée à `calc(100vh-20rem)`, scroll excessif

### Comportement attendu

1. **AssignmentDrawer** : Élargir à 650px pour une meilleure lisibilité
2. **Layout principal** : Ajuster le ratio à 1/3 - 2/3 pour plus d'espace à droite
3. **Carte** : Augmenter la hauteur de 350px à 400px
4. **CandidatesList** : Augmenter la hauteur max disponible
5. **Responsive** : Maintenir la compatibilité mobile

### Impact business

- **Productivité** : Réduction du temps de décision pour les assignations
- **Lisibilité** : Meilleure visualisation des détails de mission et des candidats
- **UX améliorée** : Moins de scroll, plus d'informations visibles d'un coup d'œil

---

## Critères d'Acceptation (AC)

### AC1: AssignmentDrawer élargi

**Given** l'écran Dispatch avec une mission sélectionnée  
**When** l'opérateur clique sur "Assigner"  
**Then** le drawer s'ouvre avec une largeur de 650px (au lieu de 500px)  
**And** les informations des candidats sont plus lisibles

### AC2: Layout principal ajusté

**Given** l'écran Dispatch  
**When** l'opérateur visualise la page  
**Then** le panneau gauche (missions) occupe 1/3 de l'écran  
**And** le panneau droit (carte + détails) occupe 2/3 de l'écran

### AC3: Carte agrandie

**Given** l'écran Dispatch avec une mission sélectionnée  
**When** l'opérateur visualise la carte  
**Then** la carte a une hauteur de 400px (au lieu de 350px)

### AC4: CandidatesList avec plus d'espace

**Given** le drawer d'assignation ouvert  
**When** l'opérateur visualise la liste des candidats  
**Then** la liste utilise `calc(100vh-18rem)` pour plus d'espace vertical

### AC5: Responsive maintenu

**Given** l'écran Dispatch sur mobile (< 768px)  
**When** l'opérateur visualise la page  
**Then** le layout s'adapte en colonne unique  
**And** le drawer utilise la largeur complète

### AC6: Backward compatibility

**Given** les fonctionnalités existantes du dispatch  
**When** les modifications sont appliquées  
**Then** toutes les fonctionnalités restent opérationnelles (sélection mission, assignation, carte, compliance)

---

## Cas de Tests

### Test 1: Playwright MCP - Largeur du drawer

```gherkin
Scenario: AssignmentDrawer has correct width
  Given I am on the dispatch page
  And I select a mission
  When I click the "Assign" button
  Then the assignment drawer should be visible
  And the drawer should have a width of approximately 650px
```

### Test 2: Playwright MCP - Layout ratio

```gherkin
Scenario: Dispatch page has correct layout ratio
  Given I am on the dispatch page
  Then the left panel should occupy approximately 33% of the viewport
  And the right panel should occupy approximately 67% of the viewport
```

### Test 3: Playwright MCP - Map height

```gherkin
Scenario: Map has correct height
  Given I am on the dispatch page
  Then the map container should have a height of 400px
```

### Test 4: Playwright MCP - Candidate list scrollable area

```gherkin
Scenario: Candidate list has adequate scroll area
  Given I am on the dispatch page
  And I open the assignment drawer
  When there are more than 5 candidates
  Then the candidate list should be scrollable
  And the visible area should show at least 4 candidates without scrolling
```

### Test 5: Playwright MCP - Responsive mobile

```gherkin
Scenario: Dispatch page is responsive on mobile
  Given I am on the dispatch page
  And the viewport width is 375px
  Then the layout should be single column
  And the drawer should use full width when open
```

### Test 6: Playwright MCP - All features still work

```gherkin
Scenario: All dispatch features remain functional
  Given I am on the dispatch page
  When I select a mission
  Then the TripTransparencyPanel should display
  And the MissionComplianceDetails should display
  And the VehicleAssignmentPanel should display
  When I click "Assign"
  Then the drawer should open
  And I should be able to select a candidate
  And I should be able to confirm the assignment
```

---

## Contraintes & Dépendances

### Fichiers à modifier

| Fichier                                                          | Modification                                                   |
| ---------------------------------------------------------------- | -------------------------------------------------------------- |
| `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`     | Ajuster ratio layout (w-1/3, w-2/3), hauteur carte (h-[400px]) |
| `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx` | Élargir drawer (w-[650px], sm:max-w-[650px])                   |
| `apps/web/modules/saas/dispatch/components/CandidatesList.tsx`   | Ajuster max-height                                             |

### Dépendances

- ✅ Story 8.1 - Dispatch Screen Layout (structure existante)
- ✅ Story 8.2 - Assignment Drawer (composant existant)
- ✅ Story 8.3 - Multi-Base Optimisation (carte existante)

### Bloque

- Aucune story bloquée

---

## Solution Technique

### Modification 1: DispatchPage.tsx - Layout ratio

```tsx
// Avant (ligne 186)
<div className="w-2/5 flex flex-col gap-4" data-testid="dispatch-left-panel">

// Après
<div className="w-1/3 flex flex-col gap-4" data-testid="dispatch-left-panel">

// Avant (ligne 215)
<div className="w-3/5 sticky top-4 h-fit flex flex-col gap-4" data-testid="dispatch-right-panel">

// Après
<div className="w-2/3 sticky top-4 h-fit flex flex-col gap-4" data-testid="dispatch-right-panel">
```

### Modification 2: DispatchPage.tsx - Map height

```tsx
// Avant (ligne 217)
<div className="h-[350px]">

// Après
<div className="h-[400px]">
```

### Modification 3: AssignmentDrawer.tsx - Drawer width

```tsx
// Avant (ligne 200-202)
<SheetContent
  className="w-[500px] sm:max-w-[500px] flex flex-col"
  data-testid="assignment-drawer"
>

// Après
<SheetContent
  className="w-[650px] sm:max-w-[650px] flex flex-col"
  data-testid="assignment-drawer"
>
```

### Modification 4: CandidatesList.tsx - Max height

```tsx
// Avant (ligne 239 dans AssignmentDrawer.tsx)
className = "flex-1 max-h-[calc(100vh-20rem)]";

// Après
className = "flex-1 max-h-[calc(100vh-18rem)]";
```

---

## Definition of Done

- [x] AssignmentDrawer élargi à 650px
- [x] Layout principal ajusté à 1/3 - 2/3
- [x] Carte agrandie à 400px de hauteur
- [x] CandidatesList avec plus d'espace vertical
- [x] Tests Playwright MCP validés
- [x] Responsive mobile maintenu
- [x] Backward compatibility vérifiée
- [x] sprint-status.yaml mis à jour (status: done)

---

## Résultats des Tests

### Tests Playwright MCP ✅

| Test                            | Attendu                     | Résultat                             | Status |
| ------------------------------- | --------------------------- | ------------------------------------ | ------ |
| **AC1: Drawer width**           | 650px                       | `drawerWidth: 650`                   | ✅     |
| **AC2: Layout ratio**           | `w-1/3` et `w-2/3`          | Classes CSS correctes                | ✅     |
| **AC3: Map height**             | 400px                       | `mapHeight: 400`                     | ✅     |
| **AC4: CandidatesList**         | `max-h-[calc(100vh-18rem)]` | Classe CSS correcte                  | ✅     |
| **AC6: Backward compatibility** | Toutes fonctionnalités OK   | Missions, carte, drawer fonctionnels | ✅     |

### Mesures réelles (viewport 1291px)

- Panneau gauche: 382px (~33.8%)
- Panneau droit: 749px (~66.2%)
- Drawer: 650px
- Carte: 400px

---

## Fichiers Modifiés

| Fichier                                                          | Modification                            |
| ---------------------------------------------------------------- | --------------------------------------- |
| `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`     | Layout ratio 1/3-2/3, carte 400px       |
| `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx` | Drawer 650px, CandidatesList max-height |
| `_bmad-output/implementation-artifacts/sprint-status.yaml`       | Status: done                            |

---

## Notes d'Implémentation

### Points d'attention

1. **Ne pas casser le responsive** - Vérifier sur mobile que le layout s'adapte
2. **Tester avec beaucoup de candidats** - S'assurer que le scroll fonctionne bien
3. **Vérifier la carte** - S'assurer que les markers et routes restent visibles
4. **Tester l'assignation complète** - Du clic sur "Assigner" jusqu'à la confirmation

### Ordre des modifications

1. Modifier DispatchPage.tsx (layout + carte)
2. Modifier AssignmentDrawer.tsx (largeur drawer + max-height liste)
3. Tester via Playwright MCP
4. Valider manuellement via l'UI
