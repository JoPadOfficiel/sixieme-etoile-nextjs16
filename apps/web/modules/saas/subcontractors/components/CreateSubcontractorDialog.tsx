"use client";

/**
 * CreateSubcontractorDialog Component
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
import { useCreateSubcontractor } from "@saas/dispatch/hooks/useSubcontracting";
import { SubcontractorForm } from "./SubcontractorForm";
import type { SubcontractorFormData } from "../types";

interface CreateSubcontractorDialogProps {
	isOpen: boolean;
	onClose: () => void;
}

const initialFormData: SubcontractorFormData = {
	companyName: "",
	allZones: false,
	operatingZoneIds: [],
	vehicleCategoryIds: [],
	ratePerKm: null,
	ratePerHour: null,
	minimumFare: null,
	notes: null,
};

export function CreateSubcontractorDialog({
	isOpen,
	onClose,
}: CreateSubcontractorDialogProps) {
	const t = useTranslations("subcontractors");
	const { toast } = useToast();
	const [formData, setFormData] = useState<SubcontractorFormData>(initialFormData);

	const createMutation = useCreateSubcontractor();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!formData.companyName.trim()) {
			toast({
				title: t("form.companyNameRequired"),
				variant: "error",
			});
			return;
		}

		try {
			await createMutation.mutateAsync({
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
				ratePerKm: formData.ratePerKm ?? undefined,
				ratePerHour: formData.ratePerHour ?? undefined,
				minimumFare: formData.minimumFare ?? undefined,
				notes: formData.notes ?? undefined,
			});

			toast({
				title: t("toast.createSuccess"),
			});

			handleClose();
		} catch {
			toast({
				title: t("toast.error"),
				variant: "error",
			});
		}
	};

	const handleClose = () => {
		setFormData(initialFormData);
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
				<form onSubmit={handleSubmit}>
					<DialogHeader>
						<DialogTitle>{t("dialog.createTitle")}</DialogTitle>
						<DialogDescription>
							{t("description")}
						</DialogDescription>
					</DialogHeader>

					<div className="py-4">
						<SubcontractorForm
							mode="create"
							formData={formData}
							onChange={setFormData}
						/>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={handleClose}>
							{t("dialog.cancel")}
						</Button>
						<Button
							type="submit"
							disabled={createMutation.isPending || !formData.companyName.trim()}
						>
							{createMutation.isPending && (
								<Loader2Icon className="size-4 mr-2 animate-spin" />
							)}
							{t("dialog.create")}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
