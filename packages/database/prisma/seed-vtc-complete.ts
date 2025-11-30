#!/usr/bin/env tsx

/**
 * COMPLETE VTC DATABASE SEED SCRIPT
 *
 * This script configures EVERYTHING from scratch for a realistic VTC company.
 * Run with: pnpm --filter @repo/database db:seed:vtc
 *
 * Required .env variables:
 * - DATABASE_URL
 * - ADMIN_EMAIL (default: admin@example.com)
 * - ADMIN_PASSWORD (default: admin123)
 * - GOOGLE_MAPS_API_KEY (optional)
 * - COLLECTAPI_API_KEY (optional)
 */

import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";
import { auth } from "@repo/auth";

const prisma = new PrismaClient();
const authContextPromise = auth.$context;

// Configuration from .env with defaults
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";
const COLLECTAPI_API_KEY = process.env.COLLECTAPI_API_KEY || "";

console.log("🚀 Starting COMPLETE VTC Database Seed...");
console.log(`📧 Admin Email: ${ADMIN_EMAIL}`);

// Store IDs for relationships
let ORGANIZATION_ID: string;
let ADMIN_USER_ID: string;
const LICENSE_CATEGORY_IDS: Record<string, string> = {};
const VEHICLE_CATEGORY_IDS: Record<string, string> = {};
const OPERATING_BASE_IDS: Record<string, string> = {};
const PRICING_ZONE_IDS: Record<string, string> = {};
const DRIVER_IDS: string[] = [];
const VEHICLE_IDS: string[] = [];
const CONTACT_IDS: Record<string, string> = {};

async function main() {
  try {
    await cleanExistingData();
    await createOrganization();
    await createAdminUser();
    await createOperatingBases();
    await createLicenseCategories();
    await createOrganizationLicenseRules();
    await createVehicleCategories();
    await createPricingZones();
    await createZoneRoutes();
    await createExcursionPackages();
    await createDispoPackages();
    await createPricingSettings();
    await createAdvancedRates();
    await createSeasonalMultipliers();
    await createOptionalFees();
    await createPromotions();
    await createDrivers();
    await createVehicles();
    await createContacts();
    await createPartnerContracts();
    await createIntegrationSettings();
    await seedDocumentTypes();
    await seedFuelPriceCache();

    console.log("\n✅ VTC Database seed completed successfully!");
    printSummary();
  } catch (error) {
    console.error("❌ Seed failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanExistingData() {
  console.log("\n🧹 Cleaning existing test data...");
  try {
    await prisma.quoteStatusAuditLog.deleteMany({});
    await prisma.quote.deleteMany({});
    await prisma.invoiceLine.deleteMany({});
    await prisma.invoice.deleteMany({});
    await prisma.document.deleteMany({});
    await prisma.complianceAuditLog.deleteMany({});
    await prisma.driverRSECounter.deleteMany({});
    await prisma.emptyLegOpportunity.deleteMany({});
    await prisma.partnerContractDispoPackage.deleteMany({});
    await prisma.partnerContractExcursionPackage.deleteMany({});
    await prisma.partnerContractZoneRoute.deleteMany({});
    await prisma.partnerContract.deleteMany({});
    await prisma.subcontractorVehicleCategory.deleteMany({});
    await prisma.subcontractorZone.deleteMany({});
    await prisma.subcontractorProfile.deleteMany({});
    await prisma.contact.deleteMany({});
    await prisma.promotion.deleteMany({});
    await prisma.optionalFee.deleteMany({});
    await prisma.seasonalMultiplier.deleteMany({});
    await prisma.advancedRate.deleteMany({});
    await prisma.organizationPricingSettings.deleteMany({});
    await prisma.dispoPackage.deleteMany({});
    await prisma.excursionPackage.deleteMany({});
    await prisma.zoneRoute.deleteMany({});
    await prisma.pricingZone.deleteMany({});
    await prisma.vehicle.deleteMany({});
    await prisma.vehicleCategory.deleteMany({});
    await prisma.operatingBase.deleteMany({});
    await prisma.driverLicense.deleteMany({});
    await prisma.driver.deleteMany({});
    await prisma.organizationLicenseRule.deleteMany({});
    await prisma.licenseCategory.deleteMany({});
    await prisma.organizationIntegrationSettings.deleteMany({});
    await prisma.member.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({ where: { email: ADMIN_EMAIL } });
    await prisma.organization.deleteMany({ where: { slug: { in: ["vtc-premium-paris", "sixieme-etoile-vtc"] } } });
    console.log("   ✅ Cleaned");
  } catch (error) {
    console.log("   ⚠️ Error cleaning:", error);
  }
}

async function createOrganization() {
  console.log("\n📊 Creating Organization...");
  const org = await prisma.organization.create({
    data: {
      id: randomUUID(),
      name: "Sixieme Etoile VTC",
      slug: "sixieme-etoile-vtc",
      createdAt: new Date(),
      metadata: JSON.stringify({
        siret: "12345678901234",
        vatNumber: "FR12345678901",
        address: { street: "24-30 Avenue du Gué Langlois", postalCode: "77600", city: "Bussy-Saint-Martin" },
        phone: "+33 1 42 86 83 00",
      }),
    },
  });
  ORGANIZATION_ID = org.id;
  console.log(`   ✅ ${org.name} (${org.id})`);
}

async function createAdminUser() {
  console.log("\n👤 Creating Admin User...");
  const user = await prisma.user.create({
    data: {
      id: randomUUID(),
      email: ADMIN_EMAIL,
      name: "Admin VTC",
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      onboardingComplete: true,
      role: "admin",
      locale: "fr-FR",
    },
  });
  ADMIN_USER_ID = user.id;

  // Hash password using Better Auth context for perfect compatibility
  const authContext = await authContextPromise;
  const hashedPassword = await authContext.password.hash(ADMIN_PASSWORD);
  
  await prisma.account.create({
    data: {
      id: randomUUID(),
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: hashedPassword,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await prisma.member.create({
    data: {
      id: randomUUID(),
      organizationId: ORGANIZATION_ID,
      userId: user.id,
      role: "owner",
      createdAt: new Date(),
    },
  });
  console.log(`   ✅ ${user.email}`);
}

async function createOperatingBases() {
  console.log("\n🏢 Creating Operating Bases...");
  const bases = [
    { name: "Base Bussy-Saint-Martin", addressLine1: "24-30 Avenue du Gué Langlois", city: "Bussy-Saint-Martin", postalCode: "77600", latitude: 48.8495, longitude: 2.6905 },
    { name: "Siège Paris 8ème", addressLine1: "123 Avenue des Champs-Élysées", city: "Paris", postalCode: "75008", latitude: 48.8698, longitude: 2.3078 },
    { name: "Base CDG Airport", addressLine1: "Zone Fret 4", city: "Roissy-en-France", postalCode: "95700", latitude: 49.0097, longitude: 2.5479 },
    { name: "Base Orly Airport", addressLine1: "Orly Sud", city: "Orly", postalCode: "94390", latitude: 48.7262, longitude: 2.3652 },
    { name: "Base La Défense", addressLine1: "1 Parvis de la Défense", city: "Puteaux", postalCode: "92800", latitude: 48.8920, longitude: 2.2362 },
  ];
  for (const b of bases) {
    const created = await prisma.operatingBase.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...b, countryCode: "FR", isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
    OPERATING_BASE_IDS[b.name] = created.id;
  }
  console.log(`   ✅ ${bases.length} bases`);
}

async function createLicenseCategories() {
  console.log("\n🪪 Creating License Categories...");
  const cats = [
    { code: "B", name: "Permis B", description: "Véhicules légers" },
    { code: "D1", name: "Permis D1", description: "Minibus 9-16 passagers" },
    { code: "D", name: "Permis D", description: "Autobus" },
  ];
  for (const c of cats) {
    const created = await prisma.licenseCategory.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...c, createdAt: new Date(), updatedAt: new Date() },
    });
    LICENSE_CATEGORY_IDS[c.code] = created.id;
  }
  console.log(`   ✅ ${cats.length} categories`);
}

async function createOrganizationLicenseRules() {
  console.log("\n📋 Creating RSE Rules...");
  const rules = [
    { licenseCategoryId: LICENSE_CATEGORY_IDS["B"], maxDailyDrivingHours: 10.0, maxDailyAmplitudeHours: 14.0, breakMinutesPerDrivingBlock: 30, drivingBlockHoursForBreak: 4.5, cappedAverageSpeedKmh: null },
    { licenseCategoryId: LICENSE_CATEGORY_IDS["D1"], maxDailyDrivingHours: 9.0, maxDailyAmplitudeHours: 13.0, breakMinutesPerDrivingBlock: 45, drivingBlockHoursForBreak: 4.5, cappedAverageSpeedKmh: 90 },
    { licenseCategoryId: LICENSE_CATEGORY_IDS["D"], maxDailyDrivingHours: 9.0, maxDailyAmplitudeHours: 13.0, breakMinutesPerDrivingBlock: 45, drivingBlockHoursForBreak: 4.5, cappedAverageSpeedKmh: 85 },
  ];
  for (const r of rules) {
    await prisma.organizationLicenseRule.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...r, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✅ ${rules.length} RSE rules`);
}

async function createVehicleCategories() {
  console.log("\n🚗 Creating Vehicle Categories...");
  const cats = [
    { name: "Berline", code: "BERLINE", regulatoryCategory: "LIGHT" as const, maxPassengers: 4, priceMultiplier: 1.0, defaultRatePerKm: 1.80, defaultRatePerHour: 45.0 },
    { name: "Van Premium", code: "VAN_PREMIUM", regulatoryCategory: "LIGHT" as const, maxPassengers: 7, priceMultiplier: 1.3, defaultRatePerKm: 2.20, defaultRatePerHour: 55.0 },
    { name: "Minibus", code: "MINIBUS", regulatoryCategory: "HEAVY" as const, maxPassengers: 16, priceMultiplier: 1.8, defaultRatePerKm: 3.00, defaultRatePerHour: 75.0 },
    { name: "Autocar", code: "AUTOCAR", regulatoryCategory: "HEAVY" as const, maxPassengers: 50, priceMultiplier: 2.5, defaultRatePerKm: 4.50, defaultRatePerHour: 120.0 },
    { name: "Luxe", code: "LUXE", regulatoryCategory: "LIGHT" as const, maxPassengers: 3, priceMultiplier: 2.0, defaultRatePerKm: 3.50, defaultRatePerHour: 90.0 },
  ];
  for (const c of cats) {
    const created = await prisma.vehicleCategory.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...c, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
    VEHICLE_CATEGORY_IDS[c.code] = created.id;
  }
  console.log(`   ✅ ${cats.length} categories`);
}

async function createPricingZones() {
  console.log("\n🗺️ Creating Pricing Zones...");
  // Zone pricing multiplier logic (Story 11.3):
  // IMPORTANT: Multipliers must have only ONE decimal place (0.8, 0.9, 1.0, 1.1, 1.2, 1.3, etc.)
  // 
  // Business logic:
  // - Bussy-Saint-Martin (garage): 0.8× - no deadhead cost
  // - Near garage zones: 0.9× - minimal deadhead
  // - Paris centre: 0.9× - competitive pricing, high demand
  // - Intermediate zones: 1.0× - standard pricing
  // - Airports: 1.1-1.2× - premium transfers
  // - Far zones: 1.2-1.3× - long approach/return trips
  // 
  // The pricing engine uses Math.max(pickup, dropoff) multiplier
  // This ensures profitability on trips involving expensive zones
  const zones = [
    // === GARAGE PROXIMITY ZONE (Lowest multiplier - no deadhead) ===
    { name: "Bussy-Saint-Martin", code: "BUSSY_ST_MARTIN", zoneType: "RADIUS" as const, centerLatitude: 48.8495, centerLongitude: 2.6905, radiusKm: 8.0, color: "#22c55e", priceMultiplier: 0.8, multiplierDescription: "Zone garage principal - tarif avantageux (pas de trajet à vide)" },
    
    // === NEAR GARAGE ZONES (0.9× - minimal deadhead) ===
    { name: "Marne-la-Vallée", code: "MARNE_LA_VALLEE", zoneType: "RADIUS" as const, centerLatitude: 48.8705, centerLongitude: 2.7765, radiusKm: 6.0, color: "#06b6d4", priceMultiplier: 0.9, multiplierDescription: "Marne-la-Vallée - proche garage, tarif avantageux" },
    { name: "Disneyland", code: "DISNEY", zoneType: "RADIUS" as const, centerLatitude: 48.8674, centerLongitude: 2.7836, radiusKm: 3.0, color: "#0ea5e9", priceMultiplier: 0.9, multiplierDescription: "Disneyland - proche garage, forte demande touristique" },
    { name: "Est Urbain", code: "EST_URBAIN", zoneType: "RADIUS" as const, centerLatitude: 48.852, centerLongitude: 2.6, radiusKm: 10.0, color: "#f43f5e", priceMultiplier: 0.9, multiplierDescription: "Est urbain - proche du garage, tarif modéré" },
    
    // === PARIS ZONES (0.9× - competitive pricing, high demand) ===
    { name: "Zone Premium Paris", code: "PARIS_PREMIUM", zoneType: "RADIUS" as const, centerLatitude: 48.8698, centerLongitude: 2.3078, radiusKm: 4.0, color: "#10b981", priceMultiplier: 0.9, multiplierDescription: "Zone centrale Paris - tarif compétitif haute demande" },
    { name: "Paris Intra-Muros", code: "PARIS_INTRA", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 8.0, color: "#3b82f6", priceMultiplier: 0.9, multiplierDescription: "Paris intra-muros - tarif compétitif" },
    
    // === INTERMEDIATE ZONES (1.0× - standard pricing) ===
    { name: "La Défense", code: "LA_DEFENSE", zoneType: "RADIUS" as const, centerLatitude: 48.8920, centerLongitude: 2.2362, radiusKm: 2.0, color: "#a855f7", priceMultiplier: 1.0, multiplierDescription: "La Défense - zone affaires, tarif standard" },
    { name: "Petite Couronne", code: "PETITE_COURONNE", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 15.0, color: "#8b5cf6", priceMultiplier: 1.1, multiplierDescription: "Petite couronne - majoration distance modérée" },
    
    // === AIRPORT ZONES (1.1-1.2× - premium transfers) ===
    { name: "Aéroport Orly", code: "ORLY", zoneType: "RADIUS" as const, centerLatitude: 48.7262, centerLongitude: 2.3652, radiusKm: 3.0, color: "#14b8a6", priceMultiplier: 1.1, multiplierDescription: "Aéroport Orly - transferts aéroport" },
    { name: "Aéroport CDG", code: "CDG", zoneType: "RADIUS" as const, centerLatitude: 49.0097, centerLongitude: 2.5479, radiusKm: 5.0, color: "#6366f1", priceMultiplier: 1.2, multiplierDescription: "Aéroport CDG - transferts premium longue distance" },
    { name: "Le Bourget", code: "LBG", zoneType: "RADIUS" as const, centerLatitude: 48.9694, centerLongitude: 2.4414, radiusKm: 2.0, color: "#ef4444", priceMultiplier: 1.2, multiplierDescription: "Le Bourget - aviation d'affaires premium" },
    
    // === FAR ZONES (1.2-1.3× - long approach/return) ===
    { name: "Brie-sur-Orge", code: "BRIE_SUR_ORGE", zoneType: "RADIUS" as const, centerLatitude: 48.644, centerLongitude: 2.331, radiusKm: 6.0, color: "#f97316", priceMultiplier: 1.2, multiplierDescription: "Brie-sur-Orge - zone sud éloignée" },
    { name: "Grande Couronne", code: "GRANDE_COURONNE", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 30.0, color: "#f59e0b", priceMultiplier: 1.3, multiplierDescription: "Grande couronne - majoration trajets longs" },
  ];
  for (const z of zones) {
    const created = await prisma.pricingZone.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...z, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
    PRICING_ZONE_IDS[z.code] = created.id;
  }
  console.log(`   ✅ ${zones.length} zones`);
}

async function createZoneRoutes() {
  console.log("\n🛣️ Creating Zone Routes...");
  const routes = [
    // === BUSSY-SAINT-MARTIN (Garage) Routes - Advantageous pricing ===
    { from: "BUSSY_ST_MARTIN", to: "PARIS_PREMIUM", category: "BERLINE", price: 85.0 },
    { from: "BUSSY_ST_MARTIN", to: "PARIS_PREMIUM", category: "VAN_PREMIUM", price: 110.0 },
    { from: "BUSSY_ST_MARTIN", to: "PARIS_PREMIUM", category: "LUXE", price: 160.0 },
    { from: "BUSSY_ST_MARTIN", to: "CDG", category: "BERLINE", price: 75.0 },
    { from: "BUSSY_ST_MARTIN", to: "CDG", category: "VAN_PREMIUM", price: 95.0 },
    { from: "BUSSY_ST_MARTIN", to: "ORLY", category: "BERLINE", price: 90.0 },
    { from: "BUSSY_ST_MARTIN", to: "ORLY", category: "VAN_PREMIUM", price: 115.0 },
    { from: "BUSSY_ST_MARTIN", to: "DISNEY", category: "BERLINE", price: 45.0 },
    { from: "BUSSY_ST_MARTIN", to: "DISNEY", category: "VAN_PREMIUM", price: 60.0 },
    
    // === MARNE-LA-VALLÉE Routes (Near garage - competitive) ===
    { from: "MARNE_LA_VALLEE", to: "PARIS_PREMIUM", category: "BERLINE", price: 95.0 },
    { from: "MARNE_LA_VALLEE", to: "PARIS_PREMIUM", category: "VAN_PREMIUM", price: 125.0 },
    { from: "MARNE_LA_VALLEE", to: "PARIS_PREMIUM", category: "LUXE", price: 175.0 },
    { from: "MARNE_LA_VALLEE", to: "CDG", category: "BERLINE", price: 70.0 },
    { from: "MARNE_LA_VALLEE", to: "CDG", category: "VAN_PREMIUM", price: 90.0 },
    
    // === PARIS Routes ===
    { from: "PARIS_PREMIUM", to: "PETITE_COURONNE", category: "BERLINE", price: 65.0 },
    { from: "PARIS_PREMIUM", to: "GRANDE_COURONNE", category: "BERLINE", price: 95.0 },
    { from: "PARIS_PREMIUM", to: "GRANDE_COURONNE", category: "VAN_PREMIUM", price: 130.0 },
    { from: "PARIS_PREMIUM", to: "BRIE_SUR_ORGE", category: "BERLINE", price: 115.0 },
    { from: "PARIS_PREMIUM", to: "BRIE_SUR_ORGE", category: "VAN_PREMIUM", price: 160.0 },
    { from: "PARIS_INTRA", to: "EST_URBAIN", category: "BERLINE", price: 75.0 },
    { from: "PARIS_INTRA", to: "EST_URBAIN", category: "VAN_PREMIUM", price: 100.0 },
    
    // === EST URBAIN Routes (Near garage) ===
    { from: "EST_URBAIN", to: "MARNE_LA_VALLEE", category: "BERLINE", price: 55.0 },
    { from: "EST_URBAIN", to: "MARNE_LA_VALLEE", category: "VAN_PREMIUM", price: 75.0 },
    { from: "EST_URBAIN", to: "BUSSY_ST_MARTIN", category: "BERLINE", price: 45.0 },
    { from: "EST_URBAIN", to: "BUSSY_ST_MARTIN", category: "VAN_PREMIUM", price: 60.0 },
    
    // === AIRPORT Routes ===
    { from: "CDG", to: "PARIS_PREMIUM", category: "BERLINE", price: 80.0 },
    { from: "CDG", to: "PARIS_PREMIUM", category: "VAN_PREMIUM", price: 105.0 },
    { from: "CDG", to: "PARIS_PREMIUM", category: "LUXE", price: 155.0 },
    { from: "ORLY", to: "PARIS_PREMIUM", category: "BERLINE", price: 60.0 },
    { from: "ORLY", to: "PARIS_PREMIUM", category: "VAN_PREMIUM", price: 80.0 },
    { from: "CDG", to: "ORLY", category: "BERLINE", price: 105.0 },
    { from: "CDG", to: "ORLY", category: "VAN_PREMIUM", price: 135.0 },
    { from: "CDG", to: "LA_DEFENSE", category: "BERLINE", price: 90.0 },
    { from: "CDG", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 115.0 },
    { from: "LBG", to: "PARIS_PREMIUM", category: "LUXE", price: 130.0 },
    { from: "LBG", to: "PARIS_PREMIUM", category: "BERLINE", price: 85.0 },
    
    // === DISNEY Routes ===
    { from: "DISNEY", to: "PARIS_PREMIUM", category: "BERLINE", price: 90.0 },
    { from: "DISNEY", to: "PARIS_PREMIUM", category: "VAN_PREMIUM", price: 120.0 },
    { from: "DISNEY", to: "CDG", category: "BERLINE", price: 65.0 },
    { from: "DISNEY", to: "CDG", category: "VAN_PREMIUM", price: 85.0 },
  ];
  for (const r of routes) {
    await prisma.zoneRoute.create({
      data: {
        id: randomUUID(),
        organizationId: ORGANIZATION_ID,
        fromZoneId: PRICING_ZONE_IDS[r.from],
        toZoneId: PRICING_ZONE_IDS[r.to],
        vehicleCategoryId: VEHICLE_CATEGORY_IDS[r.category],
        direction: "BIDIRECTIONAL",
        fixedPrice: r.price,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  console.log(`   ✅ ${routes.length} routes`);
}

async function createExcursionPackages() {
  console.log("\n🏰 Creating Excursion Packages...");
  const pkgs = [
    { name: "Journée Versailles", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 6.0, includedDistanceKm: 80.0, price: 350.0 },
    { name: "Journée Giverny", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 8.0, includedDistanceKm: 160.0, price: 480.0 },
    { name: "Journée Champagne", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 10.0, includedDistanceKm: 300.0, price: 750.0 },
    { name: "Châteaux de la Loire", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 12.0, includedDistanceKm: 450.0, price: 950.0 },
  ];
  for (const p of pkgs) {
    await prisma.excursionPackage.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...p, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✅ ${pkgs.length} packages`);
}

async function createDispoPackages() {
  console.log("\n⏰ Creating Dispo Packages...");
  const pkgs = [
    { name: "Dispo 4h Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 4.0, includedDistanceKm: 60.0, basePrice: 200.0, overageRatePerKm: 2.00, overageRatePerHour: 50.0 },
    { name: "Dispo 8h Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 380.0, overageRatePerKm: 1.80, overageRatePerHour: 45.0 },
    { name: "Dispo 4h Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 4.0, includedDistanceKm: 60.0, basePrice: 280.0, overageRatePerKm: 2.50, overageRatePerHour: 65.0 },
    { name: "Dispo 4h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 4.0, includedDistanceKm: 50.0, basePrice: 400.0, overageRatePerKm: 4.00, overageRatePerHour: 100.0 },
  ];
  for (const p of pkgs) {
    await prisma.dispoPackage.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...p, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✅ ${pkgs.length} packages`);
}

async function createPricingSettings() {
  console.log("\n💰 Creating Pricing Settings...");
  await prisma.organizationPricingSettings.create({
    data: {
      id: randomUUID(),
      organizationId: ORGANIZATION_ID,
      baseRatePerKm: 1.80,
      baseRatePerHour: 45.0,
      defaultMarginPercent: 25.0,
      greenMarginThreshold: 20.0,
      orangeMarginThreshold: 5.0,
      minimumFare: 25.0,
      fuelConsumptionL100km: 8.5,
      fuelPricePerLiter: 1.80,
      tollCostPerKm: 0.12,
      wearCostPerKm: 0.08,
      driverHourlyCost: 30.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log("   ✅ Settings created");
}

async function createAdvancedRates() {
  console.log("\n📈 Creating Advanced Rates...");
  // Story 11.4: Only NIGHT and WEEKEND types are supported
  // LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY removed - zone-based pricing handled by PricingZone.priceMultiplier
  const rates = [
    { name: "Majoration Nuit", appliesTo: "NIGHT" as const, startTime: "22:00", endTime: "06:00", adjustmentType: "PERCENTAGE" as const, value: 25.0, priority: 10 },
    { name: "Majoration Week-end", appliesTo: "WEEKEND" as const, daysOfWeek: "0,6", adjustmentType: "PERCENTAGE" as const, value: 15.0, priority: 5 },
  ];
  for (const r of rates) {
    await prisma.advancedRate.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...r, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✅ ${rates.length} rates`);
}

async function createSeasonalMultipliers() {
  console.log("\n🌸 Creating Seasonal Multipliers...");
  const mults = [
    { name: "Haute Saison Été", startDate: new Date("2025-07-01"), endDate: new Date("2025-08-31"), multiplier: 1.15, priority: 5 },
    { name: "Fêtes Fin d'Année", startDate: new Date("2025-12-20"), endDate: new Date("2026-01-05"), multiplier: 1.25, priority: 10 },
    { name: "Fashion Week", startDate: new Date("2025-09-23"), endDate: new Date("2025-10-01"), multiplier: 1.20, priority: 8 },
    { name: "Basse Saison", startDate: new Date("2025-01-15"), endDate: new Date("2025-02-28"), multiplier: 0.90, priority: 3 },
  ];
  for (const m of mults) {
    await prisma.seasonalMultiplier.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...m, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✅ ${mults.length} multipliers`);
}

async function createOptionalFees() {
  console.log("\n💵 Creating Optional Fees...");
  const fees = [
    { name: "Siège Bébé", amountType: "FIXED" as const, amount: 15.0, isTaxable: true, vatRate: 20.0 },
    { name: "Siège Rehausseur", amountType: "FIXED" as const, amount: 10.0, isTaxable: true, vatRate: 20.0 },
    { name: "Bagage Supplémentaire", amountType: "FIXED" as const, amount: 10.0, isTaxable: true, vatRate: 20.0 },
    { name: "Accueil Personnalisé", amountType: "FIXED" as const, amount: 20.0, isTaxable: true, vatRate: 20.0 },
    { name: "Eau et Rafraîchissements", amountType: "FIXED" as const, amount: 15.0, isTaxable: true, vatRate: 20.0 },
    { name: "WiFi à Bord", amountType: "FIXED" as const, amount: 10.0, isTaxable: true, vatRate: 20.0 },
  ];
  for (const f of fees) {
    await prisma.optionalFee.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...f, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✅ ${fees.length} fees`);
}

async function createPromotions() {
  console.log("\n🎁 Creating Promotions...");
  const promos = [
    { code: "BIENVENUE20", discountType: "PERCENTAGE" as const, value: 20.0, validFrom: new Date("2025-01-01"), validTo: new Date("2025-12-31"), maxTotalUses: 500, maxUsesPerContact: 1 },
    { code: "FIDELITE10", discountType: "PERCENTAGE" as const, value: 10.0, validFrom: new Date("2025-01-01"), validTo: new Date("2025-12-31") },
    { code: "ETUDIANT15", discountType: "PERCENTAGE" as const, value: 15.0, validFrom: new Date("2025-01-01"), validTo: new Date("2025-12-31") },
    { code: "NOEL25", discountType: "FIXED" as const, value: 25.0, validFrom: new Date("2025-12-01"), validTo: new Date("2025-12-31"), maxTotalUses: 200 },
  ];
  for (const p of promos) {
    await prisma.promotion.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...p, currentUses: 0, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
  }
  console.log(`   ✅ ${promos.length} promotions`);
}

async function createDrivers() {
  console.log("\n👨‍✈️ Creating Drivers...");
  const drivers = [
    { firstName: "Jean-Pierre", lastName: "Martin", email: "jp.martin@vtc.fr", phone: "+33 6 12 34 56 78", employmentStatus: "EMPLOYEE" as const, hourlyCost: 28.0, licenses: ["B"] },
    { firstName: "Sophie", lastName: "Dubois", email: "s.dubois@vtc.fr", phone: "+33 6 23 45 67 89", employmentStatus: "EMPLOYEE" as const, hourlyCost: 28.0, licenses: ["B"] },
    { firstName: "Mohammed", lastName: "Benali", email: "m.benali@vtc.fr", phone: "+33 6 34 56 78 90", employmentStatus: "EMPLOYEE" as const, hourlyCost: 31.0, licenses: ["B", "D1"] },
    { firstName: "Pierre", lastName: "Lefebvre", email: "p.lefebvre@vtc.fr", phone: "+33 6 45 67 89 01", employmentStatus: "EMPLOYEE" as const, hourlyCost: 34.0, licenses: ["B", "D1", "D"] },
    { firstName: "Marie", lastName: "Laurent", email: "m.laurent@vtc.fr", phone: "+33 6 56 78 90 12", employmentStatus: "CONTRACTOR" as const, hourlyCost: 32.0, licenses: ["B"] },
    { firstName: "Thomas", lastName: "Bernard", email: "t.bernard@vtc.fr", phone: "+33 6 67 89 01 23", employmentStatus: "CONTRACTOR" as const, hourlyCost: 33.0, licenses: ["B", "D1"] },
    { firstName: "Fatima", lastName: "El Amrani", email: "f.elamrani@vtc.fr", phone: "+33 6 78 90 12 34", employmentStatus: "FREELANCE" as const, hourlyCost: 36.0, licenses: ["B", "D"] },
    { firstName: "Nicolas", lastName: "Petit", email: "n.petit@vtc.fr", phone: "+33 6 89 01 23 45", employmentStatus: "EMPLOYEE" as const, hourlyCost: 29.0, licenses: ["B"] },
  ];
  for (const d of drivers) {
    const { licenses, ...data } = d;
    const driver = await prisma.driver.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...data, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
    DRIVER_IDS.push(driver.id);
    for (const lc of licenses) {
      await prisma.driverLicense.create({
        data: {
          id: randomUUID(),
          driverId: driver.id,
          licenseCategoryId: LICENSE_CATEGORY_IDS[lc],
          licenseNumber: `${lc}${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
          validFrom: new Date("2020-01-01"),
          validTo: new Date("2030-12-31"),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
  }
  console.log(`   ✅ ${drivers.length} drivers`);
}

async function createVehicles() {
  console.log("\n🚙 Creating Vehicles...");
  const vehicles = [
    // ========== FLOTTE SIXIÈME ÉTOILE - Base Bussy-Saint-Martin (5 véhicules réels) ==========
    // Mercedes Vito 8 places - FS-843-TR (PTAC ~3.2t, permis B car ≤9 places et ≤3.5t)
    // Coffre Vito 8pl: ~600L = environ 4-5 grosses valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "FS-843-TR", internalName: "Mercedes Vito 8pl", passengerCapacity: 8, luggageCapacity: 5, consumptionLPer100Km: 9.0, costPerKm: 0.55, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    // Sprinter 17 places - GS-218-DL (PTAC ~5t, ≤17 places, permis D1)
    // Soute Sprinter 17pl: ~800L = environ 10-12 valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "GS-218-DL", internalName: "Mercedes Sprinter 17pl", passengerCapacity: 17, luggageCapacity: 12, consumptionLPer100Km: 12.0, costPerKm: 0.85, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D1"], status: "ACTIVE" as const },
    // Sprinter 20 places - GQ-430-XV (PTAC ~5.5t, >17 places = permis D obligatoire)
    // Soute Sprinter 20pl: ~900L = environ 12-15 valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "GQ-430-XV", internalName: "Mercedes Sprinter 20pl", passengerCapacity: 20, luggageCapacity: 15, consumptionLPer100Km: 13.0, costPerKm: 0.90, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const },
    // Sprinter VIP KAKO 7 places (PTAC ~5.5t = véhicule lourd, permis D obligatoire malgré 7 places)
    // Soute VIP avec coffre approfondi: ~700L = environ 8-10 valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "KAKO-VIP", internalName: "Sprinter VIP KAKO 7pl", passengerCapacity: 7, luggageCapacity: 10, consumptionLPer100Km: 11.0, costPerKm: 0.95, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const },
    // Iveco 30 places - HB-106-LG (PTAC ~7t, permis D)
    // Grande soute Iveco: ~2000L = environ 25-30 valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "HB-106-LG", internalName: "Iveco 30pl", passengerCapacity: 30, luggageCapacity: 28, consumptionLPer100Km: 18.0, costPerKm: 1.20, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const },

    // ========== VÉHICULES SUPPLÉMENTAIRES - Bases autour de Paris ==========
    // Berlines légères (permis B, PTAC <3.5t) - Coffre ~500L = 3 grosses valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], operatingBaseId: OPERATING_BASE_IDS["Siège Paris 8ème"], registrationNumber: "AB-123-CD", internalName: "Mercedes E220d #1", passengerCapacity: 4, luggageCapacity: 3, consumptionLPer100Km: 5.5, costPerKm: 0.35, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], operatingBaseId: OPERATING_BASE_IDS["Base CDG Airport"], registrationNumber: "EF-456-GH", internalName: "Mercedes E220d #2", passengerCapacity: 4, luggageCapacity: 3, consumptionLPer100Km: 5.5, costPerKm: 0.35, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], operatingBaseId: OPERATING_BASE_IDS["Base Orly Airport"], registrationNumber: "IJ-789-KL", internalName: "BMW 520d #1", passengerCapacity: 4, luggageCapacity: 3, consumptionLPer100Km: 5.8, costPerKm: 0.38, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    // Vans légers (permis B, ≤9 places, PTAC <3.5t) - V-Class coffre ~600L = 5-6 valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], operatingBaseId: OPERATING_BASE_IDS["Base CDG Airport"], registrationNumber: "QR-345-ST", internalName: "Mercedes V-Class 7pl", passengerCapacity: 7, luggageCapacity: 6, consumptionLPer100Km: 8.5, costPerKm: 0.55, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], operatingBaseId: OPERATING_BASE_IDS["Base Orly Airport"], registrationNumber: "TU-678-VW", internalName: "Mercedes Vito 8pl #2", passengerCapacity: 8, luggageCapacity: 5, consumptionLPer100Km: 9.0, costPerKm: 0.55, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    // Véhicules Luxe berlines (permis B) - Coffre ~400L = 2 grosses valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], operatingBaseId: OPERATING_BASE_IDS["Siège Paris 8ème"], registrationNumber: "UV-678-WX", internalName: "Mercedes S-Class", passengerCapacity: 3, luggageCapacity: 2, consumptionLPer100Km: 7.5, costPerKm: 0.65, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], operatingBaseId: OPERATING_BASE_IDS["Base La Défense"], registrationNumber: "YZ-901-AB", internalName: "BMW 750Li", passengerCapacity: 3, luggageCapacity: 2, consumptionLPer100Km: 8.0, costPerKm: 0.70, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const },
    // Minibus supplémentaires (permis D1, ≤17 places) - Soute ~700L = 10 valises
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], operatingBaseId: OPERATING_BASE_IDS["Base CDG Airport"], registrationNumber: "GH-567-IJ", internalName: "Ford Transit 14pl", passengerCapacity: 14, luggageCapacity: 10, consumptionLPer100Km: 11.0, costPerKm: 0.80, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D1"], status: "ACTIVE" as const },
    // Autocars grande capacité (permis D) - Grandes soutes ~4000-5000L
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], operatingBaseId: OPERATING_BASE_IDS["Base CDG Airport"], registrationNumber: "KL-890-MN", internalName: "Mercedes Tourismo 50pl", passengerCapacity: 50, luggageCapacity: 50, consumptionLPer100Km: 25.0, costPerKm: 1.50, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], operatingBaseId: OPERATING_BASE_IDS["Siège Paris 8ème"], registrationNumber: "MN-234-OP", internalName: "Setra 60pl", passengerCapacity: 60, luggageCapacity: 60, consumptionLPer100Km: 28.0, costPerKm: 1.70, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const },
  ];
  for (const v of vehicles) {
    const created = await prisma.vehicle.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...v, createdAt: new Date(), updatedAt: new Date() },
    });
    VEHICLE_IDS.push(created.id);
  }
  console.log(`   ✅ ${vehicles.length} vehicles`);
}

async function createContacts() {
  console.log("\n📞 Creating Contacts...");
  const contacts = [
    { type: "INDIVIDUAL" as const, displayName: "Marie Dupont", firstName: "Marie", lastName: "Dupont", email: "marie.dupont@gmail.com", phone: "+33 6 11 22 33 44", isPartner: false, defaultClientType: "PRIVATE" as const },
    { type: "INDIVIDUAL" as const, displayName: "Jean Martin", firstName: "Jean", lastName: "Martin", email: "jean.martin@outlook.fr", phone: "+33 6 22 33 44 55", isPartner: false, defaultClientType: "PRIVATE" as const },
    { type: "INDIVIDUAL" as const, displayName: "Sophie Bernard", firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@free.fr", phone: "+33 6 33 44 55 66", isPartner: false, defaultClientType: "PRIVATE" as const },
    { type: "BUSINESS" as const, displayName: "Hôtel Ritz Paris", companyName: "Hôtel Ritz Paris", email: "concierge@ritzparis.com", phone: "+33 1 43 16 30 30", vatNumber: "FR12345678901", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "BUSINESS" as const, displayName: "Four Seasons George V", companyName: "Four Seasons George V", email: "concierge@fourseasons.com", phone: "+33 1 49 52 70 00", vatNumber: "FR23456789012", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "AGENCY" as const, displayName: "Paris Luxury Travel", companyName: "Paris Luxury Travel", email: "booking@parisluxury.com", phone: "+33 1 55 66 77 88", vatNumber: "FR34567890123", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "BUSINESS" as const, displayName: "TechCorp France", companyName: "TechCorp France", email: "transport@techcorp.fr", phone: "+33 1 44 55 66 77", vatNumber: "FR45678901234", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "INDIVIDUAL" as const, displayName: "Pierre Durand", firstName: "Pierre", lastName: "Durand", email: "pierre.durand@yahoo.fr", phone: "+33 6 44 55 66 77", isPartner: false, defaultClientType: "PRIVATE" as const },
  ];
  for (const c of contacts) {
    const created = await prisma.contact.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...c, createdAt: new Date(), updatedAt: new Date() },
    });
    CONTACT_IDS[c.displayName] = created.id;
  }
  console.log(`   ✅ ${contacts.length} contacts`);
}

async function createPartnerContracts() {
  console.log("\n🤝 Creating Partner Contracts...");
  const partners = ["Hôtel Ritz Paris", "Four Seasons George V", "Paris Luxury Travel", "TechCorp France"];
  for (const name of partners) {
    await prisma.partnerContract.create({
      data: {
        id: randomUUID(),
        organizationId: ORGANIZATION_ID,
        contactId: CONTACT_IDS[name],
        paymentTerms: name.includes("Hôtel") ? "DAYS_30" : "DAYS_15",
        commissionPercent: name.includes("Travel") ? 15.0 : 10.0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
  console.log(`   ✅ ${partners.length} contracts`);
}

async function createIntegrationSettings() {
  console.log("\n🔌 Creating Integration Settings...");
  await prisma.organizationIntegrationSettings.create({
    data: {
      id: randomUUID(),
      organizationId: ORGANIZATION_ID,
      googleMapsApiKey: GOOGLE_MAPS_API_KEY || null,
      collectApiKey: COLLECTAPI_API_KEY || null,
      preferredFuelType: "DIESEL",
      googleMapsStatus: GOOGLE_MAPS_API_KEY ? "connected" : "unknown",
      collectApiStatus: COLLECTAPI_API_KEY ? "connected" : "unknown",
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log("   ✅ Integration settings created");
}

async function seedDocumentTypes() {
  console.log("\n📄 Seeding Document Types...");
  const types = [
    { code: "QUOTE_PDF", name: "Quote PDF", description: "PDF for quotes" },
    { code: "INVOICE_PDF", name: "Invoice PDF", description: "PDF for invoices" },
    { code: "MISSION_ORDER", name: "Mission Order", description: "PDF for driver orders" },
  ];
  for (const t of types) {
    await prisma.documentType.upsert({ where: { code: t.code }, update: t, create: t });
  }
  console.log(`   ✅ ${types.length} document types`);
}

async function seedFuelPriceCache() {
  console.log("\n⛽ Seeding Fuel Price Cache...");
  await prisma.fuelPriceCache.deleteMany({});
  const prices = [
    { countryCode: "FR", latitude: 48.8566, longitude: 2.3522, fuelType: "DIESEL" as const, pricePerLitre: 1.789, currency: "EUR", source: "COLLECT_API", fetchedAt: new Date() },
    { countryCode: "FR", latitude: 48.8566, longitude: 2.3522, fuelType: "GASOLINE" as const, pricePerLitre: 1.859, currency: "EUR", source: "COLLECT_API", fetchedAt: new Date() },
    { countryCode: "FR", latitude: 48.8566, longitude: 2.3522, fuelType: "LPG" as const, pricePerLitre: 0.999, currency: "EUR", source: "COLLECT_API", fetchedAt: new Date() },
  ];
  for (const p of prices) {
    await prisma.fuelPriceCache.upsert({
      where: { countryCode_fuelType: { countryCode: p.countryCode, fuelType: p.fuelType } },
      update: { pricePerLitre: p.pricePerLitre, fetchedAt: p.fetchedAt },
      create: p,
    });
  }
  console.log(`   ✅ ${prices.length} fuel prices`);
}

function printSummary() {
  console.log("\n🎯 Summary:");
  console.log(`   📧 Email: ${ADMIN_EMAIL}`);
  console.log(`   🔑 Password: ${ADMIN_PASSWORD}`);
  console.log(`   🏢 Organization: Sixième Étoile VTC (${ORGANIZATION_ID})`);
  console.log(`   👤 Admin User: ${ADMIN_USER_ID}`);
  console.log("\n📊 Data Created:");
  console.log(`   • 5 Operating Bases (Bussy-Saint-Martin HQ, Paris, CDG, Orly, La Défense)`);
  console.log(`   • 3 License Categories (B, D1, D) with RSE rules`);
  console.log(`   • 5 Vehicle Categories (Berline, Van, Minibus, Autocar, Luxe)`);
  console.log(`   • 12 Pricing Zones (multi-rayon Paris + hubs)`);
  console.log(`   • 21 Zone Routes with fixed pricing`);
  console.log(`   • 4 Excursion Packages`);
  console.log(`   • 4 Dispo Packages`);
  console.log(`   • 2 Advanced Rates (night, weekend)`);
  console.log(`   • 4 Seasonal Multipliers`);
  console.log(`   • 6 Optional Fees`);
  console.log(`   • 4 Promotions`);
  console.log(`   • 8 Drivers with multi-license support`);
  console.log(`   • 15 Vehicles (5 Sixième Étoile + 10 supplémentaires)`);
  console.log(`   • 8 Contacts (individuals, businesses, agencies)`);
  console.log(`   • 4 Partner Contracts`);
  console.log(`   • No default quotes or invoices seeded`);
  console.log(`   • API keys configured (Google Maps, CollectAPI)`);
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
