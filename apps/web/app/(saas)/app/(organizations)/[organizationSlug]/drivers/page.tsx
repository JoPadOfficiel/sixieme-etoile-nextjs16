"use client";

import { DriversTable, DriverDrawer } from "@saas/fleet/components";
import type { DriverWithLicenses } from "@saas/fleet/types";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function DriversPage() {
	const t = useTranslations();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [selectedDriver, setSelectedDriver] = useState<DriverWithLicenses | null>(null);

	const handleAddDriver = () => {
		setSelectedDriver(null);
		setDrawerOpen(true);
	};

	const handleEditDriver = (driver: DriverWithLicenses) => {
		setSelectedDriver(driver);
		setDrawerOpen(true);
	};

	return (
		<div className="container py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">{t("fleet.drivers.title")}</h1>
				<p className="text-muted-foreground mt-2">{t("fleet.drivers.description")}</p>
			</div>

			<DriversTable
				onAddDriver={handleAddDriver}
				onEditDriver={handleEditDriver}
			/>

			<DriverDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				driver={selectedDriver}
			/>
		</div>
	);
}
