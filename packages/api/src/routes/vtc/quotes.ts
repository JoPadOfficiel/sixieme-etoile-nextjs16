import { Prisma, QuoteLineType } from "@prisma/client";
import type { QuoteStatus } from "@prisma/client";
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
import { missionSyncService } from "../../services/mission-sync.service";
import { QuoteStateMachine } from "../../services/quote-state-machine";

// Story 16.1: Stop schema for excursion trips
const stopSchema = z.object({
	address: z.string().min(1).describe("Stop address"),
	latitude: z.number().describe("Stop latitude"),
	longitude: z.number().describe("Stop longitude"),
	order: z.number().int().nonnegative().describe("Stop order in sequence"),
});

// Validation schemas with EUR documentation
const createQuoteSchema = z
	.object({
		contactId: z.string().min(1).describe("Contact ID for the quote"),
		// Story 24.4: Optional end-customer for partner agency sub-contacts
		endCustomerId: z
			.string()
			.optional()
			.nullable()
			.describe("End-customer ID for partner agency sub-contacts"),
		vehicleCategoryId: z.string().min(1).describe("Vehicle category ID"),
		pricingMode: z
			.enum([
				"FIXED_GRID",
				"DYNAMIC",
				"PARTNER_GRID",
				"CLIENT_DIRECT",
				"MANUAL",
			])
			.optional()
			.default("DYNAMIC")
			.describe(
				"Pricing mode: FIXED_GRID, DYNAMIC, PARTNER_GRID, CLIENT_DIRECT, or MANUAL",
			),
		tripType: z
			.enum(["TRANSFER", "EXCURSION", "DISPO", "OFF_GRID"])
			.describe("Type of trip"),
		pickupAt: z
			.union([z.string().datetime(), z.date()])
			.transform((val) => (val instanceof Date ? val.toISOString() : val))
			.describe("Pickup date/time in Europe/Paris business time"),
		pickupAddress: z.string().min(1).describe("Pickup address"),
		pickupLatitude: z
			.number()
			.optional()
			.nullable()
			.describe("Pickup latitude"),
		pickupLongitude: z
			.number()
			.optional()
			.nullable()
			.describe("Pickup longitude"),
		// Story 16.1: Made optional for DISPO and OFF_GRID
		dropoffAddress: z
			.string()
			.optional()
			.nullable()
			.describe("Dropoff address (optional for DISPO/OFF_GRID)"),
		dropoffLatitude: z
			.number()
			.optional()
			.nullable()
			.describe("Dropoff latitude"),
		dropoffLongitude: z
			.number()
			.optional()
			.nullable()
			.describe("Dropoff longitude"),
		// Story 16.1: Trip type specific fields
		isRoundTrip: z
			.boolean()
			.optional()
			.default(false)
			.describe("Round trip for TRANSFER"),
		stops: z
			.array(stopSchema)
			.optional()
			.nullable()
			.describe("Intermediate stops for EXCURSION"),
		returnDate: z
			.union([z.string().datetime(), z.date()])
			.optional()
			.nullable()
			.transform((val) => (val instanceof Date ? val.toISOString() : val))
			.describe("Return date for EXCURSION"),
		durationHours: z
			.number()
			.positive()
			.optional()
			.nullable()
			.describe("Duration in hours for DISPO"),
		maxKilometers: z
			.number()
			.positive()
			.optional()
			.nullable()
			.describe("Max kilometers for DISPO"),
		passengerCount: z
			.number()
			.int()
			.positive()
			.describe("Number of passengers"),
		luggageCount: z
			.number()
			.int()
			.nonnegative()
			.default(0)
			.describe("Number of luggage pieces"),
		suggestedPrice: z
			.number()
			.nonnegative()
			.optional()
			.default(0)
			.describe("Suggested price in EUR"),
		finalPrice: z
			.number()
			.nonnegative()
			.optional()
			.default(0)
			.describe("Final price in EUR"),
		// Story 24.9: Bidirectional pricing storage
		partnerGridPrice: z
			.number()
			.nonnegative()
			.optional()
			.nullable()
			.describe("Partner grid price in EUR"),
		clientDirectPrice: z
			.number()
			.nonnegative()
			.optional()
			.nullable()
			.describe("Client direct price in EUR"),
		internalCost: z
			.number()
			.optional()
			.nullable()
			.describe("Internal cost in EUR (shadow calculation result)"),
		marginPercent: z
			.number()
			.optional()
			.nullable()
			.describe("Margin percentage"),
		tripAnalysis: z
			.record(z.unknown())
			.optional()
			.nullable()
			.describe("Shadow calculation details: segments A/B/C, costs"),
		appliedRules: z
			.record(z.unknown())
			.optional()
			.nullable()
			.describe("Applied pricing rules, multipliers, promotions"),
		// Story 15.7: Cost breakdown for audit
		costBreakdown: z
			.record(z.unknown())
			.optional()
			.nullable()
			.describe("Detailed cost breakdown: fuel, tolls, driver, wear"),
		validUntil: z
			.union([z.string().datetime(), z.date()])
			.optional()
			.nullable()
			.transform((val) => (val instanceof Date ? val.toISOString() : val))
			.describe("Quote validity date in Europe/Paris business time"),
		notes: z.string().optional().nullable().describe("Additional notes"),
		// Story 17.5: Estimated end time for driver availability detection
		estimatedEndAt: z
			.union([z.string().datetime(), z.date()])
			.optional()
			.nullable()
			.transform((val) => (val instanceof Date ? val.toISOString() : val))
			.describe(
				"Estimated end time calculated from pickupAt + totalDurationMinutes",
			),
		// Story 26: Yolo Mode / Shopping Cart support
		organizationId: z
			.string()
			.optional()
			.describe(
				"Organization ID (extracted from session, optional in payload)",
			),
		isYoloMode: z
			.boolean()
			.optional()
			.default(false)
			.describe("Whether quote uses Yolo Mode (Shopping Cart)"),
		lines: z
			.array(z.record(z.unknown()))
			.optional()
			.nullable()
			.describe("Quote lines for Yolo Mode"),
		// Frontend sends these objects but API only needs IDs - passthrough to avoid validation errors
		contact: z
			.record(z.unknown())
			.optional()
			.nullable()
			.describe("Contact object (ignored, use contactId)"),
		vehicleCategory: z
			.record(z.unknown())
			.optional()
			.nullable()
			.describe("Vehicle category object (ignored, use vehicleCategoryId)"),
		endCustomer: z
			.record(z.unknown())
			.optional()
			.nullable()
			.describe("End customer object (ignored, use endCustomerId)"),
		// Story 6.6: Airport helper fields
		flightNumber: z
			.string()
			.optional()
			.nullable()
			.describe("Flight number for airport transfers"),
		waitingTimeMinutes: z
			.number()
			.optional()
			.nullable()
			.describe("Waiting time in minutes for airport transfers"),
		selectedOptionalFeeIds: z
			.array(z.string())
			.optional()
			.nullable()
			.describe("Selected optional fee IDs"),
		// Story 22.6: STAY trip type fields
		stayDays: z
			.array(z.record(z.unknown()))
			.optional()
			.nullable()
			.describe("Stay days for STAY trip type"),
	})
	.superRefine((data, ctx) => {
		// Story 16.1: Conditional validation based on trip type

		// dropoffAddress required for TRANSFER and EXCURSION
		if (
			(data.tripType === "TRANSFER" || data.tripType === "EXCURSION") &&
			!data.dropoffAddress
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Dropoff address is required for transfers and excursions",
				path: ["dropoffAddress"],
			});
		}

		// notes required for OFF_GRID
		if (
			data.tripType === "OFF_GRID" &&
			(!data.notes || data.notes.trim().length === 0)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Notes are required for off-grid trips",
				path: ["notes"],
			});
		}

		// durationHours required for DISPO
		if (
			data.tripType === "DISPO" &&
			(data.durationHours == null || data.durationHours <= 0)
		) {
			ctx.addIssue({
				code: z.ZodIssueCode.custom,
				message: "Duration is required for mise à disposition",
				path: ["durationHours"],
			});
		}
	});

const updateQuoteSchema = z.object({
	status: z
		.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"])
		.optional()
		.describe("Quote lifecycle status"),
	// Full edit fields (only for DRAFT quotes)
	contactId: z.string().min(1).optional().describe("Contact ID for the quote"),
	vehicleCategoryId: z
		.string()
		.min(1)
		.optional()
		.describe("Vehicle category ID"),
	pricingMode: z
		.enum(["FIXED_GRID", "DYNAMIC", "PARTNER_GRID", "CLIENT_DIRECT", "MANUAL"])
		.optional()
		.describe("Pricing mode"),
	tripType: z
		.enum(["TRANSFER", "EXCURSION", "DISPO", "OFF_GRID"])
		.optional()
		.describe("Type of trip"),
	pickupAt: z
		.string()
		.datetime()
		.optional()
		.describe("Pickup date/time in Europe/Paris business time"),
	pickupAddress: z.string().min(1).optional().describe("Pickup address"),
	pickupLatitude: z.number().optional().nullable().describe("Pickup latitude"),
	pickupLongitude: z
		.number()
		.optional()
		.nullable()
		.describe("Pickup longitude"),
	dropoffAddress: z.string().min(1).optional().describe("Dropoff address"),
	dropoffLatitude: z
		.number()
		.optional()
		.nullable()
		.describe("Dropoff latitude"),
	dropoffLongitude: z
		.number()
		.optional()
		.nullable()
		.describe("Dropoff longitude"),
	passengerCount: z
		.number()
		.int()
		.positive()
		.optional()
		.describe("Number of passengers"),
	luggageCount: z
		.number()
		.int()
		.nonnegative()
		.optional()
		.describe("Number of luggage pieces"),
	suggestedPrice: z
		.number()
		.nonnegative()
		.optional()
		.describe("Suggested price in EUR"),
	finalPrice: z
		.number()
		.nonnegative()
		.optional()
		.describe("Final price in EUR"),
	// Story 24.9: Bidirectional pricing storage
	partnerGridPrice: z
		.number()
		.nonnegative()
		.optional()
		.nullable()
		.describe("Partner grid price in EUR"),
	clientDirectPrice: z
		.number()
		.nonnegative()
		.optional()
		.nullable()
		.describe("Client direct price in EUR"),
	internalCost: z
		.number()
		.optional()
		.nullable()
		.describe("Internal cost in EUR"),
	marginPercent: z.number().optional().nullable().describe("Margin percentage"),
	tripAnalysis: z
		.record(z.unknown())
		.optional()
		.nullable()
		.describe("Shadow calculation details"),
	appliedRules: z
		.record(z.unknown())
		.optional()
		.nullable()
		.describe("Applied pricing rules"),
	// Story 15.7: Cost breakdown for audit
	costBreakdown: z
		.record(z.unknown())
		.optional()
		.nullable()
		.describe("Detailed cost breakdown"),
	notes: z.string().optional().nullable().describe("Additional notes"),
	validUntil: z
		.string()
		.datetime()
		.optional()
		.nullable()
		.describe("Quote validity date in Europe/Paris business time"),
	// Story 17.5: Estimated end time for driver availability detection
	estimatedEndAt: z
		.string()
		.datetime()
		.optional()
		.nullable()
		.describe(
			"Estimated end time calculated from pickupAt + totalDurationMinutes",
		),
});

const listQuotesSchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce.number().int().positive().max(100).default(20),
	status: z
		.enum(["DRAFT", "SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"])
		.optional(),
	contactId: z.string().optional(),
	pricingMode: z
		.enum(["FIXED_GRID", "DYNAMIC", "PARTNER_GRID", "CLIENT_DIRECT", "MANUAL"])
		.optional(),
	// Story 6.1: Additional filters for quotes list
	search: z
		.string()
		.optional()
		.describe("Search in contact name, pickup/dropoff addresses"),
	clientType: z
		.enum(["PARTNER", "PRIVATE"])
		.optional()
		.describe("Filter by client type (partner or private)"),
	vehicleCategoryId: z
		.string()
		.optional()
		.describe("Filter by vehicle category"),
	dateFrom: z
		.string()
		.datetime()
		.optional()
		.describe("Filter quotes with pickupAt >= dateFrom"),
	dateTo: z
		.string()
		.datetime()
		.optional()
		.describe("Filter quotes with pickupAt <= dateTo"),
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
			description:
				"Get a paginated list of quotes for the current organization",
			tags: ["VTC - Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const {
				page,
				limit,
				status,
				contactId,
				pricingMode,
				search,
				clientType,
				vehicleCategoryId,
				dateFrom,
				dateTo,
			} = c.req.valid("query");

			const skip = (page - 1) * limit;

			// Build where clause with all filters
			const baseWhere: Prisma.QuoteWhereInput = {
				...(status && { status }),
				...(contactId && { contactId }),
				...(pricingMode && { pricingMode }),
				...(vehicleCategoryId && { vehicleCategoryId }),
			};

			// Story 6.1: Add search filter (contact name, addresses)
			if (search) {
				baseWhere.OR = [
					{
						contact: { displayName: { contains: search, mode: "insensitive" } },
					},
					{
						contact: { companyName: { contains: search, mode: "insensitive" } },
					},
					{
						endCustomer: {
							firstName: { contains: search, mode: "insensitive" },
						},
					},
					{
						endCustomer: {
							lastName: { contains: search, mode: "insensitive" },
						},
					},
					{ pickupAddress: { contains: search, mode: "insensitive" } },
					{ dropoffAddress: { contains: search, mode: "insensitive" } },
				];
			}

			// Story 6.1: Add client type filter (partner/private)
			if (clientType) {
				baseWhere.contact = {
					...((baseWhere.contact as Prisma.ContactWhereInput) || {}),
					isPartner: clientType === "PARTNER",
				};
			}

			// Story 6.1: Add date range filter
			if (dateFrom || dateTo) {
				baseWhere.pickupAt = {
					...(dateFrom && { gte: new Date(dateFrom) }),
					...(dateTo && { lte: new Date(dateTo) }),
				};
			}

			const where = withTenantFilter(baseWhere, organizationId);

			const [quotes, total] = await Promise.all([
				db.quote.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						contact: true,
						vehicleCategory: true,
						// Story 22.4: Include subcontractor info
						subcontractor: true,
						// Story 24.5: Include endCustomer for quote summary display
						endCustomer: {
							select: {
								id: true,
								firstName: true,
								lastName: true,
								email: true,
								phone: true,
								difficultyScore: true,
							},
						},
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
					invoices: true,
					// Story 22.4: Include subcontractor info
					subcontractor: true,
					// Story 24.5: Include endCustomer for quote summary and PDF display
					endCustomer: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							email: true,
							phone: true,
							difficultyScore: true,
						},
					},
					// Story 29.1: Include lines for multi-item quotes
					lines: {
						orderBy: { sortOrder: "asc" },
					},
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

			// Story 29.1: Use transaction for atomic Quote + QuoteLines creation
			const result = await db.$transaction(async (tx) => {
				// Story 29.1: Calculate aggregated totals from lines if provided (Yolo Mode)
				const hasLines = data.lines && Array.isArray(data.lines) && data.lines.length > 0;
				let aggregatedFinalPrice = data.finalPrice ?? 0;
				let aggregatedInternalCost: number | null = data.internalCost ?? null;

				if (hasLines) {
					// Calculate totals from lines
					aggregatedFinalPrice = data.lines!.reduce((sum, line) => {
						const linePrice = Number(line.totalPrice) || Number(line.unitPrice) || 0;
						return sum + linePrice;
					}, 0);

					// Calculate internal cost from lines if available
					const lineCosts = data.lines!.map((line) => {
						const sourceData = line.sourceData as Record<string, unknown> | null;
						if (!sourceData) return null;
						// Check for direct internalCost or sum of cost components
						if (typeof sourceData.internalCost === "number") {
							return sourceData.internalCost;
						}
						const pricingResult = sourceData.pricingResult as Record<string, unknown> | null;
						if (pricingResult && typeof pricingResult.internalCost === "number") {
							return pricingResult.internalCost;
						}
						return null;
					});

					const validCosts = lineCosts.filter((c): c is number => c !== null);
					if (validCosts.length > 0) {
						aggregatedInternalCost = validCosts.reduce((sum, cost) => sum + cost, 0);
					}
				}

				// Calculate margin if we have both values
				let calculatedMargin: number | null = data.marginPercent ?? null;
				if (aggregatedInternalCost !== null && aggregatedFinalPrice > 0) {
					calculatedMargin = ((aggregatedFinalPrice - aggregatedInternalCost) / aggregatedFinalPrice) * 100;
				}

				// Create Quote header
				const quote = await tx.quote.create({
					data: withTenantCreate(
						{
							contactId: data.contactId,
							// Story 24.4: Link end-customer for partner agency sub-contacts
							endCustomerId: data.endCustomerId ?? null,
							vehicleCategoryId: data.vehicleCategoryId,
							pricingMode: data.pricingMode,
							tripType: data.tripType,
							pickupAt: new Date(data.pickupAt),
							pickupAddress: data.pickupAddress,
							pickupLatitude: data.pickupLatitude,
							pickupLongitude: data.pickupLongitude,
							// Story 16.1: dropoffAddress is now optional
							dropoffAddress: data.dropoffAddress ?? null,
							dropoffLatitude: data.dropoffLatitude,
							dropoffLongitude: data.dropoffLongitude,
							// Story 16.1: Trip type specific fields
							isRoundTrip: data.isRoundTrip ?? false,
							stops: data.stops as Prisma.InputJsonValue | undefined,
							returnDate: data.returnDate ? new Date(data.returnDate) : null,
							durationHours: data.durationHours,
							maxKilometers: data.maxKilometers,
							passengerCount: data.passengerCount,
							luggageCount: data.luggageCount,
							suggestedPrice: data.suggestedPrice,
							// Story 29.1: Use aggregated price from lines
							finalPrice: aggregatedFinalPrice,
							// Story 24.9: Store bidirectional prices
							partnerGridPrice: data.partnerGridPrice ?? null,
							clientDirectPrice: data.clientDirectPrice ?? null,
							// Story 29.1: Use aggregated internal cost
							internalCost: aggregatedInternalCost,
							marginPercent: calculatedMargin,
							tripAnalysis: data.tripAnalysis as
								| Prisma.InputJsonValue
								| undefined,
							appliedRules: data.appliedRules as
								| Prisma.InputJsonValue
								| undefined,
							// Story 15.7: Store cost breakdown for audit
							costBreakdown: data.costBreakdown as
								| Prisma.InputJsonValue
								| undefined,
							validUntil: data.validUntil ? new Date(data.validUntil) : null,
							notes: data.notes,
							// Story 17.5: Estimated end time for driver availability detection
							estimatedEndAt: data.estimatedEndAt
								? new Date(data.estimatedEndAt)
								: null,
							status: "DRAFT",
						},
						organizationId,
					),
				});

				// Story 29.1: Create QuoteLines if provided (Yolo Mode / Shopping Cart)
				let createdLines: Array<{
					id: string;
					type: string;
					label: string;
					totalPrice: number;
					sortOrder: number;
				}> = [];

				if (hasLines) {
					const linesToCreate = data.lines!.map((line, index) => {
						const lineData = line as Record<string, unknown>;
						// Parse type as QuoteLineType enum, default to CALCULATED
						const lineType = (lineData.type as string) === "MANUAL" 
							? QuoteLineType.MANUAL 
							: (lineData.type as string) === "GROUP" 
								? QuoteLineType.GROUP 
								: QuoteLineType.CALCULATED;
						
						const totalPrice = Number(lineData.totalPrice) || Number(lineData.unitPrice) || 0;
						const label = (lineData.label as string) || `Item ${index + 1}`;
						
						// Build displayData with proper typing
						const displayData: Prisma.InputJsonValue = lineData.displayData
							? (lineData.displayData as Prisma.InputJsonValue)
							: { 
								label, 
								quantity: 1, 
								unitPrice: totalPrice, 
								vatRate: 10, 
								total: totalPrice 
							};

						return {
							quoteId: quote.id,
							type: lineType,
							label,
							description: (lineData.description as string) || null,
							// CRITICAL: Store full operational metadata in sourceData
							sourceData: lineData.sourceData
								? (lineData.sourceData as Prisma.InputJsonValue)
								: Prisma.JsonNull,
							displayData,
							quantity: Number(lineData.quantity) || 1,
							unitPrice: Number(lineData.unitPrice) || totalPrice,
							totalPrice,
							vatRate: Number(lineData.vatRate) || 10,
							sortOrder: index,
							dispatchable: lineData.dispatchable !== false, // Default true
						};
					});

					// Use createMany for efficiency
					await tx.quoteLine.createMany({
						data: linesToCreate,
					});

					// Fetch created lines for response
					createdLines = await tx.quoteLine.findMany({
						where: { quoteId: quote.id },
						orderBy: { sortOrder: "asc" },
						select: {
							id: true,
							type: true,
							label: true,
							totalPrice: true,
							sortOrder: true,
						},
					}).then(lines => lines.map(l => ({
						...l,
						totalPrice: Number(l.totalPrice),
					})));

					console.log(
						`[Story 29.1] Created ${createdLines.length} QuoteLines for quote ${quote.id}, aggregated finalPrice: ${aggregatedFinalPrice}`,
					);
				}

				return { quote, createdLines };
			});

			// Fetch complete quote with all relations for response
			const completeQuote = await db.quote.findUnique({
				where: { id: result.quote.id },
				include: {
					contact: true,
					vehicleCategory: true,
					// Story 24.5: Include endCustomer for response
					endCustomer: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							email: true,
							phone: true,
							difficultyScore: true,
						},
					},
					// Story 29.1: Include lines in response
					lines: {
						orderBy: { sortOrder: "asc" },
					},
				},
			});

			// Story 27.2: Sync missions after quote creation
			try {
				await missionSyncService.syncQuoteMissions(result.quote.id);
			} catch (syncError) {
				// Log sync error but don't fail the quote creation
				console.warn(
					`[MissionSync] Failed to sync missions for quote ${result.quote.id}:`,
					syncError,
				);
			}

			return c.json(completeQuote, 201);
		},
	)

	// Update quote
	.patch(
		"/:id",
		validator("json", updateQuoteSchema),
		describeRoute({
			summary: "Update quote",
			description:
				"Update an existing quote. Status transitions are validated via state machine (Story 6.4).",
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

			// Story 6.4: Handle status transitions via state machine
			if (data.status && data.status !== existing.status) {
				// Get user ID from session if available
				const session = c.get("session");
				const userId =
					typeof session === "object" && session?.userId
						? session.userId
						: undefined;

				const result = await QuoteStateMachine.transition(
					id,
					data.status as QuoteStatus,
					organizationId,
					userId,
				);

				if (!result.success) {
					throw new HTTPException(400, {
						message: result.error || "Invalid status transition",
					});
				}

				// If only status was being updated, return the result
				if (!data.notes && !data.validUntil && !data.finalPrice) {
					return c.json(result.quote);
				}

				// Continue with other updates if present
				// Remove status from data since it's already handled
				delete data.status;
			}

			// Check if trying to modify fields that require DRAFT status
			const isFullEdit =
				data.contactId !== undefined ||
				data.vehicleCategoryId !== undefined ||
				data.pricingMode !== undefined ||
				data.tripType !== undefined ||
				data.pickupAt !== undefined ||
				data.pickupAddress !== undefined ||
				data.pickupLatitude !== undefined ||
				data.pickupLongitude !== undefined ||
				data.dropoffAddress !== undefined ||
				data.dropoffLatitude !== undefined ||
				data.dropoffLongitude !== undefined ||
				data.passengerCount !== undefined ||
				data.luggageCount !== undefined ||
				data.suggestedPrice !== undefined ||
				data.internalCost !== undefined ||
				data.marginPercent !== undefined ||
				data.tripAnalysis !== undefined ||
				data.appliedRules !== undefined;

			// Block full edit for non-DRAFT quotes
			if (isFullEdit && !QuoteStateMachine.isEditable(existing.status)) {
				throw new HTTPException(400, {
					message:
						"Cannot fully edit non-DRAFT quotes. Only notes and validUntil can be modified.",
				});
			}

			// Story 6.4: Block commercial value changes for non-DRAFT quotes
			if (
				data.finalPrice !== undefined &&
				QuoteStateMachine.isCommerciallyFrozen(existing.status)
			) {
				throw new HTTPException(400, {
					message:
						"Cannot modify commercial values for non-DRAFT quotes. Commercial values are frozen after sending.",
				});
			}

			// Story 22.3: Allow notes changes for non-EXPIRED quotes
			// Notes are editable for operational purposes (driver instructions) even after sending
			if (
				data.notes !== undefined &&
				!QuoteStateMachine.isNotesEditable(existing.status)
			) {
				throw new HTTPException(400, {
					message: "Cannot modify notes for EXPIRED quotes.",
				});
			}

			// Story 22.3: Create audit log for notes changes on non-DRAFT quotes
			if (
				data.notes !== undefined &&
				data.notes !== existing.notes &&
				!QuoteStateMachine.isEditable(existing.status)
			) {
				const sessionData = c.get("session");
				const auditUserId =
					typeof sessionData === "object" && sessionData?.userId
						? sessionData.userId
						: null;
				await db.quoteNotesAuditLog.create({
					data: {
						organizationId,
						quoteId: id,
						previousNotes: existing.notes,
						newNotes: data.notes,
						userId: auditUserId,
					},
				});
			}

			// Verify contact belongs to this organization if changing
			if (data.contactId !== undefined) {
				const contact = await db.contact.findFirst({
					where: withTenantId(data.contactId, organizationId),
				});
				if (!contact) {
					throw new HTTPException(400, { message: "Contact not found" });
				}
			}

			// Verify vehicleCategory belongs to this organization if changing
			if (data.vehicleCategoryId !== undefined) {
				const category = await db.vehicleCategory.findFirst({
					where: withTenantId(data.vehicleCategoryId, organizationId),
				});
				if (!category) {
					throw new HTTPException(400, {
						message: "Vehicle category not found",
					});
				}
			}

			const quote = await db.quote.update({
				where: { id },
				data: {
					// Full edit fields (only for DRAFT) - use connect for relations
					...(data.contactId !== undefined && {
						contact: { connect: { id: data.contactId } },
					}),
					...(data.vehicleCategoryId !== undefined && {
						vehicleCategory: { connect: { id: data.vehicleCategoryId } },
					}),
					...(data.pricingMode !== undefined && {
						pricingMode: data.pricingMode,
					}),
					...(data.tripType !== undefined && { tripType: data.tripType }),
					...(data.pickupAt !== undefined && {
						pickupAt: new Date(data.pickupAt),
					}),
					...(data.pickupAddress !== undefined && {
						pickupAddress: data.pickupAddress,
					}),
					...(data.pickupLatitude !== undefined && {
						pickupLatitude: data.pickupLatitude,
					}),
					...(data.pickupLongitude !== undefined && {
						pickupLongitude: data.pickupLongitude,
					}),
					...(data.dropoffAddress !== undefined && {
						dropoffAddress: data.dropoffAddress,
					}),
					...(data.dropoffLatitude !== undefined && {
						dropoffLatitude: data.dropoffLatitude,
					}),
					...(data.dropoffLongitude !== undefined && {
						dropoffLongitude: data.dropoffLongitude,
					}),
					...(data.passengerCount !== undefined && {
						passengerCount: data.passengerCount,
					}),
					...(data.luggageCount !== undefined && {
						luggageCount: data.luggageCount,
					}),
					...(data.suggestedPrice !== undefined && {
						suggestedPrice: data.suggestedPrice,
					}),
					...(data.internalCost !== undefined && {
						internalCost: data.internalCost,
					}),
					...(data.marginPercent !== undefined && {
						marginPercent: data.marginPercent,
					}),
					...(data.tripAnalysis !== undefined && {
						tripAnalysis:
							data.tripAnalysis === null
								? Prisma.JsonNull
								: (data.tripAnalysis as Prisma.InputJsonValue),
					}),
					...(data.appliedRules !== undefined && {
						appliedRules:
							data.appliedRules === null
								? Prisma.JsonNull
								: (data.appliedRules as Prisma.InputJsonValue),
					}),
					// Story 15.7: Cost breakdown for audit
					...(data.costBreakdown !== undefined && {
						costBreakdown:
							data.costBreakdown === null
								? Prisma.JsonNull
								: (data.costBreakdown as Prisma.InputJsonValue),
					}),
					// Standard update fields
					...(data.finalPrice !== undefined && { finalPrice: data.finalPrice }),
					// Story 24.9: Update bidirectional prices
					...(data.partnerGridPrice !== undefined && {
						partnerGridPrice: data.partnerGridPrice,
					}),
					...(data.clientDirectPrice !== undefined && {
						clientDirectPrice: data.clientDirectPrice,
					}),
					...(data.notes !== undefined && { notes: data.notes }),
					...(data.validUntil !== undefined && {
						validUntil: data.validUntil ? new Date(data.validUntil) : null,
					}),
					// Story 17.5: Estimated end time for driver availability detection
					...(data.estimatedEndAt !== undefined && {
						estimatedEndAt: data.estimatedEndAt
							? new Date(data.estimatedEndAt)
							: null,
					}),
				},
				include: {
					contact: true,
					vehicleCategory: true,
					invoices: true,
					// Story 24.5: Include endCustomer for response
					endCustomer: {
						select: {
							id: true,
							firstName: true,
							lastName: true,
							email: true,
							phone: true,
							difficultyScore: true,
						},
					},
				},
			});

			// Story 27.2: Sync missions after quote update
			try {
				await missionSyncService.syncQuoteMissions(quote.id);
			} catch (syncError) {
				// Log sync error but don't fail the quote update
				console.warn(
					`[MissionSync] Failed to sync missions for quote ${quote.id}:`,
					syncError,
				);
			}

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
