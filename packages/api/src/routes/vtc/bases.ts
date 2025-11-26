import { db } from "@repo/database";
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

// Validation schemas
const createBaseSchema = z.object({
	name: z.string().min(1).max(100),
	addressLine1: z.string().min(1).max(255),
	addressLine2: z.string().max(255).optional().nullable(),
	city: z.string().min(1).max(100),
	postalCode: z.string().min(1).max(20),
	countryCode: z.string().length(2).default("FR"),
	latitude: z.number().min(-90).max(90),
	longitude: z.number().min(-180).max(180),
	isActive: z.boolean().default(true),
});

const updateBaseSchema = createBaseSchema.partial();

const listBasesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	isActive: z.enum(["true", "false"]).optional(),
});

export const basesRouter = new Hono()
	.basePath("/bases")
	.use("*", organizationMiddleware)

	// List operating bases
	.get(
		"/",
		validator("query", listBasesSchema),
		describeRoute({
			summary: "List operating bases",
			description:
				"Get a paginated list of operating bases for the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, search, isActive } = c.req.valid("query");

			const skip = (page - 1) * limit;

			const where = withTenantFilter(
				{
					...(search && {
						OR: [
							{ name: { contains: search, mode: "insensitive" as const } },
							{ city: { contains: search, mode: "insensitive" as const } },
							{
								addressLine1: { contains: search, mode: "insensitive" as const },
							},
						],
					}),
					...(isActive !== undefined && { isActive: isActive === "true" }),
				},
				organizationId,
			);

			const [bases, total] = await Promise.all([
				db.operatingBase.findMany({
					where,
					skip,
					take: limit,
					orderBy: { name: "asc" },
					include: {
						_count: {
							select: {
								vehicles: true,
							},
						},
					},
				}),
				db.operatingBase.count({ where }),
			]);

			return c.json({
				data: bases,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single operating base
	.get(
		"/:id",
		describeRoute({
			summary: "Get operating base",
			description: "Get a single operating base by ID with linked vehicles",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const base = await db.operatingBase.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					vehicles: {
						take: 20,
						orderBy: { createdAt: "desc" },
						include: {
							vehicleCategory: true,
						},
					},
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			if (!base) {
				throw new HTTPException(404, {
					message: "Operating base not found",
				});
			}

			return c.json(base);
		},
	)

	// Create operating base
	.post(
		"/",
		validator("json", createBaseSchema),
		describeRoute({
			summary: "Create operating base",
			description: "Create a new operating base in the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			const base = await db.operatingBase.create({
				data: withTenantCreate(data, organizationId),
				include: {
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			return c.json(base, 201);
		},
	)

	// Update operating base
	.patch(
		"/:id",
		validator("json", updateBaseSchema),
		describeRoute({
			summary: "Update operating base",
			description: "Update an existing operating base",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.operatingBase.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Operating base not found",
				});
			}

			const base = await db.operatingBase.update({
				where: { id },
				data,
				include: {
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			return c.json(base);
		},
	)

	// Delete operating base
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete operating base",
			description:
				"Delete an operating base by ID. Cannot delete if vehicles are linked.",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.operatingBase.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					_count: {
						select: {
							vehicles: true,
						},
					},
				},
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Operating base not found",
				});
			}

			if (existing._count.vehicles > 0) {
				throw new HTTPException(400, {
					message:
						"Cannot delete operating base with linked vehicles. Remove or reassign vehicles first.",
				});
			}

			await db.operatingBase.delete({
				where: { id },
			});

			return c.json({ success: true });
		},
	);
