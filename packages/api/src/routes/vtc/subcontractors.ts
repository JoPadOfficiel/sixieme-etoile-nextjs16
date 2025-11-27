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
import {
	listSubcontractors,
	getSubcontractorById,
	createSubcontractor,
	updateSubcontractor,
	deleteSubcontractor,
	generateSubcontractingSuggestions,
	subcontractMission,
	DEFAULT_SUBCONTRACTOR_CONFIG,
} from "../../services/subcontractor-service";

// ============================================================================
// Validation Schemas
// ============================================================================

const listSubcontractorsQuerySchema = z.object({
	includeInactive: z.string().optional().transform((v) => v === "true"),
});

const createSubcontractorSchema = z.object({
	contactId: z.string().min(1, "Contact ID is required"),
	operatingZoneIds: z.array(z.string()).optional().default([]),
	vehicleCategoryIds: z.array(z.string()).optional().default([]),
	ratePerKm: z.number().positive().optional(),
	ratePerHour: z.number().positive().optional(),
	minimumFare: z.number().positive().optional(),
	notes: z.string().optional(),
});

const updateSubcontractorSchema = z.object({
	operatingZoneIds: z.array(z.string()).optional(),
	vehicleCategoryIds: z.array(z.string()).optional(),
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

// ============================================================================
// Router
// ============================================================================

export const subcontractorsRouter = new Hono()
	.basePath("/subcontractors")
	// -------------------------------------------------------------------------
	// GET /api/vtc/subcontractors - List all subcontractors
	// -------------------------------------------------------------------------
	.get("/", validator("query", listSubcontractorsQuerySchema), async (c) => {
		const session = c.get("session");
		const organizationId = session?.session?.activeOrganizationId;

		if (!organizationId) {
			return c.json({ error: "Organization not found" }, 401);
		}

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
		const session = c.get("session");
		const organizationId = session?.session?.activeOrganizationId;

		if (!organizationId) {
			return c.json({ error: "Organization not found" }, 401);
		}

		const subcontractorId = c.req.param("id");

		try {
			const subcontractor = await getSubcontractorById(subcontractorId, organizationId, db);

			if (!subcontractor) {
				return c.json({ error: "Subcontractor not found" }, 404);
			}

			return c.json({
				subcontractor: {
					id: subcontractor.id,
					contact: {
						id: subcontractor.contact.id,
						displayName: subcontractor.contact.displayName,
						email: subcontractor.contact.email,
						phone: subcontractor.contact.phone,
						companyName: subcontractor.contact.companyName,
					},
					operatingZones: subcontractor.operatingZones.map((sz) => ({
						id: sz.pricingZone.id,
						name: sz.pricingZone.name,
						code: sz.pricingZone.code,
					})),
					vehicleCategories: subcontractor.vehicleCategories.map((vc) => ({
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
		const session = c.get("session");
		const organizationId = session?.session?.activeOrganizationId;

		if (!organizationId) {
			return c.json({ error: "Organization not found" }, 401);
		}

		const data = c.req.valid("json");

		try {
			const subcontractor = await createSubcontractor(organizationId, data, db);

			return c.json(
				{
					subcontractor: {
						id: subcontractor.id,
						contact: {
							id: subcontractor.contact.id,
							displayName: subcontractor.contact.displayName,
						},
						operatingZones: subcontractor.operatingZones.map((sz) => ({
							id: sz.pricingZone.id,
							name: sz.pricingZone.name,
							code: sz.pricingZone.code,
						})),
						vehicleCategories: subcontractor.vehicleCategories.map((vc) => ({
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
		const session = c.get("session");
		const organizationId = session?.session?.activeOrganizationId;

		if (!organizationId) {
			return c.json({ error: "Organization not found" }, 401);
		}

		const subcontractorId = c.req.param("id");
		const data = c.req.valid("json");

		try {
			const subcontractor = await updateSubcontractor(subcontractorId, organizationId, data, db);

			return c.json({
				subcontractor: {
					id: subcontractor.id,
					contact: {
						id: subcontractor.contact.id,
						displayName: subcontractor.contact.displayName,
					},
					operatingZones: subcontractor.operatingZones.map((sz) => ({
						id: sz.pricingZone.id,
						name: sz.pricingZone.name,
						code: sz.pricingZone.code,
					})),
					vehicleCategories: subcontractor.vehicleCategories.map((vc) => ({
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
		const session = c.get("session");
		const organizationId = session?.session?.activeOrganizationId;

		if (!organizationId) {
			return c.json({ error: "Organization not found" }, 401);
		}

		const subcontractorId = c.req.param("id");

		try {
			await deleteSubcontractor(subcontractorId, organizationId, db);
			return c.json({ success: true });
		} catch (error) {
			console.error("Error deleting subcontractor:", error);
			const message = error instanceof Error ? error.message : "Failed to delete subcontractor";
			return c.json({ error: message }, 400);
		}
	});

// ============================================================================
// Mission Subcontracting Routes (to be added to missions router)
// ============================================================================

export const missionSubcontractingRoutes = new Hono()
	.basePath("/missions")
	// -------------------------------------------------------------------------
	// GET /api/vtc/missions/:id/subcontracting-suggestions
	// -------------------------------------------------------------------------
	.get(
		"/:id/subcontracting-suggestions",
		validator("query", suggestionsQuerySchema),
		async (c) => {
			const session = c.get("session");
			const organizationId = session?.session?.activeOrganizationId;

			if (!organizationId) {
				return c.json({ error: "Organization not found" }, 401);
			}

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
		const session = c.get("session");
		const organizationId = session?.session?.activeOrganizationId;
		const userId = session?.user?.id;

		if (!organizationId || !userId) {
			return c.json({ error: "Authentication required" }, 401);
		}

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
	});

export default subcontractorsRouter;
