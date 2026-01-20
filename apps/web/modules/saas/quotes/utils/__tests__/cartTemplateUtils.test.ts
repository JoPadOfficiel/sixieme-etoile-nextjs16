/**
 * Story 26.21: Cart Template Utilities Tests
 *
 * Tests for serialization and deserialization of cart templates.
 */

import { describe, expect, it } from "vitest";
import type { QuoteLine } from "../../components/yolo/dnd-utils";
import {
	type FullQuoteTemplateData,
	deserializeTemplateToCart,
	isValidFullQuoteTemplate,
	serializeCartToTemplate,
} from "../cartTemplateUtils";

describe("cartTemplateUtils", () => {
	// Sample cart lines for testing
	const sampleCartLines: QuoteLine[] = [
		{
			id: "line-1",
			type: "GROUP",
			label: "Day 1 - Paris Tour",
			description: "First day package",
			quantity: 1,
			unitPrice: 0,
			totalPrice: 350,
			vatRate: 10,
			sortOrder: 0,
			parentId: null,
			displayData: {
				label: "Day 1 - Paris Tour",
				quantity: 1,
				unitPrice: 0,
				vatRate: 10,
				total: 350,
			},
		},
		{
			id: "line-2",
			type: "CALCULATED",
			label: "Airport Transfer CDG → Hotel",
			description: "Standard transfer",
			quantity: 1,
			unitPrice: 150,
			totalPrice: 150,
			vatRate: 10,
			sortOrder: 1,
			parentId: "line-1", // Child of GROUP
			displayData: {
				label: "Airport Transfer CDG → Hotel",
				quantity: 1,
				unitPrice: 150,
				vatRate: 10,
				total: 150,
			},
			sourceData: { pickup: "CDG", dropoff: "Hotel Lutetia" }, // Should be cleared
		},
		{
			id: "line-3",
			type: "MANUAL",
			label: "Champagne Welcome",
			description: "Premium champagne bottle",
			quantity: 1,
			unitPrice: 200,
			totalPrice: 200,
			vatRate: 20,
			sortOrder: 2,
			parentId: "line-1", // Child of GROUP
			displayData: {
				label: "Champagne Welcome",
				quantity: 1,
				unitPrice: 200,
				vatRate: 20,
				total: 200,
			},
		},
		{
			tempId: "temp-4", // Using tempId instead of id
			type: "MANUAL",
			label: "Extra Waiting Time",
			description: "",
			quantity: 2,
			unitPrice: 50,
			totalPrice: 100,
			vatRate: 10,
			sortOrder: 3,
			parentId: null, // Top-level
			displayData: {
				label: "Extra Waiting Time",
				quantity: 2,
				unitPrice: 50,
				vatRate: 10,
				total: 100,
			},
		},
	];

	describe("serializeCartToTemplate", () => {
		it("should serialize cart lines to template format", () => {
			const result = serializeCartToTemplate(sampleCartLines);

			expect(result.version).toBe(1);
			expect(result.lines).toHaveLength(4);
		});

		it("should generate sequential template IDs", () => {
			const result = serializeCartToTemplate(sampleCartLines);

			expect(result.lines[0].tempId).toBe("tpl-1");
			expect(result.lines[1].tempId).toBe("tpl-2");
			expect(result.lines[2].tempId).toBe("tpl-3");
			expect(result.lines[3].tempId).toBe("tpl-4");
		});

		it("should correctly map parent-child relationships", () => {
			const result = serializeCartToTemplate(sampleCartLines);

			// Group has no parent
			expect(result.lines[0].parentId).toBe(null);
			// Children point to the group's new template ID
			expect(result.lines[1].parentId).toBe("tpl-1");
			expect(result.lines[2].parentId).toBe("tpl-1");
			// Top-level manual line has no parent
			expect(result.lines[3].parentId).toBe(null);
		});

		it("should preserve line types", () => {
			const result = serializeCartToTemplate(sampleCartLines);

			expect(result.lines[0].type).toBe("GROUP");
			expect(result.lines[1].type).toBe("CALCULATED");
			expect(result.lines[2].type).toBe("MANUAL");
			expect(result.lines[3].type).toBe("MANUAL");
		});

		it("should preserve displayData", () => {
			const result = serializeCartToTemplate(sampleCartLines);

			expect(result.lines[0].displayData.label).toBe("Day 1 - Paris Tour");
			expect(result.lines[1].displayData.unitPrice).toBe(150);
			expect(result.lines[2].displayData.vatRate).toBe(20);
		});

		it("should NOT include sourceData in template", () => {
			const result = serializeCartToTemplate(sampleCartLines);

			// sourceData should not be present in any template line
			for (const line of result.lines) {
				expect(line).not.toHaveProperty("sourceData");
			}
		});

		it("should handle empty cart", () => {
			const result = serializeCartToTemplate([]);

			expect(result.version).toBe(1);
			expect(result.lines).toHaveLength(0);
		});
	});

	describe("deserializeTemplateToCart", () => {
		let templateData: FullQuoteTemplateData;

		beforeEach(() => {
			templateData = serializeCartToTemplate(sampleCartLines);
		});

		it("should deserialize template to cart lines", () => {
			const result = deserializeTemplateToCart(templateData);

			expect(result).toHaveLength(4);
		});

		it("should generate new unique IDs", () => {
			const result = deserializeTemplateToCart(templateData);

			// All IDs should be unique and different from original template IDs
			const ids = result.map((l) => l.tempId);
			expect(new Set(ids).size).toBe(4);

			// IDs should follow the imported-* pattern
			for (const line of result) {
				expect(line.tempId).toMatch(/^imported-\d+-\d+$/);
			}
		});

		it("should correctly map parent-child relationships with new IDs", () => {
			const result = deserializeTemplateToCart(templateData);

			// Group (index 0) has no parent
			expect(result[0].parentId).toBe(null);

			// Children should point to the new ID of the group
			const groupNewId = result[0].tempId;
			expect(result[1].parentId).toBe(groupNewId);
			expect(result[2].parentId).toBe(groupNewId);

			// Top-level line has no parent
			expect(result[3].parentId).toBe(null);
		});

		it("should set sortOrder starting from 0 by default", () => {
			const result = deserializeTemplateToCart(templateData);

			expect(result[0].sortOrder).toBe(0);
			expect(result[1].sortOrder).toBe(1);
			expect(result[2].sortOrder).toBe(2);
			expect(result[3].sortOrder).toBe(3);
		});

		it("should support custom start sortOrder for 'Add to Cart' mode", () => {
			const result = deserializeTemplateToCart(templateData, 10);

			expect(result[0].sortOrder).toBe(10);
			expect(result[1].sortOrder).toBe(11);
			expect(result[2].sortOrder).toBe(12);
			expect(result[3].sortOrder).toBe(13);
		});

		it("should NOT include sourceData", () => {
			const result = deserializeTemplateToCart(templateData);

			for (const line of result) {
				expect(line.sourceData).toBeUndefined();
			}
		});

		it("should preserve line types and labels", () => {
			const result = deserializeTemplateToCart(templateData);

			expect(result[0].type).toBe("GROUP");
			expect(result[0].label).toBe("Day 1 - Paris Tour");
			expect(result[1].type).toBe("CALCULATED");
			expect(result[2].label).toBe("Champagne Welcome");
		});
	});

	describe("Round-trip: serialize -> deserialize", () => {
		it("should preserve structure through round-trip", () => {
			const template = serializeCartToTemplate(sampleCartLines);
			const restored = deserializeTemplateToCart(template);

			// Same number of lines
			expect(restored).toHaveLength(sampleCartLines.length);

			// Same types
			expect(restored.map((l) => l.type)).toEqual(
				sampleCartLines.map((l) => l.type),
			);

			// Same labels
			expect(restored.map((l) => l.label)).toEqual(
				sampleCartLines.map((l) => l.label),
			);

			// Parent-child structure preserved
			// Line 1 and 2 should have the same parent (the group)
			expect(restored[1].parentId).toBe(restored[0].tempId);
			expect(restored[2].parentId).toBe(restored[0].tempId);
		});
	});

	describe("isValidFullQuoteTemplate", () => {
		it("should validate correct template data", () => {
			const template = serializeCartToTemplate(sampleCartLines);
			expect(isValidFullQuoteTemplate(template)).toBe(true);
		});

		it("should reject null", () => {
			expect(isValidFullQuoteTemplate(null)).toBe(false);
		});

		it("should reject non-object", () => {
			expect(isValidFullQuoteTemplate("string")).toBe(false);
			expect(isValidFullQuoteTemplate(123)).toBe(false);
		});

		it("should reject wrong version", () => {
			expect(isValidFullQuoteTemplate({ version: 2, lines: [] })).toBe(false);
		});

		it("should reject missing lines array", () => {
			expect(isValidFullQuoteTemplate({ version: 1 })).toBe(false);
		});

		it("should reject invalid line type", () => {
			expect(
				isValidFullQuoteTemplate({
					version: 1,
					lines: [
						{
							tempId: "1",
							type: "INVALID",
							label: "Test",
							quantity: 1,
							unitPrice: 0,
							sortOrder: 0,
						},
					],
				}),
			).toBe(false);
		});

		it("should reject line with missing required fields", () => {
			expect(
				isValidFullQuoteTemplate({
					version: 1,
					lines: [{ tempId: "1", type: "MANUAL" }], // Missing label, quantity, etc.
				}),
			).toBe(false);
		});

		it("should accept empty lines array", () => {
			expect(isValidFullQuoteTemplate({ version: 1, lines: [] })).toBe(true);
		});
	});
});
