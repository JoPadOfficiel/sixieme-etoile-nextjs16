/**
 * Tests for EndCustomer integration in Dispatch API
 * Story 24.7: Integrate EndCustomer in dispatch interface
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { testClient } from "../../../test-utils/hono-test";
import { missionsRouter } from "../missions";
import { db } from "@repo/database";
import type { Organization, Contact, VehicleCategory, Quote, EndCustomer } from "@prisma/client";

describe("Dispatch EndCustomer Integration", () => {
	let testOrg: Organization;
	let testPartner: Contact;
	let testEndCustomer: EndCustomer;
	let testCategory: VehicleCategory;
	let testQuote: Quote;

	beforeAll(async () => {
		// Create test organization
		testOrg = await db.organization.create({
			data: {
				name: "Test Org Dispatch",
				slug: "test-org-dispatch",
			},
		});

		// Create vehicle category
		testCategory = await db.vehicleCategory.create({
			data: {
				organizationId: testOrg.id,
				code: "SEDAN",
				name: "Berline",
				regulatoryCategory: "LIGHT",
				maxPassengers: 3,
				priceMultiplier: 1.0,
				isActive: true,
			},
		});

		// Create partner contact
		testPartner = await db.contact.create({
			data: {
				organizationId: testOrg.id,
				displayName: "Test Agency",
				companyName: "Test Agency Ltd",
				isPartner: true,
				email: "agency@test.com",
				phone: "+33123456789",
			},
		});

		// Create end customer
		testEndCustomer = await db.endCustomer.create({
			data: {
				organizationId: testOrg.id,
				contactId: testPartner.id,
				firstName: "Jean",
				lastName: "Dupont",
				email: "jean.dupont@test.com",
				phone: "+33987654321",
			},
		});

		// Create accepted quote (mission) with EndCustomer
		testQuote = await db.quote.create({
			data: {
				organizationId: testOrg.id,
				contactId: testPartner.id,
				endCustomerId: testEndCustomer.id,
				vehicleCategoryId: testCategory.id,
				pickupAddress: "Aéroport CDG",
				dropoffAddress: "Arc de Triomphe",
				pickupAt: new Date("2026-02-15T10:00:00Z"),
				passengerCount: 2,
				luggageCount: 2,
				tripType: "TRANSFER",
				pricingMode: "FIXED_GRID",
				suggestedPrice: 100.0,
				finalPrice: 100.0,
				status: "ACCEPTED",
			},
		});
	});

	afterAll(async () => {
		// Cleanup in reverse order
		await db.quote.deleteMany({ where: { organizationId: testOrg.id } });
		await db.endCustomer.deleteMany({ where: { organizationId: testOrg.id } });
		await db.contact.deleteMany({ where: { organizationId: testOrg.id } });
		await db.vehicleCategory.deleteMany({ where: { organizationId: testOrg.id } });
		await db.organization.delete({ where: { id: testOrg.id } });
	});

	it("should include endCustomer in missions list", async () => {
		const client = testClient(missionsRouter, testOrg.id);

		const res = await client.index.$get({
			query: {},
		});

		expect(res.status).toBe(200);
		const data = await res.json();

		expect(data.data).toBeDefined();
		expect(data.data.length).toBeGreaterThan(0);

		const mission = data.data.find((m: any) => m.id === testQuote.id);
		expect(mission).toBeDefined();
		expect(mission.endCustomer).toBeDefined();
		expect(mission.endCustomer.firstName).toBe("Jean");
		expect(mission.endCustomer.lastName).toBe("Dupont");
		expect(mission.endCustomer.email).toBe("jean.dupont@test.com");
		expect(mission.endCustomer.phone).toBe("+33987654321");
	});

	it("should include endCustomer in single mission detail", async () => {
		const client = testClient(missionsRouter, testOrg.id);

		const res = await client[":id"].$get({
			param: { id: testQuote.id },
		});

		expect(res.status).toBe(200);
		const mission = await res.json();

		expect(mission.endCustomer).toBeDefined();
		expect(mission.endCustomer.id).toBe(testEndCustomer.id);
		expect(mission.endCustomer.firstName).toBe("Jean");
		expect(mission.endCustomer.lastName).toBe("Dupont");
	});

	it("should search by endCustomer firstName", async () => {
		const client = testClient(missionsRouter, testOrg.id);

		const res = await client.index.$get({
			query: { search: "Jean" },
		});

		expect(res.status).toBe(200);
		const data = await res.json();

		expect(data.data.length).toBeGreaterThan(0);
		const mission = data.data.find((m: any) => m.id === testQuote.id);
		expect(mission).toBeDefined();
	});

	it("should search by endCustomer lastName", async () => {
		const client = testClient(missionsRouter, testOrg.id);

		const res = await client.index.$get({
			query: { search: "Dupont" },
		});

		expect(res.status).toBe(200);
		const data = await res.json();

		expect(data.data.length).toBeGreaterThan(0);
		const mission = data.data.find((m: any) => m.id === testQuote.id);
		expect(mission).toBeDefined();
	});

	it("should handle missions without endCustomer", async () => {
		// Create quote without EndCustomer
		const quoteWithoutEndCustomer = await db.quote.create({
			data: {
				organizationId: testOrg.id,
				contactId: testPartner.id,
				vehicleCategoryId: testCategory.id,
				pickupAddress: "Gare du Nord",
				dropoffAddress: "Tour Eiffel",
				pickupAt: new Date("2026-02-20T14:00:00Z"),
				passengerCount: 1,
				luggageCount: 1,
				tripType: "TRANSFER",
				pricingMode: "FIXED_GRID",
				suggestedPrice: 80.0,
				finalPrice: 80.0,
				status: "ACCEPTED",
			},
		});

		const client = testClient(missionsRouter, testOrg.id);

		const res = await client[":id"].$get({
			param: { id: quoteWithoutEndCustomer.id },
		});

		expect(res.status).toBe(200);
		const mission = await res.json();

		expect(mission.endCustomer).toBeNull();

		// Cleanup
		await db.quote.delete({ where: { id: quoteWithoutEndCustomer.id } });
	});
});
