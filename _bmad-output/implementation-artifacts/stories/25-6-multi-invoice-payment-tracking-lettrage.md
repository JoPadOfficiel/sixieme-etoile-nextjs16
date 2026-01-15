# Story 25.6: Multi-Invoice Payment Tracking (Lettrage)

## 📋 Story Information

| Field | Value |
|-------|-------|
| **Story ID** | 25.6 |
| **Epic** | Epic 25: Documents, Payments & Deep Linking Enhancements |
| **Status** | done |
| **Priority** | HIGH |
| **Estimated Effort** | 4-6 hours |
| **Branch** | `feature/25-6-bulk-payment-lettrage` |
| **Agent Assignment** | Claude Opus / Antigravity |

---

## 🎯 Description

Implement a multi-invoice payment tracking system (French accounting term: "Lettrage") that allows operators to:

1. Select multiple unpaid invoices for a contact
2. Apply a single payment amount that gets distributed across invoices in chronological order (FIFO)
3. Handle partial payments automatically
4. Display a global outstanding balance on the contact profile

This feature streamlines the payment reconciliation process for contacts with multiple outstanding invoices.

---

## ✅ Acceptance Criteria

### AC1: Multi-Select Unpaid Invoices
- [ ] Users can view a list of all unpaid invoices (status: ISSUED) for a contact
- [ ] Each invoice row displays a checkbox for selection
- [ ] A "Select All" checkbox is available to select all unpaid invoices
- [ ] Selected invoices total is displayed in real-time
- [ ] Only invoices with status `ISSUED` or `PARTIAL` can be selected

### AC2: FIFO Payment Application
- [ ] A "Lettrage / Apply Bulk Payment" button opens a payment modal
- [ ] User enters a single payment amount
- [ ] Payment is distributed across selected invoices in chronological order (oldest first)
- [ ] Fully paid invoices transition to status `PAID`
- [ ] Partially paid invoices transition to status `PARTIAL`
- [ ] Remaining payment overage is displayed (if payment exceeds total)
- [ ] Server action validates the payment and updates all invoices atomically

### AC3: Global Balance Display
- [ ] Contact drawer/detail shows total outstanding balance
- [ ] Balance includes all `ISSUED` and `PARTIAL` invoices
- [ ] Balance updates after payment application
- [ ] Visual indicator (badge) for contacts with outstanding balance

---

## 📐 Technical Design

### Database Schema Changes

```prisma
// Update InvoiceStatus enum
enum InvoiceStatus {
  DRAFT
  ISSUED
  PARTIAL    // NEW: Partially paid
  PAID
  CANCELLED
}

// Add field to Invoice model
model Invoice {
  // ... existing fields
  
  // Story 25.6: Payment tracking
  paidAmount Decimal @default(0) @db.Decimal(10, 2) // Amount already paid
  
  // Computed: remainingAmount = totalInclVat - paidAmount
}
```

### API Endpoints

```typescript
// New server action
POST /api/vtc/invoices/bulk-payment
Body: {
  invoiceIds: string[];
  paymentAmount: number;
  paymentDate?: string;
  paymentReference?: string;
  paymentMethod?: "VIREMENT" | "CHEQUE" | "CB" | "ESPECES";
}
Response: {
  success: boolean;
  allocations: Array<{
    invoiceId: string;
    invoiceNumber: string;
    previousStatus: string;
    newStatus: string;
    amountApplied: number;
    remainingAmount: number;
  }>;
  totalApplied: number;
  overage: number;
}

// Get contact balance
GET /api/vtc/contacts/:id/balance
Response: {
  totalOutstanding: number;
  invoiceCount: number;
  oldestInvoiceDate: string;
  breakdown: {
    issued: number;
    partial: number;
  };
}
```

### Component Architecture

```
ContactDrawer
└── ContactInvoicesTab (NEW)
    ├── InvoiceBalanceSummary
    ├── UnpaidInvoicesList
    │   └── InvoiceSelectableRow
    └── BulkPaymentModal
        ├── PaymentAmountInput
        ├── PaymentAllocationPreview
        └── PaymentConfirmButton
```

---

## 🧪 Test Cases

### Unit Tests

```typescript
// packages/api/src/routes/vtc/__tests__/invoices-bulk-payment.test.ts

describe("Bulk Payment Lettrage", () => {
  it("should distribute payment across invoices in FIFO order", async () => {
    // Given: 3 invoices of 400€ each (oldest to newest)
    // When: Payment of 1000€ is applied
    // Then:
    //   - Invoice 1: PAID (400€ applied, 0€ remaining)
    //   - Invoice 2: PAID (400€ applied, 0€ remaining)
    //   - Invoice 3: PARTIAL (200€ applied, 200€ remaining)
  });

  it("should handle exact payment amount", async () => {
    // Given: 2 invoices of 500€ each
    // When: Payment of 1000€ is applied
    // Then: Both invoices become PAID
  });

  it("should handle overpayment", async () => {
    // Given: 1 invoice of 400€
    // When: Payment of 500€ is applied
    // Then: Invoice is PAID, 100€ overage returned
  });

  it("should reject payment on cancelled invoices", async () => {
    // Given: Cancelled invoice selected
    // When: Attempting bulk payment
    // Then: Error returned
  });

  it("should be idempotent on retry", async () => {
    // Payment application should be transaction-safe
  });
});
```

### Integration Tests

```typescript
// apps/web/cypress/e2e/bulk-payment.cy.ts

describe("Bulk Payment UI", () => {
  it("should allow multi-select and display running total", () => {
    cy.visit("/dashboard/contacts?id=contact123&tab=invoices");
    cy.get('[data-testid="invoice-select-all"]').click();
    cy.get('[data-testid="selected-invoices-total"]').should("contain", "1,200.00 €");
  });

  it("should show allocation preview before confirming", () => {
    cy.get('[data-testid="apply-bulk-payment-btn"]').click();
    cy.get('[data-testid="payment-amount-input"]').type("1000");
    cy.get('[data-testid="allocation-preview"]').should("contain", "PARTIAL");
    cy.get('[data-testid="confirm-payment-btn"]').click();
  });
});
```

---

## 📁 Files to Create/Modify

### New Files
- `packages/database/prisma/migrations/XXXXXXXX_add_invoice_partial_payment/migration.sql`
- `packages/api/src/routes/vtc/invoices-bulk-payment.ts`
- `packages/api/src/routes/vtc/__tests__/invoices-bulk-payment.test.ts`
- `apps/web/modules/saas/contacts/components/ContactInvoicesTab.tsx`
- `apps/web/modules/saas/contacts/components/UnpaidInvoicesList.tsx`
- `apps/web/modules/saas/contacts/components/BulkPaymentModal.tsx`
- `apps/web/modules/saas/invoices/types/payment.ts`

### Modified Files
- `packages/database/prisma/schema.prisma` (add PARTIAL status, paidAmount field)
- `packages/api/src/routes/vtc/invoices.ts` (add balance endpoint)
- `apps/web/modules/saas/contacts/components/ContactDrawer.tsx` (add invoices tab)
- `apps/web/modules/saas/contacts/types.ts` (add balance types)
- `apps/web/messages/en.json` (translations)
- `apps/web/messages/fr.json` (translations)

---

## 🔗 Dependencies

- Story 25.5: Deep Linking Navigation (for tab URL sync)
- Epic 7: Invoice system must be in place   

---

## 📝 Implementation Notes

1. **Transaction Safety**: All invoice updates must be in a single Prisma transaction
2. **Audit Logging**: Consider adding payment audit log for accounting compliance
3. **Currency**: All amounts are in EUR (per Story 1.3)
4. **Timezone**: Use Europe/Paris for payment date (per Story 1.4)
5. **UI/UX**: Use shadcn/ui components for consistency

---

## 📅 Timeline

- [x] Branch created: `feature/25-6-bulk-payment-lettrage`
- [ ] Schema updated with PARTIAL status and paidAmount
- [ ] Server action implemented
- [ ] Unit tests passing
- [ ] UI components created
- [ ] Integration tests passing
- [ ] Code review completed
- [ ] Merged to main

---

## 🗒️ Notes

- French accounting term "Lettrage" refers to the process of matching payments to invoices
- FIFO (First In, First Out) ensures older invoices are settled first
- Partial payments are common in B2B scenarios with partner agencies
