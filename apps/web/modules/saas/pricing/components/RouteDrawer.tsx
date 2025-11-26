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
	PricingZone,
	VehicleCategory,
	ZoneRoute,
	ZoneRouteFormData,
} from "../types";
import { RouteForm } from "./RouteForm";

interface RouteDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	route?: ZoneRoute | null;
	onSubmit: (data: ZoneRouteFormData) => Promise<void>;
	isLoading?: boolean;
	zones: PricingZone[];
	vehicleCategories: VehicleCategory[];
}

export function RouteDrawer({
	open,
	onOpenChange,
	route,
	onSubmit,
	isLoading = false,
	zones,
	vehicleCategories,
}: RouteDrawerProps) {
	const t = useTranslations();

	const handleSubmit = async (data: ZoneRouteFormData) => {
		await onSubmit(data);
		onOpenChange(false);
	};

	return (
		<Sheet open={open} onOpenChange={onOpenChange}>
			<SheetContent className="overflow-y-auto sm:max-w-lg">
				<SheetHeader>
					<SheetTitle>
						{route ? t("routes.editRoute") : t("routes.addRoute")}
					</SheetTitle>
					<SheetDescription>
						{route
							? t("routes.editRouteDescription")
							: t("routes.addRouteDescription")}
					</SheetDescription>
				</SheetHeader>
				<div className="mt-6">
					<RouteForm
						key={route?.id ?? "new"}
						route={route}
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
