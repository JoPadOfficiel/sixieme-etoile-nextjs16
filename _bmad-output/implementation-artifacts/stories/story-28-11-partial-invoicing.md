# Story 28.11: Partial Invoicing

**Epic:** Epic 28 – Order Management & Intelligent Spawning  
**Status:** review  
**Priority:** High  
**Estimated Effort:** 5 Story Points  
**Created:** 2026-01-20  
**Branch:** `feature/28-11-partial-invoice`

---

## User Story

**As an** operator,  
**I want** to generate partial invoices (deposits) from an Order with flexible billing modes,  
**So that** I can request advance payments before services and manage invoice balances accurately.

---

## Description

Cette story implémente un système de **facturation partielle** permettant aux opérateurs de créer des factures d'acompte ou de facturer partiellement les lignes d'une commande. L'UI `GenerateInvoiceModal` propose 3 modes de facturation flexibles.

### Modes de Facturation

1. **Full Balance** : Facture le solde complet restant sur l'Order (après déduction des factures précédentes)
2. **Deposit %** : Génère un acompte basé sur un pourcentage du total (ex: 30%)
3. **Manual Selection** : Permet de sélectionner manuellement les lignes à inclure dans la facture

### Principes Clés

- **Calculs financiers précis** : Utilisation de `Decimal` pour toutes les opérations monétaires
- **Traçabilité complète** : Chaque facture partielle est liée à l'Order via `orderId`
- **Immutabilité fiscale** : Les factures générées suivent le pattern InvoiceFactory (Story 28.8)
- **Solde dynamique** : Le système calcule automatiquement le solde restant après chaque facture

### Composants à Implémenter

1. **GenerateInvoiceModal** : `modules/saas/orders/components/GenerateInvoiceModal.tsx`
   - 3 onglets pour les modes de facturation
   - Affichage en temps réel des montants calculés
   - Validation avant génération

2. **Partial Invoice API** : Extension de `InvoiceFactory`
   - Méthode `createPartialInvoice(orderId, mode, options)`
   - Gestion du solde restant (`calculateRemainingBalance`)

3. **Financial Tab Enhancement** : Intégration dans `OrderDetailClient`
   - Bouton "Generate Invoice" 
   - Liste des factures liées à l'Order
   - Affichage du solde restant

---

## Acceptance Criteria

### AC1: Modal de génération avec 3 modes

```gherkin
Given un Order en statut CONFIRMED avec un montant total de 1000€
When j'ouvre le modal "Generate Invoice"
Then je vois 3 onglets: "Full Balance", "Deposit %", "Select Lines"
And le montant total de l'Order est affiché (1000€)
And le solde restant à facturer est affiché (1000€ si aucune facture précédente)
```

### AC2: Mode "Full Balance"

```gherkin
Given un Order avec un solde restant de 700€ (après un acompte de 300€)
When je sélectionne le mode "Full Balance"
And je clique sur "Generate Invoice"
Then une facture de 700€ est créée
And le solde restant de l'Order devient 0€
And la facture est liée à l'Order via orderId
```

### AC3: Mode "Deposit %" - Acompte de 30%

```gherkin
Given un Order avec un montant total de 1000€ et aucune facture précédente
When je sélectionne le mode "Deposit %"
And je saisis 30%
Then le montant de l'acompte affiché est 300€ (30% de 1000€)
When je clique sur "Generate Invoice"
Then une facture de 300€ est créée
And le solde restant de l'Order devient 700€
And l'InvoiceLine a la description "Acompte 30%"
```

### AC4: Mode "Select Lines" - Sélection manuelle

```gherkin
Given un Order avec les lignes suivantes:
  | description           | totalPrice |
  | Transfer CDG → Paris  | 150.00     |
  | Waiting Time 30min    | 25.00      |
  | Champagne             | 50.00      |
When je sélectionne le mode "Select Lines"
And je coche uniquement "Transfer CDG → Paris" et "Waiting Time 30min"
Then le sous-total affiché est 175€
When je clique sur "Generate Invoice"
Then une facture de 175€ est créée avec 2 InvoiceLines
And le solde restant de l'Order devient (original - 175€)
```

### AC5: Calcul du solde restant

```gherkin
Given un Order avec un montant total de 1000€
And une facture d'acompte existante de 300€
When j'ouvre le modal "Generate Invoice"
Then le solde restant affiché est 700€
And le mode "Full Balance" génère une facture de 700€
And le mode "Deposit 50%" calcule 50% sur 1000€ = 500€
```

### AC6: Validation - Pas de dépassement du solde

```gherkin
Given un Order avec un solde restant de 100€
When je saisis un acompte de 150%
Then un message d'erreur s'affiche "Amount exceeds remaining balance"
And le bouton "Generate Invoice" est désactivé
```

### AC7: Affichage dans le Financial Tab

```gherkin
Given un Order avec 2 factures existantes (300€ + 400€)
When je consulte l'onglet "Financial" de l'Order
Then je vois la liste des factures avec leurs montants
And je vois le solde restant calculé (Total - 300€ - 400€)
And je peux cliquer sur chaque facture pour la voir en détail
```

### AC8: Calcul TVA correct

```gherkin
Given un Order avec finalPrice = 1000€ HT et TVA = 100€ (10%)
When je génère un acompte de 30%
Then l'acompte est de 300€ HT
And la TVA de l'acompte est de 30€ (10% de 300€)
And le total TTC de la facture est 330€
```

---

## Technical Implementation

### File Structure

```
apps/web/modules/saas/orders/components/
├── GenerateInvoiceModal.tsx          # NEW: Modal for partial invoicing
├── OrderDetailClient.tsx             # UPDATE: Integrate Financial Tab content
└── index.ts                          # UPDATE: Export new component

packages/api/src/
├── services/
│   └── invoice-factory.ts            # UPDATE: Add partial invoice methods
├── routes/vtc/
│   └── invoices.ts                   # UPDATE: Add partial invoice endpoint
└── __tests__/
    └── partial-invoice.test.ts       # NEW: Unit tests

apps/web/messages/
├── fr.json                           # UPDATE: Add translations
└── en.json                           # UPDATE: Add translations
```

### Data Models

#### Invoice Schema (exists - no changes needed)

```prisma
model Invoice {
  orderId String?  // Already exists from Story 28.1
  // ... rest of fields
}
```

#### Partial Invoice Types

```typescript
// packages/api/src/services/invoice-factory.ts

export type PartialInvoiceMode = "FULL_BALANCE" | "DEPOSIT_PERCENT" | "MANUAL_SELECTION";

export interface PartialInvoiceOptions {
  mode: PartialInvoiceMode;
  depositPercent?: number;           // For DEPOSIT_PERCENT mode (1-100)
  selectedLineIds?: string[];        // For MANUAL_SELECTION mode
}

export interface OrderBalance {
  totalAmount: Decimal;              // Total order amount from quotes
  invoicedAmount: Decimal;           // Sum of all existing invoices
  remainingBalance: Decimal;         // totalAmount - invoicedAmount
  invoiceCount: number;              // Number of existing invoices
}
```

### API Endpoint

```typescript
// POST /api/vtc/invoices/partial
// Body: { orderId: string, mode: PartialInvoiceMode, options: PartialInvoiceOptions }
// Response: Invoice with lines

app.post("/partial", async (c) => {
  const { orderId, mode, depositPercent, selectedLineIds } = await c.req.json();
  const organizationId = c.get("organizationId");
  
  const invoice = await InvoiceFactory.createPartialInvoice(orderId, organizationId, {
    mode,
    depositPercent,
    selectedLineIds,
  });
  
  return c.json(invoice);
});
```

### InvoiceFactory Extension

```typescript
// packages/api/src/services/invoice-factory.ts

/**
 * Calculate remaining balance for an Order
 */
static async calculateOrderBalance(orderId: string, organizationId: string): Promise<OrderBalance> {
  const order = await db.order.findFirst({
    where: { id: orderId, organizationId },
    include: {
      quotes: {
        where: { status: "ACCEPTED" },
        select: { finalPrice: true },
      },
      invoices: {
        select: { totalInclVat: true },
      },
    },
  });

  if (!order) throw new Error(`Order ${orderId} not found`);

  const totalAmount = order.quotes.reduce(
    (sum, q) => sum.add(new Decimal(q.finalPrice)),
    new Decimal(0)
  );

  const invoicedAmount = order.invoices.reduce(
    (sum, inv) => sum.add(new Decimal(inv.totalInclVat)),
    new Decimal(0)
  );

  return {
    totalAmount,
    invoicedAmount,
    remainingBalance: totalAmount.sub(invoicedAmount),
    invoiceCount: order.invoices.length,
  };
}

/**
 * Create a partial invoice from an Order
 */
static async createPartialInvoice(
  orderId: string,
  organizationId: string,
  options: PartialInvoiceOptions
): Promise<Invoice> {
  const balance = await this.calculateOrderBalance(orderId, organizationId);
  
  let amount: Decimal;
  let description: string;
  let invoiceLines: InvoiceLineInput[] = [];

  switch (options.mode) {
    case "FULL_BALANCE":
      amount = balance.remainingBalance;
      description = `Solde facture - Order ${order.reference}`;
      // Copy all remaining lines
      break;
      
    case "DEPOSIT_PERCENT":
      const percent = options.depositPercent ?? 30;
      amount = balance.totalAmount.mul(percent).div(100);
      description = `Acompte ${percent}% - Order ${order.reference}`;
      // Single line for deposit
      invoiceLines = [{
        description: `Acompte ${percent}%`,
        quantity: 1,
        unitPriceExclVat: amount.div(1.1).toNumber(), // Assuming 10% VAT
        vatRate: 10,
        lineType: "SERVICE",
      }];
      break;
      
    case "MANUAL_SELECTION":
      // Deep copy selected lines only
      break;
  }

  // Validate amount doesn't exceed balance
  if (amount.gt(balance.remainingBalance)) {
    throw new Error("Invoice amount exceeds remaining balance");
  }

  // Create invoice using existing factory pattern
  // ...
}
```

### GenerateInvoiceModal Component

```typescript
// apps/web/modules/saas/orders/components/GenerateInvoiceModal.tsx

"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@ui/components/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@ui/components/tabs";
import { Button } from "@ui/components/button";
import { Input } from "@ui/components/input";
import { Checkbox } from "@ui/components/checkbox";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@shared/lib/api-client";

interface GenerateInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTotal: number;        // Total order amount
  remainingBalance: number;  // Amount not yet invoiced
  quoteLines: QuoteLine[];   // Lines available for selection
  onSuccess: () => void;
}

export function GenerateInvoiceModal({
  open,
  onOpenChange,
  orderId,
  orderTotal,
  remainingBalance,
  quoteLines,
  onSuccess,
}: GenerateInvoiceModalProps) {
  const t = useTranslations("orders.invoice");
  const [mode, setMode] = useState<"FULL_BALANCE" | "DEPOSIT_PERCENT" | "MANUAL_SELECTION">("FULL_BALANCE");
  const [depositPercent, setDepositPercent] = useState(30);
  const [selectedLineIds, setSelectedLineIds] = useState<string[]>([]);

  // Calculate amounts based on mode
  const calculatedAmount = useMemo(() => {
    switch (mode) {
      case "FULL_BALANCE":
        return remainingBalance;
      case "DEPOSIT_PERCENT":
        return (orderTotal * depositPercent) / 100;
      case "MANUAL_SELECTION":
        return quoteLines
          .filter((l) => selectedLineIds.includes(l.id))
          .reduce((sum, l) => sum + Number(l.totalPrice), 0);
    }
  }, [mode, depositPercent, selectedLineIds, orderTotal, remainingBalance, quoteLines]);

  const exceedsBalance = calculatedAmount > remainingBalance;

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.vtc.invoices.partial.$post({
        json: { orderId, mode, depositPercent, selectedLineIds },
      });
      if (!response.ok) throw new Error("Failed to create invoice");
      return response.json();
    },
    onSuccess: () => {
      onSuccess();
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t("generateTitle")}</DialogTitle>
        </DialogHeader>

        {/* Balance Summary */}
        <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">{t("orderTotal")}</p>
            <p className="text-2xl font-bold">{orderTotal.toFixed(2)}€</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{t("remainingBalance")}</p>
            <p className="text-2xl font-bold text-green-600">{remainingBalance.toFixed(2)}€</p>
          </div>
        </div>

        {/* Mode Tabs */}
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="FULL_BALANCE">{t("modeFullBalance")}</TabsTrigger>
            <TabsTrigger value="DEPOSIT_PERCENT">{t("modeDeposit")}</TabsTrigger>
            <TabsTrigger value="MANUAL_SELECTION">{t("modeManual")}</TabsTrigger>
          </TabsList>

          {/* Full Balance Tab */}
          <TabsContent value="FULL_BALANCE" className="space-y-4">
            <p className="text-sm text-muted-foreground">{t("fullBalanceDescription")}</p>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold">{remainingBalance.toFixed(2)}€</p>
            </div>
          </TabsContent>

          {/* Deposit Tab */}
          <TabsContent value="DEPOSIT_PERCENT" className="space-y-4">
            <div className="flex items-center gap-4">
              <Input
                type="number"
                min={1}
                max={100}
                value={depositPercent}
                onChange={(e) => setDepositPercent(Number(e.target.value))}
                className="w-24"
              />
              <span>%</span>
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold">{calculatedAmount.toFixed(2)}€</p>
              <p className="text-sm text-muted-foreground">
                {t("depositOf", { percent: depositPercent })}
              </p>
            </div>
          </TabsContent>

          {/* Manual Selection Tab */}
          <TabsContent value="MANUAL_SELECTION" className="space-y-4">
            <div className="max-h-[200px] overflow-y-auto space-y-2">
              {quoteLines.map((line) => (
                <label key={line.id} className="flex items-center gap-3 p-2 border rounded hover:bg-muted/50">
                  <Checkbox
                    checked={selectedLineIds.includes(line.id)}
                    onCheckedChange={(checked) => {
                      setSelectedLineIds((prev) =>
                        checked ? [...prev, line.id] : prev.filter((id) => id !== line.id)
                      );
                    }}
                  />
                  <span className="flex-1">{line.label}</span>
                  <span className="font-medium">{Number(line.totalPrice).toFixed(2)}€</span>
                </label>
              ))}
            </div>
            <div className="p-4 border rounded-lg text-center">
              <p className="text-3xl font-bold">{calculatedAmount.toFixed(2)}€</p>
              <p className="text-sm text-muted-foreground">
                {t("linesSelected", { count: selectedLineIds.length })}
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Error Message */}
        {exceedsBalance && (
          <p className="text-sm text-destructive">{t("exceedsBalance")}</p>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={exceedsBalance || calculatedAmount <= 0 || mutation.isPending}
          >
            {mutation.isPending ? t("generating") : t("generate")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Test Cases

### Unit Tests (Vitest)

| Test ID    | Description                                           | Expected Result                              |
| ---------- | ----------------------------------------------------- | -------------------------------------------- |
| UT-28.11.1 | calculateOrderBalance returns correct totals          | totalAmount - invoicedAmount = remainingBalance |
| UT-28.11.2 | FULL_BALANCE mode creates invoice for remaining amount | Invoice totalInclVat = remainingBalance      |
| UT-28.11.3 | DEPOSIT_PERCENT mode calculates correct amount        | 30% of 1000€ = 300€                          |
| UT-28.11.4 | MANUAL_SELECTION mode copies only selected lines      | Invoice has same line count as selection     |
| UT-28.11.5 | Throws error when amount exceeds remaining balance    | Error: "Invoice amount exceeds..."           |
| UT-28.11.6 | VAT calculated correctly for deposits                 | 300€ HT + 30€ (10%) = 330€ TTC               |
| UT-28.11.7 | Invoice linked to Order via orderId                   | invoice.orderId === orderId                  |
| UT-28.11.8 | Multiple partial invoices accumulate correctly        | Sum of invoices <= total order amount        |

### Browser Tests (MCP)

| Test ID    | Description                                      | Steps                                                |
| ---------- | ------------------------------------------------ | ---------------------------------------------------- |
| BT-28.11.1 | Generate 30% deposit                             | Open modal → Select Deposit 30% → Generate → Verify  |
| BT-28.11.2 | Verify remaining balance after deposit           | After 300€ invoice, balance shows 700€               |
| BT-28.11.3 | Generate full balance invoice                    | After deposit → Full Balance → Verify 700€           |
| BT-28.11.4 | Validation blocks excessive amount               | Try 150% deposit → Error displayed                   |

---

## Dependencies

### Completed (Prerequisites)

- ✅ Story 28.1: Order Entity & Prisma Schema (Order with invoices relation)
- ✅ Story 28.2: Order State Machine & API
- ✅ Story 28.3: Dossier View UI - Skeleton & Tabs
- ✅ Story 28.8: Invoice Generation - Detached Snapshot (InvoiceFactory pattern)
- ✅ Story 28.9: Invoice UI - Full Editability

### Blocking

- None

---

## Definition of Done

- [x] GenerateInvoiceModal component created with 3 modes
- [x] InvoiceFactory extended with `createPartialInvoice` and `calculateOrderBalance`
- [ ] Financial Tab in OrderDetailClient shows invoices and balance
- [x] Partial invoice API endpoint created
- [ ] Unit tests verify all balance calculations
- [ ] Browser test validates 30% deposit flow
- [x] Translations added for FR and EN
- [ ] Code review completed

---

## Dev Notes

### Precision with Decimal

All financial calculations MUST use `Decimal` from `decimal.js` to avoid floating point errors:

```typescript
import Decimal from "decimal.js";

// Correct
const amount = new Decimal(orderTotal).mul(percent).div(100);

// Wrong - will cause precision errors
const amount = orderTotal * percent / 100;
```

### VAT Calculation for Deposits

For deposit invoices, we apply the standard transport VAT rate (10%):
- Amount HT = Deposit Amount / 1.10
- TVA = Amount HT × 0.10
- Total TTC = Deposit Amount

### Order Balance State

The `remainingBalance` should be recalculated every time the modal opens or after any invoice action, not cached.

### Integration with Existing Invoice System

The partial invoices use the same `Invoice` and `InvoiceLine` models. They are distinguished by:
1. All linked to the same `orderId`
2. `InvoiceLine.description` contains context (e.g., "Acompte 30%")

---

## Checklist

- [x] Branch created: `feature/28-11-partial-invoice`
- [x] GenerateInvoiceModal component implemented
- [x] InvoiceFactory.createPartialInvoice implemented
- [x] InvoiceFactory.calculateOrderBalance implemented
- [x] API endpoint POST /api/vtc/invoices/partial created
- [ ] Financial Tab updated in OrderDetailClient
- [ ] Unit tests written and passing
- [ ] Browser tests executed
- [x] Translations added (FR/EN)
- [ ] Story file updated with results
- [ ] Sprint status updated to `review`

