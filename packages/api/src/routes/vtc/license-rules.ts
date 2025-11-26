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
const createLicenseRuleSchema = z.object({
	licenseCategoryId: z.string().min(1),
	maxDailyDrivingHours: z.number().positive().max(24),
	maxDailyAmplitudeHours: z.number().positive().max(24),
	breakMinutesPerDrivingBlock: z.number().int().positive().max(120),
	drivingBlockHoursForBreak: z.number().positive().max(12),
	cappedAverageSpeedKmh: z.number().int().positive().max(150).optional().nullable(),
});

const updateLicenseRuleSchema = createLicenseRuleSchema.partial().omit({
	licenseCategoryId: true,
});

const listLicenseRulesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	licenseCategoryId: z.string().optional(),
});

export const licenseRulesRouter = new Hono()
	.basePath("/license-rules")
	.use("*", organizationMiddleware)

	// List license rules
	.get(
		"/",
		validator("query", listLicenseRulesSchema),
		describeRoute({
			summary: "List license rules",
			description:
				"Get a paginated list of RSE rules for the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, licenseCategoryId } = c.req.valid("query");

			const skip = (page - 1) * limit;

			const where = withTenantFilter(
				{
					...(licenseCategoryId && { licenseCategoryId }),
				},
				organizationId
			);

			const [rules, total] = await Promise.all([
				db.organizationLicenseRule.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						licenseCategory: true,
					},
				}),
				db.organizationLicenseRule.count({ where }),
			]);

			return c.json({
				data: rules,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		}
	)

	// Get single license rule
	.get(
		"/:id",
		describeRoute({
			summary: "Get license rule",
			description: "Get a single RSE rule by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const rule = await db.organizationLicenseRule.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					licenseCategory: true,
				},
			});

			if (!rule) {
				throw new HTTPException(404, {
					message: "License rule not found",
				});
			}

			return c.json(rule);
		}
	)

	// Create license rule
	.post(
		"/",
		validator("json", createLicenseRuleSchema),
		describeRoute({
			summary: "Create license rule",
			description: "Create a new RSE rule for a license category",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify license category exists and belongs to this organization
			const category = await db.licenseCategory.findFirst({
				where: withTenantId(data.licenseCategoryId, organizationId),
			});

			if (!category) {
				throw new HTTPException(400, {
					message: "License category not found",
				});
			}

			// Check for existing rule for this license category
			const existing = await db.organizationLicenseRule.findFirst({
				where: {
					organizationId,
					licenseCategoryId: data.licenseCategoryId,
				},
			});

			if (existing) {
				throw new HTTPException(400, {
					message: `RSE rule already exists for license category "${category.code}". Use PATCH to update.`,
				});
			}

			const rule = await db.organizationLicenseRule.create({
				data: withTenantCreate(data, organizationId),
				include: {
					licenseCategory: true,
				},
			});

			return c.json(rule, 201);
		}
	)

	// Update license rule
	.patch(
		"/:id",
		validator("json", updateLicenseRuleSchema),
		describeRoute({
			summary: "Update license rule",
			description: "Update an existing RSE rule",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.organizationLicenseRule.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "License rule not found",
				});
			}

			const rule = await db.organizationLicenseRule.update({
				where: { id },
				data,
				include: {
					licenseCategory: true,
				},
			});

			return c.json(rule);
		}
	)

	// Delete license rule
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete license rule",
			description: "Delete an RSE rule by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.organizationLicenseRule.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "License rule not found",
				});
			}

			await db.organizationLicenseRule.delete({
				where: { id },
			});

			return c.json({ success: true });
		}
	);
