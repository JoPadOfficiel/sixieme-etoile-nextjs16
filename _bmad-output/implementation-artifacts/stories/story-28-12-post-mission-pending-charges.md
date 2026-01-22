# Story 28.12: Post-Mission Pending Charges

**Epic:** Epic 28 – Order Management & Intelligent Spawning  
**Status:** done

## Code Review Record

### 2026-01-22 - Automated Review Fixes
- **Fixed Critical**: Migrated all financial calculations to `decimal.js` for precision (replaced `Math.round(x*100)/100`).
- **Fixed Medium**: Improved duplicate detection to check `sourceData.pendingChargeId` in addition to fuzzy description matching.
- **Fixed Medium**: Added unit tests for `addAllChargesToInvoice` batch method (2 new tests).
- **Fixed Low**: Synced sprint-status.yaml with story status.
- **Verification**: All 8 unit tests passing.
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Created:** 2026-01-20  
**Branch:** `feature/28-12-pending-charges`

---

## User Story

**As an** operator (finance),  
**I want** to be alerted when execution data reveals additional charges not yet invoiced,  
**So that** I never miss billing for real operational costs (waiting time, extra km, parking, etc.).

---

## Description

Cette story implémente un système de **détection automatique des frais en attente** en comparant les données d'exécution des missions (`Mission.executionData`) avec les lignes de facture existantes (`InvoiceLine`). Une alerte visuelle permet à l'opérateur finance de voir les écarts et d'ajouter les frais manquants en un clic.

### Objectif Business

> "Ne rien oublier de facturer"

Les chauffeurs peuvent enregistrer des frais supplémentaires pendant l'exécution (temps d'attente, péages imprévus, surcoûts parking). Ces frais doivent être remontés au service financier et facturés au client.

### Composants à Implémenter

1. **PendingChargesAlert** : Composant UI affichant les frais en attente détectés
   - Badge warning dans l'onglet Financial du Dossier Order
   - Liste des frais avec montants
   - Action "Add to Invoice" pour chaque frais

2. **Pending Charges Detection Service** : Logique de diff entre Mission et Invoice
   - Compare `executionData.additionalCharges` avec `InvoiceLine`
   - Détecte les nouveaux frais non encore facturés
   - Support multi-missions par Order

3. **Add to Invoice API** : Endpoint pour ajouter un frais à une facture existante
   - Crée une nouvelle `InvoiceLine` dans la facture active
   - Recalcule les totaux automatiquement

### Types de Frais Détectables

| Type | Champ executionData | Description |
|------|---------------------|-------------|
| Waiting Time | `waitingTimeMinutes` | Temps d'attente au-delà du forfait inclus |
| Extra KM | `actualDistanceKm` vs estimated | Dépassement kilométrique |
| Parking | `parkingCost` | Frais de parking non prévu |
| Tolls | `additionalTolls` | Péages supplémentaires |
| Other | `otherCharges[]` | Frais divers (nettoyage, etc.) |

---

## Acceptance Criteria

### AC1: Détection des frais en attente

```gherkin
Given un Order avec une Mission complétée
And la Mission a executionData contenant:
  | field               | value |
  | waitingTimeMinutes  | 45    |
  | parkingCost         | 15.00 |
And la facture de l'Order n'a pas de ligne "Waiting Time" ni "Parking"
When je consulte l'onglet "Financial" de l'Order
Then je vois une alerte "2 pending charges detected"
And je vois la liste:
  | description            | amount |
  | Waiting Time (45 min)  | 22.50€ |
  | Parking                | 15.00€ |
```

### AC2: Alerte visuelle dans le Financial Tab

```gherkin
Given un Order avec des frais en attente
When je consulte le Dossier de l'Order
Then l'onglet "Financial" affiche un badge avec le nombre de frais en attente
And l'alerte est de couleur warning (orange/jaune)
And l'alerte propose une action "Add All to Invoice" ou "Add" par ligne
```

### AC3: Ajout d'un frais à la facture

```gherkin
Given une alerte avec le frais "Waiting Time (45 min) - 22.50€"
And une facture active liée à l'Order
When je clique sur "Add to Invoice"
Then une nouvelle InvoiceLine est ajoutée:
  | field            | value                               |
  | description      | Waiting Time (45 min)               |
  | unitPriceExclVat | 20.45                               |
  | vatRate          | 10                                  |
  | totalExclVat     | 20.45                               |
  | totalVat         | 2.05                                |
And le frais disparaît de l'alerte
And les totaux de la facture sont recalculés
```

### AC4: Multi-missions

```gherkin
Given un Order avec 3 Missions
And Mission 1 a waitingTimeMinutes = 30
And Mission 2 a parkingCost = 10
And Mission 3 n'a pas de frais supplémentaires
When le système calcule les frais en attente
Then la liste contient 2 frais (de Mission 1 et Mission 2)
And chaque frais est taggé avec le libellé de sa Mission source
```

### AC5: Pas de doublon

```gherkin
Given un frais "Parking 15€" déjà ajouté à une facture
And le champ executionData contient toujours parkingCost = 15
When je consulte l'onglet Financial
Then le frais Parking n'apparaît PAS dans la liste des pending charges
And le système détecte qu'il a déjà été facturé
```

### AC6: API - Liste des frais en attente

```gherkin
When j'appelle GET /api/vtc/orders/:id/pending-charges
Then je reçois:
  {
    "orderId": "...",
    "pendingCharges": [
      {
        "id": "pc_123",
        "missionId": "mission_456",
        "missionLabel": "Transfer CDG → Paris",
        "type": "WAITING_TIME",
        "description": "Waiting Time (45 min)",
        "amount": 22.50,
        "invoiced": false
      }
    ],
    "totalPending": 22.50
  }
```

### AC7: API - Ajouter un frais

```gherkin
When j'appelle POST /api/vtc/orders/:id/pending-charges/add
With body:
  {
    "chargeId": "pc_123",
    "invoiceId": "inv_789"
  }
Then une InvoiceLine est créée
And la facture est mise à jour avec les nouveaux totaux
And la réponse contient la facture mise à jour
```

---

## Technical Implementation

### File Structure

```
apps/web/modules/saas/orders/components/
├── PendingChargesAlert.tsx           # NEW: Alert component for pending charges
├── OrderDetailClient.tsx             # UPDATE: Integrate PendingChargesAlert
└── index.ts                          # UPDATE: Export new component

packages/api/src/
├── services/
│   └── pending-charges.ts            # NEW: Detection and diff logic
├── routes/vtc/
│   └── orders.ts                     # UPDATE: Add pending charges endpoints
└── __tests__/
    └── pending-charges.test.ts       # NEW: Unit tests

apps/web/messages/
├── fr.json                           # UPDATE: Add translations
└── en.json                           # UPDATE: Add translations
```

### Data Models

#### MissionExecutionData Extension

```typescript
// packages/database/src/schemas/hybrid-blocks.ts
// Already exists - we use these fields:

export const MissionExecutionDataSchema = z.object({
  // Actual times
  actualPickupAt: z.string().datetime().optional(),
  actualDropoffAt: z.string().datetime().optional(),

  // Actual metrics
  actualDistanceKm: z.number().nonnegative().optional(),
  actualDurationMinutes: z.number().nonnegative().optional(),

  // NEW: Additional charges tracking
  waitingTimeMinutes: z.number().nonnegative().optional(),
  parkingCost: z.number().nonnegative().optional(),
  additionalTolls: z.number().nonnegative().optional(),
  otherCharges: z.array(z.object({
    label: z.string(),
    amount: z.number().nonnegative(),
  })).optional(),

  // Driver notes
  driverNotes: z.string().optional(),
});
```

#### Pending Charge Types

```typescript
// packages/api/src/services/pending-charges.ts

export type PendingChargeType =
  | "WAITING_TIME"
  | "EXTRA_KM"
  | "PARKING"
  | "ADDITIONAL_TOLLS"
  | "OTHER";

export interface PendingCharge {
  id: string;                    // Unique identifier (generated)
  orderId: string;
  missionId: string;
  missionLabel: string;          // From Mission sourceData
  type: PendingChargeType;
  description: string;           // Human-readable (e.g., "Waiting Time (45 min)")
  amount: number;                // Amount in EUR
  vatRate: number;               // Default 10% for transport
  invoiced: boolean;             // Already added to invoice?
  invoiceLineId?: string;        // Reference if invoiced
}

export interface PendingChargesResult {
  orderId: string;
  pendingCharges: PendingCharge[];
  totalPending: number;
}
```

### Service: PendingChargesService

```typescript
// packages/api/src/services/pending-charges.ts

import { db } from "@sixieme-etoile/database";
import type { Mission, InvoiceLine } from "@prisma/client";

export class PendingChargesService {
  /**
   * Pricing constants for additional charges
   */
  private static readonly WAITING_TIME_RATE_PER_MINUTE = 0.50; // €0.50/min
  private static readonly EXTRA_KM_RATE = 2.00;                // €2.00/km
  private static readonly INCLUDED_WAITING_MINUTES = 15;       // First 15 min free

  /**
   * Detect pending charges for an Order by comparing
   * Mission.executionData with existing InvoiceLines
   */
  static async detectPendingCharges(
    orderId: string,
    organizationId: string
  ): Promise<PendingChargesResult> {
    // 1. Fetch Order with Missions and Invoices
    const order = await db.order.findFirst({
      where: { id: orderId, organizationId },
      include: {
        missions: {
          include: {
            quoteLine: true,
          },
        },
        invoices: {
          include: {
            lines: true,
          },
        },
      },
    });

    if (!order) throw new Error(`Order ${orderId} not found`);

    // 2. Build set of already-invoiced charges (by description matching)
    const invoicedDescriptions = new Set<string>();
    for (const invoice of order.invoices) {
      for (const line of invoice.lines) {
        invoicedDescriptions.add(line.description.toLowerCase());
      }
    }

    // 3. Iterate missions and extract pending charges
    const pendingCharges: PendingCharge[] = [];

    for (const mission of order.missions) {
      const executionData = mission.executionData as Record<string, unknown> | null;
      if (!executionData) continue;

      const missionLabel = this.getMissionLabel(mission);

      // Check waiting time
      const waitingMinutes = executionData.waitingTimeMinutes as number | undefined;
      if (waitingMinutes && waitingMinutes > this.INCLUDED_WAITING_MINUTES) {
        const billableMinutes = waitingMinutes - this.INCLUDED_WAITING_MINUTES;
        const amount = billableMinutes * this.WAITING_TIME_RATE_PER_MINUTE;
        const description = `Waiting Time (${billableMinutes} min)`;
        
        if (!this.isAlreadyInvoiced(description, invoicedDescriptions)) {
          pendingCharges.push({
            id: `pc_wait_${mission.id}`,
            orderId,
            missionId: mission.id,
            missionLabel,
            type: "WAITING_TIME",
            description,
            amount,
            vatRate: 10,
            invoiced: false,
          });
        }
      }

      // Check parking
      const parkingCost = executionData.parkingCost as number | undefined;
      if (parkingCost && parkingCost > 0) {
        const description = `Parking`;
        if (!this.isAlreadyInvoiced(description, invoicedDescriptions)) {
          pendingCharges.push({
            id: `pc_park_${mission.id}`,
            orderId,
            missionId: mission.id,
            missionLabel,
            type: "PARKING",
            description,
            amount: parkingCost,
            vatRate: 20, // Parking at standard VAT
            invoiced: false,
          });
        }
      }

      // Check additional tolls
      const additionalTolls = executionData.additionalTolls as number | undefined;
      if (additionalTolls && additionalTolls > 0) {
        const description = `Additional Tolls`;
        if (!this.isAlreadyInvoiced(description, invoicedDescriptions)) {
          pendingCharges.push({
            id: `pc_toll_${mission.id}`,
            orderId,
            missionId: mission.id,
            missionLabel,
            type: "ADDITIONAL_TOLLS",
            description,
            amount: additionalTolls,
            vatRate: 20,
            invoiced: false,
          });
        }
      }

      // Check other charges
      const otherCharges = executionData.otherCharges as Array<{label: string, amount: number}> | undefined;
      if (otherCharges && otherCharges.length > 0) {
        for (const charge of otherCharges) {
          if (!this.isAlreadyInvoiced(charge.label, invoicedDescriptions)) {
            pendingCharges.push({
              id: `pc_other_${mission.id}_${charge.label.replace(/\s+/g, '_')}`,
              orderId,
              missionId: mission.id,
              missionLabel,
              type: "OTHER",
              description: charge.label,
              amount: charge.amount,
              vatRate: 20,
              invoiced: false,
            });
          }
        }
      }

      // Check extra KM
      const estimatedKm = this.getEstimatedDistance(mission);
      const actualKm = executionData.actualDistanceKm as number | undefined;
      if (estimatedKm && actualKm && actualKm > estimatedKm) {
        const extraKm = actualKm - estimatedKm;
        const description = `Extra Distance (+${extraKm.toFixed(1)} km)`;
        if (!this.isAlreadyInvoiced(description, invoicedDescriptions)) {
          pendingCharges.push({
            id: `pc_km_${mission.id}`,
            orderId,
            missionId: mission.id,
            missionLabel,
            type: "EXTRA_KM",
            description,
            amount: extraKm * this.EXTRA_KM_RATE,
            vatRate: 10,
            invoiced: false,
          });
        }
      }
    }

    return {
      orderId,
      pendingCharges,
      totalPending: pendingCharges.reduce((sum, c) => sum + c.amount, 0),
    };
  }

  /**
   * Add a pending charge to an invoice
   */
  static async addChargeToInvoice(
    chargeData: PendingCharge,
    invoiceId: string,
    organizationId: string
  ): Promise<InvoiceLine> {
    // Verify invoice exists and belongs to org
    const invoice = await db.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { lines: { orderBy: { sortOrder: 'desc' }, take: 1 } },
    });

    if (!invoice) throw new Error(`Invoice ${invoiceId} not found`);

    // Calculate amounts
    const amountExclVat = chargeData.amount / (1 + chargeData.vatRate / 100);
    const vatAmount = chargeData.amount - amountExclVat;

    // Get next sort order
    const lastSortOrder = invoice.lines[0]?.sortOrder ?? 0;

    // Create invoice line
    const newLine = await db.invoiceLine.create({
      data: {
        invoiceId: invoice.id,
        lineType: "SERVICE",
        blockType: "MANUAL",
        description: `${chargeData.description} - ${chargeData.missionLabel}`,
        quantity: 1,
        unitPriceExclVat: amountExclVat,
        vatRate: chargeData.vatRate,
        totalExclVat: amountExclVat,
        totalVat: vatAmount,
        sortOrder: lastSortOrder + 1,
        sourceData: {
          pendingChargeId: chargeData.id,
          missionId: chargeData.missionId,
          chargeType: chargeData.type,
        },
      },
    });

    // Recalculate invoice totals
    await this.recalculateInvoiceTotals(invoiceId);

    return newLine;
  }

  /**
   * Recalculate invoice totals after adding lines
   */
  private static async recalculateInvoiceTotals(invoiceId: string): Promise<void> {
    const lines = await db.invoiceLine.findMany({
      where: { invoiceId },
    });

    const totalExclVat = lines.reduce((sum, l) => sum + Number(l.totalExclVat), 0);
    const totalVat = lines.reduce((sum, l) => sum + Number(l.totalVat), 0);

    await db.invoice.update({
      where: { id: invoiceId },
      data: {
        totalExclVat,
        totalVat,
        totalInclVat: totalExclVat + totalVat,
      },
    });
  }

  /**
   * Helper: Get mission label from sourceData
   */
  private static getMissionLabel(mission: Mission): string {
    const sourceData = mission.sourceData as { pickupAddress?: string; dropoffAddress?: string } | null;
    if (sourceData?.pickupAddress && sourceData?.dropoffAddress) {
      return `${sourceData.pickupAddress.split(',')[0]} → ${sourceData.dropoffAddress.split(',')[0]}`;
    }
    return `Mission #${mission.id.slice(-6)}`;
  }

  /**
   * Helper: Get estimated distance from mission sourceData
   */
  private static getEstimatedDistance(mission: Mission): number | null {
    const sourceData = mission.sourceData as { estimatedDistance?: number } | null;
    return sourceData?.estimatedDistance ?? null;
  }

  /**
   * Helper: Check if a charge description is already invoiced
   */
  private static isAlreadyInvoiced(description: string, invoicedDescriptions: Set<string>): boolean {
    const normalizedDesc = description.toLowerCase();
    for (const invoiced of invoicedDescriptions) {
      if (invoiced.includes(normalizedDesc) || normalizedDesc.includes(invoiced.split(' - ')[0])) {
        return true;
      }
    }
    return false;
  }
}
```

### API Endpoints

```typescript
// packages/api/src/routes/vtc/orders.ts - Add these endpoints

// GET /api/vtc/orders/:id/pending-charges
app.get("/:id/pending-charges", async (c) => {
  const { id } = c.req.param();
  const organizationId = c.get("organizationId");
  
  const result = await PendingChargesService.detectPendingCharges(id, organizationId);
  return c.json(result);
});

// POST /api/vtc/orders/:id/pending-charges/add
app.post("/:id/pending-charges/add", async (c) => {
  const { id: orderId } = c.req.param();
  const { charge, invoiceId } = await c.req.json();
  const organizationId = c.get("organizationId");
  
  const line = await PendingChargesService.addChargeToInvoice(
    { ...charge, orderId },
    invoiceId,
    organizationId
  );
  
  return c.json({ success: true, line });
});
```

### PendingChargesAlert Component

```typescript
// apps/web/modules/saas/orders/components/PendingChargesAlert.tsx

"use client";

import { Alert, AlertDescription, AlertTitle } from "@ui/components/alert";
import { Button } from "@ui/components/button";
import { Badge } from "@ui/components/badge";
import { AlertTriangle, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";
import { formatCurrency } from "@shared/utils/format";

interface PendingChargesAlertProps {
  orderId: string;
  invoiceId?: string;  // Target invoice for adding charges
}

export function PendingChargesAlert({ orderId, invoiceId }: PendingChargesAlertProps) {
  const t = useTranslations("orders.pendingCharges");
  const queryClient = useQueryClient();

  // Fetch pending charges
  const { data, isLoading } = useQuery({
    queryKey: ["orders", orderId, "pending-charges"],
    queryFn: async () => {
      const response = await apiClient.vtc.orders[":id"]["pending-charges"].$get({
        param: { id: orderId },
      });
      if (!response.ok) throw new Error("Failed to fetch pending charges");
      return response.json();
    },
  });

  // Add charge mutation
  const addChargeMutation = useMutation({
    mutationFn: async (charge: PendingCharge) => {
      const response = await apiClient.vtc.orders[":id"]["pending-charges"].add.$post({
        param: { id: orderId },
        json: { charge, invoiceId },
      });
      if (!response.ok) throw new Error("Failed to add charge");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
    },
  });

  if (isLoading || !data?.pendingCharges?.length) return null;

  return (
    <Alert variant="warning" className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex items-center gap-2">
        {t("title")}
        <Badge variant="warning">{data.pendingCharges.length}</Badge>
      </AlertTitle>
      <AlertDescription>
        <p className="text-sm text-muted-foreground mb-3">
          {t("description", { total: formatCurrency(data.totalPending) })}
        </p>
        
        <div className="space-y-2">
          {data.pendingCharges.map((charge) => (
            <div
              key={charge.id}
              className="flex items-center justify-between p-2 bg-background/50 rounded-md"
            >
              <div>
                <p className="font-medium">{charge.description}</p>
                <p className="text-xs text-muted-foreground">{charge.missionLabel}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{formatCurrency(charge.amount)}</span>
                {invoiceId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addChargeMutation.mutate(charge)}
                    disabled={addChargeMutation.isPending}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {t("addToInvoice")}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {invoiceId && data.pendingCharges.length > 1 && (
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={() => {
              data.pendingCharges.forEach((charge) => addChargeMutation.mutate(charge));
            }}
            disabled={addChargeMutation.isPending}
          >
            {t("addAllToInvoice")}
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

---

## Test Cases

### Unit Tests (Vitest)

| Test ID    | Description                                               | Expected Result                          |
| ---------- | --------------------------------------------------------- | ---------------------------------------- |
| UT-28.12.1 | Detects waiting time charge from executionData            | Charge with correct amount (45-15)*0.50  |
| UT-28.12.2 | Detects parking charge from executionData                 | Charge with parkingCost amount           |
| UT-28.12.3 | Detects extra KM when actual > estimated                  | Charge with (actual-estimated)*2.00      |
| UT-28.12.4 | Does not duplicate already-invoiced charges               | Charge not in pendingCharges list        |
| UT-28.12.5 | Aggregates charges from multiple missions                 | All missions' charges in result          |
| UT-28.12.6 | addChargeToInvoice creates correct InvoiceLine            | Line has correct amounts and VAT         |
| UT-28.12.7 | addChargeToInvoice recalculates invoice totals            | Invoice totals updated                   |
| UT-28.12.8 | Empty executionData returns empty pendingCharges          | pendingCharges = [], totalPending = 0    |

### Browser Tests (MCP)

| Test ID    | Description                                      | Steps                                                |
| ---------- | ------------------------------------------------ | ---------------------------------------------------- |
| BT-28.12.1 | Add waiting time charge from Operations          | Add waiting time in mission → Check alert in Finance |
| BT-28.12.2 | Add charge to invoice                            | Click "Add to Invoice" → Verify line appears         |
| BT-28.12.3 | Verify total updates after adding                | Check invoice total includes new charge              |
| BT-28.12.4 | Alert disappears after adding all charges        | Add all → Alert shows 0 pending                      |

---

## Dependencies

### Completed (Prerequisites)

- ✅ Story 28.1: Order Entity & Prisma Schema (Order with missions relation)
- ✅ Story 28.3: Dossier View UI - Skeleton & Tabs (Financial Tab exists)
- ✅ Story 28.8: Invoice Generation - Detached Snapshot (InvoiceFactory)
- ✅ Story 28.9: Invoice UI - Full Editability
- ✅ Story 28.11: Partial Invoicing (balance calculation)
- ✅ Story 26.1: Hybrid Blocks Schema (MissionExecutionData exists)

### Blocking

- None

---

## Definition of Done

- [x] PendingChargesService implemented with detection logic
- [x] API endpoints for GET pending-charges and POST add
- [x] PendingChargesAlert component created
- [x] Integration in OrderDetailClient Financial Tab
- [x] Unit tests cover all detection scenarios
- [x] Browser test validates end-to-end flow
- [x] Translations added for FR and EN
- [x] Code review completed

---

## Dev Notes

### Matching Logic for Already-Invoiced

The system uses description-based matching to detect already-invoiced charges. This is a pragmatic approach since we don't have a formal foreign key between `InvoiceLine` and `executionData` charges.

For robustness, we store `pendingChargeId` in `InvoiceLine.sourceData` when adding charges, allowing future lookups.

### Pricing Configuration

The rates are currently hardcoded:
- Waiting: €0.50/min after 15 min included
- Extra KM: €2.00/km

These should be moved to `OrganizationPricingSettings` in a future story.

### VAT Rates

- Transport-related (waiting time, extra km): 10% VAT
- Parking, tolls, other: 20% VAT (standard rate)

---

## Checklist

- [x] Branch created: `feature/28-12-pending-charges`
- [x] PendingChargesService implemented
- [x] API endpoints created
- [x] PendingChargesAlert component implemented
- [x] OrderDetailClient updated
- [x] Unit tests written and passing
- [x] Browser tests executed
- [x] Translations added (FR/EN)
- [x] Story file updated with results
- [x] Sprint status updated to `review`
