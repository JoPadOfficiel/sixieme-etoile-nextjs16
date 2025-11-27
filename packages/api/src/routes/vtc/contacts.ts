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
const createContactSchema = z.object({
	displayName: z.string().min(1).max(255),
	type: z.enum(["INDIVIDUAL", "BUSINESS", "AGENCY"]).default("INDIVIDUAL"),
	firstName: z.string().max(100).optional(),
	lastName: z.string().max(100).optional(),
	email: z.string().email().optional().nullable(),
	phone: z.string().max(50).optional().nullable(),
	companyName: z.string().max(255).optional().nullable(),
	vatNumber: z.string().max(50).optional().nullable(),
	siret: z.string().max(20).optional().nullable(),
	billingAddress: z.string().optional().nullable(),
	isPartner: z.boolean().default(false),
	defaultClientType: z.enum(["PARTNER", "PRIVATE"]).default("PRIVATE"),
	notes: z.string().optional().nullable(),
});

const updateContactSchema = createContactSchema.partial();

const listContactsSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	search: z.string().optional(),
	isPartner: z.enum(["true", "false"]).optional(),
	type: z.enum(["INDIVIDUAL", "BUSINESS", "AGENCY"]).optional(),
});

export const contactsRouter = new Hono()
	.basePath("/contacts")
	// Apply organization middleware to all routes
	.use("*", organizationMiddleware)

	// List contacts
	.get(
		"/",
		validator("query", listContactsSchema),
		describeRoute({
			summary: "List contacts",
			description: "Get a paginated list of contacts for the current organization",
			tags: ["VTC - Contacts"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, search, isPartner, type } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause with tenant filter
			const where = withTenantFilter(
				{
					...(search && {
						OR: [
							{ displayName: { contains: search, mode: "insensitive" as const } },
							{ email: { contains: search, mode: "insensitive" as const } },
							{ companyName: { contains: search, mode: "insensitive" as const } },
						],
					}),
					...(isPartner !== undefined && {
						isPartner: isPartner === "true",
					}),
					...(type && { type }),
				},
				organizationId,
			);

			const [contacts, total] = await Promise.all([
				db.contact.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						_count: {
							select: {
								quotes: true,
								invoices: true,
							},
						},
					},
				}),
				db.contact.count({ where }),
			]);

			return c.json({
				data: contacts,
				meta: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		},
	)

	// Get single contact
	.get(
		"/:id",
		describeRoute({
			summary: "Get contact",
			description: "Get a single contact by ID",
			tags: ["VTC - Contacts"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const contact = await db.contact.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					quotes: {
						take: 10,
						orderBy: { createdAt: "desc" },
					},
					invoices: {
						take: 10,
						orderBy: { createdAt: "desc" },
					},
				},
			});

			if (!contact) {
				throw new HTTPException(404, {
					message: "Contact not found",
				});
			}

			return c.json(contact);
		},
	)

	// Create contact
	.post(
		"/",
		validator("json", createContactSchema),
		describeRoute({
			summary: "Create contact",
			description: "Create a new contact in the current organization",
			tags: ["VTC - Contacts"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			const contact = await db.contact.create({
				data: withTenantCreate(data, organizationId),
			});

			return c.json(contact, 201);
		},
	)

	// Update contact
	.patch(
		"/:id",
		validator("json", updateContactSchema),
		describeRoute({
			summary: "Update contact",
			description: "Update an existing contact. Handles reclassification between Partner and Private.",
			tags: ["VTC - Contacts"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			// First check if contact exists and belongs to this organization
			const existing = await db.contact.findFirst({
				where: withTenantId(id, organizationId),
				include: {
					partnerContract: true,
				},
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Contact not found",
				});
			}

			// Detect reclassification
			const isReclassification = data.isPartner !== undefined && data.isPartner !== existing.isPartner;
			const reclassifyingToPrivate = isReclassification && data.isPartner === false;
			const reclassifyingToPartner = isReclassification && data.isPartner === true;

			let partnerContractDeleted = false;

			// Handle Partner → Private: delete PartnerContract if exists
			if (reclassifyingToPrivate && existing.partnerContract) {
				await db.$transaction(async (tx) => {
					// Delete the partner contract
					await tx.partnerContract.delete({
						where: { contactId: id },
					});
					// Update the contact
					await tx.contact.update({
						where: { id },
						data,
					});
				});
				partnerContractDeleted = true;
			} else {
				// Standard update
				await db.contact.update({
					where: { id },
					data,
				});
			}

			// Fetch updated contact
			const contact = await db.contact.findFirst({
				where: withTenantId(id, organizationId),
			});

			// Build response with reclassification metadata
			const response: Record<string, unknown> = { ...contact };

			if (isReclassification) {
				response._meta = {
					partnerContractDeleted,
					reclassifiedFrom: existing.isPartner ? "PARTNER" : "PRIVATE",
					reclassifiedTo: data.isPartner ? "PARTNER" : "PRIVATE",
				};
			}

			return c.json(response);
		},
	)

	// Delete contact
	.delete(
		"/:id",
		describeRoute({
			summary: "Delete contact",
			description: "Delete a contact by ID",
			tags: ["VTC - Contacts"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			// First check if contact exists and belongs to this organization
			const existing = await db.contact.findFirst({
				where: withTenantId(id, organizationId),
			});

			if (!existing) {
				throw new HTTPException(404, {
					message: "Contact not found",
				});
			}

			await db.contact.delete({
				where: { id },
			});

			return c.json({ success: true });
		},
	)

	// ============================================================================
	// Story 2.4: Contact Timeline (Quotes & Invoices)
	// ============================================================================

	// Get contact timeline
	.get(
		"/:id/timeline",
		validator(
			"query",
			z.object({
				limit: z.coerce.number().int().positive().max(50).default(20),
			})
		),
		describeRoute({
			summary: "Get contact timeline",
			description:
				"Get a combined timeline of quotes and invoices for a contact, sorted by date",
			tags: ["VTC - Contacts"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const contactId = c.req.param("id");
			const { limit } = c.req.valid("query");

			// Verify contact exists and belongs to this organization
			const contact = await db.contact.findFirst({
				where: withTenantId(contactId, organizationId),
			});

			if (!contact) {
				throw new HTTPException(404, {
					message: "Contact not found",
				});
			}

			// Fetch quotes and invoices in parallel
			const [quotes, invoices] = await Promise.all([
				db.quote.findMany({
					where: { contactId, organizationId },
					orderBy: { createdAt: "desc" },
					take: limit,
					select: {
						id: true,
						status: true,
						pickupAddress: true,
						dropoffAddress: true,
						pickupAt: true,
						finalPrice: true,
						marginPercent: true,
						pricingMode: true,
						createdAt: true,
						sentAt: true,
						acceptedAt: true,
						vehicleCategory: {
							select: {
								name: true,
								code: true,
							},
						},
					},
				}),
				db.invoice.findMany({
					where: { contactId, organizationId },
					orderBy: { issueDate: "desc" },
					take: limit,
					select: {
						id: true,
						number: true,
						status: true,
						issueDate: true,
						dueDate: true,
						totalExclVat: true,
						totalInclVat: true,
						quoteId: true,
						createdAt: true,
					},
				}),
			]);

			// Transform to timeline items
			type TimelineItem = {
				id: string;
				type: "QUOTE" | "INVOICE";
				date: Date;
				status: string;
				amount: number;
				description: string;
				metadata: Record<string, unknown>;
			};

			const quoteItems: TimelineItem[] = quotes.map((q) => ({
				id: q.id,
				type: "QUOTE" as const,
				date: q.createdAt,
				status: q.status,
				amount: Number(q.finalPrice),
				description: `${q.pickupAddress} → ${q.dropoffAddress}`,
				metadata: {
					pickupAt: q.pickupAt,
					vehicleCategory: q.vehicleCategory?.name,
					pricingMode: q.pricingMode,
					marginPercent: q.marginPercent ? Number(q.marginPercent) : null,
					sentAt: q.sentAt,
					acceptedAt: q.acceptedAt,
				},
			}));

			const invoiceItems: TimelineItem[] = invoices.map((i) => ({
				id: i.id,
				type: "INVOICE" as const,
				date: i.issueDate,
				status: i.status,
				amount: Number(i.totalInclVat),
				description: `Invoice ${i.number}`,
				metadata: {
					number: i.number,
					dueDate: i.dueDate,
					totalExclVat: Number(i.totalExclVat),
					quoteId: i.quoteId,
				},
			}));

			// Combine and sort by date (most recent first)
			const timeline = [...quoteItems, ...invoiceItems]
				.sort((a, b) => b.date.getTime() - a.date.getTime())
				.slice(0, limit);

			// Calculate summary stats
			const summary = {
				totalQuotes: quotes.length,
				totalInvoices: invoices.length,
				quotesValue: quotes.reduce((sum, q) => sum + Number(q.finalPrice), 0),
				invoicesValue: invoices.reduce((sum, i) => sum + Number(i.totalInclVat), 0),
				acceptedQuotes: quotes.filter((q) => q.status === "ACCEPTED").length,
				paidInvoices: invoices.filter((i) => i.status === "PAID").length,
			};

			return c.json({
				timeline,
				summary,
				meta: {
					contactId,
					limit,
					totalItems: timeline.length,
				},
			});
		},
	);
