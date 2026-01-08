
import { db } from '../packages/database';

async function main() {
  console.log('Verifying Schema 23-5...');

  // 1. Get an organization
  const org = await db.organization.findFirst();
  if (!org) {
    console.error('No organization found. Please seed the database.');
    process.exit(1);
  }
  console.log(`Found organization: ${org.name} (${org.id})`);

  // 2. Get a vehicle category
  let category = await db.vehicleCategory.findFirst({
    where: { organizationId: org.id }
  });
  
  if (!category) {
    console.log('No vehicle category found, creating one...');
    category = await db.vehicleCategory.create({
      data: {
        organizationId: org.id,
        name: 'Test Category 23-5',
        code: 'TEST235',
        regulatoryCategory: 'LIGHT',
        maxPassengers: 4,
        priceMultiplier: 1.0,
      }
    });
  }
  console.log(`Found/Created category: ${category.name} (${category.id})`);

  // 3. Create Seasonal Multiplier WITH category
  const multiplierDate = new Date();
  const multiplier = await db.seasonalMultiplier.create({
    data: {
      organizationId: org.id,
      name: 'Test Multiplier With Category',
      startDate: multiplierDate,
      endDate: new Date(multiplierDate.getTime() + 86400000),
      multiplier: 1.2,
      vehicleCategoryId: category.id
    }
  });
  console.log(`Created SeasonalMultiplier with category: ${multiplier.id}`);

  // 4. Create Seasonal Multiplier WITHOUT category
  const multiplierGlobal = await db.seasonalMultiplier.create({
    data: {
      organizationId: org.id,
      name: 'Test Multiplier Global',
      startDate: multiplierDate,
      endDate: new Date(multiplierDate.getTime() + 86400000),
      multiplier: 1.1,
      vehicleCategoryId: null
    }
  });
  console.log(`Created SeasonalMultiplier global: ${multiplierGlobal.id}`);

  // 5. Verify Reads
  const fetchedWithCat = await db.seasonalMultiplier.findFirst({
    where: { id: multiplier.id },
    include: { vehicleCategory: true }
  });
  
  if (fetchedWithCat?.vehicleCategoryId !== category.id) {
    throw new Error('Verification Failed: vehicleCategoryId mismatch.');
  }
  console.log('Verification Success: Relationship works.');

  // Cleanup
  await db.seasonalMultiplier.deleteMany({
    where: { 
      id: { in: [multiplier.id, multiplierGlobal.id] } 
    }
  });
  
  if (category.code === 'TEST235') {
    await db.vehicleCategory.delete({ where: { id: category.id } });
  }

  console.log('Test cleanup complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
