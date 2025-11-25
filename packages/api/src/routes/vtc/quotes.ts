import { db } from "@repo/database";
import type { Prisma } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
	withTenantCreate,
	withTenantFilter,
	withTenantId,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";

// Validation schemas with EUR documentation
const createQuoteSchema = z.object({
	contactId: z.string().min(1).describe("Contact ID for the quote"),
	vehicleCategoryId: z.string().min(1).describe("Vehicle category ID"),
	pricingMode: z.enum(["FIXED_GRID", "DYNAMIC"]).describe("Pricing mode: FIXED_GRID (Method 1) or DYNAMIC (Method 2)"),
	tripType: z.enum(["TRANSFER", "EXCURSION", "DISPO", "OFF_GRID"]).describe("Type of trip"),
	pickupAt: z.string().datetime().describe("Pickup date/time in Europe/Paris business time"),
	pickupAddress: z.string().min(1).describe("Pickup address"),
	pickupLatitude: z.number().optional().nullable().describe("Pickup latitude"),
	pickupLongitude: z.number().optional().nullable().describe("Pickup longitude"),
	dropoffAddress: z.string().min(1).describe("Dropoff address"),
	dropoffLatitude: z.number().optional().nullable().describe("Dropoff latitude"),
	dropoffLongitude: z.number().optional().nullable().describe("Dropoff longitude"),
	passengerCount: z.number().int().positive().describe("Number of passengers"),
	luggageCount: z.number().int().nonnegative().default(0).describe("Number of luggage pieces"),
	suggestedPrice: z.number().positive().describe("Suggested price in EUR"),
	finalPrice: z.number().positive().describe("Final price in EUR"),
	internalCost: z.number().optional().nullable().describe("Internal cost in EUR (shadow calculation result)"),
	marginPercent: z.number().optional().nullable().describe("Margin percentage"),
	tripAnalysis: z.record(z.unknown()).optional().nullable().describe("Shadow calculation details: segments A/B/C, costs"),
	appliedRules: z.record(z.unknown()).optional().nullable().describe("Applied pricing rules, multipliers, promotions"),
	validUntil: z.string().datetime().optional().nullable().describe("Quote validity date in Europe/Paris business time"),
	notes: z.string().optional().nullable().describe("Additional notes"),
});

const updateQuoteSchema = z.object({
	status: z
		.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"])
		.optional()
		.describe("Quote lifecycle status"),
	finalPrice: z.number().positive().optional().describe("Final price in EUR"),
	notes: z.string().optional().nullable().describe("Additional notes"),
	validUntil: z.string().datetime().optional().nullable().describe("Quote validity date in Europe/Paris business time"),
});

const listQuotesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z
		.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"])
		.optional(),
	contactId: z.string().optional(),
	pricingMode: z.enum(["FIXED_GRID", "DYNAMIC"]).optional(),
});

export const quotesRouter = new Hono()
	.basePath("/quotes")
	.use("*", organizationMiddleware)

	// List quotes
	.get(
		"/",
		validator("query", listQuotesSchema),
		describeRoute({
			summary: "List quotes",
			description: "Get a paginated list of quotes for the current organization",
			tags: ["VTC - Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, status, contactId, pricingMode } =
				c.req.valid("query");

			const skip = (page - 1) * limit;

			const where = withTenantFilter(
				{
					...(status && { status }),
					...(contactId && { contactId }),
					...(pricingMode && { pricingMode }),
				},
				organizationId,
			);

			const [quotes, total] = await Promise.all([
				db.quote.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						contact: true,
						vehicleCategory: true,
					},
				}),
				db.quote.count({ where }),
			]);

			return c.json({
				data: quotes,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single quote
	.get(
		"/:id",
		describeRoute({
			summary: "Get quote",
			description: "Get a single quote by ID",
			tags: ["VTC - Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const quote = await db.quote.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					contact: true,
					vehicleCategory: true,
					invoice: true,
				},
			});

			if (!quote) {
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			return c.json(quote);
		},
	)

	// Create quote
	.post(
		"/",
		validator("json", createQuoteSchema),
		describeRoute({
			summary: "Create quote",
			description: "Create a new quote in the current organization",
			tags: ["VTC - Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify contact belongs to this organization
			const contact = await db.contact.findFirst({
				where: withTenantId(data.contactId, organizationId),
			});

			if (!contact) {
				throw new HTTPException(400, {
					message: "Contact not found",
				});
			}

			// Verify vehicleCategory belongs to this organization
			const category = await db.vehicleCategory.findFirst({
				where: withTenantId(data.vehicleCategoryId, organizationId),
			});

			if (!category) {
				throw new HTTPException(400, {
					message: "Vehicle category not found",
				});
			}

			const quote = await db.quote.create({
				data: withTenantCreate(
					{
						contactId: data.contactId,
						vehicleCategoryId: data.vehicleCategoryId,
						pricingMode: data.pricingMode,
						tripType: data.tripType,
						pickupAt: new Date(data.pickupAt),
						pickupAddress: data.pickupAddress,
						pickupLatitude: data.pickupLatitude,
						pickupLongitude: data.pickupLongitude,
						dropoffAddress: data.dropoffAddress,
						dropoffLatitude: data.dropoffLatitude,
						dropoffLongitude: data.dropoffLongitude,
						passengerCount: data.passengerCount,
						luggageCount: data.luggageCount,
						suggestedPrice: data.suggestedPrice,
						finalPrice: data.finalPrice,
						internalCost: data.internalCost,
						marginPercent: data.marginPercent,
						tripAnalysis: data.tripAnalysis as Prisma.InputJsonValue | undefined,
						appliedRules: data.appliedRules as Prisma.InputJsonValue | undefined,
						validUntil: data.validUntil ? new Date(data.validUntil) : null,
						notes: data.notes,
						status: "DRAFT",
					},
					organizationId,
				),
				include: {
					contact: true,
					vehicleCategory: true,
				},
			});

			return c.json(quote, 201);
		},
	)

	// Update quote
	.patch(
		"/:id",
		validator("json", updateQuoteSchema),
		describeRoute({
			summary: "Update quote",
			description: "Update an existing quote",
			tags: ["VTC - Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.quote.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			const quote = await db.quote.update({
				where: { id },
				data: {
					...data,
					validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
				},
				include: {
					contact: true,
					vehicleCategory: true,
				},
			});

			return c.json(quote);
		},
	)

	// Delete quote (only drafts)
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete quote",
			description: "Delete a draft quote by ID",
			tags: ["VTC - Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.quote.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Quote not found",
				});
			}

			if (existing.status !== "DRAFT") {
				throw new HTTPException(400, {
					message: "Only draft quotes can be deleted",
				});
			}

			await db.quote.delete({
				where: { id },
			});

			return c.json({ success: true });
		},
	);
