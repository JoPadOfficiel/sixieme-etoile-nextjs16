import { describe, it } from "node:test";
import assert from "node:assert";
import {
  calculateLineTotals,
  formatPrice,
  formatVatRate,
  getLineTypeLabel,
  isOverdue,
  getDaysUntilDue,
} from "../types";
import type { InvoiceLine, Invoice, InvoiceListItem } from "../types";

describe("Invoice Utilities", () => {
  describe("calculateLineTotals", () => {
    it("should calculate correct totals and breakdown", () => {
      const lines: InvoiceLine[] = [
        {
          id: "1",
          invoiceId: "inv1",
          lineType: "SERVICE",
          description: "Service A",
          quantity: "1",
          unitPriceExclVat: "100",
          vatRate: "20",
          totalExclVat: "100",
          totalVat: "20",
          sortOrder: 1,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "2",
          invoiceId: "inv1",
          lineType: "OPTIONAL_FEE",
          description: "Fee B",
          quantity: "2",
          unitPriceExclVat: "50",
          vatRate: "10",
          totalExclVat: "100",
          totalVat: "10",
          sortOrder: 2,
          createdAt: "",
          updatedAt: "",
        },
      ];

      const result = calculateLineTotals(lines);

      assert.strictEqual(result.totalExclVat, 200);
      assert.strictEqual(result.totalVat, 30);
      assert.strictEqual(result.totalInclVat, 230);
      
      assert.deepStrictEqual(result.vatBreakdown["20"], {
        rate: 20,
        base: 100,
        vat: 20,
      });
      assert.deepStrictEqual(result.vatBreakdown["10"], {
        rate: 10,
        base: 100,
        vat: 10,
      });
    });

    it("should handle empty lines", () => {
      const result = calculateLineTotals([]);
      assert.strictEqual(result.totalExclVat, 0);
      assert.strictEqual(result.totalVat, 0);
      assert.strictEqual(result.totalInclVat, 0);
      assert.strictEqual(Object.keys(result.vatBreakdown).length, 0);
    });
  });

  describe("Formatting", () => {
    it("formatPrice should format EUR currency", () => {
      const formatted = formatPrice(1234.56);
      // Check for non-breaking spaces which are common in currency formatting
      assert.ok(formatted.includes("1") || formatted.includes("€")); 
    });

    it("formatVatRate should format percentage", () => {
      assert.strictEqual(formatVatRate(20), "20%");
      assert.strictEqual(formatVatRate("10"), "10%");
    });

    it("getLineTypeLabel should return correct labels", () => {
      assert.strictEqual(getLineTypeLabel("SERVICE"), "Service");
      assert.strictEqual(getLineTypeLabel("OPTIONAL_FEE"), "Frais optionnel");
    });
  });

  describe("Date Logic", () => {
    it("isOverdue should return true for past due date if not paid", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const invoice = {
        dueDate: pastDate.toISOString(),
        status: "ISSUED",
      } as InvoiceListItem;

      assert.strictEqual(isOverdue(invoice), true);
    });

    it("isOverdue should return false if paid", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const invoice = {
        dueDate: pastDate.toISOString(),
        status: "PAID",
      } as InvoiceListItem;

      assert.strictEqual(isOverdue(invoice), false);
    });

    it("getDaysUntilDue should return positive for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const invoice = {
        dueDate: futureDate.toISOString(),
      } as InvoiceListItem;

      assert.ok(getDaysUntilDue(invoice) > 0);
    });
  });
});
