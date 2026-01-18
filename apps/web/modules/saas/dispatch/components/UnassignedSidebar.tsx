"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useDebounceValue } from "usehooks-ts";
import { Input } from "@ui/components/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@ui/components/select";
import { Search, SlidersHorizontal, Inbox } from "lucide-react";
import { ScrollArea } from "@ui/components/scroll-area";
import { useVehicleCategories } from "@saas/quotes/hooks/useVehicleCategories";
import { useMissions } from "../hooks/useMissions";
import { MissionsList } from "./MissionsList";
import { cn } from "@ui/lib";
import { Badge } from "@ui/components/badge";

interface UnassignedSidebarProps {
	selectedMissionId: string | null;
	onSelectMission: (missionId: string) => void;
	isCollapsed?: boolean;
}

export function UnassignedSidebar({
	selectedMissionId,
	onSelectMission,
	isCollapsed = false,
}: UnassignedSidebarProps) {
	const t = useTranslations("dispatch");
	const [searchInput, setSearchInput] = useState("");
	const [search] = useDebounceValue(searchInput, 500);
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
	const totalCount = missionsData?.meta.total || 0;

	return (
		<div className="flex flex-col h-full bg-background relative transition-all duration-300">
			<div className={cn("flex-none p-4 space-y-4 border-b", isCollapsed && "p-2 space-y-2 border-b-0")}>
				<div className={cn("flex items-center justify-between", isCollapsed && "justify-center")}>
					{!isCollapsed ? (
						<h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
							<Inbox className="size-4" />
							{t("sidebar.backlog")} ({totalCount})
						</h2>
					) : (
						<div className="relative group">
							<Badge variant="secondary" className="rounded-full size-8 flex items-center justify-center p-0">
								{totalCount > 99 ? "99+" : totalCount}
							</Badge>
						</div>
					)}
				</div>

				{!isCollapsed && (
					<div className="space-y-2">
						{/* Search */}
						<div className="relative">
							<Search className="absolute left-2 top-2.5 size-4 text-muted-foreground" />
							<Input
								placeholder={t("filters.searchPlaceholder")}
								value={searchInput}
								onChange={(e) => setSearchInput(e.target.value)}
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
				)}

				{isCollapsed && (
					<div className="flex justify-center">
						<SlidersHorizontal className="size-4 text-muted-foreground opacity-50" />
					</div>
				)}
			</div>

			<div className="flex-1 min-h-0">
				<ScrollArea className="h-full">
					<div className={cn("p-2", isCollapsed && "px-1")}>
						{isCollapsed ? (
							// Collapsed view - generic indicators
							<div className="flex flex-col gap-2 items-center pt-2">
								{missions.length > 0 ? (
									missions.slice(0, 5).map((m) => (
										<div 
											key={m.id} 
											className={cn(
												"size-2 rounded-full bg-primary",
												selectedMissionId === m.id && "ring-2 ring-offset-2 ring-primary"
											)}
											title={m.pickupAddress}
										/>
									))
								) : (
									<span className="text-xs text-muted-foreground">-</span>
								)}
							</div>
						) : (
							<MissionsList
								missions={missions}
								selectedMissionId={selectedMissionId}
								onSelectMission={onSelectMission}
								isLoading={isLoading}
								className="border-none shadow-none"
							/>
						)}
					</div>
				</ScrollArea>
			</div>
		</div>
	);
}
