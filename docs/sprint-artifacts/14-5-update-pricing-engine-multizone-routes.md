# Story 14.5: Update Pricing Engine for Multi-Zone Routes

**Status:** done  
**Epic:** 14 - Flexible Route Pricing System  
**Priority:** High  
**Estimate:** 8 SP  
**Created:** 2025-12-01

---

## Story

As a **system**,  
I want **the pricing engine to match trips against multi-zone routes**,  
so that **flexible pricing configurations are applied correctly**.

---

## Acceptance Criteria

### AC1: Multi-Zone Origin Matching

**Given** a trip from Zone A to Zone B  
**When** there exists a route with origin zones [A, C, D] and destination zone [B]  
**Then** the route matches and the fixed price is applied

### AC2: Multi-Zone Destination Matching

**Given** a trip from Zone A to Zone B  
**When** there exists a route with origin zone [A] and destination zones [B, E, F]  
**Then** the route matches and the fixed price is applied

### AC3: Address-Based Route Priority

**Given** a trip from a specific address within Zone A to Zone B  
**When** both an address-based route (matching the address) and a zone-based route exist  
**Then** the address-based route takes priority over zone-based routes

### AC4: Bidirectional Multi-Zone Routes

**Given** a bidirectional route with origin zones [A, B] and destination zones [C, D]  
**When** a trip goes from Zone C to Zone A  
**Then** the route matches in reverse direction

### AC5: Backward Compatibility

**Given** existing routes using legacy `fromZoneId`/`toZoneId` fields  
**When** the pricing engine processes a matching trip  
**Then** the route still matches correctly (backward compatible)

---

## Tasks / Subtasks

- [ ] **Task 1: Extend ZoneRouteAssignment Interface** (AC: 1, 2, 3, 5)

  - [ ] Add `originType` and `destinationType` fields (`"ZONES" | "ADDRESS"`)
  - [ ] Add `originZones` array with zone data
  - [ ] Add `destinationZones` array with zone data
  - [ ] Add address fields (`originPlaceId`, `originAddress`, `originLat`, `originLng`, `destPlaceId`, `destAddress`, `destLat`, `destLng`)
  - [ ] Make `fromZoneId`/`toZoneId` nullable for backward compatibility

- [ ] **Task 2: Update loadContactWithContract** (AC: 1, 2, 3, 5)

  - [ ] Modify Prisma include to fetch `originZones` with zone relation
  - [ ] Modify Prisma include to fetch `destinationZones` with zone relation
  - [ ] Transform fetched data to extended `ZoneRouteAssignment` format
  - [ ] Handle legacy routes (populate from `fromZone`/`toZone` if multi-zone empty)

- [ ] **Task 3: Implement Multi-Zone Matching Logic** (AC: 1, 2, 4)

  - [ ] Create helper function `isZoneInOriginZones(zoneId, route)`
  - [ ] Create helper function `isZoneInDestinationZones(zoneId, route)`
  - [ ] Update `matchZoneRouteWithDetails` to check multi-zone arrays
  - [ ] Handle bidirectional matching with multi-zones (forward + reverse)
  - [ ] Update route name generation for multi-zone display

- [ ] **Task 4: Implement Address-Based Matching** (AC: 3)

  - [ ] Add `pickupPoint` and `dropoffPoint` parameters to `matchZoneRouteWithDetails`
  - [ ] Create helper function `isAddressMatch(point, route, type)` with proximity threshold
  - [ ] Implement priority order: ADDRESS > ZONES > Legacy
  - [ ] Add `ADDRESS_MATCH` rejection reason for transparency

- [ ] **Task 5: Update Matching Priority Order** (AC: 3, 5)

  - [ ] Sort routes by type priority before matching
  - [ ] First pass: ADDRESS origin + ADDRESS destination
  - [ ] Second pass: ADDRESS origin + ZONES destination
  - [ ] Third pass: ZONES origin + ADDRESS destination
  - [ ] Fourth pass: ZONES origin + ZONES destination
  - [ ] Fifth pass: Legacy `fromZoneId`/`toZoneId`

- [ ] **Task 6: Unit Tests (Vitest)** (AC: 1, 2, 3, 4, 5)

  - [ ] Test multi-zone origin matching
  - [ ] Test multi-zone destination matching
  - [ ] Test address-based route priority
  - [ ] Test bidirectional multi-zone routes
  - [ ] Test backward compatibility with legacy routes
  - [ ] Test no-match fallback to dynamic pricing

- [ ] **Task 7: Integration Tests (Playwright MCP + curl + DB)** (AC: 1, 2, 3, 4, 5)
  - [ ] E2E test: Create multi-zone route via UI, verify pricing calculation
  - [ ] API test: POST /api/vtc/pricing/calculate with multi-zone route
  - [ ] DB verification: Confirm route matching via postgres MCP

---

## Dev Notes

### Architecture Patterns

- **Pricing Engine**: Pure functions in `packages/api/src/services/pricing-engine.ts`
- **Engagement Rule**: Partner grid prices are contractually binding - never modify matched price
- **Fallback Logic**: If no grid match, fall back to dynamic pricing (Method 2)

### Key Files to Modify

| File                                                         | Changes                                                          |
| ------------------------------------------------------------ | ---------------------------------------------------------------- |
| `packages/api/src/services/pricing-engine.ts`                | Extend `ZoneRouteAssignment`, update `matchZoneRouteWithDetails` |
| `packages/api/src/routes/vtc/pricing-calculate.ts`           | Update `loadContactWithContract` Prisma query                    |
| `packages/api/src/services/__tests__/pricing-engine.test.ts` | Add multi-zone test cases                                        |

### Matching Priority Order

```
1. ADDRESS origin + ADDRESS destination (exact address match)
2. ADDRESS origin + ZONES destination
3. ZONES origin + ADDRESS destination
4. ZONES origin + ZONES destination (multi-zone)
5. Legacy fromZoneId/toZoneId (backward compatibility)
```

### Address Matching Logic

- Compare pickup/dropoff coordinates with route's `originLat/originLng` or `destLat/destLng`
- Use proximity threshold: **100 meters** radius for matching
- Exact `PlaceId` match takes highest priority

### Multi-Zone Matching Logic

```typescript
// For ZONES type routes:
const originMatch = route.originZones.some(
  (oz) => oz.zone.id === pickupZone.id
);
const destMatch = route.destinationZones.some(
  (dz) => dz.zone.id === dropoffZone.id
);

// For bidirectional, also check reverse:
const reverseOriginMatch = route.destinationZones.some(
  (dz) => dz.zone.id === pickupZone.id
);
const reverseDestMatch = route.originZones.some(
  (oz) => oz.zone.id === dropoffZone.id
);
```

### Testing Standards

- **Vitest**: Unit tests for pricing engine functions
- **Playwright MCP**: Browser automation for E2E tests
- **curl + DB**: API tests with database verification via `postgres_vtc_sixiemme_etoile` MCP

### Project Structure Notes

- Follows monorepo structure with `packages/api` for backend services
- Prisma schema in `packages/database/prisma/schema.prisma`
- Tests co-located in `__tests__` folders

### References

- [Source: docs/bmad/epics.md#Epic-14-Story-14.5]
- [Source: docs/sprint-artifacts/14-2-extend-zoneroute-schema-multizone-address.md]
- [Source: docs/bmad/prd.md#FR-Group-2-Pricing-Modes-Zone-Engine]
- [Source: packages/database/prisma/schema.prisma#ZoneRoute]

---

## Constraints

1. **Backward Compatibility**: Routes using legacy `fromZoneId`/`toZoneId` MUST continue to work
2. **Priority Order**: Address-based routes MUST take priority over zone-based routes
3. **Engagement Rule**: Partner grid prices are contractually binding - no modification allowed
4. **Direction Handling**: Bidirectional routes must match in both directions with multi-zone logic

---

## Test Cases

### TC1: Multi-Zone Origin Matching

```typescript
// Route: Paris zones [Paris-1, Paris-2, Paris-3] → CDG
// Trip: Paris-2 → CDG
// Expected: Match with fixed price
```

### TC2: Multi-Zone Destination Matching

```typescript
// Route: Paris → Airports [CDG, Orly, Le Bourget]
// Trip: Paris → Orly
// Expected: Match with fixed price
```

### TC3: Address Priority Over Zone

```typescript
// Route 1: ADDRESS (Ritz Hotel) → CDG, price: 95€
// Route 2: ZONES (Paris-1) → CDG, price: 80€
// Trip: Ritz Hotel coordinates → CDG
// Expected: Match Route 1 (95€), not Route 2
```

### TC4: Bidirectional Multi-Zone

```typescript
// Route: [Paris-1, Paris-2] ↔ [CDG, Orly], BIDIRECTIONAL
// Trip: CDG → Paris-1
// Expected: Match in reverse direction
```

### TC5: Legacy Route Backward Compatibility

```typescript
// Route: fromZoneId=Paris-1, toZoneId=CDG (legacy format)
// Trip: Paris-1 → CDG
// Expected: Match with fixed price
```

---

## Definition of Done

- [ ] All acceptance criteria validated
- [ ] Unit tests passing (Vitest)
- [ ] Integration tests passing (Playwright MCP)
- [ ] API tests passing (curl + DB verification)
- [ ] No regression on existing routes
- [ ] Code reviewed
- [ ] Documentation updated

---

## Dev Agent Record

### Context Reference

- `docs/sprint-artifacts/14-5-update-pricing-engine-multizone-routes.context.xml`

### Agent Model Used

Claude Sonnet 4 (Cascade)

### Debug Log References

<!-- Will be populated during development -->

### Completion Notes List

<!-- Will be populated after implementation -->

### File List

<!-- Will be populated after implementation -->
