/**
 * Seed script for quotes test data
 * Run with: pnpm --filter @repo/database exec tsx prisma/seed-quotes.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const organizationId = "zSs1CR7wlI8I5Yh4yIAhM";
  
  // Get existing contacts and vehicle category
  const contacts = await prisma.contact.findMany({
    where: { organizationId },
    take: 5,
  });
  
  const vehicleCategory = await prisma.vehicleCategory.findFirst({
    where: { organizationId },
  });

  if (contacts.length === 0 || !vehicleCategory) {
    console.error("No contacts or vehicle categories found. Please seed them first.");
    return;
  }

  console.log(`Found ${contacts.length} contacts and vehicle category: ${vehicleCategory.name}`);

  // Delete existing test quotes
  await prisma.quote.deleteMany({
    where: {
      id: { startsWith: "quote-test-" },
    },
  });

  // Create test quotes with different statuses and margins
  const quotes = await prisma.quote.createMany({
    data: [
      // Quote 1: DRAFT, Partner, High margin (green)
      {
        id: "quote-test-001",
        organizationId,
        contactId: contacts.find(c => c.isPartner)?.id || contacts[0].id,
        status: "DRAFT",
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: new Date("2025-01-15T10:00:00+01:00"),
        pickupAddress: "Aéroport Paris CDG, Terminal 2",
        dropoffAddress: "Tour Eiffel, Paris",
        passengerCount: 2,
        luggageCount: 3,
        vehicleCategoryId: vehicleCategory.id,
        suggestedPrice: 150.00,
        finalPrice: 180.00,
        internalCost: 120.00,
        marginPercent: 33.33,
      },
      // Quote 2: SENT, Private, Medium margin (orange)
      {
        id: "quote-test-002",
        organizationId,
        contactId: contacts.find(c => !c.isPartner)?.id || contacts[1].id,
        status: "SENT",
        pricingMode: "FIXED_GRID",
        tripType: "TRANSFER",
        pickupAt: new Date("2025-01-16T14:30:00+01:00"),
        pickupAddress: "Gare de Lyon, Paris",
        dropoffAddress: "Château de Versailles",
        passengerCount: 4,
        luggageCount: 2,
        vehicleCategoryId: vehicleCategory.id,
        suggestedPrice: 200.00,
        finalPrice: 220.00,
        internalCost: 190.00,
        marginPercent: 13.64,
      },
      // Quote 3: ACCEPTED, Partner, Low margin (orange)
      {
        id: "quote-test-003",
        organizationId,
        contactId: contacts.find(c => c.isPartner)?.id || contacts[2].id,
        status: "ACCEPTED",
        pricingMode: "DYNAMIC",
        tripType: "EXCURSION",
        pickupAt: new Date("2025-01-20T09:00:00+01:00"),
        pickupAddress: "Hôtel Ritz, Place Vendôme",
        dropoffAddress: "Giverny, Maison de Monet",
        passengerCount: 2,
        luggageCount: 1,
        vehicleCategoryId: vehicleCategory.id,
        suggestedPrice: 350.00,
        finalPrice: 380.00,
        internalCost: 360.00,
        marginPercent: 5.26,
      },
      // Quote 4: REJECTED, Private, Negative margin (red)
      {
        id: "quote-test-004",
        organizationId,
        contactId: contacts.find(c => !c.isPartner)?.id || contacts[3].id,
        status: "REJECTED",
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: new Date("2025-01-18T18:00:00+01:00"),
        pickupAddress: "Opéra Garnier, Paris",
        dropoffAddress: "Aéroport Orly",
        passengerCount: 1,
        luggageCount: 1,
        vehicleCategoryId: vehicleCategory.id,
        suggestedPrice: 80.00,
        finalPrice: 75.00,
        internalCost: 90.00,
        marginPercent: -16.67,
      },
      // Quote 5: EXPIRED, Partner, Good margin (green)
      {
        id: "quote-test-005",
        organizationId,
        contactId: contacts.find(c => c.isPartner)?.id || contacts[4].id,
        status: "EXPIRED",
        pricingMode: "FIXED_GRID",
        tripType: "DISPO",
        pickupAt: new Date("2025-01-10T08:00:00+01:00"),
        pickupAddress: "Champs-Élysées, Paris",
        dropoffAddress: "La Défense",
        passengerCount: 3,
        luggageCount: 0,
        vehicleCategoryId: vehicleCategory.id,
        suggestedPrice: 500.00,
        finalPrice: 550.00,
        internalCost: 400.00,
        marginPercent: 27.27,
      },
      // Quote 6: VIEWED, Private, Zero margin (orange)
      {
        id: "quote-test-006",
        organizationId,
        contactId: contacts.find(c => !c.isPartner)?.id || contacts[0].id,
        status: "VIEWED",
        pricingMode: "DYNAMIC",
        tripType: "TRANSFER",
        pickupAt: new Date("2025-01-22T11:00:00+01:00"),
        pickupAddress: "Musée du Louvre",
        dropoffAddress: "Sacré-Cœur, Montmartre",
        passengerCount: 2,
        luggageCount: 2,
        vehicleCategoryId: vehicleCategory.id,
        suggestedPrice: 100.00,
        finalPrice: 100.00,
        internalCost: 100.00,
        marginPercent: 0.00,
      },
    ],
  });

  console.log(`Created ${quotes.count} test quotes`);
  
  // Verify
  const allQuotes = await prisma.quote.findMany({
    where: { organizationId },
    include: { contact: true, vehicleCategory: true },
    orderBy: { createdAt: "desc" },
  });
  
  console.log("\nCreated quotes:");
  for (const q of allQuotes) {
    console.log(`- ${q.id}: ${q.status} | ${q.contact.displayName} | ${q.marginPercent}%`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
