# Story 24.7: Integrate EndCustomer in Dispatch Interface

**Status:** DONE ✅

## Description
**En tant que** dispatcher,  
**Je veux** voir le nom du client final (EndCustomer) directement sur les cartes de missions dans le cockpit de dispatch,  
**Afin de** pouvoir identifier rapidement les passagers et coordonner les chauffeurs avec les bonnes informations de contact/accueil.

## Acceptance Criteria
1. ✅ **Affichage sur les Cartes de Mission (Missions List):** Le nom complet du passager ("Prénom Nom") s'affiche sur la carte de mission dans `MissionRow`, à côté de l'agence ou dans une ligne dédiée "via [Agence]".
2. ✅ **Affichage dans le Panneau de Détail (Mission Detail):** Le nouveau composant `MissionContactPanel` affiche une section dédiée au Client Final avec son nom, email et téléphone, ainsi que les informations de l'agence.
3. ✅ **Affichage dans le Tiroir d'Assignation (Assignment Drawer):** Le nom du passager apparaît en haut du tiroir lors de l'assignation d'un chauffeur.
4. ✅ **Fallback:** Si aucun `EndCustomer` n'est défini, l'interface affiche uniquement le nom de l'agence (comportement par défaut actuel).
5. ✅ **Recherche:** La recherche dans le dispatch inclut les prénoms et noms de famille des EndCustomers.

## Technical Implementation

### Backend (API)
**File:** `packages/api/src/routes/vtc/missions.ts`
- ✅ Ajouté `endCustomer` à l'interface `MissionListItem`
- ✅ Inclus `endCustomer` dans la relation `include` pour `GET /missions` (liste)
- ✅ Inclus `endCustomer` dans la relation `include` pour `GET /missions/:id` (détail)
- ✅ Ajouté recherche par `endCustomer.firstName` et `endCustomer.lastName` dans le filtre `search`
- ✅ Mappé `endCustomer` dans les réponses de transformation

### Frontend (UI)

**File:** `apps/web/modules/saas/dispatch/types/mission.ts`
- ✅ Interface `MissionListItem` déjà mise à jour avec `endCustomer` (Story 24.5)

**File:** `apps/web/modules/saas/dispatch/components/MissionRow.tsx`
- ✅ Affichage du nom de l'EndCustomer à la place du nom de l'agence si `endCustomer` existe
- ✅ Affichage de "via [Nom de l'Agence]" en texte secondaire
- ✅ Affichage du téléphone de l'EndCustomer en priorité

**File:** `apps/web/modules/saas/dispatch/components/MissionContactPanel.tsx` (Nouveau)
- ✅ Créé composant pour afficher les détails complets de l'agence et du client final
- ✅ Section "Agence/Partenaire" avec email et téléphone
- ✅ Section "Client Final (Passager)" avec badge, email et téléphone

**File:** `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`
- ✅ Intégré `MissionContactPanel` dans le layout après `TripTransparencyPanel`
- ✅ Passé `selectedMission` au composant

**File:** `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx`
- ✅ Ajouté `endCustomerName` à l'interface `missionSummary`
- ✅ Affichage du nom du passager avec icône `User` en haut du drawer si disponible

### Translations
**Files:** `packages/i18n/translations/fr.json`, `packages/i18n/translations/en.json`
- ✅ Ajouté `dispatch.missions.contactTitle`: "Contacts" / "Contacts"
- ✅ Ajouté `dispatch.missions.endCustomerLabel`: "Client Final (Passager)" / "End Customer (Passenger)"
- ✅ Ajouté `dispatch.missions.passenger`: "Passager" / "Passenger"

## Testing

### Automated Tests
**File:** `packages/api/src/routes/vtc/__tests__/dispatch-endcustomer.test.ts`
- ✅ Test: `should include endCustomer in missions list`
- ✅ Test: `should include endCustomer in single mission detail`
- ✅ Test: `should search by endCustomer firstName`
- ✅ Test: `should search by endCustomer lastName`
- ✅ Test: `should handle missions without endCustomer`

### Manual Verification
- ✅ API Response vérifiée: `endCustomer` inclus dans les missions
- ✅ UI vérifiée: Nom du passager affiché dans `MissionRow`
- ✅ UI vérifiée: `MissionContactPanel` affiche correctement l'agence et le passager
- ✅ UI vérifiée: `AssignmentDrawer` affiche le nom du passager
- ✅ Recherche vérifiée: Filtrage par nom de passager fonctionne

## Modified Files
1. `packages/api/src/routes/vtc/missions.ts`
2. `apps/web/modules/saas/dispatch/components/MissionRow.tsx` (déjà modifié en Story 24.5)
3. `apps/web/modules/saas/dispatch/components/MissionContactPanel.tsx` (nouveau)
4. `apps/web/modules/saas/dispatch/components/DispatchPage.tsx`
5. `apps/web/modules/saas/dispatch/components/AssignmentDrawer.tsx`
6. `packages/i18n/translations/fr.json`
7. `packages/i18n/translations/en.json`
8. `packages/api/src/routes/vtc/__tests__/dispatch-endcustomer.test.ts` (nouveau)

## Notes
- Le backend incluait déjà la relation `endCustomer` dans les queries (ajouté en Story 24.5)
- `MissionRow.tsx` affichait déjà le nom du passager (Story 24.5)
- Cette story a principalement ajouté:
  - Le nouveau composant `MissionContactPanel` pour un affichage détaillé
  - L'affichage du nom dans `AssignmentDrawer`
  - La recherche par nom de passager dans l'API
  - Les tests automatisés

## Dependencies
- Story 24.1 (EndCustomer Data Model) ✅
- Story 24.4 (EndCustomer Selector) ✅
- Story 24.5 (EndCustomer on Quote Summary) ✅
