/**
 * Stay Quotes API Routes
 * Story 22.5: API endpoints for STAY trip type (multi-day packages)
 */

import { db } from "@repo/database";
import { Prisma, TripType } from "@prisma/client";
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
import {
	calculateStayPricing,
	type StayDayInput,
	type OrganizationPricingSettings,
} from "../../services/pricing";

// ============================================================================
// Validation Schemas
// ============================================================================

const stayServiceSchema = z.object({
	serviceType: z.enum(["TRANSFER", "DISPO", "EXCURSION"]).describe("Type of service"),
	pickupAt: z.string().datetime().describe("Pickup time for this service"),
	pickupAddress: z.string().min(1).describe("Pickup address"),
	pickupLatitude: z.number().optional().nullable().describe("Pickup latitude"),
	pickupLongitude: z.number().optional().nullable().describe("Pickup longitude"),
	dropoffAddress: z.string().optional().nullable().describe("Dropoff address (optional for DISPO)"),
	dropoffLatitude: z.number().optional().nullable().describe("Dropoff latitude"),
	dropoffLongitude: z.number().optional().nullable().describe("Dropoff longitude"),
	durationHours: z.number().positive().optional().nullable().describe("Duration in hours for DISPO"),
	stops: z.array(z.object({
		address: z.string().min(1),
		latitude: z.number(),
		longitude: z.number(),
		order: z.number().int().nonnegative(),
	})).optional().nullable().describe("Intermediate stops for EXCURSION"),
	distanceKm: z.number().nonnegative().optional().nullable().describe("Calculated distance"),
	durationMinutes: z.number().int().nonnegative().optional().nullable().describe("Calculated duration"),
	notes: z.string().optional().nullable().describe("Service-specific notes"),
});

const stayDaySchema = z.object({
	date: z.string().describe("Date for this day (ISO format)"),
	hotelRequired: z.boolean().optional().default(false).describe("Whether overnight stay is needed"),
	mealCount: z.number().int().nonnegative().optional().default(0).describe("Number of meals for this day"),
	driverCount: z.number().int().positive().optional().default(1).describe("Number of drivers needed"),
	notes: z.string().optional().nullable().describe("Day-specific notes"),
	services: z.array(stayServiceSchema).min(1).describe("Services for this day"),
});

const createStayQuoteSchema = z.object({
	contactId: z.string().min(1).describe("Contact ID for the quote"),
	vehicleCategoryId: z.string().min(1).describe("Vehicle category ID"),
	passengerCount: z.number().int().positive().describe("Number of passengers"),
	luggageCount: z.number().int().nonnegative().optional().default(0).describe("Number of luggage pieces"),
	notes: z.string().optional().nullable().describe("Additional notes"),
	stayDays: z.array(stayDaySchema).min(1).describe("Days in the stay package"),
});

const updateStayQuoteSchema = z.object({
	passengerCount: z.number().int().positive().optional().describe("Number of passengers"),
	luggageCount: z.number().int().nonnegative().optional().describe("Number of luggage pieces"),
	notes: z.string().optional().nullable().describe("Additional notes"),
	stayDays: z.array(stayDaySchema).optional().describe("Updated days in the stay package"),
});

// ============================================================================
// Helper Functions
// ============================================================================

async function getOrganizationPricingSettings(organizationId: string): Promise<OrganizationPricingSettings> {
	const settings = await db.organizationPricingSettings.findUnique({
		where: { organizationId },
	});

	if (!settings) {
		return {
			baseRatePerKm: 2.5,
			baseRatePerHour: 50,
			targetMarginPercent: 30,
		};
	}

	// Build staffingCostParameters from individual fields
	const staffingCostParameters = {
		hotelCostPerNight: settings.hotelCostPerNight ? Number(settings.hotelCostPerNight) : 100,
		mealAllowancePerDay: settings.mealCostPerDay ? Number(settings.mealCostPerDay) : 30,
		driverOvernightPremium: settings.driverOvernightPremium ? Number(settings.driverOvernightPremium) : 50,
		driverHourlyCost: settings.driverHourlyCost ? Number(settings.driverHourlyCost) : 25,
		relayDriverFixedFee: settings.relayDriverFixedFee ? Number(settings.relayDriverFixedFee) : 150,
	};

	return {
		organizationId: settings.organizationId,
		baseRatePerKm: Number(settings.baseRatePerKm),
		baseRatePerHour: Number(settings.baseRatePerHour),
		targetMarginPercent: Number(settings.defaultMarginPercent),
		fuelConsumptionL100km: settings.fuelConsumptionL100km ? Number(settings.fuelConsumptionL100km) : undefined,
		fuelPricePerLiter: settings.fuelPricePerLiter ? Number(settings.fuelPricePerLiter) : undefined,
		tollCostPerKm: settings.tollCostPerKm ? Number(settings.tollCostPerKm) : undefined,
		wearCostPerKm: settings.wearCostPerKm ? Number(settings.wearCostPerKm) : undefined,
		driverHourlyCost: settings.driverHourlyCost ? Number(settings.driverHourlyCost) : undefined,
		staffingCostParameters,
	};
}

async function getVehicleCategoryRates(categoryId: string): Promise<{ ratePerKm: number; ratePerHour: number }> {
	const category = await db.vehicleCategory.findUnique({
		where: { id: categoryId },
	});

	if (!category) {
		return { ratePerKm: 2.5, ratePerHour: 50 };
	}

	return {
		ratePerKm: category.defaultRatePerKm ? Number(category.defaultRatePerKm) : 2.5,
		ratePerHour: category.defaultRatePerHour ? Number(category.defaultRatePerHour) : 50,
	};
}

// ============================================================================
// Routes
// ============================================================================

export const stayQuotesRouter = new Hono()
	.basePath("/stay-quotes")
	.use("*", organizationMiddleware)

	// Create STAY quote
	.post(
		"/",
		validator("json", createStayQuoteSchema),
		describeRoute({
			summary: "Create STAY quote",
			description: "Create a new STAY quote with multiple days and services",
			tags: ["VTC - Stay Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			// Verify contact belongs to this organization
			const contact = await db.contact.findFirst({
				where: withTenantId(data.contactId, organizationId),
			});

			if (!contact) {
				throw new HTTPException(400, { message: "Contact not found" });
			}

			// Verify vehicleCategory belongs to this organization
			const category = await db.vehicleCategory.findFirst({
				where: withTenantId(data.vehicleCategoryId, organizationId),
			});

			if (!category) {
				throw new HTTPException(400, { message: "Vehicle category not found" });
			}

			// Get pricing settings and rates
			const settings = await getOrganizationPricingSettings(organizationId);
			const rates = await getVehicleCategoryRates(data.vehicleCategoryId);

			// Convert stayDays to pricing input format
			const stayDaysInput: StayDayInput[] = data.stayDays.map(day => ({
				date: day.date,
				hotelRequired: day.hotelRequired,
				mealCount: day.mealCount,
				driverCount: day.driverCount,
				notes: day.notes ?? undefined,
				services: day.services.map(svc => ({
					serviceType: svc.serviceType,
					pickupAt: svc.pickupAt,
					pickupAddress: svc.pickupAddress,
					pickupLatitude: svc.pickupLatitude ?? undefined,
					pickupLongitude: svc.pickupLongitude ?? undefined,
					dropoffAddress: svc.dropoffAddress ?? undefined,
					dropoffLatitude: svc.dropoffLatitude ?? undefined,
					dropoffLongitude: svc.dropoffLongitude ?? undefined,
					durationHours: svc.durationHours ?? undefined,
					stops: svc.stops ?? undefined,
					distanceKm: svc.distanceKm ?? undefined,
					durationMinutes: svc.durationMinutes ?? undefined,
					notes: svc.notes ?? undefined,
				})),
			}));

			// Calculate pricing
			const pricingResult = calculateStayPricing(
				{
					vehicleCategoryId: data.vehicleCategoryId,
					passengerCount: data.passengerCount,
					stayDays: stayDaysInput,
				},
				settings,
				rates.ratePerKm,
				rates.ratePerHour,
			);

			// Get first service pickup for quote pickupAt
			const firstDay = data.stayDays.sort((a, b) => 
				new Date(a.date).getTime() - new Date(b.date).getTime()
			)[0];
			const firstService = firstDay?.services[0];

			// Create quote with stayDays in a transaction
			const quote = await db.$transaction(async (tx) => {
				// Create the quote
				const newQuote = await tx.quote.create({
					data: withTenantCreate(
						{
							contactId: data.contactId,
							vehicleCategoryId: data.vehicleCategoryId,
							pricingMode: "DYNAMIC",
							tripType: "STAY" as TripType,
							pickupAt: firstService ? new Date(firstService.pickupAt) : new Date(),
							pickupAddress: firstService?.pickupAddress ?? "Multiple locations",
							passengerCount: data.passengerCount,
							luggageCount: data.luggageCount ?? 0,
							suggestedPrice: pricingResult.totalCost,
							finalPrice: pricingResult.totalCost,
							internalCost: pricingResult.totalInternalCost,
							marginPercent: pricingResult.marginPercent,
							tripAnalysis: pricingResult.tripAnalysis as Prisma.InputJsonValue,
							notes: data.notes,
							stayStartDate: new Date(pricingResult.stayStartDate),
							stayEndDate: new Date(pricingResult.stayEndDate),
							status: "DRAFT",
						},
						organizationId,
					),
				});

				// Create stay days and services
				for (const dayResult of pricingResult.days) {
					const dayInput = data.stayDays.find(d => d.date === dayResult.date);
					if (!dayInput) continue;

					const stayDay = await tx.stayDay.create({
						data: {
							quoteId: newQuote.id,
							dayNumber: dayResult.dayNumber,
							date: new Date(dayResult.date),
							hotelRequired: dayResult.hotelRequired,
							hotelCost: dayResult.hotelCost,
							mealCount: dayResult.mealCount,
							mealCost: dayResult.mealCost,
							driverCount: dayResult.driverCount,
							driverOvernightCost: dayResult.driverOvernightCost,
							dayTotalCost: dayResult.dayTotalCost,
							dayTotalInternalCost: dayResult.dayTotalInternalCost,
							notes: dayInput.notes,
						},
					});

					// Create services for this day
					for (const svcResult of dayResult.services) {
						const svcInput = dayInput.services[svcResult.serviceOrder - 1];
						if (!svcInput) continue;

						await tx.stayService.create({
							data: {
								stayDayId: stayDay.id,
								serviceOrder: svcResult.serviceOrder,
								serviceType: svcResult.serviceType,
								pickupAt: new Date(svcInput.pickupAt),
								pickupAddress: svcInput.pickupAddress,
								pickupLatitude: svcInput.pickupLatitude,
								pickupLongitude: svcInput.pickupLongitude,
								dropoffAddress: svcInput.dropoffAddress,
								dropoffLatitude: svcInput.dropoffLatitude,
								dropoffLongitude: svcInput.dropoffLongitude,
								durationHours: svcInput.durationHours,
								stops: svcInput.stops as Prisma.InputJsonValue | undefined,
								distanceKm: svcResult.distanceKm,
								durationMinutes: svcResult.durationMinutes,
								serviceCost: svcResult.serviceCost,
								serviceInternalCost: svcResult.serviceInternalCost,
								tripAnalysis: svcResult.tripAnalysis as Prisma.InputJsonValue | undefined,
								notes: svcInput.notes,
							},
						});
					}
				}

				return newQuote;
			});

			// Fetch complete quote with relations
			const completeQuote = await db.quote.findUnique({
				where: { id: quote.id },
				include: {
					contact: true,
					vehicleCategory: true,
					stayDays: {
						include: {
							services: {
								orderBy: { serviceOrder: "asc" },
							},
						},
						orderBy: { dayNumber: "asc" },
					},
				},
			});

			return c.json(completeQuote, 201);
		},
	)

	// Get STAY quote by ID
	.get(
		"/:id",
		describeRoute({
			summary: "Get STAY quote",
			description: "Get a STAY quote by ID with all days and services",
			tags: ["VTC - Stay Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");

			const quote = await db.quote.findFirst({
				where: {
					...withTenantId(id, organizationId),
					tripType: "STAY" as TripType,
				},
				include: {
					contact: true,
					vehicleCategory: true,
					invoice: true,
					stayDays: {
						include: {
							services: {
								orderBy: { serviceOrder: "asc" },
							},
						},
						orderBy: { dayNumber: "asc" },
					},
				},
			});

			if (!quote) {
				throw new HTTPException(404, { message: "Stay quote not found" });
			}

			return c.json(quote);
		},
	)

	// Update STAY quote (DRAFT only)
	.patch(
		"/:id",
		validator("json", updateStayQuoteSchema),
		describeRoute({
			summary: "Update STAY quote",
			description: "Update a STAY quote. Only DRAFT quotes can have stayDays modified.",
			tags: ["VTC - Stay Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const id = c.req.param("id");
			const data = c.req.valid("json");

			const existing = await db.quote.findFirst({
				where: {
					...withTenantId(id, organizationId),
					tripType: "STAY" as TripType,
				},
				include: {
					stayDays: {
						include: { services: true },
					},
				},
			});

			if (!existing) {
				throw new HTTPException(404, { message: "Stay quote not found" });
			}

			// Only DRAFT quotes can have stayDays modified
			if (data.stayDays && existing.status !== "DRAFT") {
				throw new HTTPException(400, {
					message: "Cannot modify stay days for non-DRAFT quotes",
				});
			}

			// If updating stayDays, recalculate pricing
			if (data.stayDays) {
				const settings = await getOrganizationPricingSettings(organizationId);
				const rates = await getVehicleCategoryRates(existing.vehicleCategoryId);

				const stayDaysInput: StayDayInput[] = data.stayDays.map(day => ({
					date: day.date,
					hotelRequired: day.hotelRequired,
					mealCount: day.mealCount,
					driverCount: day.driverCount,
					notes: day.notes ?? undefined,
					services: day.services.map(svc => ({
						serviceType: svc.serviceType,
						pickupAt: svc.pickupAt,
						pickupAddress: svc.pickupAddress,
						pickupLatitude: svc.pickupLatitude ?? undefined,
						pickupLongitude: svc.pickupLongitude ?? undefined,
						dropoffAddress: svc.dropoffAddress ?? undefined,
						dropoffLatitude: svc.dropoffLatitude ?? undefined,
						dropoffLongitude: svc.dropoffLongitude ?? undefined,
						durationHours: svc.durationHours ?? undefined,
						stops: svc.stops ?? undefined,
						distanceKm: svc.distanceKm ?? undefined,
						durationMinutes: svc.durationMinutes ?? undefined,
						notes: svc.notes ?? undefined,
					})),
				}));

				const pricingResult = calculateStayPricing(
					{
						vehicleCategoryId: existing.vehicleCategoryId,
						passengerCount: data.passengerCount ?? existing.passengerCount,
						stayDays: stayDaysInput,
					},
					settings,
					rates.ratePerKm,
					rates.ratePerHour,
				);

				// Update in transaction
				await db.$transaction(async (tx) => {
					// Delete existing stay days (cascade deletes services)
					await tx.stayDay.deleteMany({
						where: { quoteId: id },
					});

					// Update quote
					await tx.quote.update({
						where: { id },
						data: {
							passengerCount: data.passengerCount ?? existing.passengerCount,
							luggageCount: data.luggageCount ?? existing.luggageCount,
							notes: data.notes !== undefined ? data.notes : existing.notes,
							suggestedPrice: pricingResult.totalCost,
							finalPrice: pricingResult.totalCost,
							internalCost: pricingResult.totalInternalCost,
							marginPercent: pricingResult.marginPercent,
							tripAnalysis: pricingResult.tripAnalysis as Prisma.InputJsonValue,
							stayStartDate: new Date(pricingResult.stayStartDate),
							stayEndDate: new Date(pricingResult.stayEndDate),
						},
					});

					// Create new stay days and services
					for (const dayResult of pricingResult.days) {
						const dayInput = data.stayDays!.find(d => d.date === dayResult.date);
						if (!dayInput) continue;

						const stayDay = await tx.stayDay.create({
							data: {
								quoteId: id,
								dayNumber: dayResult.dayNumber,
								date: new Date(dayResult.date),
								hotelRequired: dayResult.hotelRequired,
								hotelCost: dayResult.hotelCost,
								mealCount: dayResult.mealCount,
								mealCost: dayResult.mealCost,
								driverCount: dayResult.driverCount,
								driverOvernightCost: dayResult.driverOvernightCost,
								dayTotalCost: dayResult.dayTotalCost,
								dayTotalInternalCost: dayResult.dayTotalInternalCost,
								notes: dayInput.notes,
							},
						});

						for (const svcResult of dayResult.services) {
							const svcInput = dayInput.services[svcResult.serviceOrder - 1];
							if (!svcInput) continue;

							await tx.stayService.create({
								data: {
									stayDayId: stayDay.id,
									serviceOrder: svcResult.serviceOrder,
									serviceType: svcResult.serviceType,
									pickupAt: new Date(svcInput.pickupAt),
									pickupAddress: svcInput.pickupAddress,
									pickupLatitude: svcInput.pickupLatitude,
									pickupLongitude: svcInput.pickupLongitude,
									dropoffAddress: svcInput.dropoffAddress,
									dropoffLatitude: svcInput.dropoffLatitude,
									dropoffLongitude: svcInput.dropoffLongitude,
									durationHours: svcInput.durationHours,
									stops: svcInput.stops as Prisma.InputJsonValue | undefined,
									distanceKm: svcResult.distanceKm,
									durationMinutes: svcResult.durationMinutes,
									serviceCost: svcResult.serviceCost,
									serviceInternalCost: svcResult.serviceInternalCost,
									tripAnalysis: svcResult.tripAnalysis as Prisma.InputJsonValue | undefined,
									notes: svcInput.notes,
								},
							});
						}
					}
				});
			} else {
				// Simple update without stayDays
				await db.quote.update({
					where: { id },
					data: {
						...(data.passengerCount !== undefined && { passengerCount: data.passengerCount }),
						...(data.luggageCount !== undefined && { luggageCount: data.luggageCount }),
						...(data.notes !== undefined && { notes: data.notes }),
					},
				});
			}

			// Fetch updated quote
			const updatedQuote = await db.quote.findUnique({
				where: { id },
				include: {
					contact: true,
					vehicleCategory: true,
					stayDays: {
						include: {
							services: {
								orderBy: { serviceOrder: "asc" },
							},
						},
						orderBy: { dayNumber: "asc" },
					},
				},
			});

			return c.json(updatedQuote);
		},
	)

	// List STAY quotes
	.get(
		"/",
		describeRoute({
			summary: "List STAY quotes",
			description: "Get a paginated list of STAY quotes for the current organization",
			tags: ["VTC - Stay Quotes"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const page = Number(c.req.query("page") ?? 1);
			const limit = Math.min(Number(c.req.query("limit") ?? 20), 100);
			const skip = (page - 1) * limit;

			const where = withTenantFilter({ tripType: "STAY" }, organizationId);

			const [quotes, total] = await Promise.all([
				db.quote.findMany({
					where,
					skip,
					take: limit,
					orderBy: { createdAt: "desc" },
					include: {
						contact: true,
						vehicleCategory: true,
						stayDays: {
							include: {
								services: {
									orderBy: { serviceOrder: "asc" },
								},
							},
							orderBy: { dayNumber: "asc" },
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
	);
