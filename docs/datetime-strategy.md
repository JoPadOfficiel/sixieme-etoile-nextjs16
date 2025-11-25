# Europe/Paris Business Time Strategy

**Author:** BMAD Dev Agent  
**Date:** 2025-11-25  
**Related Story:** 1.4 - Implement Europe/Paris Business Time Strategy  
**Related FR:** FR40

---

## Overview

The VTC ERP treats all DateTime values as **naive Europe/Paris business times**. This means:

- **No timezone conversion** is performed when storing or retrieving values
- The time entered by the operator is the time stored and displayed
- All users are assumed to operate in the Europe/Paris timezone

This strategy avoids the complexity of multi-timezone logic while matching business expectations for a France-only VTC operator.

---

## Why Europe/Paris Only?

1. **Business Context**: The VTC ERP is designed for French operators. All pickups, dropoffs, and missions occur in France.
2. **Regulatory Compliance**: RSE (driver rest) regulations are based on French labor law, which uses Europe/Paris time.
3. **Simplicity**: Avoiding timezone conversions eliminates a major source of bugs and confusion.
4. **User Expectation**: When a dispatcher enters "14:30", they expect to see "14:30" everywhere in the system.

---

## How It Works

### Data Flow

```
UI Input (14:30) → API Request (ISO: 2025-06-15T14:30:00) → Prisma DateTime → PostgreSQL timestamp
                                                                                    ↓
UI Display (14:30) ← API Response (ISO: 2025-06-15T14:30:00) ← Prisma DateTime ← PostgreSQL timestamp
```

### Key Points

1. **Frontend**: Sends datetime as ISO 8601 string without timezone offset (`2025-06-15T14:30:00`)
2. **Backend**: Stores the value as-is in Prisma `DateTime` field
3. **Database**: PostgreSQL stores as `timestamp without time zone`
4. **Retrieval**: Value is returned exactly as stored, formatted for French locale

---

## Prisma Configuration

DateTime fields in the schema use `DateTime` type **without** `@db.Timestamptz`:

```prisma
model Quote {
  pickupAt    DateTime   // Naive datetime, no timezone
  validUntil  DateTime?
  // ...
}
```

**Do NOT use:**

```prisma
pickupAt DateTime @db.Timestamptz  // WRONG - adds timezone handling
```

---

## Utility Functions

The `packages/api/src/lib/datetime.ts` module provides utilities for consistent date/time handling:

### Formatting (Date → String)

```typescript
import {
  formatParisDateTime, // "15/06/2025 14:30"
  formatParisDate, // "15/06/2025"
  formatParisTime, // "14:30"
  formatParisDateLong, // "15 juin 2025"
  formatParisDateTimeLong, // "15 juin 2025 à 14:30"
} from "@repo/api/lib/datetime";

const date = new Date(2025, 5, 15, 14, 30);
formatParisDateTime(date); // "15/06/2025 14:30"
```

### Parsing (String → Date)

```typescript
import {
  parseParisDateTime, // "15/06/2025 14:30" → Date
  parseParisDate, // "15/06/2025" → Date
  parseParisTime, // "14:30" → Date (today's date)
} from "@repo/api/lib/datetime";

parseParisDateTime("15/06/2025 14:30"); // Date object
```

### ISO String Helpers

```typescript
import {
  toISOStringNoOffset, // Date → "2025-06-15T14:30:00"
  fromISOStringNoOffset, // "2025-06-15T14:30:00" → Date
} from "@repo/api/lib/datetime";
```

### Combining Date and Time

```typescript
import { combineDateAndTime } from "@repo/api/lib/datetime";

const date = new Date(2025, 5, 15);
const time = new Date(2025, 0, 1, 14, 30);
combineDateAndTime(date, time); // 2025-06-15 14:30
```

---

## Frontend Components

### Display Components

Use `DateTimeDisplay` variants for consistent formatting:

```tsx
import { formatParisDateTime } from "@repo/api/lib/datetime";

// In a component
<span>{formatParisDateTime(quote.pickupAt)}</span>;
```

### Input Components

Use shadcn/ui `Calendar` with French locale:

```tsx
import { Calendar } from "@ui/components/calendar";
import { fr } from "date-fns/locale";

<Calendar locale={fr} selected={date} onSelect={setDate} />;
```

---

## What Developers Must NOT Do

1. **Never use `@db.Timestamptz`** in Prisma schema for business times
2. **Never apply timezone conversion** when storing or retrieving dates
3. **Never use timezone libraries** (moment-timezone, date-fns-tz, luxon) for business times
4. **Never include timezone offset** in ISO strings sent to the API
5. **Never assume the server timezone** - always use explicit formatting

---

## Infrastructure Requirements

### Database Server

PostgreSQL should be configured with a consistent timezone. The actual timezone doesn't matter because we use `timestamp without time zone`, but consistency helps with debugging:

```sql
SET timezone = 'Europe/Paris';
-- or
SET timezone = 'UTC';
```

### Application Server

Node.js servers should have a consistent `TZ` environment variable:

```bash
TZ=Europe/Paris node server.js
# or
TZ=UTC node server.js
```

---

## Testing Strategy

### Unit Tests

Test formatting and parsing functions with known values:

```typescript
it("should format Date to French datetime format", () => {
  const date = new Date(2025, 5, 15, 14, 30);
  expect(formatParisDateTime(date)).toBe("15/06/2025 14:30");
});
```

### Integration Tests

Test round-trip through Prisma:

```typescript
it("should preserve datetime through Prisma round-trip", async () => {
  const pickupAt = new Date(2025, 5, 15, 14, 30);
  const quote = await prisma.quote.create({
    data: { pickupAt /* ... */ },
  });
  const retrieved = await prisma.quote.findUnique({ where: { id: quote.id } });
  expect(retrieved.pickupAt.getTime()).toBe(pickupAt.getTime());
});
```

### API Tests

Verify API stores exact values:

```bash
# Create quote with specific time
curl -X POST /api/vtc/quotes \
  -d '{"pickupAt": "2025-06-15T14:30:00", ...}'

# Verify in database
SELECT pickup_at FROM "Quote" WHERE id = '...';
-- Should show: 2025-06-15 14:30:00
```

---

## Related Files

- `packages/api/src/lib/datetime.ts` - DateTime utilities
- `packages/api/src/lib/__tests__/datetime.test.ts` - Unit tests
- `packages/api/src/lib/__tests__/datetime-prisma.test.ts` - Integration tests
- `packages/database/prisma/schema.prisma` - DateTime field definitions
- `docs/bmad/tech-spec.md` - Technical specification (Date & Time Strategy section)
- `docs/bmad/prd.md` - FR40 requirement

---

## Related FRs

- **FR40**: The system shall store operational timestamps as business times in the Europe/Paris timezone and present the exact same values in the UI, without any timezone conversion logic.
- **FR17-FR24**: Pickup times for quotes and missions
- **FR25-FR30**: RSE counters and driver time tracking
- **FR31-FR33**: Quote lifecycle timestamps
- **FR47-FR52**: Compliance calculations based on time
