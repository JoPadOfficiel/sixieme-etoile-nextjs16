"use client";

import { BasesTable, BaseDrawer } from "@saas/fleet/components";
import type { OperatingBaseWithCount } from "@saas/fleet/types";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function BasesPage() {
	const t = useTranslations();
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [selectedBase, setSelectedBase] = useState<OperatingBaseWithCount | null>(null);

	const handleAddBase = () => {
		setSelectedBase(null);
		setDrawerOpen(true);
	};

	const handleEditBase = (base: OperatingBaseWithCount) => {
		setSelectedBase(base);
		setDrawerOpen(true);
	};

	return (
		<div className="py-8">
			<div className="mb-8">
				<h1 className="text-3xl font-bold tracking-tight">{t("fleet.bases.title")}</h1>
				<p className="text-muted-foreground mt-2">{t("fleet.bases.description")}</p>
			</div>

			<BasesTable
				onAddBase={handleAddBase}
				onEditBase={handleEditBase}
			/>

			<BaseDrawer
				open={drawerOpen}
				onOpenChange={setDrawerOpen}
				base={selectedBase}
			/>
		</div>
	);
}
