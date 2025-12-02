# Story 16.1 – Étendre le Schéma Quote pour les Types de Trajets

**Epic:** 16 - Refactorisation du Système de Devis par Type de Trajet  
**Status:** done
**Priority:** High  
**Estimated Effort:** 3 Story Points  
**Created:** 2025-12-02

---

## User Story

**As a** backend engineer,  
**I want** the Quote model to have fields specific to each trip type,  
**So that** the system can store all necessary data for transfers, excursions, dispos, and off-grid trips.

---

## Problem Statement

Le modèle Quote actuel dans Prisma n'a pas les champs nécessaires pour stocker les données spécifiques à chaque type de trajet. Tous les types utilisent les mêmes champs (pickupAddress, dropoffAddress obligatoire, pickupAt), ce qui empêche de:

- Créer des transferts aller-retour
- Stocker les arrêts intermédiaires pour les excursions
- Définir la durée et le km max pour les mises à disposition
- Créer des trajets off-grid sans destination obligatoire

---

## Acceptance Criteria

### AC1 - Transfer Fields

**Given** a quote with `tripType = TRANSFER`  
**When** I create or update the quote  
**Then** I can set `isRoundTrip: Boolean` to indicate if it's a round-trip transfer  
**And** if `isRoundTrip = true`, the pricing engine doubles the base price

### AC2 - Excursion Fields

**Given** a quote with `tripType = EXCURSION`  
**When** I create or update the quote  
**Then** I can set:

- `stops: Json` - Array of intermediate stops with addresses and coordinates
- `returnDate: DateTime` - Optional return date different from pickup date

**And** the pricing engine calculates based on total distance including all stops

### AC3 - Dispo Fields

**Given** a quote with `tripType = DISPO`  
**When** I create or update the quote  
**Then** I can set:

- `durationHours: Decimal` - Duration of the mise à disposition
- `maxKilometers: Decimal` - Maximum kilometers included (calculated dynamically)

**And** `dropoffAddress` is optional (can be null)  
**And** the pricing engine uses hourly rate × duration + overage if applicable

### AC4 - Off-grid Fields

**Given** a quote with `tripType = OFF_GRID`  
**When** I create or update the quote  
**Then** `dropoffAddress` is optional  
**And** `notes` is required to describe the trip

### AC5 - Migration Safety

**Given** existing quotes in the database  
**When** the migration runs  
**Then** all existing quotes have default values for new fields  
**And** no data is lost

---

## Technical Implementation

### 1. Schema Changes (schema.prisma)

```prisma
model Quote {
  // ... existing fields ...

  // Story 16.1: Trip type specific fields
  isRoundTrip     Boolean   @default(false)  // For TRANSFER
  stops           Json?                       // For EXCURSION - array of stops
  returnDate      DateTime?                   // For EXCURSION
  durationHours   Decimal?  @db.Decimal(5, 2) // For DISPO
  maxKilometers   Decimal?  @db.Decimal(8, 2) // For DISPO (calculated)

  // Make dropoffAddress optional for DISPO and OFF_GRID
  dropoffAddress   String?  // Changed from String to String?
}
```

### 2. Stops JSON Structure

```typescript
interface QuoteStop {
  address: string;
  latitude: number;
  longitude: number;
  order: number;
}

// Example:
const stops: QuoteStop[] = [
  {
    address: "Château de Versailles, Versailles",
    latitude: 48.8049,
    longitude: 2.1204,
    order: 1,
  },
  {
    address: "Giverny, France",
    latitude: 49.0758,
    longitude: 1.5339,
    order: 2,
  },
];
```

### 3. API Validation Schema

```typescript
const createQuoteSchema = z
  .object({
    tripType: z.enum(["TRANSFER", "EXCURSION", "DISPO", "OFF_GRID"]),

    // Common fields
    contactId: z.string(),
    pickupAddress: z.string(),
    pickupAt: z.string().datetime(),
    vehicleCategoryId: z.string(),

    // dropoffAddress: required except for DISPO and OFF_GRID
    dropoffAddress: z.string().optional(),

    // Transfer specific
    isRoundTrip: z.boolean().optional().default(false),

    // Excursion specific
    stops: z
      .array(
        z.object({
          address: z.string(),
          latitude: z.number(),
          longitude: z.number(),
          order: z.number(),
        })
      )
      .optional(),
    returnDate: z.string().datetime().optional(),

    // Dispo specific
    durationHours: z.number().positive().optional(),
    maxKilometers: z.number().positive().optional(),

    // Notes: required for OFF_GRID
    notes: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // dropoffAddress required for TRANSFER and EXCURSION
    if (
      (data.tripType === "TRANSFER" || data.tripType === "EXCURSION") &&
      !data.dropoffAddress
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Dropoff address is required for transfers and excursions",
        path: ["dropoffAddress"],
      });
    }

    // notes required for OFF_GRID
    if (
      data.tripType === "OFF_GRID" &&
      (!data.notes || data.notes.trim().length === 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Notes are required for off-grid trips",
        path: ["notes"],
      });
    }

    // durationHours required for DISPO
    if (
      data.tripType === "DISPO" &&
      (data.durationHours == null || data.durationHours <= 0)
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Duration is required for mise à disposition",
        path: ["durationHours"],
      });
    }
  });
```

---

## Files to Modify

| File                                                          | Changes                         |
| ------------------------------------------------------------- | ------------------------------- |
| `packages/database/prisma/schema.prisma`                      | Add new fields to Quote model   |
| `packages/api/src/routes/vtc/quotes.ts`                       | Update validation schema        |
| `apps/web/modules/saas/quotes/types.ts`                       | Update CreateQuoteFormData type |
| `apps/web/modules/saas/quotes/hooks/usePricingCalculation.ts` | Pass new fields to API          |

---

## Migration Strategy

1. **Add new columns with defaults:**

   - `isRoundTrip` → `false`
   - `stops` → `null`
   - `returnDate` → `null`
   - `durationHours` → `null`
   - `maxKilometers` → `null`

2. **Make dropoffAddress nullable:**

   - All existing quotes have dropoffAddress, so no data loss
   - New DISPO/OFF_GRID quotes can have null dropoffAddress

3. **No data migration needed:**
   - Existing quotes keep their current values
   - New fields have sensible defaults

---

## Testing Checklist

### Unit Tests

- [ ] Create TRANSFER quote with `isRoundTrip = true`
- [ ] Create TRANSFER quote with `isRoundTrip = false` (default)
- [ ] Create EXCURSION quote with stops and returnDate
- [ ] Create DISPO quote with durationHours and maxKilometers
- [ ] Create DISPO quote without dropoffAddress
- [ ] Create OFF_GRID quote without dropoffAddress
- [ ] Validation: TRANSFER without dropoffAddress fails
- [ ] Validation: OFF_GRID without notes fails
- [ ] Validation: DISPO without durationHours fails

### Migration Tests

- [ ] Existing quotes have `isRoundTrip = false` after migration
- [ ] Existing quotes keep their dropoffAddress
- [ ] No data loss after migration

---

## Risks & Mitigations

| Risk                                                                        | Severity | Mitigation                                                         |
| --------------------------------------------------------------------------- | -------- | ------------------------------------------------------------------ |
| Changing dropoffAddress from String to String? could break existing queries | Medium   | Review all Prisma queries using dropoffAddress and add null checks |
| stops (Json) field could have validation issues                             | Low      | Use strict Zod schema to validate JSON structure                   |

---

## Definition of Done

- [x] Schema changes applied and migration created
- [x] API validation updated with conditional rules
- [x] TypeScript types updated
- [x] Unit tests passing
- [x] Migration tested on staging database
- [x] No regression in existing quote creation flow
- [x] Code reviewed and approved

---

## Related Stories

| Story                           | Relationship          |
| ------------------------------- | --------------------- |
| 16.2 - Formulaire Dynamique     | Blocked by this story |
| 16.6 - Calcul Prix Aller-Retour | Blocked by this story |
| 16.7 - Calcul Prix Excursion    | Blocked by this story |
| 16.8 - Calcul Prix Dispo        | Blocked by this story |
| 16.9 - Support Off-Grid         | Blocked by this story |
