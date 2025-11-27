/**
 * Documents Page
 * Story 7.5: Document Generation & Storage
 *
 * Lists all generated documents (PDFs) for the organization.
 */

import { getTranslations } from "next-intl/server";
import { DocumentsTable } from "@saas/documents/components/DocumentsTable";

export async function generateMetadata() {
	const t = await getTranslations();
	return {
		title: t("documents.title"),
	};
}

export default async function DocumentsPage() {
	const t = await getTranslations();

	return (
		<div className="container py-6 space-y-6">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-bold">{t("documents.title")}</h1>
				<p className="text-muted-foreground mt-1">
					{t("documents.description")}
				</p>
			</div>

			{/* Documents Table */}
			<DocumentsTable />
		</div>
	);
}
