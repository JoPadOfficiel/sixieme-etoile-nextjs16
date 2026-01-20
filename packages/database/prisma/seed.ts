/**
 * Database Seed Script
 * 
 * Seeds the database with test data for development and testing.
 * Run with: pnpm --filter @repo/database db:seed
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Seed Document Types (Story 7.5)
  await seedDocumentTypes();

  // Seed Fuel Price Cache
  await seedFuelPriceCache();

  // Seed Orders (Story 28.1)
  await seedOrders();

  console.log("✅ Database seed completed!");
}

/**
 * Seed DocumentType with standard document types
 * Story 7.5: Document Generation & Storage
 */
async function seedDocumentTypes() {
  console.log("  📄 Seeding DocumentTypes...");

  const documentTypes = [
    {
      code: "QUOTE_PDF",
      name: "Quote PDF",
      description: "PDF document for quotes sent to clients",
    },
    {
      code: "INVOICE_PDF",
      name: "Invoice PDF",
      description: "PDF document for invoices",
    },
    {
      code: "MISSION_ORDER",
      name: "Mission Order PDF",
      description: "PDF document for driver mission orders",
    },
  ];

  for (const dt of documentTypes) {
    await prisma.documentType.upsert({
      where: { code: dt.code },
      update: { name: dt.name, description: dt.description },
      create: dt,
    });
  }

  const count = await prisma.documentType.count();
  console.log(`    ✓ Created/updated ${count} document types`);
}

/**
 * Seed FuelPriceCache with realistic French fuel prices
 * Story 4.8: Use Fuel Price Cache in Pricing Engine
 */
async function seedFuelPriceCache() {
  console.log("  📊 Seeding FuelPriceCache...");

  // Clear existing cache entries
  await prisma.fuelPriceCache.deleteMany({});

  // Current realistic fuel prices for France (November 2025)
  const fuelPrices = [
    // Paris area - DIESEL
    {
      countryCode: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      fuelType: "DIESEL" as const,
      pricePerLitre: 1.789,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(),
    },
    // Paris area - GASOLINE (SP95)
    {
      countryCode: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      fuelType: "GASOLINE" as const,
      pricePerLitre: 1.859,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(),
    },
    // Paris area - LPG
    {
      countryCode: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      fuelType: "LPG" as const,
      pricePerLitre: 0.999,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(),
    },
    // CDG Airport area - DIESEL
    {
      countryCode: "FR",
      latitude: 49.0097,
      longitude: 2.5479,
      fuelType: "DIESEL" as const,
      pricePerLitre: 1.819,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(),
    },
    // Orly Airport area - DIESEL
    {
      countryCode: "FR",
      latitude: 48.7262,
      longitude: 2.3652,
      fuelType: "DIESEL" as const,
      pricePerLitre: 1.799,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(),
    },
    // Versailles - DIESEL
    {
      countryCode: "FR",
      latitude: 48.8014,
      longitude: 2.1301,
      fuelType: "DIESEL" as const,
      pricePerLitre: 1.809,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(),
    },
    // Lyon - DIESEL (for testing different regions)
    {
      countryCode: "FR",
      latitude: 45.7640,
      longitude: 4.8357,
      fuelType: "DIESEL" as const,
      pricePerLitre: 1.769,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(),
    },
    // Stale entry for testing staleness detection (72 hours old)
    {
      countryCode: "FR",
      latitude: 48.8566,
      longitude: 2.3522,
      fuelType: "DIESEL" as const,
      pricePerLitre: 1.750,
      currency: "EUR",
      source: "COLLECT_API",
      fetchedAt: new Date(Date.now() - 72 * 60 * 60 * 1000), // 72 hours ago
    },
  ];

  for (const price of fuelPrices) {
    await prisma.fuelPriceCache.create({
      data: price,
    });
  }

  const count = await prisma.fuelPriceCache.count();
  console.log(`    ✓ Created ${count} fuel price cache entries`);
}

/**
 * Seed Orders with test data
 * Story 28.1: Order Entity & Prisma Schema
 */
async function seedOrders() {
  console.log("  📦 Seeding Orders...");

  // Find an organization and contact to link orders to
  const organization = await prisma.organization.findFirst();
  if (!organization) {
    console.log("    ⚠ No organization found, skipping order seeding");
    return;
  }

  const contact = await prisma.contact.findFirst({
    where: { organizationId: organization.id },
  });
  if (!contact) {
    console.log("    ⚠ No contact found, skipping order seeding");
    return;
  }

  // Generate current year for reference format
  const currentYear = new Date().getFullYear();

  // Test orders with different statuses
  const orders = [
    {
      reference: `ORD-${currentYear}-001`,
      status: "DRAFT" as const,
      notes: "Test order in draft status - Wedding preparation",
    },
    {
      reference: `ORD-${currentYear}-002`,
      status: "CONFIRMED" as const,
      notes: "Test order confirmed - Corporate event transfer",
    },
    {
      reference: `ORD-${currentYear}-003`,
      status: "INVOICED" as const,
      notes: "Test order invoiced - Airport transfers package",
    },
    {
      reference: `ORD-${currentYear}-004`,
      status: "PAID" as const,
      notes: "Test order paid - Completed excursion",
    },
    {
      reference: `ORD-${currentYear}-005`,
      status: "CANCELLED" as const,
      notes: "Test order cancelled - Client request",
    },
  ];

  for (const order of orders) {
    await prisma.order.upsert({
      where: { reference: order.reference },
      update: {
        status: order.status,
        notes: order.notes,
      },
      create: {
        organizationId: organization.id,
        contactId: contact.id,
        reference: order.reference,
        status: order.status,
        notes: order.notes,
      },
    });
  }

  const orderCount = await prisma.order.count();
  console.log(`    ✓ Created/updated ${orderCount} orders`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
