import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { SortableQuoteLinesList } from "../SortableQuoteLinesList";
import { type QuoteLine } from "../dnd-utils";
import { NextIntlClientProvider } from "next-intl";

// Mock next-intl
vi.mock("next-intl", async () => {
  const actual = await vi.importActual("next-intl");
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  };
});

const mockMessages = {
  quotes: {
    yolo: {
      headers: {
        description: "Description",
        qty: "Qty",
        unitPrice: "Unit Price",
        total: "Total",
        vat: "VAT"
      },
      emptyState: "No line items yet",
    }
  }
};

describe("SortableQuoteLinesList", () => {
  it("renders empty state when no lines", () => {
    render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <SortableQuoteLinesList lines={[]} onLinesChange={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText("emptyState")).toBeDefined();
  });

  it("renders lines in a list", () => {
    const lines: QuoteLine[] = [
      { id: "1", type: "MANUAL", label: "Line 1", quantity: 1, unitPrice: 100, sortOrder: 0 },
      { id: "2", type: "MANUAL", label: "Line 2", quantity: 2, unitPrice: 200, sortOrder: 1 },
    ];

    render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <SortableQuoteLinesList lines={lines} onLinesChange={vi.fn()} />
      </NextIntlClientProvider>
    );

    expect(screen.getByText("Line 1")).toBeDefined();
    expect(screen.getByText("Line 2")).toBeDefined();
  });
});
