import { db } from "@repo/database";
import {
  calculatePrice,
  type ContactData,
  type OrganizationPricingSettings,
  type PricingRequest,
} from "../services/pricing-engine";

const ORG_ID = "zSs1CR7wlI8I5Yh4yIAhM";

async function testScenarios() {
  const settings = await db.organizationPricingSettings.findFirst({
    where: { organizationId: ORG_ID },
  });

  const orgSettings: OrganizationPricingSettings = {
    baseRatePerKm: Number(settings!.baseRatePerKm),
    baseRatePerHour: Number(settings!.baseRatePerHour),
    targetMarginPercent: Number(settings!.defaultMarginPercent),
    greenMarginThreshold: Number(settings!.greenMarginThreshold),
    orangeMarginThreshold: Number(settings!.orangeMarginThreshold),
  };

  const contact: ContactData = {
    id: "test",
    isPartner: false,
    partnerContract: null,
  };

  console.log("\n🧪 TESTING DIFFERENT DISTANCE SCENARIOS");
  console.log("   Thresholds: green >= 25%, orange >= 5%, red < 5%\n");

  const scenarios = [
    { distance: 10, duration: 15, desc: "Short trip (10km)" },
    { distance: 35, duration: 50, desc: "Medium trip (35km)" },
    { distance: 100, duration: 120, desc: "Long trip (100km)" },
  ];

  for (const s of scenarios) {
    const request: PricingRequest = {
      contactId: "test",
      pickup: { lat: 48.8566, lng: 2.3522 },
      dropoff: { lat: 49.0097, lng: 2.5479 },
      vehicleCategoryId: "vehicle-cat-berline",
      tripType: "transfer",
      estimatedDistanceKm: s.distance,
      estimatedDurationMinutes: s.duration,
    };

    const result = calculatePrice(request, {
      contact,
      zones: [],
      pricingSettings: orgSettings,
    });

    const icon = result.profitabilityData.indicator === "green" ? "🟢" :
                 result.profitabilityData.indicator === "orange" ? "🟠" : "🔴";

    console.log(`${icon} ${s.desc}:`);
    console.log(`   Price: ${result.price}€ | Cost: ${result.internalCost}€ | Margin: ${result.marginPercent}%`);
    console.log(`   Indicator: ${result.profitabilityData.indicator} (${result.profitabilityData.label})`);
    console.log(`   Tooltip: ${result.profitabilityData.description}\n`);
  }

  await db.$disconnect();
}

testScenarios();
