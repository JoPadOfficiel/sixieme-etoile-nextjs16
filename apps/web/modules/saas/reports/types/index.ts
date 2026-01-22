/**
 * Reports Types
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 */

export type ProfitabilityLevel = "green" | "orange" | "red";
export type GroupBy = "client" | "vehicleCategory" | "period" | "none";

export interface ProfitabilityReportSummary {
	totalRevenue: number;
	totalCost: number;
	avgMarginPercent: number;
	lossCount: number;
	totalCount: number;
	// Story 30.3: Payment tracking
	paidAmount: number;
	pendingAmount: number;
}

export interface ProfitabilityReportRow {
	id: string;
	groupKey: string | null;
	groupLabel: string | null;
	revenue: number;
	cost: number;
	marginPercent: number;
	profitabilityLevel: ProfitabilityLevel;
	count: number;
	invoiceId?: string;
	contactName?: string;
	invoiceNumber?: string;
	issueDate?: string;
}

export interface ProfitabilityReportResponse {
	summary: ProfitabilityReportSummary;
	data: ProfitabilityReportRow[];
}

export interface ReportFilters {
	dateFrom?: string;
	dateTo?: string;
	groupBy: GroupBy;
	profitabilityLevel: "all" | ProfitabilityLevel;
	contactId?: string;
	vehicleCategoryId?: string;
}
