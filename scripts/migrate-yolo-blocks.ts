#!/usr/bin/env npx tsx

/**
 * Story 26.2: Backward Compatibility Migration Script
 *
 * Migrates existing Quotes to the new "Hybrid Blocks" QuoteLine structure.
 * Creates Mission records for operational tracking.
 *
 * Usage:
 *   npx tsx scripts/migrate-yolo-blocks.ts           # Execute migration
 *   npx tsx scripts/migrate-yolo-blocks.ts --dry-run # Simulate without writing
 *   npx tsx scripts/migrate-yolo-blocks.ts --verbose # Detailed logging
 *
 * @author Antigravity
 * @date 2026-01-19
 */

import {
	MissionStatus,
	Prisma,
	PrismaClient,
	QuoteLineType,
	TripType,
} from "@prisma/client";

// ============================================================================
// TYPES
// ============================================================================

/**
 * SourceData structure for CALCULATED QuoteLines
 * Preserves original pricing engine output
 */
interface QuoteLineSourceData {
	pricingMode: string;
	tripType: string;
	pickupAddress: string;
	pickupLatitude: number | null;
	pickupLongitude: number | null;
	dropoffAddress: string | null;
	dropoffLatitude: number | null;
	dropoffLongitude: number | null;
	distanceKm: number | null;
	durationMinutes: number | null;
	internalCost: number | null;
	suggestedPrice: number | null;
	tripAnalysis: object | null;
	costBreakdown: object | null;
	appliedRules: object | null;
	isRoundTrip: boolean;
	passengerCount: number;
	luggageCount: number;
	vehicleCategoryId: string;
	// Migration metadata
	migratedAt: string;
	migratedFrom: "legacy_quote";
}

/**
 * DisplayData structure for QuoteLines
 * Contains user-editable presentation values
 */
interface QuoteLineDisplayData {
	label: string;
	description?: string;
	unitLabel: string;
	showInPdf: boolean;
}

/**
 * Quote with all necessary relations for migration
 */
type QuoteWithRelations = Prisma.QuoteGetPayload<{
	include: {
		lines: true;
		stayDays: {
			include: {
				services: true;
			};
		};
		vehicleCategory: true;
		contact: true;
	};
}>;

/**
 * Migration statistics
 */
interface MigrationStats {
	totalQuotes: number;
	migratedQuotes: number;
	skippedQuotes: number;
	createdLines: number;
	createdMissions: number;
	errors: number;
	errorDetails: Array<{ quoteId: string; error: string }>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const BATCH_SIZE = 100;
const FINANCIAL_TOLERANCE = 0.01; // 1 centime

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Parse command line arguments
 */
function parseArgs(): { dryRun: boolean; verbose: boolean } {
	const args = process.argv.slice(2);
	return {
		dryRun: args.includes("--dry-run"),
		verbose: args.includes("--verbose"),
	};
}

/**
 * Format a number as currency (EUR)
 */
function formatEur(value: number | Prisma.Decimal | null | undefined): string {
	if (value === null || value === undefined) return "0.00€";
	const num = typeof value === "number" ? value : Number(value);
	return `${num.toFixed(2)}€`;
}

/**
 * Generate a trip label based on type and addresses
 */
function generateTripLabel(quote: QuoteWithRelations): string {
	const tripTypeLabels: Record<TripType, string> = {
		TRANSFER: "Transfert",
		EXCURSION: "Excursion",
		DISPO: "Mise à disposition",
		OFF_GRID: "Sur mesure",
		STAY: "Séjour",
	};

	const typeLabel = tripTypeLabels[quote.tripType] || "Service";

	if (quote.tripType === "DISPO") {
		const hours = quote.durationHours ? Number(quote.durationHours) : 0;
		return `${typeLabel} ${hours}h`;
	}

	if (quote.tripType === "STAY" && quote.stayStartDate && quote.stayEndDate) {
		const start = new Date(quote.stayStartDate).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
		});
		const end = new Date(quote.stayEndDate).toLocaleDateString("fr-FR", {
			day: "2-digit",
			month: "short",
		});
		return `${typeLabel} du ${start} au ${end}`;
	}

	// Default: pickup → dropoff
	const pickup = quote.pickupAddress.split(",")[0].trim();
	const dropoff = quote.dropoffAddress?.split(",")[0].trim() || "Destination";

	if (quote.isRoundTrip) {
		return `${typeLabel} A/R ${pickup} ↔ ${dropoff}`;
	}

	return `${typeLabel} ${pickup} → ${dropoff}`;
}

/**
 * Build sourceData from Quote fields
 */
function buildSourceData(quote: QuoteWithRelations): QuoteLineSourceData {
	return {
		pricingMode: quote.pricingMode,
		tripType: quote.tripType,
		pickupAddress: quote.pickupAddress,
		pickupLatitude: quote.pickupLatitude ? Number(quote.pickupLatitude) : null,
		pickupLongitude: quote.pickupLongitude
			? Number(quote.pickupLongitude)
			: null,
		dropoffAddress: quote.dropoffAddress,
		dropoffLatitude: quote.dropoffLatitude
			? Number(quote.dropoffLatitude)
			: null,
		dropoffLongitude: quote.dropoffLongitude
			? Number(quote.dropoffLongitude)
			: null,
		distanceKm: quote.tripAnalysis
			? ((quote.tripAnalysis as { distanceKm?: number }).distanceKm ?? null)
			: null,
		durationMinutes: quote.tripAnalysis
			? ((quote.tripAnalysis as { durationMinutes?: number }).durationMinutes ??
				null)
			: null,
		internalCost: quote.internalCost ? Number(quote.internalCost) : null,
		suggestedPrice: quote.suggestedPrice ? Number(quote.suggestedPrice) : null,
		tripAnalysis: quote.tripAnalysis as object | null,
		costBreakdown: quote.costBreakdown as object | null,
		appliedRules: quote.appliedRules as object | null,
		isRoundTrip: quote.isRoundTrip,
		passengerCount: quote.passengerCount,
		luggageCount: quote.luggageCount,
		vehicleCategoryId: quote.vehicleCategoryId,
		migratedAt: new Date().toISOString(),
		migratedFrom: "legacy_quote",
	};
}

/**
 * Build displayData from Quote fields
 */
function buildDisplayData(
	label: string,
	description?: string,
): QuoteLineDisplayData {
	return {
		label,
		description,
		unitLabel: "prestation",
		showInPdf: true,
	};
}

// ============================================================================
// MIGRATION LOGIC
// ============================================================================

/**
 * Migrate a standard (non-STAY) quote to a single CALCULATED QuoteLine
 */
async function migrateStandardQuote(
	prisma: PrismaClient,
	quote: QuoteWithRelations,
	stats: MigrationStats,
	dryRun: boolean,
	verbose: boolean,
): Promise<void> {
	const label = generateTripLabel(quote);
	const sourceData = buildSourceData(quote);
	const displayData = buildDisplayData(label, quote.notes ?? undefined);

	const lineData = {
		quoteId: quote.id,
		type: QuoteLineType.CALCULATED,
		label,
		description: quote.notes ?? null,
		sourceData: sourceData as unknown as Prisma.InputJsonValue,
		displayData: displayData as unknown as Prisma.InputJsonValue,
		quantity: new Prisma.Decimal(1),
		unitPrice: quote.finalPrice,
		totalPrice: quote.finalPrice,
		vatRate: new Prisma.Decimal(10.0),
		sortOrder: 0,
	};

	if (verbose) {
		console.log(
			`   📝 Creating QuoteLine: "${label}" (${formatEur(quote.finalPrice)})`,
		);
	}

	if (!dryRun) {
		const line = await prisma.quoteLine.create({ data: lineData });
		stats.createdLines++;

		// Create Mission for this line
		const missionData = {
			organizationId: quote.organizationId,
			quoteId: quote.id,
			quoteLineId: line.id,
			status: MissionStatus.PENDING,
			startAt: quote.pickupAt,
			endAt: quote.estimatedEndAt ?? null,
			sourceData: sourceData as unknown as Prisma.InputJsonValue,
		};

		await prisma.mission.create({ data: missionData });
		stats.createdMissions++;

		if (verbose) {
			console.log(`   🚗 Created Mission for line ${line.id}`);
		}
	} else {
		stats.createdLines++;
		stats.createdMissions++;
	}
}

/**
 * Migrate a STAY quote to a nested GROUP structure
 *
 * Structure:
 * - ROOT GROUP: "Séjour Paris 3 jours"
 *   - DAY GROUP: "Jour 1 - 15 Jan"
 *     - CALCULATED: "Transfert CDG → Hôtel"
 *     - CALCULATED: "Mise à disposition 3h"
 *   - DAY GROUP: "Jour 2 - 16 Jan"
 *     - CALCULATED: "Excursion Versailles"
 *   - DAY GROUP: "Jour 3 - 17 Jan"
 *     - CALCULATED: "Transfert Hôtel → CDG"
 */
async function migrateStayQuote(
	prisma: PrismaClient,
	quote: QuoteWithRelations,
	stats: MigrationStats,
	dryRun: boolean,
	verbose: boolean,
): Promise<void> {
	// Sort stayDays by dayNumber
	const sortedDays = [...quote.stayDays].sort(
		(a, b) => a.dayNumber - b.dayNumber,
	);

	if (sortedDays.length === 0) {
		// No stay days - treat as standard quote
		console.log("   ⚠️ STAY quote has no stayDays, migrating as standard");
		await migrateStandardQuote(prisma, quote, stats, dryRun, verbose);
		return;
	}

	// Calculate total from services
	let calculatedTotal = 0;
	const daysData: Array<{
		dayNumber: number;
		date: Date;
		dayTotal: number;
		staffingCost: number;
		services: (typeof sortedDays)[0]["services"];
	}> = [];

	for (const day of sortedDays) {
		const dayServiceTotal = day.services.reduce(
			(sum, s) => sum + Number(s.serviceCost || 0),
			0,
		);
		const staffingCost =
			Number(day.hotelCost || 0) +
			Number(day.mealCost || 0) +
			Number(day.driverOvernightCost || 0);
		const dayTotal = dayServiceTotal + staffingCost;
		calculatedTotal += dayTotal;

		daysData.push({
			dayNumber: day.dayNumber,
			date: day.date,
			dayTotal,
			staffingCost,
			services: day.services,
		});
	}

	// Validate financial integrity
	const finalPrice = Number(quote.finalPrice);
	const diff = Math.abs(finalPrice - calculatedTotal);

	if (diff > FINANCIAL_TOLERANCE && calculatedTotal > 0) {
		// Discrepancy detected - log but continue with finalPrice allocation
		console.log(
			`   ⚠️ Financial discrepancy: finalPrice=${formatEur(finalPrice)}, calculated=${formatEur(calculatedTotal)}`,
		);
	}

	// Create ROOT GROUP
	const rootLabel = generateTripLabel(quote);
	const rootDisplayData = buildDisplayData(
		rootLabel,
		`Séjour ${sortedDays.length} jour(s)`,
	);

	if (verbose) {
		console.log(`   📁 Creating ROOT GROUP: "${rootLabel}"`);
	}

	let rootLine: { id: string } | undefined;
	let sortOrder = 0;

	if (!dryRun) {
		rootLine = await prisma.quoteLine.create({
			data: {
				quoteId: quote.id,
				type: QuoteLineType.GROUP,
				label: rootLabel,
				description: `Séjour ${sortedDays.length} jour(s)`,
				sourceData: null,
				displayData: rootDisplayData as unknown as Prisma.InputJsonValue,
				quantity: new Prisma.Decimal(1),
				unitPrice: quote.finalPrice,
				totalPrice: quote.finalPrice,
				vatRate: new Prisma.Decimal(10.0),
				sortOrder: sortOrder++,
			},
		});
		stats.createdLines++;
	} else {
		rootLine = { id: "dry-run-root" };
		stats.createdLines++;
	}

	// Create DAY GROUPs and CALCULATED services
	for (const dayData of daysData) {
		const dateStr = new Date(dayData.date).toLocaleDateString("fr-FR", {
			weekday: "short",
			day: "2-digit",
			month: "short",
		});
		const dayLabel = `Jour ${dayData.dayNumber} - ${dateStr}`;

		if (verbose) {
			console.log(
				`     📁 Creating DAY GROUP: "${dayLabel}" (${formatEur(dayData.dayTotal)})`,
			);
		}

		let dayLine: { id: string } | undefined;

		if (!dryRun) {
			dayLine = await prisma.quoteLine.create({
				data: {
					quoteId: quote.id,
					type: QuoteLineType.GROUP,
					label: dayLabel,
					description: null,
					sourceData: null,
					displayData: buildDisplayData(
						dayLabel,
					) as unknown as Prisma.InputJsonValue,
					quantity: new Prisma.Decimal(1),
					unitPrice: new Prisma.Decimal(dayData.dayTotal),
					totalPrice: new Prisma.Decimal(dayData.dayTotal),
					vatRate: new Prisma.Decimal(10.0),
					parentId: rootLine?.id,
					sortOrder: sortOrder++,
				},
			});
			stats.createdLines++;
		} else {
			dayLine = { id: `dry-run-day-${dayData.dayNumber}` };
			stats.createdLines++;
		}

		// Add staffing costs as a MANUAL line if present
		if (dayData.staffingCost > 0) {
			if (verbose) {
				console.log(
					`       📝 Creating MANUAL: "Frais journaliers" (${formatEur(dayData.staffingCost)})`,
				);
			}

			if (!dryRun) {
				await prisma.quoteLine.create({
					data: {
						quoteId: quote.id,
						type: QuoteLineType.MANUAL,
						label: "Frais journaliers (hébergement, repas)",
						description: null,
						sourceData: null,
						displayData: buildDisplayData(
							"Frais journaliers",
						) as unknown as Prisma.InputJsonValue,
						quantity: new Prisma.Decimal(1),
						unitPrice: new Prisma.Decimal(dayData.staffingCost),
						totalPrice: new Prisma.Decimal(dayData.staffingCost),
						vatRate: new Prisma.Decimal(10.0),
						parentId: dayLine?.id,
						sortOrder: sortOrder++,
					},
				});
				stats.createdLines++;
			} else {
				stats.createdLines++;
			}
		}

		// Create CALCULATED lines for each service
		const sortedServices = [...dayData.services].sort(
			(a, b) => a.serviceOrder - b.serviceOrder,
		);

		for (const service of sortedServices) {
			const serviceTypeLabels: Record<string, string> = {
				TRANSFER: "Transfert",
				DISPO: "Mise à disposition",
				EXCURSION: "Excursion",
			};

			const serviceLabel =
				serviceTypeLabels[service.serviceType] || service.serviceType;
			const pickup = service.pickupAddress.split(",")[0].trim();
			const dropoff = service.dropoffAddress?.split(",")[0].trim();

			let fullLabel = serviceLabel;
			if (service.serviceType === "TRANSFER" && dropoff) {
				fullLabel = `${serviceLabel} ${pickup} → ${dropoff}`;
			} else if (service.serviceType === "DISPO" && service.durationHours) {
				fullLabel = `${serviceLabel} ${Number(service.durationHours)}h`;
			} else if (service.serviceType === "EXCURSION") {
				fullLabel = `${serviceLabel} - ${pickup}`;
			}

			const serviceSourceData: QuoteLineSourceData = {
				pricingMode: quote.pricingMode,
				tripType: service.serviceType,
				pickupAddress: service.pickupAddress,
				pickupLatitude: service.pickupLatitude
					? Number(service.pickupLatitude)
					: null,
				pickupLongitude: service.pickupLongitude
					? Number(service.pickupLongitude)
					: null,
				dropoffAddress: service.dropoffAddress,
				dropoffLatitude: service.dropoffLatitude
					? Number(service.dropoffLatitude)
					: null,
				dropoffLongitude: service.dropoffLongitude
					? Number(service.dropoffLongitude)
					: null,
				distanceKm: service.distanceKm ? Number(service.distanceKm) : null,
				durationMinutes: service.durationMinutes ?? null,
				internalCost: service.serviceInternalCost
					? Number(service.serviceInternalCost)
					: null,
				suggestedPrice: null,
				tripAnalysis: service.tripAnalysis as object | null,
				costBreakdown: null,
				appliedRules: null,
				isRoundTrip: false,
				passengerCount: quote.passengerCount,
				luggageCount: quote.luggageCount,
				vehicleCategoryId: quote.vehicleCategoryId,
				migratedAt: new Date().toISOString(),
				migratedFrom: "legacy_quote",
			};

			if (verbose) {
				console.log(
					`       📝 Creating CALCULATED: "${fullLabel}" (${formatEur(service.serviceCost)})`,
				);
			}

			if (!dryRun) {
				const line = await prisma.quoteLine.create({
					data: {
						quoteId: quote.id,
						type: QuoteLineType.CALCULATED,
						label: fullLabel,
						description: service.notes ?? null,
						sourceData: serviceSourceData as unknown as Prisma.InputJsonValue,
						displayData: buildDisplayData(
							fullLabel,
						) as unknown as Prisma.InputJsonValue,
						quantity: new Prisma.Decimal(1),
						unitPrice: service.serviceCost,
						totalPrice: service.serviceCost,
						vatRate: new Prisma.Decimal(10.0),
						parentId: dayLine?.id,
						sortOrder: sortOrder++,
					},
				});
				stats.createdLines++;

				// Create Mission for this service
				await prisma.mission.create({
					data: {
						organizationId: quote.organizationId,
						quoteId: quote.id,
						quoteLineId: line.id,
						status: MissionStatus.PENDING,
						startAt: service.pickupAt,
						endAt: null,
						sourceData: serviceSourceData as unknown as Prisma.InputJsonValue,
					},
				});
				stats.createdMissions++;

				if (verbose) {
					console.log("       🚗 Created Mission for service");
				}
			} else {
				stats.createdLines++;
				stats.createdMissions++;
			}
		}
	}
}

/**
 * Main migration function
 */
async function migrateQuotes(
	dryRun: boolean,
	verbose: boolean,
): Promise<MigrationStats> {
	const prisma = new PrismaClient();
	const stats: MigrationStats = {
		totalQuotes: 0,
		migratedQuotes: 0,
		skippedQuotes: 0,
		createdLines: 0,
		createdMissions: 0,
		errors: 0,
		errorDetails: [],
	};

	try {
		// Count total quotes to migrate (those without lines)
		const quotesToMigrate = await prisma.quote.findMany({
			where: {
				lines: {
					none: {},
				},
			},
			include: {
				lines: true,
				stayDays: {
					include: {
						services: true,
					},
				},
				vehicleCategory: true,
				contact: true,
			},
			orderBy: {
				createdAt: "asc",
			},
		});

		stats.totalQuotes = quotesToMigrate.length;

		console.log(
			"\n╔════════════════════════════════════════════════════════════════╗",
		);
		console.log(
			"║          Story 26.2: Backward Compatibility Migration          ║",
		);
		console.log(
			"╠════════════════════════════════════════════════════════════════╣",
		);
		console.log(
			`║  Mode: ${dryRun ? "🔍 DRY RUN (no changes)" : "⚡ LIVE EXECUTION"}                              ║`,
		);
		console.log(
			`║  Quotes to migrate: ${stats.totalQuotes.toString().padEnd(41)}║`,
		);
		console.log(
			"╚════════════════════════════════════════════════════════════════╝\n",
		);

		if (stats.totalQuotes === 0) {
			console.log("✅ No quotes to migrate. All quotes already have lines.");
			return stats;
		}

		// Process in batches
		const batches = Math.ceil(stats.totalQuotes / BATCH_SIZE);

		for (let i = 0; i < batches; i++) {
			const start = i * BATCH_SIZE;
			const end = Math.min(start + BATCH_SIZE, stats.totalQuotes);
			const batch = quotesToMigrate.slice(start, end);

			console.log(
				`\n📦 Processing batch ${i + 1}/${batches} (quotes ${start + 1}-${end})...`,
			);

			for (const quote of batch) {
				try {
					// Skip if already has lines (idempotency check)
					if (quote.lines.length > 0) {
						stats.skippedQuotes++;
						if (verbose) {
							console.log(
								`   ⏭️ Skipping quote ${quote.id} (already has ${quote.lines.length} lines)`,
							);
						}
						continue;
					}

					console.log(`\n🔧 Migrating quote ${quote.id} (${quote.tripType})`);

					// Use transaction for each quote
					if (!dryRun) {
						await prisma.$transaction(async (tx) => {
							const txPrisma = tx as unknown as PrismaClient;

							if (quote.tripType === TripType.STAY) {
								await migrateStayQuote(txPrisma, quote, stats, false, verbose);
							} else {
								await migrateStandardQuote(
									txPrisma,
									quote,
									stats,
									false,
									verbose,
								);
							}
						});
					} else {
						// Dry run - just simulate
						if (quote.tripType === TripType.STAY) {
							await migrateStayQuote(prisma, quote, stats, true, verbose);
						} else {
							await migrateStandardQuote(prisma, quote, stats, true, verbose);
						}
					}

					stats.migratedQuotes++;
					console.log("   ✅ Migrated successfully");
				} catch (error) {
					stats.errors++;
					const errorMessage =
						error instanceof Error ? error.message : String(error);
					stats.errorDetails.push({ quoteId: quote.id, error: errorMessage });
					console.error(`   ❌ Error: ${errorMessage}`);
				}
			}
		}

		return stats;
	} finally {
		await prisma.$disconnect();
	}
}

// ============================================================================
// MAIN
// ============================================================================

async function main(): Promise<void> {
	const { dryRun, verbose } = parseArgs();

	console.log("\n🚀 Starting Yolo Blocks Migration...");
	console.log(`   Dry run: ${dryRun}`);
	console.log(`   Verbose: ${verbose}`);

	const startTime = Date.now();
	const stats = await migrateQuotes(dryRun, verbose);
	const duration = ((Date.now() - startTime) / 1000).toFixed(2);

	// Print summary
	console.log(
		"\n╔════════════════════════════════════════════════════════════════╗",
	);
	console.log(
		"║                     MIGRATION SUMMARY                          ║",
	);
	console.log(
		"╠════════════════════════════════════════════════════════════════╣",
	);
	console.log(
		`║  Total quotes found:      ${stats.totalQuotes.toString().padEnd(37)}║`,
	);
	console.log(
		`║  Successfully migrated:   ${stats.migratedQuotes.toString().padEnd(37)}║`,
	);
	console.log(
		`║  Skipped (already done):  ${stats.skippedQuotes.toString().padEnd(37)}║`,
	);
	console.log(
		`║  Errors:                  ${stats.errors.toString().padEnd(37)}║`,
	);
	console.log(
		"╠════════════════════════════════════════════════════════════════╣",
	);
	console.log(
		`║  QuoteLines created:      ${stats.createdLines.toString().padEnd(37)}║`,
	);
	console.log(
		`║  Missions created:        ${stats.createdMissions.toString().padEnd(37)}║`,
	);
	console.log(
		"╠════════════════════════════════════════════════════════════════╣",
	);
	console.log(`║  Duration:                ${(duration + "s").padEnd(37)}║`);
	console.log(
		"╚════════════════════════════════════════════════════════════════╝\n",
	);

	if (stats.errorDetails.length > 0) {
		console.log("\n❌ Errors encountered:");
		for (const { quoteId, error } of stats.errorDetails) {
			console.log(`   - Quote ${quoteId}: ${error}`);
		}
	}

	if (dryRun) {
		console.log(
			"\n💡 This was a DRY RUN. No changes were made to the database.",
		);
		console.log("   Run without --dry-run to apply changes.");
	} else {
		console.log("\n✅ Migration complete!");
	}

	process.exit(stats.errors > 0 ? 1 : 0);
}

main().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});

// ============================================================================
// EXPORTS (for testing)
// ============================================================================

export {
	generateTripLabel,
	buildSourceData,
	buildDisplayData,
	migrateQuotes,
	type QuoteLineSourceData,
	type QuoteLineDisplayData,
	type MigrationStats,
};
