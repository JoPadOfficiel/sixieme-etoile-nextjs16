"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { useTranslations } from "next-intl";
import { BaseForm } from "./BaseForm";
import type { OperatingBaseWithCount } from "../types";

interface BaseDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	base?: OperatingBaseWithCount | null;
}

export function BaseDrawer({ open, onOpenChange, base }: BaseDrawerProps) {
	const t = useTranslations();

	const handleSuccess = () => {
		onOpenChange(false);
	};

	const handleCancel = () => {
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{base ? t("fleet.bases.editBase") : t("fleet.bases.addBase")}
					</SheetTitle>
					<SheetDescription>
						{base
							? t("fleet.bases.editBaseDescription")
							: t("fleet.bases.addBaseDescription")}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<BaseForm
						base={base}
						onSuccess={handleSuccess}
						onCancel={handleCancel}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
