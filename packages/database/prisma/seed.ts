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

  // Seed Fuel Price Cache
  await seedFuelPriceCache();

  console.log("✅ Database seed completed!");
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

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
