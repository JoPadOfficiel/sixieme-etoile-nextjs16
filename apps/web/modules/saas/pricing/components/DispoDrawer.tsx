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
	DispoPackage,
	DispoPackageFormData,
	VehicleCategory,
} from "../types";
import { DispoForm } from "./DispoForm";

interface DispoDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	dispo?: DispoPackage | null;
	onSubmit: (data: DispoPackageFormData) => Promise<void>;
	isLoading?: boolean;
	vehicleCategories: VehicleCategory[];
}

export function DispoDrawer({
	open,
	onOpenChange,
	dispo,
	onSubmit,
	isLoading = false,
	vehicleCategories,
}: DispoDrawerProps) {
	const t = useTranslations();

	const handleSubmit = async (data: DispoPackageFormData) => {
		await onSubmit(data);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>
						{dispo ? t("dispos.editDispo") : t("dispos.addDispo")}
					</SheetTitle>
					<SheetDescription>
						{dispo
							? t("dispos.editDispoDescription")
							: t("dispos.addDispoDescription")}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<DispoForm
						key={dispo?.id ?? "new"}
						dispo={dispo}
						onSubmit={handleSubmit}
						onCancel={() => onOpenChange(false)}
						isLoading={isLoading}
						vehicleCategories={vehicleCategories}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
