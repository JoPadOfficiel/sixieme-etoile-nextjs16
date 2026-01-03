"use client";

/**
 * EditSubcontractorDialog Component
 * Story 22.4: Implement Complete Subcontracting System
 * Refactored: Subcontractor is now an independent company entity
 */

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Loader2Icon } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@ui/components/dialog";
import { Button } from "@ui/components/button";
import { useToast } from "@ui/hooks/use-toast";
import { useUpdateSubcontractor } from "@saas/dispatch/hooks/useSubcontracting";
import { SubcontractorForm } from "./SubcontractorForm";
import type { SubcontractorFormData, SubcontractorListItem } from "../types";

interface EditSubcontractorDialogProps {
	isOpen: boolean;
	onClose: () => void;
	subcontractor: SubcontractorListItem;
}

function getInitialFormData(subcontractor: SubcontractorListItem): SubcontractorFormData {
	return {
		companyName: subcontractor.companyName,
		siret: subcontractor.siret ?? undefined,
		vatNumber: subcontractor.vatNumber ?? undefined,
		contactName: subcontractor.contactName ?? undefined,
		email: subcontractor.email ?? undefined,
		phone: subcontractor.phone ?? undefined,
		address: subcontractor.address ?? undefined,
		allZones: subcontractor.allZones,
		operatingZoneIds: subcontractor.operatingZones.map((z) => z.id),
		vehicleCategoryIds: subcontractor.vehicleCategories.map((c) => c.id),
		ratePerKm: subcontractor.ratePerKm,
		ratePerHour: subcontractor.ratePerHour,
		minimumFare: subcontractor.minimumFare,
		notes: subcontractor.notes,
		isActive: subcontractor.isActive,
	};
}

export function EditSubcontractorDialog({
	isOpen,
	onClose,
	subcontractor,
}: EditSubcontractorDialogProps) {
	const t = useTranslations("subcontractors");
	const { toast } = useToast();

	const [formData, setFormData] = useState<SubcontractorFormData>(() =>
		getInitialFormData(subcontractor)
	);

	const updateMutation = useUpdateSubcontractor();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		try {
			await updateMutation.mutateAsync({
				subcontractorId: subcontractor.id,
				data: {
					companyName: formData.companyName,
					siret: formData.siret,
					vatNumber: formData.vatNumber,
					contactName: formData.contactName,
					email: formData.email,
					phone: formData.phone,
					address: formData.address,
					allZones: formData.allZones,
					operatingZoneIds: formData.operatingZoneIds,
					vehicleCategoryIds: formData.vehicleCategoryIds,
					ratePerKm: formData.ratePerKm,
					ratePerHour: formData.ratePerHour,
					minimumFare: formData.minimumFare,
					notes: formData.notes,
					isActive: formData.isActive,
				},
			});

			toast({
				title: t("toast.updateSuccess"),
			});

			onClose();
		} catch {
			toast({
				title: t("toast.error"),
				variant: "error",
			});
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={onClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{t("dialog.editTitle")}</DialogTitle>
						<DialogDescription>
							{subcontractor.companyName}
						</DialogDescription>
					</DialogHeader>

					<div className="py-4">
						<SubcontractorForm
							mode="edit"
							formData={formData}
							onChange={setFormData}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							{t("dialog.cancel")}
						</Button>
						<Button type="submit" disabled={updateMutation.isPending}>
							{updateMutation.isPending && (
								<Loader2Icon className="size-4 mr-2 animate-spin" />
							)}
							{t("dialog.save")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
