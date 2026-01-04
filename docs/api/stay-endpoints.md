# API Documentation: STAY Trip Type Endpoints

**Version:** 1.0  
**Date:** 2026-01-04  
**Base URL:** `https://api.sixieme-etoile.fr/api/vtc`

---

## Overview

The STAY endpoints allow you to create, manage, and invoice multi-day travel packages. A STAY quote contains multiple services (transfers, excursions, availability) spread across multiple days.

### Authentication

All endpoints require authentication via session token:

```bash
Cookie: better-auth.session_token=<your-session-token>
```

---

## Endpoints

### 1. Create STAY Quote

Create a new multi-day package quote.

**Endpoint:** `POST /quotes/stay`

**Request Body:**

```json
{
  "organizationId": "sixieme-etoile-vtc",
  "contactId": "contact-uuid",
  "vehicleCategoryId": "category-uuid",
  "notes": "Multi-day package for corporate event",
  "stayDays": [
    {
      "date": "2026-01-10",
      "services": [
        {
          "type": "TRANSFER",
          "pickupAddress": "CDG Airport, Terminal 2E",
          "pickupLat": 49.0097,
          "pickupLng": 2.5479,
          "dropoffAddress": "Hotel Le Bristol, Paris",
          "dropoffLat": 48.8708,
          "dropoffLng": 2.3161,
          "pickupTime": "10:00",
          "passengers": 3,
          "luggage": 4
        }
      ]
    },
    {
      "date": "2026-01-11",
      "services": [
        {
          "type": "EXCURSION",
          "pickupAddress": "Hotel Le Bristol, Paris",
          "pickupLat": 48.8708,
          "pickupLng": 2.3161,
          "waypoints": [
            {
              "address": "Château de Versailles",
              "lat": 48.8049,
              "lng": 2.1204,
              "stopDuration": 180
            }
          ],
          "dropoffAddress": "Hotel Le Bristol, Paris",
          "dropoffLat": 48.8708,
          "dropoffLng": 2.3161,
          "pickupTime": "09:00",
          "estimatedDuration": 480,
          "passengers": 3
        }
      ]
    },
    {
      "date": "2026-01-12",
      "services": [
        {
          "type": "TRANSFER",
          "pickupAddress": "Hotel Le Bristol, Paris",
          "pickupLat": 48.8708,
          "pickupLng": 2.3161,
          "dropoffAddress": "CDG Airport, Terminal 2E",
          "dropoffLat": 49.0097,
          "dropoffLng": 2.5479,
          "pickupTime": "14:00",
          "passengers": 3,
          "luggage": 4
        }
      ]
    }
  ]
}
```

**Response:** `201 Created`

```json
{
  "id": "stay-quote-uuid",
  "organizationId": "sixieme-etoile-vtc",
  "contactId": "contact-uuid",
  "vehicleCategoryId": "category-uuid",
  "tripType": "STAY",
  "status": "DRAFT",
  "totalCost": 1250.0,
  "totalInternalCost": 890.0,
  "margin": 360.0,
  "marginPercentage": 28.8,
  "notes": "Multi-day package for corporate event",
  "stayDays": [
    {
      "id": "day-1-uuid",
      "date": "2026-01-10",
      "dayNumber": 1,
      "services": [
        {
          "id": "service-1-uuid",
          "type": "TRANSFER",
          "pickupAddress": "CDG Airport, Terminal 2E",
          "dropoffAddress": "Hotel Le Bristol, Paris",
          "pickupTime": "10:00",
          "estimatedDuration": 45,
          "distance": 35.2,
          "cost": 120.0,
          "internalCost": 85.0
        }
      ],
      "hotelRequired": false,
      "mealCount": 0,
      "driverCount": 1,
      "dayCost": 120.0
    },
    {
      "id": "day-2-uuid",
      "date": "2026-01-11",
      "dayNumber": 2,
      "services": [
        {
          "id": "service-2-uuid",
          "type": "EXCURSION",
          "pickupAddress": "Hotel Le Bristol, Paris",
          "dropoffAddress": "Hotel Le Bristol, Paris",
          "pickupTime": "09:00",
          "estimatedDuration": 480,
          "distance": 85.0,
          "cost": 650.0,
          "internalCost": 480.0,
          "waypoints": [
            {
              "address": "Château de Versailles",
              "stopDuration": 180
            }
          ]
        }
      ],
      "hotelRequired": true,
      "mealCount": 2,
      "driverCount": 1,
      "dayCost": 820.0,
      "hotelCost": 85.0,
      "mealCost": 50.0,
      "staffingCost": 135.0
    },
    {
      "id": "day-3-uuid",
      "date": "2026-01-12",
      "dayNumber": 3,
      "services": [
        {
          "id": "service-3-uuid",
          "type": "TRANSFER",
          "pickupAddress": "Hotel Le Bristol, Paris",
          "dropoffAddress": "CDG Airport, Terminal 2E",
          "pickupTime": "14:00",
          "estimatedDuration": 45,
          "distance": 35.2,
          "cost": 120.0,
          "internalCost": 85.0
        }
      ],
      "hotelRequired": false,
      "mealCount": 0,
      "driverCount": 1,
      "dayCost": 120.0
    }
  ],
  "totalStaffingCost": 135.0,
  "totalHotelCost": 85.0,
  "totalMealCost": 50.0,
  "createdAt": "2026-01-04T15:30:00Z",
  "updatedAt": "2026-01-04T15:30:00Z"
}
```

**Error Responses:**

- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Missing or invalid authentication
- `404 Not Found`: Contact or vehicle category not found
- `422 Unprocessable Entity`: Business logic validation failed

---

### 2. Get STAY Quote

Retrieve a STAY quote by ID.

**Endpoint:** `GET /quotes/stay/:id`

**Response:** `200 OK`

```json
{
  "id": "stay-quote-uuid",
  "organizationId": "sixieme-etoile-vtc",
  "contactId": "contact-uuid",
  "contact": {
    "id": "contact-uuid",
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "+33612345678"
  },
  "vehicleCategoryId": "category-uuid",
  "vehicleCategory": {
    "id": "category-uuid",
    "name": "Berline Premium",
    "capacity": 3
  },
  "tripType": "STAY",
  "status": "DRAFT",
  "totalCost": 1250.00,
  "totalInternalCost": 890.00,
  "stayDays": [...],
  "createdAt": "2026-01-04T15:30:00Z",
  "updatedAt": "2026-01-04T15:30:00Z"
}
```

---

### 3. Update STAY Quote

Update an existing STAY quote (only in DRAFT status).

**Endpoint:** `PUT /quotes/stay/:id`

**Request Body:**

```json
{
  "notes": "Updated notes",
  "stayDays": [
    {
      "id": "day-1-uuid",
      "date": "2026-01-10",
      "services": [...]
    }
  ]
}
```

**Response:** `200 OK`

```json
{
  "id": "stay-quote-uuid",
  "status": "DRAFT",
  "totalCost": 1300.0,
  "updatedAt": "2026-01-04T16:00:00Z"
}
```

---

### 4. Add Service to Day

Add a new service to a specific day in the STAY.

**Endpoint:** `POST /quotes/stay/:id/days/:dayId/services`

**Request Body:**

```json
{
  "type": "DISPO",
  "pickupAddress": "Hotel Le Bristol, Paris",
  "pickupLat": 48.8708,
  "pickupLng": 2.3161,
  "pickupTime": "14:00",
  "duration": 240,
  "zone": "PARIS_0",
  "passengers": 3
}
```

**Response:** `201 Created`

```json
{
  "id": "service-new-uuid",
  "type": "DISPO",
  "pickupAddress": "Hotel Le Bristol, Paris",
  "pickupTime": "14:00",
  "duration": 240,
  "cost": 180.0,
  "internalCost": 140.0
}
```

---

### 5. Delete Service from Day

Remove a service from a specific day.

**Endpoint:** `DELETE /quotes/stay/:id/days/:dayId/services/:serviceId`

**Response:** `204 No Content`

---

### 6. Calculate STAY Pricing

Get pricing calculation for a STAY without creating a quote.

**Endpoint:** `POST /quotes/stay/calculate`

**Request Body:**

```json
{
  "organizationId": "sixieme-etoile-vtc",
  "vehicleCategoryId": "category-uuid",
  "stayDays": [...]
}
```

**Response:** `200 OK`

```json
{
  "totalCost": 1250.0,
  "totalInternalCost": 890.0,
  "margin": 360.0,
  "marginPercentage": 28.8,
  "breakdown": {
    "serviceCost": 890.0,
    "staffingCost": 135.0,
    "hotelCost": 85.0,
    "mealCost": 50.0,
    "tollsCost": 45.0
  },
  "dayBreakdown": [
    {
      "dayNumber": 1,
      "date": "2026-01-10",
      "cost": 120.0
    },
    {
      "dayNumber": 2,
      "date": "2026-01-11",
      "cost": 820.0
    },
    {
      "dayNumber": 3,
      "date": "2026-01-12",
      "cost": 120.0
    }
  ]
}
```

---

### 7. Send STAY Quote

Send the STAY quote to the client.

**Endpoint:** `POST /quotes/stay/:id/send`

**Request Body:**

```json
{
  "sendEmail": true,
  "emailTemplate": "stay-quote-template",
  "customMessage": "Please find your multi-day package quote attached."
}
```

**Response:** `200 OK`

```json
{
  "id": "stay-quote-uuid",
  "status": "SENT",
  "sentAt": "2026-01-04T16:30:00Z",
  "emailSent": true
}
```

---

### 8. Convert STAY to Invoice

Convert an accepted STAY quote to an invoice.

**Endpoint:** `POST /quotes/stay/:id/convert-to-invoice`

**Response:** `201 Created`

```json
{
  "invoiceId": "invoice-uuid",
  "quoteId": "stay-quote-uuid",
  "totalAmount": 1250.0,
  "lines": [
    {
      "lineNumber": 1,
      "description": "Transfer - Day 1 - CDG → Hotel",
      "date": "2026-01-10",
      "amount": 120.0,
      "vatRate": 10.0
    },
    {
      "lineNumber": 2,
      "description": "Excursion - Day 2 - Versailles (8h)",
      "date": "2026-01-11",
      "amount": 650.0,
      "vatRate": 10.0
    },
    {
      "lineNumber": 3,
      "description": "Hotel - Day 2 - Driver overnight",
      "date": "2026-01-11",
      "amount": 85.0,
      "vatRate": 10.0
    },
    {
      "lineNumber": 4,
      "description": "Meals - Day 2 - Lunch + Dinner",
      "date": "2026-01-11",
      "amount": 50.0,
      "vatRate": 10.0
    },
    {
      "lineNumber": 5,
      "description": "Transfer - Day 3 - Hotel → CDG",
      "date": "2026-01-12",
      "amount": 120.0,
      "vatRate": 10.0
    }
  ],
  "createdAt": "2026-01-04T17:00:00Z"
}
```

---

## Data Models

### StayQuote

```typescript
interface StayQuote {
  id: string;
  organizationId: string;
  contactId: string;
  vehicleCategoryId: string;
  tripType: "STAY";
  status: QuoteStatus;
  totalCost: number;
  totalInternalCost: number;
  margin: number;
  marginPercentage: number;
  notes?: string;
  stayDays: StayDay[];
  totalStaffingCost: number;
  totalHotelCost: number;
  totalMealCost: number;
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
}
```

### StayDay

```typescript
interface StayDay {
  id: string;
  quoteId: string;
  date: string;
  dayNumber: number;
  services: StayService[];
  hotelRequired: boolean;
  mealCount: number;
  driverCount: number;
  dayCost: number;
  hotelCost?: number;
  mealCost?: number;
  staffingCost?: number;
}
```

### StayService

```typescript
interface StayService {
  id: string;
  dayId: string;
  type: "TRANSFER" | "EXCURSION" | "DISPO";
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  dropoffAddress?: string;
  dropoffLat?: number;
  dropoffLng?: number;
  pickupTime: string;
  estimatedDuration: number;
  distance?: number;
  cost: number;
  internalCost: number;
  waypoints?: Waypoint[];
  zone?: string;
  duration?: number;
  passengers?: number;
  luggage?: number;
}
```

### Waypoint

```typescript
interface Waypoint {
  address: string;
  lat: number;
  lng: number;
  stopDuration: number;
}
```

---

## Code Examples

### JavaScript/TypeScript

```typescript
// Create STAY quote
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

const stayQuote = await response.json();
console.log("STAY Quote created:", stayQuote.id);
```

### Python

```python
import requests

url = "https://api.sixieme-etoile.fr/api/vtc/quotes/stay"
headers = {
    "Content-Type": "application/json",
    "Cookie": "better-auth.session_token=your-token"
}
data = {
    "organizationId": "sixieme-etoile-vtc",
    "contactId": "contact-uuid",
    "vehicleCategoryId": "category-uuid",
    "stayDays": [
        {
            "date": "2026-01-10",
            "services": [
                {
                    "type": "TRANSFER",
                    "pickupAddress": "CDG Airport",
                    "pickupLat": 49.0097,
                    "pickupLng": 2.5479,
                    "dropoffAddress": "Hotel Paris",
                    "dropoffLat": 48.8708,
                    "dropoffLng": 2.3161,
                    "pickupTime": "10:00",
                    "passengers": 3
                }
            ]
        }
    ]
}

response = requests.post(url, json=data, headers=headers)
stay_quote = response.json()
print(f"STAY Quote created: {stay_quote['id']}")
```

### cURL

```bash
curl -X POST https://api.sixieme-etoile.fr/api/vtc/quotes/stay \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session_token=your-token" \
  -d '{
    "organizationId": "sixieme-etoile-vtc",
    "contactId": "contact-uuid",
    "vehicleCategoryId": "category-uuid",
    "stayDays": [
      {
        "date": "2026-01-10",
        "services": [
          {
            "type": "TRANSFER",
            "pickupAddress": "CDG Airport",
            "pickupLat": 49.0097,
            "pickupLng": 2.5479,
            "dropoffAddress": "Hotel Paris",
            "dropoffLat": 48.8708,
            "dropoffLng": 2.3161,
            "pickupTime": "10:00",
            "passengers": 3
          }
        ]
      }
    ]
  }'
```

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid stay day configuration",
    "details": [
      {
        "field": "stayDays[0].services",
        "message": "At least one service required per day"
      }
    ]
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR`: Request validation failed
- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Insufficient permissions
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource state conflict
- `INTERNAL_ERROR`: Server error

---

## Rate Limiting

- **Rate limit**: 100 requests per minute per API key
- **Headers**:
  - `X-RateLimit-Limit`: Maximum requests per window
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Time when limit resets (Unix timestamp)

---

## Changelog

### Version 1.0 (2026-01-04)

- Initial release of STAY endpoints
- Support for multi-day packages
- Automatic staffing cost calculation
- Invoice line-item breakdown

---

**Support:** api-support@sixieme-etoile.fr  
**Documentation:** https://docs.sixieme-etoile.fr
