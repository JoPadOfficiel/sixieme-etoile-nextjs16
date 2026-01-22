# Story 28.10: Execution Feedback Loop (Placeholders)

## Story Info

- **Epic**: 28 - Order Management & Intelligent Spawning
- **Story ID**: 28-10
- **Status**: done
- **Priority**: High
- **Estimated Effort**: 3 SP
- **Assignee**: Amelia (Developer)
- **Created**: 2026-01-20
- **Branch**: `feature/28-10-placeholders`

---

## Description

**En tant qu'** opérateur,
**Je veux** utiliser des placeholders comme `{{driver}}` dans mes lignes de facture,
**Afin que** la facture finale affiche automatiquement qui a effectué la mission.

### Contexte Métier

Suite à la Story 28.9 (Invoice UI - Full Editability), les opérateurs peuvent éditer librement les descriptions de facture. Cette story ajoute un système de **placeholders dynamiques** qui permettent d'enrichir automatiquement les descriptions avec les données d'exécution des missions :

- **Nom du chauffeur** : Qui a effectué la course
- **Plaque du véhicule** : Quel véhicule a été utilisé
- **Horaires** : Début et fin de la mission

### Scope Technique

1. **Utilitaire `replacePlaceholders`** : Fonction pure pour remplacer les tokens
2. **UI Preview** : Bouton pour prévisualiser les remplacements sans modifier la base
3. **Action Finalize** : Remplacer définitivement les placeholders par le texte résolu
4. **Tokens supportés** : `{{driver}}`, `{{plate}}`, `{{start}}`, `{{end}}`

---

## Acceptance Criteria (AC)

### AC1: Fonction Utilitaire replacePlaceholders

- [x] Créer `replacePlaceholders(text: string, context: MissionContext): string`
- [x] Supporter les tokens : `{{driver}}`, `{{plate}}`, `{{start}}`, `{{end}}`
- [x] Retourner le texte original si aucun placeholder trouvé
- [x] Gérer les valeurs manquantes (afficher `[Non assigné]`)

### AC2: Récupération du Contexte Mission

- [x] L'Invoice est liée à un Order via `orderId`
- [x] L'Order contient les Missions avec les données d'exécution
- [x] Créer un hook `useMissionContext(invoiceId)` pour récupérer les données
- [x] Agréger les données si plusieurs missions (première mission utilisée)

### AC3: UI de Prévisualisation

- [x] Ajouter un bouton "Preview Variables" dans l'Invoice Editor
- [x] Afficher un dialog preview où les descriptions montrent les valeurs résolues
- [x] Le mode preview est visuel uniquement (pas de modification en base)
- [x] Bouton désactivé avec tooltip informatif si pas de mission liée

### AC4: Action Finalize

- [x] Bouton "Finalize" dans le dialog pour remplacer définitivement
- [x] Confirmation modale avant finalisation
- [x] Appel API POST /invoices/:id/finalize-placeholders
- [x] Toast de confirmation après succès

### AC5: Restriction aux Factures DRAFT

- [x] Les boutons Preview/Finalize ne sont visibles que pour status `DRAFT`
- [x] Cohérent avec la logique d'édition de Story 28.9

### AC6: Gestion des Cas Limites

- [x] Si pas de mission liée : bouton désactivé avec tooltip informatif
- [x] Si mission sans chauffeur assigné : `{{driver}}` → `[Non assigné]`
- [x] Si mission sans véhicule : `{{plate}}` → `[Non assigné]`

---

## Test Cases

### TC1: Remplacement Simple (Vitest)

**Given** un texte "Transfert par {{driver}} avec {{plate}}"
**And** un contexte `{ driverName: "John Doe", vehiclePlate: "AB-123-CD" }`
**When** j'appelle `replacePlaceholders(text, context)`
**Then** le résultat est "Transfert par John Doe avec AB-123-CD"

### TC2: Placeholder Non Trouvé (Vitest)

**Given** un texte "Transfert simple"
**And** un contexte complet
**When** j'appelle `replacePlaceholders(text, context)`
**Then** le résultat est "Transfert simple" (inchangé)

### TC3: Valeur Manquante (Vitest)

**Given** un texte "Transfert par {{driver}}"
**And** un contexte `{ driverName: null }`
**When** j'appelle `replacePlaceholders(text, context)`
**Then** le résultat est "Transfert par [Non assigné]"

### TC4: Preview UI (MCP Browser)

**Given** une facture DRAFT avec ligne "Courses avec {{driver}}"
**And** une mission liée avec chauffeur "John Doe"
**When** je clique sur "Preview Placeholders"
**Then** la description affiche "Courses avec John Doe" en mode preview

### TC5: Finalize Action (MCP Browser)

**Given** une facture DRAFT en mode preview
**When** je clique sur "Finalize Placeholders" et confirme
**Then** la description est mise à jour en base avec les valeurs résolues
**And** un toast de confirmation s'affiche

### TC6: Pas de Mission Liée (MCP Browser)

**Given** une facture DRAFT sans Order/Mission liée
**When** j'ouvre l'éditeur
**Then** les boutons Preview/Finalize sont désactivés avec tooltip explicatif

---

## Technical Notes

### Fichiers à Créer

1. **`apps/web/modules/saas/invoices/utils/placeholders.ts`** (NOUVEAU)

   ```typescript
   export interface MissionContext {
     driverName: string | null;
     vehiclePlate: string | null;
     startAt: string | null;
     endAt: string | null;
   }

   export function replacePlaceholders(
     text: string,
     context: MissionContext
   ): string {
     // Regex replacement for {{token}} patterns
   }

   export const PLACEHOLDER_TOKENS = [
     "{{driver}}",
     "{{plate}}",
     "{{start}}",
     "{{end}}",
   ];
   ```

2. **`apps/web/modules/saas/invoices/utils/__tests__/placeholders.test.ts`** (NOUVEAU)

   - Tests Vitest pour la fonction `replacePlaceholders`

3. **`apps/web/modules/saas/invoices/hooks/useMissionContext.ts`** (NOUVEAU)

   - Hook pour récupérer le contexte mission depuis l'Invoice → Order → Mission

### Fichiers à Modifier

4. **`apps/web/modules/saas/invoices/components/EditInvoicePage.tsx`**

   - Ajouter les boutons Preview/Finalize
   - Gérer l'état du mode preview

5. **`apps/web/modules/saas/invoices/components/InvoiceLinesList.tsx`**

   - Afficher les descriptions avec placeholders résolus en mode preview

6. **`packages/api/src/routes/vtc/invoices.ts`**

   - Endpoint pour finaliser les placeholders (PATCH avec action spéciale)

7. **`packages/i18n/translations/en.json`** et **`fr.json`**

   - Ajouter les traductions pour Preview, Finalize, messages

### Dépendances

- **Story 28.9 (DONE)** : Invoice UI - Full Editability
- **Story 28.8 (DONE)** : Invoice Generation - Detached Snapshot
- **Story 28.1 (DONE)** : Order Entity - Relation Invoice → Order → Mission

### API Contract

```typescript
// GET /api/vtc/invoices/:id/mission-context
// Response
{
  hasMission: boolean;
  context: {
    driverName: string | null;
    vehiclePlate: string | null;
    startAt: string | null;
    endAt: string | null;
  } | null;
}

// POST /api/vtc/invoices/:id/finalize-placeholders
// Request Body (empty - uses mission context from server)
{}

// Response: Invoice (avec descriptions mises à jour)
```

---

## Definition of Done

- [x] Tous les AC validés
- [x] Tests Vitest passés (regex replacement) - 26/26 tests
- [x] Tests navigateur MCP passés (UI Preview/Finalize)
- [ ] Code review effectuée
- [x] Pas de régression sur les fonctionnalités existantes
- [x] Traductions ajoutées (en/fr)

---

## Implementation Log

### 2026-01-20 - Story Created

- Story créée par Bob (Scrum Master)
- Basée sur Epic 28 et FR170
- Dépendances validées : 28.8 et 28.9 sont DONE

### 2026-01-20 - Implementation Completed

- **Branch**: `feature/28-10-placeholders`
- **Fichiers créés**:
  - `apps/web/modules/saas/invoices/utils/placeholders.ts` - Utilitaire replacePlaceholders
  - `apps/web/modules/saas/invoices/utils/__tests__/placeholders.test.ts` - Tests Vitest (26 tests)
  - `apps/web/modules/saas/invoices/hooks/useMissionContext.ts` - Hook pour contexte mission
  - `apps/web/modules/saas/invoices/components/PlaceholderPreviewDialog.tsx` - Dialog de prévisualisation
- **Fichiers modifiés**:
  - `packages/api/src/routes/vtc/invoices.ts` - Endpoints GET mission-context et POST finalize-placeholders
  - `apps/web/modules/saas/invoices/components/EditInvoicePage.tsx` - Intégration bouton Preview
  - `packages/i18n/translations/en.json` - Traductions anglaises
  - `packages/i18n/translations/fr.json` - Traductions françaises
- **Tests**:
  - Vitest: 26/26 tests passés (replacePlaceholders, hasPlaceholders, findPlaceholders, replaceAllPlaceholders)
  - UI: Page d'édition fonctionnelle, bouton Preview conditionnel (visible si mission liée)
- **Status**: REVIEW

---

## Notes

- **Contexte Story 28.10** : Enrichissement automatique des factures
- **Détails techniques** : Regex replacement avec fonction pure
- **Agent recommandé** : Antigravity
- **Implémenté par** : Amelia (Developer)
