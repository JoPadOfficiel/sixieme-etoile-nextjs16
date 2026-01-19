/**
 * Story 26.7: dnd-utils Tests
 * 
 * Unit tests for the drag & drop utility functions.
 */

import { describe, it, expect } from "vitest";
import {
  getLineId,
  recalculateSortOrder,
  moveLine,
  getDescendantIds,
  isDescendantOf,
  validateNestingDepth,
  calculateLineTotal,
  getLineDepth,
} from "../dnd-utils";
import type { QuoteLine } from "../../UniversalLineItemRow";

describe("dnd-utils", () => {
  describe("getLineId", () => {
    it("should return id if present", () => {
      const line: QuoteLine = { id: "line-1", type: "MANUAL", label: "Test" };
      expect(getLineId(line)).toBe("line-1");
    });

    it("should return tempId if id is not present", () => {
      const line: QuoteLine = { tempId: "temp-1", type: "MANUAL", label: "Test" };
      expect(getLineId(line)).toBe("temp-1");
    });

    it("should return empty string if neither id nor tempId present", () => {
      const line: QuoteLine = { type: "MANUAL", label: "Test" };
      expect(getLineId(line)).toBe("");
    });
  });

  describe("recalculateSortOrder", () => {
    it("should assign sortOrder 0 to single line", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "Test" },
      ];
      const result = recalculateSortOrder(lines);
      expect(result[0].sortOrder).toBe(0);
    });

    it("should assign sequential sortOrder to root lines", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "First" },
        { id: "line-2", type: "MANUAL", label: "Second" },
        { id: "line-3", type: "MANUAL", label: "Third" },
      ];
      const result = recalculateSortOrder(lines);
      expect(result[0].sortOrder).toBe(0);
      expect(result[1].sortOrder).toBe(1);
      expect(result[2].sortOrder).toBe(2);
    });

    it("should assign sortOrder within groups", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item 1", parentId: "group-1" },
        { id: "line-2", type: "MANUAL", label: "Item 2", parentId: "group-1" },
      ];
      const result = recalculateSortOrder(lines);
      
      // Group at root level
      expect(result.find(l => l.id === "group-1")?.sortOrder).toBe(0);
      // Children within group
      expect(result.find(l => l.id === "line-1")?.sortOrder).toBe(0);
      expect(result.find(l => l.id === "line-2")?.sortOrder).toBe(1);
    });
  });

  describe("moveLine", () => {
    it("should move a line to a new position", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "First", sortOrder: 0 },
        { id: "line-2", type: "MANUAL", label: "Second", sortOrder: 1 },
        { id: "line-3", type: "MANUAL", label: "Third", sortOrder: 2 },
      ];
      
      // Move line-1 after line-3
      const result = moveLine(lines, "line-1", "line-3");
      
      const line1 = result.find(l => l.id === "line-1");
      // line-1 should now be last (or after line-3)
      expect(result.indexOf(line1!)).toBeGreaterThan(result.findIndex(l => l.id === "line-3"));
    });

    it("should re-parent a line when newParentId is provided", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item 1" },
      ];
      
      const result = moveLine(lines, "line-1", "group-1", "group-1");
      const line1 = result.find(l => l.id === "line-1");
      expect(line1?.parentId).toBe("group-1");
    });

    it("should return original array if activeId not found", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "First" },
      ];
      const result = moveLine(lines, "nonexistent", "line-1");
      expect(result).toEqual(lines);
    });
  });

  describe("getDescendantIds", () => {
    it("should return empty array for lines without children", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "First" },
      ];
      expect(getDescendantIds(lines, "line-1")).toEqual([]);
    });

    it("should return all child IDs of a group", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item 1", parentId: "group-1" },
        { id: "line-2", type: "MANUAL", label: "Item 2", parentId: "group-1" },
      ];
      const result = getDescendantIds(lines, "group-1");
      expect(result).toContain("line-1");
      expect(result).toContain("line-2");
      expect(result.length).toBe(2);
    });

    it("should return nested descendants (multi-level)", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "subgroup-1", type: "GROUP", label: "Morning", parentId: "group-1" },
        { id: "line-1", type: "MANUAL", label: "Item 1", parentId: "subgroup-1" },
      ];
      const result = getDescendantIds(lines, "group-1");
      expect(result).toContain("subgroup-1");
      expect(result).toContain("line-1");
    });
  });

  describe("isDescendantOf", () => {
    it("should return true for direct child", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item 1", parentId: "group-1" },
      ];
      expect(isDescendantOf(lines, "line-1", "group-1")).toBe(true);
    });

    it("should return false for unrelated lines", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item 1" },
      ];
      expect(isDescendantOf(lines, "line-1", "group-1")).toBe(false);
    });
  });

  describe("validateNestingDepth", () => {
    it("should return true for nesting under root GROUP", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item 1" },
      ];
      expect(validateNestingDepth(lines, "line-1", "group-1")).toBe(true);
    });

    it("should return false for nesting under non-GROUP", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "Item 1" },
        { id: "line-2", type: "MANUAL", label: "Item 2" },
      ];
      expect(validateNestingDepth(lines, "line-2", "line-1")).toBe(false);
    });

    it("should return false for nesting under nested GROUP (depth > 1)", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "group-2", type: "GROUP", label: "Morning", parentId: "group-1" },
        { id: "line-1", type: "MANUAL", label: "Item 1" },
      ];
      // group-2 has a parent, so can't nest under it
      expect(validateNestingDepth(lines, "line-1", "group-2")).toBe(false);
    });

    it("should return false for GROUP nesting under another GROUP (H3 fix)", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "group-2", type: "GROUP", label: "Day 2" },
      ];
      // GROUP cannot be nested under another GROUP
      expect(validateNestingDepth(lines, "group-2", "group-1")).toBe(false);
    });
  });

  describe("calculateLineTotal", () => {
    it("should calculate total for MANUAL line (qty * unitPrice)", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "Item", quantity: 2, unitPrice: 50 },
      ];
      expect(calculateLineTotal(lines[0], lines)).toBe(100);
    });

    it("should sum children totals for GROUP line", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item 1", quantity: 2, unitPrice: 50, parentId: "group-1" },
        { id: "line-2", type: "MANUAL", label: "Item 2", quantity: 1, unitPrice: 100, parentId: "group-1" },
      ];
      expect(calculateLineTotal(lines[0], lines)).toBe(200); // 100 + 100
    });

    it("should return 0 for empty GROUP", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Empty Day" },
      ];
      expect(calculateLineTotal(lines[0], lines)).toBe(0);
    });

    it("should use default values when qty/price missing", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "Item" },
      ];
      expect(calculateLineTotal(lines[0], lines)).toBe(0); // 1 * 0
    });
  });

  describe("getLineDepth", () => {
    it("should return 0 for root lines", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "Item" },
      ];
      expect(getLineDepth(lines[0], lines)).toBe(0);
    });

    it("should return 1 for lines nested under GROUP", () => {
      const lines: QuoteLine[] = [
        { id: "group-1", type: "GROUP", label: "Day 1" },
        { id: "line-1", type: "MANUAL", label: "Item", parentId: "group-1" },
      ];
      expect(getLineDepth(lines[1], lines)).toBe(1);
    });

    it("should return 0 if parent not found", () => {
      const lines: QuoteLine[] = [
        { id: "line-1", type: "MANUAL", label: "Item", parentId: "nonexistent" },
      ];
      expect(getLineDepth(lines[0], lines)).toBe(0);
    });
  });
});

