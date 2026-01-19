import type { Prisma } from "@prisma/client";
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

// ============================================================================
// Helpers
// ============================================================================

const transformBlockTemplate = (template: any) => ({
	id: template.id,
	label: template.label,
	data: template.data,
	createdAt: template.createdAt.toISOString(),
	updatedAt: template.updatedAt.toISOString(),
});

// ============================================================================
// Validation Schemas
// ============================================================================

const listBlockTemplatesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(50),
	search: z.string().optional(),
});

const createBlockTemplateSchema = z.object({
	label: z.string().min(1, "Label is required").max(100, "Label too long"),
	data: z.record(z.any()),
});

// ============================================================================
// Router
// ============================================================================

export const blockTemplatesRouter = new Hono()
	.basePath("/quotes/block-templates")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// GET /api/vtc/quotes/block-templates - List all templates
	// -------------------------------------------------------------------------
	.get(
		"/",
		validator("query", listBlockTemplatesSchema),
		describeRoute({
			summary: "List block templates",
			description: "Get a list of block templates for the current organization",
			tags: ["VTC - Block Templates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, search } = c.req.valid("query");

			const skip = (page - 1) * limit;

			const where = withTenantFilter(
				{
					...(search && {
						label: { contains: search, mode: "insensitive" as const },
					}),
				},
				organizationId,
			);

			const [templates, total] = await Promise.all([
				db.blockTemplate.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ createdAt: "desc" }],
				}),
				db.blockTemplate.count({ where }),
			]);

			return c.json({
				data: templates.map(transformBlockTemplate),
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// -------------------------------------------------------------------------
	// POST /api/vtc/quotes/block-templates - Create template
	// -------------------------------------------------------------------------
	.post(
		"/",
		validator("json", createBlockTemplateSchema),
		describeRoute({
			summary: "Create block template",
			description: "Create a new block template",
			tags: ["VTC - Block Templates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			const template = await db.blockTemplate.create({
				data: withTenantCreate(
					{
						label: data.label,
						data: data.data as Prisma.InputJsonValue,
					},
					organizationId,
				),
			});

			return c.json(transformBlockTemplate(template), 201);
		},
	)

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/quotes/block-templates/:id - Delete template
	// -------------------------------------------------------------------------
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete block template",
			description: "Delete a block template",
			tags: ["VTC - Block Templates"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.blockTemplate.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Template not found",
				});
			}

			await db.blockTemplate.delete({
				where: withTenantId(id, organizationId),
			});

			return c.json({ success: true });
		},
	);
