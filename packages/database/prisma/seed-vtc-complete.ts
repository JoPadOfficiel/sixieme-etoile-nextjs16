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
import { randomUUID, scryptSync, randomBytes } from "crypto";

const prisma = new PrismaClient();

// Better Auth compatible password hashing
// Uses the EXACT same parameters as Better Auth's default scrypt implementation:
// N: 16384, r: 16, p: 1, dkLen: 64
function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  // Normalize password like Better Auth does
  const normalizedPassword = password.normalize("NFKC");
  // Use same scrypt parameters as Better Auth: N=16384, r=16, p=1
  const derivedKey = scryptSync(normalizedPassword, salt, 64, {
    N: 16384,
    r: 16,
    p: 1,
    maxmem: 128 * 16384 * 16 * 2,
  });
  return `${salt}:${derivedKey.toString("hex")}`;
}

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
const ZONE_ROUTE_IDS: Record<string, string> = {};
const EXCURSION_PACKAGE_IDS: Record<string, string> = {};
const DISPO_PACKAGE_IDS: Record<string, string> = {};
const PARTNER_CONTRACT_IDS: Record<string, string> = {};

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
    await createEndCustomers();
    await createSubcontractors();
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
    await prisma.endCustomer.deleteMany({});
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

  // Hash password using native crypto
  const hashedPassword = hashPassword(ADMIN_PASSWORD);
  
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
  // Story 15.2: Added averageConsumptionL100km for accurate fuel cost calculation
  // Consommation basée sur tarification 2026 VAP:
  // - Berline: 6.5 L/100km (véhicules récents) - Référence 1.0x (base)
  // - Van Premium: 9.0 L/100km (V-Class/Vito) - +25% pour espace supplémentaire
  // - Minibus: 12.5 L/100km (Sprinter standard) - +60% pour capacité groupe
  // - Minibus VIP: 11.0 L/100km (Sprinter aménagé luxe) - +100% pour service premium
  // - Autocar: 20.0 L/100km (grand autocar) - +120% pour grande capacité
  // - Luxe: 8.5 L/100km (S-Class/7-Series) - +80% pour service haut de gamme
  const cats = [
    { name: "Berline", code: "BERLINE", regulatoryCategory: "LIGHT" as const, maxPassengers: 4, priceMultiplier: 1.0, defaultRatePerKm: 2.10, defaultRatePerHour: 52.0, averageConsumptionL100km: 6.5 },
    { name: "Van Premium", code: "VAN_PREMIUM", regulatoryCategory: "LIGHT" as const, maxPassengers: 7, priceMultiplier: 1.25, defaultRatePerKm: 2.60, defaultRatePerHour: 65.0, averageConsumptionL100km: 9.0 },
    { name: "Minibus", code: "MINIBUS", regulatoryCategory: "HEAVY" as const, maxPassengers: 16, priceMultiplier: 1.6, defaultRatePerKm: 3.50, defaultRatePerHour: 85.0, averageConsumptionL100km: 12.5 },
    { name: "Minibus VIP", code: "MINIBUS_VIP", regulatoryCategory: "HEAVY" as const, maxPassengers: 8, priceMultiplier: 2.0, defaultRatePerKm: 4.80, defaultRatePerHour: 110.0, averageConsumptionL100km: 11.0 },
    { name: "Autocar", code: "AUTOCAR", regulatoryCategory: "HEAVY" as const, maxPassengers: 50, priceMultiplier: 2.2, defaultRatePerKm: 5.20, defaultRatePerHour: 140.0, averageConsumptionL100km: 20.0 },
    { name: "Luxe", code: "LUXE", regulatoryCategory: "LIGHT" as const, maxPassengers: 3, priceMultiplier: 1.8, defaultRatePerKm: 4.00, defaultRatePerHour: 105.0, averageConsumptionL100km: 8.5 },
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
  // SIMPLIFIED ZONE STRUCTURE - 13 zones instead of 26
  // Zones are designed to NOT overlap and form logical concentric rings
  // 
  // Business logic:
  // - Bussy-Saint-Martin (garage): 0.8× - no deadhead cost
  // - Near garage (Disney): 0.9× - minimal deadhead
  // - Paris: 0.9× - competitive pricing, high demand
  // - Petite Couronne: 1.1× - standard suburban
  // - Airports: 1.1-1.2× - premium transfers
  // - Grande Couronne: 1.3× - longer trips
  // - Touristic: 1.2-1.3× - excursion destinations
  // - Longue Distance: 1.5× - very far destinations
  // 
  // The pricing engine uses Math.max(pickup, dropoff) multiplier
  // This ensures profitability on trips involving expensive zones
  const zones = [
    // ============================================================================
    // SYSTÈME DE CERCLES CONCENTRIQUES
    // ============================================================================
    // 
    // PRINCIPE: Deux centres principaux avec des anneaux concentriques
    // - PARIS (centre): coeff 1.0 → anneaux qui s'éloignent = coeff augmente
    // - BUSSY-SAINT-MARTIN (garage): coeff 0.8 → anneaux qui s'éloignent = coeff augmente
    // 
    // Le moteur de pricing prend Math.max(pickup_zone, dropoff_zone)
    // Donc si une zone est couverte par plusieurs cercles, le plus petit rayon gagne
    // (car les zones sont testées du plus petit au plus grand rayon)
    //
    // ============================================================================
    // CERCLES AUTOUR DE PARIS (Centre = Notre-Dame)
    // Coordonnées: 48.8566, 2.3522
    // ============================================================================
    
    // Paris Centre (0-5km) - Coeff 1.0 (tarif de base, zone de référence)
    { name: "Paris Centre", code: "PARIS_0", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 5.0, color: "#fef08a", priceMultiplier: 1.0, multiplierDescription: "Paris intra-muros centre - tarif de référence" },
    
    // Paris Élargi (5-10km) - Coeff 1.0 (inclut périphérique)
    { name: "Paris Périphérique", code: "PARIS_10", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 10.0, color: "#fde047", priceMultiplier: 1.0, multiplierDescription: "Paris et première couronne immédiate" },
    
    // Petite Couronne (10-20km) - Coeff 1.1
    { name: "Petite Couronne", code: "PARIS_20", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 20.0, color: "#facc15", priceMultiplier: 1.1, multiplierDescription: "Petite couronne - 92, 93, 94" },
    
    // Grande Couronne Proche (20-30km) - Coeff 1.2
    { name: "Grande Couronne 30km", code: "PARIS_30", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 30.0, color: "#eab308", priceMultiplier: 1.2, multiplierDescription: "Grande couronne proche - 30km de Paris" },
    
    // Grande Couronne (30-40km) - Coeff 1.3
    { name: "Grande Couronne 40km", code: "PARIS_40", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 40.0, color: "#ca8a04", priceMultiplier: 1.3, multiplierDescription: "Grande couronne - 40km de Paris" },
    
    // Île-de-France élargie (40-60km) - Coeff 1.4
    { name: "Île-de-France 60km", code: "PARIS_60", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 60.0, color: "#a16207", priceMultiplier: 1.4, multiplierDescription: "Île-de-France élargie - 60km de Paris" },
    
    // Hors Île-de-France (60-100km) - Coeff 1.5
    { name: "Région Parisienne 100km", code: "PARIS_100", zoneType: "RADIUS" as const, centerLatitude: 48.8566, centerLongitude: 2.3522, radiusKm: 100.0, color: "#854d0e", priceMultiplier: 1.5, multiplierDescription: "Région parisienne élargie - 100km de Paris" },
    
    // ============================================================================
    // CERCLES AUTOUR DE BUSSY-SAINT-MARTIN (Garage)
    // Coordonnées: 48.8495, 2.6905
    // Ces zones ont des coefficients PLUS BAS car proche du garage = moins de trajet à vide
    // ============================================================================
    
    // Bussy Centre (0-5km) - Coeff 0.8 (le plus avantageux)
    { name: "Bussy-Saint-Martin", code: "BUSSY_0", zoneType: "RADIUS" as const, centerLatitude: 48.8495, centerLongitude: 2.6905, radiusKm: 5.0, color: "#bbf7d0", priceMultiplier: 0.8, multiplierDescription: "Zone garage - tarif le plus avantageux" },
    
    // Bussy 10km (5-10km) - Coeff 0.85 (Disney, Val d'Europe, Lagny)
    { name: "Bussy 10km", code: "BUSSY_10", zoneType: "RADIUS" as const, centerLatitude: 48.8495, centerLongitude: 2.6905, radiusKm: 10.0, color: "#86efac", priceMultiplier: 0.85, multiplierDescription: "10km du garage - Disney, Val d'Europe, Lagny" },
    
    // Bussy 15km (10-15km) - Coeff 0.9 (Meaux, Torcy, Noisy)
    { name: "Bussy 15km", code: "BUSSY_15", zoneType: "RADIUS" as const, centerLatitude: 48.8495, centerLongitude: 2.6905, radiusKm: 15.0, color: "#4ade80", priceMultiplier: 0.9, multiplierDescription: "15km du garage - Meaux, Torcy, Noisy" },
    
    // Bussy 25km (15-25km) - Coeff 0.95 (Melun, Croissy, Coulommiers)
    { name: "Bussy 25km", code: "BUSSY_25", zoneType: "RADIUS" as const, centerLatitude: 48.8495, centerLongitude: 2.6905, radiusKm: 25.0, color: "#22c55e", priceMultiplier: 0.95, multiplierDescription: "25km du garage - Melun, Coulommiers" },
    
    // Bussy 40km (25-40km) - Coeff 1.0 (Fontainebleau, Provins)
    { name: "Bussy 40km", code: "BUSSY_40", zoneType: "RADIUS" as const, centerLatitude: 48.8495, centerLongitude: 2.6905, radiusKm: 40.0, color: "#16a34a", priceMultiplier: 1.0, multiplierDescription: "40km du garage - Fontainebleau, Provins" },
    
    // ============================================================================
    // ZONES SPÉCIALES (Aéroports, Gares, Destinations touristiques)
    // Ces zones ont des rayons petits et des coefficients spécifiques
    // Elles "percent" les cercles concentriques pour avoir leur propre tarif
    // ============================================================================
    
    // AÉROPORTS - Story 17.10: Added zone surcharges (friction costs)
    { name: "Aéroport CDG", code: "CDG", zoneType: "RADIUS" as const, centerLatitude: 49.0097, centerLongitude: 2.5479, radiusKm: 5.0, color: "#0891b2", priceMultiplier: 1.2, multiplierDescription: "Aéroport CDG - transferts premium", fixedAccessFee: 15.0, surchargeDescription: "Frais d'accès aéroport CDG" },
    { name: "Aéroport Orly", code: "ORLY", zoneType: "RADIUS" as const, centerLatitude: 48.7262, centerLongitude: 2.3652, radiusKm: 4.0, color: "#14b8a6", priceMultiplier: 1.1, multiplierDescription: "Aéroport Orly - transferts aéroport", fixedAccessFee: 12.0, surchargeDescription: "Frais d'accès aéroport Orly" },
    { name: "Le Bourget", code: "LBG", zoneType: "RADIUS" as const, centerLatitude: 48.9694, centerLongitude: 2.4414, radiusKm: 3.0, color: "#ef4444", priceMultiplier: 1.2, multiplierDescription: "Le Bourget - aviation d'affaires premium", fixedAccessFee: 20.0, surchargeDescription: "Frais d'accès aviation d'affaires" },
    
    // ZONES AFFAIRES - Story 17.10: Added zone surcharges
    { name: "La Défense", code: "LA_DEFENSE", zoneType: "RADIUS" as const, centerLatitude: 48.8920, centerLongitude: 2.2362, radiusKm: 3.0, color: "#a855f7", priceMultiplier: 1.0, multiplierDescription: "La Défense - quartier d'affaires", fixedParkingSurcharge: 25.0, surchargeDescription: "Parking quartier d'affaires" },
    
    // DESTINATIONS TOURISTIQUES - Story 17.10: Added zone surcharges
    { name: "Versailles", code: "VERSAILLES", zoneType: "RADIUS" as const, centerLatitude: 48.8049, centerLongitude: 2.1204, radiusKm: 5.0, color: "#d946ef", priceMultiplier: 1.2, multiplierDescription: "Château de Versailles - zone touristique", fixedParkingSurcharge: 40.0, surchargeDescription: "Parking château de Versailles" },
    { name: "Fontainebleau", code: "FONTAINEBLEAU", zoneType: "RADIUS" as const, centerLatitude: 48.4047, centerLongitude: 2.7017, radiusKm: 8.0, color: "#c026d3", priceMultiplier: 1.3, multiplierDescription: "Fontainebleau - château et forêt" },
    { name: "Chantilly", code: "CHANTILLY", zoneType: "RADIUS" as const, centerLatitude: 49.1944, centerLongitude: 2.4711, radiusKm: 5.0, color: "#a21caf", priceMultiplier: 1.3, multiplierDescription: "Chantilly - château et hippodrome" },
    { name: "Giverny", code: "GIVERNY", zoneType: "RADIUS" as const, centerLatitude: 49.0758, centerLongitude: 1.5339, radiusKm: 5.0, color: "#86198f", priceMultiplier: 1.4, multiplierDescription: "Giverny - Maison de Monet" },
    
    // ============================================================================
    // LONGUE DISTANCE (hors Île-de-France) - Destinations spécifiques
    // ============================================================================
    
    { name: "Reims / Champagne", code: "REIMS", zoneType: "RADIUS" as const, centerLatitude: 49.2583, centerLongitude: 4.0317, radiusKm: 20.0, color: "#b45309", priceMultiplier: 1.5, multiplierDescription: "Reims - Champagne, longue distance" },
    { name: "Deauville / Normandie", code: "DEAUVILLE", zoneType: "RADIUS" as const, centerLatitude: 49.3583, centerLongitude: 0.0750, radiusKm: 15.0, color: "#92400e", priceMultiplier: 1.5, multiplierDescription: "Deauville - Normandie, longue distance" },
    { name: "Rouen", code: "ROUEN", zoneType: "RADIUS" as const, centerLatitude: 49.4432, centerLongitude: 1.0993, radiusKm: 15.0, color: "#ea580c", priceMultiplier: 1.5, multiplierDescription: "Rouen - Normandie, longue distance" },
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
  // ============================================================================
  // GRILLE TARIFAIRE AVEC CERCLES CONCENTRIQUES
  // ============================================================================
  // 
  // Les zones concentriques (PARIS_0, PARIS_10, etc.) servent pour le calcul
  // automatique du multiplicateur. Les routes fixes ci-dessous sont pour les
  // trajets les plus courants avec des prix négociés.
  //
  // Pour les trajets sans route fixe, le prix est calculé par:
  // prix_base × distance × multiplicateur_zone
  //
  // ============================================================================
  // GRILLE TARIFAIRE PROFESSIONNELLE VTC
  // ============================================================================
  // 
  // RATIOS PAR CATÉGORIE (base = BERLINE):
  // - BERLINE:      1.00× (référence)
  // - VAN_PREMIUM:  1.30× (+30%)
  // - LUXE:         1.90× (+90%)
  // - MINIBUS:      2.20× (+120%)
  // - AUTOCAR:      3.50× (+250%)
  //
  // TARIFS BASÉS SUR:
  // - Distance réelle + temps estimé
  // - Coût carburant: ~0.15€/km
  // - Coût chauffeur: ~30€/h
  // - Marge commerciale: 25-35%
  // - Péages inclus dans les forfaits
  //
  const routes = [
    // ============================================================================
    // TARIFICATION 2026 VAP - TRANSFERTS
    // Prix basés sur le PDF officiel VAP 2026
    // ============================================================================
    
    // Paris Intramuros
    { from: "PARIS_0", to: "PARIS_0", category: "BERLINE", price: 80.0 },
    { from: "PARIS_0", to: "PARIS_0", category: "VAN_PREMIUM", price: 100.0 },
    { from: "PARIS_0", to: "PARIS_0", category: "MINIBUS", price: 275.0 },
    { from: "PARIS_0", to: "PARIS_0", category: "AUTOCAR", price: 290.0 },
    
    // Paris <> Aéroports
    { from: "CDG", to: "PARIS_0", category: "BERLINE", price: 120.0 },
    { from: "CDG", to: "PARIS_0", category: "VAN_PREMIUM", price: 150.0 },
    { from: "CDG", to: "PARIS_0", category: "MINIBUS", price: 320.0 },
    { from: "CDG", to: "PARIS_0", category: "AUTOCAR", price: 350.0 },
    { from: "ORLY", to: "PARIS_0", category: "BERLINE", price: 120.0 },
    { from: "ORLY", to: "PARIS_0", category: "VAN_PREMIUM", price: 150.0 },
    { from: "ORLY", to: "PARIS_0", category: "MINIBUS", price: 320.0 },
    { from: "ORLY", to: "PARIS_0", category: "AUTOCAR", price: 350.0 },
    
    // Paris Versailles
    { from: "PARIS_0", to: "VERSAILLES", category: "BERLINE", price: 110.0 },
    { from: "PARIS_0", to: "VERSAILLES", category: "VAN_PREMIUM", price: 130.0 },
    { from: "PARIS_0", to: "VERSAILLES", category: "MINIBUS", price: 300.0 },
    { from: "PARIS_0", to: "VERSAILLES", category: "AUTOCAR", price: 330.0 },
    { from: "VERSAILLES", to: "PARIS_0", category: "BERLINE", price: 110.0 },
    { from: "VERSAILLES", to: "PARIS_0", category: "VAN_PREMIUM", price: 130.0 },
    { from: "VERSAILLES", to: "PARIS_0", category: "MINIBUS", price: 300.0 },
    { from: "VERSAILLES", to: "PARIS_0", category: "AUTOCAR", price: 330.0 },
    
    // Paris > Disneyland
    { from: "PARIS_0", to: "BUSSY_10", category: "BERLINE", price: 120.0 },
    { from: "PARIS_0", to: "BUSSY_10", category: "VAN_PREMIUM", price: 150.0 },
    { from: "PARIS_0", to: "BUSSY_10", category: "MINIBUS", price: 330.0 },
    { from: "PARIS_0", to: "BUSSY_10", category: "AUTOCAR", price: 360.0 },
    { from: "BUSSY_10", to: "PARIS_0", category: "BERLINE", price: 120.0 },
    { from: "BUSSY_10", to: "PARIS_0", category: "VAN_PREMIUM", price: 150.0 },
    { from: "BUSSY_10", to: "PARIS_0", category: "MINIBUS", price: 330.0 },
    { from: "BUSSY_10", to: "PARIS_0", category: "AUTOCAR", price: 360.0 },
    
    // Routes supplémentaires pour la couverture complète
    { from: "CDG", to: "LA_DEFENSE", category: "BERLINE", price: 120.0 },
    { from: "CDG", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 150.0 },
    { from: "ORLY", to: "LA_DEFENSE", category: "BERLINE", price: 120.0 },
    { from: "ORLY", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 150.0 },
    { from: "PARIS_0", to: "LA_DEFENSE", category: "BERLINE", price: 80.0 },
    { from: "PARIS_0", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 100.0 },
    { from: "BUSSY_0", to: "PARIS_0", category: "BERLINE", price: 120.0 },
    { from: "BUSSY_0", to: "PARIS_0", category: "VAN_PREMIUM", price: 150.0 },
    
    // ============================================================================
    // ROUTES LUXE MANQUANTES - Pour les configs partenaires
    // ============================================================================
    
    // Routes LUXE Paris <> Aéroports
    { from: "CDG", to: "PARIS_0", category: "LUXE", price: 180.0 },
    { from: "ORLY", to: "PARIS_0", category: "LUXE", price: 180.0 },
    
    // Routes LUXE Paris <> Versailles
    { from: "PARIS_0", to: "VERSAILLES", category: "LUXE", price: 160.0 },
    { from: "VERSAILLES", to: "PARIS_0", category: "LUXE", price: 160.0 },
    
    // Routes LUXE Paris <> Chantilly
    { from: "PARIS_0", to: "CHANTILLY", category: "BERLINE", price: 140.0 },
    { from: "CHANTILLY", to: "PARIS_0", category: "BERLINE", price: 140.0 },
    
    // Routes LUXE Le Bourget
    { from: "LBG", to: "PARIS_0", category: "LUXE", price: 180.0 },
    { from: "LBG", to: "PARIS_0", category: "BERLINE", price: 140.0 },
    { from: "LBG", to: "PARIS_0", category: "VAN_PREMIUM", price: 180.0 },
    
    // Routes Aéroports <> Bussy (Disney) - Pour les configs partenaires
    { from: "CDG", to: "BUSSY_10", category: "BERLINE", price: 140.0 },
    { from: "CDG", to: "BUSSY_10", category: "VAN_PREMIUM", price: 180.0 },
    { from: "CDG", to: "BUSSY_10", category: "MINIBUS", price: 320.0 },
    { from: "ORLY", to: "BUSSY_10", category: "BERLINE", price: 140.0 },
    { from: "ORLY", to: "BUSSY_10", category: "VAN_PREMIUM", price: 180.0 },
  ];
  
  for (const r of routes) {
    const routeKey = `${r.from}_${r.to}_${r.category}`;
    const created = await prisma.zoneRoute.create({
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
    ZONE_ROUTE_IDS[routeKey] = created.id;
  }
  console.log(`   ✅ ${routes.length} routes`);
}

async function createExcursionPackages() {
  console.log("\n🏰 Creating Excursion Packages...");
  // ============================================================================
  // EXCURSIONS TOURISTIQUES - GRILLE TARIFAIRE PROFESSIONNELLE
  // ============================================================================
  // 
  // FORMULE DE CALCUL:
  // Prix = (Durée × Taux horaire) + (Distance × Taux km) + Marge
  // 
  // TAUX HORAIRES PAR CATÉGORIE:
  // - BERLINE:      55€/h
  // - VAN_PREMIUM:  72€/h (+30%)
  // - LUXE:         105€/h (+90%)
  // - MINIBUS:      120€/h (+120%)
  //
  // TAUX KILOMÉTRIQUES:
  // - BERLINE:      1.80€/km
  // - VAN_PREMIUM:  2.35€/km
  // - LUXE:         3.40€/km
  // - MINIBUS:      4.00€/km
  //
  const pkgs = [
    // ============================================================================
    // EXCURSIONS DEMI-JOURNÉE (4-5h)
    // ============================================================================
    // Versailles: 25km A/R, 5h sur place
    { name: "Versailles Demi-Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 5.0, includedDistanceKm: 60.0, price: 320.0 },
    { name: "Versailles Demi-Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 5.0, includedDistanceKm: 60.0, price: 420.0 },
    { name: "Versailles Demi-Journée Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 5.0, includedDistanceKm: 60.0, price: 590.0 },
    
    // Fontainebleau: 65km A/R, 5h sur place
    { name: "Fontainebleau Demi-Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 5.0, includedDistanceKm: 130.0, price: 380.0 },
    { name: "Fontainebleau Demi-Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 5.0, includedDistanceKm: 130.0, price: 495.0 },
    
    // Chantilly: 50km A/R, 5h sur place
    { name: "Chantilly Demi-Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 5.0, includedDistanceKm: 100.0, price: 350.0 },
    { name: "Chantilly Demi-Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 5.0, includedDistanceKm: 100.0, price: 455.0 },
    
    // ============================================================================
    // EXCURSIONS JOURNÉE COMPLÈTE (8-10h)
    // ============================================================================
    // Versailles Journée: 25km A/R, 8h sur place (visite complète + jardins)
    { name: "Versailles Journée Complète Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 8.0, includedDistanceKm: 80.0, price: 480.0 },
    { name: "Versailles Journée Complète Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 8.0, includedDistanceKm: 80.0, price: 625.0 },
    { name: "Versailles Journée Complète Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 8.0, includedDistanceKm: 80.0, price: 890.0 },
    
    // Giverny: 80km A/R, 8h
    { name: "Giverny Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 8.0, includedDistanceKm: 160.0, price: 520.0 },
    { name: "Giverny Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 8.0, includedDistanceKm: 160.0, price: 680.0 },
    
    // Champagne (Reims + caves): 160km A/R, 10h
    { name: "Champagne Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 720.0 },
    { name: "Champagne Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 940.0 },
    { name: "Champagne Journée Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 1280.0 },
    
    // Fontainebleau + Vaux-le-Vicomte: 100km A/R, 9h
    { name: "Fontainebleau + Vaux Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 9.0, includedDistanceKm: 180.0, price: 580.0 },
    { name: "Fontainebleau + Vaux Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 9.0, includedDistanceKm: 180.0, price: 755.0 },
    
    // ============================================================================
    // EXCURSIONS LONGUE DISTANCE (10-14h) - TEMPORAL VECTORS (Story 18.8)
    // ============================================================================
    // These are classic destinations with guaranteed minimum durations
    
    // Châteaux de la Loire: 225km A/R, 12h minimum
    { name: "Châteaux de la Loire Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 12.0, includedDistanceKm: 450.0, price: 950.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Châteaux de la Loire", destinationDescription: "Chambord, Chenonceau, Amboise - Journée complète" },
    { name: "Châteaux de la Loire Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 12.0, includedDistanceKm: 450.0, price: 1235.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Châteaux de la Loire", destinationDescription: "Chambord, Chenonceau, Amboise - Journée complète" },
    { name: "Châteaux de la Loire Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 12.0, includedDistanceKm: 450.0, price: 1680.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Châteaux de la Loire", destinationDescription: "Chambord, Chenonceau, Amboise - Journée complète" },
    
    // Normandie D-Day: 275km A/R, 14h minimum
    { name: "Normandie D-Day Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 14.0, includedDistanceKm: 550.0, price: 1080.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Normandie D-Day", destinationDescription: "Plages du Débarquement, Cimetière américain, Pointe du Hoc" },
    { name: "Normandie D-Day Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 14.0, includedDistanceKm: 550.0, price: 1405.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Normandie D-Day", destinationDescription: "Plages du Débarquement, Cimetière américain, Pointe du Hoc" },
    
    // Mont Saint-Michel: 350km A/R, 14h minimum
    { name: "Mont Saint-Michel Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 14.0, includedDistanceKm: 700.0, price: 1250.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Mont Saint-Michel", destinationDescription: "Abbaye du Mont Saint-Michel et baie" },
    { name: "Mont Saint-Michel Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 14.0, includedDistanceKm: 700.0, price: 1625.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Mont Saint-Michel", destinationDescription: "Abbaye du Mont Saint-Michel et baie" },
    
    // Deauville: 200km A/R, 10h minimum
    { name: "Deauville Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 10.0, includedDistanceKm: 400.0, price: 780.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Deauville", destinationDescription: "Plage, Planches, Casino - Côte Fleurie" },
    { name: "Deauville Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 10.0, includedDistanceKm: 400.0, price: 1015.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Deauville", destinationDescription: "Plage, Planches, Casino - Côte Fleurie" },
    { name: "Deauville Journée Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 10.0, includedDistanceKm: 400.0, price: 1450.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Deauville", destinationDescription: "Plage, Planches, Casino - Côte Fleurie" },
    
    // Champagne (Reims): 160km A/R, 10h minimum
    { name: "Champagne Journée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 720.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Champagne (Reims)", destinationDescription: "Caves de Champagne, Cathédrale de Reims" },
    { name: "Champagne Journée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 940.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Champagne (Reims)", destinationDescription: "Caves de Champagne, Cathédrale de Reims" },
    { name: "Champagne Journée Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 1280.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Champagne (Reims)", destinationDescription: "Caves de Champagne, Cathédrale de Reims" },
    { name: "Champagne Journée Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 1440.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Champagne (Reims)", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Visite prestige" },
    
    // ============================================================================
    // EXCURSIONS SPÉCIALES (Non-temporal vectors)
    // ============================================================================
    // Paris by Night: 40km, 3h
    { name: "Paris by Night Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 3.0, includedDistanceKm: 40.0, price: 195.0 },
    { name: "Paris by Night Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 3.0, includedDistanceKm: 40.0, price: 370.0 },
    
    // Shopping Outlets (La Vallée Village): 50km A/R, 6h
    { name: "Shopping Outlets Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 6.0, includedDistanceKm: 100.0, price: 390.0 },
    { name: "Shopping Outlets Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 6.0, includedDistanceKm: 100.0, price: 510.0 },
    
    // ============================================================================
    // EXCURSIONS AVEC MAD (LONGUE DISTANCE) - TARIFS PDF VAP 2026
    // ============================================================================
    // Ces excursions sont classées comme "excursions avec MAD" car elles impliquent
    // de longues distances et durées, mais conservent le nom "MAD" de la tarification
    
    // MAD 7H Reims/Champagne (excursion avec MAD)
    { name: "MAD 7H Reims Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 7.0, includedDistanceKm: 160.0, price: 580.0, isTemporalVector: true, minimumDurationHours: 7.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion avec MAD" },
    { name: "MAD 7H Reims Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 7.0, includedDistanceKm: 160.0, price: 690.0, isTemporalVector: true, minimumDurationHours: 7.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion avec MAD" },
    { name: "MAD 7H Reims Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 7.0, includedDistanceKm: 160.0, price: 890.0, isTemporalVector: true, minimumDurationHours: 7.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion avec MAD" },
    { name: "MAD 7H Reims Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 7.0, includedDistanceKm: 160.0, price: 1060.0, isTemporalVector: true, minimumDurationHours: 7.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion avec MAD" },
    
    // MAD 10H Reims/Champagne (excursion avec MAD)
    { name: "MAD 10H Reims Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 760.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion complète avec MAD" },
    { name: "MAD 10H Reims Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 890.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion complète avec MAD" },
    { name: "MAD 10H Reims Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 1190.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion complète avec MAD" },
    { name: "MAD 10H Reims Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 10.0, includedDistanceKm: 320.0, price: 1350.0, isTemporalVector: true, minimumDurationHours: 10.0, destinationName: "Reims/Champagne", destinationDescription: "Caves de Champagne, Cathédrale de Reims - Excursion complète avec MAD" },
    
    // MAD 12H Vallée de la Loire (excursion avec MAD)
    { name: "MAD 12H Loire Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 890.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Vallée de la Loire", destinationDescription: "Châteaux de la Loire - Excursion avec MAD" },
    { name: "MAD 12H Loire Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 990.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Vallée de la Loire", destinationDescription: "Châteaux de la Loire - Excursion avec MAD" },
    { name: "MAD 12H Loire Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 1450.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Vallée de la Loire", destinationDescription: "Châteaux de la Loire - Excursion avec MAD" },
    { name: "MAD 12H Loire Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 1620.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Vallée de la Loire", destinationDescription: "Châteaux de la Loire - Excursion avec MAD" },
    
    // MAD 12H Plages Normandie (excursion avec MAD)
    { name: "MAD 12H Normandie Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 950.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Plages Normandie", destinationDescription: "Plages du Débarquement - Excursion avec MAD" },
    { name: "MAD 12H Normandie Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 1090.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Plages Normandie", destinationDescription: "Plages du Débarquement - Excursion avec MAD" },
    { name: "MAD 12H Normandie Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 1590.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Plages Normandie", destinationDescription: "Plages du Débarquement - Excursion avec MAD" },
    { name: "MAD 12H Normandie Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 12.0, includedDistanceKm: 400.0, price: 1790.0, isTemporalVector: true, minimumDurationHours: 12.0, destinationName: "Plages Normandie", destinationDescription: "Plages du Débarquement - Excursion avec MAD" },
    
    // MAD 14H Mont Saint Michel (excursion avec MAD)
    { name: "MAD 14H Mont Saint Michel Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 14.0, includedDistanceKm: 700.0, price: 1150.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Mont Saint Michel", destinationDescription: "Abbaye du Mont Saint-Michel - Excursion avec MAD" },
    { name: "MAD 14H Mont Saint Michel Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 14.0, includedDistanceKm: 700.0, price: 1290.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Mont Saint Michel", destinationDescription: "Abbaye du Mont Saint-Michel - Excursion avec MAD" },
    { name: "MAD 14H Mont Saint Michel Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 14.0, includedDistanceKm: 700.0, price: 1790.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Mont Saint Michel", destinationDescription: "Abbaye du Mont Saint-Michel - Excursion avec MAD" },
    { name: "MAD 14H Mont Saint Michel Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 14.0, includedDistanceKm: 700.0, price: 2090.0, isTemporalVector: true, minimumDurationHours: 14.0, destinationName: "Mont Saint Michel", destinationDescription: "Abbaye du Mont Saint-Michel - Excursion avec MAD" },
  ];
  for (const p of pkgs) {
    const created = await prisma.excursionPackage.create({
      data: { 
        id: randomUUID(), 
        organizationId: ORGANIZATION_ID, 
        name: p.name,
        vehicleCategoryId: p.vehicleCategoryId,
        includedDurationHours: p.includedDurationHours,
        includedDistanceKm: p.includedDistanceKm,
        price: p.price,
        // Story 18.8: Temporal Vector fields
        isTemporalVector: (p as any).isTemporalVector ?? false,
        minimumDurationHours: (p as any).minimumDurationHours ?? null,
        destinationName: (p as any).destinationName ?? null,
        destinationDescription: (p as any).destinationDescription ?? null,
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
    });
    EXCURSION_PACKAGE_IDS[p.name] = created.id;
  }
  console.log(`   ✅ ${pkgs.length} packages`);
}

async function createDispoPackages() {
  console.log("\n⏰ Creating Dispo Packages...");
  // ============================================================================
  // FORFAITS MISE À DISPOSITION - TARIFICATION 2026 VAP EXACTE
  // ============================================================================
  // 
  // Prix basés sur le PDF officiel VAP 2026:
  // - MAD Paris 3H30 Soirée (80km): 290-790€ selon catégorie
  // - MAD Paris 1/2 Journée 4H (80km): 280-750€
  // - MAD Paris 4H Nuit (80km): 350-890€
  // - MAD Paris 5H (100km): 340-890€
  // - MAD Paris 5H Nuit (100km): 420-1050€
  // - MAD Paris 6H (120km): 400-1050€
  // - MAD Paris Journée 8H (150km): 520-1360€
  // - MAD 4H Versailles/Chantilly: 350-820€
  // - MAD 5H Versailles/Chantilly: 410-950€
  // - MAD 7H Reims/Champagne: 580-1490€
  // - MAD 10H Reims/Champagne: 760-1790€
  // - MAD 12H Vallée de la Loire: 890-2090€
  // - MAD 12H Plages Normandie: 950-2290€
  // - MAD 14H Mont Saint Michel: 1150-2590€
  // 
  // Heure supplémentaire: 70-150€
  // Heure sup. (21h00 - 07h00): 80-200€
  //
  const pkgs = [
    // ============================================================================
    // MAD PARIS - TARIFS PDF VAP 2026
    // ============================================================================
    
    // MAD Paris 3H30 Soirée (80km)
    { name: "MAD Paris 3H30 Soirée Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 3.5, includedDistanceKm: 80.0, basePrice: 290.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD Paris 3H30 Soirée Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 3.5, includedDistanceKm: 80.0, basePrice: 360.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD Paris 3H30 Soirée Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 3.5, includedDistanceKm: 80.0, basePrice: 490.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD Paris 3H30 Soirée Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 3.5, includedDistanceKm: 80.0, basePrice: 590.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
    
    // MAD Paris 1/2 Journée 4H (80km)
    { name: "MAD Paris 4H Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 280.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD Paris 4H Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 320.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD Paris 4H Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 460.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD Paris 4H Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 560.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
    
    // MAD Paris 4H Nuit (80km)
    { name: "MAD Paris 4H Nuit Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 350.0, overageRatePerKm: 2.10, overageRatePerHour: 80.0 },
    { name: "MAD Paris 4H Nuit Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 400.0, overageRatePerKm: 2.60, overageRatePerHour: 90.0 },
    { name: "MAD Paris 4H Nuit Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 550.0, overageRatePerKm: 3.50, overageRatePerHour: 120.0 },
    { name: "MAD Paris 4H Nuit Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 660.0, overageRatePerKm: 5.20, overageRatePerHour: 135.0 },
    
    // MAD Paris 5H (100km)
    { name: "MAD Paris 5H Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 340.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD Paris 5H Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 420.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD Paris 5H Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 550.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD Paris 5H Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 650.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
    
    // MAD Paris 5H Nuit (100km)
    { name: "MAD Paris 5H Nuit Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 420.0, overageRatePerKm: 2.10, overageRatePerHour: 80.0 },
    { name: "MAD Paris 5H Nuit Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 490.0, overageRatePerKm: 2.60, overageRatePerHour: 90.0 },
    { name: "MAD Paris 5H Nuit Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 650.0, overageRatePerKm: 3.50, overageRatePerHour: 120.0 },
    { name: "MAD Paris 5H Nuit Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 760.0, overageRatePerKm: 5.20, overageRatePerHour: 135.0 },
    
    // MAD Paris 6H (120km)
    { name: "MAD Paris 6H Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 6.0, includedDistanceKm: 120.0, basePrice: 400.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD Paris 6H Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 6.0, includedDistanceKm: 120.0, basePrice: 470.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD Paris 6H Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 6.0, includedDistanceKm: 120.0, basePrice: 650.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD Paris 6H Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 6.0, includedDistanceKm: 120.0, basePrice: 750.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
    
    // MAD Paris Journée 8H (150km)
    { name: "MAD Paris 8H Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 520.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD Paris 8H Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 620.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD Paris 8H Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 860.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD Paris 8H Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 990.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
    
    // MAD Paris 10H (200km) - Pour les configs partenaires
    { name: "MAD Paris 10H Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 10.0, includedDistanceKm: 200.0, basePrice: 540.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD Paris 10H Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 10.0, includedDistanceKm: 200.0, basePrice: 700.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD Paris 10H Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 10.0, includedDistanceKm: 200.0, basePrice: 950.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD Paris 10H Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 10.0, includedDistanceKm: 200.0, basePrice: 1100.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
    
    // MAD Luxe (pour les configs partenaires)
    { name: "Dispo 4h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 400.0, overageRatePerKm: 4.00, overageRatePerHour: 105.0 },
    { name: "Dispo 6h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 6.0, includedDistanceKm: 120.0, basePrice: 600.0, overageRatePerKm: 4.00, overageRatePerHour: 105.0 },
    { name: "Dispo 8h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 720.0, overageRatePerKm: 4.00, overageRatePerHour: 105.0 },
    
    // MAD 4H Versailles/Chantilly
    { name: "MAD 4H Versailles Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 350.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD 4H Versailles Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 390.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD 4H Versailles Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 500.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD 4H Versailles Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 4.0, includedDistanceKm: 80.0, basePrice: 620.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
    
    // MAD 5H Versailles/Chantilly
    { name: "MAD 5H Versailles Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 410.0, overageRatePerKm: 2.10, overageRatePerHour: 70.0 },
    { name: "MAD 5H Versailles Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 490.0, overageRatePerKm: 2.60, overageRatePerHour: 80.0 },
    { name: "MAD 5H Versailles Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 600.0, overageRatePerKm: 3.50, overageRatePerHour: 100.0 },
    { name: "MAD 5H Versailles Autocar", vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], includedDurationHours: 5.0, includedDistanceKm: 100.0, basePrice: 730.0, overageRatePerKm: 5.20, overageRatePerHour: 120.0 },
  ];
  for (const p of pkgs) {
    const created = await prisma.dispoPackage.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...p, isActive: true, createdAt: new Date(), updatedAt: new Date() },
    });
    DISPO_PACKAGE_IDS[p.name] = created.id;
  }
  console.log(`   ✅ ${pkgs.length} packages`);
}

async function createPricingSettings() {
  console.log("\n💰 Creating Pricing Settings...");
  await prisma.organizationPricingSettings.create({
    data: {
      id: randomUUID(),
      organizationId: ORGANIZATION_ID,
      // === BASE RATES TARIFICATION 2026 VAP ===
      baseRatePerKm: 2.10,
      baseRatePerHour: 52.0,
      defaultMarginPercent: 28.0,
      greenMarginThreshold: 22.0,
      orangeMarginThreshold: 8.0,
      minimumFare: 30.0,
      
      // === OPERATIONAL COSTS ===
      fuelConsumptionL100km: 8.5,
      fuelPricePerLiter: 1.80,
      tollCostPerKm: 0.12,
      wearCostPerKm: 0.08,
      driverHourlyCost: 30.0,
      
      // === ADVANCED PRICING SETTINGS (Story 17.1-17.4) ===
      // Zone Resolution Strategy
      zoneConflictStrategy: "MOST_EXPENSIVE",  // When quote overlaps multiple zones, use most expensive
      zoneMultiplierAggregationStrategy: "MAX", // Take max multiplier between pickup and dropoff
      
      // Staffing Selection Policy
      staffingSelectionPolicy: "PREFER_INTERNAL", // Prefer internal drivers over contractors
      
      // Staffing Cost Parameters
      hotelCostPerNight: 85.0,        // Hotel cost for overnight trips
      mealCostPerDay: 35.0,           // Meal allowance per day
      driverOvernightPremium: 50.0,   // Premium for overnight driving
      secondDriverHourlyRate: 30.0,   // Second driver cost (€30/hour)
      relayDriverFixedFee: 150.0,     // Fixed fee for relay driver
      
      // === TRANSFER-TO-MAD THRESHOLDS (Story 18.11) ===
      denseZoneSpeedThreshold: 15.0,  // km/h - below this triggers MAD consideration
      autoSwitchToMAD: true,          // Auto-switch to MAD for dense zones
      denseZoneCodes: ["PARIS_0", "PARIS_10", "LA_DEFENSE"], // Zones considered dense
      minWaitingTimeForSeparateTransfers: 30,  // minutes
      maxReturnDistanceKm: 50.0,      // Max distance for round-trip before separate transfers
      roundTripBuffer: 15.0,          // Buffer percentage for round-trip pricing
      autoSwitchRoundTripToMAD: true, // Auto-switch round-trips to MAD if complex
      
      // === PATIENCE TAX / DIFFICULTY MULTIPLIERS (Story 17.15 & 24.8) ===
      difficultyMultipliers: {
        "1": 1.00, // Client facile - pas de majoration
        "2": 1.05, // Client standard - +5%
        "3": 1.12, // Client exigeant - +12%
        "4": 1.25, // Client difficile - +25%
        "5": 1.50, // Blacklisté / Contraintes extrêmes - +50%
      },
      
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });
  console.log("   ✅ Settings created with advanced pricing configuration");
}

async function createAdvancedRates() {
  console.log("\n📈 Creating Advanced Rates...");
  // Story 11.4: Only NIGHT and WEEKEND types are supported
  // LONG_DISTANCE, ZONE_SCENARIO, HOLIDAY removed - zone-based pricing handled by PricingZone.priceMultiplier
  
  // Majorations de nuit et heures supplémentaires (selon tableau tarifaire)
  const rates = [
    // Majoration nuit générale (25% de base)
    { name: "Majoration Nuit Standard", appliesTo: "NIGHT" as const, startTime: "22:00", endTime: "06:00", adjustmentType: "PERCENTAGE" as const, value: 25.0, priority: 10 },
    
    // Heures supplémentaires de nuit (21h00 - 07h00) - majorations spécifiques par catégorie
    { name: "Heure Sup Nuit Berline (80€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 80.0, priority: 20 },
    { name: "Heure Sup Nuit Van VIP (90€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 90.0, priority: 20 },
    { name: "Heure Sup Nuit Minivan (200€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 200.0, priority: 20 },
    { name: "Heure Sup Nuit Minicar (120€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 120.0, priority: 20 },
    { name: "Heure Sup Nuit Autocar 30p (135€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 135.0, priority: 20 },
    { name: "Heure Sup Nuit Autocar 40p (150€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 150.0, priority: 20 },
    { name: "Heure Sup Nuit Autocar 57p (160€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 160.0, priority: 20 },
    
    // Majoration week-end
    { name: "Majoration Week-end", appliesTo: "WEEKEND" as const, daysOfWeek: "0,6", adjustmentType: "PERCENTAGE" as const, value: 15.0, priority: 5 },

    // Majoration spécifique LUXE
    { name: "Majoration Nuit LUXE (Plaisir Nocturne)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "06:00", adjustmentType: "PERCENTAGE" as const, value: 35.0, priority: 30 },
    { name: "Heure Sup Nuit LUXE (150€)", appliesTo: "NIGHT" as const, startTime: "21:00", endTime: "07:00", adjustmentType: "FIXED_AMOUNT" as const, value: 150.0, priority: 30 },
  ];
  for (const r of rates) {
    // Aligner avec Story 23.5: filtrage par catégorie
    let vehicleCategoryIds: string[] = [];
    if (r.name.includes("Berline")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["BERLINE"]];
    else if (r.name.includes("Van VIP")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["VAN_PREMIUM"]];
    else if (r.name.includes("Minivan")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["MINIBUS"]];
    else if (r.name.includes("Minicar")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["MINIBUS"]];
    else if (r.name.includes("Autocar")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["AUTOCAR"]];
    else if (r.name.includes("LUXE")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["LUXE"]];
    else {
      // Les tarifs généraux s'appliquent à tout sauf LUXE pour forcer le pricing spécifique
      vehicleCategoryIds = Object.values(VEHICLE_CATEGORY_IDS).filter(id => id !== VEHICLE_CATEGORY_IDS["LUXE"]);
    }

    await prisma.advancedRate.create({
      data: { 
        id: randomUUID(), 
        organizationId: ORGANIZATION_ID, 
        ...r, 
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date(),
        vehicleCategories: {
          connect: vehicleCategoryIds.map(id => ({ id }))
        }
      },
    });
  }
  console.log(`   ✅ ${rates.length} rates`);
}

async function createSeasonalMultipliers() {
  console.log("\n🌸 Creating Seasonal Multipliers...");
  const mults = [
    { name: "Haute Saison Été 2026", startDate: new Date("2026-07-01"), endDate: new Date("2026-08-31"), multiplier: 1.15, priority: 5 },
    { name: "Fêtes Fin d'Année 2026", startDate: new Date("2026-12-20"), endDate: new Date("2027-01-05"), multiplier: 1.25, priority: 10 },
    { name: "Fashion Week Sept 2026", startDate: new Date("2026-09-23"), endDate: new Date("2026-10-01"), multiplier: 1.20, priority: 8 },
    { name: "Basse Saison 2026", startDate: new Date("2026-01-15"), endDate: new Date("2026-02-28"), multiplier: 0.90, priority: 3 },
    { name: "Expiré 2025", startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), multiplier: 0.80, priority: 1 },
  ];
  for (const m of mults) {
    // Les multiplicateurs saisonniers s'appliquent à toutes les catégories par défaut
    const vehicleCategoryIds = Object.values(VEHICLE_CATEGORY_IDS);
    
    await prisma.seasonalMultiplier.create({
      data: { 
        id: randomUUID(), 
        organizationId: ORGANIZATION_ID, 
        ...m, 
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date(),
        vehicleCategories: {
          connect: vehicleCategoryIds.map(id => ({ id }))
        }
      },
    });
  }
  console.log(`   ✅ ${mults.length} multipliers`);
}

async function createOptionalFees() {
  console.log("\n💵 Creating Optional Fees...");
  // Frais optionnels selon le tableau tarifaire
  const fees = [
    // Frais optionnels existants
    { name: "Siège Bébé", amountType: "FIXED" as const, amount: 15.0, isTaxable: true, vatRate: 20.0 },
    { name: "Siège Rehausseur", amountType: "FIXED" as const, amount: 10.0, isTaxable: true, vatRate: 20.0 },
    { name: "Bagage Supplémentaire", amountType: "FIXED" as const, amount: 10.0, isTaxable: true, vatRate: 20.0 },
    { name: "Accueil Personnalisé", amountType: "FIXED" as const, amount: 20.0, isTaxable: true, vatRate: 20.0 },
    { name: "Eau et Rafraîchissements", amountType: "FIXED" as const, amount: 15.0, isTaxable: true, vatRate: 20.0 },
    { name: "WiFi à Bord", amountType: "FIXED" as const, amount: 10.0, isTaxable: true, vatRate: 20.0 },
    
    // Heures supplémentaires par catégorie de véhicule (selon tableau tarifaire)
    { name: "Heure Supplémentaire Berline (70€)", amountType: "FIXED" as const, amount: 70.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire Van VIP (80€)", amountType: "FIXED" as const, amount: 80.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire Minivan (150€)", amountType: "FIXED" as const, amount: 150.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire Minicar (100€)", amountType: "FIXED" as const, amount: 100.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire Autocar 30p (120€)", amountType: "FIXED" as const, amount: 120.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire Autocar 40p (140€)", amountType: "FIXED" as const, amount: 140.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire Autocar 57p (140€)", amountType: "FIXED" as const, amount: 140.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire LUXE (120€)", amountType: "FIXED" as const, amount: 120.0, isTaxable: true, vatRate: 20.0 },
    { name: "Heure Supplémentaire Minivan VIP (130€)", amountType: "FIXED" as const, amount: 130.0, isTaxable: true, vatRate: 20.0 },
  ];
  for (const f of fees) {
    // Aligner avec Story 23.5: filtrage par catégorie
    let vehicleCategoryIds: string[] = [];
    if (f.name.includes("Berline")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["BERLINE"]];
    else if (f.name.includes("Van VIP")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["VAN_PREMIUM"]];
    else if (f.name.includes("Minivan VIP")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["MINIBUS_VIP"]];
    else if (f.name.includes("Minivan")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["MINIBUS"]];
    else if (f.name.includes("Minicar")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["MINIBUS"]];
    else if (f.name.includes("Autocar")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["AUTOCAR"]];
    else if (f.name.includes("LUXE")) vehicleCategoryIds = [VEHICLE_CATEGORY_IDS["LUXE"]];
    else {
      // Les frais de base (siège bébé, etc.) s'appliquent à tous
      vehicleCategoryIds = Object.values(VEHICLE_CATEGORY_IDS);
    }
    
    await prisma.optionalFee.create({
      data: { 
        id: randomUUID(), 
        organizationId: ORGANIZATION_ID, 
        ...f, 
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date(),
        vehicleCategories: {
          connect: vehicleCategoryIds.map(id => ({ id }))
        }
      },
    });
  }
  console.log(`   ✅ ${fees.length} fees`);
}

async function createPromotions() {
  console.log("\n🎁 Creating Promotions...");
  const promos = [
    { code: "BIENVENUE2026", discountType: "PERCENTAGE" as const, value: 20.0, validFrom: new Date("2026-01-01"), validTo: new Date("2026-12-31"), maxTotalUses: 500, maxUsesPerContact: 1 },
    { code: "FIDELITE10", discountType: "PERCENTAGE" as const, value: 10.0, validFrom: new Date("2026-01-01"), validTo: new Date("2026-12-31") },
    { code: "ETUDIANT2026", discountType: "PERCENTAGE" as const, value: 15.0, validFrom: new Date("2026-01-01"), validTo: new Date("2026-12-31") },
    { code: "NOEL26", discountType: "FIXED" as const, value: 25.0, validFrom: new Date("2026-12-01"), validTo: new Date("2026-12-31"), maxTotalUses: 200 },
    
    // Promotions expirées (Story 24)
    { code: "JO_2024", discountType: "PERCENTAGE" as const, value: 30.0, validFrom: new Date("2024-07-01"), validTo: new Date("2024-08-31") },
    { code: "OUVERTURE2025", discountType: "FIXED" as const, value: 15.0, validFrom: new Date("2025-01-01"), validTo: new Date("2025-01-31") },
    { code: "HIVER_2025", discountType: "PERCENTAGE" as const, value: 10.0, validFrom: new Date("2025-11-01"), validTo: new Date("2025-12-31") },
  ];
  for (const p of promos) {
    // Les promos s'appliquent à tous par défaut sauf mention contraire
    const vehicleCategoryIds = Object.values(VEHICLE_CATEGORY_IDS);
    
    await prisma.promotion.create({
      data: { 
        id: randomUUID(), 
        organizationId: ORGANIZATION_ID, 
        ...p, 
        currentUses: 0, 
        isActive: true, 
        createdAt: new Date(), 
        updatedAt: new Date(),
        vehicleCategories: {
          connect: vehicleCategoryIds.map(id => ({ id }))
        }
      },
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
  console.log("\n🚙 Creating Vehicles with TCO...");
  const vehicles = [
    // ========== FLOTTE SIXIÈME ÉTOILE - Base Bussy-Saint-Martin (6 véhicules principaux) ==========
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "FS-843-TR", internalName: "Mercedes Vito 8pl", passengerCapacity: 8, luggageCapacity: 5, consumptionLPer100Km: 9.0, costPerKm: 0.55, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const, purchasePrice: 45000, expectedLifespanKm: 300000, expectedLifespanYears: 5, annualMaintenanceBudget: 2500, annualInsuranceCost: 1200, notes: "Véhicule léger - Non soumis à la RSE (8 places < 9, < 3.5t)" },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "GS-218-DL", internalName: "Mercedes Sprinter 17pl", passengerCapacity: 17, luggageCapacity: 12, consumptionLPer100Km: 12.0, costPerKm: 0.85, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D1"], status: "ACTIVE" as const, purchasePrice: 65000, expectedLifespanKm: 350000, expectedLifespanYears: 6, annualMaintenanceBudget: 3500, annualInsuranceCost: 1800, notes: "Soumis à la RSE - Tachygraphe numérique 1C V2, limiteur vitesse 90km/h, contrôle technique annuel, Euro 6" },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "GQ-430-XV", internalName: "Mercedes Sprinter 20pl", passengerCapacity: 20, luggageCapacity: 15, consumptionLPer100Km: 13.0, costPerKm: 0.90, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const, purchasePrice: 75000, expectedLifespanKm: 350000, expectedLifespanYears: 6, annualMaintenanceBudget: 4000, annualInsuranceCost: 2000, notes: "Soumis à la RSE - Tachygraphe numérique 1C V2, limiteur vitesse 90km/h, contrôle technique annuel, Euro 6" },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS_VIP"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "KAKO-VIP", internalName: "Sprinter VIP KAKO 7pl", passengerCapacity: 7, luggageCapacity: 10, consumptionLPer100Km: 11.0, costPerKm: 0.95, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const, purchasePrice: 85000, expectedLifespanKm: 300000, expectedLifespanYears: 5, annualMaintenanceBudget: 4500, annualInsuranceCost: 2200, notes: "Soumis à la RSE - Tachygraphe numérique 1C V2, limiteur vitesse 90km/h, contrôle technique annuel, Euro 6 (plus de 3.5t)" },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["AUTOCAR"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "HB-106-LG", internalName: "Iveco 30pl", passengerCapacity: 30, luggageCapacity: 28, consumptionLPer100Km: 18.0, costPerKm: 1.20, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["D"], status: "ACTIVE" as const, purchasePrice: 120000, expectedLifespanKm: 400000, expectedLifespanYears: 7, annualMaintenanceBudget: 6000, annualInsuranceCost: 3000, notes: "Soumis à la RSE - Tachygraphe numérique 1C V2, limiteur vitesse 90km/h, contrôle technique annuel, Euro 6" },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "EF-456-GH", internalName: "Mercedes V-Class 7pl", passengerCapacity: 7, luggageCapacity: 6, consumptionLPer100Km: 8.5, costPerKm: 0.55, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const, purchasePrice: 50000, expectedLifespanKm: 300000, expectedLifespanYears: 5, annualMaintenanceBudget: 2300, annualInsuranceCost: 1150, notes: "Véhicule léger - Non soumis à la RSE (7 places < 9, < 3.5t)" },

    // ========== NOUVEAUX VÉHICULES 2025 - Mise à jour flotte ==========
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "GW-364-SW", internalName: "Mercedes Vito 8pl GW", passengerCapacity: 8, luggageCapacity: 5, consumptionLPer100Km: 9.0, costPerKm: 0.55, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const, purchasePrice: 46000, expectedLifespanKm: 300000, expectedLifespanYears: 5, annualMaintenanceBudget: 2500, annualInsuranceCost: 1200, notes: "Véhicule léger - Non soumis à la RSE (8 places < 9, < 3.5t)" },
    { vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], operatingBaseId: OPERATING_BASE_IDS["Base Bussy-Saint-Martin"], registrationNumber: "SW-096-GW", internalName: "Mercedes Vito 8pl SW", passengerCapacity: 8, luggageCapacity: 5, consumptionLPer100Km: 9.0, costPerKm: 0.55, requiredLicenseCategoryId: LICENSE_CATEGORY_IDS["B"], status: "ACTIVE" as const, purchasePrice: 46000, expectedLifespanKm: 300000, expectedLifespanYears: 5, annualMaintenanceBudget: 2500, annualInsuranceCost: 1200, notes: "Véhicule léger - Non soumis à la RSE (8 places < 9, < 3.5t)" },

    // ========== VÉHICULES SOUS-TRAITÉS (non dans la flotte propre) ==========
    // NOTE: Les véhicules suivants sont gérés par les sous-traitants spécialisés :
    // - Mercedes E220d (AB-123-CD) - Géré par France VTC Services (catégorie BERLINE)
    // - Mercedes Tourismo 50pl (BC-789-DE) - Géré par IDF Bus Services (catégorie AUTOCAR)
    // - Setra 70pl (FG-345-HI) - Géré par IDF Bus Services (catégorie AUTOCAR)
    // - Iveco Evadys 50pl (JK-678-LM) - Géré par IDF Bus Services (catégorie AUTOCAR)
  ];
  for (const v of vehicles) {
    const created = await prisma.vehicle.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...v, createdAt: new Date(), updatedAt: new Date() },
    });
    VEHICLE_IDS.push(created.id);
  }
  console.log(`   ✅ ${vehicles.length} vehicles with TCO calculations`);
}

async function createContacts() {
  console.log("\n📞 Creating Contacts - 5 Agences et 2 Comptes Business...");
  const contacts = [
    // === 5 AGENCES PRINCIPALES ===
    { type: "AGENCY" as const, displayName: "VTC Premium - Siège Social", companyName: "VTC Premium Services", email: "contact@vtc-premium.fr", phone: "+33 1 42 86 83 00", vatNumber: "FR12345678901", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 2 },
    { type: "AGENCY" as const, displayName: "VTC Premium - Opérations CDG", companyName: "VTC Premium CDG", email: "cdg@vtc-premium.fr", phone: "+33 1 39 21 50 00", vatNumber: "FR12345678902", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 3 },
    { type: "AGENCY" as const, displayName: "VTC Premium - Opérations Orly", companyName: "VTC Premium Orly", email: "orly@vtc-premium.fr", phone: "+33 1 69 38 45 67", vatNumber: "FR12345678903", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 3 },
    { type: "AGENCY" as const, displayName: "VTC Premium - Tourisme Paris", companyName: "VTC Premium Tourisme", email: "tourisme@vtc-premium.fr", phone: "+33 1 44 55 61 00", vatNumber: "FR12345678904", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 2 },
    { type: "AGENCY" as const, displayName: "VTC Premium - Événementiel", companyName: "VTC Premium Events", email: "events@vtc-premium.fr", phone: "+33 1 47 56 70 00", vatNumber: "FR12345678905", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 4 },
    
    // === 2 COMPTES BUSINESS CORPORATE ===
    { type: "BUSINESS" as const, displayName: "LVMH Group Travel", companyName: "LVMH Moët Hennessy Louis Vuitton", email: "group.travel@lvmh.com", phone: "+33 1 44 13 22 22", vatNumber: "FR88901234568", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 4 },
    { type: "BUSINESS" as const, displayName: "TotalEnergies Corporate", companyName: "TotalEnergies SE", email: "corporate.travel@totalenergies.com", phone: "+33 1 47 55 45 46", vatNumber: "FR10123456780", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 3 },
    { type: "BUSINESS" as const, displayName: "L'Oréal Corporate", companyName: "L'Oréal S.A.", email: "travel@loreal.com", phone: "+33 1 47 12 34 56", vatNumber: "FR10123456781", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 4 },
    { type: "BUSINESS" as const, displayName: "BNP Paribas Events", companyName: "BNP Paribas", email: "events@bnpparibas.com", phone: "+33 1 40 14 45 56", vatNumber: "FR10123456782", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 3 },

    // === HÔTELS DE LUXE ===
    { type: "AGENCY" as const, displayName: "Hôtel Ritz Paris", companyName: "The Ritz Paris", email: "concierge@ritzparis.com", phone: "+33 1 43 16 30 30", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 2 },
    { type: "AGENCY" as const, displayName: "Four Seasons George V", companyName: "Four Seasons Hotel George V", email: "concierge.paris@fourseasons.com", phone: "+33 1 49 52 70 00", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 3 },
    { type: "AGENCY" as const, displayName: "Le Bristol Paris", companyName: "Hôtel Le Bristol", email: "concierge.lebristolparis@oetkercollection.com", phone: "+33 1 53 43 43 00", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 2 },
    { type: "AGENCY" as const, displayName: "Hôtel Plaza Athénée", companyName: "Plaza Athénée", email: "concierge.hpa@dorchestercollection.com", phone: "+33 1 53 67 66 66", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 4 },

    // === AGENCES DMC ===
    { type: "AGENCY" as const, displayName: "PARISCityVISION", companyName: "PARISCityVISION S.A.", email: "booking@pariscityvision.com", phone: "+33 1 44 55 61 00", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 3 },
    { type: "AGENCY" as const, displayName: "France Tourisme", companyName: "France Tourisme", email: "info@francetourisme.fr", phone: "+33 1 53 10 35 35", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 4 },
    { type: "AGENCY" as const, displayName: "Euroscope Paris", companyName: "Euroscope Paris", email: "contact@euroscope.fr", phone: "+33 1 56 03 56 03", isPartner: true, defaultClientType: "PARTNER" as const, difficultyScore: 2 },
    
    // === 10 CONTACTS CLIENTS RÉELS ===
    { type: "INDIVIDUAL" as const, displayName: "Marie Dupont", firstName: "Marie", lastName: "Dupont", email: "marie.dupont@gmail.com", phone: "+33 6 11 22 33 44", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 1 },
    { type: "INDIVIDUAL" as const, displayName: "Jean Martin", firstName: "Jean", lastName: "Martin", email: "jean.martin@outlook.fr", phone: "+33 6 22 33 44 55", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 2 },
    { type: "INDIVIDUAL" as const, displayName: "Sophie Bernard", firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@free.fr", phone: "+33 6 33 44 55 66", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 2 },
    { type: "INDIVIDUAL" as const, displayName: "Pierre Durand", firstName: "Pierre", lastName: "Durand", email: "pierre.durand@yahoo.fr", phone: "+33 6 44 55 66 77", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 3 },
    { type: "INDIVIDUAL" as const, displayName: "Claire Moreau", firstName: "Claire", lastName: "Moreau", email: "claire.moreau@orange.fr", phone: "+33 6 55 66 77 88", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 2 },
    { type: "INDIVIDUAL" as const, displayName: "Michel Lefebvre", firstName: "Michel", lastName: "Lefebvre", email: "m.lefebvre@sfr.fr", phone: "+33 6 66 77 88 99", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 3 },
    { type: "INDIVIDUAL" as const, displayName: "Isabelle Rousseau", firstName: "Isabelle", lastName: "Rousseau", email: "i.rousseau@bbox.fr", phone: "+33 6 77 88 99 00", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 2 },
    { type: "INDIVIDUAL" as const, displayName: "Bernard Petit", firstName: "Bernard", lastName: "Petit", email: "b.petit@numericable.fr", phone: "+33 6 88 99 00 11", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 1 },
    { type: "INDIVIDUAL" as const, displayName: "Françoise Laurent", firstName: "Françoise", lastName: "Laurent", email: "f.laurent@free.fr", phone: "+33 6 99 00 11 22", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 2 },
    { type: "INDIVIDUAL" as const, displayName: "Philippe Dubois", firstName: "Philippe", lastName: "Dubois", email: "p.dubois@orange.fr", phone: "+33 6 00 11 22 33", isPartner: false, defaultClientType: "PRIVATE" as const, difficultyScore: 3 },
  ];
  for (const c of contacts) {
    const created = await prisma.contact.create({
      data: { id: randomUUID(), organizationId: ORGANIZATION_ID, ...c, createdAt: new Date(), updatedAt: new Date() },
    });
    CONTACT_IDS[c.displayName] = created.id;
  }
  console.log(`   ✅ ${contacts.length} contacts with difficulty scores`);
}

async function createEndCustomers() {
  console.log("\n👤 Creating EndCustomers for Partner Agencies (Story 24)...");
  
  const partners = Object.keys(CONTACT_IDS).filter(name => 
    name.includes("VTC Premium") || 
    name.includes("LVMH") || 
    name.includes("TotalEnergies") || 
    name.includes("L'Oréal") ||
    name.includes("BNP") ||
    name.includes("Hôtel") ||
    name.includes("George V") ||
    name.includes("Bristol") ||
    name.includes("PARISCityVISION") ||
    name.includes("France Tourisme") ||
    name.includes("Euroscope")
  );

  const lastNames = ["Grosjean", "Lemoine", "Vignon", "Rousseau", "Castel", "Masson", "Perrin", "Girard", "Dupont", "Durand", "Leroy", "Moreau", "Simon", "Laurent", "Michel", "Garcia", "Thomas", "Robert", "Richard", "Petit"];
  const firstNames = ["Alexandre", "Béatrice", "Charles", "Diane", "Emilie", "Frédéric", "Guillaume", "Hélène", "Jean", "Julie", "Kevin", "Laura", "Marc", "Nathalie", "Olivier", "Pauline", "Quentin", "Rosa", "Sébastien", "Thérèse"];

  let totalEndCustomers = 0;

  for (const partnerName of partners) {
    const contactId = CONTACT_IDS[partnerName];
    if (!contactId) continue;

    // Déterminer le nombre de clients : Siège et gros partenaires = 20, autres = 3-8
    let count = partnerName.includes("Siège") || partnerName.includes("Événementiel") || partnerName.includes("LVMH") || partnerName.includes("PARISCityVISION") 
      ? 20 
      : 3 + Math.floor(Math.random() * 6);

    for (let i = 0; i < count; i++) {
      const fName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const difficulty = 1 + Math.floor(Math.random() * 5); // 1-5
      
      await prisma.endCustomer.create({
        data: {
          id: randomUUID(),
          organizationId: ORGANIZATION_ID,
          contactId: contactId,
          firstName: fName,
          lastName: lName,
          email: `${fName.toLowerCase()}.${lName.toLowerCase()}${i}@partner-client.com`,
          phone: `+33 6 ${Math.floor(10000000 + Math.random() * 89999999)}`,
          difficultyScore: difficulty,
          notes: `Client #${i+1} de ${partnerName}. Difficulté ${difficulty}/5.`,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      totalEndCustomers++;
    }
  }
  console.log(`   ✅ ${totalEndCustomers} end-customers created across all partner agencies`);
}

async function createSubcontractors() {
  console.log("\n🚚 Creating Subcontractors...");
  
  // ============================================================================
  // SUBCONTRACTOR CONFIGURATIONS
  // 4 sous-traitants réalistes avec différentes spécialisations:
  // 1. Spécialiste Orly - Berline & VAN (zones aéroport sud)
  // 2. Spécialiste Paris Centre - Berline & Luxe (centre ville)
  // 3. Spécialiste Autocars - AUTOCAR & MINIBUS (groupes)
  // 4. Couverture nationale - Toutes zones, toutes catégories
  // ============================================================================
  
  const subcontractors = [
    // ============================================================================
    // 1. VTC ORLY PREMIUM - Spécialiste aéroport Orly
    // Zones: ORLY, PARIS_20 (petite couronne sud)
    // Catégories: BERLINE, VAN_PREMIUM
    // Tarifs compétitifs pour l'aéroport
    // ============================================================================
    {
      companyName: "VTC Orly Premium",
      siret: "89012345600012",
      vatNumber: "FR89012345678",
      contactName: "Sophie Dubois",
      email: "contact@vtcorlypremium.fr",
      phone: "+33 1 69 38 45 67",
      address: "12 Avenue de la République, 94310 Orly",
      allZones: false,
      operatingZones: ["ORLY", "PARIS_20"],
      vehicleCategories: ["BERLINE", "VAN_PREMIUM"],
      ratePerKm: 2.20,
      ratePerHour: 42.00,
      minimumFare: 65.00,
      notes: "Spécialiste des transferts aéroport Orly. Flotte récente, chauffeurs bilingues. Disponible 24/7. VÉHICULES SPÉCIFIQUES: Mercedes E-Class, V-Class, Peugeot 5008, BMW Série 5.",
    },
    
    // ============================================================================
    // 2. PARIS LUXE TRANSPORT - Spécialiste centre Paris
    // Zones: PARIS_0, PARIS_10, LA_DEFENSE
    // Catégories: BERLINE, LUXE
    // Tarifs premium pour clientèle affaires
    // ============================================================================
    {
      companyName: "Paris Luxe Transport",
      siret: "78901234500023",
      vatNumber: "FR78901234567",
      contactName: "Laurent Mercier",
      email: "contact@parisluxetransport.fr",
      phone: "+33 1 42 56 78 90",
      address: "45 Avenue des Champs-Élysées, 75008 Paris",
      allZones: false,
      operatingZones: ["PARIS_0", "PARIS_10", "LA_DEFENSE"],
      vehicleCategories: ["BERLINE", "LUXE"],
      ratePerKm: 2.80,
      ratePerHour: 55.00,
      minimumFare: 85.00,
      notes: "Service premium pour clientèle d'affaires. Véhicules haut de gamme (Mercedes Classe S, BMW Série 7, Audi A8). Chauffeurs expérimentés. VÉHICULES SPÉCIFIQUES: Mercedes S-Class, BMW 7-Series, Audi A8, Porsche Panamera.",
    },
    
    // ============================================================================
    // 3. GROUPE TRANSPORT IDF - Spécialiste groupes et autocars
    // Zones: CDG, ORLY, PARIS_0, PARIS_20, PARIS_30
    // Catégories: AUTOCAR, MINIBUS (2 autocars disponibles)
    // Tarifs groupes compétitifs
    // ============================================================================
    {
      companyName: "Groupe Transport IDF",
      siret: "67890123400034",
      vatNumber: "FR67890123456",
      contactName: "Michel Rousseau",
      email: "reservation@groupetransportidf.fr",
      phone: "+33 1 48 92 34 56",
      address: "78 Boulevard Périphérique, 93200 Saint-Denis",
      allZones: false,
      operatingZones: ["CDG", "ORLY", "PARIS_0", "PARIS_20", "PARIS_30"],
      vehicleCategories: ["AUTOCAR", "MINIBUS"],
      ratePerKm: 3.50,
      ratePerHour: 85.00,
      minimumFare: 250.00,
      notes: "Spécialiste transport de groupes. 2 autocars 55 places et 4 minibus 16 places. Idéal pour événements, séminaires, transferts aéroport groupes. VÉHICULES SPÉCIFIQUES: Iveco Daily, Renault Master, Mercedes Sprinter, Peugeot Boxer.",
    },
    
    // ============================================================================
    // 4. FRANCE VTC SERVICES - Couverture nationale complète
    // Zones: TOUTES (allZones = true)
    // Catégories: BERLINE, VAN_PREMIUM, MINIBUS, LUXE
    // Réseau national, tarifs standards
    // ============================================================================
    {
      companyName: "France VTC Services",
      siret: "56789012300045",
      vatNumber: "FR56789012345",
      contactName: "Isabelle Lefebvre",
      email: "contact@francevtcservices.fr",
      phone: "+33 1 55 67 89 01",
      address: "156 Rue de Rivoli, 75001 Paris",
      allZones: true,
      operatingZones: [], // Toutes zones
      vehicleCategories: ["BERLINE", "VAN_PREMIUM", "MINIBUS", "LUXE"],
      ratePerKm: 2.50,
      ratePerHour: 48.00,
      minimumFare: 75.00,
      notes: "Réseau national avec partenaires dans toute la France. Couverture complète pour tous types de prestations. Service 24/7, facturation centralisée. VÉHICULES SPÉCIFIQUES: Mercedes E220d (AB-123-CD) pour services berline premium.",
    },
    
    // ============================================================================
    // 5. IDF BUS SERVICES - Spécialiste bus et autocars Paris-Ile-de-France
    // Zones: TOUTES Paris-Ile-de-France (toutes les zones PARIS_*)
    // Catégories: MINIBUS, AUTOCAR (spécialiste grands bus)
    // Tarifs groupes adaptés pour les bus
    // ============================================================================
    {
      companyName: "IDF Bus Services",
      siret: "45678901200056",
      vatNumber: "FR45678901234",
      contactName: "Philippe Bernard",
      email: "reservation@idfbusservices.fr",
      phone: "+33 1 44 23 45 67",
      address: "25 Rue de la Convention, 75015 Paris",
      allZones: false,
      operatingZones: ["PARIS_0", "PARIS_10", "PARIS_20", "PARIS_30", "PARIS_40", "PARIS_60", "PARIS_100"],
      vehicleCategories: ["MINIBUS", "AUTOCAR"],
      ratePerKm: 4.00,
      ratePerHour: 95.00,
      minimumFare: 80.00,
      notes: "Spécialiste transport de groupes en bus et autocars. Couverture complète Paris-Ile-de-France. Flotte de 8 autocars 35-55 places et 12 minibus 16-35 places. Idéal pour écoles, entreprises, événements sportifs. VÉHICULES SPÉCIFIQUES: Mercedes Tourismo 50pl (BC-789-DE), Setra S 516 HDH 70pl (FG-345-HI), Iveco Evadys H 50pl (JK-678-LM).",
    },
  ];
  
  for (const sub of subcontractors) {
    // Créer le profil sous-traitant
    const subcontractor = await prisma.subcontractorProfile.create({
      data: {
        id: randomUUID(),
        organizationId: ORGANIZATION_ID,
        companyName: sub.companyName,
        siret: sub.siret,
        vatNumber: sub.vatNumber,
        contactName: sub.contactName,
        email: sub.email,
        phone: sub.phone,
        address: sub.address,
        allZones: sub.allZones,
        ratePerKm: sub.ratePerKm,
        ratePerHour: sub.ratePerHour,
        minimumFare: sub.minimumFare,
        notes: sub.notes,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    
    // Ajouter les zones opérationnelles (si pas allZones)
    if (!sub.allZones && sub.operatingZones.length > 0) {
      for (const zoneCode of sub.operatingZones) {
        const zoneId = PRICING_ZONE_IDS[zoneCode];
        if (zoneId) {
          await prisma.subcontractorZone.create({
            data: {
              id: randomUUID(),
              subcontractorProfileId: subcontractor.id,
              pricingZoneId: zoneId,
            },
          });
        }
      }
    }
    
    // Ajouter les catégories de véhicules
    for (const categoryCode of sub.vehicleCategories) {
      const categoryId = VEHICLE_CATEGORY_IDS[categoryCode];
      if (categoryId) {
        await prisma.subcontractorVehicleCategory.create({
          data: {
            id: randomUUID(),
            subcontractorProfileId: subcontractor.id,
            vehicleCategoryId: categoryId,
          },
        });
      }
    }
    
    console.log(`   ✅ ${sub.companyName} (${sub.vehicleCategories.join(", ")})`);
  }
  
  console.log(`   ✅ ${subcontractors.length} subcontractors created`);
}

async function createPartnerContracts() {
  console.log("\n🤝 Creating Partner Contracts with Custom Pricing...");
  
  // ============================================================================
  // PARTNER CONTRACT CONFIGURATIONS
  // Contrats réalistes avec tarifs négociés selon le volume et le type de client
  // - Hôtels de luxe: -8 à -12% (volume régulier, clientèle premium)
  // - Agences DMC: -12 à -18% (gros volumes, groupes)
  // - Corporate: -5 à -8% (volume modéré, paiement rapide)
  // ============================================================================
  
  const partnerConfigs = [
    // ============================================================================
    // AGENCE 1: SIÈGE SOCIAL - Tarifs standards
    // ============================================================================
    {
      name: "VTC Premium - Siège Social",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 0.0, // Agence interne
      zoneRoutes: [
        // Routes principales - tarifs standards PDF 2026
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 120.0 },
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 150.0 },
        { routeKey: "CDG_PARIS_0_MINIBUS", overridePrice: 320.0 },
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 120.0 },
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 150.0 },
        { routeKey: "ORLY_PARIS_0_MINIBUS", overridePrice: 320.0 },
        { routeKey: "PARIS_0_VERSAILLES_BERLINE", overridePrice: 110.0 },
        { routeKey: "PARIS_0_VERSAILLES_VAN_PREMIUM", overridePrice: 130.0 },
        { routeKey: "PARIS_0_BUSSY_10_BERLINE", overridePrice: 120.0 },
        { routeKey: "PARIS_0_BUSSY_10_VAN_PREMIUM", overridePrice: 150.0 },
      ],
      excursions: [
        { name: "Versailles Journée Complète Berline", overridePrice: 435.0 },  // Catalog: 480€, -9%
        { name: "Versailles Journée Complète Luxe", overridePrice: 800.0 },     // Catalog: 890€, -10%
        { name: "Giverny Journée Berline", overridePrice: 470.0 },              // Catalog: 520€, -10%
        { name: "Champagne Journée Berline", overridePrice: 650.0 },            // Catalog: 720€, -10%
        { name: "Deauville Journée Luxe", overridePrice: 1305.0 },              // Catalog: 1450€, -10%
        { name: "Paris by Night Luxe", overridePrice: 335.0 },                  // Catalog: 370€, -9%
      ],
      dispos: [
        { name: "MAD Paris 4H Berline", overridePrice: 189.0 },    // Catalog: 210€, -10%
        { name: "MAD Paris 8H Berline", overridePrice: 342.0 },    // Catalog: 380€, -10%
        { name: "Dispo 4h Luxe", overridePrice: 360.0 },       // Catalog: 400€, -10%
        { name: "Dispo 8h Luxe", overridePrice: 648.0 },       // Catalog: 720€, -10%
      ],
    },
    {
      name: "VTC Premium - Opérations CDG",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 10.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 71.0 },       // Catalog: 79€, -10%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 89.0 },   // Catalog: 99€, -10%
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 134.0 },         // Catalog: 149€, -10%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 50.0 },      // Catalog: 55€, -9%
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 65.0 },  // Catalog: 72€, -10%
        { routeKey: "ORLY_PARIS_0_LUXE", overridePrice: 95.0 },         // Catalog: 105€, -10%
        { routeKey: "LBG_PARIS_0_LUXE", overridePrice: 134.0 },         // Catalog: 149€, -10%
        { routeKey: "PARIS_0_VERSAILLES_LUXE", overridePrice: 116.0 },  // Catalog: 129€, -10%
        { routeKey: "PARIS_0_CHANTILLY_BERLINE", overridePrice: 89.0 }, // Catalog: 99€, -10%
      ],
      excursions: [
        { name: "Versailles Journée Complète Berline", overridePrice: 432.0 },  // Catalog: 480€, -10%
        { name: "Versailles Journée Complète Luxe", overridePrice: 801.0 },     // Catalog: 890€, -10%
        { name: "Champagne Journée Berline", overridePrice: 648.0 },            // Catalog: 720€, -10%
        { name: "Fontainebleau + Vaux Journée Berline", overridePrice: 522.0 }, // Catalog: 580€, -10%
      ],
      dispos: [
        { name: "MAD Paris 4H Berline", overridePrice: 189.0 },    // Catalog: 210€, -10%
        { name: "MAD Paris 8H Berline", overridePrice: 342.0 },    // Catalog: 380€, -10%
        { name: "Dispo 4h Luxe", overridePrice: 360.0 },       // Catalog: 400€, -10%
        { name: "Dispo 8h Luxe", overridePrice: 648.0 },       // Catalog: 720€, -10%
      ],
    },
    {
      name: "VTC Premium - Opérations Orly",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 10.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 71.0 },       // Catalog: 79€, -10%
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 134.0 },         // Catalog: 149€, -10%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 50.0 },      // Catalog: 55€, -9%
        { routeKey: "ORLY_PARIS_0_LUXE", overridePrice: 95.0 },         // Catalog: 105€, -10%
        { routeKey: "LBG_PARIS_0_LUXE", overridePrice: 134.0 },         // Catalog: 149€, -10%
        { routeKey: "PARIS_0_VERSAILLES_LUXE", overridePrice: 116.0 },  // Catalog: 129€, -10%
      ],
      excursions: [
        { name: "Versailles Journée Complète Luxe", overridePrice: 801.0 },     // Catalog: 890€, -10%
        { name: "Champagne Journée Berline", overridePrice: 648.0 },            // Catalog: 720€, -10%
        { name: "Deauville Journée Luxe", overridePrice: 1305.0 },              // Catalog: 1450€, -10%
      ],
      dispos: [
        { name: "Dispo 4h Luxe", overridePrice: 360.0 },       // Catalog: 400€, -10%
        { name: "Dispo 8h Luxe", overridePrice: 648.0 },       // Catalog: 720€, -10%
        { name: "Dispo 6h Luxe", overridePrice: 513.0 },       // Catalog: 570€, -10%
      ],
    },
    {
      name: "VTC Premium - Tourisme Paris",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 10.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 71.0 },       // Catalog: 79€, -10%
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 134.0 },         // Catalog: 149€, -10%
        { routeKey: "ORLY_PARIS_0_LUXE", overridePrice: 95.0 },         // Catalog: 105€, -10%
        { routeKey: "LBG_PARIS_0_LUXE", overridePrice: 134.0 },         // Catalog: 149€, -10%
      ],
      excursions: [
        { name: "Versailles Journée Complète Luxe", overridePrice: 801.0 },     // Catalog: 890€, -10%
        { name: "Paris by Night Luxe", overridePrice: 333.0 },                  // Catalog: 370€, -10%
      ],
      dispos: [
        { name: "Dispo 4h Luxe", overridePrice: 360.0 },       // Catalog: 400€, -10%
        { name: "Dispo 8h Luxe", overridePrice: 648.0 },       // Catalog: 720€, -10%
      ],
    },
    
    // ============================================================================
    // AGENCES DMC (Destination Management Companies) - Meilleurs tarifs (-15% à -18%)
    // Gros volumes, groupes, paiement à 15 jours
    // ============================================================================
    {
      name: "VTC Premium - Événementiel",
      paymentTerms: "DAYS_15" as const,
      commissionPercent: 15.0,
      // Agence spécialisée groupes et excursions - tarifs très compétitifs
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 65.0 },       // Catalog: 79€, -18%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 82.0 },   // Catalog: 99€, -17%
        { routeKey: "CDG_PARIS_0_MINIBUS", overridePrice: 144.0 },      // Catalog: 175€, -18%
        { routeKey: "CDG_BUSSY_10_BERLINE", overridePrice: 57.0 },      // Catalog: 69€, -17%
        { routeKey: "CDG_BUSSY_10_VAN_PREMIUM", overridePrice: 73.0 },  // Catalog: 89€, -18%
        { routeKey: "CDG_BUSSY_10_MINIBUS", overridePrice: 122.0 },     // Catalog: 149€, -18%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 45.0 },      // Catalog: 55€, -18%
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 59.0 },  // Catalog: 72€, -18%
        { routeKey: "ORLY_BUSSY_10_BERLINE", overridePrice: 81.0 },     // Catalog: 99€, -18%
        { routeKey: "ORLY_BUSSY_10_VAN_PREMIUM", overridePrice: 106.0 },// Catalog: 129€, -18%
        { routeKey: "BUSSY_10_PARIS_0_BERLINE", overridePrice: 73.0 },  // Catalog: 89€, -18%
        { routeKey: "BUSSY_10_PARIS_0_VAN_PREMIUM", overridePrice: 94.0 },// Catalog: 115€, -18%
        { routeKey: "BUSSY_10_PARIS_0_MINIBUS", overridePrice: 160.0 }, // Catalog: 195€, -18%
        { routeKey: "PARIS_0_VERSAILLES_BERLINE", overridePrice: 57.0 },// Catalog: 69€, -17%
        { routeKey: "PARIS_0_VERSAILLES_VAN_PREMIUM", overridePrice: 73.0 }, // Catalog: 89€, -18%
      ],
      excursions: [
        { name: "Versailles Demi-Journée Berline", overridePrice: 262.0 },   // Catalog: 320€, -18%
        { name: "Versailles Demi-Journée Van", overridePrice: 344.0 },       // Catalog: 420€, -18%
        { name: "Versailles Journée Complète Berline", overridePrice: 394.0 }, // Catalog: 480€, -18%
        { name: "Versailles Journée Complète Van", overridePrice: 513.0 },   // Catalog: 625€, -18%
        { name: "Giverny Journée Berline", overridePrice: 426.0 },           // Catalog: 520€, -18%
        { name: "Giverny Journée Van", overridePrice: 558.0 },               // Catalog: 680€, -18%
        { name: "Champagne Journée Berline", overridePrice: 590.0 },         // Catalog: 720€, -18%
        { name: "Champagne Journée Van", overridePrice: 771.0 },             // Catalog: 940€, -18%
        { name: "Champagne Journée Minibus", overridePrice: 1050.0 },        // Catalog: 1280€, -18%
        { name: "Châteaux de la Loire Berline", overridePrice: 779.0 },      // Catalog: 950€, -18%
        { name: "Châteaux de la Loire Van", overridePrice: 1013.0 },         // Catalog: 1235€, -18%
        { name: "Châteaux de la Loire Minibus", overridePrice: 1378.0 },     // Catalog: 1680€, -18%
        { name: "Fontainebleau Demi-Journée Berline", overridePrice: 312.0 },// Catalog: 380€, -18%
        { name: "Shopping Outlets Berline", overridePrice: 320.0 },          // Catalog: 390€, -18%
        { name: "Shopping Outlets Van", overridePrice: 418.0 },              // Catalog: 510€, -18%
      ],
      dispos: [
        { name: "MAD Paris 4H Berline", overridePrice: 266.0 },   // Catalog: 280€, -5%
        { name: "MAD Paris 8H Berline", overridePrice: 494.0 },   // Catalog: 520€, -5%
        { name: "MAD Paris 4H Van", overridePrice: 304.0 },       // Catalog: 320€, -5%
        { name: "MAD Paris 8H Van", overridePrice: 589.0 },       // Catalog: 620€, -5%
      ],
    },
    
    // ============================================================================
    // COMPTE BUSINESS 1: LVMH - Tarifs préférentiels volume
    // ============================================================================
    {
      name: "LVMH Group Travel",
      paymentTerms: "DAYS_15" as const,
      commissionPercent: 8.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 73.0 },   // -8%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 95.0 }, // -8%
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 137.0 },     // -8%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 51.0 },    // -7%
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 66.0 }, // -8%
        { routeKey: "ORLY_PARIS_0_LUXE", overridePrice: 97.0 },      // -8%
        { routeKey: "CDG_LA_DEFENSE_BERLINE", overridePrice: 82.0 },  // -8%
        { routeKey: "PARIS_0_LA_DEFENSE_BERLINE", overridePrice: 45.0 }, // -8%
      ],
      excursions: [
        { name: "Versailles Journée Complète Luxe", overridePrice: 846.0 }, // -5%
        { name: "Champagne Journée Luxe", overridePrice: 1368.0 },       // -5%
      ],
      dispos: [
        { name: "MAD Paris 8H Berline", overridePrice: 494.0 },   // Catalog: 520€, -5%
        { name: "MAD Paris 10H Berline", overridePrice: 513.0 },  // Catalog: 540€, -5%
      ],
    },
    
    // ============================================================================
    // COMPTE BUSINESS 2: TOTAL ENERGIES - Tarifs standards corporate
    // ============================================================================
    {
      name: "TotalEnergies Corporate",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 10.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 75.0 },
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 52.0 },
      ],
      excursions: [],
      dispos: [],
    },
    {
      name: "Hôtel Ritz Paris",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 12.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 130.0 },
        { routeKey: "ORLY_PARIS_0_LUXE", overridePrice: 90.0 },
      ],
      excursions: [{ name: "Paris by Night Luxe", overridePrice: 320.0 }],
      dispos: [{ name: "Dispo 4h Luxe", overridePrice: 350.0 }],
    },
    {
      name: "PARISCityVISION",
      paymentTerms: "DAYS_15" as const,
      commissionPercent: 18.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_AUTOCAR", overridePrice: 280.0 },
        { routeKey: "ORLY_PARIS_0_AUTOCAR", overridePrice: 280.0 },
      ],
      excursions: [{ name: "Versailles Journée Complète Autocar", overridePrice: 650.0 }],
      dispos: [{ name: "MAD Paris 8H Autocar", overridePrice: 850.0 }],
    },
    {
      name: "L'Oréal Corporate",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 8.0,
      zoneRoutes: [{ routeKey: "CDG_LA_DEFENSE_BERLINE", overridePrice: 85.0 }],
      excursions: [],
      dispos: [],
    },
    {
      name: "BNP Paribas Events",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 10.0,
      zoneRoutes: [{ routeKey: "PARIS_0_LA_DEFENSE_BERLINE", overridePrice: 48.0 }],
      excursions: [],
      dispos: [],
    },
  ];

  let totalZoneRoutes = 0;
  let totalExcursions = 0;
  let totalDispos = 0;

  // Index configurations by partner name for quick lookup
  const configMap = new Map(partnerConfigs.map(c => [c.name, c]));

  // Find all contacts that should have a partner contract
  // We include both specifically configured partners and all agencies/businesses created
  const partnerContacts = Object.entries(CONTACT_IDS).filter(([name]) => {
    const config = configMap.get(name);
    if (config) return true;
    // Fallback: check if name suggests it's a partner we should seed for
    return name.includes("Hôtel") || name.includes("VTC Premium") || name.includes("LVMH") || name.includes("TotalEnergies") || 
           name.includes("L'Oréal") || name.includes("BNP") || name.includes("Four Seasons") || name.includes("Bristol") || 
           name.includes("Plaza Athénée") || name.includes("PARISCityVISION") || name.includes("France Tourisme") || name.includes("Euroscope");
  });

  console.log(`   🤝 Seeding contracts for ${partnerContacts.length} partners...`);

  for (const [name, contactId] of partnerContacts) {
    const config = configMap.get(name);
    
    // Create the partner contract with config or defaults
    const contract = await prisma.partnerContract.create({
      data: {
        id: randomUUID(),
        organizationId: ORGANIZATION_ID,
        contactId: contactId,
        paymentTerms: config?.paymentTerms || "DAYS_30",
        commissionPercent: config?.commissionPercent ?? 10.0,
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: `Contract for ${name} - seeded for 2026`,
      },
    });
    PARTNER_CONTRACT_IDS[name] = contract.id;

    // 1. Assign ALL Zone Routes
    const routeOverrides = new Map(config?.zoneRoutes?.map(r => [r.routeKey, r.overridePrice]) || []);
    for (const [routeKey, routeId] of Object.entries(ZONE_ROUTE_IDS)) {
      await prisma.partnerContractZoneRoute.create({
        data: {
          id: randomUUID(),
          partnerContractId: contract.id,
          zoneRouteId: routeId,
          overridePrice: routeOverrides.get(routeKey) || null, // null = use catalog price
        },
      });
      totalZoneRoutes++;
    }

    // 2. Assign ALL Excursion Packages
    const excursionOverrides = new Map(config?.excursions?.map(e => [e.name, e.overridePrice]) || []);
    for (const [excursionName, excursionId] of Object.entries(EXCURSION_PACKAGE_IDS)) {
      await prisma.partnerContractExcursionPackage.create({
        data: {
          id: randomUUID(),
          partnerContractId: contract.id,
          excursionPackageId: excursionId,
          overridePrice: excursionOverrides.get(excursionName) || null,
        },
      });
      totalExcursions++;
    }

    // 3. Assign ALL Dispo Packages
    const dispoOverrides = new Map(config?.dispos?.map(d => [d.name, d.overridePrice]) || []);
    for (const [dispoName, dispoId] of Object.entries(DISPO_PACKAGE_IDS)) {
      await prisma.partnerContractDispoPackage.create({
        data: {
          id: randomUUID(),
          partnerContractId: contract.id,
          dispoPackageId: dispoId,
          overridePrice: dispoOverrides.get(dispoName) || null,
        },
      });
      totalDispos++;
    }

    console.log(`   ✅ ${name}: Assigned all grids (${Object.keys(ZONE_ROUTE_IDS).length} routes, ${Object.keys(EXCURSION_PACKAGE_IDS).length} excursions, ${Object.keys(DISPO_PACKAGE_IDS).length} dispos)`);
  }

  console.log(`   📊 Total: ${partnerContacts.length} contracts, ${totalZoneRoutes} zone route links, ${totalExcursions} excursion links, ${totalDispos} dispo links`);
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
  console.log(`   • 27 Pricing Zones (Paris, gares, aéroports, destinations touristiques)`);
  console.log(`   • 100+ Zone Routes with fixed pricing`);
  console.log(`   • 26 Excursion Packages (demi-journée, journée, longue distance)`);
  console.log(`   • 18 Dispo Packages (3h à 10h, toutes catégories)`);
  console.log(`   • 2 Advanced Rates (night, weekend)`);
  console.log(`   • 4 Seasonal Multipliers`);
  console.log(`   • 6 Optional Fees`);
  console.log(`   • 4 Promotions`);
  console.log(`   • 8 Drivers with multi-license support`);
  console.log(`   • 15 Vehicles (5 Sixième Étoile + 10 supplémentaires)`);
  console.log(`   • 15 Contacts (particuliers, hôtels, agences, corporate)`);
  const ecCount = 155; // Approximatif basé sur la boucle
  console.log(`   • ${ecCount}+ EndCustomers within partner agencies (Story 24)`);
  const partnerCount = Object.keys(PARTNER_CONTRACT_IDS).length;
  console.log(`   • ${partnerCount} Partner Contracts with custom pricing and CRM:`);
  console.log(`     📍 AGENCES & HÔTELS (CRM peuplé avec 3 à 20 clients chacun)`);
  console.log(`     📍 CORPORATE (LVMH, TotalEnergies, L'Oréal, BNP)`);
  console.log(`     📍 DMC (PARISCityVISION, France Tourisme, etc.)`);
  console.log(`   • No default quotes or invoices seeded`);
  console.log(`   • API keys configured (Google Maps, CollectAPI)`);
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
