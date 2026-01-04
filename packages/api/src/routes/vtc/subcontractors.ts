/**
 * Subcontractor API Routes
 * Story 8.6: Integrate Subcontractor Directory & Subcontracting Suggestions
 *
 * Provides endpoints for:
 * - CRUD operations on subcontractor profiles
 * - Subcontracting suggestions for missions
 * - Subcontracting a mission
 */

import { db } from "@repo/database";
import { Hono } from "hono";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { organizationMiddleware } from "../../middleware/organization";
import {
	listSubcontractors,
	getSubcontractorById,
	createSubcontractor,
	updateSubcontractor,
	deleteSubcontractor,
	generateSubcontractingSuggestions,
	subcontractMission,
	removeSubcontracting,
	DEFAULT_SUBCONTRACTOR_CONFIG,
} from "../../services/subcontractor-service";
import {
	getSubcontractorPerformance,
	recordSubcontractorFeedback,
	updateSubcontractorAvailability,
	getSubcontractorsWithMatchScores,
} from "../../services/subcontractor-performance-service";

// ============================================================================
// Validation Schemas
// ============================================================================

const listSubcontractorsQuerySchema = z.object({
	includeInactive: z.string().optional().transform((v) => v === "true"),
});

// Story 22.4: Refactored - Subcontractor is now an independent company entity
const createSubcontractorSchema = z.object({
	// Company information (required)
	companyName: z.string().min(1, "Company name is required").max(255),
	siret: z.string().max(20).optional(),
	vatNumber: z.string().max(50).optional(),
	// Contact details
	contactName: z.string().max(255).optional(),
	email: z.string().email().optional().or(z.literal("")),
	phone: z.string().max(50).optional(),
	address: z.string().optional(),
	// Coverage
	allZones: z.boolean().optional().default(false),
	operatingZoneIds: z.array(z.string()).optional().default([]),
	vehicleCategoryIds: z.array(z.string()).optional().default([]),
	// Pricing
	ratePerKm: z.number().positive().optional(),
	ratePerHour: z.number().positive().optional(),
	minimumFare: z.number().positive().optional(),
	notes: z.string().optional(),
});

const updateSubcontractorSchema = z.object({
	// Company information
	companyName: z.string().min(1).max(255).optional(),
	siret: z.string().max(20).nullable().optional(),
	vatNumber: z.string().max(50).nullable().optional(),
	// Contact details
	contactName: z.string().max(255).nullable().optional(),
	email: z.string().email().nullable().optional(),
	phone: z.string().max(50).nullable().optional(),
	address: z.string().nullable().optional(),
	// Coverage
	allZones: z.boolean().optional(),
	operatingZoneIds: z.array(z.string()).optional(),
	vehicleCategoryIds: z.array(z.string()).optional(),
	// Pricing
	ratePerKm: z.number().positive().nullable().optional(),
	ratePerHour: z.number().positive().nullable().optional(),
	minimumFare: z.number().positive().nullable().optional(),
	notes: z.string().nullable().optional(),
	isActive: z.boolean().optional(),
});

const subcontractMissionSchema = z.object({
	subcontractorId: z.string().min(1, "Subcontractor ID is required"),
	agreedPrice: z.number().positive("Agreed price must be positive"),
	notes: z.string().optional(),
});

const suggestionsQuerySchema = z.object({
	threshold: z.string().optional().transform((v) => (v ? parseFloat(v) : undefined)),
	maxSuggestions: z.string().optional().transform((v) => (v ? parseInt(v, 10) : undefined)),
});

// Story 22.10: Feedback schema
const feedbackSchema = z.object({
	quoteId: z.string().min(1, "Quote ID is required"),
	rating: z.number().int().min(1).max(5),
	punctuality: z.number().int().min(1).max(5).optional(),
	vehicleCondition: z.number().int().min(1).max(5).optional(),
	driverProfessionalism: z.number().int().min(1).max(5).optional(),
	communication: z.number().int().min(1).max(5).optional(),
	comments: z.string().optional(),
});

// Story 22.10: Availability update schema
const availabilitySchema = z.object({
	status: z.enum(["AVAILABLE", "BUSY", "OFFLINE"]),
	notes: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const subcontractorsRouter = new Hono()
	.basePath("/subcontractors")
	.use("*", organizationMiddleware)
	// -------------------------------------------------------------------------
	// GET /api/vtc/subcontractors - List all subcontractors
	// -------------------------------------------------------------------------
	.get("/", validator("query", listSubcontractorsQuerySchema), async (c) => {
		const organizationId = c.get("organizationId");

		const { includeInactive } = c.req.valid("query");

		try {
			const subcontractors = await listSubcontractors(organizationId, db, {
				includeInactive,
			});

			return c.json({
				subcontractors,
				total: subcontractors.length,
			});
		} catch (error) {
			console.error("Error listing subcontractors:", error);
			return c.json({ error: "Failed to list subcontractors" }, 500);
		}
	})

	// -------------------------------------------------------------------------
	// GET /api/vtc/subcontractors/:id - Get subcontractor by ID
	// -------------------------------------------------------------------------
	.get("/:id", async (c) => {
		const organizationId = c.get("organizationId");
		const subcontractorId = c.req.param("id");

		try {
			const subcontractor = await getSubcontractorById(subcontractorId, organizationId, db);

			if (!subcontractor) {
				return c.json({ error: "Subcontractor not found" }, 404);
			}

			// Story 22.4: Return independent company entity
			return c.json({
				subcontractor: {
					id: subcontractor.id,
					companyName: subcontractor.companyName,
					siret: subcontractor.siret,
					vatNumber: subcontractor.vatNumber,
					contactName: subcontractor.contactName,
					email: subcontractor.email,
					phone: subcontractor.phone,
					address: subcontractor.address,
					allZones: subcontractor.allZones,
					operatingZones: subcontractor.operatingZones.map((sz: { pricingZone: { id: string; name: string; code: string } }) => ({
						id: sz.pricingZone.id,
						name: sz.pricingZone.name,
						code: sz.pricingZone.code,
					})),
					vehicleCategories: subcontractor.vehicleCategories.map((vc: { vehicleCategory: { id: string; name: string; code: string } }) => ({
						id: vc.vehicleCategory.id,
						name: vc.vehicleCategory.name,
						code: vc.vehicleCategory.code,
					})),
					ratePerKm: subcontractor.ratePerKm ? Number(subcontractor.ratePerKm) : null,
					ratePerHour: subcontractor.ratePerHour ? Number(subcontractor.ratePerHour) : null,
					minimumFare: subcontractor.minimumFare ? Number(subcontractor.minimumFare) : null,
					isActive: subcontractor.isActive,
					notes: subcontractor.notes,
					createdAt: subcontractor.createdAt.toISOString(),
					updatedAt: subcontractor.updatedAt.toISOString(),
				},
			});
		} catch (error) {
			console.error("Error getting subcontractor:", error);
			return c.json({ error: "Failed to get subcontractor" }, 500);
		}
	})

	// -------------------------------------------------------------------------
	// POST /api/vtc/subcontractors - Create subcontractor
	// -------------------------------------------------------------------------
	.post("/", validator("json", createSubcontractorSchema), async (c) => {
		const organizationId = c.get("organizationId");
		const data = c.req.valid("json");

		try {
			const subcontractor = await createSubcontractor(organizationId, data, db);

			// Story 22.4: Return independent company entity
			return c.json(
				{
					subcontractor: {
						id: subcontractor.id,
						companyName: subcontractor.companyName,
						operatingZones: subcontractor.operatingZones.map((sz: { pricingZone: { id: string; name: string; code: string } }) => ({
							id: sz.pricingZone.id,
							name: sz.pricingZone.name,
							code: sz.pricingZone.code,
						})),
						vehicleCategories: subcontractor.vehicleCategories.map((vc: { vehicleCategory: { id: string; name: string; code: string } }) => ({
							id: vc.vehicleCategory.id,
							name: vc.vehicleCategory.name,
							code: vc.vehicleCategory.code,
						})),
						ratePerKm: subcontractor.ratePerKm ? Number(subcontractor.ratePerKm) : null,
						ratePerHour: subcontractor.ratePerHour ? Number(subcontractor.ratePerHour) : null,
						minimumFare: subcontractor.minimumFare ? Number(subcontractor.minimumFare) : null,
						isActive: subcontractor.isActive,
					},
				},
				201
			);
		} catch (error) {
			console.error("Error creating subcontractor:", error);
			const message = error instanceof Error ? error.message : "Failed to create subcontractor";
			return c.json({ error: message }, 400);
		}
	})

	// -------------------------------------------------------------------------
	// PATCH /api/vtc/subcontractors/:id - Update subcontractor
	// -------------------------------------------------------------------------
	.patch("/:id", validator("json", updateSubcontractorSchema), async (c) => {
		const organizationId = c.get("organizationId");
		const subcontractorId = c.req.param("id");
		const data = c.req.valid("json");

		try {
			const subcontractor = await updateSubcontractor(subcontractorId, organizationId, data, db);

			// Story 22.4: Return independent company entity
			return c.json({
				subcontractor: {
					id: subcontractor.id,
					companyName: subcontractor.companyName,
					operatingZones: subcontractor.operatingZones.map((sz: { pricingZone: { id: string; name: string; code: string } }) => ({
						id: sz.pricingZone.id,
						name: sz.pricingZone.name,
						code: sz.pricingZone.code,
					})),
					vehicleCategories: subcontractor.vehicleCategories.map((vc: { vehicleCategory: { id: string; name: string; code: string } }) => ({
						id: vc.vehicleCategory.id,
						name: vc.vehicleCategory.name,
						code: vc.vehicleCategory.code,
					})),
					ratePerKm: subcontractor.ratePerKm ? Number(subcontractor.ratePerKm) : null,
					ratePerHour: subcontractor.ratePerHour ? Number(subcontractor.ratePerHour) : null,
					minimumFare: subcontractor.minimumFare ? Number(subcontractor.minimumFare) : null,
					isActive: subcontractor.isActive,
				},
			});
		} catch (error) {
			console.error("Error updating subcontractor:", error);
			const message = error instanceof Error ? error.message : "Failed to update subcontractor";
			return c.json({ error: message }, 400);
		}
	})

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/subcontractors/:id - Delete subcontractor
	// -------------------------------------------------------------------------
	.delete("/:id", async (c) => {
		const organizationId = c.get("organizationId");
		const subcontractorId = c.req.param("id");

		try {
			await deleteSubcontractor(subcontractorId, organizationId, db);
			return c.json({ success: true });
		} catch (error) {
			console.error("Error deleting subcontractor:", error);
			const message = error instanceof Error ? error.message : "Failed to delete subcontractor";
			return c.json({ error: message }, 400);
		}
	})

	// -------------------------------------------------------------------------
	// Story 22.10: GET /api/vtc/subcontractors/:id/performance
	// -------------------------------------------------------------------------
	.get("/:id/performance", async (c) => {
		const organizationId = c.get("organizationId");
		const subcontractorId = c.req.param("id");

		try {
			const performance = await getSubcontractorPerformance(
				subcontractorId,
				organizationId,
				db
			);

			return c.json({ performance });
		} catch (error) {
			console.error("Error getting subcontractor performance:", error);
			const message = error instanceof Error ? error.message : "Failed to get performance";
			return c.json({ error: message }, 400);
		}
	})

	// -------------------------------------------------------------------------
	// Story 22.10: POST /api/vtc/subcontractors/:id/feedback
	// -------------------------------------------------------------------------
	.post("/:id/feedback", validator("json", feedbackSchema), async (c) => {
		const organizationId = c.get("organizationId");
		const user = c.get("user");
		const userId = user.id;
		const subcontractorId = c.req.param("id");
		const data = c.req.valid("json");

		try {
			const feedback = await recordSubcontractorFeedback(
				subcontractorId,
				organizationId,
				userId,
				data,
				db
			);

			return c.json({ feedback }, 201);
		} catch (error) {
			console.error("Error recording feedback:", error);
			const message = error instanceof Error ? error.message : "Failed to record feedback";
			return c.json({ error: message }, 400);
		}
	})

	// -------------------------------------------------------------------------
	// Story 22.10: PATCH /api/vtc/subcontractors/:id/availability
	// -------------------------------------------------------------------------
	.patch("/:id/availability", validator("json", availabilitySchema), async (c) => {
		const organizationId = c.get("organizationId");
		const subcontractorId = c.req.param("id");
		const data = c.req.valid("json");

		try {
			const result = await updateSubcontractorAvailability(
				subcontractorId,
				organizationId,
				data,
				db
			);

			return c.json({ subcontractor: result });
		} catch (error) {
			console.error("Error updating availability:", error);
			const message = error instanceof Error ? error.message : "Failed to update availability";
			return c.json({ error: message }, 400);
		}
	});

// ============================================================================
// Mission Subcontracting Routes (to be added to missions router)
// ============================================================================

export const missionSubcontractingRoutes = new Hono()
	.basePath("/missions")
	.use("*", organizationMiddleware)
	// -------------------------------------------------------------------------
	// GET /api/vtc/missions/:id/subcontracting-suggestions
	// -------------------------------------------------------------------------
	.get(
		"/:id/subcontracting-suggestions",
		validator("query", suggestionsQuerySchema),
		async (c) => {
			const organizationId = c.get("organizationId");
			const missionId = c.req.param("id");
			const { threshold, maxSuggestions } = c.req.valid("query");

			try {
				const config = {
					...DEFAULT_SUBCONTRACTOR_CONFIG,
					...(threshold !== undefined && { unprofitableThresholdPercent: threshold }),
					...(maxSuggestions !== undefined && { maxSuggestions }),
				};

				const result = await generateSubcontractingSuggestions(
					missionId,
					organizationId,
					db,
					config
				);

				return c.json(result);
			} catch (error) {
				console.error("Error generating subcontracting suggestions:", error);
				const message =
					error instanceof Error ? error.message : "Failed to generate suggestions";
				return c.json({ error: message }, 400);
			}
		}
	)

	// -------------------------------------------------------------------------
	// POST /api/vtc/missions/:id/subcontract
	// -------------------------------------------------------------------------
	.post("/:id/subcontract", validator("json", subcontractMissionSchema), async (c) => {
		const organizationId = c.get("organizationId");
		const user = c.get("user");
		const userId = user.id;
		const missionId = c.req.param("id");
		const { subcontractorId, agreedPrice, notes } = c.req.valid("json");

		try {
			const result = await subcontractMission(
				missionId,
				subcontractorId,
				agreedPrice,
				notes || null,
				userId,
				organizationId,
				db
			);

			return c.json(result);
		} catch (error) {
			console.error("Error subcontracting mission:", error);
			const message = error instanceof Error ? error.message : "Failed to subcontract mission";
			return c.json({ error: message }, 400);
		}
	})

	// -------------------------------------------------------------------------
	// DELETE /api/vtc/missions/:id/subcontract
	// -------------------------------------------------------------------------
	.delete("/:id/subcontract", async (c) => {
		const organizationId = c.get("organizationId");
		const user = c.get("user");
		const userId = user.id;
		const missionId = c.req.param("id");

		try {
			const result = await removeSubcontracting(
				missionId,
				userId,
				organizationId,
				db
			);

			return c.json(result);
		} catch (error) {
			console.error("Error removing subcontracting:", error);
			const message = error instanceof Error ? error.message : "Failed to remove subcontracting";
			return c.json({ error: message }, 400);
		}
	});

export default subcontractorsRouter;
