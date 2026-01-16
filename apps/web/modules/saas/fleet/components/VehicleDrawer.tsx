"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { useTranslations } from "next-intl";
import { VehicleForm } from "./VehicleForm";
import type { VehicleWithRelations } from "../types";

interface VehicleDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	vehicle?: VehicleWithRelations | null;
}

export function VehicleDrawer({ open, onOpenChange, vehicle }: VehicleDrawerProps) {
	const t = useTranslations();

	const handleSuccess = () => {
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="w-full sm:max-w-[50vw] overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{vehicle ? t("fleet.vehicles.editVehicle") : t("fleet.vehicles.addVehicle")}
					</SheetTitle>
					<SheetDescription>
						{vehicle
							? t("fleet.vehicles.editVehicleDescription")
							: t("fleet.vehicles.addVehicleDescription")}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<VehicleForm
						vehicle={vehicle}
						onSuccess={handleSuccess}
						onCancel={handleCancel}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
