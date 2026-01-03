import { getTranslations } from "next-intl/server";
import { ProfitabilityReport } from "@saas/reports/components";

/**
 * Reports Page
 *
 * Story 9.8: Basic Profitability & Yield Reporting
 *
 * Main reports page displaying profitability analytics.
 */

export async function generateMetadata() {
	const t = await getTranslations("reports");
	return {
		title: t("title"),
	};
}

export default async function ReportsPage() {
	const t = await getTranslations("reports");

	return (
		<div className="py-4 space-y-6">
			<div>
				<h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
				<p className="text-muted-foreground">{t("description")}</p>
			</div>

			<ProfitabilityReport />
		</div>
	);
}
