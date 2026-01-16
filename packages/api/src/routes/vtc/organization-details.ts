import { db } from "@repo/database";
import { Hono } from "hono";
import { describeRoute } from "hono-openapi";
import { validator } from "hono-openapi/zod";
import { z } from "zod";
import { organizationMiddleware } from "../../middleware/organization";

// Schema for organization legal details (stored in metadata)
const organizationLegalDetailsSchema = z.object({
	address: z.string().optional().nullable(),
	addressLine2: z.string().optional().nullable(),
	postalCode: z.string().optional().nullable(),
	city: z.string().optional().nullable(),
	country: z.string().optional().nullable().default("France"),
	phone: z.string().optional().nullable(),
	email: z.string().email().optional().nullable(),
	website: z.string().optional().nullable(),
	siret: z.string().optional().nullable(),
	vatNumber: z.string().optional().nullable(), // Numéro TVA Intracommunautaire
	iban: z.string().optional().nullable(),
	bic: z.string().optional().nullable(),
	bankName: z.string().optional().nullable(),
	rcs: z.string().optional().nullable(), // RCS Registry info
	ape: z.string().optional().nullable(), // Code NAF/APE
});

// Response schema includes ID and flattened metadata
const organizationDetailsResponseSchema = z.object({
	id: z.string(),
	name: z.string(),
	// Flattened metadata fields
	address: z.string().nullable(),
	addressLine2: z.string().nullable(),
	postalCode: z.string().nullable(),
	city: z.string().nullable(),
	country: z.string().nullable(),
	phone: z.string().nullable(),
	email: z.string().nullable(),
	website: z.string().nullable(),
	siret: z.string().nullable(),
	vatNumber: z.string().nullable(),
	iban: z.string().nullable(),
	bic: z.string().nullable(),
	bankName: z.string().nullable(),
	rcs: z.string().nullable(),
	ape: z.string().nullable(),
});

export const organizationDetailsRouter = new Hono()
	.basePath("/organization-details")
	.use("*", organizationMiddleware)

	.get(
		"/",
		describeRoute({
			summary: "Get organization legal details",
			description: "Get the legal details (address, SIRET, VAT...) for the current organization.",
			tags: ["VTC - Organization"],
			responses: {
				200: {
					description: "Organization details",
					content: {
						"application/json": {
							schema: organizationDetailsResponseSchema,
						},
					},
				},
			},
		}),
		async (c) => {
			const organizationId = c.get("organizationId");

			const organization = await db.organization.findUnique({
				where: { id: organizationId },
				select: {
					id: true,
					name: true,
					metadata: true,
				},
			});

			if (!organization) {
				return c.notFound();
			}

			// Parse metadata
			let metadata: any = {};
			try {
				if (organization.metadata) {
					metadata = JSON.parse(organization.metadata);
				}
			} catch (e) {
				console.error("Failed to parse organization metadata", e);
			}

			// Handle legacy seed data where address might be an object
			let addressStr = metadata.address;
			if (typeof metadata.address === "object" && metadata.address !== null) {
				addressStr = metadata.address.street || metadata.address.addressLine1 || "";
				// Backfill postalCode and city if missing in root but present in address object
				if (!metadata.postalCode && metadata.address.postalCode) {
					metadata.postalCode = metadata.address.postalCode;
				}
				if (!metadata.city && metadata.address.city) {
					metadata.city = metadata.address.city;
				}
			}

			// Flatten response
			return c.json({
				id: organization.id,
				name: organization.name,
				address: typeof addressStr === "string" ? addressStr : null,
				addressLine2: metadata.addressLine2 || null,
				postalCode: metadata.postalCode || null,
				city: metadata.city || null,
				country: metadata.country || "France",
				phone: metadata.phone || null,
				email: metadata.email || null,
				website: metadata.website || null,
				siret: metadata.siret || null,
				vatNumber: metadata.vatNumber || null,
				iban: metadata.iban || null,
				bic: metadata.bic || null,
				bankName: metadata.bankName || null,
				rcs: metadata.rcs || null,
				ape: metadata.ape || null,
			});
		},
	)

	.patch(
		"/",
		validator("json", organizationLegalDetailsSchema),
		describeRoute({
			summary: "Update organization legal details",
			description: "Update the legal details stored in organization metadata.",
			tags: ["VTC - Organization"],
		}),
		async (c) => {
			const organizationId = c.get("organizationId");
			const data = c.req.valid("json");

			const organization = await db.organization.findUnique({
				where: { id: organizationId },
				select: { metadata: true },
			});

			if (!organization) {
				return c.notFound();
			}

			// Parse existing metadata to merge
			let existingMetadata: any = {};
			try {
				if (organization.metadata) {
					existingMetadata = JSON.parse(organization.metadata);
				}
			} catch (e) {
				// ignore error
			}

			// Merge new data
			const newMetadata = {
				...existingMetadata,
				...data,
			};

			// Update in DB
			await db.organization.update({
				where: { id: organizationId },
				data: {
					metadata: JSON.stringify(newMetadata),
				},
			});

			return c.json({ success: true });
		},
	);
