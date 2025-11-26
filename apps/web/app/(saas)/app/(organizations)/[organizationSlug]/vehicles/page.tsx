"use client";

import { VehiclesTable, VehicleDrawer } from "@saas/fleet/components";
import type { VehicleWithRelations } from "@saas/fleet/types";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function VehiclesPage() {
	const t = useTranslations();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithRelations | null>(null);

	const handleAddVehicle = () => {
		setSelectedVehicle(null);
		setDrawerOpen(true);
	};

	const handleEditVehicle = (vehicle: VehicleWithRelations) => {
		setSelectedVehicle(vehicle);
		setDrawerOpen(true);
	};

	return (
		<div className="container py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">{t("fleet.vehicles.title")}</h1>
				<p className="text-muted-foreground mt-2">{t("fleet.vehicles.description")}</p>
			</div>

			<VehiclesTable
				onAddVehicle={handleAddVehicle}
				onEditVehicle={handleEditVehicle}
			/>

			<VehicleDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				vehicle={selectedVehicle}
			/>
		</div>
	);
}
