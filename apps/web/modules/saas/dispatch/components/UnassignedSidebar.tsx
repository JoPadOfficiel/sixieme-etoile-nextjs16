"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Search } from "lucide-react";
import { ScrollArea } from "@ui/components/scroll-area";
import { useVehicleCategories } from "@saas/quotes/hooks/useVehicleCategories";
import { useMissions } from "../hooks/useMissions";
import { MissionsList } from "./MissionsList";

interface UnassignedSidebarProps {
	selectedMissionId: string | null;
	onSelectMission: (missionId: string) => void;
}

export function UnassignedSidebar({
	selectedMissionId,
	onSelectMission,
}: UnassignedSidebarProps) {
	const t = useTranslations("dispatch");
	const [search, setSearch] = useState("");
	const [vehicleCategoryId, setVehicleCategoryId] = useState<string | undefined>(undefined);

	// Fetch unassigned missions
	const { data: missionsData, isLoading } = useMissions({
		filters: {
			unassignedOnly: true,
			search,
			vehicleCategoryId,
		},
		limit: 100, // Load more for backlog
	});

	const { categories: vehicleCategories = [] } = useVehicleCategories();
	const missions = missionsData?.data || [];

	return (
		<div className="flex flex-col h-full bg-background">
			<div className="flex-none p-4 space-y-4 border-b">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
						{t("sidebar.backlog")} ({missionsData?.meta.total || 0})
					</h2>
				</div>

				<div className="space-y-2">
					{/* Search */}
					<div className="relative">
						<Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
						<Input
							placeholder={t("filters.searchPlaceholder")}
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-8"
						/>
					</div>

					{/* Category Filter */}
					<Select
						value={vehicleCategoryId || "all"}
						onValueChange={(val) =>
							setVehicleCategoryId(val === "all" ? undefined : val)
						}
					>
						<SelectTrigger className="w-full">
							<SelectValue placeholder={t("filters.vehicleCategory")} />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">{t("filters.all")}</SelectItem>
							{vehicleCategories.map((cat) => (
								<SelectItem key={cat.id} value={cat.id}>
									{cat.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
			</div>

			<div className="flex-1 min-h-0">
				<ScrollArea className="h-full">
					<div className="p-2">
						<MissionsList
							missions={missions}
							selectedMissionId={selectedMissionId}
							onSelectMission={onSelectMission}
							isLoading={isLoading}
							className="border-none shadow-none"
						/>
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
