/**
 * ExportScheduleButton Component
 *
 * Story 27.14: Export Schedule
 *
 * Button to trigger the PDF export of the daily schedule.
 * Uses @react-pdf/renderer's PDFDownloadLink for client-side generation.
 */

"use client";

import { PDFDownloadLink } from "@react-pdf/renderer";
import { useActiveOrganization } from "@saas/organizations/hooks/use-active-organization";
import { Button } from "@ui/components/button";
import { PrinterIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import type { GanttDriver } from "./gantt/types";
import {
	SchedulePdfDocument,
	type SchedulePdfTranslations,
} from "./pdf/SchedulePdfDocument";

interface ExportScheduleButtonProps {
	drivers: GanttDriver[];
	selectedDate: Date;
	className?: string;
}

export function ExportScheduleButton({
	drivers,
	selectedDate,
	className,
}: ExportScheduleButtonProps) {
	const t = useTranslations("dispatch.export");
	const { activeOrganization } = useActiveOrganization();

	// Prepare translations object for the PDF (server-component compatible way)
	const pdfTranslations: SchedulePdfTranslations = {
		title: t("pdf.title"),
		date: t("pdf.date"),
		generatedAt: t("pdf.generatedAt"),
		driver: t("pdf.driver"),
		departure: t("pdf.departure"),
		arrival: t("pdf.arrival"),
		pickup: t("pdf.pickup"),
		dropoff: t("pdf.dropoff"),
		client: t("pdf.client"),
		noMissions: t("pdf.noMissions"),
		noMissionsForDriver: t("pdf.noMissionsForDriver"),
		page: t("pdf.page"),
		of: t("pdf.of"),
	};

	// Organization name from context
	const organizationName = activeOrganization?.name || "Organisation";

	return (
		<PDFDownloadLink
			document={
				<SchedulePdfDocument
					drivers={drivers}
					date={selectedDate}
					organizationName={organizationName}
					translations={pdfTranslations}
				/>
			}
			fileName={`planning-${selectedDate.toISOString().split("T")[0]}.pdf`}
		>
			{({ loading }: { loading: boolean }) => (
				<Button
					variant="outline"
					size="sm"
					className={className}
					disabled={loading}
				>
					<PrinterIcon className="mr-2 h-4 w-4" />
					{loading ? t("generating") : t("buttonLabel")}
				</Button>
			)}
		</PDFDownloadLink>
	);
}
