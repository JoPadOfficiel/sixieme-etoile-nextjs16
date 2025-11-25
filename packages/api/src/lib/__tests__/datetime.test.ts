import { describe, expect, it } from "vitest";
import {
  TIMEZONE,
  DATETIME_LOCALE,
  formatParisDateTime,
  formatParisDate,
  formatParisTime,
  formatParisDateLong,
  formatParisDateTimeLong,
  parseParisDateTime,
  parseParisDate,
  parseParisTime,
  toISOStringNoOffset,
  toISODateString,
  isValidDate,
  isValidParisDateTimeString,
  isValidParisDateString,
  combineDateAndTime,
  getRelativeTime,
} from "../datetime";

describe("DateTime Utilities - Europe/Paris Business Time", () => {
  describe("Constants", () => {
    it("should have correct timezone constant", () => {
      expect(TIMEZONE).toBe("Europe/Paris");
    });

    it("should have correct locale constant", () => {
      expect(DATETIME_LOCALE).toBe("fr-FR");
    });
  });

  describe("formatParisDateTime", () => {
    it("should format Date object to French datetime format", () => {
      const date = new Date(2025, 5, 15, 14, 30, 0); // June 15, 2025 14:30
      const result = formatParisDateTime(date);
      expect(result).toBe("15/06/2025 14:30");
    });

    it("should format ISO string to French datetime format", () => {
      const result = formatParisDateTime("2025-06-15T14:30:00");
      expect(result).toBe("15/06/2025 14:30");
    });

    it("should handle midnight correctly", () => {
      const date = new Date(2025, 0, 1, 0, 0, 0); // Jan 1, 2025 00:00
      const result = formatParisDateTime(date);
      expect(result).toBe("01/01/2025 00:00");
    });

    it("should handle noon correctly", () => {
      const date = new Date(2025, 11, 25, 12, 0, 0); // Dec 25, 2025 12:00
      const result = formatParisDateTime(date);
      expect(result).toBe("25/12/2025 12:00");
    });

    it("should return empty string for null", () => {
      expect(formatParisDateTime(null)).toBe("");
    });

    it("should return empty string for undefined", () => {
      expect(formatParisDateTime(undefined)).toBe("");
    });

    it("should return empty string for invalid date string", () => {
      expect(formatParisDateTime("invalid")).toBe("");
    });
  });

  describe("formatParisDate", () => {
    it("should format Date object to French date format", () => {
      const date = new Date(2025, 5, 15, 14, 30, 0);
      const result = formatParisDate(date);
      expect(result).toBe("15/06/2025");
    });

    it("should format ISO date string", () => {
      const result = formatParisDate("2025-06-15");
      expect(result).toBe("15/06/2025");
    });

    it("should return empty string for null", () => {
      expect(formatParisDate(null)).toBe("");
    });
  });

  describe("formatParisTime", () => {
    it("should format Date object to time format", () => {
      const date = new Date(2025, 5, 15, 14, 30, 0);
      const result = formatParisTime(date);
      expect(result).toBe("14:30");
    });

    it("should format single-digit hours with leading zero", () => {
      const date = new Date(2025, 5, 15, 9, 5, 0);
      const result = formatParisTime(date);
      expect(result).toBe("09:05");
    });

    it("should handle midnight", () => {
      const date = new Date(2025, 5, 15, 0, 0, 0);
      const result = formatParisTime(date);
      expect(result).toBe("00:00");
    });

    it("should return empty string for null", () => {
      expect(formatParisTime(null)).toBe("");
    });
  });

  describe("formatParisDateLong", () => {
    it("should format to long French date", () => {
      const date = new Date(2025, 5, 15);
      const result = formatParisDateLong(date);
      expect(result).toBe("15 juin 2025");
    });

    it("should handle December", () => {
      const date = new Date(2025, 11, 25);
      const result = formatParisDateLong(date);
      expect(result).toBe("25 décembre 2025");
    });
  });

  describe("formatParisDateTimeLong", () => {
    it("should format to long French datetime", () => {
      const date = new Date(2025, 5, 15, 14, 30);
      const result = formatParisDateTimeLong(date);
      // Note: The exact format may vary slightly based on Intl implementation
      expect(result).toContain("15");
      expect(result).toContain("juin");
      expect(result).toContain("2025");
      expect(result).toContain("14:30");
    });
  });

  describe("parseParisDateTime", () => {
    it("should parse French datetime format", () => {
      const result = parseParisDateTime("15/06/2025 14:30");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5); // June (0-indexed)
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it("should parse midnight correctly", () => {
      const result = parseParisDateTime("01/01/2025 00:00");
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("should throw for empty input", () => {
      expect(() => parseParisDateTime("")).toThrow("Invalid datetime: empty input");
    });

    it("should throw for invalid format", () => {
      expect(() => parseParisDateTime("2025-06-15 14:30")).toThrow("Invalid datetime format");
    });

    it("should throw for invalid month", () => {
      expect(() => parseParisDateTime("15/13/2025 14:30")).toThrow("Invalid month");
    });

    it("should throw for invalid day", () => {
      expect(() => parseParisDateTime("32/06/2025 14:30")).toThrow("Invalid day");
    });

    it("should throw for invalid hour", () => {
      expect(() => parseParisDateTime("15/06/2025 25:30")).toThrow("Invalid hour");
    });

    it("should throw for invalid minute", () => {
      expect(() => parseParisDateTime("15/06/2025 14:60")).toThrow("Invalid minute");
    });

    it("should throw for invalid date like 31/02", () => {
      expect(() => parseParisDateTime("31/02/2025 14:30")).toThrow("Invalid date");
    });
  });

  describe("parseParisDate", () => {
    it("should parse French date format", () => {
      const result = parseParisDate("15/06/2025");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
    });

    it("should throw for invalid format", () => {
      expect(() => parseParisDate("2025-06-15")).toThrow("Invalid date format");
    });

    it("should throw for empty input", () => {
      expect(() => parseParisDate("")).toThrow("Invalid date: empty input");
    });
  });

  describe("parseParisTime", () => {
    it("should parse time format", () => {
      const result = parseParisTime("14:30");
      expect(result.hours).toBe(14);
      expect(result.minutes).toBe(30);
    });

    it("should parse midnight", () => {
      const result = parseParisTime("00:00");
      expect(result.hours).toBe(0);
      expect(result.minutes).toBe(0);
    });

    it("should parse 23:59", () => {
      const result = parseParisTime("23:59");
      expect(result.hours).toBe(23);
      expect(result.minutes).toBe(59);
    });

    it("should throw for invalid format", () => {
      expect(() => parseParisTime("2:30 PM")).toThrow("Invalid time format");
    });

    it("should throw for invalid hour", () => {
      expect(() => parseParisTime("24:00")).toThrow("Invalid hour");
    });
  });

  describe("toISOStringNoOffset", () => {
    it("should return ISO string without offset", () => {
      const date = new Date(2025, 5, 15, 14, 30, 45);
      const result = toISOStringNoOffset(date);
      expect(result).toBe("2025-06-15T14:30:45");
    });

    it("should pad single-digit values", () => {
      const date = new Date(2025, 0, 5, 9, 5, 3);
      const result = toISOStringNoOffset(date);
      expect(result).toBe("2025-01-05T09:05:03");
    });
  });

  describe("toISODateString", () => {
    it("should return date-only ISO string", () => {
      const date = new Date(2025, 5, 15, 14, 30);
      const result = toISODateString(date);
      expect(result).toBe("2025-06-15");
    });
  });

  describe("isValidDate", () => {
    it("should return true for valid Date", () => {
      expect(isValidDate(new Date())).toBe(true);
    });

    it("should return false for Invalid Date", () => {
      expect(isValidDate(new Date("invalid"))).toBe(false);
    });

    it("should return false for non-Date values", () => {
      expect(isValidDate("2025-06-15")).toBe(false);
      expect(isValidDate(null)).toBe(false);
      expect(isValidDate(undefined)).toBe(false);
      expect(isValidDate(123)).toBe(false);
    });
  });

  describe("isValidParisDateTimeString", () => {
    it("should return true for valid French datetime", () => {
      expect(isValidParisDateTimeString("15/06/2025 14:30")).toBe(true);
    });

    it("should return false for invalid format", () => {
      expect(isValidParisDateTimeString("2025-06-15 14:30")).toBe(false);
    });

    it("should return false for invalid date", () => {
      expect(isValidParisDateTimeString("31/02/2025 14:30")).toBe(false);
    });
  });

  describe("isValidParisDateString", () => {
    it("should return true for valid French date", () => {
      expect(isValidParisDateString("15/06/2025")).toBe(true);
    });

    it("should return false for invalid format", () => {
      expect(isValidParisDateString("2025-06-15")).toBe(false);
    });
  });

  describe("combineDateAndTime", () => {
    it("should combine date and time", () => {
      const date = new Date(2025, 5, 15);
      const result = combineDateAndTime(date, "14:30");
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it("should work with ISO date string", () => {
      const result = combineDateAndTime("2025-06-15", "09:00");
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(9);
      expect(result.getMinutes()).toBe(0);
    });
  });

  describe("getRelativeTime", () => {
    it("should return 'aujourd'hui' for today", () => {
      const today = new Date();
      expect(getRelativeTime(today, today)).toBe("aujourd'hui");
    });

    it("should return 'demain' for tomorrow", () => {
      const today = new Date(2025, 5, 15, 12, 0);
      const tomorrow = new Date(2025, 5, 16, 12, 0);
      expect(getRelativeTime(tomorrow, today)).toBe("demain");
    });

    it("should return 'hier' for yesterday", () => {
      const today = new Date(2025, 5, 15, 12, 0);
      const yesterday = new Date(2025, 5, 14, 12, 0);
      expect(getRelativeTime(yesterday, today)).toBe("hier");
    });

    it("should return 'dans X jours' for near future", () => {
      const today = new Date(2025, 5, 15, 12, 0);
      const future = new Date(2025, 5, 18, 12, 0);
      expect(getRelativeTime(future, today)).toBe("dans 3 jours");
    });

    it("should return 'il y a X jours' for near past", () => {
      const today = new Date(2025, 5, 15, 12, 0);
      const past = new Date(2025, 5, 12, 12, 0);
      expect(getRelativeTime(past, today)).toBe("il y a 3 jours");
    });
  });

  describe("Round-trip: format -> parse -> format", () => {
    it("should preserve datetime through round-trip", () => {
      const original = new Date(2025, 5, 15, 14, 30, 0);
      const formatted = formatParisDateTime(original);
      const parsed = parseParisDateTime(formatted);
      const reformatted = formatParisDateTime(parsed);

      expect(reformatted).toBe(formatted);
      expect(parsed.getFullYear()).toBe(original.getFullYear());
      expect(parsed.getMonth()).toBe(original.getMonth());
      expect(parsed.getDate()).toBe(original.getDate());
      expect(parsed.getHours()).toBe(original.getHours());
      expect(parsed.getMinutes()).toBe(original.getMinutes());
    });

    it("should preserve date through round-trip", () => {
      const original = new Date(2025, 11, 25, 0, 0, 0);
      const formatted = formatParisDate(original);
      const parsed = parseParisDate(formatted);
      const reformatted = formatParisDate(parsed);

      expect(reformatted).toBe(formatted);
    });
  });

  describe("Edge cases", () => {
    it("should handle end of year", () => {
      const date = new Date(2025, 11, 31, 23, 59, 0);
      expect(formatParisDateTime(date)).toBe("31/12/2025 23:59");
    });

    it("should handle start of year", () => {
      const date = new Date(2025, 0, 1, 0, 0, 0);
      expect(formatParisDateTime(date)).toBe("01/01/2025 00:00");
    });

    it("should handle leap year date", () => {
      const date = new Date(2024, 1, 29, 12, 0, 0); // Feb 29, 2024
      expect(formatParisDate(date)).toBe("29/02/2024");
    });
  });
});
