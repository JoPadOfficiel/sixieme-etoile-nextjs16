"use client";

import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@ui/components/sheet";
import { useTranslations } from "next-intl";
import type { PricingZone, PricingZoneFormData, ZoneType } from "../types";
import { ZoneForm } from "./ZoneForm";

interface ZoneDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	zone?: PricingZone | null;
	zones: PricingZone[];
	onSubmit: (data: PricingZoneFormData) => void;
	isSubmitting?: boolean;
	googleMapsApiKey?: string | null;
	initialZoneType?: ZoneType;
	initialCenterLatitude?: number | null;
	initialCenterLongitude?: number | null;
	initialRadiusKm?: number | null;
	initialGeometry?: unknown | null;
}

export function ZoneDrawer({
	open,
	onOpenChange,
	zone,
	zones,
	onSubmit,
	isSubmitting,
	googleMapsApiKey,
 	initialZoneType,
	initialCenterLatitude,
	initialCenterLongitude,
	initialRadiusKm,
	initialGeometry,
}: ZoneDrawerProps) {
	const t = useTranslations();
	const isEditing = !!zone;
	const formKey =
		zone?.id ??
		`new-${initialZoneType ?? ""}-${initialCenterLatitude ?? ""}-${initialCenterLongitude ?? ""}`;

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="sm:max-w-lg overflow-y-auto">
				<SheetHeader>
					<SheetTitle>
						{isEditing
							? t("pricing.zones.editZone")
							: t("pricing.zones.addZone")}
					</SheetTitle>
					<SheetDescription>
						{isEditing
							? t("pricing.zones.editZoneDescription")
							: t("pricing.zones.addZoneDescription")}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<ZoneForm
						key={formKey}
						zone={zone}
						zones={zones}
						onSubmit={onSubmit}
						onCancel={() => onOpenChange(false)}
						isSubmitting={isSubmitting}
						googleMapsApiKey={googleMapsApiKey}
						initialZoneType={initialZoneType}
						initialCenterLatitude={initialCenterLatitude}
						initialCenterLongitude={initialCenterLongitude}
						initialRadiusKm={initialRadiusKm}
						initialGeometry={initialGeometry}
					/>
				</div>
			</SheetContent>
		</Sheet>
	);
}
