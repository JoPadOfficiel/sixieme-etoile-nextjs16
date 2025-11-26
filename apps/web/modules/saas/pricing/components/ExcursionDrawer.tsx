"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { useTranslations } from "next-intl";
import type {
	ExcursionPackage,
	ExcursionPackageFormData,
	PricingZone,
	VehicleCategory,
} from "../types";
import { ExcursionForm } from "./ExcursionForm";

interface ExcursionDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	excursion?: ExcursionPackage | null;
	onSubmit: (data: ExcursionPackageFormData) => Promise<void>;
	isLoading?: boolean;
	zones: PricingZone[];
	vehicleCategories: VehicleCategory[];
}

export function ExcursionDrawer({
	open,
	onOpenChange,
	excursion,
	onSubmit,
	isLoading = false,
	zones,
	vehicleCategories,
}: ExcursionDrawerProps) {
	const t = useTranslations();

	const handleSubmit = async (data: ExcursionPackageFormData) => {
		await onSubmit(data);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>
						{excursion
							? t("excursions.editExcursion")
							: t("excursions.addExcursion")}
					</SheetTitle>
					<SheetDescription>
						{excursion
							? t("excursions.editExcursionDescription")
							: t("excursions.addExcursionDescription")}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<ExcursionForm
						key={excursion?.id ?? "new"}
						excursion={excursion}
						onSubmit={handleSubmit}
						onCancel={() => onOpenChange(false)}
						isLoading={isLoading}
						zones={zones}
						vehicleCategories={vehicleCategories}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
