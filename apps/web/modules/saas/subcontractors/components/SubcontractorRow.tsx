"use client";

/**
 * SubcontractorRow Component
 * Story 22.4: Implement Complete Subcontracting System
 * Refactored: Subcontractor is now an independent company entity
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PencilIcon, TrashIcon, MailIcon, PhoneIcon, GlobeIcon } from "lucide-react";
import { TableCell, TableRow } from "@ui/components/table";
import { Badge } from "@ui/components/badge";
import { Button } from "@ui/components/button";
import { EditSubcontractorDialog } from "./EditSubcontractorDialog";
import { DeleteSubcontractorDialog } from "./DeleteSubcontractorDialog";
import type { SubcontractorListItem } from "../types";

interface SubcontractorRowProps {
	subcontractor: SubcontractorListItem;
}

export function SubcontractorRow({ subcontractor }: SubcontractorRowProps) {
	const t = useTranslations("subcontractors");
	const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
	const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

	const { companyName, contactName, email, phone, allZones, operatingZones, vehicleCategories, ratePerKm, ratePerHour, minimumFare, isActive } = subcontractor;

	return (
		<>
			<TableRow>
				{/* Company Name */}
				<TableCell>
					<div className="font-medium">{companyName}</div>
					{contactName && (
						<div className="text-sm text-muted-foreground">{contactName}</div>
					)}
				</TableCell>

				{/* Contact */}
				<TableCell>
					<div className="space-y-1">
						{email && (
							<div className="flex items-center gap-1 text-sm text-muted-foreground">
								<MailIcon className="size-3" />
								<a href={`mailto:${email}`} className="hover:underline">
									{email}
								</a>
							</div>
						)}
						{phone && (
							<div className="flex items-center gap-1 text-sm text-muted-foreground">
								<PhoneIcon className="size-3" />
								<a href={`tel:${phone}`} className="hover:underline">
									{phone}
								</a>
							</div>
						)}
					</div>
				</TableCell>

				{/* Operating Zones */}
				<TableCell>
					<div className="flex flex-wrap gap-1 max-w-[200px]">
						{allZones ? (
							<Badge variant="default" className="text-xs gap-1">
								<GlobeIcon className="size-3" />
								{t("allZones")}
							</Badge>
						) : operatingZones.length === 0 ? (
							<span className="text-sm text-muted-foreground">-</span>
						) : (
							operatingZones.slice(0, 3).map((zone) => (
								<Badge key={zone.id} variant="outline" className="text-xs">
									{zone.code}
								</Badge>
							))
						)}
						{operatingZones.length > 3 && (
							<Badge variant="secondary" className="text-xs">
								+{operatingZones.length - 3}
							</Badge>
						)}
					</div>
				</TableCell>

				{/* Vehicle Categories */}
				<TableCell>
					<div className="flex flex-wrap gap-1 max-w-[150px]">
						{vehicleCategories.length === 0 ? (
							<span className="text-sm text-muted-foreground">-</span>
						) : (
							vehicleCategories.slice(0, 2).map((cat) => (
								<Badge key={cat.id} variant="outline" className="text-xs">
									{cat.code}
								</Badge>
							))
						)}
						{vehicleCategories.length > 2 && (
							<Badge variant="secondary" className="text-xs">
								+{vehicleCategories.length - 2}
							</Badge>
						)}
					</div>
				</TableCell>

				{/* Rates */}
				<TableCell>
					<div className="space-y-0.5 text-sm">
						{ratePerKm && (
							<div>{t("rates.perKm", { rate: ratePerKm.toFixed(2) })}</div>
						)}
						{ratePerHour && (
							<div>{t("rates.perHour", { rate: ratePerHour.toFixed(2) })}</div>
						)}
						{minimumFare && (
							<div className="text-muted-foreground">
								{t("rates.minimum", { rate: minimumFare.toFixed(2) })}
							</div>
						)}
						{!ratePerKm && !ratePerHour && !minimumFare && (
							<span className="text-muted-foreground">-</span>
						)}
					</div>
				</TableCell>

				{/* Status */}
				<TableCell>
					<Badge variant={isActive ? "default" : "secondary"}>
						{isActive ? t("status.active") : t("status.inactive")}
					</Badge>
				</TableCell>

				{/* Actions */}
				<TableCell>
					<div className="flex items-center gap-1">
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsEditDialogOpen(true)}
						>
							<PencilIcon className="size-4" />
						</Button>
						<Button
							variant="ghost"
							size="sm"
							onClick={() => setIsDeleteDialogOpen(true)}
						>
							<TrashIcon className="size-4 text-destructive" />
						</Button>
					</div>
				</TableCell>
			</TableRow>

			{/* Edit Dialog */}
			<EditSubcontractorDialog
				isOpen={isEditDialogOpen}
				onClose={() => setIsEditDialogOpen(false)}
				subcontractor={subcontractor}
			/>

			{/* Delete Dialog */}
			<DeleteSubcontractorDialog
				isOpen={isDeleteDialogOpen}
				onClose={() => setIsDeleteDialogOpen(false)}
				subcontractor={subcontractor}
			/>
		</>
	);
}
