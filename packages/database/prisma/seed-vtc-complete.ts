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
  // Story 15.2: Added averageConsumptionL100km for accurate fuel cost calculation
  // Consumption values based on typical vehicle types:
  // - Berline: 5.5 L/100km (efficient sedan)
  // - Van Premium: 8.5 L/100km (larger vehicle)
  // - Minibus: 12.0 L/100km (9-16 seats)
  // - Autocar: 18.0 L/100km (large coach)
  // - Luxe: 9.0 L/100km (luxury sedan, higher consumption)
  const cats = [
    { name: "Berline", code: "BERLINE", regulatoryCategory: "LIGHT" as const, maxPassengers: 4, priceMultiplier: 1.0, defaultRatePerKm: 1.80, defaultRatePerHour: 45.0, averageConsumptionL100km: 5.5 },
    { name: "Van Premium", code: "VAN_PREMIUM", regulatoryCategory: "LIGHT" as const, maxPassengers: 7, priceMultiplier: 1.3, defaultRatePerKm: 2.20, defaultRatePerHour: 55.0, averageConsumptionL100km: 8.5 },
    { name: "Minibus", code: "MINIBUS", regulatoryCategory: "HEAVY" as const, maxPassengers: 16, priceMultiplier: 1.8, defaultRatePerKm: 3.00, defaultRatePerHour: 75.0, averageConsumptionL100km: 12.0 },
    { name: "Autocar", code: "AUTOCAR", regulatoryCategory: "HEAVY" as const, maxPassengers: 50, priceMultiplier: 2.5, defaultRatePerKm: 4.50, defaultRatePerHour: 120.0, averageConsumptionL100km: 18.0 },
    { name: "Luxe", code: "LUXE", regulatoryCategory: "LIGHT" as const, maxPassengers: 3, priceMultiplier: 2.0, defaultRatePerKm: 3.50, defaultRatePerHour: 90.0, averageConsumptionL100km: 9.0 },
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
    // AÉROPORT CDG - TRANSFERTS (35km de Paris, ~45min)
    // Prix marché: Berline 70-90€, Van 90-120€
    // ============================================================================
    { from: "CDG", to: "PARIS_0", category: "BERLINE", price: 79.0 },
    { from: "CDG", to: "PARIS_0", category: "VAN_PREMIUM", price: 99.0 },
    { from: "CDG", to: "PARIS_0", category: "LUXE", price: 149.0 },
    { from: "CDG", to: "PARIS_0", category: "MINIBUS", price: 175.0 },
    { from: "CDG", to: "PARIS_10", category: "BERLINE", price: 75.0 },
    { from: "CDG", to: "PARIS_10", category: "VAN_PREMIUM", price: 95.0 },
    { from: "CDG", to: "PARIS_20", category: "BERLINE", price: 59.0 },
    { from: "CDG", to: "PARIS_20", category: "VAN_PREMIUM", price: 79.0 },
    { from: "CDG", to: "LA_DEFENSE", category: "BERLINE", price: 89.0 },
    { from: "CDG", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 115.0 },
    { from: "CDG", to: "LA_DEFENSE", category: "LUXE", price: 169.0 },
    { from: "CDG", to: "BUSSY_0", category: "BERLINE", price: 59.0 },
    { from: "CDG", to: "BUSSY_0", category: "VAN_PREMIUM", price: 79.0 },
    { from: "CDG", to: "BUSSY_10", category: "BERLINE", price: 69.0 },
    { from: "CDG", to: "BUSSY_10", category: "VAN_PREMIUM", price: 89.0 },
    { from: "CDG", to: "BUSSY_10", category: "MINIBUS", price: 149.0 },
    { from: "CDG", to: "VERSAILLES", category: "BERLINE", price: 139.0 },
    { from: "CDG", to: "VERSAILLES", category: "VAN_PREMIUM", price: 179.0 },
    { from: "CDG", to: "ORLY", category: "BERLINE", price: 115.0 },
    { from: "CDG", to: "ORLY", category: "VAN_PREMIUM", price: 149.0 },
    { from: "CDG", to: "CHANTILLY", category: "BERLINE", price: 89.0 },
    { from: "CDG", to: "CHANTILLY", category: "VAN_PREMIUM", price: 115.0 },
    { from: "CDG", to: "REIMS", category: "BERLINE", price: 249.0 },
    { from: "CDG", to: "REIMS", category: "VAN_PREMIUM", price: 319.0 },
    { from: "CDG", to: "ROUEN", category: "BERLINE", price: 349.0 },
    { from: "CDG", to: "ROUEN", category: "VAN_PREMIUM", price: 449.0 },
    
    // ============================================================================
    // AÉROPORT ORLY - TRANSFERTS (18km de Paris, ~30min)
    // Prix marché: Berline 45-60€, Van 60-80€
    // ============================================================================
    { from: "ORLY", to: "PARIS_0", category: "BERLINE", price: 55.0 },
    { from: "ORLY", to: "PARIS_0", category: "VAN_PREMIUM", price: 72.0 },
    { from: "ORLY", to: "PARIS_0", category: "LUXE", price: 105.0 },
    { from: "ORLY", to: "PARIS_0", category: "MINIBUS", price: 125.0 },
    { from: "ORLY", to: "PARIS_10", category: "BERLINE", price: 49.0 },
    { from: "ORLY", to: "PARIS_10", category: "VAN_PREMIUM", price: 65.0 },
    { from: "ORLY", to: "PARIS_20", category: "BERLINE", price: 45.0 },
    { from: "ORLY", to: "PARIS_20", category: "VAN_PREMIUM", price: 59.0 },
    { from: "ORLY", to: "LA_DEFENSE", category: "BERLINE", price: 75.0 },
    { from: "ORLY", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 98.0 },
    { from: "ORLY", to: "VERSAILLES", category: "BERLINE", price: 79.0 },
    { from: "ORLY", to: "VERSAILLES", category: "VAN_PREMIUM", price: 99.0 },
    { from: "ORLY", to: "BUSSY_0", category: "BERLINE", price: 89.0 },
    { from: "ORLY", to: "BUSSY_0", category: "VAN_PREMIUM", price: 115.0 },
    { from: "ORLY", to: "BUSSY_10", category: "BERLINE", price: 99.0 },
    { from: "ORLY", to: "BUSSY_10", category: "VAN_PREMIUM", price: 129.0 },
    { from: "ORLY", to: "BUSSY_10", category: "MINIBUS", price: 219.0 },
    { from: "ORLY", to: "FONTAINEBLEAU", category: "BERLINE", price: 99.0 },
    { from: "ORLY", to: "FONTAINEBLEAU", category: "VAN_PREMIUM", price: 129.0 },
    
    // ============================================================================
    // LE BOURGET (Aviation d'affaires) - PREMIUM UNIQUEMENT
    // Clientèle très haut de gamme, tarifs premium
    // ============================================================================
    { from: "LBG", to: "PARIS_0", category: "BERLINE", price: 79.0 },
    { from: "LBG", to: "PARIS_0", category: "LUXE", price: 149.0 },
    { from: "LBG", to: "LA_DEFENSE", category: "BERLINE", price: 89.0 },
    { from: "LBG", to: "LA_DEFENSE", category: "LUXE", price: 169.0 },
    { from: "LBG", to: "VERSAILLES", category: "LUXE", price: 199.0 },
    { from: "LBG", to: "CHANTILLY", category: "LUXE", price: 179.0 },
    { from: "LBG", to: "DEAUVILLE", category: "LUXE", price: 549.0 },
    
    // ============================================================================
    // BUSSY-SAINT-MARTIN (Garage) - TARIFS AVANTAGEUX
    // Pas de trajet à vide = prix réduits
    // ============================================================================
    { from: "BUSSY_0", to: "PARIS_0", category: "BERLINE", price: 79.0 },
    { from: "BUSSY_0", to: "PARIS_0", category: "VAN_PREMIUM", price: 99.0 },
    { from: "BUSSY_0", to: "PARIS_10", category: "BERLINE", price: 72.0 },
    { from: "BUSSY_0", to: "PARIS_10", category: "VAN_PREMIUM", price: 92.0 },
    { from: "BUSSY_0", to: "CDG", category: "BERLINE", price: 59.0 },
    { from: "BUSSY_0", to: "CDG", category: "VAN_PREMIUM", price: 79.0 },
    { from: "BUSSY_0", to: "ORLY", category: "BERLINE", price: 89.0 },
    { from: "BUSSY_0", to: "ORLY", category: "VAN_PREMIUM", price: 115.0 },
    { from: "BUSSY_0", to: "LA_DEFENSE", category: "BERLINE", price: 89.0 },
    { from: "BUSSY_0", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 115.0 },
    { from: "BUSSY_0", to: "VERSAILLES", category: "BERLINE", price: 119.0 },
    { from: "BUSSY_0", to: "VERSAILLES", category: "VAN_PREMIUM", price: 155.0 },
    { from: "BUSSY_0", to: "FONTAINEBLEAU", category: "BERLINE", price: 79.0 },
    { from: "BUSSY_0", to: "FONTAINEBLEAU", category: "VAN_PREMIUM", price: 99.0 },
    
    // Bussy 10km (Disney, Val d'Europe) - Zone touristique forte demande
    { from: "BUSSY_10", to: "PARIS_0", category: "BERLINE", price: 89.0 },
    { from: "BUSSY_10", to: "PARIS_0", category: "VAN_PREMIUM", price: 115.0 },
    { from: "BUSSY_10", to: "PARIS_0", category: "MINIBUS", price: 195.0 },
    { from: "BUSSY_10", to: "VERSAILLES", category: "BERLINE", price: 139.0 },
    { from: "BUSSY_10", to: "VERSAILLES", category: "VAN_PREMIUM", price: 179.0 },
    { from: "BUSSY_10", to: "FONTAINEBLEAU", category: "BERLINE", price: 99.0 },
    { from: "BUSSY_10", to: "FONTAINEBLEAU", category: "VAN_PREMIUM", price: 129.0 },
    
    // Bussy 15km (Meaux, Torcy)
    { from: "BUSSY_15", to: "PARIS_0", category: "BERLINE", price: 85.0 },
    { from: "BUSSY_15", to: "PARIS_0", category: "VAN_PREMIUM", price: 109.0 },
    { from: "BUSSY_15", to: "CDG", category: "BERLINE", price: 55.0 },
    { from: "BUSSY_15", to: "CDG", category: "VAN_PREMIUM", price: 72.0 },
    
    // Bussy 25km (Melun, Coulommiers)
    { from: "BUSSY_25", to: "PARIS_0", category: "BERLINE", price: 95.0 },
    { from: "BUSSY_25", to: "PARIS_0", category: "VAN_PREMIUM", price: 125.0 },
    { from: "BUSSY_25", to: "ORLY", category: "BERLINE", price: 85.0 },
    { from: "BUSSY_25", to: "ORLY", category: "VAN_PREMIUM", price: 109.0 },
    
    // ============================================================================
    // PARIS CENTRE - DESTINATIONS TOURISTIQUES
    // ============================================================================
    { from: "PARIS_0", to: "VERSAILLES", category: "BERLINE", price: 69.0 },
    { from: "PARIS_0", to: "VERSAILLES", category: "VAN_PREMIUM", price: 89.0 },
    { from: "PARIS_0", to: "VERSAILLES", category: "LUXE", price: 129.0 },
    { from: "PARIS_0", to: "FONTAINEBLEAU", category: "BERLINE", price: 119.0 },
    { from: "PARIS_0", to: "FONTAINEBLEAU", category: "VAN_PREMIUM", price: 155.0 },
    { from: "PARIS_0", to: "CHANTILLY", category: "BERLINE", price: 99.0 },
    { from: "PARIS_0", to: "CHANTILLY", category: "VAN_PREMIUM", price: 129.0 },
    { from: "PARIS_0", to: "GIVERNY", category: "BERLINE", price: 149.0 },
    { from: "PARIS_0", to: "GIVERNY", category: "VAN_PREMIUM", price: 195.0 },
    { from: "PARIS_0", to: "REIMS", category: "BERLINE", price: 299.0 },
    { from: "PARIS_0", to: "REIMS", category: "VAN_PREMIUM", price: 389.0 },
    { from: "PARIS_0", to: "DEAUVILLE", category: "BERLINE", price: 379.0 },
    { from: "PARIS_0", to: "DEAUVILLE", category: "VAN_PREMIUM", price: 489.0 },
    { from: "PARIS_0", to: "ROUEN", category: "BERLINE", price: 299.0 },
    { from: "PARIS_0", to: "ROUEN", category: "VAN_PREMIUM", price: 389.0 },
    { from: "PARIS_0", to: "LA_DEFENSE", category: "BERLINE", price: 49.0 },
    { from: "PARIS_0", to: "LA_DEFENSE", category: "VAN_PREMIUM", price: 65.0 },
    
    // ============================================================================
    // LA DÉFENSE - ZONE AFFAIRES
    // ============================================================================
    { from: "LA_DEFENSE", to: "VERSAILLES", category: "BERLINE", price: 59.0 },
    { from: "LA_DEFENSE", to: "VERSAILLES", category: "VAN_PREMIUM", price: 79.0 },
    { from: "LA_DEFENSE", to: "DEAUVILLE", category: "BERLINE", price: 369.0 },
    { from: "LA_DEFENSE", to: "DEAUVILLE", category: "VAN_PREMIUM", price: 479.0 },
    { from: "LA_DEFENSE", to: "CDG", category: "BERLINE", price: 89.0 },
    { from: "LA_DEFENSE", to: "CDG", category: "VAN_PREMIUM", price: 115.0 },
    { from: "LA_DEFENSE", to: "ORLY", category: "BERLINE", price: 75.0 },
    { from: "LA_DEFENSE", to: "ORLY", category: "VAN_PREMIUM", price: 98.0 },
    
    // ============================================================================
    // ANNEAUX PARIS - CONNEXIONS INTER-ZONES
    // ============================================================================
    { from: "PARIS_20", to: "VERSAILLES", category: "BERLINE", price: 65.0 },
    { from: "PARIS_20", to: "VERSAILLES", category: "VAN_PREMIUM", price: 85.0 },
    { from: "PARIS_20", to: "BUSSY_10", category: "BERLINE", price: 79.0 },
    { from: "PARIS_20", to: "BUSSY_10", category: "VAN_PREMIUM", price: 99.0 },
    { from: "PARIS_30", to: "FONTAINEBLEAU", category: "BERLINE", price: 89.0 },
    { from: "PARIS_30", to: "FONTAINEBLEAU", category: "VAN_PREMIUM", price: 115.0 },
    { from: "PARIS_30", to: "CHANTILLY", category: "BERLINE", price: 69.0 },
    { from: "PARIS_30", to: "CHANTILLY", category: "VAN_PREMIUM", price: 89.0 },
    { from: "PARIS_40", to: "GIVERNY", category: "BERLINE", price: 99.0 },
    { from: "PARIS_40", to: "GIVERNY", category: "VAN_PREMIUM", price: 129.0 },
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
    
    // ============================================================================
    // EXCURSIONS SPÉCIALES (Non-temporal vectors)
    // ============================================================================
    // Paris by Night: 40km, 3h
    { name: "Paris by Night Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 3.0, includedDistanceKm: 40.0, price: 195.0 },
    { name: "Paris by Night Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 3.0, includedDistanceKm: 40.0, price: 370.0 },
    
    // Shopping Outlets (La Vallée Village): 50km A/R, 6h
    { name: "Shopping Outlets Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 6.0, includedDistanceKm: 100.0, price: 390.0 },
    { name: "Shopping Outlets Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 6.0, includedDistanceKm: 100.0, price: 510.0 },
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
  // FORFAITS MISE À DISPOSITION - GRILLE TARIFAIRE PROFESSIONNELLE
  // ============================================================================
  // 
  // FORMULE DE CALCUL:
  // Prix de base = Durée × Taux horaire (avec dégressivité)
  // Distance incluse = ~15-20km/h en moyenne
  //
  // DÉGRESSIVITÉ HORAIRE:
  // - 3h:  100% du taux horaire
  // - 4h:  95% du taux horaire
  // - 6h:  90% du taux horaire
  // - 8h:  85% du taux horaire
  // - 10h: 80% du taux horaire
  //
  // TAUX DE DÉPASSEMENT:
  // - Km supplémentaire: ~120% du taux km standard
  // - Heure supplémentaire: ~110% du taux horaire
  //
  const pkgs = [
    // ============================================================================
    // BERLINE - Taux de base: 55€/h, 1.80€/km
    // ============================================================================
    { name: "Dispo 3h Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 3.0, includedDistanceKm: 50.0, basePrice: 165.0, overageRatePerKm: 2.20, overageRatePerHour: 60.0 },
    { name: "Dispo 4h Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 4.0, includedDistanceKm: 70.0, basePrice: 210.0, overageRatePerKm: 2.20, overageRatePerHour: 58.0 },
    { name: "Dispo 6h Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 6.0, includedDistanceKm: 110.0, basePrice: 300.0, overageRatePerKm: 2.10, overageRatePerHour: 55.0 },
    { name: "Dispo 8h Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 380.0, overageRatePerKm: 2.00, overageRatePerHour: 52.0 },
    { name: "Dispo 10h Berline", vehicleCategoryId: VEHICLE_CATEGORY_IDS["BERLINE"], includedDurationHours: 10.0, includedDistanceKm: 200.0, basePrice: 450.0, overageRatePerKm: 1.90, overageRatePerHour: 50.0 },
    
    // ============================================================================
    // VAN PREMIUM - Taux de base: 72€/h (+30%), 2.35€/km
    // ============================================================================
    { name: "Dispo 3h Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 3.0, includedDistanceKm: 50.0, basePrice: 215.0, overageRatePerKm: 2.85, overageRatePerHour: 78.0 },
    { name: "Dispo 4h Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 4.0, includedDistanceKm: 70.0, basePrice: 275.0, overageRatePerKm: 2.85, overageRatePerHour: 75.0 },
    { name: "Dispo 6h Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 6.0, includedDistanceKm: 110.0, basePrice: 390.0, overageRatePerKm: 2.75, overageRatePerHour: 72.0 },
    { name: "Dispo 8h Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 495.0, overageRatePerKm: 2.60, overageRatePerHour: 68.0 },
    { name: "Dispo 10h Van", vehicleCategoryId: VEHICLE_CATEGORY_IDS["VAN_PREMIUM"], includedDurationHours: 10.0, includedDistanceKm: 200.0, basePrice: 585.0, overageRatePerKm: 2.50, overageRatePerHour: 65.0 },
    
    // ============================================================================
    // LUXE - Taux de base: 105€/h (+90%), 3.40€/km
    // ============================================================================
    { name: "Dispo 3h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 3.0, includedDistanceKm: 40.0, basePrice: 315.0, overageRatePerKm: 4.10, overageRatePerHour: 115.0 },
    { name: "Dispo 4h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 4.0, includedDistanceKm: 55.0, basePrice: 400.0, overageRatePerKm: 4.10, overageRatePerHour: 110.0 },
    { name: "Dispo 6h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 6.0, includedDistanceKm: 85.0, basePrice: 570.0, overageRatePerKm: 3.95, overageRatePerHour: 105.0 },
    { name: "Dispo 8h Luxe", vehicleCategoryId: VEHICLE_CATEGORY_IDS["LUXE"], includedDurationHours: 8.0, includedDistanceKm: 120.0, basePrice: 720.0, overageRatePerKm: 3.80, overageRatePerHour: 100.0 },
    
    // ============================================================================
    // MINIBUS - Taux de base: 120€/h (+120%), 4.00€/km
    // ============================================================================
    { name: "Dispo 4h Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 4.0, includedDistanceKm: 60.0, basePrice: 460.0, overageRatePerKm: 4.80, overageRatePerHour: 130.0 },
    { name: "Dispo 6h Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 6.0, includedDistanceKm: 100.0, basePrice: 650.0, overageRatePerKm: 4.60, overageRatePerHour: 125.0 },
    { name: "Dispo 8h Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 8.0, includedDistanceKm: 150.0, basePrice: 820.0, overageRatePerKm: 4.40, overageRatePerHour: 120.0 },
    { name: "Dispo 10h Minibus", vehicleCategoryId: VEHICLE_CATEGORY_IDS["MINIBUS"], includedDurationHours: 10.0, includedDistanceKm: 200.0, basePrice: 980.0, overageRatePerKm: 4.20, overageRatePerHour: 115.0 },
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
    // === CLIENTS PARTICULIERS ===
    { type: "INDIVIDUAL" as const, displayName: "Marie Dupont", firstName: "Marie", lastName: "Dupont", email: "marie.dupont@gmail.com", phone: "+33 6 11 22 33 44", isPartner: false, defaultClientType: "PRIVATE" as const },
    { type: "INDIVIDUAL" as const, displayName: "Jean Martin", firstName: "Jean", lastName: "Martin", email: "jean.martin@outlook.fr", phone: "+33 6 22 33 44 55", isPartner: false, defaultClientType: "PRIVATE" as const },
    { type: "INDIVIDUAL" as const, displayName: "Sophie Bernard", firstName: "Sophie", lastName: "Bernard", email: "sophie.bernard@free.fr", phone: "+33 6 33 44 55 66", isPartner: false, defaultClientType: "PRIVATE" as const },
    { type: "INDIVIDUAL" as const, displayName: "Pierre Durand", firstName: "Pierre", lastName: "Durand", email: "pierre.durand@yahoo.fr", phone: "+33 6 44 55 66 77", isPartner: false, defaultClientType: "PRIVATE" as const },
    { type: "INDIVIDUAL" as const, displayName: "Claire Moreau", firstName: "Claire", lastName: "Moreau", email: "claire.moreau@orange.fr", phone: "+33 6 55 66 77 88", isPartner: false, defaultClientType: "PRIVATE" as const },
    
    // === HÔTELS DE LUXE PARTENAIRES ===
    { type: "BUSINESS" as const, displayName: "Hôtel Ritz Paris", companyName: "Hôtel Ritz Paris", email: "concierge@ritzparis.com", phone: "+33 1 43 16 30 30", vatNumber: "FR12345678901", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "BUSINESS" as const, displayName: "Four Seasons George V", companyName: "Four Seasons George V", email: "concierge@fourseasons.com", phone: "+33 1 49 52 70 00", vatNumber: "FR23456789012", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "BUSINESS" as const, displayName: "Le Bristol Paris", companyName: "Oetker Collection - Le Bristol", email: "concierge.paris@oetkercollection.com", phone: "+33 1 53 43 43 00", vatNumber: "FR33456789013", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "BUSINESS" as const, displayName: "Hôtel Plaza Athénée", companyName: "Dorchester Collection - Plaza Athénée", email: "reservations.hpa@dorchestercollection.com", phone: "+33 1 53 67 66 65", vatNumber: "FR44567890124", isPartner: true, defaultClientType: "PARTNER" as const },
    
    // === AGENCES DE VOYAGE RÉELLES (DMC - Destination Management Companies) ===
    // Ces agences sont des réceptifs qui gèrent des groupes et VIP
    { type: "AGENCY" as const, displayName: "PARISCityVISION", companyName: "PARISCityVISION SAS", email: "groups@pariscityvision.com", phone: "+33 1 44 55 61 00", vatNumber: "FR55678901235", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "AGENCY" as const, displayName: "France Tourisme", companyName: "France Tourisme DMC", email: "reservation@francetourisme.fr", phone: "+33 1 53 10 35 35", vatNumber: "FR66789012346", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "AGENCY" as const, displayName: "Euroscope Paris", companyName: "Euroscope International", email: "transport@euroscope.fr", phone: "+33 1 45 26 26 26", vatNumber: "FR77890123457", isPartner: true, defaultClientType: "PARTNER" as const },
    
    // === ENTREPRISES CORPORATE ===
    { type: "BUSINESS" as const, displayName: "LVMH Travel", companyName: "LVMH Moët Hennessy Louis Vuitton", email: "travel.services@lvmh.com", phone: "+33 1 44 13 22 22", vatNumber: "FR88901234568", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "BUSINESS" as const, displayName: "L'Oréal Corporate", companyName: "L'Oréal SA", email: "corporate.travel@loreal.com", phone: "+33 1 47 56 70 00", vatNumber: "FR99012345679", isPartner: true, defaultClientType: "PARTNER" as const },
    { type: "BUSINESS" as const, displayName: "BNP Paribas Events", companyName: "BNP Paribas SA", email: "events.transport@bnpparibas.com", phone: "+33 1 40 14 45 46", vatNumber: "FR10123456780", isPartner: true, defaultClientType: "PARTNER" as const },
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
    // HÔTELS DE LUXE - Tarifs négociés premium (-8% à -12%)
    // Volume régulier, clientèle premium, paiement à 30 jours
    // ============================================================================
    {
      name: "Hôtel Ritz Paris",
      paymentTerms: "DAYS_30" as const,
      commissionPercent: 10.0,
      zoneRoutes: [
        // Aéroports vers Paris Centre (clientèle internationale)
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 72.0 },       // Catalog: 79€, -9%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 89.0 },   // Catalog: 99€, -10%
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 135.0 },         // Catalog: 149€, -9%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 50.0 },      // Catalog: 55€, -9%
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 65.0 },  // Catalog: 72€, -10%
        { routeKey: "ORLY_PARIS_0_LUXE", overridePrice: 95.0 },         // Catalog: 105€, -10%
        { routeKey: "LBG_PARIS_0_LUXE", overridePrice: 135.0 },         // Catalog: 149€, -9%
        { routeKey: "LBG_PARIS_0_BERLINE", overridePrice: 72.0 },       // Catalog: 79€, -9%
        // Destinations touristiques
        { routeKey: "PARIS_0_VERSAILLES_BERLINE", overridePrice: 62.0 },// Catalog: 69€, -10%
        { routeKey: "PARIS_0_VERSAILLES_LUXE", overridePrice: 116.0 },  // Catalog: 129€, -10%
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
        { name: "Dispo 4h Berline", overridePrice: 189.0 },    // Catalog: 210€, -10%
        { name: "Dispo 8h Berline", overridePrice: 342.0 },    // Catalog: 380€, -10%
        { name: "Dispo 4h Luxe", overridePrice: 360.0 },       // Catalog: 400€, -10%
        { name: "Dispo 8h Luxe", overridePrice: 648.0 },       // Catalog: 720€, -10%
      ],
    },
    {
      name: "Four Seasons George V",
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
        { name: "Dispo 4h Berline", overridePrice: 189.0 },    // Catalog: 210€, -10%
        { name: "Dispo 8h Berline", overridePrice: 342.0 },    // Catalog: 380€, -10%
        { name: "Dispo 4h Luxe", overridePrice: 360.0 },       // Catalog: 400€, -10%
        { name: "Dispo 8h Luxe", overridePrice: 648.0 },       // Catalog: 720€, -10%
      ],
    },
    {
      name: "Le Bristol Paris",
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
      name: "Hôtel Plaza Athénée",
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
      name: "PARISCityVISION",
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
        { name: "Dispo 4h Berline", overridePrice: 172.0 },    // Catalog: 210€, -18%
        { name: "Dispo 8h Berline", overridePrice: 312.0 },    // Catalog: 380€, -18%
        { name: "Dispo 4h Van", overridePrice: 226.0 },        // Catalog: 275€, -18%
        { name: "Dispo 8h Van", overridePrice: 406.0 },        // Catalog: 495€, -18%
        { name: "Dispo 4h Minibus", overridePrice: 377.0 },    // Catalog: 460€, -18%
        { name: "Dispo 8h Minibus", overridePrice: 672.0 },    // Catalog: 820€, -18%
      ],
    },
    {
      name: "France Tourisme",
      paymentTerms: "DAYS_15" as const,
      commissionPercent: 15.0,
      // DMC spécialisée tourisme haut de gamme (-15%)
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 67.0 },       // Catalog: 79€, -15%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 84.0 },   // Catalog: 99€, -15%
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 127.0 },         // Catalog: 149€, -15%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 47.0 },      // Catalog: 55€, -15%
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 61.0 },  // Catalog: 72€, -15%
        { routeKey: "CDG_VERSAILLES_BERLINE", overridePrice: 118.0 },   // Catalog: 139€, -15%
        { routeKey: "CDG_VERSAILLES_VAN_PREMIUM", overridePrice: 152.0 },// Catalog: 179€, -15%
        { routeKey: "PARIS_0_FONTAINEBLEAU_BERLINE", overridePrice: 101.0 },// Catalog: 119€, -15%
        { routeKey: "PARIS_0_FONTAINEBLEAU_VAN_PREMIUM", overridePrice: 132.0 },// Catalog: 155€, -15%
        { routeKey: "PARIS_0_CHANTILLY_BERLINE", overridePrice: 84.0 }, // Catalog: 99€, -15%
        { routeKey: "PARIS_0_CHANTILLY_VAN_PREMIUM", overridePrice: 110.0 },// Catalog: 129€, -15%
        { routeKey: "PARIS_0_GIVERNY_BERLINE", overridePrice: 127.0 },  // Catalog: 149€, -15%
        { routeKey: "PARIS_0_GIVERNY_VAN_PREMIUM", overridePrice: 166.0 },// Catalog: 195€, -15%
        { routeKey: "PARIS_0_REIMS_BERLINE", overridePrice: 254.0 },    // Catalog: 299€, -15%
        { routeKey: "PARIS_0_REIMS_VAN_PREMIUM", overridePrice: 331.0 },// Catalog: 389€, -15%
      ],
      excursions: [
        { name: "Versailles Journée Complète Berline", overridePrice: 408.0 },  // Catalog: 480€, -15%
        { name: "Versailles Journée Complète Van", overridePrice: 531.0 },      // Catalog: 625€, -15%
        { name: "Giverny Journée Berline", overridePrice: 442.0 },              // Catalog: 520€, -15%
        { name: "Giverny Journée Van", overridePrice: 578.0 },                  // Catalog: 680€, -15%
        { name: "Champagne Journée Berline", overridePrice: 612.0 },            // Catalog: 720€, -15%
        { name: "Champagne Journée Van", overridePrice: 799.0 },                // Catalog: 940€, -15%
        { name: "Fontainebleau + Vaux Journée Berline", overridePrice: 493.0 }, // Catalog: 580€, -15%
        { name: "Fontainebleau + Vaux Journée Van", overridePrice: 642.0 },     // Catalog: 755€, -15%
        { name: "Châteaux de la Loire Berline", overridePrice: 808.0 },         // Catalog: 950€, -15%
        { name: "Châteaux de la Loire Van", overridePrice: 1050.0 },            // Catalog: 1235€, -15%
        { name: "Normandie D-Day Berline", overridePrice: 918.0 },              // Catalog: 1080€, -15%
        { name: "Normandie D-Day Van", overridePrice: 1194.0 },                 // Catalog: 1405€, -15%
        { name: "Mont Saint-Michel Berline", overridePrice: 1063.0 },           // Catalog: 1250€, -15%
        { name: "Mont Saint-Michel Van", overridePrice: 1381.0 },               // Catalog: 1625€, -15%
      ],
      dispos: [
        { name: "Dispo 4h Berline", overridePrice: 179.0 },    // Catalog: 210€, -15%
        { name: "Dispo 8h Berline", overridePrice: 323.0 },    // Catalog: 380€, -15%
        { name: "Dispo 10h Berline", overridePrice: 383.0 },   // Catalog: 450€, -15%
        { name: "Dispo 4h Van", overridePrice: 234.0 },        // Catalog: 275€, -15%
        { name: "Dispo 8h Van", overridePrice: 421.0 },        // Catalog: 495€, -15%
        { name: "Dispo 10h Van", overridePrice: 497.0 },       // Catalog: 585€, -15%
      ],
    },
    {
      name: "Euroscope Paris",
      paymentTerms: "DAYS_15" as const,
      commissionPercent: 15.0,
      // DMC spécialisée groupes corporate et incentive (-15%)
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 67.0 },       // Catalog: 79€, -15%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 84.0 },   // Catalog: 99€, -15%
        { routeKey: "CDG_PARIS_0_MINIBUS", overridePrice: 149.0 },      // Catalog: 175€, -15%
        { routeKey: "CDG_LA_DEFENSE_BERLINE", overridePrice: 76.0 },    // Catalog: 89€, -15%
        { routeKey: "CDG_LA_DEFENSE_VAN_PREMIUM", overridePrice: 98.0 },// Catalog: 115€, -15%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 47.0 },      // Catalog: 55€, -15%
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 61.0 },  // Catalog: 72€, -15%
        { routeKey: "ORLY_LA_DEFENSE_BERLINE", overridePrice: 64.0 },   // Catalog: 75€, -15%
        { routeKey: "ORLY_LA_DEFENSE_VAN_PREMIUM", overridePrice: 83.0 },// Catalog: 98€, -15%
        { routeKey: "PARIS_0_LA_DEFENSE_BERLINE", overridePrice: 42.0 },// Catalog: 49€, -14%
        { routeKey: "PARIS_0_LA_DEFENSE_VAN_PREMIUM", overridePrice: 55.0 },// Catalog: 65€, -15%
        { routeKey: "LA_DEFENSE_VERSAILLES_BERLINE", overridePrice: 50.0 },// Catalog: 59€, -15%
        { routeKey: "LA_DEFENSE_VERSAILLES_VAN_PREMIUM", overridePrice: 67.0 },// Catalog: 79€, -15%
      ],
      excursions: [
        { name: "Versailles Journée Complète Berline", overridePrice: 408.0 },  // Catalog: 480€, -15%
        { name: "Versailles Journée Complète Van", overridePrice: 531.0 },      // Catalog: 625€, -15%
        { name: "Champagne Journée Berline", overridePrice: 612.0 },            // Catalog: 720€, -15%
        { name: "Champagne Journée Van", overridePrice: 799.0 },                // Catalog: 940€, -15%
        { name: "Champagne Journée Minibus", overridePrice: 1088.0 },           // Catalog: 1280€, -15%
        { name: "Chantilly Demi-Journée Berline", overridePrice: 298.0 },       // Catalog: 350€, -15%
      ],
      dispos: [
        { name: "Dispo 4h Berline", overridePrice: 179.0 },    // Catalog: 210€, -15%
        { name: "Dispo 8h Berline", overridePrice: 323.0 },    // Catalog: 380€, -15%
        { name: "Dispo 4h Van", overridePrice: 234.0 },        // Catalog: 275€, -15%
        { name: "Dispo 8h Van", overridePrice: 421.0 },        // Catalog: 495€, -15%
        { name: "Dispo 4h Minibus", overridePrice: 391.0 },    // Catalog: 460€, -15%
        { name: "Dispo 8h Minibus", overridePrice: 697.0 },    // Catalog: 820€, -15%
        { name: "Dispo 10h Minibus", overridePrice: 833.0 },   // Catalog: 980€, -15%
      ],
    },
    
    // ============================================================================
    // CORPORATE - Tarifs modérés (-5% à -8%)
    // Paiement rapide, volume régulier
    // ============================================================================
    {
      name: "LVMH Travel",
      paymentTerms: "DAYS_15" as const,
      commissionPercent: 8.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 73.0 },       // Catalog: 79€, -8%
        { routeKey: "CDG_PARIS_0_LUXE", overridePrice: 137.0 },         // Catalog: 149€, -8%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 51.0 },      // Catalog: 55€, -7%
        { routeKey: "ORLY_PARIS_0_LUXE", overridePrice: 97.0 },         // Catalog: 105€, -8%
        { routeKey: "CDG_LA_DEFENSE_BERLINE", overridePrice: 82.0 },    // Catalog: 89€, -8%
        { routeKey: "PARIS_0_LA_DEFENSE_BERLINE", overridePrice: 45.0 },// Catalog: 49€, -8%
        { routeKey: "LBG_PARIS_0_LUXE", overridePrice: 137.0 },         // Catalog: 149€, -8%
      ],
      excursions: [],
      dispos: [
        { name: "Dispo 4h Berline", overridePrice: 193.0 },    // Catalog: 210€, -8%
        { name: "Dispo 8h Berline", overridePrice: 350.0 },    // Catalog: 380€, -8%
        { name: "Dispo 4h Luxe", overridePrice: 368.0 },       // Catalog: 400€, -8%
        { name: "Dispo 8h Luxe", overridePrice: 662.0 },       // Catalog: 720€, -8%
      ],
    },
    {
      name: "L'Oréal Corporate",
      paymentTerms: "DAYS_15" as const,
      commissionPercent: 8.0,
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 73.0 },       // Catalog: 79€, -8%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 91.0 },   // Catalog: 99€, -8%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 51.0 },      // Catalog: 55€, -7%
        { routeKey: "ORLY_PARIS_0_VAN_PREMIUM", overridePrice: 66.0 },  // Catalog: 72€, -8%
        { routeKey: "CDG_PARIS_20_BERLINE", overridePrice: 54.0 },      // Catalog: 59€, -8%
      ],
      excursions: [],
      dispos: [
        { name: "Dispo 4h Berline", overridePrice: 193.0 },    // Catalog: 210€, -8%
        { name: "Dispo 8h Berline", overridePrice: 350.0 },    // Catalog: 380€, -8%
        { name: "Dispo 4h Van", overridePrice: 253.0 },        // Catalog: 275€, -8%
        { name: "Dispo 8h Van", overridePrice: 455.0 },        // Catalog: 495€, -8%
      ],
    },
    {
      name: "BNP Paribas Events",
      paymentTerms: "IMMEDIATE" as const,
      commissionPercent: 5.0,
      // Paiement immédiat = remise minimale (-5%)
      zoneRoutes: [
        { routeKey: "CDG_PARIS_0_BERLINE", overridePrice: 75.0 },       // Catalog: 79€, -5%
        { routeKey: "CDG_PARIS_0_VAN_PREMIUM", overridePrice: 94.0 },   // Catalog: 99€, -5%
        { routeKey: "CDG_LA_DEFENSE_BERLINE", overridePrice: 85.0 },    // Catalog: 89€, -4%
        { routeKey: "CDG_LA_DEFENSE_VAN_PREMIUM", overridePrice: 109.0 },// Catalog: 115€, -5%
        { routeKey: "ORLY_PARIS_0_BERLINE", overridePrice: 52.0 },      // Catalog: 55€, -5%
        { routeKey: "ORLY_LA_DEFENSE_BERLINE", overridePrice: 71.0 },   // Catalog: 75€, -5%
        { routeKey: "PARIS_0_LA_DEFENSE_BERLINE", overridePrice: 47.0 },// Catalog: 49€, -4%
        { routeKey: "PARIS_0_LA_DEFENSE_VAN_PREMIUM", overridePrice: 62.0 },// Catalog: 65€, -5%
      ],
      excursions: [],
      dispos: [
        { name: "Dispo 4h Berline", overridePrice: 200.0 },    // Catalog: 210€, -5%
        { name: "Dispo 8h Berline", overridePrice: 361.0 },    // Catalog: 380€, -5%
        { name: "Dispo 4h Van", overridePrice: 261.0 },        // Catalog: 275€, -5%
        { name: "Dispo 8h Van", overridePrice: 470.0 },        // Catalog: 495€, -5%
        { name: "Dispo 10h Van", overridePrice: 550.0 },
      ],
    },
  ];

  let totalZoneRoutes = 0;
  let totalExcursions = 0;
  let totalDispos = 0;

  for (const config of partnerConfigs) {
    // Create the partner contract
    const contract = await prisma.partnerContract.create({
      data: {
        id: randomUUID(),
        organizationId: ORGANIZATION_ID,
        contactId: CONTACT_IDS[config.name],
        paymentTerms: config.paymentTerms,
        commissionPercent: config.commissionPercent,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
    PARTNER_CONTRACT_IDS[config.name] = contract.id;

    // Assign zone routes with custom prices
    for (const route of config.zoneRoutes) {
      const zoneRouteId = ZONE_ROUTE_IDS[route.routeKey];
      if (zoneRouteId) {
        await prisma.partnerContractZoneRoute.create({
          data: {
            id: randomUUID(),
            partnerContractId: contract.id,
            zoneRouteId: zoneRouteId,
            overridePrice: route.overridePrice,
          },
        });
        totalZoneRoutes++;
      } else {
        console.log(`   ⚠️ Route not found: ${route.routeKey}`);
      }
    }

    // Assign excursion packages with custom prices
    for (const excursion of config.excursions) {
      const excursionId = EXCURSION_PACKAGE_IDS[excursion.name];
      if (excursionId) {
        await prisma.partnerContractExcursionPackage.create({
          data: {
            id: randomUUID(),
            partnerContractId: contract.id,
            excursionPackageId: excursionId,
            overridePrice: excursion.overridePrice,
          },
        });
        totalExcursions++;
      } else {
        console.log(`   ⚠️ Excursion not found: ${excursion.name}`);
      }
    }

    // Assign dispo packages with custom prices
    for (const dispo of config.dispos) {
      const dispoId = DISPO_PACKAGE_IDS[dispo.name];
      if (dispoId) {
        await prisma.partnerContractDispoPackage.create({
          data: {
            id: randomUUID(),
            partnerContractId: contract.id,
            dispoPackageId: dispoId,
            overridePrice: dispo.overridePrice,
          },
        });
        totalDispos++;
      } else {
        console.log(`   ⚠️ Dispo not found: ${dispo.name}`);
      }
    }

    console.log(`   ✅ ${config.name}: ${config.zoneRoutes.length} routes, ${config.excursions.length} excursions, ${config.dispos.length} dispos`);
  }

  console.log(`   📊 Total: ${partnerConfigs.length} contracts, ${totalZoneRoutes} zone routes, ${totalExcursions} excursions, ${totalDispos} dispos`);
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
  console.log(`   • 10 Partner Contracts with custom pricing:`);
  console.log(`     📍 HÔTELS DE LUXE (10% commission, paiement 30j, -8 à -12%):`);
  console.log(`       - Hôtel Ritz Paris`);
  console.log(`       - Four Seasons George V`);
  console.log(`       - Le Bristol Paris`);
  console.log(`       - Hôtel Plaza Athénée`);
  console.log(`     📍 AGENCES DMC (15% commission, paiement 15j, -15 à -18%):`);
  console.log(`       - PARISCityVISION (groupes, excursions)`);
  console.log(`       - France Tourisme (tourisme haut de gamme)`);
  console.log(`       - Euroscope Paris (corporate, incentive)`);
  console.log(`     📍 CORPORATE (5-8% commission, paiement rapide, -5 à -8%):`);
  console.log(`       - LVMH Travel`);
  console.log(`       - L'Oréal Corporate`);
  console.log(`       - BNP Paribas Events`);
  console.log(`   • No default quotes or invoices seeded`);
  console.log(`   • API keys configured (Google Maps, CollectAPI)`);
}

main().catch((e) => {
  console.error("❌ Fatal error:", e);
  process.exit(1);
});
