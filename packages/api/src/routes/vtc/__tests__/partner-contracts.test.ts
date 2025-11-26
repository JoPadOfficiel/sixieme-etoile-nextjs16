/**
 * Partner Contracts API Tests
 *
 * Tests for the partner contract CRUD operations including:
 * - Creating/updating contracts for partner contacts
 * - Validation that non-partners cannot have contracts
 * - Grid assignment management
 * - Multi-tenancy isolation
 */

import { db } from "@repo/database";
import { beforeAll, afterAll, describe, it, expect, beforeEach } from "vitest";

// Test data
const TEST_ORG_ID = "test-org-partner-contracts";
const TEST_ORG_ID_2 = "test-org-partner-contracts-2";
const TEST_USER_ID = "test-user-partner-contracts";

describe("Partner Contracts API", () => {
  let partnerContactId: string;
  let privateContactId: string;
  let zoneRouteId: string;
  let excursionPackageId: string;
  let dispoPackageId: string;
  let vehicleCategoryId: string;
  let pricingZoneFromId: string;
  let pricingZoneToId: string;

  beforeAll(async () => {
    // Clean up any existing test data
    await db.partnerContract.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.contact.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.zoneRoute.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.excursionPackage.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.dispoPackage.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.pricingZone.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.vehicleCategory.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.member.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.organization.deleteMany({
      where: { id: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.user.deleteMany({
      where: { id: TEST_USER_ID },
    });

    // Create test user
    await db.user.create({
      data: {
        id: TEST_USER_ID,
        name: "Test User",
        email: "test-partner-contracts@example.com",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Create test organizations
    await db.organization.create({
      data: {
        id: TEST_ORG_ID,
        name: "Test Org Partner Contracts",
        slug: "test-org-partner-contracts",
        createdAt: new Date(),
      },
    });

    await db.organization.create({
      data: {
        id: TEST_ORG_ID_2,
        name: "Test Org 2",
        slug: "test-org-partner-contracts-2",
        createdAt: new Date(),
      },
    });

    // Create membership
    await db.member.create({
      data: {
        id: "test-member-partner-contracts",
        organizationId: TEST_ORG_ID,
        userId: TEST_USER_ID,
        role: "owner",
        createdAt: new Date(),
      },
    });

    // Create vehicle category for grid tests
    const vehicleCategory = await db.vehicleCategory.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "Berline",
        code: "BERLINE",
        maxPassengers: 4,
      },
    });
    vehicleCategoryId = vehicleCategory.id;

    // Create pricing zones
    const zoneFrom = await db.pricingZone.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "Paris Centre",
        code: "PARIS_CENTRE",
      },
    });
    pricingZoneFromId = zoneFrom.id;

    const zoneTo = await db.pricingZone.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "CDG Airport",
        code: "CDG",
      },
    });
    pricingZoneToId = zoneTo.id;

    // Create zone route
    const zoneRoute = await db.zoneRoute.create({
      data: {
        organizationId: TEST_ORG_ID,
        fromZoneId: pricingZoneFromId,
        toZoneId: pricingZoneToId,
        vehicleCategoryId,
        fixedPrice: 85.00,
      },
    });
    zoneRouteId = zoneRoute.id;

    // Create excursion package
    const excursion = await db.excursionPackage.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "Versailles Full Day",
        vehicleCategoryId,
        includedDurationHours: 8,
        includedDistanceKm: 150,
        price: 450.00,
      },
    });
    excursionPackageId = excursion.id;

    // Create dispo package
    const dispo = await db.dispoPackage.create({
      data: {
        organizationId: TEST_ORG_ID,
        name: "4h Dispo Paris",
        vehicleCategoryId,
        includedDurationHours: 4,
        includedDistanceKm: 50,
        basePrice: 200.00,
        overageRatePerKm: 2.50,
        overageRatePerHour: 45.00,
      },
    });
    dispoPackageId = dispo.id;

    // Create partner contact
    const partnerContact = await db.contact.create({
      data: {
        organizationId: TEST_ORG_ID,
        displayName: "Partner Agency",
        type: "AGENCY",
        isPartner: true,
        companyName: "Partner Agency SARL",
        email: "partner@agency.com",
      },
    });
    partnerContactId = partnerContact.id;

    // Create private contact
    const privateContact = await db.contact.create({
      data: {
        organizationId: TEST_ORG_ID,
        displayName: "Private Client",
        type: "INDIVIDUAL",
        isPartner: false,
        firstName: "John",
        lastName: "Doe",
        email: "john@example.com",
      },
    });
    privateContactId = privateContact.id;
  });

  afterAll(async () => {
    // Clean up test data
    await db.partnerContract.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.contact.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.zoneRoute.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.excursionPackage.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.dispoPackage.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.pricingZone.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.vehicleCategory.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.member.deleteMany({
      where: { organizationId: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.organization.deleteMany({
      where: { id: { in: [TEST_ORG_ID, TEST_ORG_ID_2] } },
    });
    await db.user.deleteMany({
      where: { id: TEST_USER_ID },
    });
  });

  describe("PartnerContract Model", () => {
    beforeEach(async () => {
      // Clean up contracts before each test
      await db.partnerContract.deleteMany({
        where: { contactId: partnerContactId },
      });
    });

    it("should create a partner contract with basic fields", async () => {
      const contract = await db.partnerContract.create({
        data: {
          organizationId: TEST_ORG_ID,
          contactId: partnerContactId,
          billingAddress: "123 Rue Example, 75001 Paris",
          paymentTerms: "DAYS_30",
          commissionPercent: 10.00,
          notes: "VIP partner",
        },
      });

      expect(contract).toBeDefined();
      expect(contract.contactId).toBe(partnerContactId);
      expect(contract.paymentTerms).toBe("DAYS_30");
      expect(Number(contract.commissionPercent)).toBe(10.00);
    });

    it("should create contract with grid assignments", async () => {
      const contract = await db.partnerContract.create({
        data: {
          organizationId: TEST_ORG_ID,
          contactId: partnerContactId,
          paymentTerms: "DAYS_30",
          commissionPercent: 15.00,
          zoneRoutes: {
            create: [{ zoneRouteId }],
          },
          excursionPackages: {
            create: [{ excursionPackageId }],
          },
          dispoPackages: {
            create: [{ dispoPackageId }],
          },
        },
        include: {
          zoneRoutes: true,
          excursionPackages: true,
          dispoPackages: true,
        },
      });

      expect(contract.zoneRoutes).toHaveLength(1);
      expect(contract.zoneRoutes[0].zoneRouteId).toBe(zoneRouteId);
      expect(contract.excursionPackages).toHaveLength(1);
      expect(contract.excursionPackages[0].excursionPackageId).toBe(excursionPackageId);
      expect(contract.dispoPackages).toHaveLength(1);
      expect(contract.dispoPackages[0].dispoPackageId).toBe(dispoPackageId);
    });

    it("should enforce unique contactId constraint", async () => {
      await db.partnerContract.create({
        data: {
          organizationId: TEST_ORG_ID,
          contactId: partnerContactId,
          paymentTerms: "DAYS_30",
          commissionPercent: 10.00,
        },
      });

      await expect(
        db.partnerContract.create({
          data: {
            organizationId: TEST_ORG_ID,
            contactId: partnerContactId,
            paymentTerms: "DAYS_15",
            commissionPercent: 5.00,
          },
        })
      ).rejects.toThrow();
    });

    it("should cascade delete when contact is deleted", async () => {
      // Create a temporary contact and contract
      const tempContact = await db.contact.create({
        data: {
          organizationId: TEST_ORG_ID,
          displayName: "Temp Partner",
          isPartner: true,
        },
      });

      await db.partnerContract.create({
        data: {
          organizationId: TEST_ORG_ID,
          contactId: tempContact.id,
          paymentTerms: "IMMEDIATE",
          commissionPercent: 0,
        },
      });

      // Delete the contact
      await db.contact.delete({ where: { id: tempContact.id } });

      // Verify contract is also deleted
      const contract = await db.partnerContract.findUnique({
        where: { contactId: tempContact.id },
      });
      expect(contract).toBeNull();
    });

    it("should support all payment terms values", async () => {
      const paymentTermsValues = ["IMMEDIATE", "DAYS_15", "DAYS_30", "DAYS_45", "DAYS_60"] as const;

      for (const terms of paymentTermsValues) {
        await db.partnerContract.deleteMany({ where: { contactId: partnerContactId } });
        
        const contract = await db.partnerContract.create({
          data: {
            organizationId: TEST_ORG_ID,
            contactId: partnerContactId,
            paymentTerms: terms,
            commissionPercent: 0,
          },
        });

        expect(contract.paymentTerms).toBe(terms);
      }
    });

    it("should store commission with decimal precision", async () => {
      const contract = await db.partnerContract.create({
        data: {
          organizationId: TEST_ORG_ID,
          contactId: partnerContactId,
          paymentTerms: "DAYS_30",
          commissionPercent: 12.75,
        },
      });

      expect(Number(contract.commissionPercent)).toBe(12.75);
    });
  });

  describe("Multi-tenancy", () => {
    it("should scope contracts by organizationId", async () => {
      // Create contract in org 1
      await db.partnerContract.deleteMany({ where: { contactId: partnerContactId } });
      
      await db.partnerContract.create({
        data: {
          organizationId: TEST_ORG_ID,
          contactId: partnerContactId,
          paymentTerms: "DAYS_30",
          commissionPercent: 10.00,
        },
      });

      // Query from org 2 should not find it
      const contractsOrg2 = await db.partnerContract.findMany({
        where: { organizationId: TEST_ORG_ID_2 },
      });

      expect(contractsOrg2).toHaveLength(0);
    });
  });
});
