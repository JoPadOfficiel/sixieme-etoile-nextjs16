const { PrismaClient } = require('./node_modules/.pnpm/@prisma+client@6.0.1_prisma@6.0.1/node_modules/@prisma/client');

const prisma = new PrismaClient();

async function setupApiKeys() {
  try {
    console.log('🔧 Setting up API keys in organization...');
    
    // Get the first organization
    const organization = await prisma.organization.findFirst();
    if (!organization) {
      console.error('❌ No organization found');
      return;
    }
    
    console.log(`📋 Found organization: ${organization.name} (${organization.id})`);
    
    // Try to find existing integration
    let integration = await prisma.organizationIntegration.findFirst({
      where: { organizationId: organization.id }
    });
    
    if (integration) {
      // Update existing
      integration = await prisma.organizationIntegration.update({
        where: { id: integration.id },
        data: {
          collectApiKey: '0D90oFsR6sC0hoengutjle:4coURC1X5lL5ZLOis7HQlY',
          googleMapsApiKey: 'AIzaSyDEvKJrTcLu2aUCs0ZAS-yla8vGhMFE8CE',
          collectApiStatus: 'connected',
          googleMapsStatus: 'connected',
          updatedAt: new Date(),
        },
      });
      console.log('✅ Updated existing integration');
    } else {
      // Create new
      integration = await prisma.organizationIntegration.create({
        data: {
          id: `integration-${organization.id}`,
          organizationId: organization.id,
          collectApiKey: '0D90oFsR6sC0hoengutjle:4coURC1X5lL5ZLOis7HQlY',
          googleMapsApiKey: 'AIzaSyDEvKJrTcLu2aUCs0ZAS-yla8vGhMFE8CE',
          collectApiStatus: 'connected',
          googleMapsStatus: 'connected',
          preferredFuelType: 'DIESEL',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      console.log('✅ Created new integration');
    }
    
    console.log('✅ API keys saved successfully!');
    console.log(`🔑 CollectAPI: ${integration.collectApiKey ? 'SET' : 'MISSING'}`);
    console.log(`🗺️  Google Maps: ${integration.googleMapsApiKey ? 'SET' : 'MISSING'}`);
    console.log(`📊 Status: CollectAPI=${integration.collectApiStatus}, Google Maps=${integration.googleMapsStatus}`);
    
  } catch (error) {
    console.error('❌ Error setting up API keys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupApiKeys();
