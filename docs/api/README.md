# API Documentation - Sixième Étoile VTC

**Version:** 2.0.0  
**Last Updated:** 2026-01-04  
**Base URL:** `https://api.sixieme-etoile.fr/api/vtc`

---

## Overview

The Sixième Étoile VTC API provides programmatic access to all ERP features including quotes, missions, invoicing, and fleet management. This documentation covers all available endpoints with examples and best practices.

---

## Authentication

All API requests require authentication using session-based tokens.

### Session Token

Include the session token in the Cookie header:

```bash
Cookie: better-auth.session_token=<your-token>
```

### Obtaining a Token

1. **Via Web Login:**

   - Log in through the web interface
   - Extract token from browser cookies
   - Use in API requests

2. **Via API Login:**

   ```bash
   POST /api/auth/login
   Content-Type: application/json

   {
     "email": "user@example.com",
     "password": "your-password"
   }
   ```

### Token Expiration

- Tokens expire after 30 days of inactivity
- Refresh automatically on each request
- Monitor `expiresAt` field in responses

---

## Base URL & Versioning

**Production:** `https://api.sixieme-etoile.fr/api/vtc`  
**Staging:** `https://staging-api.sixieme-etoile.fr/api/vtc`

**Current Version:** v2.0.0 (Epic 22)

---

## Endpoint Categories

### Quotes

- [STAY Endpoints](stay-endpoints.md) - Multi-day package quotes
- Standard Quotes - Single trip quotes
- Quote Lifecycle - Status transitions, sending, accepting

### Pricing

- [Pricing Endpoints](pricing-endpoints.md) - Calculate prices
- Dynamic Pricing - Cost-based calculations
- Grid Pricing - Partner rate grids

### Missions & Dispatch

- Mission Management - CRUD operations
- Driver Assignment - Assign drivers to missions
- [Subcontracting](subcontracting-endpoints.md) - Outsource missions

### Invoicing

- Invoice Generation - Convert quotes to invoices
- Invoice Management - CRUD operations
- Payment Tracking - Payment status and history

### Fleet Management

- Vehicles - Vehicle CRUD
- Drivers - Driver management
- Operating Bases - Base locations

### CRM

- Contacts - Client and partner management
- Organizations - Multi-tenant organization data

---

## Quick Start

### Example: Create a STAY Quote

```javascript
const response = await fetch(
  "https://api.sixieme-etoile.fr/api/vtc/quotes/stay",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: "better-auth.session_token=your-token",
    },
    body: JSON.stringify({
      organizationId: "sixieme-etoile-vtc",
      contactId: "contact-uuid",
      vehicleCategoryId: "category-uuid",
      stayDays: [
        {
          date: "2026-01-10",
          services: [
            {
              type: "TRANSFER",
              pickupAddress: "CDG Airport",
              pickupLat: 49.0097,
              pickupLng: 2.5479,
              dropoffAddress: "Hotel Paris",
              dropoffLat: 48.8708,
              dropoffLng: 2.3161,
              pickupTime: "10:00",
              passengers: 3,
            },
          ],
        },
      ],
    }),
  }
);

const quote = await response.json();
console.log("Quote created:", quote.id);
```

### Example: Calculate Pricing

```bash
curl -X POST https://api.sixieme-etoile.fr/api/vtc/pricing/calculate \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=your-token" \
  -d '{
    "organizationId": "sixieme-etoile-vtc",
    "vehicleCategoryId": "category-uuid",
    "tripType": "TRANSFER",
    "pickupLat": 48.8566,
    "pickupLng": 2.3522,
    "dropoffLat": 49.0097,
    "dropoffLng": 2.5479,
    "pickupTime": "2026-01-10T10:00:00Z"
  }'
```

---

## Common Patterns

### Pagination

List endpoints support pagination:

```bash
GET /api/vtc/quotes?page=1&limit=20
```

**Response:**

```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "pages": 8
  }
}
```

### Filtering

Use query parameters for filtering:

```bash
GET /api/vtc/quotes?status=SENT&contactId=contact-uuid&from=2026-01-01
```

### Sorting

Sort results using `sortBy` and `order`:

```bash
GET /api/vtc/quotes?sortBy=createdAt&order=desc
```

### Including Related Data

Use `include` parameter:

```bash
GET /api/vtc/quotes/:id?include=contact,vehicleCategory,tripAnalysis
```

---

## Response Format

### Success Response

```json
{
  "id": "resource-uuid",
  "field1": "value1",
  "field2": "value2",
  "createdAt": "2026-01-04T15:30:00Z",
  "updatedAt": "2026-01-04T15:30:00Z"
}
```

### Error Response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request data",
    "details": [
      {
        "field": "pickupAddress",
        "message": "Address is required"
      }
    ]
  }
}
```

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `422 Unprocessable Entity` - Validation failed
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

---

## Rate Limiting

**Limits:**

- 100 requests per minute per API key
- 1000 requests per hour per API key

**Headers:**

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1704380400
```

**Exceeded:**

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "retryAfter": 60
  }
}
```

---

## Webhooks

Subscribe to events for real-time updates:

### Available Events

- `quote.created`
- `quote.sent`
- `quote.accepted`
- `quote.rejected`
- `mission.assigned`
- `mission.completed`
- `invoice.created`
- `invoice.paid`

### Configuration

```bash
POST /api/vtc/webhooks
Content-Type: application/json

{
  "url": "https://your-domain.com/webhook",
  "events": ["quote.accepted", "mission.completed"],
  "secret": "your-webhook-secret"
}
```

### Webhook Payload

```json
{
  "event": "quote.accepted",
  "timestamp": "2026-01-04T15:30:00Z",
  "data": {
    "quoteId": "quote-uuid",
    "contactId": "contact-uuid",
    "totalCost": 1250.0
  },
  "signature": "sha256-signature"
}
```

---

## SDKs & Libraries

### Official SDKs

**JavaScript/TypeScript:**

```bash
npm install @sixieme-etoile/vtc-sdk
```

```typescript
import { VTCClient } from '@sixieme-etoile/vtc-sdk';

const client = new VTCClient({
  baseUrl: 'https://api.sixieme-etoile.fr',
  sessionToken: 'your-token'
});

const quote = await client.quotes.stay.create({...});
```

**Python:**

```bash
pip install sixieme-etoile-vtc
```

```python
from sixieme_etoile import VTCClient

client = VTCClient(
    base_url='https://api.sixieme-etoile.fr',
    session_token='your-token'
)

quote = client.quotes.stay.create(...)
```

### Community SDKs

- PHP: `composer require sixieme-etoile/vtc-php`
- Ruby: `gem install sixieme_etoile_vtc`
- Go: `go get github.com/sixieme-etoile/vtc-go`

---

## Testing

### Sandbox Environment

**URL:** `https://sandbox-api.sixieme-etoile.fr/api/vtc`

**Features:**

- Separate database
- Test data included
- No real charges
- Reset daily at 00:00 UTC

### Test Data

**Test Organization:** `test-org`  
**Test Contact:** `test-contact-uuid`  
**Test Vehicle:** `test-vehicle-uuid`

### Test Cards (for payment testing)

- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Error: `4000 0000 0000 0341`

---

## Best Practices

### Error Handling

```javascript
try {
  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error.message);
  }

  return await response.json();
} catch (error) {
  console.error("API Error:", error);
  // Handle error appropriately
}
```

### Retry Logic

```javascript
async function fetchWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return await response.json();

      if (response.status === 429) {
        // Rate limited, wait and retry
        const retryAfter = response.headers.get("Retry-After") || 60;
        await sleep(retryAfter * 1000);
        continue;
      }

      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(1000 * Math.pow(2, i)); // Exponential backoff
    }
  }
}
```

### Caching

```javascript
// Cache vehicle categories (rarely change)
const cache = new Map();

async function getVehicleCategories() {
  if (cache.has("categories")) {
    return cache.get("categories");
  }

  const categories = await api.get("/vehicle-categories");
  cache.set("categories", categories);

  return categories;
}
```

### Batch Operations

```javascript
// Instead of multiple single requests
for (const quote of quotes) {
  await api.post("/quotes", quote); // ❌ Slow
}

// Use batch endpoint
await api.post("/quotes/batch", { quotes }); // ✅ Fast
```

---

## Security

### HTTPS Only

All API requests must use HTTPS. HTTP requests are rejected.

### Authentication

- Never expose session tokens in client-side code
- Rotate tokens regularly
- Use environment variables for tokens
- Implement token refresh logic

### Data Validation

- Validate all input data
- Sanitize user-provided content
- Use parameterized queries
- Implement rate limiting

### Audit Logging

All API requests are logged with:

- Timestamp
- User ID
- Organization ID
- Endpoint accessed
- Request/response data
- IP address

---

## Changelog

### Version 2.0.0 (2026-01-04) - Epic 22

**New Endpoints:**

- `/quotes/stay` - STAY trip type
- `/subcontractors` - Subcontractor management
- `/missions/subcontract` - Subcontracting workflow

**Enhanced Endpoints:**

- `/quotes` - Added staffing costs
- `/missions` - Added staffing summary
- `/pricing/calculate` - Segment-based round trip

**Breaking Changes:**

- None (backward compatible)

### Version 1.9.0 (2026-01-03) - Epic 21

**Enhanced Endpoints:**

- `/quotes` - Enhanced trip transparency
- `/pricing` - Detailed cost breakdown

---

## Support

### Documentation

- [STAY Endpoints](stay-endpoints.md)
- [Subcontracting Endpoints](subcontracting-endpoints.md)
- [Pricing Endpoints](pricing-endpoints.md)

### Contact

- **Email:** api-support@sixieme-etoile.fr
- **Slack:** #api-support (for partners)
- **Status Page:** status.sixieme-etoile.fr

### SLA

- **Uptime:** 99.9%
- **Response Time:** <200ms (p95)
- **Support Response:** <4 hours

---

## Resources

### Postman Collection

Download: [VTC API Postman Collection](https://api.sixieme-etoile.fr/postman/collection.json)

### OpenAPI Specification

Download: [OpenAPI 3.0 Spec](openapi.yaml)

### Code Examples

GitHub: [github.com/sixieme-etoile/api-examples](https://github.com/sixieme-etoile/api-examples)

---

**API Version:** 2.0.0  
**Documentation Version:** 2.0.0  
**Last Updated:** 2026-01-04
