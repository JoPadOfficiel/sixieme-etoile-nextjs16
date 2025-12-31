# Story 17.15: Client Difficulty Score (Patience Tax)

Status: done

## Story

As an **administrator**,
I want to configure difficulty scores for clients that trigger automatic price adjustments,
so that pricing reflects the additional operational burden of difficult clients.

## Related FRs

- **FR77:** The system shall support configurable client difficulty scores in the CRM that can trigger automatic price multipliers (patience tax) according to organisation policy.

## Business Context

Certains clients génèrent une charge opérationnelle plus élevée que d'autres :

- Retards fréquents nécessitant une attente prolongée
- Exigences particulières (changements de dernière minute, demandes spéciales)
- Communication difficile ou comportement compliqué
- Historique de litiges ou réclamations

Le "Patience Tax" permet de facturer automatiquement un supplément pour compenser cette friction opérationnelle, tout en maintenant la transparence dans le calcul du prix.

## Acceptance Criteria

### AC1 - Champ difficultyScore sur Contact

**Given** un contact dans le CRM,
**When** un admin édite le contact,
**Then** il voit un champ optionnel "Score de difficulté" (échelle 1-5),
**And** le champ peut être laissé vide (null = pas de multiplicateur),
**And** le champ est visible uniquement pour les utilisateurs avec rôle admin/finance.

### AC2 - Configuration des multiplicateurs par score

**Given** un admin naviguant vers Organisation Settings → Pricing,
**When** il accède à la section "Client Difficulty Multipliers",
**Then** il voit une table configurable avec :

- Score 1 → Multiplicateur (défaut: 1.00 = pas de changement)
- Score 2 → Multiplicateur (défaut: 1.02 = +2%)
- Score 3 → Multiplicateur (défaut: 1.05 = +5%)
- Score 4 → Multiplicateur (défaut: 1.08 = +8%)
- Score 5 → Multiplicateur (défaut: 1.10 = +10%)
  **And** les multiplicateurs sont éditables et sauvegardés dans OrganizationPricingSettings.

### AC3 - Application automatique du multiplicateur

**Given** un devis créé pour un client avec `difficultyScore = 4`,
**When** le moteur de pricing calcule le prix,
**Then** le multiplicateur correspondant (1.08 = +8%) est appliqué au prix de base,
**And** une règle `CLIENT_DIFFICULTY_MULTIPLIER` est ajoutée aux `appliedRules`,
**And** la règle contient : `{ type, description, difficultyScore, multiplier, priceBefore, priceAfter }`.

### AC4 - Affichage dans Trip Transparency

**Given** un devis avec un client ayant un score de difficulté,
**When** l'opérateur consulte le Trip Transparency panel,
**Then** il voit une ligne "Ajustement difficulté client: +X%",
**And** le montant de l'ajustement est visible dans le breakdown.

### AC5 - Non-application pour les prix contractuels

**Given** un devis pour un partenaire avec grille contractuelle (Method 1 - FIXED_GRID),
**When** le prix est déterminé par la grille (Engagement Rule),
**Then** le multiplicateur de difficulté n'est PAS appliqué,
**And** le prix contractuel reste inchangé.

### AC6 - Score null = pas de multiplicateur

**Given** un contact sans score de difficulté (null),
**When** un devis est créé pour ce contact,
**Then** aucun multiplicateur de difficulté n'est appliqué,
**And** aucune règle `CLIENT_DIFFICULTY_MULTIPLIER` n'apparaît dans `appliedRules`.

## Tasks / Subtasks

- [ ] **Task 1: Schema Prisma** (AC: #1, #2)

  - [ ] 1.1 Ajouter `difficultyScore Int?` au modèle `Contact`
  - [ ] 1.2 Ajouter `difficultyMultipliers Json?` au modèle `OrganizationPricingSettings`
  - [ ] 1.3 Créer et exécuter la migration Prisma
  - [ ] 1.4 Mettre à jour le seed avec des valeurs par défaut

- [ ] **Task 2: API Backend** (AC: #1, #2, #3)

  - [ ] 2.1 Mettre à jour le schéma de validation contacts.ts pour `difficultyScore`
  - [ ] 2.2 Créer endpoint GET/PUT pour les difficulty multipliers dans pricing-settings
  - [ ] 2.3 Ajouter la logique dans pricing-engine.ts pour appliquer le multiplicateur
  - [ ] 2.4 Créer interface `AppliedClientDifficultyRule` dans pricing-engine.ts
  - [ ] 2.5 Intégrer dans `buildDynamicResult()` après les autres multiplicateurs

- [ ] **Task 3: UI Contact Form** (AC: #1)

  - [ ] 3.1 Ajouter le champ "Score de difficulté" dans ContactForm.tsx
  - [ ] 3.2 Utiliser un Select avec options 1-5 + option "Non défini"
  - [ ] 3.3 Ajouter les traductions FR/EN

- [ ] **Task 4: UI Settings Pricing** (AC: #2)

  - [ ] 4.1 Créer composant DifficultyMultipliersTable.tsx
  - [ ] 4.2 Intégrer dans la page Settings → Pricing
  - [ ] 4.3 Ajouter les traductions FR/EN

- [ ] **Task 5: Trip Transparency Integration** (AC: #4)

  - [ ] 5.1 Mettre à jour TripTransparencyPanel pour afficher la règle
  - [ ] 5.2 Ajouter le formatage du multiplicateur de difficulté

- [ ] **Task 6: Tests** (AC: #1-6)
  - [ ] 6.1 Tests unitaires pricing-engine (avec/sans score, différents scores)
  - [ ] 6.2 Tests unitaires pour non-application sur FIXED_GRID
  - [ ] 6.3 Tests API pour CRUD difficultyScore sur Contact
  - [ ] 6.4 Tests API pour CRUD difficultyMultipliers sur Settings
  - [ ] 6.5 Test E2E Playwright : création devis avec client difficile

## Dev Notes

### Architecture Patterns

Le multiplicateur de difficulté s'intègre dans la chaîne de pricing existante :

```
Base Price → Vehicle Category Multiplier → Zone Multiplier → Advanced Rates → Seasonal Multipliers → CLIENT_DIFFICULTY_MULTIPLIER → Final Price
```

Le multiplicateur doit être appliqué **après** les autres multiplicateurs mais **avant** le calcul final de marge.

### Structure des Difficulty Multipliers (JSON)

```typescript
interface DifficultyMultipliers {
  1: number; // e.g., 1.00
  2: number; // e.g., 1.02
  3: number; // e.g., 1.05
  4: number; // e.g., 1.08
  5: number; // e.g., 1.10
}
```

Valeurs par défaut si non configuré :

```json
{ "1": 1.0, "2": 1.02, "3": 1.05, "4": 1.08, "5": 1.1 }
```

### AppliedRule Interface

```typescript
export interface AppliedClientDifficultyRule extends AppliedRule {
  type: "CLIENT_DIFFICULTY_MULTIPLIER";
  description: string;
  difficultyScore: number;
  multiplier: number;
  priceBefore: number;
  priceAfter: number;
}
```

### Fichiers à modifier

| Fichier                                                                    | Modification                                                                               |
| -------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/database/prisma/schema.prisma`                                   | Ajouter `difficultyScore` à Contact, `difficultyMultipliers` à OrganizationPricingSettings |
| `packages/api/src/routes/vtc/contacts.ts`                                  | Valider et persister `difficultyScore`                                                     |
| `packages/api/src/routes/vtc/pricing-settings.ts`                          | Endpoint pour difficulty multipliers                                                       |
| `packages/api/src/services/pricing-engine.ts`                              | Logique d'application du multiplicateur                                                    |
| `packages/api/src/services/pricing-calculate.ts`                           | Passer contactData au pricing engine                                                       |
| `apps/web/modules/saas/contacts/components/ContactForm.tsx`                | Champ UI pour difficultyScore                                                              |
| `apps/web/modules/saas/settings/components/DifficultyMultipliersTable.tsx` | Nouveau composant                                                                          |
| `apps/web/modules/saas/quotes/components/TripTransparencyPanel.tsx`        | Affichage de la règle                                                                      |

### Contraintes

1. **Engagement Rule** : Ne jamais appliquer le multiplicateur sur les prix FIXED_GRID (partenaires avec grille)
2. **Null Safety** : Si `difficultyScore` est null ou si le score n'a pas de multiplicateur configuré, ne rien appliquer
3. **Ordre d'application** : Appliquer après les autres multiplicateurs (zone, advanced rates, seasonal)
4. **Transparence** : Toujours ajouter une `appliedRule` quand le multiplicateur est appliqué

### Testing Standards

- **Vitest** : Tests unitaires dans `packages/api/src/services/__tests__/client-difficulty.test.ts`
- **Playwright** : Test E2E dans `apps/web/cypress/e2e/quotes/client-difficulty.spec.ts`
- **Curl** : Vérification API manuelle avec MCP postgres

### Project Structure Notes

- Le champ `difficultyScore` suit le pattern des autres champs optionnels sur Contact (comme `notes`, `siret`)
- Les difficulty multipliers suivent le pattern de `madTimeBuckets` pour la configuration JSON
- L'intégration dans le pricing engine suit le pattern de `applyVehicleCategoryMultiplier`

### References

- [Source: docs/bmad/prd.md#FR77]
- [Source: docs/bmad/epics.md#Story-17.15]
- [Source: packages/api/src/services/pricing-engine.ts - AppliedRule interface]
- [Source: packages/database/prisma/schema.prisma - Contact model, OrganizationPricingSettings model]
- [Source: apps/web/modules/saas/contacts/components/ContactForm.tsx - Contact form pattern]

## Dev Agent Record

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

- All 16 unit tests passing for `applyClientDifficultyMultiplier`

### Completion Notes List

- Schema Prisma mis à jour avec `difficultyScore` sur Contact et `difficultyMultipliers` sur OrganizationPricingSettings
- Migration Prisma créée et appliquée
- Fonction `applyClientDifficultyMultiplier` ajoutée au pricing engine
- Intégration dans `buildDynamicResult` après les autres multiplicateurs
- API contacts mise à jour pour CRUD du difficultyScore
- UI ContactForm avec Select pour le score de difficulté
- Traductions FR/EN ajoutées

### File List

- `packages/database/prisma/schema.prisma` - Ajout difficultyScore et difficultyMultipliers
- `packages/database/prisma/migrations/20251231093212_add_client_difficulty_score/migration.sql`
- `packages/api/src/services/pricing-engine.ts` - Fonction et types pour le multiplicateur
- `packages/api/src/services/__tests__/client-difficulty.test.ts` - 16 tests unitaires
- `packages/api/src/routes/vtc/contacts.ts` - Validation schema avec difficultyScore
- `packages/api/src/routes/vtc/pricing-calculate.ts` - Chargement du difficultyScore
- `apps/web/modules/saas/contacts/types.ts` - Interface Contact avec difficultyScore
- `apps/web/modules/saas/contacts/components/ContactForm.tsx` - UI pour le score
- `packages/i18n/translations/fr.json` - Traductions françaises
- `packages/i18n/translations/en.json` - Traductions anglaises
