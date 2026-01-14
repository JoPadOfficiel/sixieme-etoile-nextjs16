import { describe, it, expect } from "vitest";
import { isAirportAddress, detectAirportType } from "../useScenarioHelpers";

describe("useScenarioHelpers", () => {
  describe("isAirportAddress", () => {
    it("should return true for CDG", () => {
      expect(isAirportAddress("Charles de Gaulle Airport")).toBe(true);
      expect(isAirportAddress("Roissy")).toBe(true);
    });

    it("should return true for Orly", () => {
      expect(isAirportAddress("Orly Airport")).toBe(true);
    });

    it("should return false for regular address", () => {
      expect(isAirportAddress("123 Rue de Rivoli, Paris")).toBe(false);
    });
  });

  describe("detectAirportType", () => {
    it("should detect CDG", () => {
      expect(detectAirportType("Charles de Gaulle")).toBe("CDG");
      expect(detectAirportType("Roissy")).toBe("CDG");
    });

    it("should detect ORLY", () => {
      expect(detectAirportType("Orly")).toBe("ORLY");
    });

    it("should detect LE_BOURGET", () => {
      expect(detectAirportType("Le Bourget")).toBe("LE_BOURGET");
    });

    it("should return OTHER for generic airport terms", () => {
      expect(detectAirportType("Airport pickup")).toBe("OTHER");
    });

    it("should return null for non-airport address", () => {
      expect(detectAirportType("Paris Center")).toBeNull();
    });
  });
});
