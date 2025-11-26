/**
 * Test script for Story 4.7: Profitability Indicator
 * 
 * Run with: npx tsx src/scripts/test-profitability-indicator.ts
 */

import { db } from "@repo/database";
import {
	calculatePrice,
	calculateProfitabilityIndicator,
	getProfitabilityIndicatorData,
	getThresholdsFromSettings,
	DEFAULT_PROFITABILITY_THRESHOLDS,
	type ContactData,
	type OrganizationPricingSettings,
	type PricingRequest,
} from "../services/pricing-engine";

const ORG_ID = "zSs1CR7wlI8I5Yh4yIAhM";

async function main() {
	console.log("=".repeat(80));
	console.log("🧪 TEST STORY 4.7: PROFITABILITY INDICATOR");
	console.log("=".repeat(80));

	// 1. Load pricing settings from DB
	console.log("\n📊 1. LOADING PRICING SETTINGS FROM DATABASE");
	const settings = await db.organizationPricingSettings.findFirst({
		where: { organizationId: ORG_ID },
	});

	if (!settings) {
		console.error("❌ No pricing settings found for organization:", ORG_ID);
		process.exit(1);
	}

	console.log("✅ Settings loaded:");
	console.log("   - baseRatePerKm:", Number(settings.baseRatePerKm));
	console.log("   - baseRatePerHour:", Number(settings.baseRatePerHour));
	console.log("   - defaultMarginPercent:", Number(settings.defaultMarginPercent));
	console.log("   - greenMarginThreshold:", Number(settings.greenMarginThreshold));
	console.log("   - orangeMarginThreshold:", Number(settings.orangeMarginThreshold));

	// 2. Test threshold extraction from DB settings
	console.log("\n📊 2. TESTING THRESHOLD EXTRACTION FROM DB");
	const orgSettings: OrganizationPricingSettings = {
		baseRatePerKm: Number(settings.baseRatePerKm),
		baseRatePerHour: Number(settings.baseRatePerHour),
		targetMarginPercent: Number(settings.defaultMarginPercent),
		greenMarginThreshold: Number(settings.greenMarginThreshold),
		orangeMarginThreshold: Number(settings.orangeMarginThreshold),
	};

	const dbThresholds = getThresholdsFromSettings(orgSettings);
	console.log("✅ Thresholds from DB:");
	console.log("   - greenThreshold:", dbThresholds.greenThreshold);
	console.log("   - orangeThreshold:", dbThresholds.orangeThreshold);

	// 3. Test profitability indicator calculation with EXPLICIT custom thresholds
	console.log("\n📊 3. TESTING PROFITABILITY INDICATOR WITH CUSTOM THRESHOLDS");
	
	// Use explicit test thresholds (not from DB)
	const customThresholds = { greenThreshold: 25, orangeThreshold: 5 };
	console.log("   Test thresholds: green >= 25%, orange >= 5%, red < 5%");
	
	const testCases = [
		{ margin: 30, expected: "green", desc: "High margin (30%)" },
		{ margin: 25, expected: "green", desc: "At green threshold (25%)" },
		{ margin: 24.9, expected: "orange", desc: "Just below green (24.9%)" },
		{ margin: 15, expected: "orange", desc: "Medium margin (15%)" },
		{ margin: 5, expected: "orange", desc: "At orange threshold (5%)" },
		{ margin: 4.9, expected: "red", desc: "Just below orange (4.9%)" },
		{ margin: 0, expected: "red", desc: "Zero margin (0%)" },
		{ margin: -10, expected: "red", desc: "Negative margin (-10%)" },
	];

	let allPassed = true;
	for (const tc of testCases) {
		const result = calculateProfitabilityIndicator(tc.margin, customThresholds);
		const passed = result === tc.expected;
		const icon = passed ? "✅" : "❌";
		console.log(`   ${icon} ${tc.desc}: ${result} (expected: ${tc.expected})`);
		if (!passed) allPassed = false;
	}

	// 4. Test full profitability data with custom thresholds
	console.log("\n📊 4. TESTING FULL PROFITABILITY DATA (custom thresholds)");
	const profitData = getProfitabilityIndicatorData(18.5, customThresholds);
	console.log("   Input: marginPercent = 18.5%");
	console.log("   Output:");
	console.log("   - indicator:", profitData.indicator);
	console.log("   - marginPercent:", profitData.marginPercent);
	console.log("   - label:", profitData.label);
	console.log("   - description:", profitData.description);
	console.log("   - thresholds:", JSON.stringify(profitData.thresholds));

	// 5. Test with default thresholds (for comparison)
	console.log("\n📊 5. COMPARISON WITH DEFAULT THRESHOLDS");
	console.log("   Default thresholds: green >= 20%, orange >= 0%, red < 0%");
	
	const defaultData = getProfitabilityIndicatorData(18.5, DEFAULT_PROFITABILITY_THRESHOLDS);
	const customData = getProfitabilityIndicatorData(18.5, customThresholds);
	
	console.log("   Margin 18.5%:");
	console.log("   - With DEFAULT thresholds:", defaultData.indicator, `(${defaultData.label})`);
	console.log("   - With CUSTOM thresholds:", customData.indicator, `(${customData.label})`);

	// 6. Load a contact and test full pricing calculation
	console.log("\n📊 6. TESTING FULL PRICING CALCULATION");
	
	const contact = await db.contact.findFirst({
		where: { organizationId: ORG_ID, isPartner: false },
	});

	if (!contact) {
		console.log("⚠️  No private contact found, skipping full pricing test");
	} else {
		console.log("   Contact:", contact.displayName, "(isPartner:", contact.isPartner, ")");
		
		const contactData: ContactData = {
			id: contact.id,
			isPartner: contact.isPartner,
			partnerContract: null,
		};

		const request: PricingRequest = {
			contactId: contact.id,
			pickup: { lat: 48.8566, lng: 2.3522 }, // Paris
			dropoff: { lat: 49.0097, lng: 2.5479 }, // CDG
			vehicleCategoryId: "vehicle-cat-berline",
			tripType: "transfer",
			estimatedDistanceKm: 35,
			estimatedDurationMinutes: 50,
		};

		const zones = await db.pricingZone.findMany({
			where: { organizationId: ORG_ID, isActive: true },
		});

		const zonesData = zones.map(z => ({
			id: z.id,
			name: z.name,
			code: z.code,
			zoneType: z.zoneType as "POLYGON" | "RADIUS" | "POINT",
			geometry: z.geometry as any,
			centerLatitude: z.centerLatitude ? Number(z.centerLatitude) : null,
			centerLongitude: z.centerLongitude ? Number(z.centerLongitude) : null,
			radiusKm: z.radiusKm ? Number(z.radiusKm) : null,
			isActive: z.isActive,
		}));

		const result = calculatePrice(request, {
			contact: contactData,
			zones: zonesData,
			pricingSettings: orgSettings,
		});

		console.log("\n   📋 PRICING RESULT:");
		console.log("   - pricingMode:", result.pricingMode);
		console.log("   - price:", result.price, "EUR");
		console.log("   - internalCost:", result.internalCost, "EUR");
		console.log("   - margin:", result.margin, "EUR");
		console.log("   - marginPercent:", result.marginPercent, "%");
		console.log("   - profitabilityIndicator:", result.profitabilityIndicator);
		
		console.log("\n   📋 PROFITABILITY DATA (Story 4.7):");
		console.log("   - indicator:", result.profitabilityData.indicator);
		console.log("   - marginPercent:", result.profitabilityData.marginPercent);
		console.log("   - label:", result.profitabilityData.label);
		console.log("   - description:", result.profitabilityData.description);
		console.log("   - thresholds:", JSON.stringify(result.profitabilityData.thresholds));
	}

	// Summary
	console.log("\n" + "=".repeat(80));
	console.log(allPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED");
	console.log("=".repeat(80));

	await db.$disconnect();
}

main().catch(console.error);
