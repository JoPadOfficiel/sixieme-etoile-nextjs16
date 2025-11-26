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
const createLicenseCategorySchema = z.object({
	code: z.string().min(1).max(20),
	name: z.string().min(1).max(100),
	description: z.string().max(500).optional().nullable(),
});

const updateLicenseCategorySchema = createLicenseCategorySchema.partial();

const listLicenseCategoriesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
});

export const licenseCategoriesRouter = new Hono()
	.basePath("/license-categories")
	.use("*", organizationMiddleware)

	// List license categories
	.get(
		"/",
		validator("query", listLicenseCategoriesSchema),
		describeRoute({
			summary: "List license categories",
			description:
				"Get a paginated list of license categories for the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit } = c.req.valid("query");

			const skip = (page - 1) * limit;

			const where = withTenantFilter({}, organizationId);

			const [categories, total] = await Promise.all([
				db.licenseCategory.findMany({
					where,
					skip,
					take: limit,
					orderBy: { code: "asc" },
					include: {
						_count: {
							select: {
								driverLicenses: true,
								vehiclesRequiringThis: true,
								organizationRules: true,
							},
						},
					},
				}),
				db.licenseCategory.count({ where }),
			]);

			return c.json({
				data: categories,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		}
	)

	// Get single license category
	.get(
		"/:id",
		describeRoute({
			summary: "Get license category",
			description: "Get a single license category by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const category = await db.licenseCategory.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					organizationRules: true,
					_count: {
						select: {
							driverLicenses: true,
							vehiclesRequiringThis: true,
						},
					},
				},
			});

			if (!category) {
				throw new HTTPException(404, {
					message: "License category not found",
				});
			}

			return c.json(category);
		}
	)

	// Create license category
	.post(
		"/",
		validator("json", createLicenseCategorySchema),
		describeRoute({
			summary: "Create license category",
			description:
				"Create a new license category in the current organization",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Check for duplicate code
			const existing = await db.licenseCategory.findFirst({
				where: {
					organizationId,
					code: data.code,
				},
			});

			if (existing) {
				throw new HTTPException(400, {
					message: `License category with code "${data.code}" already exists`,
				});
			}

			const category = await db.licenseCategory.create({
				data: withTenantCreate(data, organizationId),
				include: {
					_count: {
						select: {
							driverLicenses: true,
							vehiclesRequiringThis: true,
							organizationRules: true,
						},
					},
				},
			});

			return c.json(category, 201);
		}
	)

	// Update license category
	.patch(
		"/:id",
		validator("json", updateLicenseCategorySchema),
		describeRoute({
			summary: "Update license category",
			description: "Update an existing license category",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.licenseCategory.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "License category not found",
				});
			}

			// Check for duplicate code if code is being updated
			if (data.code && data.code !== existing.code) {
				const duplicate = await db.licenseCategory.findFirst({
					where: {
						organizationId,
						code: data.code,
						id: { not: id },
					},
				});

				if (duplicate) {
					throw new HTTPException(400, {
						message: `License category with code "${data.code}" already exists`,
					});
				}
			}

			const category = await db.licenseCategory.update({
				where: { id },
				data,
				include: {
					_count: {
						select: {
							driverLicenses: true,
							vehiclesRequiringThis: true,
							organizationRules: true,
						},
					},
				},
			});

			return c.json(category);
		}
	)

	// Delete license category
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete license category",
			description: "Delete a license category by ID",
			tags: ["VTC - Fleet"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const existing = await db.licenseCategory.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					_count: {
						select: {
							driverLicenses: true,
							vehiclesRequiringThis: true,
						},
					},
				},
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "License category not found",
				});
			}

			// Prevent deletion if in use
			if (
				existing._count.driverLicenses > 0 ||
				existing._count.vehiclesRequiringThis > 0
			) {
				throw new HTTPException(400, {
					message:
						"Cannot delete license category that is in use by drivers or vehicles",
				});
			}

			// Delete associated rules first
			await db.organizationLicenseRule.deleteMany({
				where: {
					organizationId,
					licenseCategoryId: id,
				},
			});

			await db.licenseCategory.delete({
				where: { id },
			});

			return c.json({ success: true });
		}
	);
