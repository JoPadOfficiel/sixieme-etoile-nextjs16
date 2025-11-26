/**
 * RSE Counter Service (Story 5.5)
 *
 * Tracks RSE (Règlement Social Européen) counters per driver, per day, per regulatory regime.
 * Supports multi-licence drivers operating under different rules in the same day (FR49).
 * Logs compliance decisions for audit purposes (FR30).
 */

import type { ComplianceViolation, ComplianceWarning, RSERules } from "./compliance-validator";
import { minutesToHours, DEFAULT_HEAVY_VEHICLE_RSE_RULES } from "./compliance-validator";
import type { db as DbType } from "@repo/database";

// Re-export types from Prisma for convenience
type PrismaDb = typeof DbType;
type DriverRSECounter = Awaited<ReturnType<PrismaDb["driverRSECounter"]["findFirst"]>>;
type ComplianceAuditLog = Awaited<ReturnType<PrismaDb["complianceAuditLog"]["findFirst"]>>;

// ============================================================================
// Types
// ============================================================================

export type RegulatoryCategory = "LIGHT" | "HEAVY";

export type ComplianceDecision = "APPROVED" | "BLOCKED" | "WARNING";

/**
 * Input for recording driving activity
 */
export interface RecordActivityInput {
	organizationId: string;
	driverId: string;
	date: Date;
	regulatoryCategory: RegulatoryCategory;
	licenseCategoryId?: string;
	drivingMinutes: number;
	amplitudeMinutes?: number;
	breakMinutes?: number;
	workStartTime?: Date;
	workEndTime?: Date;
}

/**
 * Input for logging compliance decision
 */
export interface LogDecisionInput {
	organizationId: string;
	driverId: string;
	quoteId?: string;
	missionId?: string;
	vehicleCategoryId?: string;
	regulatoryCategory: RegulatoryCategory;
	decision: ComplianceDecision;
	violations?: ComplianceViolation[];
	warnings?: ComplianceWarning[];
	reason: string;
	countersSnapshot?: DriverRSECounterData;
}

/**
 * Counter data without Prisma metadata
 */
export interface DriverRSECounterData {
	drivingMinutes: number;
	amplitudeMinutes: number;
	breakMinutes: number;
	restMinutes: number;
	workStartTime?: Date | null;
	workEndTime?: Date | null;
}

/**
 * Compliance snapshot for UI display
 */
export interface ComplianceSnapshot {
	date: Date;
	counters: {
		light: DriverRSECounter | null;
		heavy: DriverRSECounter | null;
	};
	limits: {
		light: RSERules | null;
		heavy: RSERules | null;
	};
	status: {
		light: "OK" | "WARNING" | "VIOLATION";
		heavy: "OK" | "WARNING" | "VIOLATION";
	};
}

/**
 * Result of cumulative compliance check
 */
export interface CumulativeComplianceResult {
	isCompliant: boolean;
	currentCounters: DriverRSECounterData;
	projectedCounters: DriverRSECounterData;
	violations: ComplianceViolation[];
	warnings: ComplianceWarning[];
	rules: RSERules | null;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the start of day for a given date (Europe/Paris business time)
 * Since we store dates without timezone conversion, we just normalize to midnight
 */
export function getBusinessDate(date: Date): Date {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

/**
 * Calculate compliance status from counters and rules
 */
export function calculateComplianceStatus(
	counter: DriverRSECounterData | null,
	rules: RSERules | null,
): "OK" | "WARNING" | "VIOLATION" {
	if (!counter || !rules) {
		return "OK";
	}

	const drivingHours = minutesToHours(counter.drivingMinutes);
	const amplitudeHours = minutesToHours(counter.amplitudeMinutes);

	// Check for violations
	if (drivingHours > rules.maxDailyDrivingHours) {
		return "VIOLATION";
	}
	if (amplitudeHours > rules.maxDailyAmplitudeHours) {
		return "VIOLATION";
	}

	// Check for warnings (90% threshold)
	const WARNING_THRESHOLD = 0.9;
	if (drivingHours >= rules.maxDailyDrivingHours * WARNING_THRESHOLD) {
		return "WARNING";
	}
	if (amplitudeHours >= rules.maxDailyAmplitudeHours * WARNING_THRESHOLD) {
		return "WARNING";
	}

	return "OK";
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get all RSE counters for a driver on a specific date
 */
export async function getDriverCounters(
	prisma: PrismaDb,
	organizationId: string,
	driverId: string,
	date: Date,
): Promise<DriverRSECounter[]> {
	const businessDate = getBusinessDate(date);

	return prisma.driverRSECounter.findMany({
		where: {
			organizationId,
			driverId,
			date: businessDate,
		},
		include: {
			licenseCategory: true,
		},
	});
}

/**
 * Get RSE counter for a specific regulatory regime
 */
export async function getDriverCounterByRegime(
	prisma: PrismaDb,
	organizationId: string,
	driverId: string,
	date: Date,
	regulatoryCategory: RegulatoryCategory,
): Promise<DriverRSECounter | null> {
	const businessDate = getBusinessDate(date);

	return prisma.driverRSECounter.findUnique({
		where: {
			organizationId_driverId_date_regulatoryCategory: {
				organizationId,
				driverId,
				date: businessDate,
				regulatoryCategory,
			},
		},
		include: {
			licenseCategory: true,
		},
	});
}

/**
 * Record driving activity - creates or updates counter
 */
export async function recordDrivingActivity(
	prisma: PrismaDb,
	input: RecordActivityInput,
): Promise<DriverRSECounter> {
	const businessDate = getBusinessDate(input.date);

	// Upsert the counter
	return prisma.driverRSECounter.upsert({
		where: {
			organizationId_driverId_date_regulatoryCategory: {
				organizationId: input.organizationId,
				driverId: input.driverId,
				date: businessDate,
				regulatoryCategory: input.regulatoryCategory,
			},
		},
		create: {
			organizationId: input.organizationId,
			driverId: input.driverId,
			date: businessDate,
			regulatoryCategory: input.regulatoryCategory,
			licenseCategoryId: input.licenseCategoryId,
			drivingMinutes: input.drivingMinutes,
			amplitudeMinutes: input.amplitudeMinutes ?? input.drivingMinutes,
			breakMinutes: input.breakMinutes ?? 0,
			restMinutes: 0,
			workStartTime: input.workStartTime,
			workEndTime: input.workEndTime,
		},
		update: {
			drivingMinutes: {
				increment: input.drivingMinutes,
			},
			amplitudeMinutes: {
				increment: input.amplitudeMinutes ?? input.drivingMinutes,
			},
			breakMinutes: {
				increment: input.breakMinutes ?? 0,
			},
			// Update work period if provided
			...(input.workStartTime && {
				workStartTime: input.workStartTime,
			}),
			...(input.workEndTime && {
				workEndTime: input.workEndTime,
			}),
		},
		include: {
			licenseCategory: true,
		},
	});
}

/**
 * Load RSE rules for a regulatory category
 */
export async function loadRSERulesForCategory(
	prisma: PrismaDb,
	organizationId: string,
	regulatoryCategory: RegulatoryCategory,
	licenseCategoryId?: string,
): Promise<RSERules | null> {
	// For LIGHT vehicles, no RSE rules apply
	if (regulatoryCategory === "LIGHT") {
		return null;
	}

	// Try to find org-specific rules
	if (licenseCategoryId) {
		const rule = await prisma.organizationLicenseRule.findUnique({
			where: {
				organizationId_licenseCategoryId: {
					organizationId,
					licenseCategoryId,
				},
			},
			include: {
				licenseCategory: true,
			},
		});

		if (rule) {
			return {
				licenseCategoryId: rule.licenseCategoryId,
				licenseCategoryCode: rule.licenseCategory.code,
				maxDailyDrivingHours: Number(rule.maxDailyDrivingHours),
				maxDailyAmplitudeHours: Number(rule.maxDailyAmplitudeHours),
				breakMinutesPerDrivingBlock: rule.breakMinutesPerDrivingBlock,
				drivingBlockHoursForBreak: Number(rule.drivingBlockHoursForBreak),
				cappedAverageSpeedKmh: rule.cappedAverageSpeedKmh,
			};
		}
	}

	// Find any heavy vehicle rule for this org
	const heavyRule = await prisma.organizationLicenseRule.findFirst({
		where: {
			organizationId,
			cappedAverageSpeedKmh: { not: null }, // Heavy vehicles have speed cap
		},
		include: {
			licenseCategory: true,
		},
	});

	if (heavyRule) {
		return {
			licenseCategoryId: heavyRule.licenseCategoryId,
			licenseCategoryCode: heavyRule.licenseCategory.code,
			maxDailyDrivingHours: Number(heavyRule.maxDailyDrivingHours),
			maxDailyAmplitudeHours: Number(heavyRule.maxDailyAmplitudeHours),
			breakMinutesPerDrivingBlock: heavyRule.breakMinutesPerDrivingBlock,
			drivingBlockHoursForBreak: Number(heavyRule.drivingBlockHoursForBreak),
			cappedAverageSpeedKmh: heavyRule.cappedAverageSpeedKmh,
		};
	}

	// Return defaults for heavy vehicles
	return {
		licenseCategoryId: "default",
		licenseCategoryCode: "DEFAULT",
		...DEFAULT_HEAVY_VEHICLE_RSE_RULES,
	};
}

/**
 * Check cumulative compliance before adding new activity
 */
export async function checkCumulativeCompliance(
	prisma: PrismaDb,
	organizationId: string,
	driverId: string,
	date: Date,
	additionalDrivingMinutes: number,
	additionalAmplitudeMinutes: number,
	regulatoryCategory: RegulatoryCategory,
	licenseCategoryId?: string,
): Promise<CumulativeComplianceResult> {
	// Get current counters
	const currentCounter = await getDriverCounterByRegime(
		prisma,
		organizationId,
		driverId,
		date,
		regulatoryCategory,
	);

	const currentCounters: DriverRSECounterData = currentCounter
		? {
				drivingMinutes: currentCounter.drivingMinutes,
				amplitudeMinutes: currentCounter.amplitudeMinutes,
				breakMinutes: currentCounter.breakMinutes,
				restMinutes: currentCounter.restMinutes,
				workStartTime: currentCounter.workStartTime,
				workEndTime: currentCounter.workEndTime,
			}
		: {
				drivingMinutes: 0,
				amplitudeMinutes: 0,
				breakMinutes: 0,
				restMinutes: 0,
				workStartTime: null,
				workEndTime: null,
			};

	// Calculate projected counters
	const projectedCounters: DriverRSECounterData = {
		...currentCounters,
		drivingMinutes: currentCounters.drivingMinutes + additionalDrivingMinutes,
		amplitudeMinutes: currentCounters.amplitudeMinutes + additionalAmplitudeMinutes,
	};

	// Load RSE rules
	const rules = await loadRSERulesForCategory(
		prisma,
		organizationId,
		regulatoryCategory,
		licenseCategoryId,
	);

	// For LIGHT vehicles, no compliance check needed
	if (regulatoryCategory === "LIGHT" || !rules) {
		return {
			isCompliant: true,
			currentCounters,
			projectedCounters,
			violations: [],
			warnings: [],
			rules: null,
		};
	}

	// Check compliance
	const violations: ComplianceViolation[] = [];
	const warnings: ComplianceWarning[] = [];

	const projectedDrivingHours = minutesToHours(projectedCounters.drivingMinutes);
	const projectedAmplitudeHours = minutesToHours(projectedCounters.amplitudeMinutes);

	// Check driving time
	if (projectedDrivingHours > rules.maxDailyDrivingHours) {
		violations.push({
			type: "DRIVING_TIME_EXCEEDED",
			message: `Cumulative driving time (${projectedDrivingHours}h) would exceed maximum (${rules.maxDailyDrivingHours}h)`,
			actual: projectedDrivingHours,
			limit: rules.maxDailyDrivingHours,
			unit: "hours",
			severity: "BLOCKING",
		});
	} else if (projectedDrivingHours >= rules.maxDailyDrivingHours * 0.9) {
		warnings.push({
			type: "APPROACHING_LIMIT",
			message: `Cumulative driving time (${projectedDrivingHours}h) approaching limit (${rules.maxDailyDrivingHours}h)`,
			actual: projectedDrivingHours,
			limit: rules.maxDailyDrivingHours,
			percentOfLimit: Math.round((projectedDrivingHours / rules.maxDailyDrivingHours) * 100),
		});
	}

	// Check amplitude
	if (projectedAmplitudeHours > rules.maxDailyAmplitudeHours) {
		violations.push({
			type: "AMPLITUDE_EXCEEDED",
			message: `Cumulative amplitude (${projectedAmplitudeHours}h) would exceed maximum (${rules.maxDailyAmplitudeHours}h)`,
			actual: projectedAmplitudeHours,
			limit: rules.maxDailyAmplitudeHours,
			unit: "hours",
			severity: "BLOCKING",
		});
	} else if (projectedAmplitudeHours >= rules.maxDailyAmplitudeHours * 0.9) {
		warnings.push({
			type: "APPROACHING_LIMIT",
			message: `Cumulative amplitude (${projectedAmplitudeHours}h) approaching limit (${rules.maxDailyAmplitudeHours}h)`,
			actual: projectedAmplitudeHours,
			limit: rules.maxDailyAmplitudeHours,
			percentOfLimit: Math.round((projectedAmplitudeHours / rules.maxDailyAmplitudeHours) * 100),
		});
	}

	return {
		isCompliant: violations.length === 0,
		currentCounters,
		projectedCounters,
		violations,
		warnings,
		rules,
	};
}

/**
 * Log a compliance decision for audit
 */
export async function logComplianceDecision(
	prisma: PrismaDb,
	input: LogDecisionInput,
): Promise<ComplianceAuditLog> {
	return prisma.complianceAuditLog.create({
		data: {
			organizationId: input.organizationId,
			driverId: input.driverId,
			quoteId: input.quoteId,
			missionId: input.missionId,
			vehicleCategoryId: input.vehicleCategoryId,
			regulatoryCategory: input.regulatoryCategory,
			decision: input.decision,
			violations: input.violations ? JSON.parse(JSON.stringify(input.violations)) : null,
			warnings: input.warnings ? JSON.parse(JSON.stringify(input.warnings)) : null,
			reason: input.reason,
			countersSnapshot: input.countersSnapshot
				? JSON.parse(JSON.stringify(input.countersSnapshot))
				: null,
		},
	});
}

/**
 * Get recent audit logs for a driver
 */
export async function getRecentAuditLogs(
	prisma: PrismaDb,
	organizationId: string,
	driverId: string,
	limit: number = 10,
): Promise<ComplianceAuditLog[]> {
	return prisma.complianceAuditLog.findMany({
		where: {
			organizationId,
			driverId,
		},
		orderBy: {
			timestamp: "desc",
		},
		take: limit,
	});
}

/**
 * Get compliance snapshot for a driver (for UI display)
 */
export async function getComplianceSnapshot(
	prisma: PrismaDb,
	organizationId: string,
	driverId: string,
	date: Date,
): Promise<ComplianceSnapshot> {
	const businessDate = getBusinessDate(date);

	// Get counters for both regimes
	const [lightCounter, heavyCounter] = await Promise.all([
		getDriverCounterByRegime(prisma, organizationId, driverId, date, "LIGHT"),
		getDriverCounterByRegime(prisma, organizationId, driverId, date, "HEAVY"),
	]);

	// Get rules for heavy vehicles
	const heavyRules = await loadRSERulesForCategory(prisma, organizationId, "HEAVY");

	// Calculate status
	const lightStatus = calculateComplianceStatus(
		lightCounter
			? {
					drivingMinutes: lightCounter.drivingMinutes,
					amplitudeMinutes: lightCounter.amplitudeMinutes,
					breakMinutes: lightCounter.breakMinutes,
					restMinutes: lightCounter.restMinutes,
					workStartTime: lightCounter.workStartTime,
					workEndTime: lightCounter.workEndTime,
				}
			: null,
		null, // LIGHT has no RSE rules
	);

	const heavyStatus = calculateComplianceStatus(
		heavyCounter
			? {
					drivingMinutes: heavyCounter.drivingMinutes,
					amplitudeMinutes: heavyCounter.amplitudeMinutes,
					breakMinutes: heavyCounter.breakMinutes,
					restMinutes: heavyCounter.restMinutes,
					workStartTime: heavyCounter.workStartTime,
					workEndTime: heavyCounter.workEndTime,
				}
			: null,
		heavyRules,
	);

	return {
		date: businessDate,
		counters: {
			light: lightCounter,
			heavy: heavyCounter,
		},
		limits: {
			light: null, // LIGHT has no RSE limits
			heavy: heavyRules,
		},
		status: {
			light: lightStatus,
			heavy: heavyStatus,
		},
	};
}

/**
 * Reset counters for a driver on a specific date (for testing/admin)
 */
export async function resetDriverCounters(
	prisma: PrismaDb,
	organizationId: string,
	driverId: string,
	date: Date,
): Promise<void> {
	const businessDate = getBusinessDate(date);

	await prisma.driverRSECounter.deleteMany({
		where: {
			organizationId,
			driverId,
			date: businessDate,
		},
	});
}
