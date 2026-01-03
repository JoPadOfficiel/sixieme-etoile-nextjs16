"use client";

/**
 * SubcontractorsTable Component
 * Story 22.4: Implement Complete Subcontracting System
 */

import { useTranslations } from "next-intl";
import {
	Table,
	TableBody,
	TableHead,
	TableHeader,
	TableRow,
} from "@ui/components/table";
import { SubcontractorRow } from "./SubcontractorRow";
import type { SubcontractorListItem } from "../types";

interface SubcontractorsTableProps {
	subcontractors: SubcontractorListItem[];
}

export function SubcontractorsTable({ subcontractors }: SubcontractorsTableProps) {
	const t = useTranslations("subcontractors");

	if (subcontractors.length === 0) {
		return (
			<div className="text-center py-12">
				<p className="text-lg font-medium text-muted-foreground">
					{t("table.noSubcontractors")}
				</p>
				<p className="text-sm text-muted-foreground mt-1">
					{t("table.noSubcontractorsDescription")}
				</p>
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>{t("table.name")}</TableHead>
					<TableHead>{t("table.contact")}</TableHead>
					<TableHead>{t("table.operatingZones")}</TableHead>
					<TableHead>{t("table.vehicleCategories")}</TableHead>
					<TableHead>{t("table.rates")}</TableHead>
					<TableHead>{t("table.status")}</TableHead>
					<TableHead className="w-[100px]">{t("table.actions")}</TableHead>
				</TableRow>
			</TableHeader>
			<TableBody>
				{subcontractors.map((subcontractor) => (
					<SubcontractorRow key={subcontractor.id} subcontractor={subcontractor} />
				))}
			</TableBody>
		</Table>
	);
}
