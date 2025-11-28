# Story 9.6: Settings → Integrations (Google Maps & CollectAPI)

**Status:** in-progress  
**Epic:** Epic 9 - Advanced Pricing Configuration & Reporting  
**Priority:** High  
**Complexity:** Medium  
**Created:** 2025-11-28

---

## User Story

**As an** organisation admin,  
**I want** a UI to manage Google Maps and CollectAPI keys and test their connectivity,  
**So that** operators can keep integrations healthy without touching environment variables.

---

## Description

Cette story implémente la fonctionnalité de test de connexion pour les intégrations externes (Google Maps et CollectAPI) dans la page Settings → Integrations. L'interface existante permet déjà de sauvegarder les clés API, mais il manque :

1. **Bouton "Test connection"** pour valider que les clés fonctionnent
2. **Indicateurs de statut** (Connected/Invalid/Unknown) avec feedback visuel
3. **Client CollectAPI** pour appeler l'API Gas Prices
4. **Sélecteur de type de carburant** préféré (diesel/gasoline/lpg)

### Valeur Métier

- **Fiabilité** : Les opérateurs peuvent vérifier que leurs intégrations fonctionnent avant de les utiliser
- **Autonomie** : Pas besoin d'intervention technique pour diagnostiquer les problèmes
- **Transparence** : Visibilité claire sur l'état de santé des intégrations

---

## Related FRs

- **FR41** : Fuel price cache sourced from external provider (CollectAPI)
- Configuration context pour Google Maps

---

## Acceptance Criteria

### AC1: Interface avec indicateurs de statut

```gherkin
Given /dashboard/settings/integrations
When I open it
Then I see cards for Google Maps and CollectAPI with:
  - Fields for API keys (masked)
  - Optional fuel type preference selector (for CollectAPI)
  - "Test connection" button
  - Status indicators (Connected/Invalid/Unknown)
```

### AC2: Test de connexion CollectAPI

```gherkin
Given a configured CollectAPI key
When I click "Test connection" for CollectAPI
Then the system calls CollectAPI /fromCoordinates with Paris coordinates (48.8566, 2.3522)
And displays success status with fuel prices if successful
Or displays error message if failed
```

### AC3: Test de connexion Google Maps

```gherkin
Given a configured Google Maps key
When I click "Test connection" for Google Maps
Then the system validates the key via Geocoding API
And displays success status if valid
Or displays error message if invalid
```

### AC4: Sauvegarde des paramètres

```gherkin
Given saving changes
When I update keys or fuel type preference
Then OrganizationIntegrationSettings is updated in database
And the test connection uses these new values
```

### AC5: Intégration de la clé CollectAPI

```gherkin
Given the organization vtc-qa-orga1
When the story is implemented
Then the CollectAPI key is configured in the database
And test connection returns success
```

---

## Technical Implementation

### Files to Create

| File                                         | Description                               |
| -------------------------------------------- | ----------------------------------------- |
| `packages/api/src/lib/collectapi-client.ts`  | Client pour appeler CollectAPI Gas Prices |
| `packages/api/src/lib/google-maps-client.ts` | Client pour tester Google Maps API        |

### Files to Modify

| File                                                                    | Changes                              |
| ----------------------------------------------------------------------- | ------------------------------------ |
| `packages/api/src/routes/vtc/integrations.ts`                           | Ajouter endpoint POST /test/:keyType |
| `packages/database/prisma/schema.prisma`                                | Ajouter champ preferredFuelType      |
| `apps/web/modules/saas/settings/components/IntegrationSettingsForm.tsx` | Ajouter bouton Test + indicateurs    |
| `packages/i18n/translations/en.json`                                    | Traductions anglaises                |
| `packages/i18n/translations/fr.json`                                    | Traductions françaises               |

### Database Changes

```prisma
model OrganizationIntegrationSettings {
  // ... existing fields
  preferredFuelType String? @default("DIESEL") // DIESEL, GASOLINE, LPG
}
```

### API Endpoints

#### POST /vtc/settings/integrations/test/:keyType

Test la connectivité d'une clé API.

**Parameters:**

- `keyType`: `googleMaps` | `collectApi`

**Response (success):**

```json
{
  "success": true,
  "status": "connected",
  "details": {
    "latency": 234,
    "message": "Connection successful"
  }
}
```

**Response (failure):**

```json
{
  "success": false,
  "status": "invalid",
  "error": "Invalid API key"
}
```

### CollectAPI Client

```typescript
interface CollectAPIResponse {
  success: boolean;
  result: Array<{
    country: string;
    gasoline: string;
    diesel: string;
    lpg: string;
    currency: string;
  }>;
}

async function testCollectAPIConnection(apiKey: string): Promise<TestResult>;
async function fetchFuelPrices(
  apiKey: string,
  lat: number,
  lng: number,
  type?: string
): Promise<FuelPrices>;
```

---

## Test Cases

### Unit Tests (Vitest)

| Test ID   | Description                                | Expected Result            |
| --------- | ------------------------------------------ | -------------------------- |
| UT-9.6-01 | CollectAPI client handles success response | Returns parsed fuel prices |
| UT-9.6-02 | CollectAPI client handles invalid key      | Throws appropriate error   |
| UT-9.6-03 | CollectAPI client handles network error    | Throws with retry info     |
| UT-9.6-04 | Google Maps client validates key           | Returns success/failure    |
| UT-9.6-05 | Test endpoint requires admin role          | Returns 403 for non-admin  |

### E2E Tests (Playwright MCP)

| Test ID    | Description                 | Steps                                   |
| ---------- | --------------------------- | --------------------------------------- |
| E2E-9.6-01 | Test CollectAPI connection  | Navigate → Click Test → Verify success  |
| E2E-9.6-02 | Test Google Maps connection | Navigate → Click Test → Verify success  |
| E2E-9.6-03 | Update fuel type preference | Select diesel → Save → Verify persisted |

### API Tests (Curl)

```bash
# Test CollectAPI connection
curl -X POST "http://localhost:3000/api/vtc/settings/integrations/test/collectApi" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"

# Test Google Maps connection
curl -X POST "http://localhost:3000/api/vtc/settings/integrations/test/googleMaps" \
  -H "Cookie: better-auth.session_token=..." \
  -H "Content-Type: application/json"
```

### Database Verification (MCP)

```sql
-- Verify CollectAPI key is configured
SELECT id, "organizationId",
       CASE WHEN "collectApiKey" IS NOT NULL THEN 'configured' ELSE 'not configured' END as status,
       "preferredFuelType"
FROM organization_integration_settings
WHERE "organizationId" = 'vtc-qa-orga1';
```

---

## Dependencies

### Prerequisites (Completed)

- Story 1.5: Integration Settings Storage ✅
- OrganizationIntegrationSettings model ✅
- Basic integrations API routes ✅

### Blockers

- None

---

## Constraints

1. **Security**: API keys must never be exposed in client-side code (except Google Maps for JS init)
2. **Rate Limiting**: CollectAPI may have rate limits - implement appropriate delays
3. **Fallback**: If no org-specific key, use environment variable
4. **Currency**: CollectAPI returns USD - note this in UI (or convert to EUR)

---

## Out of Scope

- Automatic fuel price cache refresh (Story 9.7)
- Multi-currency support
- Other integrations beyond Google Maps and CollectAPI

---

## Definition of Done

- [ ] CollectAPI client implemented and tested
- [ ] Google Maps test client implemented
- [ ] API endpoint POST /test/:keyType working
- [ ] UI updated with Test button and status indicators
- [ ] Fuel type preference selector added
- [ ] Translations added (EN/FR)
- [ ] CollectAPI key inserted in database for vtc-qa-orga1
- [ ] All acceptance criteria validated
- [ ] E2E tests passing (Playwright MCP)
- [ ] API endpoints tested with curl
- [ ] Database state verified via MCP

---

## Implementation Notes

### CollectAPI Documentation

**Endpoint:** `GET https://api.collectapi.com/gasPrice/fromCoordinates`

**Headers:**

```
authorization: apikey YOUR_TOKEN
content-type: application/json
```

**Query Parameters:**

- `lat`: Latitude (e.g., 48.8566 for Paris)
- `lng`: Longitude (e.g., 2.3522 for Paris)
- `type`: Optional filter (gasoline, diesel, lpg)

**Response:**

```json
{
  "success": true,
  "result": [
    {
      "country": "France",
      "gasoline": "1.85",
      "currency": "usd",
      "diesel": "1.75",
      "lpg": "0.95"
    }
  ]
}
```

### Provided Credentials

**CollectAPI Key (for vtc-qa-orga1):**

```
2LVzUXXQNYVv57lQiKOk5V:3PZwjHYcedBHxrK7BN5wai
```

---

## Validation Evidence

_(To be filled during implementation)_

### API Tests

- [ ] POST /test/collectApi - Success
- [ ] POST /test/googleMaps - Success

### E2E Tests

- [ ] Test connection flow working

### Database Verification

- [ ] CollectAPI key configured for vtc-qa-orga1
