/**
 * Tests for placeholder replacement utilities
 * Story 28.10: Execution Feedback Loop (Placeholders)
 */

import { describe, it, expect } from "vitest";
import {
  replacePlaceholders,
  hasPlaceholders,
  findPlaceholders,
  replaceAllPlaceholders,
  type MissionContext,
} from "../placeholders";

describe("replacePlaceholders", () => {
  const fullContext: MissionContext = {
    driverName: "John Doe",
    vehiclePlate: "AB-123-CD",
    startAt: "2026-01-20T10:00:00.000Z",
    endAt: "2026-01-20T14:00:00.000Z",
  };

  it("should replace {{driver}} with driver name", () => {
    const result = replacePlaceholders("Transfert par {{driver}}", fullContext);
    expect(result).toBe("Transfert par John Doe");
  });

  it("should replace {{plate}} with vehicle plate", () => {
    const result = replacePlaceholders("Véhicule {{plate}}", fullContext);
    expect(result).toBe("Véhicule AB-123-CD");
  });

  it("should replace {{start}} with formatted start time", () => {
    const result = replacePlaceholders("Départ: {{start}}", fullContext);
    expect(result).toMatch(/Départ: \d{2}\/\d{2}\/\d{4}/);
  });

  it("should replace {{end}} with formatted end time", () => {
    const result = replacePlaceholders("Arrivée: {{end}}", fullContext);
    expect(result).toMatch(/Arrivée: \d{2}\/\d{2}\/\d{4}/);
  });

  it("should replace multiple placeholders in same text", () => {
    const result = replacePlaceholders(
      "Transfert par {{driver}} avec {{plate}}",
      fullContext
    );
    expect(result).toBe("Transfert par John Doe avec AB-123-CD");
  });

  it("should return original text when no placeholders", () => {
    const result = replacePlaceholders("Transfert simple", fullContext);
    expect(result).toBe("Transfert simple");
  });

  it("should handle null driver name with [Non assigné]", () => {
    const context: MissionContext = {
      ...fullContext,
      driverName: null,
    };
    const result = replacePlaceholders("Transfert par {{driver}}", context);
    expect(result).toBe("Transfert par [Non assigné]");
  });

  it("should handle null vehicle plate with [Non assigné]", () => {
    const context: MissionContext = {
      ...fullContext,
      vehiclePlate: null,
    };
    const result = replacePlaceholders("Véhicule {{plate}}", context);
    expect(result).toBe("Véhicule [Non assigné]");
  });

  it("should handle null start time with [Non assigné]", () => {
    const context: MissionContext = {
      ...fullContext,
      startAt: null,
    };
    const result = replacePlaceholders("Départ: {{start}}", context);
    expect(result).toBe("Départ: [Non assigné]");
  });

  it("should handle empty text", () => {
    const result = replacePlaceholders("", fullContext);
    expect(result).toBe("");
  });

  it("should handle multiple occurrences of same placeholder", () => {
    const result = replacePlaceholders(
      "{{driver}} - {{driver}}",
      fullContext
    );
    expect(result).toBe("John Doe - John Doe");
  });
});

describe("hasPlaceholders", () => {
  it("should return true when text contains {{driver}}", () => {
    expect(hasPlaceholders("Transfert par {{driver}}")).toBe(true);
  });

  it("should return true when text contains {{plate}}", () => {
    expect(hasPlaceholders("Véhicule {{plate}}")).toBe(true);
  });

  it("should return true when text contains {{start}}", () => {
    expect(hasPlaceholders("Départ: {{start}}")).toBe(true);
  });

  it("should return true when text contains {{end}}", () => {
    expect(hasPlaceholders("Arrivée: {{end}}")).toBe(true);
  });

  it("should return false when text has no placeholders", () => {
    expect(hasPlaceholders("Transfert simple")).toBe(false);
  });

  it("should return false for empty text", () => {
    expect(hasPlaceholders("")).toBe(false);
  });

  it("should return true when text contains multiple placeholders", () => {
    expect(hasPlaceholders("{{driver}} avec {{plate}}")).toBe(true);
  });
});

describe("findPlaceholders", () => {
  it("should find single placeholder", () => {
    const result = findPlaceholders("Transfert par {{driver}}");
    expect(result).toEqual(["{{driver}}"]);
  });

  it("should find multiple placeholders", () => {
    const result = findPlaceholders("{{driver}} avec {{plate}} à {{start}}");
    expect(result).toEqual(["{{driver}}", "{{plate}}", "{{start}}"]);
  });

  it("should return empty array when no placeholders", () => {
    const result = findPlaceholders("Transfert simple");
    expect(result).toEqual([]);
  });

  it("should return empty array for empty text", () => {
    const result = findPlaceholders("");
    expect(result).toEqual([]);
  });
});

describe("replaceAllPlaceholders", () => {
  const context: MissionContext = {
    driverName: "John Doe",
    vehiclePlate: "AB-123-CD",
    startAt: null,
    endAt: null,
  };

  it("should replace placeholders in all lines", () => {
    const lines = [
      { id: "1", description: "Transfert par {{driver}}" },
      { id: "2", description: "Véhicule {{plate}}" },
    ];

    const result = replaceAllPlaceholders(lines, context);

    expect(result[0].description).toBe("Transfert par John Doe");
    expect(result[1].description).toBe("Véhicule AB-123-CD");
  });

  it("should preserve other properties", () => {
    const lines = [
      { id: "1", description: "{{driver}}", quantity: 2 },
    ];

    const result = replaceAllPlaceholders(lines, context);

    expect(result[0].id).toBe("1");
    expect(result[0].quantity).toBe(2);
  });

  it("should return new array (immutable)", () => {
    const lines = [{ id: "1", description: "{{driver}}" }];
    const result = replaceAllPlaceholders(lines, context);

    expect(result).not.toBe(lines);
    expect(result[0]).not.toBe(lines[0]);
  });

  it("should handle empty array", () => {
    const result = replaceAllPlaceholders([], context);
    expect(result).toEqual([]);
  });
});
