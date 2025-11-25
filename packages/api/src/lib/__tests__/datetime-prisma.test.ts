/**
 * DateTime Prisma Integration Tests
 *
 * These tests verify that DateTime values are stored and retrieved
 * without timezone conversion, following the Europe/Paris business time strategy.
 *
 * @see docs/bmad/prd.md#FR40
 * @see docs/bmad/tech-spec.md - Date & Time Strategy
 */

import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { db } from "@repo/database";
import { toISOStringNoOffset } from "../datetime";

describe("DateTime Prisma Behavior - Europe/Paris Strategy", () => {
  let testOrgId: string;
  let testContactId: string;
  let testCategoryId: string;
  let testQuoteId: string;

  beforeAll(async () => {
    // Create test organization
    const org = await db.organization.create({
      data: {
        id: `test-org-datetime-${Date.now()}`,
        name: "DateTime Test Org",
        createdAt: new Date(),
      },
    });
    testOrgId = org.id;

    // Create test contact
    const contact = await db.contact.create({
      data: {
        organizationId: testOrgId,
        displayName: "DateTime Test Contact",
        type: "INDIVIDUAL",
      },
    });
    testContactId = contact.id;

    // Create test vehicle category
    const category = await db.vehicleCategory.create({
      data: {
        organizationId: testOrgId,
        name: "Test Sedan",
        code: "TEST_SEDAN",
        maxPassengers: 4,
        regulatoryCategory: "LIGHT",
      },
    });
    testCategoryId = category.id;
  });

  afterAll(async () => {
    // Cleanup in reverse order of creation
    if (testQuoteId) {
      await db.quote.delete({ where: { id: testQuoteId } }).catch(() => {});
    }
    if (testCategoryId) {
      await db.vehicleCategory.delete({ where: { id: testCategoryId } }).catch(() => {});
    }
    if (testContactId) {
      await db.contact.delete({ where: { id: testContactId } }).catch(() => {});
    }
    if (testOrgId) {
      await db.organization.delete({ where: { id: testOrgId } }).catch(() => {});
    }
  });

  it("should store DateTime without timezone conversion", async () => {
    // Create a specific datetime: June 15, 2025 at 14:30 (Europe/Paris business time)
    const pickupDate = new Date(2025, 5, 15, 14, 30, 0); // Month is 0-indexed
    const expectedISONoOffset = "2025-06-15T14:30:00";

    // Verify our utility produces the expected format
    expect(toISOStringNoOffset(pickupDate)).toBe(expectedISONoOffset);

    // Create a quote with this pickup time
    const quote = await db.quote.create({
      data: {
        organizationId: testOrgId,
        contactId: testContactId,
        vehicleCategoryId: testCategoryId,
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: pickupDate,
        pickupAddress: "1 Rue de Rivoli, Paris",
        dropoffAddress: "CDG Airport",
        passengerCount: 2,
        suggestedPrice: 150,
        finalPrice: 150,
        status: "DRAFT",
      },
    });
    testQuoteId = quote.id;

    // Retrieve the quote
    const retrieved = await db.quote.findUnique({
      where: { id: quote.id },
    });

    expect(retrieved).not.toBeNull();
    expect(retrieved!.pickupAt).toBeInstanceOf(Date);

    // The retrieved date should have the same local time components
    const retrievedDate = retrieved!.pickupAt;
    expect(retrievedDate.getFullYear()).toBe(2025);
    expect(retrievedDate.getMonth()).toBe(5); // June (0-indexed)
    expect(retrievedDate.getDate()).toBe(15);
    expect(retrievedDate.getHours()).toBe(14);
    expect(retrievedDate.getMinutes()).toBe(30);

    // Our utility should produce the same ISO string
    expect(toISOStringNoOffset(retrievedDate)).toBe(expectedISONoOffset);
  });

  it("should handle midnight correctly", async () => {
    const midnightDate = new Date(2025, 0, 1, 0, 0, 0); // Jan 1, 2025 00:00

    const quote = await db.quote.create({
      data: {
        organizationId: testOrgId,
        contactId: testContactId,
        vehicleCategoryId: testCategoryId,
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: midnightDate,
        pickupAddress: "Test Address",
        dropoffAddress: "Test Destination",
        passengerCount: 1,
        suggestedPrice: 100,
        finalPrice: 100,
        status: "DRAFT",
      },
    });

    const retrieved = await db.quote.findUnique({
      where: { id: quote.id },
    });

    expect(retrieved!.pickupAt.getHours()).toBe(0);
    expect(retrieved!.pickupAt.getMinutes()).toBe(0);

    // Cleanup
    await db.quote.delete({ where: { id: quote.id } });
  });

  it("should handle end of day correctly", async () => {
    const endOfDayDate = new Date(2025, 11, 31, 23, 59, 0); // Dec 31, 2025 23:59

    const quote = await db.quote.create({
      data: {
        organizationId: testOrgId,
        contactId: testContactId,
        vehicleCategoryId: testCategoryId,
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: endOfDayDate,
        pickupAddress: "Test Address",
        dropoffAddress: "Test Destination",
        passengerCount: 1,
        suggestedPrice: 100,
        finalPrice: 100,
        status: "DRAFT",
      },
    });

    const retrieved = await db.quote.findUnique({
      where: { id: quote.id },
    });

    expect(retrieved!.pickupAt.getFullYear()).toBe(2025);
    expect(retrieved!.pickupAt.getMonth()).toBe(11); // December
    expect(retrieved!.pickupAt.getDate()).toBe(31);
    expect(retrieved!.pickupAt.getHours()).toBe(23);
    expect(retrieved!.pickupAt.getMinutes()).toBe(59);

    // Cleanup
    await db.quote.delete({ where: { id: quote.id } });
  });

  it("should preserve validUntil datetime", async () => {
    const pickupDate = new Date(2025, 6, 1, 10, 0, 0);
    const validUntilDate = new Date(2025, 6, 15, 18, 0, 0);

    const quote = await db.quote.create({
      data: {
        organizationId: testOrgId,
        contactId: testContactId,
        vehicleCategoryId: testCategoryId,
        pricingMode: "FIXED_GRID",
        tripType: "EXCURSION",
        pickupAt: pickupDate,
        pickupAddress: "Paris",
        dropoffAddress: "Versailles",
        passengerCount: 4,
        suggestedPrice: 250,
        finalPrice: 250,
        validUntil: validUntilDate,
        status: "SENT",
      },
    });

    const retrieved = await db.quote.findUnique({
      where: { id: quote.id },
    });

    expect(retrieved!.validUntil).not.toBeNull();
    expect(retrieved!.validUntil!.getFullYear()).toBe(2025);
    expect(retrieved!.validUntil!.getMonth()).toBe(6); // July
    expect(retrieved!.validUntil!.getDate()).toBe(15);
    expect(retrieved!.validUntil!.getHours()).toBe(18);
    expect(retrieved!.validUntil!.getMinutes()).toBe(0);

    // Cleanup
    await db.quote.delete({ where: { id: quote.id } });
  });
});
