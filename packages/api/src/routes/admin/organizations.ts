import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { nanoid } from "nanoid";
import { z } from "zod";
import { adminMiddleware } from "../../middleware/admin";

export const organizationRouter = new Hono()
	.basePath("/organizations")
	.use(adminMiddleware)
	.get(
		"/",
		validator(
			"query",
			z.object({
				query: z.string().optional(),
				limit: z.string().optional().default("10").transform(Number),
				offset: z.string().optional().default("0").transform(Number),
			}),
		),
		describeRoute({
			summary: "Get all organizations",
			tags: ["Administration"],
		}),
		async (c) => {
			const { query, limit, offset } = c.req.valid("query");

			const organizations = await db.organization.findMany({
				where: {
					name: { contains: query, mode: "insensitive" },
				},
				include: {
					_count: {
						select: {
							members: true,
						},
					},
				},
				take: limit,
				skip: offset,
			});

			const total = await db.organization.count();

			return c.json({ organizations, total });
		},
	)
	.get("/:id", async (c) => {
		const id = c.req.param("id");

		const organization = await db.organization.findUnique({
			where: { id },
			include: {
				members: true,
				invitations: true,
			},
		});

		return c.json(organization);
	})
	// Add member directly to organization (admin only)
	// This is a workaround for the better-auth bug where creator is not added as owner
	.post(
		"/:id/members",
		validator(
			"json",
			z.object({
				userId: z.string().optional(),
				email: z.string().email().optional(),
				role: z.enum(["owner", "admin", "member"]).default("owner"),
			}),
		),
		describeRoute({
			summary: "Add member to organization directly",
			description: "Admin endpoint to add a user as a member of an organization without invitation",
			tags: ["Administration"],
		}),
		async (c) => {
			const organizationId = c.req.param("id");
			const { userId, email, role } = c.req.valid("json");

			// Find the organization
			const organization = await db.organization.findUnique({
				where: { id: organizationId },
			});

			if (!organization) {
				throw new HTTPException(404, { message: "Organization not found" });
			}

			// Find the user by ID or email
			let user;
			if (userId) {
				user = await db.user.findUnique({ where: { id: userId } });
			} else if (email) {
				user = await db.user.findUnique({ where: { email } });
			}

			if (!user) {
				throw new HTTPException(404, { message: "User not found" });
			}

			// Check if user is already a member
			const existingMember = await db.member.findUnique({
				where: {
					userId_organizationId: {
						userId: user.id,
						organizationId,
					},
				},
			});

			if (existingMember) {
				throw new HTTPException(400, { message: "User is already a member of this organization" });
			}

			// Create the member
			const member = await db.member.create({
				data: {
					id: nanoid(),
					userId: user.id,
					organizationId,
					role,
					createdAt: new Date(),
				},
				include: {
					user: true,
				},
			});

			return c.json({
				success: true,
				member: {
					id: member.id,
					userId: member.userId,
					organizationId: member.organizationId,
					role: member.role,
					user: {
						id: member.user.id,
						email: member.user.email,
						name: member.user.name,
					},
				},
			});
		},
	);
