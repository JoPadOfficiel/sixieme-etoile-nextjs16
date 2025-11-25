# Story 1.5: Integration Settings Storage for Google Maps & CollectAPI

Status: in-progress

## Story

As an **organisation admin**,
I want to store API keys for Google Maps and CollectAPI in a secure settings model,
So that operators can configure integrations from the UI instead of editing environment variables.

## Acceptance Criteria

1. **Settings UI available** – Given an organisation with access to `/dashboard/settings/integrations`, when I enter or update Google Maps and CollectAPI keys in the form and save, then an `OrganizationIntegrationSettings` record is created or updated with the keys and timestamps.

2. **Key resolution with fallback** – Given an organisation with stored integration keys, when the backend resolves integration keys for that organisation, then it first checks the settings record and only falls back to environment variables when no org-specific key is present.

3. **Key masking in responses** – Given stored API keys in the database, when the keys are retrieved via API or displayed in UI, then only the last 4 characters are shown, the rest is masked (e.g., `****...XXXX`).

4. **Role-based access control** – Given a user without admin/owner role, when they attempt to access `/dashboard/settings/integrations` or the API endpoints, then they receive a 403 Forbidden response.

5. **Environment fallback** – Given no org-specific key stored and an environment variable configured, when the key resolution service is called, then it returns the environment variable value.

6. **Missing key handling** – Given no org-specific key and no environment variable, when the key resolution service is called, then it returns null indicating missing configuration.

## Tasks / Subtasks

- [ ] **Task 1: Create key resolution utilities** (AC: 2, 5, 6)

  - [ ] Create `packages/api/src/lib/integration-keys.ts` with:
    - `resolveApiKey(organizationId, keyType)` – resolve with org → env fallback
    - `maskApiKey(key)` – mask showing only last 4 chars
    - `GOOGLE_MAPS_ENV_KEY`, `COLLECT_API_ENV_KEY` constants
  - [ ] Add comprehensive JSDoc documentation

- [ ] **Task 2: Create unit tests for key utilities** (AC: 2, 3, 5, 6)

  - [ ] Create `packages/api/src/lib/__tests__/integration-keys.test.ts`
  - [ ] Test `resolveApiKey` with org key present
  - [ ] Test `resolveApiKey` with only env var
  - [ ] Test `resolveApiKey` with neither (returns null)
  - [ ] Test `maskApiKey` with various inputs

- [ ] **Task 3: Create API routes for integration settings** (AC: 1, 3, 4)

  - [ ] Create `packages/api/src/routes/vtc/integrations.ts` with:
    - `GET /api/vtc/settings/integrations` – get masked keys
    - `PUT /api/vtc/settings/integrations` – create/update keys
    - `DELETE /api/vtc/settings/integrations/:keyType` – remove key
  - [ ] Add role-based access control (admin/owner only)
  - [ ] Register routes in `router.ts`

- [ ] **Task 4: Create integration tests for API** (AC: 1, 3, 4)

  - [ ] Create `packages/api/src/routes/vtc/__tests__/integrations.test.ts`
  - [ ] Test CRUD operations
  - [ ] Test role-based access (403 for non-admin)
  - [ ] Test key masking in responses

- [ ] **Task 5: Create Settings UI page** (AC: 1, 3, 4)

  - [ ] Create `apps/web/app/dashboard/settings/integrations/page.tsx`
  - [ ] Form with Google Maps and CollectAPI key inputs
  - [ ] Show masked current keys
  - [ ] Save and delete functionality
  - [ ] Role-based access check

- [ ] **Task 6: Playwright UI tests** (AC: 1, 4)
  - [ ] Test form submission and key update
  - [ ] Test key masking display
  - [ ] Test access denied for non-admin

## Dev Notes

### PRD References

- **FR37**: Admin configuration area for zones, routes, grids, forfaits, margins and multipliers
- **FR38**: Configure vehicle categories, cost parameters and regulatory rules
- **FR41**: Maintain cache of fuel prices from external provider (requires CollectAPI key)

### Tech Spec Strategy (from tech-spec.md)

> **API Key Configuration**
>
> - Introduce a settings model `OrganizationIntegrationSettings`
> - `organizationId` (FK to Organization)
> - `googleMapsApiKey` (string, encrypted at rest)
> - `collectApiKey` (string, encrypted at rest)
> - Resolution: org-specific first, env fallback
> - Admin-only UI under `/admin/integrations`

### Key Implementation Decisions

1. **Model exists**: `OrganizationIntegrationSettings` already in schema.prisma
2. **Masking format**: `****...XXXX` (last 4 chars visible)
3. **Environment variables**: `GOOGLE_MAPS_API_KEY`, `COLLECT_API_KEY`
4. **Role check**: Use existing `requireOrganization` middleware with role validation
5. **MVP encryption**: Simple obfuscation acceptable; full encryption later

### Security Considerations

- Keys never logged in plain text
- API responses always mask keys
- Only admin/owner roles can access
- Keys stored as-is in DB for MVP (encryption enhancement later)

### File Structure

```
packages/api/src/lib/
├── integration-keys.ts              # NEW: Key utilities
├── __tests__/
│   └── integration-keys.test.ts     # NEW: Unit tests

packages/api/src/routes/vtc/
├── integrations.ts                  # NEW: API routes
├── router.ts                        # MODIFIED: Add integrations
├── __tests__/
│   └── integrations.test.ts         # NEW: Integration tests

apps/web/app/dashboard/settings/
├── integrations/
│   └── page.tsx                     # NEW: Settings UI
```

### Testing Strategy

1. **Unit tests (Vitest)**: Test key resolution and masking functions
2. **Integration tests (curl + DB)**: Test API endpoints, verify DB state
3. **Playwright MCP**: Test UI form and access control

## Dev Agent Record

### Context Reference

- docs/sprint-artifacts/1-5-integration-settings-storage.context.xml

### Agent Model Used

Cascade BMAD Dev Agent

### Debug Log References

(To be filled during implementation)

### Completion Notes List

(To be filled upon completion)

### File List

(To be filled upon completion)
