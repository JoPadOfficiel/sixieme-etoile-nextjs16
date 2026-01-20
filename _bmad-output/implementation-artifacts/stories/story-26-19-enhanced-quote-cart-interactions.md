# Story 26.19: Enhanced Quote Cart Interactions

## Status: review

## Epic

Epic 26 - Flexible "Yolo Mode" Billing

## Description

Améliorer l'ergonomie du Quote Editor (Panier Yolo) en ajoutant la sélection multiple de lignes avec des actions en masse (supprimer, dupliquer) et une toolbar flottante contextuelle. Cette story améliore significativement la productivité des opérateurs qui gèrent des devis complexes avec de nombreuses lignes.

## Business Value

- **Productivité** : Suppression/duplication de N lignes en 2 clics vs N clics
- **UX Moderne** : Comportement attendu par les utilisateurs (style Excel/Notion)
- **Réduction erreurs** : Actions groupées = moins de manipulations = moins d'erreurs

## Dependencies

- ✅ Story 26.5: UI Universal Block Row Component (DONE)
- ✅ Story 26.7: UI Drag & Drop Reordering (DONE)
- ✅ Story 26.14: Undo Redo History Support (DONE)

## Acceptance Criteria

### AC1: Checkbox de Sélection par Ligne

- **Given** une ligne de devis dans le Quote Editor
- **When** l'utilisateur survole la ligne
- **Then** une checkbox apparaît à gauche du drag handle
- **And** cliquer sur la checkbox sélectionne/désélectionne la ligne
- **And** la ligne sélectionnée a un style visuel distinct (bg-primary/10)

### AC2: Sélection Multiple avec Shift+Click

- **Given** une ligne sélectionnée (index A)
- **When** l'utilisateur Shift+Click sur une autre ligne (index B)
- **Then** toutes les lignes entre A et B sont sélectionnées
- **And** le compteur de sélection est mis à jour

### AC3: Select All / Deselect All

- **Given** le Quote Editor avec des lignes
- **When** l'utilisateur clique sur la checkbox du header
- **Then** toutes les lignes sont sélectionnées si aucune ne l'était
- **Or** toutes les lignes sont désélectionnées si au moins une l'était

### AC4: Toolbar Flottante Contextuelle

- **Given** au moins une ligne sélectionnée
- **When** la sélection est active
- **Then** une toolbar flottante apparaît en bas de l'écran
- **And** la toolbar affiche le nombre de lignes sélectionnées
- **And** la toolbar contient les actions : "Supprimer", "Dupliquer", "Désélectionner"

### AC5: Action Supprimer en Masse

- **Given** N lignes sélectionnées
- **When** l'utilisateur clique sur "Supprimer"
- **Then** une confirmation est demandée ("Supprimer N lignes ?")
- **And** après confirmation, les N lignes sont supprimées
- **And** l'action est enregistrée dans l'historique Undo

### AC6: Action Dupliquer en Masse

- **Given** N lignes sélectionnées
- **When** l'utilisateur clique sur "Dupliquer"
- **Then** N nouvelles lignes sont créées avec les mêmes données (sauf ID)
- **And** les nouvelles lignes sont insérées après la dernière ligne sélectionnée
- **And** les nouvelles lignes sont automatiquement sélectionnées
- **And** l'action est enregistrée dans l'historique Undo

### AC7: Drag & Drop Ghost Image Améliorée

- **Given** une ou plusieurs lignes sélectionnées
- **When** l'utilisateur commence un drag
- **Then** le ghost image affiche un badge avec le nombre de lignes déplacées
- **And** le ghost a un style semi-transparent propre

### AC8: Keyboard Shortcuts

- **Given** le Quote Editor est focus
- **When** l'utilisateur appuie sur Cmd/Ctrl+A
- **Then** toutes les lignes sont sélectionnées
- **When** l'utilisateur appuie sur Escape
- **Then** la sélection est vidée
- **When** l'utilisateur appuie sur Delete/Backspace avec sélection
- **Then** la suppression en masse est déclenchée (avec confirmation)

## Technical Implementation

### 1. Store Zustand Extension

Étendre `useQuoteLinesStore` avec :

```typescript
interface QuoteLinesState {
  // Existing
  lines: QuoteLine[];
  setLines: (lines: QuoteLine[]) => void;
  updateLine: (id: string, data: Partial<QuoteLine>) => void;

  // New: Selection State
  selectedLineIds: Set<string>;
  lastSelectedId: string | null;

  // New: Selection Actions
  selectLine: (id: string) => void;
  deselectLine: (id: string) => void;
  toggleLineSelection: (id: string) => void;
  selectRange: (fromId: string, toId: string) => void;
  selectAll: () => void;
  deselectAll: () => void;

  // New: Bulk Actions
  deleteSelected: () => void;
  duplicateSelected: () => void;
}
```

### 2. UI Components

#### SelectionCheckbox

- Checkbox dans `UniversalLineItemRow`
- Visible on hover ou si ligne sélectionnée
- Gère Shift+Click pour sélection range

#### SelectionToolbar

- Position fixed bottom
- AnimatePresence pour apparition/disparition
- Actions : Delete, Duplicate, Deselect
- Badge compteur

#### Enhanced DragOverlay

- Badge avec compteur si multi-sélection
- Style glassmorphism

### 3. Files to Modify/Create

- `apps/web/modules/saas/quotes/stores/useQuoteLinesStore.ts` - Extend store
- `apps/web/modules/saas/quotes/components/yolo/UniversalLineItemRow.tsx` - Add checkbox
- `apps/web/modules/saas/quotes/components/yolo/SelectionToolbar.tsx` - NEW
- `apps/web/modules/saas/quotes/components/yolo/SortableQuoteLinesList.tsx` - Header checkbox, keyboard
- `apps/web/modules/saas/quotes/components/yolo/YoloQuoteEditor.tsx` - Integrate toolbar

## Test Cases

### Unit Tests (Vitest)

#### TC1: Store Selection Actions

```typescript
describe("useQuoteLinesStore selection", () => {
  it("should select a line", () => {
    // Given lines in store
    // When selectLine('line-1')
    // Then selectedLineIds contains 'line-1'
  });

  it("should toggle selection", () => {
    // Given line-1 selected
    // When toggleLineSelection('line-1')
    // Then selectedLineIds is empty
  });

  it("should select all lines", () => {
    // Given 5 lines in store
    // When selectAll()
    // Then selectedLineIds.size === 5
  });

  it("should deselect all lines", () => {
    // Given 3 lines selected
    // When deselectAll()
    // Then selectedLineIds.size === 0
  });

  it("should select range", () => {
    // Given lines [A, B, C, D, E]
    // When selectRange('B', 'D')
    // Then selectedLineIds contains B, C, D
  });
});
```

#### TC2: Bulk Delete Action

```typescript
describe("deleteSelected", () => {
  it("should remove selected lines", () => {
    // Given lines [A, B, C] with B selected
    // When deleteSelected()
    // Then lines === [A, C]
    // And selectedLineIds is empty
  });

  it("should be undoable", () => {
    // Given lines [A, B, C] with B selected
    // When deleteSelected() then undo()
    // Then lines === [A, B, C]
  });
});
```

#### TC3: Bulk Duplicate Action

```typescript
describe("duplicateSelected", () => {
  it("should duplicate selected lines", () => {
    // Given lines [A, B, C] with B selected
    // When duplicateSelected()
    // Then lines.length === 4
    // And new line has same data as B (except id)
  });

  it("should select duplicated lines", () => {
    // Given lines [A, B] with B selected
    // When duplicateSelected()
    // Then selectedLineIds contains only the new line
  });
});
```

### Browser Tests (MCP Playwright)

#### BT1: Visual Selection

1. Navigate to Quote Editor with lines
2. Hover over line → Checkbox visible
3. Click checkbox → Line highlighted
4. Toolbar appears at bottom

#### BT2: Multi-Selection

1. Select line 1
2. Shift+Click line 3
3. Verify lines 1, 2, 3 are selected
4. Toolbar shows "3 lignes sélectionnées"

#### BT3: Bulk Delete

1. Select 2 lines
2. Click "Supprimer" in toolbar
3. Confirm dialog appears
4. Confirm → Lines removed
5. Undo → Lines restored

## Out of Scope

- Drag & Drop multi-selection (déplacer plusieurs lignes en même temps) - Future story
- Copy/Paste entre devis - Future story
- Export sélection - Future story

## Estimation

- **Complexity**: Medium
- **Story Points**: 5
- **Estimated Time**: 4-6 hours

## Notes

- La sélection doit être vidée lors du changement de devis
- Les lignes GROUP sélectionnées incluent implicitement leurs enfants pour les actions
- Le Shift+Click doit fonctionner même si les lignes sont dans des groupes différents
