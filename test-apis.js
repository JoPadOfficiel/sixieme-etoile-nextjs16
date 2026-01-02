// Test script for API keys and functionality
const fetch = require('node-fetch');

// Test CollectAPI directly
async function testCollectAPI() {
  console.log('🔧 Testing CollectAPI directly...');
  
  try {
    const response = await fetch('https://api.collectapi.com/gasPrice/latest?countryCode=FR', {
      method: 'GET',
      headers: {
        'Authorization': 'apikey 0D90oFsR6sC0hoengutjle:4coURC1X5lL5ZLOis7HQlY',
        'Content-Type': 'application/json',
      },
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ CollectAPI working!');
      console.log('📊 Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ CollectAPI failed:', response.status, response.statusText);
      const text = await response.text();
      console.log('📄 Error response:', text);
    }
  } catch (error) {
    console.error('❌ CollectAPI error:', error.message);
  }
}

// Test Google Maps API directly
async function testGoogleMapsAPI() {
  console.log('🗺️ Testing Google Maps API directly...');
  
  try {
    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const body = {
      origin: {
        address: '48.8566,2.3522' // Paris
      },
      destination: {
        address: '45.7640,4.8357' // Lyon
      },
      travelMode: 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      computeTollRoutes: true,
    };
    
    const response = await fetch(`${url}?key=AIzaSyDEvKJrTcLu2aUCs0ZAS-yla8vGhMFE8CE`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': 'AIzaSyDEvKJrTcLu2aUCs0ZAS-yla8vGhMFE8CE',
      },
      body: JSON.stringify(body),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Google Maps API working!');
      console.log('🗺️ Routes found:', data.routes?.length || 0);
      
      // Check for toll info
      const tollInfo = data.routes?.[0]?.travelAdvisory?.tollInfo;
      if (tollInfo) {
        console.log('💰 Toll info found:', {
          currency: tollInfo.estimatedPrice?.[0]?.currency,
          amount: tollInfo.estimatedPrice?.[0]?.units,
        });
      } else {
        console.log('ℹ️ No toll info found (may be toll-free route)');
      }
    } else {
      console.log('❌ Google Maps API failed:', response.status, response.statusText);
      const text = await response.text();
      console.log('📄 Error response:', text);
    }
  } catch (error) {
    console.error('❌ Google Maps API error:', error.message);
  }
}

// Test pricing endpoint with real data
async function testPricingEndpoint() {
  console.log('💰 Testing pricing endpoint...');
  
  try {
    const response = await fetch('http://localhost:3000/api/vtc/pricing/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'better-auth.session_token=uJ0j-Oc4BPWFv1jLy9c-82-eDsYwD77m.5R9DhURfI5a7IzEoHcE%2FZaJTXhoyMyMRToGU0tQUv%2B8%3D',
      },
      body: JSON.stringify({
        pickupAddress: '48.8566,2.3522',
        dropoffAddress: '45.7640,4.8357',
        passengerCount: 2,
        luggageCount: 2,
        vehicleCategoryId: 'b2c53609-f8d1-49c6-a5fd-4add7153a027', // Berline
        tripType: 'TRANSFER',
        pricingMode: 'DYNAMIC',
        isRoundTrip: false,
      }),
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Pricing endpoint working!');
      console.log('💰 Final price:', data.price);
      console.log('🔧 Internal cost:', data.internalCost);
      
      // Check for fuel and toll info
      const fuelInfo = data.tripAnalysis?.fuelPriceSource;
      const tollInfo = data.tripAnalysis?.tollSource;
      
      console.log('⛽ Fuel info:', fuelInfo ? {
        source: fuelInfo.source,
        pricePerLitre: fuelInfo.pricePerLitre,
        currency: fuelInfo.currency,
      } : 'Not found');
      
      console.log('🛣️ Toll info:', tollInfo || 'Not found');
    } else {
      console.log('❌ Pricing endpoint failed:', response.status, response.statusText);
      const text = await response.text();
      console.log('📄 Error response:', text);
    }
  } catch (error) {
    console.error('❌ Pricing endpoint error:', error.message);
  }
}

// Run all tests
async function runTests() {
  console.log('🚀 Starting API tests...\n');
  
  await testCollectAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testGoogleMapsAPI();
  console.log('\n' + '='.repeat(50) + '\n');
  
  await testPricingEndpoint();
  console.log('\n🏁 Tests completed!');
}

runTests().catch(console.error);
