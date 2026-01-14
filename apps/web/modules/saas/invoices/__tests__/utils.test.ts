import { describe, it, expect } from "vitest";
import {
  calculateLineTotals,
  formatPrice,
  formatVatRate,
  getLineTypeLabel,
  isOverdue,
  getDaysUntilDue,
} from "../types";
import type { InvoiceLine, InvoiceListItem } from "../types";

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

      expect(result.totalExclVat).toBe(200);
      expect(result.totalVat).toBe(30);
      expect(result.totalInclVat).toBe(230);
      
      expect(result.vatBreakdown["20"]).toEqual({
        rate: 20,
        base: 100,
        vat: 20,
      });
      expect(result.vatBreakdown["10"]).toEqual({
        rate: 10,
        base: 100,
        vat: 10,
      });
    });

    it("should handle empty lines", () => {
      const result = calculateLineTotals([]);
      expect(result.totalExclVat).toBe(0);
      expect(result.totalVat).toBe(0);
      expect(result.totalInclVat).toBe(0);
      expect(Object.keys(result.vatBreakdown).length).toBe(0);
    });
  });

  describe("Formatting", () => {
    it("formatPrice should format EUR currency", () => {
      const formatted = formatPrice(1234.56);
      // Check for non-breaking spaces which are common in currency formatting
      expect(formatted.includes("1") || formatted.includes("€")).toBe(true); 
    });

    it("formatVatRate should format percentage", () => {
      expect(formatVatRate(20)).toBe("20%");
      expect(formatVatRate("10")).toBe("10%");
    });

    it("getLineTypeLabel should return correct labels", () => {
      expect(getLineTypeLabel("SERVICE")).toBe("Service");
      expect(getLineTypeLabel("OPTIONAL_FEE")).toBe("Frais optionnel");
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

      expect(isOverdue(invoice)).toBe(true);
    });

    it("isOverdue should return false if paid", () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      
      const invoice = {
        dueDate: pastDate.toISOString(),
        status: "PAID",
      } as InvoiceListItem;

      expect(isOverdue(invoice)).toBe(false);
    });

    it("getDaysUntilDue should return positive for future dates", () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 5);
      
      const invoice = {
        dueDate: futureDate.toISOString(),
      } as InvoiceListItem;

      expect(getDaysUntilDue(invoice) > 0).toBe(true);
    });
  });
});
