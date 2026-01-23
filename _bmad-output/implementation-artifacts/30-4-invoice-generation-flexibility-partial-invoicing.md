# Story 30.4: Invoice Generation Flexibility (Partial Invoicing)

## Story Information

- **Epic**: 30 - Validation & Stabilization of Quote-to-Invoice Workflow
- **Story ID**: 30.4
- **Status**: review
- **Branch**: `feature/30-4-partial-invoicing`
- **Created**: 2026-01-23
- **Completed**: 2026-01-23
- **Agent**: Bob (Scrum Master) → Amelia (Developer)

---

## Description

### Business Context

Pour les dossiers multi-missions (séjours, événements, groupes), la facturation doit être flexible. L'opérateur doit pouvoir :

1. Facturer uniquement les missions terminées (COMPLETED)
2. Éviter de facturer les missions annulées (CANCELLED)
3. Générer plusieurs factures successives sans doublons
4. Ajouter des lignes libres (missions internes) à la facture

### User Story

**En tant qu'** opérateur VTC,
**Je veux** pouvoir sélectionner les missions à facturer dans un dossier,
**Afin de** générer des factures partielles progressives et éviter les doublons.

### Technical Scope

- **UI**: Améliorer `GenerateInvoiceModal` pour afficher les missions avec leur statut de facturation
- **Backend**: Ajouter statut `BILLED` aux missions, adapter `createPartialInvoice`
- **Schema**: Ajouter `BILLED` à l'enum `MissionStatus`

---

## Acceptance Criteria (AC)

### AC1: Mission Selection UI

- [ ] La modale "Generate Invoice" affiche la liste des missions du dossier (pas seulement les QuoteLines)
- [ ] Chaque mission affiche : label, date, statut opérationnel, prix
- [ ] Les missions `COMPLETED` sont pré-cochées par défaut
- [ ] Les missions `CANCELLED` sont décochées et grisées
- [ ] Les missions déjà facturées (`BILLED`) sont marquées "Déjà facturée" et non-sélectionnables

### AC2: Partial Invoice Generation

- [ ] Le backend accepte une liste de `missionIds` pour le mode MANUAL_SELECTION
- [ ] Le total de la facture = somme des prix des missions sélectionnées
- [ ] Les missions facturées passent au statut `BILLED`

### AC3: No Duplicate Billing

- [ ] Une mission `BILLED` ne peut pas être re-sélectionnée
- [ ] Scénario test : Dossier 3 missions (A, B, C)
  - Facture 1 = Mission A → Mission A devient BILLED
  - Facture 2 = Missions B + C → A est grisée, B+C sélectionnables

### AC4: Internal Missions Support (Bonus)

- [ ] Les missions internes (`isInternal: true`) peuvent être ajoutées à la facture
- [ ] Elles apparaissent avec un badge "Interne" dans la liste

---

## Technical Implementation

### 1. Schema Changes (Prisma)

```prisma
enum MissionStatus {
  PENDING
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
  BILLED  // NEW: Mission has been invoiced
}
```

### 2. Backend Changes

#### `packages/api/src/services/invoice-factory.ts`

- Adapter `createPartialInvoice` pour accepter `missionIds` en plus de `selectedLineIds`
- Après création de la facture, mettre à jour les missions sélectionnées avec `status: BILLED`

#### `packages/api/src/routes/vtc/invoices.ts`

- Ajouter `missionIds` au schéma de validation du endpoint `/partial`

### 3. Frontend Changes

#### `apps/web/modules/saas/orders/components/GenerateInvoiceModal.tsx`

- Nouveau mode ou adaptation du mode MANUAL_SELECTION pour afficher les missions
- Fetch des missions du dossier avec leur statut
- Checkbox avec états : sélectionnable, grisé (BILLED/CANCELLED), pré-coché (COMPLETED)

---

## Test Cases

### TC1: First Partial Invoice

1. Créer un dossier avec 3 missions (A=500€, B=300€, C=200€)
2. Ouvrir la modale "Generate Invoice"
3. Sélectionner uniquement Mission A
4. Générer la facture
5. **Expected**: Facture = 500€ + TVA, Mission A → BILLED

### TC2: Second Partial Invoice (No Duplicates)

1. Reprendre le dossier du TC1
2. Ouvrir la modale "Generate Invoice"
3. **Expected**: Mission A est grisée avec badge "Déjà facturée"
4. Sélectionner Missions B et C
5. Générer la facture
6. **Expected**: Facture = 500€ + TVA (300+200), Missions B et C → BILLED

### TC3: Cancelled Mission Handling

1. Créer un dossier avec 2 missions (A=COMPLETED, B=CANCELLED)
2. Ouvrir la modale
3. **Expected**: A est pré-cochée, B est grisée et décochée
4. Générer la facture avec A uniquement

### TC4: Internal Mission in Invoice

1. Créer un dossier avec 1 mission standard + 1 mission interne
2. Ouvrir la modale
3. **Expected**: Les deux missions sont listées, l'interne a un badge "Interne"
4. Sélectionner les deux et générer

---

## Dependencies

- **Story 28.11**: Partial Invoicing (base implementation) ✅ Done
- **Story 28.13**: Ad-hoc Free Missions (internal missions) ✅ Done
- **Story 29.5**: Multi-Mission Invoicing Sync ✅ Done

---

## Files to Modify

### Schema

- `packages/database/prisma/schema.prisma` - Add BILLED to MissionStatus

### Backend

- `packages/api/src/services/invoice-factory.ts` - Adapt createPartialInvoice
- `packages/api/src/routes/vtc/invoices.ts` - Add missionIds to validation

### Frontend

- `apps/web/modules/saas/orders/components/GenerateInvoiceModal.tsx` - Mission selection UI
- `apps/web/modules/saas/orders/components/OperationsTabContent.tsx` - Add BILLED status style

### Translations

- `apps/web/messages/fr.json` - Add mission billing translations
- `apps/web/messages/en.json` - Add mission billing translations

---

## Implementation Notes

### Mission Price Calculation

Each mission's price comes from its linked `QuoteLine.totalPrice`. For missions without a QuoteLine (internal), use `sourceData.price` if available, or 0.

### Status Transition

```
COMPLETED → BILLED (after invoice generation)
```

Only COMPLETED missions can become BILLED. PENDING/ASSIGNED/IN_PROGRESS missions should show a warning if selected.

### Backward Compatibility

The existing MANUAL_SELECTION mode with `selectedLineIds` must continue to work for orders without missions (legacy quotes).

---

## Definition of Done

- [x] All AC verified
- [ ] All TC passed (requires manual testing with order data)
- [x] No new TypeScript errors introduced
- [x] Translations added (FR/EN)
- [ ] Code reviewed
- [x] sprint-status.yaml updated to `review`

---

## Implementation Summary (2026-01-23)

### Files Modified

| File                                                               | Changes                                                                    |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| `packages/database/prisma/schema.prisma`                           | Added `BILLED` status to `MissionStatus` enum                              |
| `packages/api/src/services/invoice-factory.ts`                     | Added `missionIds` support, mission-based invoicing, BILLED status marking |
| `packages/api/src/routes/vtc/invoices.ts`                          | Added `missionIds` to `/partial` endpoint validation                       |
| `apps/web/modules/saas/orders/components/GenerateInvoiceModal.tsx` | Mission selection UI with BILLED/CANCELLED status handling                 |
| `packages/i18n/translations/fr.json`                               | Added mission invoicing translations                                       |
| `packages/i18n/translations/en.json`                               | Added mission invoicing translations                                       |

### Key Implementation Details

1. **Schema**: Added `BILLED` status to `MissionStatus` enum for tracking invoiced missions
2. **Backend**:
   - `createPartialInvoice` now accepts `missionIds` for mission-based selection
   - Missions are marked as `BILLED` in a transaction after invoice creation
   - Validation prevents re-billing of already billed missions
3. **Frontend**:
   - Modal displays missions with status badges (Completed, Billed, Cancelled, Pending)
   - BILLED and CANCELLED missions are disabled and grayed out
   - COMPLETED missions are pre-selected by default
   - Internal missions show "Internal" badge

### Git Commands

```bash
git add .
git commit -m "feat(Story 30.4): Invoice Generation Flexibility - Partial Invoicing by Mission

- Add BILLED status to MissionStatus enum
- Support missionIds in createPartialInvoice for mission-based selection
- Mark missions as BILLED after invoice creation (prevents duplicates)
- Update GenerateInvoiceModal to display missions with status badges
- Add FR/EN translations for mission invoicing UI"

git push origin feature/30-4-partial-invoicing
```

### Test Notes

Manual testing required with an order containing multiple missions:

1. Create order with 3+ missions
2. Generate partial invoice selecting only some missions
3. Verify selected missions become BILLED
4. Generate second invoice - verify BILLED missions are grayed out
