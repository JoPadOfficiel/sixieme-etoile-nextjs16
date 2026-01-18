
import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🔧 Fixing missing BERLINE vehicles...");

  // 1. Find Organization (using slug from seed)
  const org = await prisma.organization.findUnique({
    where: { slug: "sixieme-etoile-vtc" },
  });

  if (!org) {
    console.error("❌ Organization 'sixieme-etoile-vtc' not found.");
    process.exit(1);
  }
  console.log(`✅ Found organization: ${org.name} (${org.id})`);

  // 2. Find BERLINE Category
  const berlineCat = await prisma.vehicleCategory.findFirst({
    where: { 
      organizationId: org.id,
      code: "BERLINE" 
    }
  });

  if (!berlineCat) {
    console.error("❌ Category 'BERLINE' not found.");
    process.exit(1);
  }
  console.log(`✅ Found category: ${berlineCat.name} (${berlineCat.id})`);

  // 3. Find Operating Base
  const base = await prisma.operatingBase.findFirst({
    where: {
      organizationId: org.id,
      name: { contains: "Bussy" }
    }
  });

  if (!base) {
    console.error("❌ Operating Base 'Bussy' not found.");
    process.exit(1);
  }
  console.log(`✅ Found base: ${base.name} (${base.id})`);

  // 4. Find License B
  const licenseB = await prisma.licenseCategory.findFirst({
    where: {
         organizationId: org.id,
         code: "B"
    }
  });

  if (!licenseB) {
    console.error("❌ License 'B' not found.");
    process.exit(1);
  }

  // 5. Create Vehicles
  const newVehicles = [
    {
      internalName: "Mercedes E-Class Noire",
      registrationNumber: "PREM-001",
      passengerCapacity: 4,
      luggageCapacity: 3,
      consumptionLPer100Km: 6.5,
      costPerKm: 0.45,
      status: "ACTIVE",
      purchasePrice: 55000,
    },
    {
       internalName: "Tesla Model 3",
       registrationNumber: "ELEC-002",
       passengerCapacity: 4,
       luggageCapacity: 2,
       consumptionLPer100Km: 0, // Electric handled differently usually, but let's say 0 for now or simplified
       costPerKm: 0.30,
       status: "ACTIVE",
       purchasePrice: 45000,
    },
    {
        internalName: "BMW Serie 5",
        registrationNumber: "LUX-003",
        passengerCapacity: 4,
        luggageCapacity: 3,
        consumptionLPer100Km: 7.0,
        costPerKm: 0.50,
        status: "ACTIVE",
        purchasePrice: 60000,
    }
  ];

  for (const v of newVehicles) {
    // Check if exists to avoid duplicates if run multiple times
    const existing = await prisma.vehicle.findFirst({
        where: {
            organizationId: org.id,
            registrationNumber: v.registrationNumber
        }
    });

    if (existing) {
        console.log(`⚠️ Vehicle ${v.internalName} (${v.registrationNumber}) already exists.`);
        continue;
    }

    await prisma.vehicle.create({
        data: {
            id: randomUUID(),
            organizationId: org.id,
            vehicleCategoryId: berlineCat.id,
            operatingBaseId: base.id,
            requiredLicenseCategoryId: licenseB.id,
            internalName: v.internalName,
            registrationNumber: v.registrationNumber,
            passengerCapacity: v.passengerCapacity,
            luggageCapacity: v.luggageCapacity,
            consumptionLPer100Km: v.consumptionLPer100Km,
            costPerKm: v.costPerKm,
            status: "ACTIVE",
            purchasePrice: v.purchasePrice,
            createdAt: new Date(),
            updatedAt: new Date()
        }
    });
    console.log(`✅ Created ${v.internalName}`);
  }

  console.log("🎉 Fix completed.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
