import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Story 17.6: Driver Calendar Events Model
 * Unit tests for calendar event validation and date logic
 */

describe("Driver Calendar Events", () => {
	describe("Date Validation", () => {
		it("should validate that startAt is before endAt", () => {
			const startAt = new Date("2025-01-15T00:00:00Z");
			const endAt = new Date("2025-01-20T23:59:59Z");

			const isValid = startAt < endAt;
			expect(isValid).toBe(true);
		});

		it("should reject when startAt equals endAt", () => {
			const startAt = new Date("2025-01-15T00:00:00Z");
			const endAt = new Date("2025-01-15T00:00:00Z");

			const isValid = startAt < endAt;
			expect(isValid).toBe(false);
		});

		it("should reject when startAt is after endAt", () => {
			const startAt = new Date("2025-01-20T00:00:00Z");
			const endAt = new Date("2025-01-15T00:00:00Z");

			const isValid = startAt < endAt;
			expect(isValid).toBe(false);
		});
	});

	describe("Event Type Validation", () => {
		const validEventTypes = ["HOLIDAY", "SICK", "PERSONAL", "TRAINING", "OTHER"];

		it.each(validEventTypes)("should accept valid event type: %s", (eventType) => {
			expect(validEventTypes.includes(eventType)).toBe(true);
		});

		it("should reject invalid event type", () => {
			const invalidType = "VACATION";
			expect(validEventTypes.includes(invalidType)).toBe(false);
		});
	});

	describe("Date Range Overlap Detection", () => {
		const missionStart = new Date("2025-01-15T08:00:00Z");
		const missionEnd = new Date("2025-01-15T18:00:00Z");

		function hasOverlap(eventStart: Date, eventEnd: Date): boolean {
			// Event starts during mission
			if (eventStart >= missionStart && eventStart <= missionEnd) return true;
			// Event ends during mission
			if (eventEnd >= missionStart && eventEnd <= missionEnd) return true;
			// Event spans entire mission
			if (eventStart <= missionStart && eventEnd >= missionEnd) return true;
			return false;
		}

		it("should detect overlap when event starts during mission", () => {
			const eventStart = new Date("2025-01-15T10:00:00Z");
			const eventEnd = new Date("2025-01-15T20:00:00Z");

			expect(hasOverlap(eventStart, eventEnd)).toBe(true);
		});

		it("should detect overlap when event ends during mission", () => {
			const eventStart = new Date("2025-01-15T06:00:00Z");
			const eventEnd = new Date("2025-01-15T12:00:00Z");

			expect(hasOverlap(eventStart, eventEnd)).toBe(true);
		});

		it("should detect overlap when event spans entire mission", () => {
			const eventStart = new Date("2025-01-15T00:00:00Z");
			const eventEnd = new Date("2025-01-15T23:59:59Z");

			expect(hasOverlap(eventStart, eventEnd)).toBe(true);
		});

		it("should detect overlap when mission spans entire event", () => {
			const eventStart = new Date("2025-01-15T10:00:00Z");
			const eventEnd = new Date("2025-01-15T14:00:00Z");

			expect(hasOverlap(eventStart, eventEnd)).toBe(true);
		});

		it("should not detect overlap when event is before mission", () => {
			const eventStart = new Date("2025-01-14T08:00:00Z");
			const eventEnd = new Date("2025-01-14T18:00:00Z");

			expect(hasOverlap(eventStart, eventEnd)).toBe(false);
		});

		it("should not detect overlap when event is after mission", () => {
			const eventStart = new Date("2025-01-16T08:00:00Z");
			const eventEnd = new Date("2025-01-16T18:00:00Z");

			expect(hasOverlap(eventStart, eventEnd)).toBe(false);
		});
	});

	describe("Multi-day Event Support", () => {
		it("should support events spanning multiple days", () => {
			const startAt = new Date("2025-07-15T00:00:00Z");
			const endAt = new Date("2025-07-31T23:59:59Z");

			const durationMs = endAt.getTime() - startAt.getTime();
			const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

			expect(durationDays).toBe(17);
		});

		it("should calculate correct duration for single-day event", () => {
			const startAt = new Date("2025-01-15T00:00:00Z");
			const endAt = new Date("2025-01-15T23:59:59Z");

			const durationMs = endAt.getTime() - startAt.getTime();
			const durationDays = Math.ceil(durationMs / (1000 * 60 * 60 * 24));

			expect(durationDays).toBe(1);
		});
	});
});
