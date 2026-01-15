/**
 * Story 24.2: EndCustomer CRUD API
 *
 * API endpoints for managing end-customers (sub-contacts) within partner agencies.
 * Enables operators to track individual clients for each agency.
 *
 * Related FRs: FR121, FR122
 */

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
// Validation Schemas for API Endpoints
// (Following Story 24.1 specifications - difficultyScore 1-5, optional email/phone)
// ============================================================================

// List end-customers query parameters
const listEndCustomersSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	difficultyScore: z.coerce.number().int().min(1).max(5).optional(),
});

// Create end-customer schema (firstName, lastName required; others optional)
const createEndCustomerBodySchema = z.object({
	firstName: z.string().min(1, "First name is required").max(255),
	lastName: z.string().min(1, "Last name is required").max(255),
	email: z.string().email("Invalid email format").optional().nullable(),
	phone: z.string().min(1).optional().nullable(),
	difficultyScore: z.coerce.number().int().min(1).max(5).optional().nullable(),
	notes: z.string().optional().nullable(),
});

// Update end-customer schema (all fields optional)
const updateEndCustomerBodySchema = createEndCustomerBodySchema.partial();

// ============================================================================
// End-Customers Router
// ============================================================================

export const endCustomersRouter = new Hono()
	.basePath("/end-customers")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// =========================================================================
	// AC2: Get Single EndCustomer
	// GET /end-customers/:id
	// =========================================================================
	.get(
		"/:id",
		describeRoute({
			summary: "Get end-customer",
			description:
				"Get a single end-customer by ID with quote count. Only accessible within the same organization.",
			tags: ["VTC - EndCustomers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const endCustomer = await db.endCustomer.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					contact: {
						select: {
							id: true,
							displayName: true,
							isPartner: true,
						},
					},
					_count: {
						select: {
							quotes: true,
							invoices: true,
						},
					},
				},
			});

			if (!endCustomer) {
				return c.json({ message: "End-customer not found" }, 404);
			}

			return c.json(endCustomer);
		}
	)

	// =========================================================================
	// AC4: Update EndCustomer
	// PATCH /end-customers/:id
	// =========================================================================
	.patch(
		"/:id",
		validator("json", updateEndCustomerBodySchema),
		describeRoute({
			summary: "Update end-customer",
			description:
				"Update an existing end-customer with partial data. Validates difficultyScore (1-5) and email format.",
			tags: ["VTC - EndCustomers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// Verify end-customer exists and belongs to this organization
			const existing = await db.endCustomer.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				return c.json({ message: "End-customer not found" }, 404);
			}

			const updated = await db.endCustomer.update({
				where: { id },
				data,
				include: {
					contact: {
						select: {
							id: true,
							displayName: true,
							isPartner: true,
						},
					},
					_count: {
						select: {
							quotes: true,
							invoices: true,
						},
					},
				},
			});

			return c.json(updated);
		}
	)

	// =========================================================================
	// AC5: Delete EndCustomer
	// DELETE /end-customers/:id
	// =========================================================================
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete end-customer",
			description:
				"Delete an end-customer by ID. Fails if the end-customer has linked quotes.",
			tags: ["VTC - EndCustomers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// Verify end-customer exists and check for linked quotes
			const existing = await db.endCustomer.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					_count: {
						select: {
							quotes: true,
							invoices: true,
						},
					},
				},
			});

			if (!existing) {
				return c.json({ message: "End-customer not found" }, 404);
			}

			// AC5: Block deletion if quotes are linked
			if (existing._count.quotes > 0) {
				return c.json(
					{
						message: `Impossible de supprimer ce client final : ${existing._count.quotes} devis sont liés. Veuillez d'abord réattribuer les devis à un autre client final ou supprimer les devis.`,
					},
					400
				);
			}

			await db.endCustomer.delete({
				where: { id },
			});

			return c.json({ success: true });
		}
	);

// ============================================================================
// Contact-Scoped End-Customers Router
// Routes nested under /contacts/:contactId/end-customers
// ============================================================================

export const contactEndCustomersRouter = new Hono()
	.basePath("/contacts/:contactId/end-customers")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// =========================================================================
	// AC1 & AC6: List EndCustomers for a Contact
	// GET /contacts/:contactId/end-customers
	// =========================================================================
	.get(
		"/",
		validator("query", listEndCustomersSchema),
		describeRoute({
			summary: "List end-customers",
			description:
				"Get a paginated list of end-customers for a specific contact. Supports search by name and email, and filtering by difficulty score.",
			tags: ["VTC - EndCustomers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const contactId = c.req.param("contactId");
			const { page, limit, search, difficultyScore } = c.req.valid("query");

			// Verify contact exists and belongs to this organization
			const contact = await db.contact.findFirst({
				where: withTenantId(contactId, organizationId),
			});

			if (!contact) {
				return c.json({ message: "Contact not found" }, 404);
			}

			const skip = (page - 1) * limit;

			// Build where clause with tenant filter and search
			const where = withTenantFilter(
				{
					contactId,
					...(search && {
						OR: [
							{ firstName: { contains: search, mode: "insensitive" as const } },
							{ lastName: { contains: search, mode: "insensitive" as const } },
							{ email: { contains: search, mode: "insensitive" as const } },
						],
					}),
					...(difficultyScore && { difficultyScore }),
				},
				organizationId
			);

			const [endCustomers, total] = await Promise.all([
				db.endCustomer.findMany({
					where,
					skip,
					take: limit,
					orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
					include: {
						_count: {
							select: {
								quotes: true,
								invoices: true,
							},
						},
					},
				}),
				db.endCustomer.count({ where }),
			]);

			return c.json({
				data: endCustomers,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		}
	)

	// =========================================================================
	// AC3: Create EndCustomer
	// POST /contacts/:contactId/end-customers
	// =========================================================================
	.post(
		"/",
		validator("json", createEndCustomerBodySchema),
		describeRoute({
			summary: "Create end-customer",
			description:
				"Create a new end-customer linked to a partner contact. Validates firstName, lastName as required, and optional fields.",
			tags: ["VTC - EndCustomers"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const contactId = c.req.param("contactId");
			const data = c.req.valid("json");

			// Verify contact exists and belongs to this organization
			const contact = await db.contact.findFirst({
				where: withTenantId(contactId, organizationId),
			});

			if (!contact) {
				return c.json({ message: "Contact not found" }, 404);
			}

			// Verify contact is a partner (AC3: only partners can have end-customers)
			if (!contact.isPartner) {
				return c.json(
					{
						message:
							"Les clients finaux ne peuvent être créer que pour les contacts partenaires. Ce contact n'est pas un partenaire.",
					},
					400
				);
			}

			const endCustomer = await db.endCustomer.create({
				data: withTenantCreate(
					{
						...data,
						contactId,
					},
					organizationId
				),
				include: {
					contact: {
						select: {
							id: true,
							displayName: true,
							isPartner: true,
						},
					},
					_count: {
						select: {
							quotes: true,
							invoices: true,
						},
					},
				},
			});

			return c.json(endCustomer, 201);
		}
	);
