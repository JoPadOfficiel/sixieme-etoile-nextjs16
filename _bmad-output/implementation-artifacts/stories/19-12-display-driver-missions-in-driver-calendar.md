# Story 19.12: Display Driver Missions in Driver Calendar

## Story Information

- **Epic**: 19 - Bug Fixes & UX Improvements
- **Story ID**: 19-12
- **Title**: Display Driver Missions in Driver Calendar
- **Status**: in-progress
- **Created**: 2026-01-02
- **Priority**: High

## Description

En tant qu'**opérateur VTC**, je veux **voir les missions assignées aux chauffeurs directement dans leur calendrier** afin de **visualiser leur charge de travail complète et éviter les conflits de planification**.

Actuellement, le calendrier chauffeur (`CalendarEventsList`) affiche uniquement les événements d'indisponibilité (congés, maladie, formation, etc.). Cette story ajoute l'affichage des missions (quotes avec `assignedDriverId` et statut ACCEPTED/CONFIRMED) dans la même vue calendrier.

## Business Value

- **Visibilité opérationnelle** : Vue consolidée missions + indisponibilités pour le dispatch
- **Prévention des conflits** : Détection visuelle des chevauchements potentiels
- **Conformité RSE** : Vérification des temps de repos entre missions
- **Efficacité** : Réduction des erreurs d'assignation

## Acceptance Criteria

### AC1: API - Endpoint pour récupérer les missions d'un chauffeur

```gherkin
Given un chauffeur avec des missions assignées
When je fais GET /api/vtc/drivers/{id}/missions avec startDate et endDate
Then je reçois la liste des quotes avec:
  - status IN (ACCEPTED, CONFIRMED, IN_PROGRESS)
  - assignedDriverId = {id} OR driverId = {id}
  - pickupAt dans la plage de dates demandée
  - Données: id, pickupAt, estimatedEndAt, pickupAddress, dropoffAddress, status, contact.name
```

### AC2: UI - Affichage des missions dans le calendrier

```gherkin
Given le composant CalendarEventsList est affiché pour un chauffeur
When les données sont chargées
Then les missions sont affichées avec:
  - Icône distincte (Car ou Briefcase)
  - Badge de couleur différente des événements (bleu/indigo pour missions)
  - Horaires pickup → estimatedEnd
  - Adresses pickup/dropoff
  - Nom du client
```

### AC3: UI - Distinction visuelle missions vs événements

```gherkin
Given le calendrier affiche missions et événements
Then les missions ont:
  - Couleur de fond indigo/bleu
  - Icône Car
  - Label "Mission"
Then les événements gardent leurs couleurs actuelles (vert/rouge/violet/gris)
```

### AC4: UI - Tri chronologique combiné

```gherkin
Given le calendrier contient missions et événements
When les données sont affichées
Then tous les éléments sont triés par date de début (startAt/pickupAt)
Then les missions et événements sont mélangés chronologiquement
```

### AC5: UI - Actions sur les missions

```gherkin
Given une mission est affichée dans le calendrier
When je clique sur "Voir"
Then je suis redirigé vers la page de détail du devis (/quotes/{id})
```

## Technical Design

### 1. Nouvel endpoint API

**Route**: `GET /api/vtc/drivers/:id/missions`

**Query params**:

- `startDate` (ISO string, optional)
- `endDate` (ISO string, optional)
- `limit` (number, default 50)

**Response**:

```typescript
{
  data: Array<{
    id: string;
    pickupAt: string;
    estimatedEndAt: string | null;
    pickupAddress: string;
    dropoffAddress: string | null;
    status: QuoteStatus;
    tripType: TripType;
    contact: {
      id: string;
      name: string;
    };
    vehicleCategory: {
      id: string;
      name: string;
    };
  }>;
  meta: {
    count: number;
    limit: number;
  }
}
```

### 2. Modifications UI

**Fichier**: `apps/web/modules/saas/fleet/components/CalendarEventsList.tsx`

- Ajouter fetch des missions en parallèle des événements
- Créer type unifié `CalendarItem` (mission | event)
- Fusionner et trier par date
- Ajouter config visuelle pour missions

**Nouveau type**:

```typescript
type CalendarItemType = "event" | "mission";

interface CalendarItem {
  type: CalendarItemType;
  id: string;
  startAt: string;
  endAt: string;
  title: string;
  subtitle?: string;
  // Pour events
  eventType?: CalendarEventType;
  notes?: string;
  // Pour missions
  quoteId?: string;
  status?: QuoteStatus;
  pickupAddress?: string;
  dropoffAddress?: string;
  contactName?: string;
}
```

### 3. Traductions

Ajouter dans `apps/web/content/locales/fr.json`:

```json
{
  "fleet.calendar.missions": "Missions",
  "fleet.calendar.mission": "Mission",
  "fleet.calendar.viewQuote": "Voir le devis",
  "fleet.calendar.noMissions": "Aucune mission planifiée",
  "fleet.calendar.missionTo": "vers"
}
```

## Test Cases

### TC1: API - Liste des missions d'un chauffeur

- **Setup**: Chauffeur avec 3 quotes assignées (1 ACCEPTED, 1 DRAFT, 1 REJECTED)
- **Action**: GET /api/vtc/drivers/{id}/missions
- **Expected**: Retourne uniquement la quote ACCEPTED

### TC2: API - Filtrage par date

- **Setup**: Chauffeur avec missions le 15/01 et 20/01
- **Action**: GET avec startDate=14/01 et endDate=16/01
- **Expected**: Retourne uniquement la mission du 15/01

### TC3: UI - Affichage combiné

- **Setup**: Chauffeur avec 1 mission et 1 congé
- **Action**: Ouvrir le calendrier du chauffeur
- **Expected**: Les deux éléments sont affichés avec styles distincts

### TC4: UI - Navigation vers devis

- **Setup**: Mission affichée dans le calendrier
- **Action**: Clic sur "Voir le devis"
- **Expected**: Redirection vers /quotes/{id}

## Dependencies

- Story 17.6: Driver Calendar Events Model (done)
- Story 17.7: Driver Availability Overlap Detection (done)
- Story 8.2: Assignment Drawer (done)

## Files to Modify

1. `packages/api/src/routes/vtc/drivers.ts` - Ajouter endpoint missions
2. `apps/web/modules/saas/fleet/components/CalendarEventsList.tsx` - Afficher missions
3. `apps/web/modules/saas/fleet/types.ts` - Ajouter types missions
4. `apps/web/content/locales/fr.json` - Traductions
5. `apps/web/content/locales/en.json` - Traductions EN

## Out of Scope

- Modification des missions depuis le calendrier (edit/delete)
- Vue calendrier mensuelle (reste en liste)
- Drag & drop pour réassigner

## Definition of Done

- [ ] Endpoint API GET /drivers/:id/missions implémenté et testé
- [ ] Missions affichées dans CalendarEventsList avec style distinct
- [ ] Tri chronologique missions + événements
- [ ] Lien vers page devis fonctionnel
- [ ] Traductions FR/EN ajoutées
- [ ] Tests Playwright MCP passants
- [ ] Tests Curl API passants
- [ ] Vérification DB cohérente
