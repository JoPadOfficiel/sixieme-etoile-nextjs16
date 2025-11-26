"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { useTranslations } from "next-intl";
import { DriverForm } from "./DriverForm";
import type { DriverWithLicenses } from "../types";

interface DriverDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	driver?: DriverWithLicenses | null;
}

export function DriverDrawer({ open, onOpenChange, driver }: DriverDrawerProps) {
	const t = useTranslations();

	const handleSuccess = () => {
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-xl overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{driver ? t("fleet.drivers.editDriver") : t("fleet.drivers.addDriver")}
					</SheetTitle>
					<SheetDescription>
						{driver
							? t("fleet.drivers.editDriverDescription")
							: t("fleet.drivers.addDriverDescription")}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<DriverForm
						driver={driver}
						onSuccess={handleSuccess}
						onCancel={handleCancel}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
