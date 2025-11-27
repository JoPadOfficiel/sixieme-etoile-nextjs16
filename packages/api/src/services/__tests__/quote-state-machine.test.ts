/**
 * Unit tests for QuoteStateMachine
 * 
 * @see Story 6.4: Implement Quote Lifecycle & Status Transitions
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { QuoteStateMachine } from "../quote-state-machine";
import type { QuoteStatus } from "@prisma/client";

// Mock the database
vi.mock("@repo/database", () => ({
  db: {
    quote: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    quoteStatusAuditLog: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

import { db } from "@repo/database";

describe("QuoteStateMachine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("canTransition", () => {
    it("should allow DRAFT to SENT transition", () => {
      expect(QuoteStateMachine.canTransition("DRAFT", "SENT")).toBe(true);
    });

    it("should allow DRAFT to EXPIRED transition", () => {
      expect(QuoteStateMachine.canTransition("DRAFT", "EXPIRED")).toBe(true);
    });

    it("should allow SENT to VIEWED transition", () => {
      expect(QuoteStateMachine.canTransition("SENT", "VIEWED")).toBe(true);
    });

    it("should allow SENT to ACCEPTED transition", () => {
      expect(QuoteStateMachine.canTransition("SENT", "ACCEPTED")).toBe(true);
    });

    it("should allow SENT to REJECTED transition", () => {
      expect(QuoteStateMachine.canTransition("SENT", "REJECTED")).toBe(true);
    });

    it("should allow SENT to EXPIRED transition", () => {
      expect(QuoteStateMachine.canTransition("SENT", "EXPIRED")).toBe(true);
    });

    it("should allow VIEWED to ACCEPTED transition", () => {
      expect(QuoteStateMachine.canTransition("VIEWED", "ACCEPTED")).toBe(true);
    });

    it("should allow VIEWED to REJECTED transition", () => {
      expect(QuoteStateMachine.canTransition("VIEWED", "REJECTED")).toBe(true);
    });

    it("should allow VIEWED to EXPIRED transition", () => {
      expect(QuoteStateMachine.canTransition("VIEWED", "EXPIRED")).toBe(true);
    });

    it("should NOT allow DRAFT to ACCEPTED transition", () => {
      expect(QuoteStateMachine.canTransition("DRAFT", "ACCEPTED")).toBe(false);
    });

    it("should NOT allow DRAFT to REJECTED transition", () => {
      expect(QuoteStateMachine.canTransition("DRAFT", "REJECTED")).toBe(false);
    });

    it("should NOT allow DRAFT to VIEWED transition", () => {
      expect(QuoteStateMachine.canTransition("DRAFT", "VIEWED")).toBe(false);
    });

    it("should NOT allow ACCEPTED to any transition (terminal state)", () => {
      expect(QuoteStateMachine.canTransition("ACCEPTED", "DRAFT")).toBe(false);
      expect(QuoteStateMachine.canTransition("ACCEPTED", "SENT")).toBe(false);
      expect(QuoteStateMachine.canTransition("ACCEPTED", "VIEWED")).toBe(false);
      expect(QuoteStateMachine.canTransition("ACCEPTED", "REJECTED")).toBe(false);
      expect(QuoteStateMachine.canTransition("ACCEPTED", "EXPIRED")).toBe(false);
    });

    it("should NOT allow REJECTED to any transition (terminal state)", () => {
      expect(QuoteStateMachine.canTransition("REJECTED", "DRAFT")).toBe(false);
      expect(QuoteStateMachine.canTransition("REJECTED", "SENT")).toBe(false);
      expect(QuoteStateMachine.canTransition("REJECTED", "VIEWED")).toBe(false);
      expect(QuoteStateMachine.canTransition("REJECTED", "ACCEPTED")).toBe(false);
      expect(QuoteStateMachine.canTransition("REJECTED", "EXPIRED")).toBe(false);
    });

    it("should NOT allow EXPIRED to any transition (terminal state)", () => {
      expect(QuoteStateMachine.canTransition("EXPIRED", "DRAFT")).toBe(false);
      expect(QuoteStateMachine.canTransition("EXPIRED", "SENT")).toBe(false);
      expect(QuoteStateMachine.canTransition("EXPIRED", "VIEWED")).toBe(false);
      expect(QuoteStateMachine.canTransition("EXPIRED", "ACCEPTED")).toBe(false);
      expect(QuoteStateMachine.canTransition("EXPIRED", "REJECTED")).toBe(false);
    });
  });

  describe("getValidTransitions", () => {
    it("should return valid transitions for DRAFT", () => {
      const transitions = QuoteStateMachine.getValidTransitions("DRAFT");
      expect(transitions).toEqual(["SENT", "EXPIRED"]);
    });

    it("should return valid transitions for SENT", () => {
      const transitions = QuoteStateMachine.getValidTransitions("SENT");
      expect(transitions).toEqual(["VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"]);
    });

    it("should return valid transitions for VIEWED", () => {
      const transitions = QuoteStateMachine.getValidTransitions("VIEWED");
      expect(transitions).toEqual(["ACCEPTED", "REJECTED", "EXPIRED"]);
    });

    it("should return empty array for terminal states", () => {
      expect(QuoteStateMachine.getValidTransitions("ACCEPTED")).toEqual([]);
      expect(QuoteStateMachine.getValidTransitions("REJECTED")).toEqual([]);
      expect(QuoteStateMachine.getValidTransitions("EXPIRED")).toEqual([]);
    });
  });

  describe("validateTransition", () => {
    it("should return valid for allowed transitions", () => {
      const result = QuoteStateMachine.validateTransition("DRAFT", "SENT");
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it("should return error for same status transition", () => {
      const result = QuoteStateMachine.validateTransition("DRAFT", "DRAFT");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("already in");
      expect(result.errorKey).toBe("quotes.status.transition.alreadyInStatus");
    });

    it("should return error for invalid transition", () => {
      const result = QuoteStateMachine.validateTransition("DRAFT", "ACCEPTED");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid transition");
      expect(result.errorKey).toBe("quotes.status.transition.invalidTransition");
    });

    it("should return terminal state error for terminal states", () => {
      const result = QuoteStateMachine.validateTransition("ACCEPTED", "DRAFT");
      expect(result.valid).toBe(false);
      expect(result.error).toContain("terminal state");
      expect(result.errorKey).toBe("quotes.status.transition.terminalState");
    });
  });

  describe("isCommerciallyFrozen", () => {
    it("should return false for DRAFT", () => {
      expect(QuoteStateMachine.isCommerciallyFrozen("DRAFT")).toBe(false);
    });

    it("should return true for SENT", () => {
      expect(QuoteStateMachine.isCommerciallyFrozen("SENT")).toBe(true);
    });

    it("should return true for VIEWED", () => {
      expect(QuoteStateMachine.isCommerciallyFrozen("VIEWED")).toBe(true);
    });

    it("should return true for ACCEPTED", () => {
      expect(QuoteStateMachine.isCommerciallyFrozen("ACCEPTED")).toBe(true);
    });

    it("should return true for REJECTED", () => {
      expect(QuoteStateMachine.isCommerciallyFrozen("REJECTED")).toBe(true);
    });

    it("should return true for EXPIRED", () => {
      expect(QuoteStateMachine.isCommerciallyFrozen("EXPIRED")).toBe(true);
    });
  });

  describe("isEditable", () => {
    it("should return true for DRAFT", () => {
      expect(QuoteStateMachine.isEditable("DRAFT")).toBe(true);
    });

    it("should return false for non-DRAFT statuses", () => {
      expect(QuoteStateMachine.isEditable("SENT")).toBe(false);
      expect(QuoteStateMachine.isEditable("VIEWED")).toBe(false);
      expect(QuoteStateMachine.isEditable("ACCEPTED")).toBe(false);
      expect(QuoteStateMachine.isEditable("REJECTED")).toBe(false);
      expect(QuoteStateMachine.isEditable("EXPIRED")).toBe(false);
    });
  });

  describe("canConvertToInvoice", () => {
    it("should return true for ACCEPTED", () => {
      expect(QuoteStateMachine.canConvertToInvoice("ACCEPTED")).toBe(true);
    });

    it("should return false for non-ACCEPTED statuses", () => {
      expect(QuoteStateMachine.canConvertToInvoice("DRAFT")).toBe(false);
      expect(QuoteStateMachine.canConvertToInvoice("SENT")).toBe(false);
      expect(QuoteStateMachine.canConvertToInvoice("VIEWED")).toBe(false);
      expect(QuoteStateMachine.canConvertToInvoice("REJECTED")).toBe(false);
      expect(QuoteStateMachine.canConvertToInvoice("EXPIRED")).toBe(false);
    });
  });

  describe("shouldAutoExpire", () => {
    it("should return true for DRAFT quote with past validUntil", () => {
      const quote = {
        id: "test-id",
        status: "DRAFT" as QuoteStatus,
        validUntil: new Date(Date.now() - 86400000), // Yesterday
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(true);
    });

    it("should return true for SENT quote with past validUntil", () => {
      const quote = {
        id: "test-id",
        status: "SENT" as QuoteStatus,
        validUntil: new Date(Date.now() - 86400000), // Yesterday
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(true);
    });

    it("should return true for VIEWED quote with past validUntil", () => {
      const quote = {
        id: "test-id",
        status: "VIEWED" as QuoteStatus,
        validUntil: new Date(Date.now() - 86400000), // Yesterday
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(true);
    });

    it("should return false for DRAFT quote with future validUntil", () => {
      const quote = {
        id: "test-id",
        status: "DRAFT" as QuoteStatus,
        validUntil: new Date(Date.now() + 86400000), // Tomorrow
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(false);
    });

    it("should return false for DRAFT quote without validUntil", () => {
      const quote = {
        id: "test-id",
        status: "DRAFT" as QuoteStatus,
        validUntil: null,
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(false);
    });

    it("should return false for ACCEPTED quote (terminal state)", () => {
      const quote = {
        id: "test-id",
        status: "ACCEPTED" as QuoteStatus,
        validUntil: new Date(Date.now() - 86400000), // Yesterday
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(false);
    });

    it("should return false for REJECTED quote (terminal state)", () => {
      const quote = {
        id: "test-id",
        status: "REJECTED" as QuoteStatus,
        validUntil: new Date(Date.now() - 86400000), // Yesterday
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(false);
    });

    it("should return false for EXPIRED quote (already expired)", () => {
      const quote = {
        id: "test-id",
        status: "EXPIRED" as QuoteStatus,
        validUntil: new Date(Date.now() - 86400000), // Yesterday
      };
      expect(QuoteStateMachine.shouldAutoExpire(quote as any)).toBe(false);
    });
  });

  describe("transition", () => {
    it("should return error when quote not found", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue(null);

      const result = await QuoteStateMachine.transition(
        "non-existent-id",
        "SENT",
        "org-id"
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe("Quote not found");
      expect(result.errorKey).toBe("quotes.status.transition.notFound");
    });

    it("should return error for invalid transition", async () => {
      vi.mocked(db.quote.findFirst).mockResolvedValue({
        id: "test-id",
        organizationId: "org-id",
        status: "ACCEPTED",
      } as any);

      const result = await QuoteStateMachine.transition(
        "test-id",
        "DRAFT",
        "org-id"
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain("terminal state");
    });

    it("should successfully transition DRAFT to SENT", async () => {
      const mockQuote = {
        id: "test-id",
        organizationId: "org-id",
        status: "DRAFT",
      };

      const updatedQuote = {
        ...mockQuote,
        status: "SENT",
        sentAt: new Date(),
      };

      vi.mocked(db.quote.findFirst).mockResolvedValue(mockQuote as any);
      vi.mocked(db.$transaction).mockResolvedValue([updatedQuote, {}] as any);

      const result = await QuoteStateMachine.transition(
        "test-id",
        "SENT",
        "org-id",
        "user-id"
      );

      expect(result.success).toBe(true);
      expect(result.quote).toBeDefined();
      expect(db.$transaction).toHaveBeenCalled();
    });
  });
});
