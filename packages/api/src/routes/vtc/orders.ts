import { db } from "@repo/database";
import type { OrderStatus } from "@prisma/client";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
	withTenantCreate,
	withTenantFilter,
} from "../../lib/tenant-prisma";
import { organizationMiddleware } from "../../middleware/organization";
import { SpawnService } from "../../services/spawn-service";

// ============================================================================
// Story 28.2: Order State Machine & API
// ============================================================================

// Valid state transitions map
const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
	DRAFT: ["QUOTED", "CANCELLED"],
	QUOTED: ["CONFIRMED", "CANCELLED"],
	CONFIRMED: ["INVOICED", "CANCELLED"],
	INVOICED: ["PAID", "CANCELLED"],
	PAID: [], // Terminal state
	CANCELLED: [], // Terminal state
};

/**
 * Check if a transition from one status to another is valid
 */
function canTransition(from: OrderStatus, to: OrderStatus): boolean {
	if (from === to) return true; // Idempotent - same state is always valid
	return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Log order status transition for audit trail
 */
function logOrderTransition(
	orderId: string,
	from: OrderStatus,
	to: OrderStatus
): void {
	const timestamp = new Date().toISOString();
	console.log(`[ORDER_AUDIT] Order ${orderId}: ${from} → ${to} at ${timestamp}`);
}

/**
 * Generate unique order reference in format ORD-YYYY-NNN
 * Uses retry logic to handle race conditions when multiple orders are created concurrently.
 * The unique constraint on `reference` in the database is the ultimate safeguard.
 */
async function generateOrderReference(
	organizationId: string,
	retryCount = 0
): Promise<string> {
	const MAX_RETRIES = 3;
	const year = new Date().getFullYear();
	const prefix = `ORD-${year}-`;

	// Find highest existing reference for this year in this organization
	const lastOrder = await db.order.findFirst({
		where: {
			organizationId,
			reference: { startsWith: prefix },
		},
		orderBy: { reference: "desc" },
	});

	let sequence = 1;
	if (lastOrder) {
		const match = lastOrder.reference.match(/ORD-\d{4}-(\d+)/);
		if (match) sequence = Number.parseInt(match[1], 10) + 1;
	}

	// Add retry offset to handle concurrent requests
	sequence += retryCount;

	const reference = `${prefix}${sequence.toString().padStart(3, "0")}`;

	// Verify reference doesn't already exist (race condition check)
	if (retryCount < MAX_RETRIES) {
		const existing = await db.order.findFirst({
			where: { organizationId, reference },
		});
		if (existing) {
			// Reference already taken, retry with next sequence
			return generateOrderReference(organizationId, retryCount + 1);
		}
	}

	return reference;
}

// ============================================================================
// Zod Schemas
// ============================================================================

export const orderStatusEnum = z.enum([
	"DRAFT",
	"QUOTED",
	"CONFIRMED",
	"INVOICED",
	"PAID",
	"CANCELLED",
]);

export const createOrderSchema = z.object({
	contactId: z.string().min(1).describe("Contact ID for the order"),
	notes: z.string().optional().nullable().describe("Additional notes"),
});

export const updateOrderSchema = z.object({
	contactId: z.string().min(1).optional().describe("Contact ID"),
	notes: z.string().optional().nullable().describe("Additional notes"),
});

export const transitionStatusSchema = z.object({
	status: orderStatusEnum.describe("Target status for the order"),
});

export const listOrdersQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: orderStatusEnum.optional(),
	contactId: z.string().optional(),
	reference: z.string().optional(),
});

export const orderIdParamSchema = z.object({
	id: z.string().min(1).describe("Order ID"),
});

// ============================================================================
// Router
// ============================================================================

export const ordersRouter = new Hono()
	.basePath("/orders")
	.use("*", organizationMiddleware)

	// -------------------------------------------------------------------------
	// POST /orders - Create new Order
	// -------------------------------------------------------------------------
	.post(
		"/",
		describeRoute({
			tags: ["Orders"],
			summary: "Create a new Order",
			description: "Creates a new Order (Dossier) with DRAFT status and auto-generated reference",
		}),
		validator("json", createOrderSchema),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify contact exists and belongs to organization
			const contact = await db.contact.findFirst({
				where: withTenantFilter({ id: data.contactId }, organizationId),
			});

			if (!contact) {
				throw new HTTPException(400, {
					message: `Contact with ID ${data.contactId} not found`,
				});
			}

			// Generate unique reference
			const reference = await generateOrderReference(organizationId);

			// Create order
			const order = await db.order.create({
				data: withTenantCreate({
					reference,
					contactId: data.contactId,
					notes: data.notes,
					status: "DRAFT",
				}, organizationId),
				include: {
					contact: true,
					quotes: true,
					missions: true,
					invoices: true,
				},
			});

			logOrderTransition(order.id, "DRAFT" as OrderStatus, "DRAFT" as OrderStatus);

			return c.json(order, 201);
		}
	)

	// -------------------------------------------------------------------------
	// GET /orders - List Orders (paginated)
	// -------------------------------------------------------------------------
	.get(
		"/",
		describeRoute({
			tags: ["Orders"],
			summary: "List Orders",
			description: "Returns paginated list of Orders with optional filters",
		}),
		validator("query", listOrdersQuerySchema),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { page, limit, status, contactId, reference } = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause
			const where = withTenantFilter({
				...(status && { status }),
				...(contactId && { contactId }),
				...(reference && { reference: { contains: reference } }),
			}, organizationId);

			// Get total count and orders in parallel
			const [total, orders] = await Promise.all([
				db.order.count({ where }),
				db.order.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						contact: {
							select: {
								id: true,
								name: true,
								email: true,
								type: true,
							},
						},
						_count: {
							select: {
								quotes: true,
								missions: true,
								invoices: true,
							},
						},
					},
				}),
			]);

			return c.json({
				orders,
				pagination: {
					page,
					limit,
					total,
					totalPages: Math.ceil(total / limit),
				},
			});
		}
	)

	// -------------------------------------------------------------------------
	// GET /orders/:id - Get Order by ID
	// -------------------------------------------------------------------------
	.get(
		"/:id",
		describeRoute({
			tags: ["Orders"],
			summary: "Get Order by ID",
			description: "Returns Order with all related quotes, missions, and invoices",
		}),
		validator("param", orderIdParamSchema),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { id } = c.req.valid("param");

			const order = await db.order.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					contact: true,
					quotes: {
						orderBy: { createdAt: "desc" },
						include: {
							vehicleCategory: true,
							lines: {
								orderBy: { sortOrder: "asc" },
							},
						},
					},
					missions: {
						orderBy: { startAt: "asc" },
						include: {
							vehicle: true,
							driver: true,
						},
					},
					invoices: {
						orderBy: { issueDate: "desc" },
						include: {
							lines: {
								orderBy: { sortOrder: "asc" },
							},
						},
					},
				},
			});

			if (!order) {
				throw new HTTPException(404, {
					message: `Order with ID ${id} not found`,
				});
			}

			return c.json(order);
		}
	)

	// -------------------------------------------------------------------------
	// PATCH /orders/:id - Update Order fields
	// -------------------------------------------------------------------------
	.patch(
		"/:id",
		describeRoute({
			tags: ["Orders"],
			summary: "Update Order",
			description: "Updates Order fields (notes, contactId). Use /status endpoint for status changes.",
		}),
		validator("param", orderIdParamSchema),
		validator("json", updateOrderSchema),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { id } = c.req.valid("param");
			const data = c.req.valid("json");

			// Verify order exists
			const existingOrder = await db.order.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!existingOrder) {
				throw new HTTPException(404, {
					message: `Order with ID ${id} not found`,
				});
			}

			// If contactId is being updated, verify it exists
			if (data.contactId) {
				const contact = await db.contact.findFirst({
					where: withTenantFilter({ id: data.contactId }, organizationId),
				});

				if (!contact) {
					throw new HTTPException(400, {
						message: `Contact with ID ${data.contactId} not found`,
					});
				}
			}

			// Update order with tenant scope for defense-in-depth
			const order = await db.order.update({
				where: { id, organizationId },
				data: {
					...(data.contactId && { contactId: data.contactId }),
					...(data.notes !== undefined && { notes: data.notes }),
				},
				include: {
					contact: true,
					quotes: true,
					missions: true,
					invoices: true,
				},
			});

			return c.json(order);
		}
	)

	// -------------------------------------------------------------------------
	// PATCH /orders/:id/status - Transition Order status
	// -------------------------------------------------------------------------
	.patch(
		"/:id/status",
		describeRoute({
			tags: ["Orders"],
			summary: "Transition Order status",
			description: "Transitions Order to a new status following the state machine rules",
		}),
		validator("param", orderIdParamSchema),
		validator("json", transitionStatusSchema),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { id } = c.req.valid("param");
			const { status: targetStatus } = c.req.valid("json");

			// Get current order
			const order = await db.order.findFirst({
				where: withTenantFilter({ id }, organizationId),
			});

			if (!order) {
				throw new HTTPException(404, {
					message: `Order with ID ${id} not found`,
				});
			}

			const currentStatus = order.status as OrderStatus;

			// Check if transition is valid
			if (!canTransition(currentStatus, targetStatus as OrderStatus)) {
				// Check if it's a terminal state
				if (VALID_TRANSITIONS[currentStatus].length === 0) {
					throw new HTTPException(400, {
						message: `Cannot transition from terminal state ${currentStatus}`,
					});
				}

				throw new HTTPException(400, {
					message: `Invalid transition from ${currentStatus} to ${targetStatus}. Valid targets: ${VALID_TRANSITIONS[currentStatus].join(", ") || "none"}`,
				});
			}

			// If same status (idempotent), just return current order with tenant scope
			if (currentStatus === targetStatus) {
				return c.json(
					await db.order.findFirst({
						where: { id, organizationId },
						include: {
							contact: true,
							quotes: true,
							missions: true,
							invoices: true,
						},
					})
				);
			}

			// Perform transition with tenant scope for defense-in-depth
			const updatedOrder = await db.order.update({
				where: { id, organizationId },
				data: { status: targetStatus },
				include: {
					contact: true,
					quotes: true,
					missions: true,
					invoices: true,
				},
			});

			// Log the transition
			logOrderTransition(id, currentStatus, targetStatus as OrderStatus);

			// Story 28.4: Spawn missions when transitioning to CONFIRMED
			if (targetStatus === "CONFIRMED" && currentStatus !== "CONFIRMED") {
				try {
					const missions = await SpawnService.execute(id, organizationId);
					console.log(
						`[ORDER_AUDIT] Order ${id}: Spawned ${missions.length} missions on CONFIRMED`
					);

					// Refetch order to include newly created missions
					if (missions.length > 0) {
						const refreshedOrder = await db.order.findFirst({
							where: { id, organizationId },
							include: {
								contact: true,
								quotes: true,
								missions: {
									orderBy: { startAt: "asc" },
									include: {
										vehicle: true,
										driver: true,
									},
								},
								invoices: true,
							},
						});
						return c.json(refreshedOrder);
					}
				} catch (error) {
					// Log error but don't fail the transition
					// Missions can be created manually if spawning fails
					console.error(
						`[SPAWN_ERROR] Order ${id}: ${error instanceof Error ? error.message : "Unknown error"}`
					);
				}
			}

			return c.json(updatedOrder);
		}
	)

	// -------------------------------------------------------------------------
	// DELETE /orders/:id - Delete Order (only DRAFT or CANCELLED)
	// -------------------------------------------------------------------------
	.delete(
		"/:id",
		describeRoute({
			tags: ["Orders"],
			summary: "Delete Order",
			description: "Deletes an Order. Only DRAFT or CANCELLED orders can be deleted.",
		}),
		validator("param", orderIdParamSchema),
		async (c) => {
			const organizationId = c.get("organizationId");
			const { id } = c.req.valid("param");

			// Get current order
			const order = await db.order.findFirst({
				where: withTenantFilter({ id }, organizationId),
				include: {
					_count: {
						select: {
							quotes: true,
							missions: true,
							invoices: true,
						},
					},
				},
			});

			if (!order) {
				throw new HTTPException(404, {
					message: `Order with ID ${id} not found`,
				});
			}

			// Only allow deletion of DRAFT or CANCELLED orders
			if (order.status !== "DRAFT" && order.status !== "CANCELLED") {
				throw new HTTPException(400, {
					message: `Cannot delete Order in ${order.status} status. Only DRAFT or CANCELLED orders can be deleted.`,
				});
			}

			// Check for linked entities
			if (order._count.quotes > 0 || order._count.missions > 0 || order._count.invoices > 0) {
				throw new HTTPException(400, {
					message: `Cannot delete Order with linked quotes (${order._count.quotes}), missions (${order._count.missions}), or invoices (${order._count.invoices}). Unlink them first.`,
				});
			}

			// Delete order with tenant scope for defense-in-depth
			await db.order.delete({ where: { id, organizationId } });

			return c.json({ success: true, message: `Order ${order.reference} deleted` });
		}
	);

export type OrdersRouter = typeof ordersRouter;
